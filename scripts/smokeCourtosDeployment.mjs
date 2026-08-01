#!/usr/bin/env node

import process from "node:process";

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
if (!new Set(["http:", "https:"]).has(baseUrl.protocol)) {
  throw new Error("--base-url must use http or https.");
}

const houseId = required(values, "house-id");
const householdEntityId = required(values, "household-entity-id");
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
    redirect: "follow",
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

const apiChecks = [
  {
    name: "courtos",
    url: endpoint("/api/courtos/1120", { houseId }),
    schema: "courtos_1120_read_only_uat_projection_v1",
  },
  {
    name: "council-room",
    url: endpoint("/api/council-room/1120", { houseId }),
    schema: "council_room_ready_projection_v1",
  },
  {
    name: "household",
    url: endpoint("/api/household/1120", { houseId, householdEntityId }),
    schema: "household_1120_read_only_projection_v2",
  },
];

const checks = [{ name: "landing", status: "pass" }];
for (const check of apiChecks) {
  const response = await request(check.url, "application/json");
  if (!(response.headers.get("cache-control") ?? "").includes("no-store")) {
    throw new Error(`${check.name} did not return Cache-Control: no-store.`);
  }
  const payload = await response.json();
  if (payload?.ok !== true || payload?.data?.schema_version !== check.schema) {
    throw new Error(
      `${check.name} returned an invalid contract: ${JSON.stringify(payload).slice(0, 1000)}`,
    );
  }
  checks.push({ name: check.name, status: "pass", schema: check.schema });
}

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
