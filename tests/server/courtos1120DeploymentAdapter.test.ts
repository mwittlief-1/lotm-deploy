import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { productionCourtOs1120Sources } from "../../src/server/courtos1120Api/productionRuntime";
import {
  createCourtOs1120ReadModelService,
  COURTOS_SPATIAL_REPOSITORY_PATH,
  COURTOS_1120_SQLITE_REPOSITORY_PATH,
  HOUSEHOLD_1120_SQLITE_REPOSITORY_PATH,
  repositoryCourtOs1120Sources,
} from "../../src/server/courtos1120Api/readModelService";
import { createCourtOs1120FetchHandler } from "../../src/server/courtos1120Api/webAdapter";
import { NativeSqliteReadonlyDriver } from "../../src/ui/readModels/world1116/sqliteReadonlyDriver";

const root = process.cwd();

describe("CourtOS packaged deployment adapter", () => {
  it("ships all four Web-standard Vercel function entrypoints", () => {
    for (const route of [
      "api/courtos/1120.ts",
      "api/household/1120.ts",
      "api/council-room/1120.ts",
      "api/spatial/1120.ts",
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
        { includeFiles?: string; maxDuration?: number }
      >;
      rewrites?: Array<{ source: string; destination: string }>;
    };
    expect(config.$schema).toBe("https://openapi.vercel.sh/vercel.json");
    expect(config.functions).toEqual({
      "api/courtos/1120.ts": {
        includeFiles: COURTOS_1120_SQLITE_REPOSITORY_PATH,
        maxDuration: 30,
      },
      "api/household/1120.ts": {
        includeFiles: HOUSEHOLD_1120_SQLITE_REPOSITORY_PATH,
        maxDuration: 30,
      },
      "api/council-room/1120.ts": {
        maxDuration: 30,
      },
      "api/spatial/1120.ts": {
        includeFiles: COURTOS_SPATIAL_REPOSITORY_PATH,
        maxDuration: 30,
      },
    });
    expect(config.rewrites).toEqual([
      { source: "/(.*)", destination: "/index.html" },
    ]);
  });

  it("binds production to the checksum-pinned repository sources by default", () => {
    const sources = productionCourtOs1120Sources({}, root);
    expect(sources).toEqual({
      courtOsSqlitePath: resolve(root, COURTOS_1120_SQLITE_REPOSITORY_PATH),
      householdSqlitePath: resolve(
        root,
        HOUSEHOLD_1120_SQLITE_REPOSITORY_PATH,
      ),
      spatialProjectionPath: resolve(root, COURTOS_SPATIAL_REPOSITORY_PATH),
    });
    expect(existsSync(sources.courtOsSqlitePath!)).toBe(true);
    expect(existsSync(sources.householdSqlitePath!)).toBe(true);
    expect(existsSync(sources.spatialProjectionPath!)).toBe(true);
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
      }
    } finally {
      await service.close();
    }
  });

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
        availability: "not_admitted",
        portfolio: null,
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
      expect(await response.json()).toMatchObject({
        ok: false,
        error: {
          code: "HOUSEHOLD_READ_MODEL_UNAVAILABLE",
          message: "Household selector does not belong to the selected House.",
        },
      });
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
      spatialProjectionPath: resolve(root, COURTOS_SPATIAL_REPOSITORY_PATH),
    });
  });

  it("uses an in-process SQLite binding for the production read contracts", () => {
    for (const path of [
      "src/ui/readModels/courtos1120/service.ts",
      "src/ui/readModels/household1120/service.ts",
    ]) {
      const source = readFileSync(resolve(root, path), "utf8");
      expect(source).toContain("NativeSqliteReadonlyDriver");
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
    expect(workflow).not.toMatch(/run:[^\n]*\$\{\{\s*inputs\./);
    expect(smoke).toContain("/courtos-home.html");
    expect(smoke).toContain("/api/courtos/1120");
    expect(smoke).toContain("/api/household/1120");
    expect(smoke).toContain("/api/council-room/1120");
    expect(smoke).toContain("/api/spatial/1120");
    expect(smoke).toContain('redirect: "error"');
    expect(smoke).toContain("COURTOS_SMOKE_ALLOWED_ORIGIN");
    expect(deploymentVerification).toContain("deployment?.projectId !== projectId");
    expect(deploymentVerification).toContain('deployment?.readyState !== "READY"');
  });
});
