import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { productionCourtOs1120Sources } from "../../src/server/courtos1120Api/productionRuntime";
import {
  COURTOS_1120_SQLITE_REPOSITORY_PATH,
  HOUSEHOLD_1120_SQLITE_REPOSITORY_PATH,
} from "../../src/server/courtos1120Api/readModelService";
import { NativeSqliteReadonlyDriver } from "../../src/ui/readModels/world1116/sqliteReadonlyDriver";

const root = process.cwd();

describe("CourtOS packaged deployment adapter", () => {
  it("ships all three Web-standard Vercel function entrypoints", () => {
    for (const route of [
      "api/courtos/1120.ts",
      "api/household/1120.ts",
      "api/council-room/1120.ts",
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
    });
    expect(existsSync(sources.courtOsSqlitePath!)).toBe(true);
    expect(existsSync(sources.householdSqlitePath!)).toBe(true);
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
    expect(smoke).toContain('redirect: "error"');
    expect(smoke).toContain("COURTOS_SMOKE_ALLOWED_ORIGIN");
    expect(deploymentVerification).toContain("deployment?.projectId !== projectId");
    expect(deploymentVerification).toContain('deployment?.readyState !== "READY"');
  });
});
