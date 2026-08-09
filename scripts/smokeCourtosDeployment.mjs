#!/usr/bin/env node

import process from "node:process";
import { chromium } from "playwright-core";
import mapGenContract from "../config/courtos-mapgen-runtime-contract.v1.json" with { type: "json" };

function argumentsByName(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith("--") || !value) {
      throw new Error(`Expected --name value arguments; received ${argv.join(" ")}.`);
    }
    values.set(name.slice(2), value);
  }
  return values;
}

function required(values, name) {
  const value = values.get(name)?.trim();
  if (!value) throw new Error(`--${name} is required.`);
  return value;
}

const values = argumentsByName(process.argv.slice(2));
const baseUrl = new URL(required(values, "base-url"));
const localOrigin = new Set(["127.0.0.1", "localhost", "[::1]"]).has(
  baseUrl.hostname,
);
if (baseUrl.protocol !== "https:" && !(baseUrl.protocol === "http:" && localOrigin)) {
  throw new Error("--base-url must use HTTPS except for a loopback-only local smoke.");
}
if (baseUrl.username || baseUrl.password) {
  throw new Error("--base-url must not contain credentials.");
}
const allowedOrigin = process.env.COURTOS_SMOKE_ALLOWED_ORIGIN?.trim();
if (allowedOrigin && new URL(allowedOrigin).origin !== baseUrl.origin) {
  throw new Error("--base-url does not match COURTOS_SMOKE_ALLOWED_ORIGIN.");
}

const houseId = required(values, "house-id");
const householdEntityId = required(values, "household-entity-id");
const SAFE_SELECTOR = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/;
if (!SAFE_SELECTOR.test(houseId) || !SAFE_SELECTOR.test(householdEntityId)) {
  throw new Error("Smoke selectors must use the admitted identifier character set.");
}
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
const headers = bypassSecret
  ? {
      "x-vercel-protection-bypass": bypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    }
  : {};

function endpoint(path, query = {}) {
  const url = new URL(path, baseUrl);
  for (const [name, value] of Object.entries(query)) {
    url.searchParams.set(name, value);
  }
  return url;
}

