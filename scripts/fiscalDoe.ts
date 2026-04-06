#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildEconomyFiscalDoeRunMetric,
  buildEconomyFiscalDoeRunMetricsSnapshot,
  buildEconomyFiscalDoeSummary
} from "../src/sim/domains/economy/fiscalDoe";
import { serializeEconomyFiscalTuningTableSnapshot } from "../src/sim/domains/economy/tuningTable";
import { createNewRun, proposeTurn, applyDecisions } from "../src/sim/index";
import { canonicalizePolicyId, decide, type PolicyId } from "../src/sim/policies";
import type { RunState } from "../src/sim/types";
import { APP_VERSION } from "../src/version";
import { writeStableArtifact } from "./seed_replay/artifactWriter";
import { sha256 } from "./seed_replay/hash";
import { resolveSeedReplayPlan } from "./seed_replay/seedPlan";

type Args = {
  seed?: string;
  seeds?: string[];
  policy?: string;
  policies?: string[];
  turns?: number;
  outdir?: string;
  limit?: number;
};

type BuildInfo = {
  app_version?: string;
  sim_version?: string;
  code_fingerprint?: string;
};

export interface EconomyFiscalDoeHarnessOptions {
  seed?: string;
  seeds?: string[];
  policy?: string;
  policies?: string[];
  turns?: number;
  outdir?: string;
  limit?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, rawValue = ""] = arg.slice(2).split("=");
    const key = rawKey.trim();
    const value = rawValue.trim();
    if (!key) continue;
    if (key === "seed" && value) args.seed = value;
    if (key === "seeds" && value) args.seeds = value.split(",").map((row) => row.trim()).filter(Boolean);
    if (key === "policy" && value) args.policy = value;
    if (key === "policies" && value) args.policies = value.split(",").map((row) => row.trim()).filter(Boolean);
    if (key === "turns" && value) args.turns = Number(value);
    if (key === "outdir" && value) args.outdir = value;
    if (key === "limit" && value) args.limit = Number(value);
  }
  return args;
}

function loadBuildInfo(): BuildInfo | null {
  const buildInfoPath = path.resolve("docs", "BUILD_INFO.json");
  if (!fs.existsSync(buildInfoPath)) return null;
  return JSON.parse(fs.readFileSync(buildInfoPath, "utf8")) as BuildInfo;
}

function replayRun(seed: string, policy: PolicyId, turns: number): RunState {
  let state = createNewRun(seed);
  const canonicalPolicy = canonicalizePolicyId(policy);
  for (let index = 0; index < turns; index += 1) {
    if (state.game_over) break;
    const ctx = proposeTurn(state);
    const decisions = decide(canonicalPolicy, state, ctx);
    state = applyDecisions(state, decisions);
  }
  return state;
}

export async function runEconomyFiscalDoeHarness(
  options: EconomyFiscalDoeHarnessOptions = {}
) {
  const plan = resolveSeedReplayPlan({
    seed: options.seed,
    seeds: options.seeds,
    policy: options.policy,
    policies: options.policies,
    turns: options.turns,
    limit: options.limit
  });
  const buildInfo = loadBuildInfo();
  const outdir = options.outdir
    ? path.resolve(options.outdir)
    : path.resolve("qa_artifacts", "economy_balance", "v0.3.4", `turns_${plan.turns}`);
  const tuningTableHash = sha256(serializeEconomyFiscalTuningTableSnapshot());

  const metrics = [];
  for (const policy of [...plan.policies].sort((left, right) => left.localeCompare(right))) {
    for (const seed of [...plan.seeds].sort((left, right) => left.localeCompare(right))) {
      const finalState = replayRun(seed, policy, plan.turns);
      metrics.push(buildEconomyFiscalDoeRunMetric(policy, seed, plan.turns, finalState));
    }
  }

  const orderedMetrics = buildEconomyFiscalDoeRunMetricsSnapshot(metrics);
  const summary = buildEconomyFiscalDoeSummary(orderedMetrics);

  const runsArtifact = writeStableArtifact(path.join(outdir, "runs.json"), {
    kind: "economy_fiscal_doe_runs_v1",
    app_version: buildInfo?.app_version ?? APP_VERSION,
    sim_version: buildInfo?.sim_version ?? null,
    code_fingerprint: buildInfo?.code_fingerprint ?? "",
    turns: plan.turns,
    seed_source: plan.seedSource,
    policy_source: plan.policySource,
    seeds: [...plan.seeds].sort((left, right) => left.localeCompare(right)),
    policies: [...plan.policies].sort((left, right) => left.localeCompare(right)),
    run_count: orderedMetrics.length,
    tuning_table_hash: tuningTableHash,
    runs: orderedMetrics
  });

  const summaryArtifact = writeStableArtifact(path.join(outdir, "summary.json"), {
    kind: "economy_fiscal_doe_summary_v1",
    app_version: buildInfo?.app_version ?? APP_VERSION,
    sim_version: buildInfo?.sim_version ?? null,
    code_fingerprint: buildInfo?.code_fingerprint ?? "",
    turns: plan.turns,
    seed_source: plan.seedSource,
    policy_source: plan.policySource,
    seeds: [...plan.seeds].sort((left, right) => left.localeCompare(right)),
    policies: [...plan.policies].sort((left, right) => left.localeCompare(right)),
    tuning_table_hash: tuningTableHash,
    summary
  });

  return {
    outdir,
    turns: plan.turns,
    runsArtifact,
    summaryArtifact
  };
}

async function main() {
  const result = await runEconomyFiscalDoeHarness(parseArgs(process.argv.slice(2)));
  console.log("fiscal doe: PASS");
  console.log(`outdir=${path.relative(process.cwd(), result.outdir).split(path.sep).join("/")}`);
  console.log(`summary_hash=${result.summaryArtifact.hash}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
