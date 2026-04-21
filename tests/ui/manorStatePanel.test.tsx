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

  it("renders reconciled unrest pressure and relief rows from the explanation walkdown", () => {
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
        deltaUnrest={5}
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
          unrest: 15
        }}
        onAbandonProject={() => undefined}
        popChangeSummary={null}
        report={{ construction: {} }}
        showUnrestBreakdown={true}
        turnExplanation={{
          schema_version: "turn_explanation_v1",
          food_walkdown: {
            schema_version: "turn_explanation_walkdown_v1",
            metric: "food",
            unit_label: "bushels",
            start_amount: 12,
            end_amount: 12,
            reconciles: true,
            rows: []
          },
          coin_walkdown: {
            schema_version: "turn_explanation_walkdown_v1",
            metric: "coin",
            unit_label: "coin",
            start_amount: 5,
            end_amount: 5,
            reconciles: true,
            rows: []
          },
          unrest_walkdown: {
            schema_version: "turn_explanation_walkdown_v1",
            metric: "unrest",
            unit_label: "unrest",
            start_amount: 10,
            end_amount: 15,
            reconciles: true,
            rows: [
              { id: "start", label: "Starting unrest", direction: "start", amount: 10, running_total: 10, summary: "10 unrest at the start of the turn." },
              { id: "arrears", label: "Arrears pressure", direction: "inflow", amount: 4, running_total: 14, summary: "4 unrest came from arrears pressure." },
              { id: "event", label: "Event pressure: Village Riot", direction: "inflow", amount: 2, running_total: 16, summary: "2 unrest came from Village Riot." },
              { id: "relief", label: "Relief: Harvest Festival", direction: "outflow", amount: 1, running_total: 15, summary: "1 unrest eased through relief tied to Harvest Festival." },
              { id: "net", label: "Net unrest change", direction: "net", amount: 5, running_total: 15, summary: "Net unrest change +5." },
              { id: "end", label: "Ending unrest", direction: "ending", amount: 15, running_total: 15, summary: "15 unrest at the end of the turn." }
            ]
          },
          headline_causes: [
            {
              id: "headline_unrest",
              metric: "unrest",
              source: "system_pressure",
              magnitude: 5,
              summary: "Unrest +5",
              detail: "Arrears pressure (+4) pushed unrest up while Relief: Harvest Festival (-1) eased it."
            }
          ],
          surface_roles: []
        }}
        turnYears={3}
        unrestBreakdown={null}
      />
    );

    expect(html).toContain("Arrears pressure (+4) pushed unrest up while Relief: Harvest Festival (-1) eased it.");
    expect(html).toContain("Started at 10 unrest, ended at 15 (net +5).");
    expect(html).toContain("Arrears pressure: 4");
    expect(html).toContain("Event pressure: Village Riot: 2");
    expect(html).toContain("Relief: Harvest Festival: 1");
  });
});
