import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ManorStatePanel } from "../../src/ui/panels/ManorStatePanel";

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
      },
      {
        coinCost: 3,
        entryId: "right_market",
        kindLabel: "Right",
        laborRequired: 4,
        label: "Market right",
        manorId: "manor_hx_26597",
        manorKey: "portfolio:player_portfolio:manor:manor_hx_26597",
        stateLabel: "Active"
      }
    ]
  },
  explainPrimary: "Maintenance: 7 labor, 4 coin across 2 upkeep rows.",
  explainWhy: "Rights upkeep remains visible here so labor and coin pressure does not disappear into lower output totals.",
  helperText: "Maintenance rows come from the accepted upkeep read model.",
  manorRows: [],
  noteLines: ["Maintenance reserved 7 labor before output was applied."]
} as const;

describe("ManorStatePanel", () => {
  it("renders the unrest-tip text from the shared dispossession content slot", () => {
    const html = renderToStaticMarkup(
      <ManorStatePanel
        anchorUnrest="unrest"
        buildRatePerBuilderPerTurn={2}
        builderExtraPerTurn={3}
        constructionEtaTurns={null}
        constructionRatePlannedNextTurn={0}
        constructionRateThisTurn={0}
        copy={{
          turnSummary_last3Years: "Resolved above",
          unrestBreakdownDecreasedBy: "Decreased by",
          unrestBreakdownIncreasedBy: "Increased by",
          unrestBreakdownNone: "No unrest movement.",
          unrestBreakdownTitle: "Unrest breakdown"
        }}
        deltaBushels={0}
        deltaCoin={0}
        deltaPop={0}
        deltaUnrest={0}
        desiredBuilders={0}
        fmtSigned={(value: number) => (value > 0 ? `+${value}` : `${value}`)}
        improvements={{}}
        manor={{
          builders: 1,
          bushels_stored: 12,
          coin: 5,
          construction: null,
          farmers: 3,
          population: 4,
          unrest: 12
        }}
        onAbandonProject={() => undefined}
        popChangeSummary={null}
        report={{ construction: {} }}
        showUnrestBreakdown={false}
        turnYears={3}
        unrestBreakdown={null}
      />
    );

    expect(html).toContain("If Unrest is ≥ 100 at end of a turn, you are Dispossessed (game over).");
  });

  it("renders current-manor maintenance rows from the accepted upkeep surface", () => {
    const html = renderToStaticMarkup(
      <ManorStatePanel
        anchorUnrest="unrest"
        buildRatePerBuilderPerTurn={2}
        builderExtraPerTurn={3}
        constructionEtaTurns={null}
        constructionRatePlannedNextTurn={0}
        constructionRateThisTurn={0}
        copy={{
          turnSummary_last3Years: "Resolved above",
          unrestBreakdownDecreasedBy: "Decreased by",
          unrestBreakdownIncreasedBy: "Increased by",
          unrestBreakdownNone: "No unrest movement.",
          unrestBreakdownTitle: "Unrest breakdown"
        }}
        deltaBushels={0}
        deltaCoin={0}
        deltaPop={0}
        deltaUnrest={0}
        desiredBuilders={0}
        fmtSigned={(value: number) => (value > 0 ? `+${value}` : `${value}`)}
        improvements={{}}
        maintenancePressure={MAINTENANCE_PRESSURE}
        manor={{
          builders: 1,
          bushels_stored: 12,
          coin: 5,
          construction: null,
          farmers: 3,
          population: 4,
          unrest: 12
        }}
        onAbandonProject={() => undefined}
        popChangeSummary={null}
        report={{ construction: {} }}
        showUnrestBreakdown={false}
        turnYears={3}
        unrestBreakdown={null}
      />
    );

    expect(html).toContain("Maintenance pressure");
    expect(html).toContain("Maintenance rows come from the accepted upkeep read model.");
    expect(html).toContain("Maintenance reserved 7 labor before output was applied.");
    expect(html).toContain("Bridge &amp; crossing revenue");
    expect(html).toContain("Market right");
  });
});
