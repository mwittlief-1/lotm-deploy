import fs from "node:fs";
import { parseBucketOverride, runDemographyBatch } from "./demographyBatch";

function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }
function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

const fertilityVals = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5];
const mortalityVals = [0.9, 1.0, 1.1];
const dir = "qa_artifacts/demography_batch";

const seedsCount = envInt("AUDIT_SEEDS", 80);
const turns = envInt("AUDIT_TURNS", 30);
const mode = (process.env.AUDIT_MODE === "cohort" ? "cohort" : "sim") as "cohort" | "sim";
const lateTurnStart = envInt("AUDIT_LATE_TURN_START", 16);
const lateTurnEnd = envInt("AUDIT_LATE_TURN_END", 29);
const survivalTurn = envInt("AUDIT_SURVIVAL_TURN", 29);
const lifeStageBuckets = parseBucketOverride(process.env.AUDIT_BUCKETS);

const seeds = Array.from({ length: seedsCount }, (_, i) => i + 1);
ensureDir(dir);

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

type CellAudit = {
  fertilityScale: number;
  mortalityScaleChild: number;
  mortalityScaleAdult: number;
  seeds: number;
  turns: number;
  game_over_reason_counts: Record<string, number>;
  first_game_over_turn_median: number | null;
  first_game_over_turn_mean: number | null;
  survival_share_past_turn: number;
  late_activity_mean_all_seeds: number;
  late_activity_mean_survivor_seeds: number;
  survivor_seed_count: number;
  births_by_mother_residency_totals: {
    player_house_resident: number;
    non_player_house_resident: number;
    unknown_mother_or_residency: number;
  };
};

const cells: CellAudit[] = [];

for (const fertilityScale of fertilityVals) {
  for (const mortalityScaleChild of mortalityVals) {
    for (const mortalityScaleAdult of mortalityVals) {
      const reasonCounts: Record<string, number> = {};
      const firstGameOverTurns: number[] = [];
      const lateAll: number[] = [];
      const lateSurvivors: number[] = [];
      let survivors = 0;
      const birthsByMotherResidencyTotals = {
        player_house_resident: 0,
        non_player_house_resident: 0,
        unknown_mother_or_residency: 0,
      };

      for (const seed of seeds) {
        const summary = runDemographyBatch(
          [seed],
          turns,
          { fertilityScale, mortalityScaleChild, mortalityScaleAdult },
          mode,
          { lifeStageBuckets },
        );

        const outcome = summary.seed_game_over_outcomes[0];
        birthsByMotherResidencyTotals.player_house_resident += Number(summary.births_by_mother_residency?.player_house_resident ?? 0);
        birthsByMotherResidencyTotals.non_player_house_resident += Number(summary.births_by_mother_residency?.non_player_house_resident ?? 0);
        birthsByMotherResidencyTotals.unknown_mother_or_residency += Number(summary.births_by_mother_residency?.unknown_mother_or_residency ?? 0);
        const reason = outcome?.game_over_reason ?? "None";
        reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;

        if (typeof outcome?.first_game_over_turn === "number") {
          firstGameOverTurns.push(outcome.first_game_over_turn);
        }

        const lateActivity = (summary.per_turn ?? [])
          .filter((row) => row.turn >= lateTurnStart && row.turn <= lateTurnEnd)
          .reduce((acc, row) => acc + Number(row.births ?? 0) + Number(row.deaths ?? 0), 0);
        lateAll.push(lateActivity);

        const isSurvivor = outcome?.first_game_over_turn == null || outcome.first_game_over_turn > survivalTurn;
        if (isSurvivor) {
          survivors += 1;
          lateSurvivors.push(lateActivity);
        }
      }

      const firstMedian = firstGameOverTurns.length > 0 ? Number(median(firstGameOverTurns).toFixed(3)) : null;
      const firstMean = firstGameOverTurns.length > 0
        ? Number((firstGameOverTurns.reduce((a, b) => a + b, 0) / firstGameOverTurns.length).toFixed(3))
        : null;
      const lateAllMean = lateAll.length > 0 ? Number((lateAll.reduce((a, b) => a + b, 0) / lateAll.length).toFixed(6)) : 0;
      const lateSurvivorMean = lateSurvivors.length > 0
        ? Number((lateSurvivors.reduce((a, b) => a + b, 0) / lateSurvivors.length).toFixed(6))
        : 0;

      cells.push({
        fertilityScale,
        mortalityScaleChild,
        mortalityScaleAdult,
        seeds: seedsCount,
        turns,
        game_over_reason_counts: reasonCounts,
        first_game_over_turn_median: firstMedian,
        first_game_over_turn_mean: firstMean,
        survival_share_past_turn: Number((survivors / Math.max(1, seedsCount)).toFixed(6)),
        late_activity_mean_all_seeds: lateAllMean,
        late_activity_mean_survivor_seeds: lateSurvivorMean,
        survivor_seed_count: survivors,
        births_by_mother_residency_totals: birthsByMotherResidencyTotals,
      });
    }
  }
}

cells.sort((a, b) => b.survival_share_past_turn - a.survival_share_past_turn || b.late_activity_mean_survivor_seeds - a.late_activity_mean_survivor_seeds);

const out = {
  mode,
  seeds: seedsCount,
  turns,
  late_window: { start: lateTurnStart, end: lateTurnEnd },
  survival_turn: survivalTurn,
  grid_values: { fertilityScale: fertilityVals, mortalityScaleChild: mortalityVals, mortalityScaleAdult: mortalityVals },
  population_count_basis: "alive_people_registry",
  cells,
};

fs.writeFileSync(`${dir}/audit_summary.json`, JSON.stringify(out, null, 2));
console.log(`wrote ${dir}/audit_summary.json (${seedsCount} seeds x ${turns} turns x ${cells.length} combos)`);
