#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { EconomyFiscalDoeRunMetricV1 } from "../src/sim/domains/economy/fiscalDoe";
import { runEconomyFiscalDoeHarness } from "./fiscalDoe";
import { writeStableArtifact } from "./seed_replay/artifactWriter";

export interface EconomyFiscalRegressionScenarioV1 {
  scenario_id:
    | "stable_clear_prudent_turns_15"
    | "arrears_pressure_builder_turns_15"
    | "dispossession_builder_turns_30"
    | "single_manor_distribution_baseline";
  focus: Array<"arrears" | "dispossession" | "stores" | "manor_count_distribution">;
  source_artifact_relpath: string;
  source_hash: string;
  policy: string;
  seed: string;
  turns_requested: number;
  turns_played: number;
  game_over_reason: string | null;
  game_over_turn: number | null;
  ending: EconomyFiscalDoeRunMetricV1["ending"];
  minima: EconomyFiscalDoeRunMetricV1["minima"];
  maxima: EconomyFiscalDoeRunMetricV1["maxima"];
  indicators: EconomyFiscalDoeRunMetricV1["indicators"];
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function selectFirst(
  metrics: readonly EconomyFiscalDoeRunMetricV1[],
  predicate: (metric: EconomyFiscalDoeRunMetricV1) => boolean,
  label: string
): EconomyFiscalDoeRunMetricV1 {
  const found = metrics.find(predicate);
  if (found) return found;
  throw new Error(`No regression seed candidate matched ${label}.`);
}

function toScenario(
  scenarioId: EconomyFiscalRegressionScenarioV1["scenario_id"],
  focus: EconomyFiscalRegressionScenarioV1["focus"],
  metric: EconomyFiscalDoeRunMetricV1,
  sourceArtifactRelpath: string,
  sourceHash: string
): EconomyFiscalRegressionScenarioV1 {
  return {
    scenario_id: scenarioId,
    focus: [...focus],
    source_artifact_relpath: sourceArtifactRelpath,
    source_hash: sourceHash,
    policy: metric.policy,
    seed: metric.seed,
    turns_requested: metric.turns_requested,
    turns_played: metric.turns_played,
    game_over_reason: metric.game_over_reason,
    game_over_turn: metric.game_over_turn,
    ending: { ...metric.ending },
    minima: { ...metric.minima },
    maxima: { ...metric.maxima },
    indicators: { ...metric.indicators }
  };
}

export function selectEconomyFiscalRegressionScenarios(
  shortRuns: readonly EconomyFiscalDoeRunMetricV1[],
  longRuns: readonly EconomyFiscalDoeRunMetricV1[],
  shortArtifactRelpath: string,
  shortHash: string,
  longArtifactRelpath: string,
  longHash: string
): EconomyFiscalRegressionScenarioV1[] {
  const orderedShortRuns = [...shortRuns].sort((left, right) => {
    const policyOrder = compareText(left.policy, right.policy);
    if (policyOrder !== 0) return policyOrder;
    return compareText(left.seed, right.seed);
  });
  const orderedLongRuns = [...longRuns].sort((left, right) => compareText(left.seed, right.seed));

  return [
    toScenario(
      "stable_clear_prudent_turns_15",
      ["stores", "manor_count_distribution"],
      selectFirst(
        orderedShortRuns,
        (metric) => metric.policy === "prudent-builder" && !metric.indicators.any_arrears_seen && !metric.indicators.any_game_over,
        "stable prudent-builder scenario"
      ),
      shortArtifactRelpath,
      shortHash
    ),
    toScenario(
      "arrears_pressure_builder_turns_15",
      ["arrears", "stores"],
      selectFirst(
        orderedShortRuns,
        (metric) => metric.policy === "builder-forward" && metric.indicators.any_arrears_seen && !metric.indicators.any_game_over,
        "builder-forward arrears scenario"
      ),
      shortArtifactRelpath,
      shortHash
    ),
    toScenario(
      "dispossession_builder_turns_30",
      ["dispossession", "arrears", "stores"],
      selectFirst(
        orderedLongRuns,
        (metric) => metric.game_over_reason === "Dispossessed",
        "builder-forward dispossession scenario"
      ),
      longArtifactRelpath,
      longHash
    ),
    toScenario(
      "single_manor_distribution_baseline",
      ["manor_count_distribution"],
      selectFirst(
        orderedShortRuns,
        (metric) => metric.policy === "prudent-builder" && metric.ending.manor_count === 1 && !metric.indicators.any_game_over,
        "single-manor distribution baseline"
      ),
      shortArtifactRelpath,
      shortHash
    )
  ];
}

export async function runEconomyFiscalRegressionSeedPack() {
  const baseOutdir = path.resolve("qa_artifacts", "economy_balance", "v0.3.4");
  const shortHarness = await runEconomyFiscalDoeHarness({
    turns: 15,
    outdir: path.join(baseOutdir, "turns_15")
  });
  const longHarness = await runEconomyFiscalDoeHarness({
    policies: ["builder-forward"],
    turns: 30,
    outdir: path.join(baseOutdir, "turns_30_builder-forward")
  });

  const shortArtifactRelpath = path.relative(process.cwd(), path.join(shortHarness.outdir, "runs.json")).split(path.sep).join("/");
  const longArtifactRelpath = path.relative(process.cwd(), path.join(longHarness.outdir, "runs.json")).split(path.sep).join("/");
  const scenarios = selectEconomyFiscalRegressionScenarios(
    shortHarness.runsArtifact.runs,
    longHarness.runsArtifact.runs,
    shortArtifactRelpath,
    shortHarness.runsArtifact.hash,
    longArtifactRelpath,
    longHarness.runsArtifact.hash
  );

  const packArtifact = writeStableArtifact(path.join(baseOutdir, "regression_seed_pack.json"), {
    kind: "economy_fiscal_regression_seed_pack_v1",
    tuning_table_hash: shortHarness.summaryArtifact.tuning_table_hash,
    source_runs: [
      {
        artifact_relpath: shortArtifactRelpath,
        hash: shortHarness.runsArtifact.hash,
        turns: shortHarness.turns,
        policies: shortHarness.runsArtifact.policies
      },
      {
        artifact_relpath: longArtifactRelpath,
        hash: longHarness.runsArtifact.hash,
        turns: longHarness.turns,
        policies: longHarness.runsArtifact.policies
      }
    ],
    qa_flow: {
      commands: [
        "node node_modules/tsx/dist/cli.mjs scripts/fiscalDoe.ts",
        "node node_modules/tsx/dist/cli.mjs scripts/fiscalDoe.ts --policies=builder-forward --turns=30 --outdir=qa_artifacts/economy_balance/v0.3.4/turns_30_builder-forward",
        "node node_modules/tsx/dist/cli.mjs scripts/fiscalRegressionSeeds.ts"
      ],
      note: "These scenarios are the canonical fiscal regression comparison points for v0.3.4 balance work."
    },
    scenarios
  });

  return {
    baseOutdir,
    shortHarness,
    longHarness,
    packArtifact
  };
}

async function main() {
  const result = await runEconomyFiscalRegressionSeedPack();
  console.log("fiscal regression seeds: PASS");
  console.log(`outdir=${path.relative(process.cwd(), result.baseOutdir).split(path.sep).join("/")}`);
  console.log(`pack_hash=${result.packArtifact.hash}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
