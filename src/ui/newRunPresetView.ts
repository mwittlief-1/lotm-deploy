import { applyPlayabilityPreset, buildNewRunInit } from "../sim";
import { NEW_RUN_INIT_SEAM_ID, type NewRunInitV1 } from "../sim/state";
import {
  PLAYABILITY_PRESET_PACK_RELPATH,
  PLAYABILITY_REGRESSION_SEED_PACK_RELPATH,
  PLAYABILITY_UAT_SCENARIO_PACK_RELPATH,
  listPlayabilityPresetDefinitions,
  summarizePlayabilityPresetPackContract,
  type PlayabilityPresetDefinition,
  type PlayabilityPresetId,
  type PlayabilitySourcePackId
} from "./playabilityPresetPack";
import { PLAYTEST_OPS_PACKET_SEED_PACK_RELPATH } from "./playtestOpsPacket";

export type NewRunPresetSourceRef = {
  packId: PlayabilitySourcePackId;
  relpath: string;
  scenarioId: string;
};

export type NewRunPresetCard = {
  acceptanceLabel: string;
  focusLabel: string;
  policyId: string;
  presetId: PlayabilityPresetId;
  seed: string;
  sourceRefs: NewRunPresetSourceRef[];
  summary: string;
  title: string;
  turns: number;
};

export type NewRunPresetSurface = {
  contractRelpath: string;
  entrypoint: "createNewRun";
  futureAdapter: "applyPlayabilityPreset";
  seamId: typeof NEW_RUN_INIT_SEAM_ID;
  selectedPreset: NewRunPresetCard | null;
  selectedPresetId: PlayabilityPresetId | null;
  sourcePackRelpaths: string[];
  presets: NewRunPresetCard[];
};

function relpathForSourcePack(packId: PlayabilitySourcePackId): string {
  if (packId === "economy_fiscal_regression_seed_pack") return PLAYABILITY_REGRESSION_SEED_PACK_RELPATH;
  if (packId === "playtest_ops_receipt_bundle_seed_pack") return PLAYTEST_OPS_PACKET_SEED_PACK_RELPATH;
  return PLAYABILITY_UAT_SCENARIO_PACK_RELPATH;
}

function cardForPreset(definition: PlayabilityPresetDefinition): NewRunPresetCard {
  return {
    acceptanceLabel: definition.acceptance_ids.join(", "),
    focusLabel: definition.focus.join(", "),
    policyId: definition.policy_id,
    presetId: definition.preset_id,
    seed: definition.seed,
    sourceRefs: definition.source_refs.map((ref) => ({
      packId: ref.pack_id,
      relpath: relpathForSourcePack(ref.pack_id),
      scenarioId: ref.scenario_id
    })),
    summary: definition.summary,
    title: definition.title,
    turns: definition.turns
  };
}

export function resolvePlayabilityPresetCard(presetId: PlayabilityPresetId | null | undefined): NewRunPresetCard | null {
  if (!presetId) return null;
  const definition = listPlayabilityPresetDefinitions().find((preset) => preset.preset_id === presetId);
  return definition ? cardForPreset(definition) : null;
}

export function buildNewRunPresetSurface(selectedPresetId: PlayabilityPresetId | null): NewRunPresetSurface {
  const summary = summarizePlayabilityPresetPackContract();
  const presets = listPlayabilityPresetDefinitions().map(cardForPreset);

  return {
    contractRelpath: PLAYABILITY_PRESET_PACK_RELPATH,
    entrypoint: "createNewRun",
    futureAdapter: "applyPlayabilityPreset",
    seamId: NEW_RUN_INIT_SEAM_ID,
    selectedPreset: presets.find((preset) => preset.presetId === selectedPresetId) ?? null,
    selectedPresetId,
    sourcePackRelpaths: [...summary.sourceSeedPackRelpaths],
    presets
  };
}

export function buildCanonicalNewRunInit(seed: string, selectedPresetId: PlayabilityPresetId | null): NewRunInitV1 {
  const normalizedSeed = seed.trim().length > 0 ? seed.trim() : `run_${Date.now()}`;
  const baseInit = buildNewRunInit(normalizedSeed);
  const selectedPreset = resolvePlayabilityPresetCard(selectedPresetId);

  return applyPlayabilityPreset(
    baseInit,
    selectedPreset
      ? {
          preset_id: selectedPreset.presetId,
          seed: selectedPreset.seed
        }
      : null
  );
}
