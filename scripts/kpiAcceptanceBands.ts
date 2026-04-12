#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PLAYABILITY_PRESET_PACK_RELEASE, PLAYABILITY_PRESET_PACK_RELPATH } from "../src/ui/playabilityPresetPack";
import { writeStableArtifact } from "./seed_replay/artifactWriter";
import { sha256, stableStringify } from "./seed_replay/hash";

export const KPI_ACCEPTANCE_BANDS_KIND = "kpi_acceptance_bands_v1" as const;
export const KPI_ACCEPTANCE_BANDS_RELPATH =
  `qa_artifacts/playtest_ops/${PLAYABILITY_PRESET_PACK_RELEASE}/kpi_acceptance_bands.json` as const;

type SourceArtifact = {
  artifact_relpath: string;
  hash: string;
  kind: string;
  label: string;
};

type PresetPack = {
  acceptance_targets: Array<{
    acceptance_id: string;
    kind: string;
    summary: string;
  }>;
  hash?: string;
  kind: string;
  presets: Array<{
    acceptance_ids: string[];
    policy_id: string;
    preset_id: string;
    seed: string;
    summary: string;
    title: string;
    turns: number;
  }>;
  source_packs: Array<{
    artifact_relpath: string;
    hash: string;
    kind: string;
    pack_id: string;
  }>;
};

