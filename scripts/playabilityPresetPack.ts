#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PLAYABILITY_PRESET_PACK_KIND,
  PLAYABILITY_PRESET_PACK_RELPATH,
  PLAYABILITY_PRESET_PACK_RELEASE,
  PLAYABILITY_REGRESSION_SEED_PACK_RELPATH,
  PLAYABILITY_SOURCE_PACK_ORDER,
  PLAYABILITY_UAT_SCENARIO_PACK_RELPATH,
  listPlayabilityAcceptanceTargets,
  listPlayabilityPresetDefinitions,
  type PlayabilityPresetDefinition,
  type PlayabilityPresetPackSource,
  type PlayabilityPresetPackV1,
  type PlayabilitySourcePackId
} from "../src/ui/playabilityPresetPack";
import { PLAYTEST_OPS_PACKET_SEED_PACK_RELPATH } from "../src/ui/playtestOpsPacket";
import { writeStableArtifact } from "./seed_replay/artifactWriter";
import { sha256, stableStringify } from "./seed_replay/hash";

type RegressionSeedPack = {
  hash?: string;
  kind?: string;
  scenarios?: Array<{
    policy?: string;
    scenario_id?: string;
    seed?: string;
    turns_requested?: number;
  }>;
};

type ReceiptBundleSeedPack = {
  hash?: string;
  kind?: string;
  scenarios?: Array<{
    policy?: string;
    scenario_id?: string;
    seed?: string;
    turns?: number;
  }>;
};

type UatScenarioPack = {
  hash?: string;
  kind?: string;
  schema_version?: string;
  scenarios?: Array<{
    id?: string;
    policy_id?: string;
    seed?: string;
    turns?: number;
  }>;
};

type NormalizedSourceScenario = {
  policy_id: string;
  scenario_id: string;
  seed: string;
  turns: number;
};

type LoadedSourcePack = {
  artifact_relpath: string;
  hash: string;
  kind: string;
  pack_id: PlayabilitySourcePackId;
  scenario_count: number;
  scenarios: Map<string, NormalizedSourceScenario>;
};

function ensureString(value: unknown, label: string): string {
  if (typeof value === "string" && value.trim().length > 0) return value;
  throw new Error(`Expected non-empty string for ${label}.`);
}

function ensureTurns(value: unknown, label: string): number {
  const normalized = Math.max(1, Math.trunc(Number(value)));
  if (Number.isFinite(normalized) && normalized > 0) return normalized;
  throw new Error(`Expected positive turns for ${label}.`);
}

