import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { productionCourtOs1120Sources } from "../../src/server/courtos1120Api/productionRuntime";
import {
  createCourtOs1120ReadModelService,
  COURTOS_ROADCOTE_SPATIAL_VISUAL_EXPORT_PATH,
  COURTOS_SPATIAL_VISUAL_EXPORT_PATH,
  COURTOS_1120_SQLITE_REPOSITORY_PATH,
  repositoryCourtOs1120Sources,
} from "../../src/server/courtos1120Api/readModelService";
import { createCourtOs1120FetchHandler } from "../../src/server/courtos1120Api/webAdapter";
import { NativeSqliteReadonlyDriver } from "../../src/ui/readModels/world1116/sqliteReadonlyDriver";

const root = process.cwd();

describe("CourtOS packaged deployment adapter", () => {
  it("ships all six Web-standard Vercel function entrypoints", () => {
    for (const route of [
      "api/courtos/1120.ts",
      "api/household/1120.ts",
      "api/council-room/1120.ts",
      "api/responsibilities/1120.ts",
      "api/spatial/1120.ts",
      "api/spatial/1120/visual.ts",
    ]) {
      const path = resolve(root, route);
      expect(existsSync(path)).toBe(true);
      const source = readFileSync(path, "utf8");
      expect(source).toContain("createCourtOs1120FetchHandler");
      expect(source).toContain("export default { fetch }");
    }
  });

  it("keeps Vite as a transport adapter rather than the endpoint implementation", () => {
    const vite = readFileSync(resolve(root, "vite.config.ts"), "utf8");
    expect(vite).toContain("courtOs1120ReadModelApiPlugin");
    expect(vite).not.toContain('middlewares.use("/api/courtos/1120"');
    expect(vite).not.toContain('middlewares.use("/api/household/1120"');
    expect(vite).not.toContain('middlewares.use("/api/council-room/1120"');
    expect(vite).not.toContain('middlewares.use("/api/spatial/1120"');
  });

  it("declares Vercel project configuration without swallowing filesystem functions", () => {
    const config = JSON.parse(
      readFileSync(resolve(root, "vercel.json"), "utf8"),
    ) as {
      $schema?: string;
      functions?: Record<
        string,
        { includeFiles?: string | string[]; maxDuration?: number }
      >;
      rewrites?: Array<{ source: string; destination: string }>;
    };
    expect(config.$schema).toBe("https://openapi.vercel.sh/vercel.json");
    expect(config.functions).toEqual({
      "api/courtos/1120.ts": {
        includeFiles: ".courtos-generated/foundation-a/**",
        maxDuration: 30,
      },
      "api/household/1120.ts": {
        includeFiles: ".courtos-generated/foundation-a/**",
        maxDuration: 30,
      },
      "api/council-room/1120.ts": {
        includeFiles: ".courtos-generated/foundation-a/**",
        maxDuration: 30,
      },
      "api/responsibilities/1120.ts": {
        includeFiles: ".courtos-generated/foundation-a/**",
        maxDuration: 30,
      },
      "api/spatial/1120.ts": {
        includeFiles: ".courtos-generated/foundation-a/**",
        maxDuration: 30,
      },
      "api/spatial/1120/visual.ts": {
        includeFiles: [
          ".courtos-generated/foundation-a/**",
          "data/map/mapgen_exports/**",
        ],
        maxDuration: 30,
      },
    });
    expect(config.rewrites).toEqual([
      { source: "/(.*)", destination: "/index.html" },
    ]);
    expect((config as { buildCommand?: string }).buildCommand).toBe(
      "pnpm run courtos:build:production",
    );
  });

  it("binds production to the checksum-pinned repository sources by default", () => {
    const sources = productionCourtOs1120Sources({}, root);
    expect(sources).toEqual({
      courtOsSqlitePath: null,
      householdSqlitePath: null,
      foundationAStaticStoresManifestPath: null,
      foundationAEducationManifestPath: null,
      foundationAHouseholdUat1ReleaseManifestPath: null,
      foundationAHouseholdRuntimeReleaseManifestPath: null,
      foundationAUnifiedReleaseManifestPath: resolve(
        root,
        ".courtos-generated/foundation-a/MANIFEST.json",
      ),
      foundationAHouseholdEconomicActivityManifestPath: null,
      foundationAResponsibilityAuthorityRootDirectory: null,
      manorFabricReleaseDirectory: null,
      manorFabricXmapManorsPath: null,
      responsibilityPackagesRootDirectory: null,
      spatialProjectionPath: null,
      spatialVisualExportPath: resolve(root, COURTOS_SPATIAL_VISUAL_EXPORT_PATH),
      spatialVisualExportPaths: {
        manor_hx_38958: resolve(root, COURTOS_SPATIAL_VISUAL_EXPORT_PATH),
        manor_hx_44835: resolve(
          root,
          COURTOS_ROADCOTE_SPATIAL_VISUAL_EXPORT_PATH,
        ),
      },
    });
    expect(existsSync(sources.foundationAUnifiedReleaseManifestPath!)).toBe(true);
    expect(existsSync(sources.spatialVisualExportPath!)).toBe(true);
  });

  it("keeps proposal and realm-wide fields out of real House API payloads", async () => {
    const service = createCourtOs1120ReadModelService(
      repositoryCourtOs1120Sources(root),
    );
    const handler = createCourtOs1120FetchHandler("courtos", service);
    try {
      for (const houseId of [
        "t0h_bcae5bd911ab10f4c7fdfea0",
        "t0h_1ed8d543f12b387ed751f1a6",
      ]) {
        const response = await handler(
          new Request(`https://example.test/api/courtos/1120?houseId=${houseId}`),
        );
        expect(response.status).toBe(200);
        const payload = await response.json();
        expect(payload).not.toHaveProperty("pas_calibration");
        expect(payload.data).not.toHaveProperty("global_summary");
        expect(payload.data).not.toHaveProperty("provenance_readiness");
        expect(payload.data.query.house_id).toBe(houseId);
        expect(payload.context).toMatchObject({
          schema_version: "courtos_session_context_v1",
          selected_house_id: houseId,
          capabilities: { issue_commands: false },
        });
      }
    } finally {
      await service.close();
    }
  });

  it("consumes the unified Foundation A Household runtime release", async () => {
    const service = createCourtOs1120ReadModelService(
      repositoryCourtOs1120Sources(root),
    );
    try {
      const projection = await service.household({
        houseId: "t0h_bcae5bd911ab10f4c7fdfea0",
        householdEntityId: "uatentity_2feb6d3c5a81604f9bebeb8c",
      });
      expect(projection.stores_history).toEqual([]);
      expect(projection.economic_activity_lookback).toHaveLength(276);
      expect(projection.economic_activity_lookback).toEqual(expect.arrayContaining([
        expect.objectContaining({
          activity_year: 1119,
          evidence_status: "founder_approved_provisional_economic_lookback",
          runtime_authority: 0,
        }),
      ]));
      expect(projection.supply_routes).toEqual([]);
      expect(projection.stores_positions).toEqual(expect.arrayContaining([
        expect.objectContaining({ position_kind: "house_position", availability_posture: "available" }),
        expect.objectContaining({ position_kind: "food_capacity", resource_id: "food" }),
      ]));
      expect(
        projection.provenance.find((row) => row.record_key === "ro_household_stores_position_v1"),
      ).toMatchObject({
        admission_state: "projected_read_ready",
        row_count: expect.any(Number),
        runtime_authority: 0,
      });
      expect(projection.schema_version).toBe("foundation_a_household_runtime_release_v1");
      expect(projection.membership_context).toHaveLength(14);
      expect(projection.responsibility_summary.length).toBeGreaterThan(4);
      expect(projection.responsibility_summary).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source_legacy_responsibility_id:
            "courtos.responsibility.manor_stewardship",
          authority_scope_id: "manor_hx_38958",
        }),
      ]));
      expect(projection.education_plans).toHaveLength(4);
      expect(
        projection.education_plans.every(
          (row) =>
            row.knowledge_state ===
            "provisional_uat1_fuzzy_report_available_to_responsible_party",
        ),
      ).toBe(true);
      expect(projection.education_cycle_reports).toHaveLength(4);
      expect(projection.education_cycle_reports).toEqual(expect.arrayContaining([
        expect.objectContaining({
          cycle_year: 1119,
          disclosure_posture: "provisional_uat1_fuzzy_report_no_raw_score_or_prose",
          runtime_authority: 0,
        }),
      ]));
    } finally {
      await service.close();
    }
  }, 60_000);

  it("serves only a House-scoped admitted spatial payload", async () => {
    const service = createCourtOs1120ReadModelService(
      repositoryCourtOs1120Sources(root),
    );
    const handler = createCourtOs1120FetchHandler("spatial", service);
    try {
      const response = await handler(
        new Request(
          "https://example.test/api/spatial/1120?houseId=t0h_bcae5bd911ab10f4c7fdfea0",
        ),
      );
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.data).toMatchObject({
        schema_version: "courtos_spatial_house_projection_v1",
        query: { house_id: "t0h_bcae5bd911ab10f4c7fdfea0" },
        availability: "admitted",
        portfolio: {
          house_id: "t0h_bcae5bd911ab10f4c7fdfea0",
          manors: expect.arrayContaining([
            expect.objectContaining({
              manor_id: "manor_hx_44835",
              display_name: "Roadcote Court",
              is_principal_seat: true,
            }),
          ]),
        },
      });
      expect(payload.data).not.toHaveProperty("portfolios");
      expect(JSON.stringify(payload)).not.toContain("principal_operator_person_ids");
      expect(JSON.stringify(payload)).not.toContain("protected_manor_id");
    } finally {
      await service.close();
    }
  });

  it("denies every operational endpoint outside the player House", async () => {
    const service = createCourtOs1120ReadModelService(
      repositoryCourtOs1120Sources(root),
      { accessMode: "player_runtime" },
    );
    try {
      for (const [endpoint, query] of [
        ["courtos", "houseId=t0h_1ed8d543f12b387ed751f1a6"],
        [
          "household",
          "houseId=t0h_1ed8d543f12b387ed751f1a6&householdEntityId=withheld",
        ],
        ["council-room", "houseId=t0h_1ed8d543f12b387ed751f1a6"],
        ["spatial", "houseId=t0h_1ed8d543f12b387ed751f1a6"],
      ] as const) {
        const response = await createCourtOs1120FetchHandler(endpoint, service)(
          new Request(`https://example.test/api/${endpoint}/1120?${query}`),
        );
        expect(response.status).toBe(403);
        const payload = await response.json();
        expect(payload).toEqual({
          ok: false,
          error: {
            code: "COURTOS_HOUSE_ACCESS_DENIED",
            message: "The selected House is not available to this player runtime.",
          },
        });
        expect(JSON.stringify(payload)).not.toContain("Holtcross");
      }
    } finally {
      await service.close();
    }
  });

  it("resolves the selected House Head for the player planning workspace", async () => {
    const service = createCourtOs1120ReadModelService(
      repositoryCourtOs1120Sources(root),
      { accessMode: "player_runtime" },
    );
    try {
      await expect(
        service.sessionContext({ houseId: "t0h_bcae5bd911ab10f4c7fdfea0" }),
      ).resolves.toMatchObject({
        selected_house_id: "t0h_bcae5bd911ab10f4c7fdfea0",
        acting_actor: {
          status: "house_head",
          person_id: "t0p_56033e4ecf3e86ff0dd615c4",
          authority_basis: "foundation_a_uat1_succession_head_identity_plus_player_session",
        },
        capabilities: {
          inspect_house_records: true,
          manage_assignments: true,
          issue_commands: false,
        },
      });
    } finally {
      await service.close();
    }
  });

  it("rejects a Household selector that does not belong to the selected House", async () => {
    const service = createCourtOs1120ReadModelService(
      repositoryCourtOs1120Sources(root),
    );
    try {
      const holtcross = (await service.courtOs({
        houseId: "t0h_1ed8d543f12b387ed751f1a6",
      })) as { selected_entity: { entity_id: string } };
      const response = await createCourtOs1120FetchHandler(
        "household",
        service,
      )(
        new Request(
          `https://example.test/api/household/1120?houseId=t0h_bcae5bd911ab10f4c7fdfea0&householdEntityId=${holtcross.selected_entity.entity_id}`,
        ),
      );
      expect(response.status).toBe(503);
      const payload = await response.json();
      expect(payload).toMatchObject({
        ok: false,
        error: {
          code: "HOUSEHOLD_READ_MODEL_UNAVAILABLE",
          message: "The requested read-only record is temporarily unavailable.",
          incident_id: expect.any(String),
        },
      });
      expect(JSON.stringify(payload)).not.toContain("does not belong");
    } finally {
      await service.close();
    }
  });

  it("permits explicit production source overrides without partial fallback gaps", () => {
    expect(
      productionCourtOs1120Sources(
        {
          COURTOS_1120_SQLITE_PATH: "/runtime/courtos.sqlite",
          HOUSEHOLD_1120_SQLITE_PATH: "/runtime/household.sqlite",
        },
        root,
      ),
    ).toEqual({
      courtOsSqlitePath: "/runtime/courtos.sqlite",
      householdSqlitePath: "/runtime/household.sqlite",
      foundationAStaticStoresManifestPath: null,
      foundationAEducationManifestPath: null,
      foundationAHouseholdUat1ReleaseManifestPath: null,
      foundationAHouseholdRuntimeReleaseManifestPath: null,
      foundationAUnifiedReleaseManifestPath: resolve(
        root,
        ".courtos-generated/foundation-a/MANIFEST.json",
      ),
      foundationAHouseholdEconomicActivityManifestPath: null,
      foundationAResponsibilityAuthorityRootDirectory: null,
      manorFabricReleaseDirectory: null,
      manorFabricXmapManorsPath: null,
      responsibilityPackagesRootDirectory: null,
      spatialProjectionPath: null,
      spatialVisualExportPath: resolve(root, COURTOS_SPATIAL_VISUAL_EXPORT_PATH),
      spatialVisualExportPaths: {
        manor_hx_38958: resolve(root, COURTOS_SPATIAL_VISUAL_EXPORT_PATH),
        manor_hx_44835: resolve(
          root,
          COURTOS_ROADCOTE_SPATIAL_VISUAL_EXPORT_PATH,
        ),
      },
    });
  });

  it("uses an in-process SQLite binding for the production read contracts", () => {
    for (const path of [
      "src/ui/readModels/courtos1120/service.ts",
      "src/ui/readModels/household1120/service.ts",
    ]) {
      const source = readFileSync(resolve(root, path), "utf8");
      expect(source).toMatch(/NativeSqliteReadonlyDriver|World1116ReadonlySqliteDriver/);
      expect(source).not.toContain("new SqliteCliReadonlyDriver");
    }
  });

  it("enforces native read-only, query-only, mutation, and close boundaries", async () => {
    const driver = new NativeSqliteReadonlyDriver(
      resolve(root, COURTOS_1120_SQLITE_REPOSITORY_PATH),
    );
    expect(driver.policy).toEqual({
      mode: "ro",
      immutable: false,
      queryOnly: true,
    });
    await expect(driver.assertReadPolicy()).resolves.toBeUndefined();
    await expect(driver.all("SELECT 1 AS admitted")).resolves.toEqual([
      { admitted: 1 },
    ]);
    await expect(
      driver.all("CREATE TABLE forbidden_write (id INTEGER)"),
    ).rejects.toThrow("accepts SELECT, WITH, or read PRAGMA statements only");
    await driver.close();
    await expect(driver.all("SELECT 1")).rejects.toThrow("driver is closed");
  });

  it("tracks a staged release, production smoke, and explicit rollback path", () => {
    const workflow = readFileSync(
      resolve(root, ".github/workflows/courtos-release.yml"),
      "utf8",
    );
    const smoke = readFileSync(
      resolve(root, "scripts/smokeCourtosDeployment.mjs"),
      "utf8",
    );
    const deploymentVerification = readFileSync(
      resolve(root, "scripts/verifyCourtosVercelDeployment.mjs"),
      "utf8",
    );

    expect(workflow).toContain("--skip-domain");
    expect(workflow).toContain("group: courtos-production-release");
    expect(workflow).toContain("needs: stage");
    expect(workflow).toContain("needs.stage.outputs.deployment_url");
    expect(workflow).toContain("vercel@${VERCEL_CLI_VERSION} promote");
    expect(workflow).toContain("Smoke the canonical production route");
    expect(workflow).toContain("Restore known-good production");
    expect(workflow).toContain("vercel@${VERCEL_CLI_VERSION} rollback");
    expect(workflow).toContain("courtos-staged-release-manifest.json");
    expect(workflow).toContain("tracked_input_report_sha256");
    expect(workflow).toContain("Verify canonical production after rollback");
    expect(workflow).toContain("Verify canonical production after automatic rollback");
    expect(workflow).toContain("vars.COURTOS_PRODUCTION_URL");
    expect(workflow).toContain("verifyCourtosVercelDeployment.mjs");
    expect(workflow).toContain("COURTOS_MAPGEN_BASE_URL");
    expect(workflow).toContain("verifyCourtosMapGenConfiguration.mjs");
    expect(workflow).toContain("playwright install --with-deps chromium");
    expect(workflow).not.toMatch(/run:[^\n]*\$\{\{\s*inputs\./);
    expect(smoke).toContain("/courtos-home.html");
    expect(smoke).toContain("/api/courtos/1120");
    expect(smoke).toContain("/api/household/1120");
    expect(smoke).toContain("/api/council-room/1120");
    expect(smoke).toContain("/api/spatial/1120");
    expect(smoke).toContain("/.well-known/courtos-runtime-v1.json");
    expect(
      readFileSync(
        resolve(root, "config/courtos-mapgen-runtime-contract.v1.json"),
        "utf8",
      ),
    ).toContain("merecross:spatial:ready:v1");
    expect(smoke).toContain("readiness.message_type");
    expect(smoke).toContain("event.source !== frame.contentWindow");
    expect(smoke).toContain("payload?.context?.acting_actor?.status");
    expect(smoke).not.toContain("spatial:init");
    expect(smoke).toContain('redirect: "error"');
    expect(smoke).toContain("COURTOS_SMOKE_ALLOWED_ORIGIN");
    expect(deploymentVerification).toContain("deployment?.projectId !== projectId");
    expect(deploymentVerification).toContain('deployment?.readyState !== "READY"');
  });

  it("fails a production build before Vite when MapGen configuration is absent or unsafe", () => {
    const script = resolve(root, "scripts/verifyCourtosMapGenConfiguration.mjs");
    for (const value of ["", "http://maps.example.test/", "https://maps.example.test/path/"]) {
      const result = spawnSync(process.execPath, [script], {
        cwd: root,
        env: { ...process.env, VITE_MAPGEN_BASE_URL: value },
        encoding: "utf8",
      });
      expect(result.status).not.toBe(0);
    }
    const ready = spawnSync(process.execPath, [script], {
      cwd: root,
      env: {
        ...process.env,
        VITE_MAPGEN_BASE_URL: "https://maps.example.test/",
      },
      encoding: "utf8",
    });
    expect(ready.status).toBe(0);
    expect(JSON.parse(ready.stdout)).toMatchObject({
      mapgen_origin: "https://maps.example.test",
      verdict: "pass",
    });
  });

  it("allows HTTP MapGen only for an explicit loopback UAT validation", async () => {
    const { verifiedMapGenBaseUrl } = await import(
      "../../scripts/verifyCourtosMapGenConfiguration.mjs"
    );
    expect(() =>
      verifiedMapGenBaseUrl("http://127.0.0.1:4173/"),
    ).toThrow("must use HTTPS");
    expect(
      verifiedMapGenBaseUrl("http://127.0.0.1:4173/", {
        allowLoopbackHttp: true,
      }).origin,
    ).toBe("http://127.0.0.1:4173");
    expect(() =>
      verifiedMapGenBaseUrl("http://maps.example.test/", {
        allowLoopbackHttp: true,
      }),
    ).toThrow("must use HTTPS");
  });
});
