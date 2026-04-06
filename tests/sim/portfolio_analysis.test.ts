import { describe, expect, it } from "vitest";

import {
  ECONOMY_PORTFOLIO_ANALYSIS_SCHEMA_VERSION,
  ECONOMY_PORTFOLIO_MANOR_ANALYSIS_SCHEMA_VERSION,
  ECONOMY_PORTFOLIO_OUTLIER_ENTRY_SCHEMA_VERSION,
  ECONOMY_PORTFOLIO_OUTLIER_LIMIT,
  buildEconomyPortfolioAnalysis,
  serializeEconomyPortfolioAnalysis
} from "../../src/sim/domains/economy/portfolioAnalysis";

describe("economy portfolio analysis", () => {
  it("computes asset-local manor nets deterministically", () => {
    const analysis = buildEconomyPortfolioAnalysis({
      scope_id: "county_review",
      manors: [
        {
          manor_id: "abbey_demesne",
          asset_totals: {
            coin: 2,
            food_stores: 10,
            meat_stores: 1
          },
          category_totals: {
            "obligations.current_due.coin": 4,
            "obligations.arrears.coin": 3,
            "obligations.current_due.food_stores": 1
          }
        },
        {
          manor_id: "west_hall",
          asset_totals: {
            coin: 12,
            food_stores: 4,
            meat_stores: 6
          },
          category_totals: {
            "obligations.current_due.coin": 1,
            "obligations.current_due.food_stores": 5,
            "obligations.arrears.food_stores": 4
          }
        }
      ]
    });

    expect(analysis.schema_version).toBe(ECONOMY_PORTFOLIO_ANALYSIS_SCHEMA_VERSION);
    expect(analysis.manor_rows_by_key["portfolio:county_review:manor:abbey_demesne"]).toMatchObject({
      schema_version: ECONOMY_PORTFOLIO_MANOR_ANALYSIS_SCHEMA_VERSION,
      net_values: {
        "net.coin": -5,
        "net.food_stores": 9,
        "net.meat_stores": 1
      }
    });
    expect(analysis.manor_rows_by_key["portfolio:county_review:manor:west_hall"]).toMatchObject({
      schema_version: ECONOMY_PORTFOLIO_MANOR_ANALYSIS_SCHEMA_VERSION,
      net_values: {
        "net.coin": 11,
        "net.food_stores": -5,
        "net.meat_stores": 6
      }
    });
  });

  it("builds bounded outlier lists with stable tie-break ordering", () => {
    const analysis = buildEconomyPortfolioAnalysis({
      scope_id: "county_review",
      manors: [
        {
          manor_id: "west_hall",
          asset_totals: { coin: 12, food_stores: 7, meat_stores: 3 },
          category_totals: { "consumption.shortage_bushels": 2 }
        },
        {
          manor_id: "north_field",
          asset_totals: { coin: 12, food_stores: 6, meat_stores: 2 },
          category_totals: { "consumption.shortage_bushels": 5 }
        },
        {
          manor_id: "abbey_demesne",
          asset_totals: { coin: 2, food_stores: 10, meat_stores: 1 },
          category_totals: {
            "obligations.current_due.coin": 4,
            "obligations.arrears.coin": 3
          }
        },
        {
          manor_id: "east_fen",
          asset_totals: { coin: 1, food_stores: 8, meat_stores: 5 },
          category_totals: {
            "obligations.current_due.food_stores": 6,
            "obligations.arrears.food_stores": 5
          }
        }
      ]
    });

    expect(analysis.outliers_by_metric["outlier.highest.coin"]).toEqual([
      {
        schema_version: ECONOMY_PORTFOLIO_OUTLIER_ENTRY_SCHEMA_VERSION,
        metric_key: "outlier.highest.coin",
        manor_id: "north_field",
        manor_key: "portfolio:county_review:manor:north_field",
        rank: 1,
        value: 12
      },
      {
        schema_version: ECONOMY_PORTFOLIO_OUTLIER_ENTRY_SCHEMA_VERSION,
        metric_key: "outlier.highest.coin",
        manor_id: "west_hall",
        manor_key: "portfolio:county_review:manor:west_hall",
        rank: 2,
        value: 12
      },
      {
        schema_version: ECONOMY_PORTFOLIO_OUTLIER_ENTRY_SCHEMA_VERSION,
        metric_key: "outlier.highest.coin",
        manor_id: "abbey_demesne",
        manor_key: "portfolio:county_review:manor:abbey_demesne",
        rank: 3,
        value: 2
      }
    ]);
    expect(analysis.outliers_by_metric["outlier.lowest.net.coin"]).toEqual([
      {
        schema_version: ECONOMY_PORTFOLIO_OUTLIER_ENTRY_SCHEMA_VERSION,
        metric_key: "outlier.lowest.net.coin",
        manor_id: "abbey_demesne",
        manor_key: "portfolio:county_review:manor:abbey_demesne",
        rank: 1,
        value: -5
      },
      {
        schema_version: ECONOMY_PORTFOLIO_OUTLIER_ENTRY_SCHEMA_VERSION,
        metric_key: "outlier.lowest.net.coin",
        manor_id: "east_fen",
        manor_key: "portfolio:county_review:manor:east_fen",
        rank: 2,
        value: 1
      },
      {
        schema_version: ECONOMY_PORTFOLIO_OUTLIER_ENTRY_SCHEMA_VERSION,
        metric_key: "outlier.lowest.net.coin",
        manor_id: "north_field",
        manor_key: "portfolio:county_review:manor:north_field",
        rank: 3,
        value: 12
      }
    ]);
    expect(analysis.outliers_by_metric["outlier.highest.consumption.shortage_bushels"][0]).toMatchObject({
      manor_id: "north_field",
      value: 5
    });
    expect(analysis.outliers_by_metric["outlier.highest.coin"]).toHaveLength(ECONOMY_PORTFOLIO_OUTLIER_LIMIT);
  });

  it("serializes deterministically regardless of manor input order", () => {
    const analysisA = buildEconomyPortfolioAnalysis({
      scope_id: "county_review",
      manors: [
        {
          manor_id: "west_hall",
          asset_totals: { coin: 4 },
          category_totals: { "production.food_delta": 2 }
        },
        {
          manor_id: "abbey_demesne",
          asset_totals: { food_stores: 9, coin: 1 },
          category_totals: { "consumption.food_stores": 3 }
        }
      ]
    });
    const analysisB = buildEconomyPortfolioAnalysis({
      scope_id: "county_review",
      manors: [
        {
          manor_id: "abbey_demesne",
          asset_totals: { coin: 1, food_stores: 9 },
          category_totals: { "consumption.food_stores": 3 }
        },
        {
          manor_id: "west_hall",
          asset_totals: { coin: 4 },
          category_totals: { "production.food_delta": 2 }
        }
      ]
    });

    expect(serializeEconomyPortfolioAnalysis(analysisA)).toBe(serializeEconomyPortfolioAnalysis(analysisB));
  });
});
