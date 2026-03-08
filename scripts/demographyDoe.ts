import fs from "node:fs";
import crypto from "node:crypto";
import { evaluateLateHorizonActivity, parseBucketOverride, runDemographyBatch, type AgeBucket } from "./demographyBatch";

function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }
function sha(v: string) { return crypto.createHash("sha256").update(v).digest("hex"); }
function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}
function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function stableBucketString(buckets: AgeBucket[]): string {
  return buckets.map((b) => `${b.label}:${b.min}-${b.max}`).join(",");
}

const fertilityVals = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5];
const mortalityVals = [0.9, 1.0, 1.1];
const dir = "qa_artifacts/demography_batch";
const seedsCount = envInt("DOE_SEEDS", 240);
const turns = envInt("DOE_TURNS", 45);
const mode = (process.env.DOE_MODE === "cohort" ? "cohort" : "sim") as "cohort" | "sim";
const targetTurnGrowth = envFloat("DOE_TARGET_TURN_GROWTH", 1.003);
const lateTurnStart = envInt("DOE_LATE_TURN_START", 16);
const lateTurnEnd = envInt("DOE_LATE_TURN_END", 29);
const lateHorizonActivityMin = envFloat("DOE_LATE_ACTIVITY_MIN", 1);
const survivalTurn = envInt("DOE_SURVIVAL_TURN", 29);
const minSurvivalShare = envFloat("DOE_MIN_SURVIVAL_SHARE", 0);
const lifeStageBuckets = parseBucketOverride(process.env.DOE_BUCKETS);
const seeds = Array.from({ length: seedsCount }, (_, i) => i + 1);
const targetPopulationGrowthTurn0ToN = Math.pow(targetTurnGrowth, turns) - 1;

ensureDir(dir);

const ranked: any[] = [];
for (const fertilityScale of fertilityVals) {
  for (const mortalityScaleChild of mortalityVals) {
    for (const mortalityScaleAdult of mortalityVals) {
      const summary = runDemographyBatch(
        seeds,
        turns,
        { fertilityScale, mortalityScaleChild, mortalityScaleAdult },
        mode,
        { lifeStageBuckets },
      );

      const alivePeopleStart = Number(summary.alive_people_start ?? 0);
      const alivePeopleEnd = Number(summary.alive_people_end ?? 0);
      const populationGrowthTurn0ToN = Number(summary.population_growth_turn_0_to_n ?? (alivePeopleStart > 0 ? (alivePeopleEnd - alivePeopleStart) / alivePeopleStart : 0));
      const births45 = Number(summary.births_by_maternal_age_band?.["45+"] ?? 0);
      const spacingLt2 = Number(summary.spacing_lt_2_count ?? 0);

      const stabilityShareStd = Object.values(summary.age_structure_stability ?? {})
        .map((x: any) => Number(x?.std_share ?? 0))
        .reduce((a, b) => a + b, 0);
      const stabilityMeanAgeStd = Object.values(summary.age_structure_stability ?? {})
        .map((x: any) => Number(x?.std_age_in_bucket ?? 0))
        .reduce((a, b) => a + b, 0);

      const populationChangePenalty = Math.abs(populationGrowthTurn0ToN - targetPopulationGrowthTurn0ToN) * 100;

      const lateHorizonActivity = evaluateLateHorizonActivity(summary.per_turn, turns, lateTurnStart, lateTurnEnd, lateHorizonActivityMin);
      const survivalShare = turns > survivalTurn
        ? Number((summary.seed_game_over_outcomes ?? []).filter((row: any) => row?.first_game_over_turn === null || Number(row?.first_game_over_turn) > survivalTurn).length / Math.max(1, summary.seeds ?? 1))
        : 1;
      const survivalCoverageValid = turns <= survivalTurn || survivalShare >= minSurvivalShare;
      const invalidReasons: string[] = [];
      if (!lateHorizonActivity.valid) invalidReasons.push("late_horizon_activity");
      if (!survivalCoverageValid) invalidReasons.push("survival_coverage");
      const invalidForRanking = invalidReasons.length > 0;

      const gatePenalty = births45 > 0 || spacingLt2 > 0 ? 1000 : 0;
      const invalidRankingPenalty = invalidForRanking ? 1000000 : 0;
      const stabilityPenalty = stabilityShareStd * 10 + stabilityMeanAgeStd * 0.1;
      const score = Number((populationChangePenalty + stabilityPenalty + gatePenalty + invalidRankingPenalty).toFixed(6));

      ranked.push({
        fertilityScale,
        mortalityScaleChild,
        mortalityScaleAdult,
        score,
        rank_inputs: {
          target_turn_growth: targetTurnGrowth,
          target_population_growth_turn_0_to_n: Number(targetPopulationGrowthTurn0ToN.toFixed(12)),
          population_change_penalty: Number(populationChangePenalty.toFixed(6)),
          stability_share_std_sum: Number(stabilityShareStd.toFixed(6)),
          stability_mean_age_std_sum: Number(stabilityMeanAgeStd.toFixed(6)),
          stability_penalty: Number(stabilityPenalty.toFixed(6)),
          gate_penalty: gatePenalty,
          invalid_ranking_penalty: invalidRankingPenalty,
          survival_share: Number(survivalShare.toFixed(6)),
          invalid_reasons: invalidReasons,
        },
        gates: {
          births_45_plus_must_be_zero: births45 === 0,
          spacing_ge_2_years: spacingLt2 === 0,
          late_horizon_activity_nonzero: lateHorizonActivity.valid,
          survival_coverage_meets_min: survivalCoverageValid,
          invalid_for_ranking_reason_coded: invalidReasons.length > 0,
        },
        kpis: {
          alive_people_start: alivePeopleStart,
          alive_people_end: alivePeopleEnd,
          population_growth_turn_0_to_n: Number(populationGrowthTurn0ToN.toFixed(12)),
          target_population_growth_turn_0_to_n: Number(targetPopulationGrowthTurn0ToN.toFixed(12)),
          population_count_basis: summary.population_count_basis,
          births_45_plus: births45,
          spacing_lt_2_count: spacingLt2,
          late_horizon_activity: lateHorizonActivity.activity,
          invalid_for_ranking: invalidForRanking,
          survival_share_past_turn: Number(survivalShare.toFixed(6)),
          age_structure_stability: summary.age_structure_stability,
          first_game_over_turn_stats: summary.first_game_over_turn_stats,
          alive_turns_count_stats: summary.alive_turns_count_stats,
          game_over_reason_counts: summary.game_over_reason_counts,
          seeds_surviving_past_turn_29_count: summary.seeds_surviving_past_turn_29_count,
          seeds_surviving_past_turn_29_share: summary.seeds_surviving_past_turn_29_share,
          invalid_reasons: invalidReasons,
          newborn_end_of_turn_age_distribution: summary.newborn_end_of_turn_age_distribution ?? { "0": 0, "1": 0, "2": 0 },
          births_by_mother_residency: summary.births_by_mother_residency,
        },
        invalid_for_ranking: invalidForRanking,
        invalid_reasons: invalidReasons,
        summary,
      });
    }
  }
}

