import { describe, expect, it } from "vitest";

import {
  buildPortfolioOverviewSurface,
  buildPortfolioScopeContract
} from "../../src/ui/playScreenPortfolio";

const PREVIEW_STATE = {
  world_topology_view: {
    anchor_manor_id: "manor_hx_26597"
  },
  portfolio: {
    schema_version: "economy_portfolio_analysis_v1",
    manor_keys: [
      "portfolio:player_portfolio:manor:manor_hx_26597",
      "portfolio:player_portfolio:manor:manor_hx_30001",
      "portfolio:player_portfolio:manor:manor_hx_31000"
    ],
    totals_by_asset: {
      coin: 31,
      food_stores: 176,
      meat_stores: 12
    },
    totals_by_category: {
      "obligations.current_due.coin": 4,
      "obligations.current_due.food_stores": 9,
      "obligations.arrears.coin": 5,
      "obligations.arrears.food_stores": 12
    },
    manor_rows_by_key: {
      "portfolio:player_portfolio:manor:manor_hx_26597": {
        manor_id: "manor_hx_26597",
        manor_key: "portfolio:player_portfolio:manor:manor_hx_26597",
        asset_totals: {
          coin: 14,
          food_stores: 90,
          meat_stores: 4
        },
        category_totals: {
          "obligations.current_due.coin": 2,
          "obligations.current_due.food_stores": 4,
          "obligations.arrears.coin": 1,
          "obligations.arrears.food_stores": 0
        },
        net_values: {
          "net.coin": 11,
          "net.food_stores": 86,
          "net.meat_stores": 4
        }
      },
      "portfolio:player_portfolio:manor:manor_hx_30001": {
        manor_id: "manor_hx_30001",
        manor_key: "portfolio:player_portfolio:manor:manor_hx_30001",
        asset_totals: {
          coin: 8,
          food_stores: 28,
          meat_stores: 5
        },
        category_totals: {
          "obligations.current_due.coin": 2,
          "obligations.current_due.food_stores": 5,
          "obligations.arrears.coin": 4,
          "obligations.arrears.food_stores": 12
        },
        net_values: {
          "net.coin": 2,
          "net.food_stores": 11,
          "net.meat_stores": 5
        }
      },
      "portfolio:player_portfolio:manor:manor_hx_31000": {
        manor_id: "manor_hx_31000",
        manor_key: "portfolio:player_portfolio:manor:manor_hx_31000",
        asset_totals: {
          coin: 9,
          food_stores: 58,
          meat_stores: 3
        },
        category_totals: {
          "obligations.current_due.coin": 0,
          "obligations.current_due.food_stores": 0,
          "obligations.arrears.coin": 0,
          "obligations.arrears.food_stores": 0
        },
        net_values: {
          "net.coin": 9,
          "net.food_stores": 58,
          "net.meat_stores": 3
        }
      }
    },
    outliers_by_metric: {
      "outlier.lowest.net.coin": [
        {
          manor_id: "manor_hx_26597",
          manor_key: "portfolio:player_portfolio:manor:manor_hx_26597",
          value: 11
        }
      ],
      "outlier.lowest.net.food_stores": [
        {
          manor_id: "manor_hx_30001",
          manor_key: "portfolio:player_portfolio:manor:manor_hx_30001",
          value: 11
        }
      ],
      "outlier.highest.arrears_coin": [
        {
          manor_id: "manor_hx_30001",
          manor_key: "portfolio:player_portfolio:manor:manor_hx_30001",
          value: 4
        }
      ],
      "outlier.highest.arrears_bushels": [
        {
          manor_id: "manor_hx_30001",
          manor_key: "portfolio:player_portfolio:manor:manor_hx_30001",
          value: 12
        }
      ],
      "outlier.highest.coin": [
        {
          manor_id: "manor_hx_26597",
          manor_key: "portfolio:player_portfolio:manor:manor_hx_26597",
          value: 14
        }
      ],
      "outlier.highest.food_stores": [
        {
          manor_id: "manor_hx_26597",
          manor_key: "portfolio:player_portfolio:manor:manor_hx_26597",
          value: 90
        }
      ]
    }
  }
} as const;

