import fs from "node:fs";
import path from "node:path";

import { APP_VERSION } from "../../src/version";
import { canonicalizePolicyId, type PolicyId } from "../../src/sim/policies";

const DEFAULT_GOLDEN_SEEDS = [
  "lotm_v022_seed_001_baseline_extworld",
  "lotm_v022_seed_002_relationship_edges",
  "lotm_v022_seed_003_succession_pressure",
  "lotm_v022_seed_004_widow_line",
  "lotm_v022_seed_005_unrest_pressure",
  "lotm_v022_seed_006_construction_path",
  "lotm_v022_seed_007_weather_volatility",
  "lotm_v022_seed_008_long_tail_check"
];

type BaselinePayload = {
  turns?: number;
  policies?: string[];
  seeds?: string[];
  expected?: Record<string, Record<string, unknown>>;
};

export interface ResolvedSeedReplayPlan {
  appVersion: string;
  turns: number;
  seeds: string[];
  policies: PolicyId[];
  seedSource: string;
  policySource: string;
  baseline: { path: string; payload: BaselinePayload } | null;
  goldenSeedsPath: string | null;
}

export interface ResolveSeedReplayOptions {
  seed?: string | null;
  seeds?: string[];
  policy?: string | null;
  policies?: string[];
  turns?: number | null;
  limit?: number | null;
}

function baselinePathForVersion(appVersion: string): string {
  const v = String(appVersion ?? "");
  if (v.startsWith("v0.2.9") || v.startsWith("0.2.9")) return "docs/qa/v0.2.9_non_perturbation_baseline_v0.2.9.json";
  if (v.startsWith("v0.2.7.1") || v.startsWith("v0.2.7.2")) return "docs/qa/v0.2.7.1_non_perturbation_baseline_v0.2.7.1.json";
  if (v.startsWith("v0.2.7") || v.startsWith("v0.2.6.2")) return "docs/qa/v0.2.6.2_non_perturbation_baseline_v0.2.6.2.json";
  if (v.startsWith("v0.2.6")) return "docs/qa/v0.2.6_non_perturbation_baseline_v0.2.6.json";
  if (v.startsWith("v0.2.5")) return "docs/qa/v0.2.5_non_perturbation_baseline_v0.2.5.json";
  if (v.startsWith("v0.2.4")) return "docs/qa/v0.2.4_non_perturbation_baseline_v0.2.4.json";
  return "docs/qa/v0.2.3_non_perturbation_baseline_v0.2.2.json";
}

function goldenSeedCandidates(appVersion: string): string[] {
  return [
    `docs/golden_seeds_${appVersion}.json`,
    "docs/golden_seeds_v0.2.7.2.json",
    "docs/golden_seeds_v0.2.7.1.json",
    "docs/golden_seeds_v0.2.7.json",
    "docs/golden_seeds_v0.2.6.2.json",
    "docs/golden_seeds_v0.2.6.json",
    "docs/golden_seeds_v0.2.3.json",
    "docs/golden_seeds_v0.2.2.json",
    "docs/golden_seeds_v0.2.1.json",
    "docs/golden_seeds_v0.1.0.json",
    "docs/golden_seeds_v0.0.9.json"
  ];
}

function loadJsonIfExists<T>(relPath: string): T | null {
  const absPath = path.resolve(relPath);
  if (!fs.existsSync(absPath)) return null;
  return JSON.parse(fs.readFileSync(absPath, "utf8")) as T;
}

function uniquePreserve<T>(rows: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row)) continue;
    seen.add(row);
    out.push(row);
  }
  return out;
}

function normalizedSeeds(rows: string[]): string[] {
  return uniquePreserve(
    rows
      .map((row) => String(row ?? "").trim())
      .filter((row) => row.length > 0)
  );
}

function normalizedPolicies(rows: string[]): PolicyId[] {
  return uniquePreserve(
    rows
      .map((row) => canonicalizePolicyId(row))
      .filter((row) => row.length > 0)
  );
}

export function resolveSeedReplayPlan(options: ResolveSeedReplayOptions): ResolvedSeedReplayPlan {
  const appVersion = APP_VERSION;
  const baselinePath = baselinePathForVersion(appVersion);
  const baselinePayload = loadJsonIfExists<BaselinePayload>(baselinePath);
  const baseline = baselinePayload ? { path: baselinePath, payload: baselinePayload } : null;

  let goldenSeedsPath: string | null = null;
  let fallbackGoldenSeeds: string[] = [];
  for (const candidate of goldenSeedCandidates(appVersion)) {
    const payload = loadJsonIfExists<{ golden_seeds?: Array<string | { seed?: string }>; seeds?: Array<string | { seed?: string }> }>(candidate);
    if (!payload) continue;
    const rows = payload.golden_seeds ?? payload.seeds ?? [];
    fallbackGoldenSeeds = normalizedSeeds(
      rows.map((row) => (typeof row === "string" ? row : String(row?.seed ?? "")))
    );
    goldenSeedsPath = candidate;
    break;
  }

  const explicitSeeds = normalizedSeeds([
    ...(options.seed ? [options.seed] : []),
    ...((options.seeds ?? []).flatMap((row) => String(row).split(",")))
  ]);
  const explicitPolicies = normalizedPolicies([
    ...(options.policy ? [options.policy] : []),
    ...((options.policies ?? []).flatMap((row) => String(row).split(",")))
  ]);

  const baselineSeeds = normalizedSeeds(baseline?.payload.seeds ?? []);
  const baselinePolicies = normalizedPolicies(baseline?.payload.policies ?? []);

  let seeds = explicitSeeds;
  let seedSource = "explicit";
  if (seeds.length === 0 && baselineSeeds.length > 0) {
    seeds = baselineSeeds;
    seedSource = `baseline:${baselinePath}`;
  } else if (seeds.length === 0 && fallbackGoldenSeeds.length > 0) {
    seeds = fallbackGoldenSeeds;
    seedSource = `golden-seeds:${goldenSeedsPath}`;
  } else if (seeds.length === 0) {
    seeds = DEFAULT_GOLDEN_SEEDS.slice();
    seedSource = "default";
  }

  let policies = explicitPolicies;
  let policySource = "explicit";
  if (policies.length === 0 && baselinePolicies.length > 0) {
    policies = baselinePolicies;
    policySource = `baseline:${baselinePath}`;
  } else if (policies.length === 0) {
    policies = ["prudent-builder"];
    policySource = "default";
  }

  const limit = options.limit == null ? null : Math.max(1, Math.trunc(options.limit));
  if (limit != null) seeds = seeds.slice(0, limit);

  const turns = Math.max(1, Math.trunc(options.turns ?? baseline?.payload.turns ?? 15));

  return {
    appVersion,
    turns,
    seeds,
    policies,
    seedSource,
    policySource,
    baseline,
    goldenSeedsPath
  };
}

