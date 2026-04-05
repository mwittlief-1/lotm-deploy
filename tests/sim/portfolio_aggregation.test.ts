import { describe, expect, it } from "vitest";

import {
  ECONOMY_PORTFOLIO_AGGREGATE_SCHEMA_VERSION,
  ECONOMY_PORTFOLIO_MANOR_TOTALS_SCHEMA_VERSION,
  buildEconomyPortfolioAggregate,
  serializeEconomyPortfolioAggregate
} from "../../src/sim/domains/economy/portfolioAggregation";

describe("economy portfolio aggregation", () => {
  it("computes portfolio asset and category totals as sums of manor totals", () => {
    const aggregate = buildEconomyPortfolioAggregate({
      scope_id: "county_review",
      manors: [
        {
          manor_id: "west_hall",
          asset_totals: {
            coin: 7,
            food_stores: 20,
            meat_stores: 3
          },
          category_totals: {
            "obligations.current_due.coin": 2,
            "obligations.arrears.coin": 1,
            "production.food_delta": 11,
            "consumption.food_stores": 8
          }
        },
        {
          manor_id: "abbey_demesne",
          asset_totals: {
            coin: 3,
            food_stores: 12,
            meat_stores: 4
          },
          category_totals: {
            "obligations.current_due.food_stores": 5,
            "obligations.arrears.food_stores": 2,
            "production.meat_delta": 3,
            "consumption.meat_stores": 2,
            "consumption.shortage_bushels": 1
          }
        },
        {
          manor_id: "west_hall",
          asset_totals: {
            coin: 2,
            meat_stores: 1
          },
          category_totals: {
            "production.food_delta": 4,
            "production.meat_delta": 1,
            "consumption.food_stores": 1
          }
        }
      ]
    });

    expect(aggregate.schema_version).toBe(ECONOMY_PORTFOLIO_AGGREGATE_SCHEMA_VERSION);
    expect(aggregate.manor_keys).toEqual([
      "portfolio:county_review:manor:abbey_demesne",
      "portfolio:county_review:manor:west_hall"
    ]);
    expect(aggregate.manor_rows_by_key["portfolio:county_review:manor:west_hall"]).toEqual({
      schema_version: ECONOMY_PORTFOLIO_MANOR_TOTALS_SCHEMA_VERSION,
      scope_key: "portfolio:county_review",
      manor_id: "west_hall",
      manor_key: "portfolio:county_review:manor:west_hall",
      asset_rollup_keys: {
        coin: "portfolio:county_review:manor:west_hall:asset:coin",
        food_stores: "portfolio:county_review:manor:west_hall:asset:food_stores",
        meat_stores: "portfolio:county_review:manor:west_hall:asset:meat_stores"
      },
      category_rollup_keys: {
        "obligations.current_due.coin":
          "portfolio:county_review:manor:west_hall:category:obligations.current_due.coin",
        "obligations.current_due.food_stores":
          "portfolio:county_review:manor:west_hall:category:obligations.current_due.food_stores",
        "obligations.arrears.coin":
          "portfolio:county_review:manor:west_hall:category:obligations.arrears.coin",
        "obligations.arrears.food_stores":
          "portfolio:county_review:manor:west_hall:category:obligations.arrears.food_stores",
        "obligations.enforcement.war_levy":
          "portfolio:county_review:manor:west_hall:category:obligations.enforcement.war_levy",
        "production.food_delta": "portfolio:county_review:manor:west_hall:category:production.food_delta",
        "production.meat_delta": "portfolio:county_review:manor:west_hall:category:production.meat_delta",
        "consumption.food_stores": "portfolio:county_review:manor:west_hall:category:consumption.food_stores",
        "consumption.meat_stores": "portfolio:county_review:manor:west_hall:category:consumption.meat_stores",
        "consumption.shortage_bushels":
          "portfolio:county_review:manor:west_hall:category:consumption.shortage_bushels"
      },
      net_rollup_keys: {
        "net.coin": "portfolio:county_review:manor:west_hall:net.coin",
        "net.food_stores": "portfolio:county_review:manor:west_hall:net.food_stores",
        "net.meat_stores": "portfolio:county_review:manor:west_hall:net.meat_stores"
      },
      asset_totals: {
        coin: 9,
        food_stores: 20,
        meat_stores: 4
      },
      category_totals: {
        "obligations.current_due.coin": 2,
        "obligations.current_due.food_stores": 0,
        "obligations.arrears.coin": 1,
        "obligations.arrears.food_stores": 0,
        "obligations.enforcement.war_levy": 0,
        "production.food_delta": 15,
        "production.meat_delta": 1,
        "consumption.food_stores": 9,
        "consumption.meat_stores": 0,
        "consumption.shortage_bushels": 0
      }
    });
    expect(aggregate.totals_by_asset).toEqual({
      coin: 12,
      food_stores: 32,
      meat_stores: 8
    });
    expect(aggregate.totals_by_category).toEqual({
      "obligations.current_due.coin": 2,
      "obligations.current_due.food_stores": 5,
      "obligations.arrears.coin": 1,
      "obligations.arrears.food_stores": 2,
      "obligations.enforcement.war_levy": 0,
      "production.food_delta": 15,
      "production.meat_delta": 4,
      "consumption.food_stores": 9,
      "consumption.meat_stores": 2,
      "consumption.shortage_bushels": 1
    });
  });

  it("normalizes missing values to zero and keeps manor rows deterministic", () => {
    const aggregate = buildEconomyPortfolioAggregate({
      manors: [
        {
          manor_id: "  north_field  ",
          asset_totals: {
            food_stores: 6
          }
        }
      ]
    });

    expect(aggregate.manor_keys).toEqual(["portfolio:player_portfolio:manor:north_field"]);
    expect(aggregate.manor_rows_by_key["portfolio:player_portfolio:manor:north_field"]).toMatchObject({
      manor_id: "north_field",
      asset_totals: {
        coin: 0,
        food_stores: 6,
        meat_stores: 0
      },
      category_totals: {
        "obligations.current_due.coin": 0,
        "obligations.current_due.food_stores": 0,
        "obligations.arrears.coin": 0,
        "obligations.arrears.food_stores": 0,
        "obligations.enforcement.war_levy": 0,
        "production.food_delta": 0,
        "production.meat_delta": 0,
        "consumption.food_stores": 0,
        "consumption.meat_stores": 0,
        "consumption.shortage_bushels": 0
      }
    });
  });

  it("serializes deterministically regardless of manor input order", () => {
    const aggregateA = buildEconomyPortfolioAggregate({
      scope_id: "county_review",
      manors: [
        {
          manor_id: "west_hall",
          asset_totals: { coin: 4 },
          category_totals: { "production.food_delta": 2 }
        },
        {
          manor_id: "abbey_demesne",
          asset_totals: { coin: 1, food_stores: 9 },
          category_totals: { "consumption.food_stores": 3 }
        }
      ]
    });
    const aggregateB = buildEconomyPortfolioAggregate({
      scope_id: "county_review",
      manors: [
        {
          manor_id: "abbey_demesne",
          asset_totals: { food_stores: 9, coin: 1 },
          category_totals: { "consumption.food_stores": 3 }
        },
        {
          manor_id: "west_hall",
          asset_totals: { coin: 4 },
          category_totals: { "production.food_delta": 2 }
        }
      ]
    });

    expect(serializeEconomyPortfolioAggregate(aggregateA)).toBe(serializeEconomyPortfolioAggregate(aggregateB));
  });
});
