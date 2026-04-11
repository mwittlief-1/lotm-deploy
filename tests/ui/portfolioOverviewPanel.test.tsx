import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PortfolioOverviewPanel } from "../../src/ui/panels/PortfolioOverviewPanel";
import { buildPortfolioMapCheckpoint, buildPortfolioScopeContract, selectPortfolioManor } from "../../src/ui/playScreenPortfolio";

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
      "portfolio:player_portfolio:manor:manor_hx_30001"
    ],
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
        }
      },
      "portfolio:player_portfolio:manor:manor_hx_30001": {
        manor_id: "manor_hx_30001",
        manor_key: "portfolio:player_portfolio:manor:manor_hx_30001",
        asset_totals: {
          coin: 8,
          food_stores: 55,
          meat_stores: 5
        },
        category_totals: {
          "obligations.current_due.coin": 1,
          "obligations.current_due.food_stores": 3,
          "obligations.arrears.coin": 3,
          "obligations.arrears.food_stores": 12
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
          value: 40
        }
      ],
      "outlier.highest.arrears_coin": [
        {
          manor_id: "manor_hx_30001",
          manor_key: "portfolio:player_portfolio:manor:manor_hx_30001",
          value: 3
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

const MAINTENANCE_PRESSURE = {
  currentManorId: "manor_hx_26597",
  currentManorRow: {
    buildingCount: 0,
    coinCost: 4,
    entryCount: 2,
    laborRequired: 7,
    manorId: "manor_hx_26597",
    manorKey: "portfolio:player_portfolio:manor:manor_hx_26597",
    manorLabel: "Current manor",
    rightCount: 2,
    rows: [
      {
        coinCost: 1,
        entryId: "right_bridge",
        kindLabel: "Right",
        laborRequired: 3,
        label: "Bridge & crossing revenue",
        manorId: "manor_hx_26597",
        manorKey: "portfolio:player_portfolio:manor:manor_hx_26597",
        stateLabel: "Active"
      }
    ]
  },
  explainPrimary: "Maintenance: 7 labor, 4 coin across 2 upkeep rows.",
  explainWhy: "Rights upkeep remains visible here so labor and coin pressure does not disappear into lower output totals.",
  helperText: "Maintenance pressure should remain visible in holdings.",
  manorRows: [
    {
      buildingCount: 0,
      coinCost: 4,
      entryCount: 2,
      laborRequired: 7,
      manorId: "manor_hx_26597",
      manorKey: "portfolio:player_portfolio:manor:manor_hx_26597",
      manorLabel: "Current manor",
      rightCount: 2,
      rows: [
        {
          coinCost: 1,
          entryId: "right_bridge",
          kindLabel: "Right",
          laborRequired: 3,
          label: "Bridge & crossing revenue",
          manorId: "manor_hx_26597",
          manorKey: "portfolio:player_portfolio:manor:manor_hx_26597",
          stateLabel: "Active"
        }
      ]
    },
    {
      buildingCount: 1,
      coinCost: 2,
      entryCount: 1,
      laborRequired: 5,
      manorId: "manor_hx_30001",
      manorKey: "portfolio:player_portfolio:manor:manor_hx_30001",
      manorLabel: "Hx 30001",
      rightCount: 0,
      rows: [
        {
          coinCost: 2,
          entryId: "building_granary",
          kindLabel: "Building",
          laborRequired: 5,
          label: "Granary maintenance",
          manorId: "manor_hx_30001",
          manorKey: "portfolio:player_portfolio:manor:manor_hx_30001",
          stateLabel: "Operational"
        }
      ]
    }
  ],
  noteLines: ["Maintenance reserved 7 labor before output was applied."]
} as const;

describe("PortfolioOverviewPanel", () => {
  it("renders the portfolio summary and scope toggle without expanding into a second ledger", () => {
    const contract = buildPortfolioScopeContract(PREVIEW_STATE);

    if (!contract) {
      throw new Error("Expected a portfolio scope contract.");
    }

    const html = renderToStaticMarkup(
      <PortfolioOverviewPanel
        contract={contract}
        maintenancePressure={MAINTENANCE_PRESSURE}
        onScopeModeChange={() => undefined}
        onSelectManor={() => undefined}
        selectedManor={contract.selectedManor}
        selectedManorId={contract.selectedManorId}
        scopeMode="portfolio"
      />
    );

    expect(html).toContain("Portfolio Totals &amp; Outliers");
    expect(html).toContain("2 tracked manors");
    expect(html).toContain("Portfolio summary");
    expect(html).toContain("Current manor detail");
    expect(html).toContain("Portfolio active");
    expect(html).toContain("Outlier exceptions");
    expect(html).toContain("Current manor");
    expect(html).toContain("Maintenance pressure");
    expect(html).toContain("Maintenance pressure should remain visible in holdings.");
    expect(html).toContain("Most food arrears: 12 bushels");
  });

  it("renders selected-manor detail when the scope toggle is active", () => {
    const contract = buildPortfolioScopeContract(PREVIEW_STATE);

    if (!contract) {
      throw new Error("Expected a portfolio scope contract.");
    }

    const html = renderToStaticMarkup(
      <PortfolioOverviewPanel
        contract={contract}
        mapCheckpoint={buildPortfolioMapCheckpoint({
          contract,
          mapCheckpointAvailable: false,
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
        })}
        maintenancePressure={MAINTENANCE_PRESSURE}
        onScopeModeChange={() => undefined}
        onSelectManor={() => undefined}
        selectedManor={selectPortfolioManor(contract, "manor_hx_30001")}
        selectedManorId="manor_hx_30001"
        scopeMode="selected_manor"
      />
    );

    expect(html).toContain("Selected manor active");
    expect(html).toContain("Tracked manor detail");
    expect(html).toContain("Hx 30001");
    expect(html).toContain("3 outlier flags");
    expect(html).toContain("Coin on hand");
    expect(html).toContain("Open dues &amp; arrears");
    expect(html).toContain("Hx 30001 is currently flagged by 3 tracked extremes.");
    expect(html).toContain("Selected detail");
    expect(html).toContain("Map checkpoint");
    expect(html).toContain("Center on selected holding");
    expect(html).toContain("Dormant");
    expect(html).toContain("Selected manor upkeep rows");
    expect(html).toContain("Granary maintenance");
  });
});