describe("playScreenPortfolio", () => {
  it("returns null when the bounded portfolio surface is absent", () => {
    expect(buildPortfolioOverviewSurface({})).toBeNull();
    expect(buildPortfolioScopeContract({})).toBeNull();
  });

  it("builds a deterministic selector and scope contract from the bounded portfolio view", () => {
    const contractA = buildPortfolioScopeContract(PREVIEW_STATE);
    const contractB = buildPortfolioScopeContract(PREVIEW_STATE);

    expect(contractA).toEqual(contractB);
    expect(contractA).toMatchObject({
      schemaVersion: "play_screen_portfolio_contract_v1",
      anchorManorId: "manor_hx_26597",
      defaultMode: "portfolio",
      manorCount: 3,
      selectedManorId: "manor_hx_26597",
      selectorLabel: "Tracked manor detail",
      scopeOptions: [
        {
          id: "portfolio",
          label: "Portfolio summary"
        },
        {
          id: "selected_manor",
          label: "Current manor detail"
        }
      ],
      surfaceScopeRules: [
        {
          id: "portfolio_summary",
          mode: "portfolio"
        },
        {
          id: "portfolio_outliers",
          mode: "portfolio"
        },
        {
          id: "diff_ledger",
          mode: "selected_manor"
        },
        {
          id: "receipts",
          mode: "selected_manor"
        }
      ]
    });

    expect(contractA?.selectorOptions).toEqual([
      {
        helper: "Use this manor as the focused detail scope beneath the portfolio summary.",
        id: "manor_hx_26597",
        isAnchorManor: true,
        isOutlier: true,
        manorId: "manor_hx_26597",
        manorKey: "portfolio:player_portfolio:manor:manor_hx_26597",
        outlierCount: 3,
        summary: "Current manor · 3 outlier flags",
        title: "Current manor"
      },
      {
        helper: "Use this manor as the focused detail scope beneath the portfolio summary.",
        id: "manor_hx_30001",
        isAnchorManor: false,
        isOutlier: true,
        manorId: "manor_hx_30001",
        manorKey: "portfolio:player_portfolio:manor:manor_hx_30001",
        outlierCount: 3,
        summary: "3 outlier flags",
        title: "Hx 30001"
      },
      {
        helper: "Use this manor as the focused detail scope beneath the portfolio summary.",
        id: "manor_hx_31000",
        isAnchorManor: false,
        isOutlier: false,
        manorId: "manor_hx_31000",
        manorKey: "portfolio:player_portfolio:manor:manor_hx_31000",
        outlierCount: 0,
        summary: "Tracked manor",
        title: "Hx 31000"
      }
    ]);

    expect(contractA?.selectedManor).toEqual({
      helper: "Current manor detail stays ready for manor-scoped ledger and receipt follow-up.",
      manorId: "manor_hx_26597",
      manorKey: "portfolio:player_portfolio:manor:manor_hx_26597",
      modeLabel: "Current manor detail",
      outlierFlags: [
        {
          id: "lowest_net_coin",
          label: "Lowest net coin",
          tone: "danger",
          value: "11 coin"
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
      ],
      summary: "Current manor is currently flagged by 3 tracked extremes.",
      summaryCards: [
        {
          id: "coin_total",
          label: "Coin on hand",
          tone: "neutral",
          value: "14 coin",
          helper: "Coin currently held at the selected manor."
        },
        {
          id: "food_total",
          label: "Food stores",
          tone: "neutral",
          value: "90 bushels",
          helper: "Stored grain currently held at the selected manor."
        },
        {
          id: "meat_total",
          label: "Meat stores",
          tone: "neutral",
          value: "4 stores",
          helper: "Preserved meat currently held at the selected manor."
        },
        {
          id: "coin_due",
          label: "Coin due",
          tone: "caution",
          value: "2 coin",
          helper: "Current liege dues still open at the selected manor."
        },
        {
          id: "food_due",
          label: "Food due",
          tone: "caution",
          value: "4 bushels",
          helper: "Current church dues still open at the selected manor."
        },
        {
          id: "coin_arrears",
          label: "Coin arrears",
          tone: "danger",
          value: "1 coin",
          helper: "Coin arrears currently carried by the selected manor."
        },
        {
          id: "food_arrears",
          label: "Food arrears",
          tone: "danger",
          value: "0 bushels",
          helper: "Food arrears currently carried by the selected manor."
        }
      ],
      title: "Current manor"
    });
  });

  it("keeps the overview surface projection stable while the scope contract grows", () => {
    const surface = buildPortfolioOverviewSurface(PREVIEW_STATE);

    expect(surface).toMatchObject({
      manorCount: 3,
      manorCountLabel: "3 tracked manors"
    });
    expect(surface?.summaryCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "coin_total",
          label: "Portfolio coin",
          value: "31 coin"
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
            value: "11 coin"
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
            value: "11 bushels"
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
