import { describe, expect, it } from "vitest";

import {
  buildPortfolioEvidenceScope,
  buildPortfolioMapCheckpoint,
  buildPortfolioOverviewSurface,
  buildPortfolioScopeContract,
  selectPortfolioManor
} from "../../src/ui/playScreenPortfolio";

const PREVIEW_STATE = {
  world_topology_view: {
    anchor_manor_id: "manor_hx_26597",
    anchor_holding_id: "holding_hx_26597",
    anchor_county_id: "county_hx_2"
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
      isAnchorManor: true,
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

  it("resolves selected manor detail and evidence scope from the shared contract", () => {
    const contract = buildPortfolioScopeContract(PREVIEW_STATE);

    if (!contract) {
      throw new Error("Expected a portfolio scope contract.");
    }

    expect(selectPortfolioManor(contract, "manor_hx_30001")).toMatchObject({
      isAnchorManor: false,
      manorId: "manor_hx_30001",
      title: "Hx 30001",
      summary: "Hx 30001 is currently flagged by 3 tracked extremes."
    });

    expect(
      buildPortfolioEvidenceScope({
        contract,
        scopeMode: "portfolio",
        selectedManorId: null
      })
    ).toEqual({
      chipHelperText:
        "Holdings summary is active above, but headline chips still open the current manor ledger so the resolved turn stays anchored to one live holding.",
      diffLedgerHelper:
        "Holdings summary is active above. This ledger still follows the current manor until you switch into selected-manor detail.",
      diffLedgerScopeLabel: "Current manor ledger",
      receiptScopeLabel: "Current manor ledger",
      receiptScopeSummary:
        "Explain Changes is still following the current manor ledger. Holdings totals above remain summary context only.",
      state: "current_manor"
    });

    expect(
      buildPortfolioEvidenceScope({
        contract,
        scopeMode: "selected_manor",
        selectedManorId: "manor_hx_30001"
      })
    ).toEqual({
      chipHelperText:
        "Hx 30001 detail is selected above, but the headline chips still follow the current manor ledger because only the home manor has a resolved turn ledger right now.",
      diffLedgerHelper:
        "Hx 30001 detail is selected above, but this ledger still follows the current manor because non-anchor holdings do not yet expose their own resolved turn ledger.",
      diffLedgerScopeLabel: "Current manor ledger · Hx 30001 selected",
      receiptScopeLabel: "Hx 30001 selected",
      receiptScopeSummary:
        "Hx 30001 detail is selected in Holdings, but Explain Changes still follows the current manor ledger. Use the selector for holdings comparison without assuming a second resolved ledger.",
      state: "selected_manor_holdings_only"
    });
  });

  it("builds a stable map checkpoint affordance without assuming a live map host", () => {
    const contract = buildPortfolioScopeContract(PREVIEW_STATE);

    if (!contract) {
      throw new Error("Expected a portfolio scope contract.");
    }

    expect(
      buildPortfolioMapCheckpoint({
        contract,
        mapCheckpointAvailable: false,
        scopeMode: "portfolio",
        selectedManorId: contract.selectedManorId,
        topologySurface: null
      })
    ).toBeNull();

    expect(
      buildPortfolioMapCheckpoint({
        contract,
        mapCheckpointAvailable: false,
        scopeMode: "selected_manor",
        selectedManorId: contract.selectedManorId,
        topologySurface: {
          anchorCountyId: "county_hx_2",
          anchorHoldingId: "holding_hx_26597",
          anchorManorId: "manor_hx_26597",
          companionMetric: "route_hop_distance",
          farThreshold: "50",
          rawMetric: "travel_cost_distance",
          sampleSummary: "Showing 0 sampled distances.",
          samples: []
        }
      })
    ).toEqual({
      buttonLabel: "Center on selected holding",
      helper:
        "Holdings already owns the target selection, but this gameplay shell does not yet expose a live map checkpoint. The control stays dormant until a world map surface is attached.",
      state: "dormant",
      statusLabel: "Dormant",
      target: {
        countyId: "county_hx_2",
        holdingId: "holding_hx_26597",
        manorId: "manor_hx_26597",
        manorLabel: "Current manor"
      }
    });

    expect(
      buildPortfolioMapCheckpoint({
        contract,
        mapCheckpointAvailable: true,
        scopeMode: "selected_manor",
        selectedManorId: "manor_hx_30001",
        topologySurface: {
          anchorCountyId: "county_hx_2",
          anchorHoldingId: "holding_hx_26597",
          anchorManorId: "manor_hx_26597",
          companionMetric: "route_hop_distance",
          farThreshold: "50",
          rawMetric: "travel_cost_distance",
          sampleSummary: "Showing 0 sampled distances.",
          samples: []
        }
      })
    ).toEqual({
      buttonLabel: "Center on selected holding",
      helper:
        "Hx 30001 is selected in Holdings, but this bounded snapshot still only exposes a concrete holding target for the current manor. The control stays dormant until selected-holding targets widen beyond the anchor manor.",
      state: "dormant",
      statusLabel: "Dormant",
      target: {
        countyId: null,
        holdingId: null,
        manorId: "manor_hx_30001",
        manorLabel: "Hx 30001"
      }
    });

    expect(
      buildPortfolioMapCheckpoint({
        contract,
        mapCheckpointAvailable: true,
        scopeMode: "selected_manor",
        selectedManorId: contract.selectedManorId,
        topologySurface: {
          anchorCountyId: "county_hx_2",
          anchorHoldingId: "holding_hx_26597",
          anchorManorId: "manor_hx_26597",
          companionMetric: "route_hop_distance",
          farThreshold: "50",
          rawMetric: "travel_cost_distance",
          sampleSummary: "Showing 0 sampled distances.",
          samples: []
        }
      })
    ).toEqual({
      buttonLabel: "Center on selected holding",
      helper: "Center the live world map on the selected holding without changing the holdings selector or evidence scope.",
      state: "ready",
      statusLabel: "Ready",
      target: {
        countyId: "county_hx_2",
        holdingId: "holding_hx_26597",
        manorId: "manor_hx_26597",
        manorLabel: "Current manor"
      }
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
