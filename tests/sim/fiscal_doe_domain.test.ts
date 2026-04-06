import { describe, expect, it } from "vitest";

import {
  ECONOMY_FISCAL_DOE_RUN_METRIC_SCHEMA_VERSION,
  ECONOMY_FISCAL_DOE_SUMMARY_SCHEMA_VERSION,
  buildEconomyFiscalDoeRunMetricsSnapshot,
  buildEconomyFiscalDoeSummary,
  type EconomyFiscalDoeRunMetricV1
} from "../../src/sim/domains/economy/fiscalDoe";

function mkMetric(overrides: Partial<EconomyFiscalDoeRunMetricV1>): EconomyFiscalDoeRunMetricV1 {
  return {
    schema_version: ECONOMY_FISCAL_DOE_RUN_METRIC_SCHEMA_VERSION,
    policy: "builder-forward",
    seed: "seed-a",
    turns_requested: 15,
    turns_played: 15,
    game_over_reason: null,
    game_over_turn: null,
    ending: {
      food_stores: 120,
      meat_stores: 14,
      coin: 8,
      unrest: 35,
      arrears_coin: 0,
      arrears_bushels: 3,
      manor_count: 1
    },
    minima: {
      food_stores: 24,
      meat_stores: 2,
      manor_count: 1
    },
    maxima: {
      arrears_coin: 2,
      arrears_bushels: 7,
      manor_count: 1
    },
    indicators: {
      dispossessed: false,
      any_game_over: false,
      coin_arrears_seen: true,
      bushels_arrears_seen: true,
      any_arrears_seen: true,
      food_stockout_seen: false,
      meat_stockout_seen: false
    },
    ...overrides
  };
}

describe("economy fiscal DOE domain", () => {
  it("orders run metrics deterministically by policy then seed", () => {
    const ordered = buildEconomyFiscalDoeRunMetricsSnapshot([
      mkMetric({ policy: "prudent-builder", seed: "seed-b" }),
      mkMetric({ policy: "builder-forward", seed: "seed-c" }),
      mkMetric({ policy: "builder-forward", seed: "seed-a" })
    ]);

    expect(ordered.map((metric) => `${metric.policy}:${metric.seed}`)).toEqual([
      "builder-forward:seed-a",
      "builder-forward:seed-c",
      "prudent-builder:seed-b"
    ]);
  });

  it("aggregates arrears, dispossession, stores, and manor-count KPIs by policy", () => {
    const summary = buildEconomyFiscalDoeSummary([
      mkMetric({
        policy: "builder-forward",
        seed: "seed-a",
        indicators: {
          dispossessed: false,
          any_game_over: false,
          coin_arrears_seen: true,
          bushels_arrears_seen: true,
          any_arrears_seen: true,
          food_stockout_seen: false,
          meat_stockout_seen: false
        },
        ending: {
          food_stores: 120,
          meat_stores: 14,
          coin: 8,
          unrest: 35,
          arrears_coin: 0,
          arrears_bushels: 3,
          manor_count: 1
        }
      }),
      mkMetric({
        policy: "builder-forward",
        seed: "seed-b",
        game_over_reason: "Dispossessed",
        game_over_turn: 11,
        ending: {
          food_stores: 0,
          meat_stores: 0,
          coin: 0,
          unrest: 100,
          arrears_coin: 5,
          arrears_bushels: 18,
          manor_count: 2
        },
        minima: {
          food_stores: 0,
          meat_stores: 0,
          manor_count: 1
        },
        maxima: {
          arrears_coin: 5,
          arrears_bushels: 18,
          manor_count: 2
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
      }),
      mkMetric({
        policy: "prudent-builder",
        seed: "seed-c",
        ending: {
          food_stores: 80,
          meat_stores: 6,
          coin: 4,
          unrest: 28,
          arrears_coin: 0,
          arrears_bushels: 0,
          manor_count: 1
        },
        minima: {
          food_stores: 10,
          meat_stores: 1,
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
          meat_stockout_seen: false
        }
      })
    ]);

    expect(summary.schema_version).toBe(ECONOMY_FISCAL_DOE_SUMMARY_SCHEMA_VERSION);
    expect(summary.policy_ids).toEqual(["builder-forward", "prudent-builder"]);
    expect(summary.overall.dispossession).toMatchObject({
      dispossessed_count: 1,
      dispossession_rate: 1 / 3,
      any_game_over_count: 1,
      median_game_over_turn: 11
    });
    expect(summary.by_policy["builder-forward"]).toMatchObject({
      run_count: 2,
      arrears: {
        coin_seen_share: 1,
        bushels_seen_share: 1,
        any_seen_share: 1
      },
      stores: {
        food_stockout_seen_share: 0.5,
        meat_stockout_seen_share: 0.5
      }
    });
    expect(summary.by_policy["builder-forward"].manor_count_distribution).toEqual([
      { manor_count: 1, run_count: 1, share: 0.5 },
      { manor_count: 2, run_count: 1, share: 0.5 }
    ]);
    expect(summary.by_policy["prudent-builder"].arrears.any_seen_share).toBe(0);
  });
});
