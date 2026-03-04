import fs from "node:fs";
import crypto from "node:crypto";
import { parseBucketOverride, runDemographyBatch, type AgeBucket } from "./demographyBatch";

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
const targetCagrMin = envFloat("DOE_TARGET_CAGR_MIN", 0.0);
const targetCagrMax = envFloat("DOE_TARGET_CAGR_MAX", 0.003);
const lifeStageBuckets = parseBucketOverride(process.env.DOE_BUCKETS);
const seeds = Array.from({ length: seedsCount }, (_, i) => i + 1);

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

      const cagr = Number(summary.population_cagr ?? summary.implied_annual_growth_rate ?? 0);
      const births45 = Number(summary.births_by_maternal_age_band?.["45+"] ?? 0);
      const spacingLt2 = Number(summary.spacing_lt_2_count ?? 0);

      const stabilityShareStd = Object.values(summary.age_structure_stability ?? {})
        .map((x: any) => Number(x?.std_share ?? 0))
        .reduce((a, b) => a + b, 0);
      const stabilityMeanAgeStd = Object.values(summary.age_structure_stability ?? {})
        .map((x: any) => Number(x?.std_age_in_bucket ?? 0))
        .reduce((a, b) => a + b, 0);

      const cagrBandPenalty = cagr < targetCagrMin
        ? (targetCagrMin - cagr) * 100
        : cagr > targetCagrMax
          ? (cagr - targetCagrMax) * 100
          : 0;

      const gatePenalty = births45 > 0 || spacingLt2 > 0 ? 1000 : 0;
      const stabilityPenalty = stabilityShareStd * 10 + stabilityMeanAgeStd * 0.1;
      const score = Number((cagrBandPenalty + stabilityPenalty + gatePenalty).toFixed(6));

      ranked.push({
        fertilityScale,
        mortalityScaleChild,
        mortalityScaleAdult,
        score,
        rank_inputs: {
          target_cagr_min: targetCagrMin,
          target_cagr_max: targetCagrMax,
          cagr_band_penalty: Number(cagrBandPenalty.toFixed(6)),
          stability_share_std_sum: Number(stabilityShareStd.toFixed(6)),
          stability_mean_age_std_sum: Number(stabilityMeanAgeStd.toFixed(6)),
          stability_penalty: Number(stabilityPenalty.toFixed(6)),
          gate_penalty: gatePenalty,
        },
        gates: {
          births_45_plus_must_be_zero: births45 === 0,
          spacing_ge_2_years: spacingLt2 === 0,
        },
        kpis: {
          population_cagr: cagr,
          implied_annual_growth_rate: Number(summary.implied_annual_growth_rate ?? 0),
          births_45_plus: births45,
          spacing_lt_2_count: spacingLt2,
          age_structure_stability: summary.age_structure_stability,
          newborn_end_of_turn_age_distribution: summary.newborn_end_of_turn_age_distribution ?? { "0": 0, "1": 0, "2": 0 },
        },
        summary,
      });
    }
  }
}

ranked.sort((a, b) => a.score - b.score || a.fertilityScale - b.fertilityScale || a.mortalityScaleChild - b.mortalityScaleChild || a.mortalityScaleAdult - b.mortalityScaleAdult);

const out = {
  mode,
  seeds: seedsCount,
  turns,
  grid_values: { fertilityScale: fertilityVals, mortalityScaleChild: mortalityVals, mortalityScaleAdult: mortalityVals },
  life_stage_buckets: lifeStageBuckets,
  bucket_override: stableBucketString(lifeStageBuckets),
  target_cagr: { min: targetCagrMin, max: targetCagrMax },
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