ranked.sort((a, b) => Number(a.invalid_for_ranking) - Number(b.invalid_for_ranking) || a.score - b.score || a.fertilityScale - b.fertilityScale || a.mortalityScaleChild - b.mortalityScaleChild || a.mortalityScaleAdult - b.mortalityScaleAdult);

const out = {
  mode,
  seeds: seedsCount,
  turns,
  grid_values: { fertilityScale: fertilityVals, mortalityScaleChild: mortalityVals, mortalityScaleAdult: mortalityVals },
  life_stage_buckets: lifeStageBuckets,
  bucket_override: stableBucketString(lifeStageBuckets),
  target_turn_growth: targetTurnGrowth,
  target_population_growth_turn_0_to_n: Number(targetPopulationGrowthTurn0ToN.toFixed(12)),
  population_count_basis: "alive_people_registry",
  late_horizon_activity_gate: {
    turn_start: lateTurnStart,
    turn_end: lateTurnEnd,
    min_births_plus_deaths: lateHorizonActivityMin,
  },
  survival_coverage_gate: {
    survival_turn: survivalTurn,
    min_survival_share: minSurvivalShare,
  },
  invalid_for_ranking_count: ranked.filter((x) => x.invalid_for_ranking).length,
  invalid_reason_counts: {
    late_horizon_activity: ranked.filter((x) => Array.isArray(x.invalid_reasons) && x.invalid_reasons.includes("late_horizon_activity")).length,
    survival_coverage: ranked.filter((x) => Array.isArray(x.invalid_reasons) && x.invalid_reasons.includes("survival_coverage")).length,
    both: ranked.filter((x) => Array.isArray(x.invalid_reasons) && x.invalid_reasons.length > 1).length,
  },
  ranked,
};

fs.writeFileSync(`${dir}/doe_ranked.json`, JSON.stringify(out, null, 2));

const cohortTxt = fs.existsSync(`${dir}/cohort_summary.json`) ? fs.readFileSync(`${dir}/cohort_summary.json`, "utf8") : "";
const simTxt = fs.existsSync(`${dir}/sim_summary.json`) ? fs.readFileSync(`${dir}/sim_summary.json`, "utf8") : "";
const doeTxt = fs.readFileSync(`${dir}/doe_ranked.json`, "utf8");

const hashes = {
  cohort_summary: sha(cohortTxt),
  sim_summary: sha(simTxt),
  doe_ranked: sha(doeTxt),
};
fs.writeFileSync(`${dir}/hashes.json`, JSON.stringify(hashes, null, 2));
console.log(`wrote doe_ranked.json and hashes.json (${seedsCount} seeds x ${turns} turns x ${fertilityVals.length * mortalityVals.length * mortalityVals.length} combos)`);
