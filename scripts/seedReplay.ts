#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { buildRunSummary } from "../src/sim/exports";
import { createNewRun, proposeTurn, applyDecisions } from "../src/sim/index";
import { canonicalizePolicyId, decide, sanitizePolicyIdForArtifacts, type PolicyId } from "../src/sim/policies";
import { buildRunProvenanceV1 } from "../src/sim/provenance";
import type { RunState, TurnLogEntry } from "../src/sim/types";
import { APP_VERSION } from "../src/version";
import { defaultReplayOutdir, runArtifactPath, summaryArtifactPath, writeStableArtifact } from "./seed_replay/artifactWriter";
import { stableStringify } from "./seed_replay/hash";
import { resolveSeedReplayPlan } from "./seed_replay/seedPlan";

type Mode = "single" | "batch";

type ReplayBudgets = {
  snapshotCapBytesPerTurn: number;
  turnTimeSoftCeilingMsPerSeed: number;
};

type Args = {
  mode: Mode;
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

function parseArgs(argv: string[]): Args {
  const args: Args = { mode: "single" };
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, rawValue = ""] = arg.slice(2).split("=");
    const key = rawKey.trim();
    const value = rawValue.trim();
    if (!key) continue;
    if (key === "mode" && (value === "single" || value === "batch")) args.mode = value;
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

function readReplayBudgets(): ReplayBudgets {
  const runtimeContract = fs.readFileSync(path.resolve("ops", "v0.3", "runtime-contract.yaml"), "utf8");
  const snapshotCapMatch = runtimeContract.match(/snapshot_cap_bytes_per_turn:\s*(\d+)/);
  const turnTimeMatch = runtimeContract.match(/turn_time_soft_ceiling_ms_per_seed:\s*(\d+)/);

  if (!snapshotCapMatch || !turnTimeMatch) {
    throw new Error("Unable to read replay budgets from ops/v0.3/runtime-contract.yaml");
  }

  return {
    snapshotCapBytesPerTurn: Number(snapshotCapMatch[1]),
    turnTimeSoftCeilingMsPerSeed: Number(turnTimeMatch[1])
  };
}

function coreEconomySig(state: RunState) {
  return {
    turn_index: state.turn_index,
    game_over_reason: state.game_over?.reason ?? null,
    manor: {
      population: state.manor.population,
      farmers: state.manor.farmers,
      builders: state.manor.builders,
      bushels_stored: state.manor.bushels_stored,
      coin: state.manor.coin,
      unrest: state.manor.unrest,
      arrears_coin: state.manor.obligations?.arrears?.coin ?? 0,
      arrears_bushels: state.manor.obligations?.arrears?.bushels ?? 0,
      improvements: [...(state.manor.improvements ?? [])].slice().sort()
    },
    energy: {
      max: state.house?.energy?.max ?? null,
      available: state.house?.energy?.available ?? null
    }
  };
}

function buildTurnTrace(entry: TurnLogEntry) {
  const after = entry.snapshot_after;
  return {
    turn_index: entry.processed_turn_index,
    summary: entry.summary,
    decisions: entry.decisions,
    deltas: entry.deltas,
    ending: {
      population: after.manor.population,
      farmers: after.manor.farmers,
      builders: after.manor.builders,
      bushels_stored: after.manor.bushels_stored,
      coin: after.manor.coin,
      unrest: after.manor.unrest,
      arrears_coin: after.manor.obligations.arrears.coin,
      arrears_bushels: after.manor.obligations.arrears.bushels,
      energy_max: after.house.energy.max,
      energy_available: after.house.energy.available
    },
    top_drivers: entry.report.top_drivers,
    notes: entry.report.notes,
    event_ids: entry.report.events.map((event) => event.id),
    house_log: entry.report.house_log,
    phase_results_v0: entry.report.phase_results_v0 ?? [],
    resolution_phase_results_v0: entry.report.resolution_phase_results_v0 ?? [],
    prospects_log: entry.report.prospects_log ?? []
  };
}

function replayRun(
  seed: string,
  policy: PolicyId,
  turns: number,
  budgets: ReplayBudgets
): { finalState: RunState; trace: ReturnType<typeof buildTurnTrace>[]; snapshotMaxBytes: number } {
  let state = createNewRun(seed);
  const canonicalPolicy = canonicalizePolicyId(policy);
  let snapshotMaxBytes = 0;
  let turnTimeOverages = 0;
  for (let i = 0; i < turns; i++) {
    if (state.game_over) break;
    const startedAt = process.hrtime.bigint();
    const ctx = proposeTurn(state);
    const decisions = decide(canonicalPolicy, state, ctx);
    state = applyDecisions(state, decisions);
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (elapsedMs > budgets.turnTimeSoftCeilingMsPerSeed) {
      turnTimeOverages += 1;
    }

    const latest = state.log.at(-1);
    const snapshotAfter = latest?.snapshot_after;
    if (snapshotAfter) {
      const bytes = Buffer.byteLength(stableStringify(snapshotAfter), "utf8");
      snapshotMaxBytes = Math.max(snapshotMaxBytes, bytes);
      if (bytes > budgets.snapshotCapBytesPerTurn) {
        throw new Error(
          `Seed replay snapshot cap exceeded (seed=${seed}, policy=${canonicalPolicy}, turn=${i + 1}, bytes=${bytes}, cap=${budgets.snapshotCapBytesPerTurn})`
        );
      }
    }
  }
  if (turnTimeOverages > 0) {
    console.warn(
      `seed replay warning: ${turnTimeOverages} turn(s) exceeded the soft time ceiling (${budgets.turnTimeSoftCeilingMsPerSeed}ms) for seed=${seed}, policy=${canonicalPolicy}`
    );
  }
  const trace = state.log.map(buildTurnTrace);
  return { finalState: state, trace, snapshotMaxBytes };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const plan = resolveSeedReplayPlan({
    seed: args.seed,
    seeds: args.seeds,
    policy: args.policy,
    policies: args.policies,
    turns: args.turns,
    limit: args.limit
  });
  const buildInfo = loadBuildInfo();

  const mode: Mode = args.mode;
  const seeds = mode === "single" ? [plan.seeds[0]!].filter(Boolean) : plan.seeds;
  const policies = mode === "single" ? [canonicalizePolicyId(args.policy ?? plan.policies[0] ?? "prudent-builder")] : plan.policies;
  const outdir = args.outdir ? path.resolve(args.outdir) : defaultReplayOutdir(plan.appVersion, mode, plan.turns);

  const budgets = readReplayBudgets();
  const runs: Array<{
    policy: PolicyId;
    seed: string;
    turns: number;
    artifact_relpath: string;
    hash: string;
    final_signature: ReturnType<typeof coreEconomySig>;
    final_summary: ReturnType<typeof buildRunSummary>;
    baseline_match: boolean | null;
    snapshot_max_bytes: number;
  }> = [];

  for (const policy of policies.slice().sort((a, b) => a.localeCompare(b))) {
    for (const seed of seeds.slice().sort((a, b) => a.localeCompare(b))) {
      const { finalState, trace, snapshotMaxBytes } = await replayRun(seed, policy, plan.turns, budgets);
      const finalSignature = coreEconomySig(finalState);
      const baselineExpected =
        plan.baseline && Number(plan.baseline.payload.turns ?? 15) === plan.turns
          ? plan.baseline.payload.expected?.[policy]?.[seed] ?? null
          : null;
      const payload = {
        kind: "seed_replay_run_v1",
        app_version: buildInfo?.app_version ?? APP_VERSION,
        sim_version: buildInfo?.sim_version ?? finalState.version,
        code_fingerprint: buildInfo?.code_fingerprint ?? "",
        seed,
        policy,
        turns_requested: plan.turns,
        turns_played: finalState.turn_index,
        final_signature: finalSignature,
        final_summary: buildRunSummary(finalState),
        run_provenance_v1: buildRunProvenanceV1(finalState),
        baseline_expected_signature: baselineExpected,
        baseline_match: baselineExpected ? stableStringify(baselineExpected) === stableStringify(finalSignature) : null,
        turn_trace: trace
      };
      const artifactPath = runArtifactPath(outdir, sanitizePolicyIdForArtifacts(policy), seed);
      const written = writeStableArtifact(artifactPath, payload);
      runs.push({
        policy,
        seed,
        turns: plan.turns,
        artifact_relpath: path.relative(process.cwd(), artifactPath).split(path.sep).join("/"),
        hash: written.hash,
        final_signature: finalSignature,
        final_summary: payload.final_summary,
        baseline_match: payload.baseline_match,
        snapshot_max_bytes: snapshotMaxBytes
      });
    }
  }

  const summaryPayload = {
    kind: "seed_replay_batch_v1",
    app_version: buildInfo?.app_version ?? APP_VERSION,
    sim_version: buildInfo?.sim_version ?? null,
    code_fingerprint: buildInfo?.code_fingerprint ?? "",
    run_provenance_v1: buildRunProvenanceV1(),
    mode,
    turns: plan.turns,
    seed_source: plan.seedSource,
    policy_source: plan.policySource,
    baseline_path: plan.baseline?.path ?? null,
    golden_seeds_path: plan.goldenSeedsPath,
    seeds,
    policies,
    run_count: runs.length,
    baseline_match_count: runs.filter((run) => run.baseline_match === true).length,
    baseline_mismatch_count: runs.filter((run) => run.baseline_match === false).length,
    snapshot_budget_bytes_per_turn: budgets.snapshotCapBytesPerTurn,
    turn_time_soft_ceiling_ms_per_seed: budgets.turnTimeSoftCeilingMsPerSeed,
    runs
  };
  const summary = writeStableArtifact(summaryArtifactPath(outdir), summaryPayload);

  console.log(`seed replay ${mode}: PASS`);
  console.log(`outdir=${path.relative(process.cwd(), outdir).split(path.sep).join("/")}`);
  console.log(`summary_hash=${summary.hash}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
