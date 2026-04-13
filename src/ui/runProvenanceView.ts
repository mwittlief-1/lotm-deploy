import type { RunState } from "../sim/types";
import { NEW_RUN_INIT_SEAM_ID } from "../sim/state";
import { PLAYABILITY_PRESET_PACK_RELPATH, listPlayabilityPresetDefinitions } from "./playabilityPresetPack";

export type RunProvenanceSurface = {
  detailRows: Array<{ label: string; value: string }>;
  helperText: string;
  modeLabel: string;
  seed: string;
};

export function buildRunProvenanceSurface(state: RunState): RunProvenanceSurface {
  const presetId = state.run_preset_id ?? null;
  const preset = presetId
    ? listPlayabilityPresetDefinitions().find((definition) => definition.preset_id === presetId) ?? null
    : null;

  if (!preset) {
    return {
      detailRows: [
        { label: "Seed", value: state.run_seed },
        { label: "Preset", value: "Custom seed" },
        { label: "Init seam", value: NEW_RUN_INIT_SEAM_ID }
      ],
      helperText:
        "This run started from the canonical seed-only init seam. Export provenance still carries the seed, and locked presets remain available from the repo-relative preset pack.",
      modeLabel: "Custom seed",
      seed: state.run_seed
    };
  }

  return {
    detailRows: [
      { label: "Seed", value: state.run_seed },
      { label: "Preset", value: `${preset.title} (${preset.preset_id})` },
      { label: "Policy / turns", value: `${preset.policy_id} · ${preset.turns} turns` },
      { label: "Preset pack", value: PLAYABILITY_PRESET_PACK_RELPATH }
    ],
    helperText:
      "This run was launched from the locked preset control plane. The preset id, seed, and export provenance stay aligned through the canonical new-run init seam.",
    modeLabel: "Locked preset",
    seed: state.run_seed
  };
}