type RegressionScenario = {
  ending: {
    coin: number;
    food_stores: number;
    manor_count: number;
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

type PolicySummary = {
  arrears: {
    any_seen_share: number;
  };
  dispossession: {
    dispossession_rate: number;
    median_game_over_turn: number | null;
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
    by_policy: Record<string, PolicySummary>;
  };
};

type KpiBandMeasurement = {
  band: {
    max: number;
    min: number;
  };
  label: string;
  note: string;
  preset_ids: string[];
  source: {
    artifact_relpath: string;
    field_path: string;
    policy_id?: string;
    scenario_id?: string;
  };
  unit: "coin" | "count" | "share";
  value: number;
};

type KpiMetricBand = {
  acceptance_ids: string[];
  comparison_rails: KpiBandMeasurement[];
  metric_id: "net_coin" | "arrears_incidence" | "dispossession" | "shortages" | "manor_count_growth";
  summary: string;
  targets: KpiBandMeasurement[];
};

export type KpiAcceptanceBandsArtifact = {
  kind: typeof KPI_ACCEPTANCE_BANDS_KIND;
  metric_bands: KpiMetricBand[];
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

function requirePreset(pack: PresetPack, presetId: string) {
  const preset = pack.presets.find((entry) => entry.preset_id === presetId);
  if (!preset) throw new Error(`Missing preset ${presetId}.`);
  return preset;
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

function requirePolicySummary(pack: DoeSummaryArtifact, policyId: string): PolicySummary {
  const summary = pack.summary.by_policy[policyId];
  if (!summary) throw new Error(`Missing DOE summary for policy ${policyId}.`);
  return summary;
}

function exactMeasurement(input: Omit<KpiBandMeasurement, "band">): KpiBandMeasurement {
  return {
    ...input,
    band: {
      min: input.value,
      max: input.value
    }
  };
}

export function buildKpiAcceptanceBandsArtifact(): KpiAcceptanceBandsArtifact {
  const presetPack = readJson<PresetPack>(PLAYABILITY_PRESET_PACK_RELPATH);
  const regressionPack = readJson<RegressionSeedPack>("qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json");
  const receiptPack = readJson<ReceiptBundleSeedPack>("qa_artifacts/playtest_ops/v0.3.4/receipt_bundle_seed_pack.json");
  const turns15Summary = readJson<DoeSummaryArtifact>("qa_artifacts/economy_balance/v0.3.4/turns_15/summary.json");
  const turns30Summary = readJson<DoeSummaryArtifact>("qa_artifacts/economy_balance/v0.3.4/turns_30_builder-forward/summary.json");

  const kpiAcceptanceIds = new Set(
    presetPack.acceptance_targets.filter((target) => target.kind === "kpi_band").map((target) => target.acceptance_id)
  );
  for (const acceptanceId of [
    "kpi_prudent_baseline",
    "kpi_arrears_pressure",
    "kpi_dispossession_reference",
    "kpi_manor_count_baseline"
  ]) {
    if (!kpiAcceptanceIds.has(acceptanceId)) {
      throw new Error(`Missing KPI acceptance id ${acceptanceId}.`);
    }
  }

  requirePreset(presetPack, "baseline_low_pressure_prudent");
  requirePreset(presetPack, "stable_clear_prudent");
  requirePreset(presetPack, "arrears_pressure_builder");
  requirePreset(presetPack, "weather_shortage_builder");
  requirePreset(presetPack, "dispossession_builder");

  const baselineReceipt = requireReceiptScenario(receiptPack, "baseline_low_pressure_prudent");
  const arrearsReceipt = requireReceiptScenario(receiptPack, "arrears_pressure_builder");
  const shortageReceipt = requireReceiptScenario(receiptPack, "weather_shortage_builder");
  const stableRegression = requireRegressionScenario(regressionPack, "stable_clear_prudent_turns_15");
  const arrearsRegression = requireRegressionScenario(regressionPack, "arrears_pressure_builder_turns_15");
  const dispossessionRegression = requireRegressionScenario(regressionPack, "dispossession_builder_turns_30");
  const singleManorRegression = requireRegressionScenario(regressionPack, "single_manor_distribution_baseline");
  const builder15 = requirePolicySummary(turns15Summary, "builder-forward");
  const builder30 = requirePolicySummary(turns30Summary, "builder-forward");

  const source_artifacts: SourceArtifact[] = [
    {
      artifact_relpath: PLAYABILITY_PRESET_PACK_RELPATH,
      hash: deriveArtifactHash(presetPack as Record<string, unknown>),
      kind: presetPack.kind,
      label: "playability preset crosswalk"
    },
    {
      artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json",
      hash: deriveArtifactHash(regressionPack as Record<string, unknown>),
      kind: regressionPack.kind,
      label: "locked regression seed pack"
    },
    {
      artifact_relpath: "qa_artifacts/playtest_ops/v0.3.4/receipt_bundle_seed_pack.json",
      hash: deriveArtifactHash(receiptPack as Record<string, unknown>),
      kind: receiptPack.kind,
      label: "locked receipt-bundle seed pack"
    },
    {
      artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/turns_15/summary.json",
      hash: deriveArtifactHash(turns15Summary as Record<string, unknown>),
      kind: turns15Summary.kind,
      label: "15-turn DOE summary"
    },
    {
      artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/turns_30_builder-forward/summary.json",
      hash: deriveArtifactHash(turns30Summary as Record<string, unknown>),
      kind: turns30Summary.kind,
      label: "30-turn builder DOE summary"
    }
  ];

  return {
    kind: KPI_ACCEPTANCE_BANDS_KIND,
    release: PLAYABILITY_PRESET_PACK_RELEASE,
    source_artifacts,
    metric_bands: [
      {
        acceptance_ids: ["kpi_prudent_baseline"],
        metric_id: "net_coin",
        summary:
          "Net coin targets stay anchored to the calm prudent packet, while the stable-clear prudent scenario remains the lower-pressure comparison rail.",
        targets: [
          exactMeasurement({
            label: "Low-pressure prudent baseline",
            note: "Use the calm packet as the exact end-state coin target for v0.3.5 closeout review.",
            preset_ids: ["baseline_low_pressure_prudent"],
            source: {
              artifact_relpath: "qa_artifacts/playtest_ops/v0.3.4/receipt_bundle_seed_pack.json",
              field_path: "scenarios[baseline_low_pressure_prudent].expected_end_state.coin",
              scenario_id: "baseline_low_pressure_prudent"
            },
            unit: "coin",
            value: baselineReceipt.expected_end_state.coin
          })
        ],
        comparison_rails: [
          exactMeasurement({
            label: "Stable-clear prudent comparison",
            note: "Keep the alternate prudent scenario available as a lower-pressure coin rail rather than a replacement target.",
            preset_ids: ["stable_clear_prudent"],
            source: {
              artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json",
              field_path: "scenarios[stable_clear_prudent_turns_15].ending.coin",
              scenario_id: "stable_clear_prudent_turns_15"
            },
            unit: "coin",
            value: stableRegression.ending.coin
          })
        ]
      },
      {
        acceptance_ids: ["kpi_arrears_pressure"],
        metric_id: "arrears_incidence",
        summary:
          "Arrears pressure should stay explicit on the builder packet, with the accepted 15-turn builder DOE summary preserving the share-based comparison rail.",
        targets: [
          exactMeasurement({
            label: "Arrears-pressure builder packet",
            note: "This short-run pressure packet should continue to surface arrears deterministically.",
            preset_ids: ["arrears_pressure_builder"],
            source: {
              artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json",
              field_path: "scenarios[arrears_pressure_builder_turns_15].indicators.any_arrears_seen",
              scenario_id: "arrears_pressure_builder_turns_15"
            },
            unit: "share",
            value: arrearsRegression.indicators.any_arrears_seen ? 1 : 0
          })
        ],
        comparison_rails: [
          exactMeasurement({
            label: "Builder-forward 15-turn DOE share",
            note: "Keep the broader DOE share visible so a passing packet target does not hide softer aggregate drift.",
            preset_ids: ["arrears_pressure_builder"],
            source: {
              artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/turns_15/summary.json",
              field_path: "summary.by_policy[builder-forward].arrears.any_seen_share",
              policy_id: "builder-forward"
            },
            unit: "share",
            value: builder15.arrears.any_seen_share
          })
        ]
      },
      {
        acceptance_ids: ["kpi_dispossession_reference"],
        metric_id: "dispossession",
        summary:
          "The long-run dispossession reference stays locked to the accepted builder scenario, with the 30-turn DOE rate preserved as the comparison rail.",
        targets: [
          exactMeasurement({
            label: "Dispossession long-run builder",
            note: `The exact target remains dispossession on the locked reference scenario at turn ${dispossessionRegression.game_over_turn ?? "n/a"}.`,
            preset_ids: ["dispossession_builder"],
            source: {
              artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json",
              field_path: "scenarios[dispossession_builder_turns_30].indicators.dispossessed",
              scenario_id: "dispossession_builder_turns_30"
            },
            unit: "share",
            value: dispossessionRegression.indicators.dispossessed ? 1 : 0
          })
        ],
        comparison_rails: [
          exactMeasurement({
            label: "Builder-forward 30-turn DOE rate",
            note: `The accepted long-run comparison rail keeps the median game-over turn at ${builder30.dispossession.median_game_over_turn ?? "n/a"}.`,
            preset_ids: ["dispossession_builder"],
            source: {
              artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/turns_30_builder-forward/summary.json",
              field_path: "summary.by_policy[builder-forward].dispossession.dispossession_rate",
              policy_id: "builder-forward"
            },
            unit: "share",
            value: builder30.dispossession.dispossession_rate
          })
        ]
      },
      {
        acceptance_ids: ["kpi_arrears_pressure", "kpi_dispossession_reference"],
        metric_id: "shortages",
        summary:
          "Shortage review stays anchored to the explicit weather packet target, while the arrears-pressure packet remains the less-severe comparison rail for food stores.",
        targets: [
          exactMeasurement({
            label: "Weather-shortage builder packet",
            note: "Treat zero ending food stores as the exact shortage target for the explicit high-pressure packet.",
            preset_ids: ["weather_shortage_builder"],
            source: {
              artifact_relpath: "qa_artifacts/playtest_ops/v0.3.4/receipt_bundle_seed_pack.json",
              field_path: "scenarios[weather_shortage_builder].expected_end_state.bushels_stored",
              scenario_id: "weather_shortage_builder"
            },
            unit: "count",
            value: shortageReceipt.expected_end_state.bushels_stored
          })
        ],
        comparison_rails: [
          exactMeasurement({
            label: "Arrears-pressure builder packet",
            note: "Keep a non-zero comparison rail so shortage visibility stays distinguishable from arrears-only pressure.",
            preset_ids: ["arrears_pressure_builder"],
            source: {
              artifact_relpath: "qa_artifacts/playtest_ops/v0.3.4/receipt_bundle_seed_pack.json",
              field_path: "scenarios[arrears_pressure_builder].expected_end_state.bushels_stored",
              scenario_id: "arrears_pressure_builder"
            },
            unit: "count",
            value: arrearsReceipt.expected_end_state.bushels_stored
          })
        ]
      },
      {
        acceptance_ids: ["kpi_manor_count_baseline"],
        metric_id: "manor_count_growth",
        summary:
          "Manor-count growth remains frozen on the single-manor baseline targets, with both accepted DOE summaries preserving the same one-manor comparison rail.",
        targets: [
          exactMeasurement({
            label: "Single-manor distribution baseline",
            note: "Use the accepted single-manor regression scenario as the exact growth target.",
            preset_ids: ["baseline_low_pressure_prudent"],
            source: {
              artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json",
              field_path: "scenarios[single_manor_distribution_baseline].ending.manor_count",
              scenario_id: "single_manor_distribution_baseline"
            },
            unit: "count",
            value: singleManorRegression.ending.manor_count
          }),
          exactMeasurement({
            label: "Stable-clear prudent manor-count rail",
            note: "Keep the secondary prudent regression point frozen at one manor as well.",
            preset_ids: ["stable_clear_prudent"],
            source: {
              artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json",
              field_path: "scenarios[stable_clear_prudent_turns_15].ending.manor_count",
              scenario_id: "stable_clear_prudent_turns_15"
            },
            unit: "count",
            value: stableRegression.ending.manor_count
          })
        ],
        comparison_rails: [
          exactMeasurement({
            label: "Builder-forward 15-turn DOE distribution",
            note: "The short-run DOE rail should remain fully concentrated on one manor.",
            preset_ids: ["baseline_low_pressure_prudent"],
            source: {
              artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/turns_15/summary.json",
              field_path: "summary.by_policy[builder-forward].manor_count_distribution[manor_count=1].share",
              policy_id: "builder-forward"
            },
            unit: "count",
            value: builder15.manor_count_distribution.find((row) => row.manor_count === 1)?.share ?? 0
          }),
          exactMeasurement({
            label: "Builder-forward 30-turn DOE distribution",
            note: "The long-run DOE rail should remain fully concentrated on one manor.",
            preset_ids: ["dispossession_builder"],
            source: {
              artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/turns_30_builder-forward/summary.json",
              field_path: "summary.by_policy[builder-forward].manor_count_distribution[manor_count=1].share",
              policy_id: "builder-forward"
            },
            unit: "count",
            value: builder30.manor_count_distribution.find((row) => row.manor_count === 1)?.share ?? 0
          })
        ]
      }
    ],
    qa_flow: {
      commands: [
        "npm run qa",
        "npm run preflight",
        "npm run seed:replay:batch",
        "node node_modules/tsx/dist/cli.mjs scripts/playabilityPresetPack.ts",
        "node node_modules/tsx/dist/cli.mjs scripts/kpiAcceptanceBands.ts"
      ],
      note:
        "Refresh the accepted regression and preset artifacts first, then rebuild this band file so targets and comparison rails never drift onto a second scenario catalog."
    }
  };
}

export function writeKpiAcceptanceBandsArtifact() {
  return writeStableArtifact(path.resolve(KPI_ACCEPTANCE_BANDS_RELPATH), buildKpiAcceptanceBandsArtifact());
}

async function main() {
  const artifact = writeKpiAcceptanceBandsArtifact();
  console.log("kpi acceptance bands: PASS");
  console.log(`artifact=${path.relative(process.cwd(), path.resolve(KPI_ACCEPTANCE_BANDS_RELPATH)).split(path.sep).join("/")}`);
  console.log(`hash=${artifact.hash}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
