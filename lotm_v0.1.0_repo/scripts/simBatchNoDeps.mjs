#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Import compiled sim core (no deps)
import { createNewRun, proposeTurn, applyDecisions } from "../dist_batch/src/sim/index.js";
import { decide, canonicalizePolicyId, sanitizePolicyIdForArtifacts } from "../dist_batch/src/sim/policies.js";
import { IMPROVEMENT_IDS } from "../dist_batch/src/content/improvements.js";
import { relationshipBounds } from "../dist_batch/src/sim/relationships.js";

function parseArgs(argv) {
  const a = { policy: "prudent-builder", runs: 250, turns: 15, outdir: "", baseSeed: "" };
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

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filePath, headers, rows) {
  const lines = [];
  lines.push(headers.map(csvEscape).join(","));
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}

function median(sorted) {
  return percentile(sorted, 0.5);
}

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

function runPolicy(seed, policy, turns) {
  let state = createNewRun(seed);
  for (let t = 0; t < turns; t++) {
    const ctx = proposeTurn(state);
    const decisions = decide(policy, state, ctx);
    state = applyDecisions(state, decisions);
    if (state.game_over) break;
  }
  return state;
}

function pickExports(statesBySeed) {
  // select good/bad/weird by a simple score and heuristics
  const arr = Object.values(statesBySeed);
  const scored = arr.map((s) => {
    const score = s.manor.bushels_stored + s.manor.coin * 50 - s.manor.unrest * 20 - s.manor.obligations.arrears.bushels * 0.5;
    return { seed: s.run_seed, state: s, score };
  }).sort((a,b) => b.score - a.score);

  const good = scored[0] ?? null;

  // bad = worst score (or first dispossessed if exists)
  const badCand = [...scored].reverse().find((x) => x.state.game_over) ?? scored[scored.length-1] ?? null;

  // weird = has war levy or succession or extreme swings
  const weirdCand = scored.find((x) => {
    const notes = x.state.log.flatMap((e) => e.report.notes || []);
    const hasSucc = notes.some((n) => String(n).includes("Succession"));
    const hasLevy = notes.some((n) => String(n).includes("War levy"));
    const maxUnrest = Math.max(...x.state.log.map((e) => e.snapshot_after.manor.unrest));
    return hasSucc || hasLevy || maxUnrest >= 90;
  }) ?? scored[Math.floor(scored.length/2)] ?? null;

  return { good, bad: badCand, weird: weirdCand };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const policyCanonical = canonicalizePolicyId(args.policy);
  const runs = Math.max(1, Math.trunc(args.runs));
  const turns = Math.max(1, Math.trunc(args.turns));
  const policySanitized = sanitizePolicyIdForArtifacts(policyCanonical);

  const baseSeed = args.baseSeed || `batch_v0.0.9_${policySanitized}`;
  const outdir = args.outdir || path.join("artifacts", "v0.0.9", policySanitized, `turns_${turns}`);

  ensureDir(outdir);

  const runRows = [];
  const eventCounts = {};
  const byReason = {};
  let completed = 0;

  let stableFinish = 0;
  let tail_unrest_ge_80 = 0;
  let tail_arrears_bushels_ge_1000 = 0;
  let tail_min_bushels_eq_0 = 0;

  let runsWithActiveConstruction = 0;
  let totalTurnsConstructionActive = 0;

  const endBushels = [];
  const endCoin = [];
  const endUnrest = [];
  const endArrearsCoin = [];
  const endArrearsBushels = [];
  const eventsPerTurn = [];

  const statesBySeed = {};

  for (let i = 0; i < runs; i++) {
    const seed = `${baseSeed}_${String(i).padStart(4,"0")}`;
    const state = runPolicy(seed, policyCanonical, turns);
    statesBySeed[seed] = state;

    const isComplete = !state.game_over && state.turn_index >= turns;
    if (isComplete) completed += 1;

    if (!state.game_over && state.manor.unrest <= 40 && state.manor.obligations.arrears.bushels <= 100) stableFinish += 1;
    if (state.manor.unrest >= 80) tail_unrest_ge_80 += 1;
    if (state.manor.obligations.arrears.bushels >= 1000) tail_arrears_bushels_ge_1000 += 1;

    const reason = state.game_over?.reason ?? "";
    if (reason) byReason[reason] = (byReason[reason] ?? 0) + 1;

    endBushels.push(state.manor.bushels_stored);
    endCoin.push(state.manor.coin);
    endUnrest.push(state.manor.unrest);
    endArrearsCoin.push(state.manor.obligations.arrears.coin);
    endArrearsBushels.push(state.manor.obligations.arrears.bushels);

    const eCount = state.log.reduce((s, l) => s + (l.report.events?.length ?? 0), 0);
    eventsPerTurn.push(state.log.length > 0 ? eCount / state.log.length : 0);

    for (const entry of state.log) {
      for (const ev of (entry.report.events ?? [])) {
        eventCounts[ev.id] = (eventCounts[ev.id] ?? 0) + 1;
      }
    }

    const impSet = new Set(state.manor.improvements);

    const energies = state.log.map((l) => l.snapshot_after.house.energy.available);
    const minEnergy = energies.length ? Math.min(...energies) : state.house.energy.available;
    const maxEnergy = energies.length ? Math.max(...energies) : state.house.energy.available;
    const relBounds = relationshipBounds(state);

    const turnsWithConstructionActive = state.log.reduce((acc, l) => acc + (l.snapshot_after.manor.construction ? 1 : 0), 0);
    const hadActiveConstruction = turnsWithConstructionActive > 0 || !!state.manor.construction;
    if (hadActiveConstruction) runsWithActiveConstruction += 1;
    totalTurnsConstructionActive += turnsWithConstructionActive;

    const unrestSeries = state.log.map((l) => l.snapshot_after.manor.unrest);
    const maxUnrest = unrestSeries.length ? Math.max(...unrestSeries) : state.manor.unrest;
    const minUnrest = unrestSeries.length ? Math.min(...unrestSeries) : state.manor.unrest;

    const busSeries = state.log.map((l) => l.snapshot_after.manor.bushels_stored);
    const coinSeries = state.log.map((l) => l.snapshot_after.manor.coin);
    const arrearsBusSeries = state.log.map((l) => l.snapshot_after.manor.obligations.arrears.bushels);
    const minBushels = busSeries.length ? Math.min(...busSeries) : state.manor.bushels_stored;
    const minCoin = coinSeries.length ? Math.min(...coinSeries) : state.manor.coin;
    const maxArrearsBushels = arrearsBusSeries.length ? Math.max(...arrearsBusSeries) : state.manor.obligations.arrears.bushels;
    if (minBushels === 0) tail_min_bushels_eq_0 += 1;

    const row = {
      seed,
      policy_logical: args.policy,
      policy_canonical: policyCanonical,
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
      max_unrest: maxUnrest,
      min_unrest: minUnrest,
      min_bushels: minBushels,
      min_coin: minCoin,
      max_arrears_bushels: maxArrearsBushels,
      min_energy: minEnergy,
      max_energy: maxEnergy,
      ...relBounds
    };

    for (const impId of IMPROVEMENT_IDS) {
      row[`imp_${impId}`] = impSet.has(impId) ? 1 : 0;
    }

    const completedMap = {
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
  }

  const attempted = runs;
  const completionRate = completed / attempted;

  const bSorted = [...endBushels].sort((a,b)=>a-b);
  const cSorted = [...endCoin].sort((a,b)=>a-b);
  const uSorted = [...endUnrest].sort((a,b)=>a-b);
  const abSorted = [...endArrearsBushels].sort((a,b)=>a-b);

  const topEvents = Object.entries(eventCounts)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,10)
    .map(([id,count])=>({id,count}));

  const summary = {
    app_version: "v0.0.9",
    policy_logical: args.policy,
    policy_canonical: policyCanonical,
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
      avg_turns_construction_active: totalTurnsConstructionActive / attempted
    },
    ending_median: {
      bushels: median(bSorted),
      coin: median(cSorted),
      unrest: median(uSorted),
      arrears_bushels: median(abSorted)
    },
    ending_avg: {
      bushels: mean(endBushels),
      coin: mean(endCoin),
      unrest: mean(endUnrest),
      arrears_bushels: mean(endArrearsBushels)
    },
    avg_events_per_turn: mean(eventsPerTurn),
    top_events: topEvents,
    game_over_reasons: byReason
  };

  // write outputs
  fs.writeFileSync(path.join(outdir, "batch_summary.json"), JSON.stringify(summary, null, 2), "utf-8");

  const headers = Object.keys(runRows[0] ?? {});
  writeCsv(path.join(outdir, "runs.csv"), headers, runRows);

  const evRows = Object.entries(eventCounts).sort((a,b)=>b[1]-a[1]).map(([event_id,count])=>({event_id,count}));
  if (evRows.length) writeCsv(path.join(outdir, "event_counts.csv"), ["event_id","count"], evRows);

  const { good, bad, weird } = pickExports(statesBySeed);
  const exportsDir = path.join(outdir, "exports");
  ensureDir(exportsDir);
  if (good) fs.writeFileSync(path.join(exportsDir, "good_run.json"), JSON.stringify(good.state, null, 2), "utf-8");
  if (bad) fs.writeFileSync(path.join(exportsDir, "bad_run.json"), JSON.stringify(bad.state, null, 2), "utf-8");
  if (weird) fs.writeFileSync(path.join(exportsDir, "weird_run.json"), JSON.stringify(weird.state, null, 2), "utf-8");
}

main();