import { describe, expect, it } from "vitest";
import { computeAgeBucketSnapshot, evaluateLateHorizonActivity, parseBucketOverride, runDemographyBatch } from "../../scripts/demographyBatch";

describe("demography batch KPI helpers", () => {
  it("bucket shares sum to ~1.0 for a snapshot", () => {
    const buckets = parseBucketOverride("0-14,15-25,26-40,41-65,66+");
    const snap = computeAgeBucketSnapshot([3, 8, 16, 22, 30, 45, 67, 80], buckets);
    const sum = Object.values(snap).reduce((a, b) => a + b.share_of_population, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
  });

  it("population growth from Turn 0 to Turn N matches hand calculation", () => {
    const summary = runDemographyBatch([1], 2, { fertilityScale: 1.0, mortalityScaleChild: 1.0, mortalityScaleAdult: 1.0 }, "sim");
    const expected = summary.alive_people_start > 0 ? (summary.alive_people_end - summary.alive_people_start) / summary.alive_people_start : 0;
    expect(summary.population_growth_turn_0_to_n).toBeCloseTo(expected, 12);
  });

  it("small fixed-seed batch produces non-zero births or deaths", () => {
    const summary = runDemographyBatch([1], 6, { fertilityScale: 1.5, mortalityScaleChild: 1.0, mortalityScaleAdult: 1.0 }, "sim");
    expect(summary.total_births + summary.total_deaths).toBeGreaterThan(0);
  });

  it("reports population growth KPI as (Pop_n - Pop_0)/Pop_0", () => {
    const summary = runDemographyBatch([1], 2, { fertilityScale: 1.0, mortalityScaleChild: 1.0, mortalityScaleAdult: 1.0 }, "sim");
    const expected = summary.alive_people_start > 0 ? (summary.alive_people_end - summary.alive_people_start) / summary.alive_people_start : 0;
    expect(summary.population_growth_turn_0_to_n).toBeCloseTo(expected, 12);
  });


  it("uses alive people registry as population basis and reports mother residency birth buckets", () => {
    const summary = runDemographyBatch([1], 4, { fertilityScale: 1.2, mortalityScaleChild: 1.0, mortalityScaleAdult: 1.0 }, "sim");
    expect(summary.population_count_basis).toBe("alive_people_registry");
    const residencyBirths =
      Number(summary.births_by_mother_residency.player_house_resident) +
      Number(summary.births_by_mother_residency.non_player_house_resident) +
      Number(summary.births_by_mother_residency.unknown_mother_or_residency);
    expect(residencyBirths).toBe(summary.total_births);
  });

  it("marks late-horizon runs invalid when births+deaths are below threshold", () => {
    const perTurn = Array.from({ length: 30 }, (_, turn) => ({ turn, births: 0, deaths: 0 }));
    const result = evaluateLateHorizonActivity(perTurn, 30, 16, 29, 1);
    expect(result.activity).toBe(0);
    expect(result.valid).toBe(false);
  });

  it("does not apply late-horizon gate when turns do not include the window", () => {
    const perTurn = Array.from({ length: 10 }, (_, turn) => ({ turn, births: 0, deaths: 0 }));
    const result = evaluateLateHorizonActivity(perTurn, 10, 16, 29, 1);
    expect(result.valid).toBe(true);
  });


  it("reports seed survival and game-over summary metrics", () => {
    const summary = runDemographyBatch([1, 2], 6, { fertilityScale: 1.0, mortalityScaleChild: 1.0, mortalityScaleAdult: 1.0 }, "sim");
    expect(summary.seed_game_over_outcomes.length).toBe(2);
    expect(summary.seeds_surviving_past_turn_29_share).toBeNull();
    expect(summary.alive_turns_count_stats.mean).toBeGreaterThanOrEqual(0);
    expect(Object.values(summary.game_over_reason_counts).reduce((a, b) => a + b, 0)).toBe(2);
  });

  it("reports survival-past-29 share only when horizon reaches 30 turns", () => {
    const summary = runDemographyBatch([1], 30, { fertilityScale: 1.0, mortalityScaleChild: 1.0, mortalityScaleAdult: 1.0 }, "sim");
    expect(summary.seeds_surviving_past_turn_29_share).not.toBeNull();
    expect(summary.seeds_surviving_past_turn_29_count).not.toBeNull();
  });

  it("attributes births by mother residency using residence_house_id/house_id", () => {
    const summary = runDemographyBatch([1, 2, 3], 10, { fertilityScale: 1.4, mortalityScaleChild: 1.0, mortalityScaleAdult: 1.0 }, "sim");
    if (summary.total_births > 0) {
      expect(summary.births_by_mother_residency.unknown_mother_or_residency).toBeLessThan(summary.total_births);
    }
  });

});
