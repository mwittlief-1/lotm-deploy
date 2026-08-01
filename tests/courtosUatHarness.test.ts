import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const readJson = (relativePath: string) => JSON.parse(fs.readFileSync(path.resolve(root, relativePath), "utf8"));

describe("CourtOS internal UAT harness", () => {
  const config = readJson("qa/uat/uat.config.json");
  const catalog = readJson(config.scenarioCatalog);
  const packageJson = readJson("package.json");

  it("keeps implementation, UAT, and architectural certification mechanically separate", () => {
    expect(config.promotion).toMatchObject({
      requireEngineeringPass: true,
      requireUatPass: true,
      requireArchitecturePass: true,
      requireAllRequiredLanes: true
    });
    expect(config.promotion.blockSeverities).toEqual(expect.arrayContaining(["P0", "P1"]));
    expect(config.promotion.requireIndependentVerification).toEqual(expect.arrayContaining(["P0", "P1"]));
    expect(config.independentLanes).toContainEqual(
      expect.objectContaining({ id: "production_architecture", required: true })
    );
  });

  it("defines the six required read-only UAT perspectives with source files", () => {
    const ids = config.lanes.map((lane: { id: string }) => lane.id);
    expect(ids).toEqual([
      "source_fidelity",
      "authority_adversary",
      "interaction_explorer",
      "house_scale",
      "temporal",
      "experience_brand"
    ]);
    for (const lane of config.lanes) {
      expect(lane.required).toBe(true);
      expect(fs.existsSync(path.resolve(root, lane.persona))).toBe(true);
      expect(fs.readFileSync(path.resolve(root, lane.persona), "utf8")).toContain("#");
    }
  });

  it("ships at least twenty source-driven scenarios and covers every lane", () => {
    expect(catalog.scenarios.length).toBeGreaterThanOrEqual(20);
    expect(new Set(catalog.scenarios.map((scenario: { id: string }) => scenario.id)).size).toBe(
      catalog.scenarios.length
    );
    const covered = new Set(catalog.scenarios.map((scenario: { lane: string }) => scenario.lane));
    for (const lane of config.lanes) expect(covered.has(lane.id)).toBe(true);
    for (const scenario of catalog.scenarios) {
      expect(scenario.houseSelector.strategy).toBeTruthy();
      expect(scenario.invariants.length).toBeGreaterThan(0);
      expect(scenario.evidenceRequired.length).toBeGreaterThan(0);
    }
  });

  it("provides structured schemas and executable package commands", () => {
    const uatSchema = readJson(config.reportSchema);
    const promotionSchema = readJson("qa/uat/schemas/promotion-report.schema.json");
    expect(uatSchema.title).toBe("CourtOS UAT Orchestrator Report");
    expect(readJson(config.architectureSchema).title).toBe("CourtOS Production Architecture Review");
    expect(promotionSchema.title).toBe("CourtOS Internal Promotion Report");
    expect(JSON.stringify(uatSchema)).not.toContain('"uniqueItems"');
    expect(JSON.stringify(promotionSchema)).not.toContain('"uniqueItems"');
    expect(packageJson.scripts).toMatchObject({
      "qa:engineering": "node scripts/runCourtosEngineeringQa.mjs",
      "uat:config": "node scripts/validateCourtosUatConfig.mjs",
      "uat:internal:dry-run": "node scripts/runCourtosInternalUat.mjs --dry-run",
      "uat:internal": "node scripts/runCourtosInternalUat.mjs"
    });
  });

  it("requires a complete independent production-architecture review", () => {
    const architectureChecks = readJson("qa/uat/architecture-checks.json");
    expect(architectureChecks.checks.length).toBeGreaterThanOrEqual(12);
    expect(new Set(architectureChecks.checks.map((check: { id: string }) => check.id)).size).toBe(
      architectureChecks.checks.length
    );
    expect(architectureChecks.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "ARCH-001", blocking: true }),
        expect.objectContaining({ id: "ARCH-002", blocking: true }),
        expect.objectContaining({ id: "ARCH-003", blocking: true }),
        expect.objectContaining({ id: "ARCH-012", blocking: true })
      ])
    );
  });

  it("fails closed instead of hashing an empty MapGen runtime", () => {
    const runner = fs.readFileSync(
      path.resolve(root, "scripts/runCourtosInternalUat.mjs"),
      "utf8",
    );
    expect(runner).toContain("MapGen repository is unavailable");
    expect(runner).toContain("Required MapGen runtime input is missing");
    expect(runner.indexOf("MapGen repository is unavailable")).toBeLessThan(
      runner.indexOf('const hash = crypto.createHash("sha256")', runner.indexOf("function mapgenRuntimeInputManifest")),
    );
  });

  it("identifies the exact post-build spatial bytes and source seam", () => {
    const runner = fs.readFileSync(
      path.resolve(root, "scripts/runCourtosInternalUat.mjs"),
      "utf8",
    );
    const engineeringIndex = runner.lastIndexOf(
      'runSync("node", ["scripts/runCourtosEngineeringQa.mjs"]',
    );
    const identityIndex = runner.lastIndexOf(
      "runtimeInputs = runtimeInputManifest()",
    );
    const runtimeManifest = fs.readFileSync(
      path.resolve(root, "config/courtos-runtime-inputs.v1.json"),
      "utf8",
    );

    expect(runtimeManifest).toContain(
      "public/data/ready/courtos_spatial_read_model_v1.json",
    );
    expect(runtimeManifest).toContain(
      "data/ready/world_1120_turn0/sources/manor_operator_crosswalk_step4m_v1/ManorOperatorCrosswalk__c.jsonl",
    );
    expect(runtimeManifest).toContain("pearwick_microhex_pilot_v1.json");
    expect(runner).toContain("trackedReport.generatedArtifacts");
    expect(identityIndex).toBeGreaterThan(engineeringIndex);
    expect(runner).toContain("CourtOS clean-checkout gate failed");
    expect(runner).toContain("MapGen clean-checkout gate failed");
  });

  it("discovers the runtime import graph and enforces generated-artifact separation", () => {
    const verifier = fs.readFileSync(
      path.resolve(root, "scripts/verifyCourtosTrackedInputs.mjs"),
      "utf8",
    );
    for (const required of [
      "runtimeImportClosure",
      "runtimeAssetPaths",
      "config/courtos-runtime-inputs.v1.json",
      "Unmaterialized Git LFS runtime input",
      "Generated artifact must not be tracked",
    ]) {
      expect(verifier).toContain(required);
    }
  });

  it("keeps agent lanes filesystem-read-only while allowing only the local preview network", () => {
    const runner = fs.readFileSync(
      path.resolve(root, "scripts/runCourtosInternalUat.mjs"),
      "utf8",
    );
    expect(runner).toContain('permissions.courtos-uat-readonly.extends=":read-only"');
    expect(runner).toContain("permissions.courtos-uat-readonly.network.enabled=true");
    expect(runner).toContain('"127.0.0.1" = "allow"');
    expect(runner).toContain('"localhost" = "allow"');
    expect(runner).toContain("features.network_proxy.enabled=true");
  });

  it("pins immutable read contracts and rebuilds spatial output deterministically", () => {
    const manifest = readJson("config/courtos-runtime-inputs.v1.json");
    expect(manifest.schema_version).toBe("courtos_runtime_inputs_v1");
    expect(manifest.pinned_inputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "immutable_courtos_read_contract", storage: "git_lfs" }),
        expect.objectContaining({ role: "immutable_household_read_contract", storage: "git_lfs" }),
        expect.objectContaining({ role: "promoted_council_room_read_model", storage: "git_lfs" }),
        expect.objectContaining({ role: "versioned_mapgen_renderer_export", storage: "git_lfs" }),
      ]),
    );
    expect(manifest.generated_artifacts).toContainEqual(
      expect.objectContaining({
        path: "public/data/ready/courtos_spatial_read_model_v1.json",
        builder: "scripts/buildCourtosSpatialReadModelV1.mjs",
        tracked: false,
      }),
    );
    const verifier = fs.readFileSync(
      path.resolve(root, "scripts/verifyCourtosGeneratedArtifacts.mjs"),
      "utf8",
    );
    expect(verifier).toContain("firstSha256");
    expect(verifier).toContain("secondSha256");
  });
});
