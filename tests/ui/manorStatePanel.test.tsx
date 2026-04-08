import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ManorStatePanel } from "../../src/ui/panels/ManorStatePanel";

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
});
