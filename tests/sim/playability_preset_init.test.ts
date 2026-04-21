import { describe, expect, it } from "vitest";

import { buildRunSummary } from "../../src/sim/exports";
import {
  NEW_RUN_INIT_SEAM_ID,
  applyPlayabilityPreset,
  buildNewRunInit,
  createNewRun
} from "../../src/sim/state";
import { listPlayabilityPresetDefinitions } from "../../src/ui/playabilityPresetPack";

describe("playability preset init seam", () => {
  it("builds one canonical seed-only init payload for new runs", () => {
    const init = buildNewRunInit("preset_init_seed_v035");

    expect(init).toEqual({
      seam_id: NEW_RUN_INIT_SEAM_ID,
      run_seed: "preset_init_seed_v035",
      preset_id: null
    });

    const state = createNewRun(init);
    const summary = buildRunSummary(state);

    expect(state.run_seed).toBe("preset_init_seed_v035");
    expect(state.run_preset_id).toBeNull();
    expect(summary.seed).toBe("preset_init_seed_v035");
    expect(summary.preset_id).toBeNull();
    expect(summary.run_provenance_v1).toMatchObject({
      schema_version: "run_provenance_v1",
      run_app_version: state.app_version,
      version_match: true
    });
  });

  it("applies preset provenance through the canonical init seam without forking worldgen", () => {
    const preset = listPlayabilityPresetDefinitions().find(
      (entry) => entry.preset_id === "uat_arrears_enforcement"
    );
    expect(preset).toBeTruthy();

    const presetInit = applyPlayabilityPreset(buildNewRunInit("manual_seed_should_be_replaced"), {
      preset_id: preset!.preset_id,
      seed: preset!.seed
    });

    expect(presetInit).toEqual({
      seam_id: NEW_RUN_INIT_SEAM_ID,
      run_seed: preset!.seed,
      preset_id: preset!.preset_id
    });

    const presetState = createNewRun(presetInit);
    const seedOnlyState = createNewRun(preset!.seed);

    expect(presetState.run_preset_id).toBe(preset!.preset_id);
    expect(buildRunSummary(presetState)).toMatchObject({
      seed: preset!.seed,
      preset_id: preset!.preset_id,
      run_provenance_v1: {
        schema_version: "run_provenance_v1",
        run_app_version: presetState.app_version
      }
    });
    expect({
      ...presetState,
      run_preset_id: null
    }).toEqual(seedOnlyState);
  });
});