async function request(url, expectedContentType) {
  const response = await fetch(url, {
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    throw new Error(`${url.pathname} returned ${response.status}: ${await response.text()}`);
  }
  if (!contentType.includes(expectedContentType)) {
    throw new Error(`${url.pathname} returned unexpected content type ${contentType}.`);
  }
  return response;
}

const landingResponse = await request(
  endpoint("/courtos-home.html"),
  "text/html",
);
await landingResponse.text();

const runtimeManifestResponse = await request(
  endpoint("/.well-known/courtos-runtime-v1.json"),
  "application/json",
);
const runtimeManifest = await runtimeManifestResponse.json();
if (
  runtimeManifest?.schema_version !== "courtos_runtime_manifest_v1" ||
  !["configured", "bundled"].includes(runtimeManifest?.mapgen?.status) ||
  JSON.stringify(runtimeManifest?.mapgen?.contract) !==
    JSON.stringify(mapGenContract)
) {
  throw new Error("The deployed CourtOS runtime does not declare the exact required MapGen contract.");
}
const mapGenBaseUrl = runtimeManifest.mapgen.status === "bundled"
  ? new URL("/", baseUrl)
  : new URL(runtimeManifest.mapgen.base_url);
if (runtimeManifest.mapgen.status === "configured") {
  if (
    mapGenBaseUrl.protocol !== "https:" ||
    mapGenBaseUrl.pathname !== "/" ||
    mapGenBaseUrl.username ||
    mapGenBaseUrl.password ||
    mapGenBaseUrl.search ||
    mapGenBaseUrl.hash
  ) {
    throw new Error("The deployed CourtOS runtime declares an invalid MapGen production origin.");
  }
} else if (runtimeManifest.mapgen.base_url !== "./") {
  throw new Error("The bundled MapGen runtime must resolve from the CourtOS origin root.");
}

async function probeMapGenReadiness() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ extraHTTPHeaders: headers });
    await page.goto(endpoint("/courtos-home.html").toString(), {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    const results = [];
    for (const renderer of mapGenContract.required_renderers) {
      const rendererUrl = new URL(renderer.path, mapGenBaseUrl);
      rendererUrl.searchParams.set("embedded", "1");
      rendererUrl.searchParams.set("courtos", "1");
      rendererUrl.searchParams.set("parentOrigin", baseUrl.origin);
      rendererUrl.searchParams.set("theme", mapGenContract.readiness.theme_id);
      const result = await page.evaluate(
        ({ src, expectedOrigin, rendererKey, readiness }) =>
          new Promise((resolve) => {
            const frame = document.createElement("iframe");
            frame.hidden = true;
            frame.sandbox.add("allow-same-origin", "allow-scripts");
            const finish = (value) => {
              window.clearTimeout(timeout);
              window.removeEventListener("message", onMessage);
              frame.remove();
              resolve(value);
            };
            const onMessage = (event) => {
              if (event.source !== frame.contentWindow || event.origin !== expectedOrigin) return;
              const payload = event.data?.payload;
              if (
                event.data?.type === readiness.message_type &&
                payload?.schemaVersion === readiness.schema_version &&
                payload?.protocolVersion === readiness.protocol_version &&
                payload?.rendererKey === rendererKey &&
                payload?.themeId === readiness.theme_id &&
                payload?.themeSchemaVersion === readiness.theme_schema_version &&
                payload?.themeVersion === readiness.theme_version &&
                payload?.firstUsableFrame === readiness.first_usable_frame
              ) {
                finish({ status: "pass", rendererKey });
              }
            };
            const timeout = window.setTimeout(
              () => finish({ status: "timeout", rendererKey }),
              30_000,
            );
            window.addEventListener("message", onMessage);
            frame.src = src;
            document.body.append(frame);
          }),
        {
          src: rendererUrl.toString(),
          expectedOrigin: mapGenBaseUrl.origin,
          rendererKey: renderer.renderer_key,
          readiness: mapGenContract.readiness,
        },
      );
      if (result?.status !== "pass") {
        throw new Error(`MapGen renderer ${renderer.renderer_key} did not reach its first usable frame.`);
      }
      results.push(result);
    }
    return results;
  } finally {
    await browser.close();
  }
}

const mapGenChecks = await probeMapGenReadiness();

const apiChecks = [
  {
    name: "courtos",
    url: endpoint("/api/courtos/1120", { houseId }),
    schema: "courtos_1120_read_only_uat_projection_v1",
    validate(data) {
      return (
        data?.query?.house_id === houseId &&
        data?.contract?.sqlite_integrity === "ok" &&
        typeof data?.contract?.sqlite_sha256 === "string"
      );
    },
  },
  {
    name: "council-room",
    url: endpoint("/api/council-room/1120", { houseId }),
    schema: "council_room_ready_projection_v1",
    validate(data) {
      return data?.house_ref?.entity_id === houseId;
    },
  },
  {
    name: "household",
    url: endpoint("/api/household/1120", { houseId, householdEntityId }),
    schema: "household_1120_read_only_projection_v2",
    validate(data) {
      return (
        data?.query?.house_id === houseId &&
        data?.query?.household_entity_id === householdEntityId &&
        data?.contract?.sqlite_integrity === "ok" &&
        typeof data?.contract?.sqlite_sha256 === "string"
      );
    },
  },
  {
    name: "responsibility-workspace",
    url: endpoint("/api/responsibilities/1120", {
      houseId,
      responsibility: "manor_fiscal_administration",
    }),
    schema: "courtos_responsibility_workspace_projection_v1",
    validate(data) {
      return (
        data?.query?.house_id === houseId &&
        data?.query?.responsibility === "manor_fiscal_administration" &&
        data?.read_only === true &&
        data?.command_authority === false
      );
    },
  },
  {
    name: "spatial",
    url: endpoint("/api/spatial/1120", { houseId }),
    schema: "courtos_spatial_house_projection_v1",
    validate(data) {
      return (
        data?.query?.house_id === houseId &&
        data?.read_only === true &&
        data?.command_authority === false &&
        !Array.isArray(data?.portfolios) &&
        ((data?.availability === "not_admitted" && data?.portfolio === null) ||
          (data?.availability === "admitted" &&
            data?.portfolio?.house_id === houseId &&
            data?.portfolio?.association_posture === "ui_admitted" &&
            Array.isArray(data?.portfolio?.manors) &&
            data.portfolio.manors.length > 0))
      );
    },
  },
];

