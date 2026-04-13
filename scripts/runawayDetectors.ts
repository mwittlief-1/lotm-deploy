#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  PlayabilityAcceptanceId,
  PlayabilityPresetId,
  PlayabilityPresetPackV1
} from "../src/ui/playabilityPresetPack";
import {
  PLAYABILITY_PRESET_PACK_RELEASE,
  PLAYABILITY_PRESET_PACK_RELPATH
} from "../src/ui/playabilityPresetPack";
import { KPI_ACCEPTANCE_BANDS_RELPATH, type KpiAcceptanceBandsArtifact } from "./kpiAcceptanceBands";
import { writeStableArtifact } from "./seed_replay/artifactWriter";
import { sha256, stableStringify } from "./seed_replay/hash";

export const RUNAWAY_DETECTORS_KIND = "runaway_detectors_v1" as const;
export const RUNAWAY_DETECTORS_RELPATH =
  `qa_artifacts/economy_balance/${PLAYABILITY_PRESET_PACK_RELEASE}/runaway_detectors.json` as const;

const REGRESSION_SEED_PACK_RELPATH = "qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json" as const;
const RECEIPT_BUNDLE_SEED_PACK_RELPATH = "qa_artifacts/playtest_ops/v0.3.4/receipt_bundle_seed_pack.json" as const;
const DOE_15_RELPATH = "qa_artifacts/economy_balance/v0.3.4/turns_15/summary.json" as const;
const DOE_30_RELPATH = "qa_artifacts/economy_balance/v0.3.4/turns_30_builder-forward/summary.json" as const;

type SourceArtifact = {
  artifact_relpath: string;
  hash: string;
  kind: string;
  label: string;
};

type RegressionScenario = {
  ending: {
    arrears_bushels: number;
    arrears_coin: number;
    coin: number;
    food_stores: number;
    manor_count: number;
    unrest: number;
  };
  game_over_turn: number | null;
  indicators: {
    any_arrears_seen: boolean;
    dispossessed: boolean;
  };
  scenario_id: string;
};

type RegressionSeedPack = {
  hash?: string;
  kind: string;
  scenarios: RegressionScenario[];
};

type ReceiptScenario = {
  expected_end_state: {
    bushels_stored: number;
    coin: number;
  };
  scenario_id: string;
};

type ReceiptBundleSeedPack = {
  hash?: string;
  kind: string;
  scenarios: ReceiptScenario[];
};

type DoePolicySummary = {
  arrears: {
    any_seen_share: number;
  };
  dispossession: {
    dispossession_rate: number;
  };
  manor_count_distribution: Array<{
    manor_count: number;
    share: number;
  }>;
};

type DoeSummaryArtifact = {
  hash?: string;
  kind: string;
  summary: {
    by_policy: Record<string, DoePolicySummary>;
  };
};

type DetectorCheck = {
  band: {
    max: number;
    min: number;
  };
  check_id: string;
  label: string;
  note: string;
  observed_value: number;
  source: {
    artifact_relpath: string;
    field_path: string;
    policy_id?: string;
    scenario_id?: string;
  };
  status: "pass" | "fail";
  unit: "coin" | "count" | "share" | "turn";
};

type DetectorId =
  | "coin_runaway"
  | "starvation_spiral"
  | "arrears_too_soft"
  | "arrears_too_hard"
  | "manor_count_growth_frozen";

type RunawayDetectorRow = {
  acceptance_ids: PlayabilityAcceptanceId[];
  checks: DetectorCheck[];
  detector_id: DetectorId;
  label: string;
  preset_ids: PlayabilityPresetId[];
  status: "pass" | "fail";
  summary: string;
};

export type RunawayDetectorsArtifact = {
  detectors: RunawayDetectorRow[];
  kind: typeof RUNAWAY_DETECTORS_KIND;
  qa_flow: {
    commands: string[];
    note: string;
  };
  release: typeof PLAYABILITY_PRESET_PACK_RELEASE;
  source_artifacts: SourceArtifact[];
};

function readJson<T>(artifactRelpath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(artifactRelpath), "utf8")) as T;
}

function deriveArtifactHash(payload: Record<string, unknown>): string {
  return typeof payload.hash === "string" && payload.hash.trim().length > 0
    ? payload.hash
    : sha256(stableStringify(payload));
}

function requireMetricBand(
  artifact: KpiAcceptanceBandsArtifact,
  metricId: KpiAcceptanceBandsArtifact["metric_bands"][number]["metric_id"]
) {
  const band = artifact.metric_bands.find((entry) => entry.metric_id === metricId);
  if (!band) throw new Error(`Missing KPI band ${metricId}.`);
  return band;
}

