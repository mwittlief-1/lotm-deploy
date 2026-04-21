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
    expect(html).toContain("placeholder references, not live actions from this screen");
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

  it("renders maintenance labor drivers and coin upkeep walkdown detail", () => {
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
        deltaCoin={-2}
        deltaPop={0}
        deltaUnrest={0}
        desiredBuilders={0}
        fmtSigned={(value: number) => (value > 0 ? `+${value}` : `${value}`)}
        improvements={{}}
        manor={{
          builders: 2,
          bushels_stored: 40,
          coin: 8,
          construction: null,
          farmers: 8,
          population: 12,
          unrest: 10
        }}
        onAbandonProject={() => undefined}
        popChangeSummary={null}
        report={{
          construction: {},
          maintenance_labor_pressure: {
            schema_version: "maintenance_labor_pressure_v1",
            ordering_rule: "builders_first",
            delegated: false,
            delegated_multiplier_pct: 100,
            source_keys: ["watch_ward", "granary_upkeep"],
            total_sources: 2,
            planned_population: 12,
            planned_farmers: 8,
            planned_builders: 2,
            allocatable_before: 10,
            required_labor_before_delegation: 3,
            required_labor_after_delegation: 3,
            applied_drag: 3,
            unmet_labor: 0,
            allocatable_after: 7,
            effective_farmers: 7,
            effective_builders: 0,
            entries: [
              { maintenance_key: "watch_ward", label: "Watch & Ward", source_kind: "security", labor_required: 1 },
              { maintenance_key: "granary_upkeep", label: "Granary upkeep", source_kind: "storage", labor_required: 2 }
            ]
          }
        }}
        showUnrestBreakdown={false}
        turnExplanation={{
          schema_version: "turn_explanation_v1",
          food_walkdown: {
            schema_version: "turn_explanation_walkdown_v1",
            metric: "food",
            unit_label: "bushels",
            start_amount: 40,
            end_amount: 40,
            reconciles: true,
            rows: []
          },
          coin_walkdown: {
            schema_version: "turn_explanation_walkdown_v1",
            metric: "coin",
            unit_label: "coin",
            start_amount: 10,
            end_amount: 8,
            reconciles: true,
            rows: [
              { id: "coin_starting_coin", label: "Starting coin", direction: "start", amount: 10, running_total: 10, summary: "10 coin on hand at the start of the turn." },
              { id: "coin_maintenance", label: "Maintenance and upkeep", direction: "outflow", amount: 2, running_total: 8, summary: "2 coin went to upkeep and recurring maintenance." },
              { id: "coin_ending_coin", label: "Ending coin", direction: "ending", amount: 8, running_total: 8, summary: "8 coin remain at turn end." }
            ]
          },
          unrest_walkdown: {
            schema_version: "turn_explanation_walkdown_v1",
            metric: "unrest",
            unit_label: "unrest",
            start_amount: 10,
            end_amount: 10,
            reconciles: true,
            rows: []
          },
          headline_causes: [],
          surface_roles: []
        }}
        turnYears={3}
        unrestBreakdown={null}
      />
    );

    expect(html).toContain("3 labor absorbed");
    expect(html).toContain("3 upkeep labor came off the top");
    expect(html).toContain("Coin walkdown: 2 coin");
    expect(html).toContain("Watch &amp; Ward");
    expect(html).toContain("1 labor requested");
    expect(html).toContain("Granary upkeep");
    expect(html).toContain("2 labor requested");
  });
});
