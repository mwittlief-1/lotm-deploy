#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createNewRun, proposeTurn, applyDecisions } from "../src/sim/index";
import type { RunState } from "../src/sim/types";
import { decide, canonicalizePolicyId, sanitizePolicyIdForArtifacts, type PolicyId } from "../src/sim/policies";
import { IMPROVEMENT_IDS } from "../src/content/improvements";
import { relationshipBounds } from "../src/sim/relationships";
import { buildRunSummary } from "../src/sim/exports";

type Args = {
  policy: string;
  runs: number;
  turns: number;
  outdir?: string;
  baseSeed?: string;
};

function parseArgs(argv: string[]): Args {
  const a: Args = { policy: "prudent-builder", runs: 250, turns: 15 };
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [k, v] = arg.slice(2).split("=");
    if (!k) continue;
    if (k === "policy" && v) a.policy = v;
    if (k === "runs" && v) a.runs = Number(v);
    if (k === "turns" && v) a.turns = Number(v);
    if (k === "outdir" && v) a.outdir = v;
    if (k === "baseSeed" && v) a.baseSeed = v;
  }
  return a;
}


function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1))));
  return sorted[idx]!;
}

function median(sorted: number[]): number {
  return percentile(sorted, 0.5);
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filePath: string, headers: string[], rows: Array<Record<string, unknown>>) {
  const lines: string[] = [];
  lines.push(headers.map(csvEscape).join(","));
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
}