function readJson<T>(artifactRelpath: string): T {
  const filePath = path.resolve(artifactRelpath);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function deriveArtifactHash(payload: Record<string, unknown>): string {
  return typeof payload.hash === "string" && payload.hash.trim().length > 0
    ? payload.hash
    : sha256(stableStringify(payload));
}

function normalizeRegressionSeedPack(payload: RegressionSeedPack): Map<string, NormalizedSourceScenario> {
  const scenarios = new Map<string, NormalizedSourceScenario>();
  for (const scenario of payload.scenarios ?? []) {
    const scenarioId = ensureString(scenario.scenario_id, "regression scenario_id");
    scenarios.set(scenarioId, {
      scenario_id: scenarioId,
      seed: ensureString(scenario.seed, `regression seed for ${scenarioId}`),
      policy_id: ensureString(scenario.policy, `regression policy for ${scenarioId}`),
      turns: ensureTurns(scenario.turns_requested, `regression turns for ${scenarioId}`)
    });
  }
  return scenarios;
}

function normalizeReceiptBundleSeedPack(payload: ReceiptBundleSeedPack): Map<string, NormalizedSourceScenario> {
  const scenarios = new Map<string, NormalizedSourceScenario>();
  for (const scenario of payload.scenarios ?? []) {
    const scenarioId = ensureString(scenario.scenario_id, "receipt-bundle scenario_id");
    scenarios.set(scenarioId, {
      scenario_id: scenarioId,
      seed: ensureString(scenario.seed, `receipt-bundle seed for ${scenarioId}`),
      policy_id: ensureString(scenario.policy, `receipt-bundle policy for ${scenarioId}`),
      turns: ensureTurns(scenario.turns, `receipt-bundle turns for ${scenarioId}`)
    });
  }
  return scenarios;
}

function normalizeUatScenarioPack(payload: UatScenarioPack): Map<string, NormalizedSourceScenario> {
  const scenarios = new Map<string, NormalizedSourceScenario>();
  for (const scenario of payload.scenarios ?? []) {
    const scenarioId = ensureString(scenario.id, "UAT scenario id");
    scenarios.set(scenarioId, {
      scenario_id: scenarioId,
      seed: ensureString(scenario.seed, `UAT seed for ${scenarioId}`),
      policy_id: ensureString(scenario.policy_id, `UAT policy for ${scenarioId}`),
      turns: ensureTurns(scenario.turns, `UAT turns for ${scenarioId}`)
    });
  }
  return scenarios;
}

function loadSourcePack(packId: PlayabilitySourcePackId): LoadedSourcePack {
  switch (packId) {
    case "economy_fiscal_regression_seed_pack": {
      const artifactRelpath = PLAYABILITY_REGRESSION_SEED_PACK_RELPATH;
      const payload = readJson<RegressionSeedPack>(artifactRelpath);
      return {
        pack_id: packId,
        artifact_relpath: artifactRelpath,
        hash: deriveArtifactHash(payload as Record<string, unknown>),
        kind: ensureString(payload.kind, `${packId} kind`),
        scenarios: normalizeRegressionSeedPack(payload),
        scenario_count: (payload.scenarios ?? []).length
      };
    }
    case "playtest_ops_receipt_bundle_seed_pack": {
      const artifactRelpath = PLAYTEST_OPS_PACKET_SEED_PACK_RELPATH;
      const payload = readJson<ReceiptBundleSeedPack>(artifactRelpath);
      return {
        pack_id: packId,
        artifact_relpath: artifactRelpath,
        hash: deriveArtifactHash(payload as Record<string, unknown>),
        kind: ensureString(payload.kind, `${packId} kind`),
        scenarios: normalizeReceiptBundleSeedPack(payload),
        scenario_count: (payload.scenarios ?? []).length
      };
    }
    case "uat_scenario_pack": {
      const artifactRelpath = PLAYABILITY_UAT_SCENARIO_PACK_RELPATH;
      const payload = readJson<UatScenarioPack>(artifactRelpath);
      const sourceKind = typeof payload.kind === "string" ? payload.kind : payload.schema_version;
      return {
        pack_id: packId,
        artifact_relpath: artifactRelpath,
        hash: deriveArtifactHash(payload as Record<string, unknown>),
        kind: ensureString(sourceKind, `${packId} schema`),
        scenarios: normalizeUatScenarioPack(payload),
        scenario_count: (payload.scenarios ?? []).length
      };
    }
  }
}

export function loadPlayabilitySourcePacks(): LoadedSourcePack[] {
  return PLAYABILITY_SOURCE_PACK_ORDER.map((packId) => loadSourcePack(packId));
}

function validatePresetDefinition(
  definition: PlayabilityPresetDefinition,
  sourcePacks: Map<PlayabilitySourcePackId, LoadedSourcePack>
): void {
  for (const ref of definition.source_refs) {
    const sourcePack = sourcePacks.get(ref.pack_id);
    if (!sourcePack) {
      throw new Error(`Missing source pack ${ref.pack_id} for preset ${definition.preset_id}.`);
    }
    const sourceScenario = sourcePack.scenarios.get(ref.scenario_id);
    if (!sourceScenario) {
      throw new Error(
        `Preset ${definition.preset_id} references missing source scenario ${ref.scenario_id} in ${ref.pack_id}.`
      );
    }
    if (sourceScenario.seed !== definition.seed) {
      throw new Error(
        `Preset ${definition.preset_id} expected seed ${definition.seed}, saw ${sourceScenario.seed} in ${ref.pack_id}:${ref.scenario_id}.`
      );
    }
    if (sourceScenario.policy_id !== definition.policy_id) {
      throw new Error(
        `Preset ${definition.preset_id} expected policy ${definition.policy_id}, saw ${sourceScenario.policy_id} in ${ref.pack_id}:${ref.scenario_id}.`
      );
    }
    if (sourceScenario.turns !== definition.turns) {
      throw new Error(
        `Preset ${definition.preset_id} expected turns ${definition.turns}, saw ${sourceScenario.turns} in ${ref.pack_id}:${ref.scenario_id}.`
      );
    }
  }
}

export function buildPlayabilityPresetPack(sourcePacks: LoadedSourcePack[]): PlayabilityPresetPackV1 {
  const sourcePackMap = new Map(sourcePacks.map((pack) => [pack.pack_id, pack]));
  const presetDefinitions = listPlayabilityPresetDefinitions();

  for (const definition of presetDefinitions) {
    validatePresetDefinition(definition, sourcePackMap);
  }

  const sourcePackRows: PlayabilityPresetPackSource[] = PLAYABILITY_SOURCE_PACK_ORDER.map((packId) => {
    const sourcePack = sourcePackMap.get(packId);
    if (!sourcePack) throw new Error(`Missing source pack ${packId}.`);
    return {
      artifact_relpath: sourcePack.artifact_relpath,
      hash: sourcePack.hash,
      kind: sourcePack.kind,
      pack_id: sourcePack.pack_id,
      scenario_count: sourcePack.scenario_count
    };
  });

  return {
    kind: PLAYABILITY_PRESET_PACK_KIND,
    release: PLAYABILITY_PRESET_PACK_RELEASE,
    init_contract: {
      seam_id: "canonical_new_run_init_v1",
      current_mode: "seed_only",
      entrypoint: "createNewRun",
      future_adapter: "applyPlayabilityPreset",
      rules: [
        "Resolve every preset selection into one canonical init payload before createNewRun runs worldgen, migrations, or registry wiring.",
        "Do not add a preset-specific initializer or a parallel worldgen path.",
        "When preset application starts mutating initial state, stamp run_seed and preset_id into the run shell and exported summaries."
      ]
    },
    qa_flow: {
      commands: [
        "npm run qa",
        "npm run preflight",
        "npm run seed:replay:batch",
        "node node_modules/tsx/dist/cli.mjs scripts/fiscalRegressionSeeds.ts",
        "node node_modules/tsx/dist/cli.mjs scripts/uatScenarioGate.ts",
        "node node_modules/tsx/dist/cli.mjs scripts/playabilityPresetPack.ts"
      ],
      note:
        "Refresh the accepted deterministic gates first, then rebuild the upstream regression and UAT seed packs before rewriting this v0.3.5 preset crosswalk."
    },
    source_packs: sourcePackRows,
    acceptance_targets: listPlayabilityAcceptanceTargets(),
    presets: presetDefinitions
  };
}

export function writePlayabilityPresetPack() {
  const sourcePacks = loadPlayabilitySourcePacks();
  const payload = buildPlayabilityPresetPack(sourcePacks);
  return writeStableArtifact(path.resolve(PLAYABILITY_PRESET_PACK_RELPATH), payload);
}

async function main() {
  const artifact = writePlayabilityPresetPack();
  console.log("playability preset pack: PASS");
  console.log(`artifact=${PLAYABILITY_PRESET_PACK_RELPATH}`);
  console.log(`kind=${PLAYABILITY_PRESET_PACK_KIND}`);
  console.log(`hash=${artifact.hash}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
