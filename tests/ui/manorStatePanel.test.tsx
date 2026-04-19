import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim/state";
import { proposeTurn } from "../../src/sim/turn";
import { ManorStatePanel } from "../../src/ui/panels/ManorStatePanel";
import { buildEconomyPricingSurface } from "../../src/ui/playViewModel";

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

  it("shows current-state direct causes from the explanation contract", () => {
    const state = createNewRun("lotm_v026_seed_001_baseline");
    const ctx = proposeTurn(state);
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
        deltaBushels={ctx.preview_state.manor.bushels_stored - state.manor.bushels_stored}
        deltaCoin={ctx.preview_state.manor.coin - state.manor.coin}
        deltaPop={ctx.preview_state.manor.population - state.manor.population}
        deltaUnrest={ctx.preview_state.manor.unrest - state.manor.unrest}
        desiredBuilders={0}
        fmtSigned={(value: number) => (value > 0 ? `+${value}` : `${value}`)}
        improvements={{}}
        manor={ctx.preview_state.manor}
        onAbandonProject={() => undefined}
        popChangeSummary={null}
        pricingSurface={buildEconomyPricingSurface(ctx.preview_state)}
        report={ctx.report}
        showUnrestBreakdown={false}
        turnExplanation={ctx.report.turn_explanation_v1 ?? null}
        turnYears={3}
        unrestBreakdown={null}
      />
    );

    expect(html).toContain("Food stores now");
    expect(html).toContain("Coin on hand");
    expect(html).toContain("Unrest pressure now");
    expect(html).toContain("Labor &amp; upkeep");
    expect(html).toContain("current manor condition and the strongest direct pressure");
    expect(html).toContain("Market reference:");
  });
});