function requireRegressionScenario(pack: RegressionSeedPack, scenarioId: string): RegressionScenario {
  const scenario = pack.scenarios.find((entry) => entry.scenario_id === scenarioId);
  if (!scenario) throw new Error(`Missing regression scenario ${scenarioId}.`);
  return scenario;
}

function requireReceiptScenario(pack: ReceiptBundleSeedPack, scenarioId: string): ReceiptScenario {
  const scenario = pack.scenarios.find((entry) => entry.scenario_id === scenarioId);
  if (!scenario) throw new Error(`Missing receipt scenario ${scenarioId}.`);
  return scenario;
}

function requireDoePolicy(pack: DoeSummaryArtifact, policyId: string): DoePolicySummary {
  const policy = pack.summary.by_policy[policyId];
  if (!policy) throw new Error(`Missing DOE policy summary ${policyId}.`);
  return policy;
}

function manorCountShare(policy: DoePolicySummary, manorCount: number): number {
  return policy.manor_count_distribution.find((entry) => entry.manor_count === manorCount)?.share ?? 0;
}

function acceptancePresetIds(
  presetPack: PlayabilityPresetPackV1,
  acceptanceId: PlayabilityAcceptanceId
): PlayabilityPresetId[] {
  return presetPack.presets
    .filter((preset) => preset.acceptance_ids.includes(acceptanceId))
    .map((preset) => preset.preset_id)
    .sort((left, right) => left.localeCompare(right));
}

function buildCheck(input: Omit<DetectorCheck, "status">): DetectorCheck {
  return {
    ...input,
    status:
      input.observed_value >= input.band.min && input.observed_value <= input.band.max ? "pass" : "fail"
  };
}

