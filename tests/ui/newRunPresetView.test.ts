import { describe, expect, it } from "vitest";

import { buildCanonicalNewRunInit, buildNewRunPresetSurface } from "../../src/ui/newRunPresetView";

describe("newRunPresetView", () => {
  it("builds repo-relative preset provenance from the canonical control plane", () => {
    const surface = buildNewRunPresetSurface("uat_grant_visibility");

    expect(surface.contractRelpath).toBe("qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json");
    expect(surface.seamId).toBe("canonical_new_run_init_v1");
    expect(surface.entrypoint).toBe("createNewRun");
    expect(surface.futureAdapter).toBe("applyPlayabilityPreset");
    expect(surface.selectedPreset).toMatchObject({
      presetId: "uat_grant_visibility",
      seed: "lotm_v026_seed_003_market_tight",
      policyId: "builder-forward",
      turns: 4
    });
    expect(surface.selectedPreset?.sourceRefs).toEqual([
      {
        packId: "uat_scenario_pack",
        relpath: "qa_artifacts/playtest_ops/uat_scenarios_v0.3.json",
        scenarioId: "uat_grant_visibility"
      }
    ]);
  });

  it("routes both custom seeds and locked presets through the canonical init DTO", () => {
    expect(buildCanonicalNewRunInit("custom_seed_123", null)).toEqual({
      seam_id: "canonical_new_run_init_v1",
      run_seed: "custom_seed_123",
      preset_id: null
    });

    expect(buildCanonicalNewRunInit("ignored_seed", "uat_hunting_proxy")).toEqual({
      seam_id: "canonical_new_run_init_v1",
      run_seed: "lotm_v026_seed_001_baseline",
      preset_id: "uat_hunting_proxy"
    });
  });
});
