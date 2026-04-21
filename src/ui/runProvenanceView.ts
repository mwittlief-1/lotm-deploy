import { buildRunProvenanceV1 } from "../sim/provenance";
import type { RunState } from "../sim/types";
import { NEW_RUN_INIT_SEAM_ID } from "../sim/state";
import { PLAYABILITY_PRESET_PACK_RELPATH, listPlayabilityPresetDefinitions } from "./playabilityPresetPack";

export type RunProvenanceSurface = {
  detailRows: Array<{ label: string; value: string }>;
  helperText: string;
  modeLabel: string;
  runProvenance: ReturnType<typeof buildRunProvenanceV1>;
  seed: string;
  versionHelperText: string;
  versionRows: Array<{ label: string; value: string }>;
  versionStatusLabel: string;
};

export function buildRunProvenanceSurface(state: RunState): RunProvenanceSurface {
  const runProvenance = buildRunProvenanceV1(state);
  const versionRows = [
    { label: "UI app", value: runProvenance.ui_app_version },
    { label: "Run app", value: runProvenance.run_app_version },
    { label: "Build info", value: runProvenance.build_info_app_version ?? "Unknown" },
    { label: "Sim", value: runProvenance.sim_version }
  ];
  const versionHelperText = runProvenance.version_match
    ? "UI, run export, packet metadata, and replay evidence currently share the same version lineage."
    : "Version mismatch is visible here on purpose: UI, run export, and build metadata do not currently agree, so packet and replay evidence should be treated as drift until reconciled.";
  const versionStatusLabel = runProvenance.version_match ? "Version aligned" : "Version mismatch";
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
      runProvenance,
      seed: state.run_seed,
      versionHelperText,
      versionRows,
      versionStatusLabel
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
    runProvenance,
    seed: state.run_seed,
    versionHelperText,
    versionRows,
    versionStatusLabel
  };
}