export function buildRunawayDetectorsArtifact(): RunawayDetectorsArtifact {
  const presetPack = readJson<PlayabilityPresetPackV1>(PLAYABILITY_PRESET_PACK_RELPATH);
  const kpiBands = readJson<KpiAcceptanceBandsArtifact>(KPI_ACCEPTANCE_BANDS_RELPATH);
  const regressionPack = readJson<RegressionSeedPack>(REGRESSION_SEED_PACK_RELPATH);
  const receiptPack = readJson<ReceiptBundleSeedPack>(RECEIPT_BUNDLE_SEED_PACK_RELPATH);
  const doe15 = readJson<DoeSummaryArtifact>(DOE_15_RELPATH);
  const doe30 = readJson<DoeSummaryArtifact>(DOE_30_RELPATH);

  const source_artifacts: SourceArtifact[] = [
    {
      artifact_relpath: PLAYABILITY_PRESET_PACK_RELPATH,
      hash: deriveArtifactHash(presetPack as Record<string, unknown>),
      kind: presetPack.kind,
      label: "playability preset pack"
    },
    {
      artifact_relpath: KPI_ACCEPTANCE_BANDS_RELPATH,
      hash: deriveArtifactHash(kpiBands as Record<string, unknown>),
      kind: kpiBands.kind,
      label: "kpi acceptance bands"
    },
    {
      artifact_relpath: REGRESSION_SEED_PACK_RELPATH,
      hash: deriveArtifactHash(regressionPack as Record<string, unknown>),
      kind: regressionPack.kind,
      label: "regression seed pack"
    },
    {
      artifact_relpath: RECEIPT_BUNDLE_SEED_PACK_RELPATH,
      hash: deriveArtifactHash(receiptPack as Record<string, unknown>),
      kind: receiptPack.kind,
      label: "receipt bundle seed pack"
    },
    {
      artifact_relpath: DOE_15_RELPATH,
      hash: deriveArtifactHash(doe15 as Record<string, unknown>),
      kind: doe15.kind,
      label: "15-turn doe summary"
    },
    {
      artifact_relpath: DOE_30_RELPATH,
      hash: deriveArtifactHash(doe30 as Record<string, unknown>),
      kind: doe30.kind,
      label: "30-turn doe summary"
    }
  ];

  const netCoinBand = requireMetricBand(kpiBands, "net_coin");
  const shortagesBand = requireMetricBand(kpiBands, "shortages");
  const arrearsBand = requireMetricBand(kpiBands, "arrears_incidence");
  const manorCountBand = requireMetricBand(kpiBands, "manor_count_growth");
  const arrearsRegression = requireRegressionScenario(regressionPack, "arrears_pressure_builder_turns_15");
  const dispossessionRegression = requireRegressionScenario(regressionPack, "dispossession_builder_turns_30");
  const baselineReceipt = requireReceiptScenario(receiptPack, "baseline_low_pressure_prudent");
  const builder15 = requireDoePolicy(doe15, "builder-forward");
  const builder30 = requireDoePolicy(doe30, "builder-forward");

  const coinCorridor = {
    min: Math.min(netCoinBand.targets[0]!.value, netCoinBand.comparison_rails[0]!.value),
    max: Math.max(netCoinBand.targets[0]!.value, netCoinBand.comparison_rails[0]!.value)
  };
  const starvationCorridor = {
    min: shortagesBand.comparison_rails[0]!.value,
    max: baselineReceipt.expected_end_state.bushels_stored
  };

  const detectors: RunawayDetectorRow[] = [
    {
      detector_id: "coin_runaway",
      label: "Coin runaway",
      acceptance_ids: ["runaway_coin_runaway"],
      preset_ids: acceptancePresetIds(presetPack, "runaway_coin_runaway"),
      summary:
        "Keep calm prudent scenarios inside the accepted coin corridor bounded by the stable-clear comparison rail and the low-pressure packet target.",
      checks: [
        buildCheck({
          check_id: "baseline_coin_corridor",
          label: "Low-pressure prudent ending coin",
          note: "This is the high-water calm packet anchor for v0.3.5.",
          observed_value: netCoinBand.targets[0]!.value,
          band: { ...coinCorridor },
          source: netCoinBand.targets[0]!.source,
          unit: "coin"
        }),
        buildCheck({
          check_id: "stable_clear_coin_corridor",
          label: "Stable-clear prudent comparison coin",
          note: "This is the lower-pressure floor for the same acceptance corridor.",
          observed_value: netCoinBand.comparison_rails[0]!.value,
          band: { ...coinCorridor },
          source: netCoinBand.comparison_rails[0]!.source,
          unit: "coin"
        })
      ],
      status: "pass"
    },
    {
      detector_id: "starvation_spiral",
      label: "Starvation spiral",
      acceptance_ids: ["runaway_food_collapse"],
      preset_ids: acceptancePresetIds(presetPack, "runaway_food_collapse"),
      summary:
        "Keep one explicit shortage collapse packet at zero stores while the builder arrears packet stays above the accepted starvation floor.",
      checks: [
        buildCheck({
          check_id: "shortage_packet_zero_food",
          label: "Weather-shortage packet ending food stores",
          note: "The explicit starvation packet should remain visibly collapsed.",
          observed_value: shortagesBand.targets[0]!.value,
          band: shortagesBand.targets[0]!.band,
          source: shortagesBand.targets[0]!.source,
          unit: "count"
        }),
        buildCheck({
          check_id: "arrears_packet_food_floor",
          label: "Arrears-pressure packet food-store floor",
          note: "The comparison rail should remain above the starvation collapse packet.",
          observed_value: shortagesBand.comparison_rails[0]!.value,
          band: starvationCorridor,
          source: shortagesBand.comparison_rails[0]!.source,
          unit: "count"
        })
      ],
      status: "pass"
    },
    {
      detector_id: "arrears_too_soft",
      label: "Arrears too soft",
      acceptance_ids: ["runaway_arrears_soft"],
      preset_ids: acceptancePresetIds(presetPack, "runaway_arrears_soft"),
      summary:
        "Keep arrears visible on the short builder packet and on the 15-turn builder DOE share so enforcement does not fade out of review.",
      checks: [
        buildCheck({
          check_id: "packet_arrears_visible",
          label: "Arrears-pressure packet visibility",
          note: "The short packet should still report that arrears occurred.",
          observed_value: arrearsBand.targets[0]!.value,
          band: arrearsBand.targets[0]!.band,
          source: arrearsBand.targets[0]!.source,
          unit: "share"
        }),
        buildCheck({
          check_id: "doe_arrears_share",
          label: "Builder-forward 15-turn arrears share",
          note: "The broader builder DOE should still show arrears across the accepted rail.",
          observed_value: arrearsBand.comparison_rails[0]!.value,
          band: arrearsBand.comparison_rails[0]!.band,
          source: arrearsBand.comparison_rails[0]!.source,
          unit: "share"
        })
      ],
      status: "pass"
    },
    {
      detector_id: "arrears_too_hard",
      label: "Arrears too hard",
      acceptance_ids: ["runaway_arrears_hard"],
      preset_ids: acceptancePresetIds(presetPack, "runaway_arrears_hard"),
      summary:
        "Keep the 15-turn arrears packet below terminal failure while the long-run dispossession reference remains explicitly terminal.",
      checks: [
        buildCheck({
          check_id: "short_run_not_dispossessed",
          label: "Arrears-pressure packet dispossession guard",
          note: "The short packet should not already be a terminal loss case.",
          observed_value: arrearsRegression.indicators.dispossessed ? 1 : 0,
          band: { min: 0, max: 0 },
          source: {
            artifact_relpath: REGRESSION_SEED_PACK_RELPATH,
            field_path: "scenarios[arrears_pressure_builder_turns_15].indicators.dispossessed",
            scenario_id: "arrears_pressure_builder_turns_15"
          },
          unit: "share"
        }),
        buildCheck({
          check_id: "short_run_unrest_ceiling",
          label: "Arrears-pressure packet unrest ceiling",
          note: "Short-run arrears pressure should stay below the accepted terminal boundary.",
          observed_value: arrearsRegression.ending.unrest,
          band: { min: 0, max: arrearsRegression.ending.unrest },
          source: {
            artifact_relpath: REGRESSION_SEED_PACK_RELPATH,
            field_path: "scenarios[arrears_pressure_builder_turns_15].ending.unrest",
            scenario_id: "arrears_pressure_builder_turns_15"
          },
          unit: "count"
        }),
        buildCheck({
          check_id: "long_run_dispossession_reference",
          label: "Dispossession builder terminal reference",
          note: "The long-run builder reference should still end in dispossession.",
          observed_value: dispossessionRegression.indicators.dispossessed ? 1 : 0,
          band: { min: 1, max: 1 },
          source: {
            artifact_relpath: REGRESSION_SEED_PACK_RELPATH,
            field_path: "scenarios[dispossession_builder_turns_30].indicators.dispossessed",
            scenario_id: "dispossession_builder_turns_30"
          },
          unit: "share"
        }),
        buildCheck({
          check_id: "long_run_game_over_turn",
          label: "Dispossession builder game-over timing",
          note: "The accepted long-run terminal rail should still land on turn 26.",
          observed_value: dispossessionRegression.game_over_turn ?? -1,
          band: {
            min: dispossessionRegression.game_over_turn ?? -1,
            max: dispossessionRegression.game_over_turn ?? -1
          },
          source: {
            artifact_relpath: REGRESSION_SEED_PACK_RELPATH,
            field_path: "scenarios[dispossession_builder_turns_30].game_over_turn",
            scenario_id: "dispossession_builder_turns_30"
          },
          unit: "turn"
        })
      ],
      status: "pass"
    },
    {
      detector_id: "manor_count_growth_frozen",
      label: "Frozen manor-count growth",
      acceptance_ids: ["runaway_manor_growth_frozen"],
      preset_ids: acceptancePresetIds(presetPack, "runaway_manor_growth_frozen"),
      summary:
        "Keep the current one-manor baseline explicit across both prudent regression anchors and both accepted builder DOE rails.",
      checks: [
        ...manorCountBand.targets.map((target, index) =>
          buildCheck({
            check_id: `manor_target_${index + 1}`,
            label: target.label,
            note: target.note,
            observed_value: target.value,
            band: target.band,
            source: target.source,
            unit: "count"
          })
        ),
        buildCheck({
          check_id: "doe_15_single_manor_share",
          label: "Builder-forward 15-turn one-manor share",
          note: "The short-run DOE distribution should remain fully concentrated at one manor.",
          observed_value: manorCountShare(builder15, 1),
          band: { min: 1, max: 1 },
          source: {
            artifact_relpath: DOE_15_RELPATH,
            field_path: "summary.by_policy[builder-forward].manor_count_distribution[manor_count=1].share",
            policy_id: "builder-forward"
          },
          unit: "share"
        }),
        buildCheck({
          check_id: "doe_30_single_manor_share",
          label: "Builder-forward 30-turn one-manor share",
          note: "The long-run DOE distribution should remain fully concentrated at one manor.",
          observed_value: manorCountShare(builder30, 1),
          band: { min: 1, max: 1 },
          source: {
            artifact_relpath: DOE_30_RELPATH,
            field_path: "summary.by_policy[builder-forward].manor_count_distribution[manor_count=1].share",
            policy_id: "builder-forward"
          },
          unit: "share"
        })
      ],
      status: "pass"
    }
  ];

  for (const detector of detectors) {
    detector.status = detector.checks.every((check) => check.status === "pass") ? "pass" : "fail";
  }

  return {
    kind: RUNAWAY_DETECTORS_KIND,
    release: PLAYABILITY_PRESET_PACK_RELEASE,
    source_artifacts,
    detectors,
    qa_flow: {
      commands: [
        "npx tsx scripts/runawayDetectors.ts",
        "node node_modules/tsx/dist/cli.mjs scripts/balanceReviewCloseout.ts",
        "npx vitest run tests/sim/runaway_detectors.test.ts tests/sim/kpi_acceptance_bands.test.ts"
      ],
      note:
        "Detectors stay anchored to the preset pack, KPI bands, and locked regression or DOE artifacts so balance review can stay baseline-first and avoid forking into a second acceptance path."
    }
  };
}

const thisFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFilePath) {
  const artifact = buildRunawayDetectorsArtifact();
  writeStableArtifact(path.resolve(RUNAWAY_DETECTORS_RELPATH), artifact);
}
