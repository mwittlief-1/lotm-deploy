import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  PLAYABILITY_ACCEPTANCE_ORDER,
  PLAYABILITY_PRESET_ORDER,
  PLAYABILITY_PRESET_PACK_RELPATH,
  listPlayabilityAcceptanceTargets,
  listPlayabilityPresetDefinitions,
  summarizePlayabilityPresetPackContract
} from "../../src/ui/playabilityPresetPack";
import { buildPlayabilityPresetPack, loadPlayabilitySourcePacks } from "../../scripts/playabilityPresetPack";
import { sha256, stableStringify } from "../../scripts/seed_replay/hash";

describe("playabilityPresetPack", () => {
  it("defines one stable preset order and acceptance catalog for v0.3.5", () => {
    const summary = summarizePlayabilityPresetPackContract();
    const presets = listPlayabilityPresetDefinitions();
    const acceptanceTargets = listPlayabilityAcceptanceTargets();

    expect(summary).toEqual({
      acceptanceCount: PLAYABILITY_ACCEPTANCE_ORDER.length,
      presetCount: PLAYABILITY_PRESET_ORDER.length,
      release: "v0.3.5",
      relpath: "qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json",
      sourcePackCount: 3,
      sourceSeedPackRelpaths: [
        "qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json",
        "qa_artifacts/playtest_ops/v0.3.4/receipt_bundle_seed_pack.json",
        "qa_artifacts/playtest_ops/uat_scenarios_v0.3.json"
      ]
    });

    expect(presets.map((preset) => preset.preset_id)).toEqual([...PLAYABILITY_PRESET_ORDER]);
    expect(acceptanceTargets.map((target) => target.acceptance_id)).toEqual([...PLAYABILITY_ACCEPTANCE_ORDER]);
  });

  it("crosswalks current regression, packet, and UAT scenarios onto stable preset ids", () => {
    const pack = buildPlayabilityPresetPack(loadPlayabilitySourcePacks());

    const baseline = pack.presets.find((preset) => preset.preset_id === "baseline_low_pressure_prudent");
    const arrears = pack.presets.find((preset) => preset.preset_id === "arrears_pressure_builder");
    const hunting = pack.presets.find((preset) => preset.preset_id === "uat_hunting_proxy");

    expect(baseline).toEqual(
      expect.objectContaining({
        seed: "lotm_v022_seed_001_baseline_extworld",
        policy_id: "prudent-builder",
        turns: 15,
        source_refs: [
          {
            pack_id: "playtest_ops_receipt_bundle_seed_pack",
            scenario_id: "baseline_low_pressure_prudent"
          },
          {
            pack_id: "economy_fiscal_regression_seed_pack",
            scenario_id: "single_manor_distribution_baseline"
          }
        ]
      })
    );
    expect(arrears).toEqual(
      expect.objectContaining({
        seed: "lotm_v022_seed_001_baseline_extworld",
        policy_id: "builder-forward",
        turns: 15,
        acceptance_ids: expect.arrayContaining([
          "obligations_visibility",
          "kpi_arrears_pressure",
          "runaway_arrears_soft",
          "runaway_arrears_hard"
        ])
      })
    );
    expect(hunting).toEqual(
      expect.objectContaining({
        source_refs: [
          {
            pack_id: "uat_scenario_pack",
            scenario_id: "uat_meat_hunting_proxy"
          }
        ]
      })
    );
  });

  it("matches the checked-in playability preset artifact", () => {
    const pack = buildPlayabilityPresetPack(loadPlayabilitySourcePacks());
    const expectedArtifact = {
      ...pack,
      hash: sha256(stableStringify(pack))
    };
    const artifact = JSON.parse(
      fs.readFileSync(path.resolve(PLAYABILITY_PRESET_PACK_RELPATH), "utf8")
    );

    expect(artifact).toEqual(expectedArtifact);
  });
});
