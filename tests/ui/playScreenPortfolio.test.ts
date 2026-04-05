import { describe, expect, it } from "vitest";

import { buildPortfolioOverviewSurface } from "../../src/ui/playScreenPortfolio";

describe("playScreenPortfolio", () => {
  it("returns null when the bounded portfolio surface is absent", () => {
    expect(buildPortfolioOverviewSurface({})).toBeNull();
  });

  it("builds portfolio totals and groups outlier metrics into a bounded manor list", () => {
    const surface = buildPortfolioOverviewSurface({
      world_topology_view: {
        anchor_manor_id: "manor_hx_26597"
      },
      portfolio: {
        schema_version: "economy_portfolio_analysis_v1",
        manor_keys: ["portfolio:player_portfolio:manor:manor_hx_26597", "portfolio:player_portfolio:manor:manor_hx_30001"],
        totals_by_asset: {
          coin: 22,
          food_stores: 145,
          meat_stores: 9
        },
        totals_by_category: {
          "obligations.current_due.coin": 3,
          "obligations.current_due.food_stores": 7,
          "obligations.arrears.coin": 4,
          "obligations.arrears.food_stores": 12
        },
        outliers_by_metric: {
          "outlier.lowest.net.coin": [{ manor_id: "manor_hx_26597", value: 6 }],
          "outlier.lowest.net.food_stores": [{ manor_id: "manor_hx_30001", value: 28 }],
          "outlier.highest.arrears_coin": [{ manor_id: "manor_hx_30001", value: 4 }],
          "outlier.highest.arrears_bushels": [{ manor_id: "manor_hx_30001", value: 12 }],
          "outlier.highest.coin": [{ manor_id: "manor_hx_26597", value: 14 }],
          "outlier.highest.food_stores": [{ manor_id: "manor_hx_26597", value: 90 }]
        }
      }
    });

    expect(surface).toMatchObject({
      manorCount: 2,
      manorCountLabel: "2 tracked manors"
    });
    expect(surface?.summaryCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "coin_total",
          label: "Portfolio coin",
          value: "22 coin"
        }),
        expect.objectContaining({
          id: "food_arrears",
          label: "Food arrears",
          value: "12 bushels"
        })
      ])
    );
    expect(surface?.outlierManors).toEqual([
      {
        manorId: "manor_hx_26597",
        manorLabel: "Current manor",
        summary: "Flagged by 3 tracked extremes.",
        flags: [
          {
            id: "lowest_net_coin",
            label: "Lowest net coin",
            tone: "danger",
            value: "6 coin"
          },
          {
            id: "highest_coin",
            label: "Most coin",
            tone: "neutral",
            value: "14 coin"
          },
          {
            id: "highest_food",
            label: "Most food stores",
            tone: "neutral",
            value: "90 bushels"
          }
        ]
      },
      {
        manorId: "manor_hx_30001",
        manorLabel: "Hx 30001",
        summary: "Flagged by 3 tracked extremes.",
        flags: [
          {
            id: "lowest_net_food",
            label: "Lowest net food",
            tone: "danger",
            value: "28 bushels"
          },
          {
            id: "highest_arrears_coin",
            label: "Most coin arrears",
            tone: "danger",
            value: "4 coin"
          },
          {
            id: "highest_arrears_food",
            label: "Most food arrears",
            tone: "danger",
            value: "12 bushels"
          }
        ]
      }
    ]);
  });
});
