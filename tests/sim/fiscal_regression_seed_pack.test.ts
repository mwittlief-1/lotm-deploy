import { describe, expect, it } from "vitest";

import type { EconomyFiscalDoeRunMetricV1 } from "../../src/sim/domains/economy/fiscalDoe";
import { selectEconomyFiscalRegressionScenarios } from "../../scripts/fiscalRegressionSeeds";

function mkMetric(overrides: Partial<EconomyFiscalDoeRunMetricV1>): EconomyFiscalDoeRunMetricV1 {
  return {
    schema_version: "economy_fiscal_doe_run_metric_v1",
    policy: "builder-forward",
    seed: "seed-a",
    turns_requested: 15,
    turns_played: 15,
    game_over_reason: null,
    game_over_turn: null,
    ending: {
      food_stores: 20,
      meat_stores: 0,
      coin: 1,
      unrest: 40,
      arrears_coin: 0,
      arrears_bushels: 0,
      manor_count: 1
    },
    minima: {
      food_stores: 5,
      meat_stores: 0,
      manor_count: 1
    },
    maxima: {
      arrears_coin: 0,
      arrears_bushels: 0,
      manor_count: 1
    },
    indicators: {
      dispossessed: false,
      any_game_over: false,
      coin_arrears_seen: false,
      bushels_arrears_seen: false,
      any_arrears_seen: false,
      food_stockout_seen: false,
      meat_stockout_seen: true
    },
    ...overrides
  };
}

describe("economy fiscal regression seed pack selection", () => {
  it("picks stable, arrears, dispossession, and manor-count scenarios deterministically", () => {
    const shortRuns = [
      mkMetric({ policy: "prudent-builder", seed: "seed-clear" }),
      mkMetric({
        policy: "builder-forward",
        seed: "seed-arrears",
        ending: {
          food_stores: 10,
          meat_stores: 0,
          coin: 0,
          unrest: 55,
          arrears_coin: 4,
          arrears_bushels: 18,
          manor_count: 1
        },
        maxima: {
          arrears_coin: 4,
          arrears_bushels: 18,
          manor_count: 1
        },
        indicators: {
          dispossessed: false,
          any_game_over: false,
          coin_arrears_seen: true,
          bushels_arrears_seen: true,
          any_arrears_seen: true,
          food_stockout_seen: true,
          meat_stockout_seen: true
        }
      })
    ];
    const longRuns = [
      mkMetric({
        policy: "builder-forward",
        seed: "seed-dispossessed",
        turns_requested: 30,
        turns_played: 24,
        game_over_reason: "Dispossessed",
        game_over_turn: 24,
        ending: {
          food_stores: 0,
          meat_stores: 0,
          coin: 0,
          unrest: 100,
          arrears_coin: 8,
          arrears_bushels: 33,
          manor_count: 1
        },
        maxima: {
          arrears_coin: 8,
          arrears_bushels: 33,
          manor_count: 1
        },
        indicators: {
          dispossessed: true,
          any_game_over: true,
          coin_arrears_seen: true,
          bushels_arrears_seen: true,
          any_arrears_seen: true,
          food_stockout_seen: true,
          meat_stockout_seen: true
        }
      })
    ];

    const scenarios = selectEconomyFiscalRegressionScenarios(
      shortRuns,
      longRuns,
      "qa_artifacts/economy_balance/v0.3.4/turns_15/runs.json",
      "short-hash",
      "qa_artifacts/economy_balance/v0.3.4/turns_30_builder-forward/runs.json",
      "long-hash"
    );

    expect(scenarios.map((scenario) => scenario.scenario_id)).toEqual([
      "stable_clear_prudent_turns_15",
      "arrears_pressure_builder_turns_15",
      "dispossession_builder_turns_30",
      "single_manor_distribution_baseline"
    ]);
    expect(scenarios[0]).toMatchObject({
      policy: "prudent-builder",
      seed: "seed-clear",
      source_hash: "short-hash"
    });
    expect(scenarios[1]).toMatchObject({
      policy: "builder-forward",
      seed: "seed-arrears",
      focus: ["arrears", "stores"]
    });
    expect(scenarios[2]).toMatchObject({
      policy: "builder-forward",
      seed: "seed-dispossessed",
      game_over_reason: "Dispossessed",
      source_hash: "long-hash"
    });
    expect(scenarios[3]).toMatchObject({
      policy: "prudent-builder",
      ending: { manor_count: 1 }
    });
  });
});