const checks = [
  { name: "landing", status: "pass" },
  { name: "runtime-manifest", status: "pass" },
  ...mapGenChecks.map((check) => ({
    name: `mapgen:${check.rendererKey}`,
    status: "pass",
    protocol: mapGenContract.readiness.protocol_version,
  })),
];
let spatialManorId = null;
for (const check of apiChecks) {
  const response = await request(check.url, "application/json");
  if (!(response.headers.get("cache-control") ?? "").includes("no-store")) {
    throw new Error(`${check.name} did not return Cache-Control: no-store.`);
  }
  const payload = await response.json();
  if (
    payload?.ok !== true ||
    payload?.context?.schema_version !== "courtos_session_context_v1" ||
    payload?.context?.selected_house_id !== houseId ||
    payload?.context?.acting_actor?.status !== "house_head" ||
    typeof payload?.context?.acting_actor?.person_id !== "string" ||
    payload?.context?.acting_actor?.authority_basis !==
      "foundation_a_uat1_succession_head_identity_plus_player_session" ||
    payload?.context?.knowledge?.actor_specific_content !== "withheld" ||
    payload?.context?.capabilities?.issue_commands !== false ||
    payload?.context?.capabilities?.manage_assignments !== true ||
    payload?.data?.schema_version !== check.schema ||
    !check.validate(payload.data)
  ) {
    throw new Error(
      `${check.name} returned an invalid contract: ${JSON.stringify(payload).slice(0, 1000)}`,
    );
  }
  if (check.name === "spatial") {
    spatialManorId = payload.data.portfolio?.manors?.find(
      (manor) => manor.is_principal_seat,
    )?.manor_id ?? payload.data.portfolio?.manors?.[0]?.manor_id ?? null;
  }
  checks.push({ name: check.name, status: "pass", schema: check.schema });
}

if (!spatialManorId) {
  throw new Error("The admitted spatial portfolio supplied no manor for visual smoke coverage.");
}
const visualResponse = await request(
  endpoint("/api/spatial/1120/visual", {
    houseId,
    manorId: spatialManorId,
    lod: "macro",
  }),
  "application/json",
);
if (!(visualResponse.headers.get("cache-control") ?? "").includes("no-store")) {
  throw new Error("spatial-visual did not return Cache-Control: no-store.");
}
const visualPayload = await visualResponse.json();
if (
  visualPayload?.ok !== true ||
  visualPayload?.context?.acting_actor?.status !== "house_head" ||
  visualPayload?.data?.schema_version !== "courtos_spatial_visual_proof_v1" ||
  visualPayload?.data?.house_id !== houseId ||
  visualPayload?.data?.manor_id !== spatialManorId ||
  visualPayload?.data?.lod !== "macro"
) {
  throw new Error(`spatial-visual returned an invalid contract: ${JSON.stringify(visualPayload).slice(0, 1000)}`);
}
checks.push({
  name: "spatial-visual",
  status: "pass",
  schema: "courtos_spatial_visual_proof_v1",
});

process.stdout.write(
  `${JSON.stringify(
    {
      schema_version: "courtos_deployment_smoke_v1",
      base_url: baseUrl.origin,
      checked_at: new Date().toISOString(),
      verdict: "pass",
      checks,
    },
    null,
    2,
  )}\n`,
);