function runPolicy(seed: string, policy: PolicyId, turns: number): RunState {
  let state = createNewRun(seed);
  for (let t = 0; t < turns; t++) {
    const ctx = proposeTurn(state);
    const decisions = decide(policy, state, ctx);
    state = applyDecisions(state, decisions);
    if (state.game_over) break;
  }
  return state;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const policy = canonicalizePolicyId(args.policy);
  const runs = Math.max(1, Math.trunc(args.runs));
  const turns = Math.max(1, Math.trunc(args.turns));
  const policySanitized = sanitizePolicyIdForArtifacts(policy);
  const baseSeed = args.baseSeed ?? `batch_v0.0.9_${policySanitized}`;
  const outdir = args.outdir ?? path.join("artifacts", "v0.0.9", policySanitized, `turns_${turns}`);

  ensureDir(outdir);

  const runRows: Array<Record<string, unknown>> = [];
  const eventCounts: Record<string, number> = {};
  const gameOverTurns: number[] = [];
  const endBushels: number[] = [];
  const endCoin: number[] = [];
  const endUnrest: number[] = [];
  const endArrearsCoin: number[] = [];
  const endArrearsBushels: number[] = [];
  const eventsPerTurn: number[] = [];

  const byReason: Record<string, number> = {};
  const gameOverByTurn: Record<string, number> = { "6": 0, "9": 0, "12": 0, "15": 0 };

  let completed = 0;

  // v0.0.9 evaluation contract KPIs
  let stableFinish = 0;
  let tail_unrest_ge_80 = 0;
  let tail_arrears_bushels_ge_1000 = 0;
  let tail_min_bushels_eq_0 = 0;

  // v0.0.7 harness telemetry (construction path verification)
  let runsWithActiveConstruction = 0;
  let totalTurnsConstructionActive = 0;
  let totalProjectsStarted = 0;
  let totalProjectsCompleted = 0;

  const fullExports: Array<{ seed: string; state: RunState; score: number }> = [];

  for (let i = 0; i < runs; i++) {
    const seed = `${baseSeed}_${String(i).padStart(4, "0")}`;
    const state = runPolicy(seed, policy, turns);

    const isComplete = !state.game_over && state.turn_index >= turns;
    if (isComplete) completed += 1;

    const reason = state.game_over?.reason ?? "";
    if (reason) byReason[reason] = (byReason[reason] ?? 0) + 1;

    const goTurn = state.game_over?.turn_index ?? turns;
    if (state.game_over) {
      gameOverTurns.push(goTurn);
      if (goTurn <= 6) gameOverByTurn["6"] += 1;
      if (goTurn <= 9) gameOverByTurn["9"] += 1;
      if (goTurn <= 12) gameOverByTurn["12"] += 1;
      if (goTurn <= 15) gameOverByTurn["15"] += 1;
    }

    endBushels.push(state.manor.bushels_stored);
    endCoin.push(state.manor.coin);
    endUnrest.push(state.manor.unrest);
    endArrearsCoin.push(state.manor.obligations.arrears.coin);
    endArrearsBushels.push(state.manor.obligations.arrears.bushels);

    // v0.0.9 Stable Finish + tails
    const isStableFinish = !state.game_over && state.manor.unrest <= 40 && state.manor.obligations.arrears.bushels <= 100;
    if (isStableFinish) stableFinish += 1;
    if (state.manor.unrest >= 80) tail_unrest_ge_80 += 1;
    if (state.manor.obligations.arrears.bushels >= 1000) tail_arrears_bushels_ge_1000 += 1;

    // event counts
    const eCount = state.log.reduce((s, l) => s + l.report.events.length, 0);
    eventsPerTurn.push(state.log.length > 0 ? eCount / state.log.length : 0);
    for (const entry of state.log) {
      for (const e of entry.report.events) {
        eventCounts[e.id] = (eventCounts[e.id] ?? 0) + 1;
      }
    }

    // improvements booleans
    const impSet = new Set(state.manor.improvements);

    // energy & relationship clamps (for QA convenience)
    const energies = state.log.map((l) => l.snapshot_after.house.energy.available);
    const minEnergy = energies.length > 0 ? Math.min(...energies) : state.house.energy.available;
    const maxEnergy = energies.length > 0 ? Math.max(...energies) : state.house.energy.available;
    const relBounds = relationshipBounds(state);


    // Construction telemetry (policy/harness correctness)
    const turnsWithConstructionActive = state.log.reduce((acc, l) => acc + (l.snapshot_after.manor.construction ? 1 : 0), 0);
    const projectsStarted = state.log.reduce((acc, l) => acc + (!l.snapshot_before.manor.construction && l.snapshot_after.manor.construction ? 1 : 0), 0);
    const projectsCompleted = state.log.reduce((acc, l) => acc + (l.report.construction.completed_improvement_id ? 1 : 0), 0);
    const hadActiveConstruction = turnsWithConstructionActive > 0 || !!state.manor.construction;

    // Extremes (for gating analysis)
    const unrestSeries = state.log.map((l) => l.snapshot_after.manor.unrest);
    const maxUnrest = unrestSeries.length > 0 ? Math.max(...unrestSeries) : state.manor.unrest;
    const minUnrest = unrestSeries.length > 0 ? Math.min(...unrestSeries) : state.manor.unrest;
    const minBushels = state.log.length > 0 ? Math.min(...state.log.map((l) => l.snapshot_after.manor.bushels_stored)) : state.manor.bushels_stored;
    if (minBushels === 0) tail_min_bushels_eq_0 += 1;
    const minCoin = state.log.length > 0 ? Math.min(...state.log.map((l) => l.snapshot_after.manor.coin)) : state.manor.coin;
    const arrearsCoinSeries = state.log.map((l) => l.snapshot_after.manor.obligations.arrears.coin);
    const arrearsBushelsSeries = state.log.map((l) => l.snapshot_after.manor.obligations.arrears.bushels);
    const maxArrearsCoin = arrearsCoinSeries.length > 0 ? Math.max(...arrearsCoinSeries) : state.manor.obligations.arrears.coin;
    const minArrearsCoin = arrearsCoinSeries.length > 0 ? Math.min(...arrearsCoinSeries) : state.manor.obligations.arrears.coin;
    const maxArrearsBushels = arrearsBushelsSeries.length > 0 ? Math.max(...arrearsBushelsSeries) : state.manor.obligations.arrears.bushels;
    const minArrearsBushels = arrearsBushelsSeries.length > 0 ? Math.min(...arrearsBushelsSeries) : state.manor.obligations.arrears.bushels;

    if (hadActiveConstruction) runsWithActiveConstruction += 1;
    totalTurnsConstructionActive += turnsWithConstructionActive;
    totalProjectsStarted += projectsStarted;
    totalProjectsCompleted += projectsCompleted;

    const row: Record<string, unknown> = {
      seed,

      policy_logical: args.policy,
      policy_canonical: policy,
      policy_artifact_folder: policySanitized,
      horizon_turns: turns,
      turns_played: state.turn_index,
      completed: isComplete ? 1 : 0,
      game_over_reason: reason,
      game_over_turn: state.game_over?.turn_index ?? "",
      end_bushels: state.manor.bushels_stored,
      end_coin: state.manor.coin,
      end_unrest: state.manor.unrest,
      end_arrears_coin: state.manor.obligations.arrears.coin,
      end_arrears_bushels: state.manor.obligations.arrears.bushels,
      avg_events_per_turn: eventsPerTurn[eventsPerTurn.length - 1] ?? 0,
      had_active_construction: hadActiveConstruction ? 1 : 0,
      turns_construction_active: turnsWithConstructionActive,
      projects_started: projectsStarted,
      projects_completed: projectsCompleted,
      max_unrest: maxUnrest,
      min_unrest: minUnrest,
      min_bushels: minBushels,
      min_coin: minCoin,
      max_arrears_coin: maxArrearsCoin,
      min_arrears_coin: minArrearsCoin,
      max_arrears_bushels: maxArrearsBushels,
      min_arrears_bushels: minArrearsBushels,
      min_energy: minEnergy,
      max_energy: maxEnergy,
      ...relBounds
    };

    for (const impId of IMPROVEMENT_IDS) {
      row[`imp_${impId}`] = impSet.has(impId) ? 1 : 0;
    }

    // Friendly improvement booleans (stable column names for balance gating)
    const completedMap: Record<string, string> = {
      completed_granary: "granary_upgrade",
      completed_rotation: "field_rotation",
      completed_drainage: "drainage_ditches",
      completed_watch: "watch_ward",
      completed_mill: "mill_efficiency",
      completed_physician: "physician",
      completed_feast: "village_feast",
      completed_retinue: "retinue_drills"
    };
    for (const [col, impId] of Object.entries(completedMap)) {
      row[col] = impSet.has(impId) ? 1 : 0;
    }

    runRows.push(row);

    // Keep a few full exports for "good/bad/weird" selection
    const score = state.manor.bushels_stored + state.manor.coin * 50 - state.manor.unrest * 20;
    fullExports.push({ seed, state, score });
  }

  // summary stats
  const attempted = runs;
  const completionRate = completed / attempted;

  const goSorted = [...gameOverTurns].sort((a, b) => a - b);
  const bSorted = [...endBushels].sort((a, b) => a - b);
  const cSorted = [...endCoin].sort((a, b) => a - b);
  const uSorted = [...endUnrest].sort((a, b) => a - b);
  const acSorted = [...endArrearsCoin].sort((a, b) => a - b);
  const abSorted = [...endArrearsBushels].sort((a, b) => a - b);

  const topEvents = Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, count }));

  const summary = {
    policy,
    policy_sanitized: policySanitized,
    horizon_turns: turns,
    attempted,
    completed,
    completion_rate: completionRate,
    stable_finish: {
      definition: "end_unrest<=40 AND end_arrears_bushels<=100 AND not game_over",
      count: stableFinish,
      rate: stableFinish / attempted
    },
    tails: {
      pct_end_unrest_ge_80: tail_unrest_ge_80 / attempted,
      pct_end_arrears_bushels_ge_1000: tail_arrears_bushels_ge_1000 / attempted,
      pct_min_bushels_eq_0: tail_min_bushels_eq_0 / attempted
    },
    construction_path: {
      pct_runs_had_active_construction: runsWithActiveConstruction / attempted,
      avg_turns_construction_active: totalTurnsConstructionActive / attempted,
      avg_projects_started: totalProjectsStarted / attempted,
      avg_projects_completed: totalProjectsCompleted / attempted
    },
    game_over_by_turn: gameOverByTurn,
    game_over_reasons: Object.entries(byReason)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count, pct: count / attempted })),
    game_over_turn: {
      median: median(goSorted),
      p10: percentile(goSorted, 0.1),
      p90: percentile(goSorted, 0.9)
    },
    ending: {
      avg_bushels: mean(endBushels),
      med_bushels: median(bSorted),
      avg_coin: mean(endCoin),
      med_coin: median(cSorted),
      avg_unrest: mean(endUnrest),
      med_unrest: median(uSorted),
      avg_arrears_coin: mean(endArrearsCoin),
      med_arrears_coin: median(acSorted),
      avg_arrears_bushels: mean(endArrearsBushels),
      med_arrears_bushels: median(abSorted)
    },
    events: {
      avg_events_per_turn: mean(eventsPerTurn),
      top10: topEvents
    },
    allowed_game_over_reasons: ["Dispossessed", "DeathNoHeir"]
  };

  fs.writeFileSync(path.join(outdir, "batch_summary.json"), JSON.stringify(summary, null, 2), "utf-8");

  // event histogram csv
  const eventRows = Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ event_id: id, count }));
  writeCsv(path.join(outdir, "event_counts.csv"), ["event_id", "count"], eventRows);

  // runs csv
  const headers = Object.keys(runRows[0] ?? { seed: "", policy: "" });
  writeCsv(path.join(outdir, "runs.csv"), headers, runRows);

  // Select exports
  fullExports.sort((a, b) => b.score - a.score);
  const good = fullExports[0];
  const bad = fullExports[fullExports.length - 1];
  const weird = fullExports.find((x) => x.state.game_over?.reason === "Dispossessed") ?? fullExports[Math.floor(fullExports.length / 2)];

  if (good) fs.writeFileSync(path.join(outdir, "good_run.json"), JSON.stringify(good.state, null, 2), "utf-8");
  if (bad) fs.writeFileSync(path.join(outdir, "bad_run.json"), JSON.stringify(bad.state, null, 2), "utf-8");
  if (weird) fs.writeFileSync(path.join(outdir, "weird_run.json"), JSON.stringify(weird.state, null, 2), "utf-8");

  // Also write run summaries for fast scan
  const summaries = [good, bad, weird].filter(Boolean).map((x: any) => buildRunSummary(x.state));
  fs.writeFileSync(path.join(outdir, "run_summaries.json"), JSON.stringify(summaries, null, 2), "utf-8");

  console.log(`Done. Wrote artifacts to ${outdir}`);
}

main();
