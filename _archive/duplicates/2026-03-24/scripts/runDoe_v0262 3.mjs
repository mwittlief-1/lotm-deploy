#!/usr/bin/env node
/*
  v0.2.6.2 DOE runner (deterministic, tooling-only)

  Runs a 3×3 sweep:
    fertility_mult ∈ {1.0, 1.5, 2.0}
    mortality_mult ∈ {1.0, 0.8, 0.6}

  Fixed harness conditions:
    - policy: prudent-builder
    - courtVariant: A
    - prospectPolicy: reject-all
    - runs: 50
    - turns: 30

  Outputs:
    - artifacts/v0.2.6.2_doe/results.csv
    - artifacts/v0.2.6.2_doe/results_table.md

  Note: If a cell already contains a batch_summary.json, it is re-used (resume-friendly).
*/

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function csvEscape(s) {
  const str = String(s ?? "");
  if (/[\n\r,\"]/g.test(str)) return `"${str.replace(/\"/g, '""')}"`;
  return str;
}

function writeCsv(filepath, headers, rows) {
  const lines = [];
  lines.push(headers.join(","));
  for (const r of rows) {
    const line = headers.map((h) => csvEscape(r[h])).join(",");
    lines.push(line);
  }
  fs.writeFileSync(filepath, lines.join("\n"), "utf-8");
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function renderMarkdownTable(results) {
  // Mortality rows, fertility columns.
  const ferts = Array.from(new Set(results.map((r) => r.fertility_mult))).sort((a, b) => a - b);
  const morts = Array.from(new Set(results.map((r) => r.mortality_mult))).sort((a, b) => b - a);

  const lookup = new Map();
  for (const r of results) {
    lookup.set(`${r.mortality_mult}|${r.fertility_mult}`, r);
  }

  const lines = [];
  lines.push("| mortality\\fertility | " + ferts.map((f) => f.toFixed(1)).join(" | ") + " |");
  lines.push("|---|" + ferts.map(() => "---").join("|") + "|");

  for (const m of morts) {
    const cells = [];
    for (const f of ferts) {
      const r = lookup.get(`${m}|${f}`);
      if (!r) {
        cells.push("—");
      } else {
        const compPct = Math.round(r.completion_rate * 100);
        const dnhPct = Math.round(r.death_no_heir_rate * 100);
        cells.push(`${compPct}% / DNH ${dnhPct}%`);
      }
    }
    lines.push(`| ${m.toFixed(1)} | ` + cells.join(" | ") + " |");
  }

  lines.push("");
  lines.push("Legend: cell = completion% / DeathNoHeir% (DNH).\n");
  return lines.join("\n");
}

function main() {
  const POLICY = "prudent-builder";
  const COURT = "A";
  const PROSPECTS = "reject-all";
  const RUNS = 50;
  const TURNS = 30;

  const fertVals = [1.0, 1.5, 2.0];
  const mortVals = [1.0, 0.8, 0.6];

  const outBase = path.join("artifacts", "v0.2.6.2_doe");
  ensureDir(outBase);

  const baseSeed = `doe_v0.2.6.2_${POLICY}_A_reject_all_${RUNS}x${TURNS}`;

  const results = [];

  for (const fert of fertVals) {
    for (const mort of mortVals) {
      const cellId = `fert_${fert.toFixed(1)}__mort_${mort.toFixed(1)}`;
      const outdir = path.join(outBase, cellId, `court_${COURT}`, `prospects_${PROSPECTS}`, `turns_${TURNS}`);
      ensureDir(outdir);

      const summaryPath = path.join(outdir, "batch_summary.json");

      const cmdArgs = [
        "scripts/simBatchNoDeps.mjs",
        `--policy=${POLICY}`,
        `--courtVariant=${COURT}`,
        `--prospectPolicy=${PROSPECTS}`,
        `--runs=${RUNS}`,
        `--turns=${TURNS}`,
        `--fertilityMult=${fert}`,
        `--mortalityMult=${mort}`,
        `--baseSeed=${baseSeed}`,
        `--outdir=${outdir}`
      ];

      const cmdStr = `node ${cmdArgs.map((x) => (x.includes(" ") ? JSON.stringify(x) : x)).join(" ")}`;
      console.log(`\n[DOE] ${cellId}`);
      console.log(cmdStr);

      if (!fs.existsSync(summaryPath)) {
        const res = spawnSync("node", cmdArgs, { stdio: "inherit" });
        if (res.status !== 0) {
          throw new Error(`DOE cell failed (${cellId}) with exit code ${res.status}`);
        }
      } else {
        console.log(`[DOE] Skipping (existing): ${summaryPath}`);
      }

      if (!fs.existsSync(summaryPath)) {
        throw new Error(`Missing batch_summary.json for ${cellId}: ${summaryPath}`);
      }

      const summary = readJson(summaryPath);
      const attempted = summary.attempted ?? RUNS;
      const completed = summary.completed ?? 0;
      const completion_rate = summary.completion_rate ?? 0;
      const dnhCount = summary.game_over_reasons?.DeathNoHeir ?? 0;
      const death_no_heir_rate = attempted > 0 ? dnhCount / attempted : 0;
      const stable_finish_rate = summary?.stable_finish?.rate ?? 0;
      const births_total = summary.births_total ?? 0;
      const deaths_total = summary.deaths_total ?? 0;

      results.push({
        fertility_mult: fert,
        mortality_mult: mort,
        attempted,
        completed,
        completion_rate,
        death_no_heir_count: dnhCount,
        death_no_heir_rate,
        stable_finish_rate,
        births_total,
        deaths_total,
        base_seed: baseSeed,
        outdir,
        cmd: cmdStr
      });
    }
  }

  // Write combined outputs
  const resultsCsv = path.join(outBase, "results.csv");
  const headers = [
    "fertility_mult",
    "mortality_mult",
    "attempted",
    "completed",
    "completion_rate",
    "death_no_heir_count",
    "death_no_heir_rate",
    "stable_finish_rate",
    "births_total",
    "deaths_total",
    "base_seed",
    "outdir",
    "cmd"
  ];

  writeCsv(resultsCsv, headers, results);

  const md = renderMarkdownTable(results);
  fs.writeFileSync(path.join(outBase, "results_table.md"), md, "utf-8");

  console.log("\n[DOE] DONE");
  console.log(`Wrote: ${resultsCsv}`);
  console.log(`Wrote: ${path.join(outBase, "results_table.md")}`);
  console.log("\n" + md);
}

main();
