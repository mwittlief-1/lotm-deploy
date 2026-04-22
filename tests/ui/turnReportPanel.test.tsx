import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim/state";
import { proposeTurn } from "../../src/sim/turn";
import { buildObligationsCounterpartyContract } from "../../src/ui/playScreenObligations";
import { TurnReportPanel } from "../../src/ui/panels/TurnReportPanel";
import { buildEconomyPricingSurface } from "../../src/ui/playViewModel";

const COPY = {
  childrenLabel: "Children",
  courtSizeLabel: "Court size",
  household: "Household",
  heirLabel: "Heir",
  hideHouseholdDetails: "Hide household details",
  lastSuccessionLabel: "Last succession",
  lastSuccessionNone: "No succession recorded.",
  logOutcome_succession: (name: string) => `Succession settled on ${name}.`,
  none: "None",
  obligationsHelper: "Keep detail on the sheet; keep only the headline story here.",
  showHouseholdDetails: "Show household details",
  spouseLabel: "Spouse",
  tooltipCourtSize: "Court size helper.",
  turnReportTimingHelper: "Resolved above.",
  turnSummary_last3Years: "Last 3 years"
};

describe("TurnReportPanel", () => {
  it("renders headline-only summary cards from the new explanation contract", () => {
    const state = createNewRun("lotm_v026_seed_001_baseline");
    const ctx = proposeTurn(state);
    const obligationsContract = buildObligationsCounterpartyContract({
      courtDecisionBudget: null,
      previewState: ctx.preview_state
    });
    const html = renderToStaticMarkup(
      <TurnReportPanel
        accruedThisTurn={{ coin: 1, bushels: 0 }}
        anchorFood="food"
        anchorHousehold="household"
        arrearsCarried={{ coin: 0, bushels: 0 }}
        baselineConsPerTurn={3}
        builderExtraPerTurn={1}
        consBuilders={0}
        consFarmers={0}
        consIdle={0}
        copy={COPY}
        courtConsumptionBushels={0}
        courtRosterEntries={[]}
        courtSize={0}
        currentHouseLog={[]}
        dueEntering={{ coin: 1, bushels: 1 }}
        fmtObAmount={(value: { bushels?: number; coin?: number }) => `${value.coin ?? 0} coin / ${value.bushels ?? 0} bushels`}
        hasConsumptionSplit={false}
        idle={0}
        manor={ctx.preview_state.manor}
        obligationsSections={obligationsContract?.counterpartySections ?? []}
        onOpenObligationsDetails={() => undefined}
        peasantConsumptionBushels={0}
        pricingSurface={buildEconomyPricingSurface(ctx.preview_state)}
        previewState={ctx.preview_state}
        report={ctx.report}
        showHouseholdDetails={false}
        state={state}
        toggleHouseholdDetails={() => undefined}
        totalConsumptionBushels={ctx.report.total_consumption_bushels}
        totalObligations={{ coin: 1, bushels: 1 }}
        turnYears={3}
      />
    );

    expect(html).toContain("Headline causes");
    expect(html).toContain("Role");
    expect(html).toContain("Summary");
    expect(html).toContain("Diff Ledger keeps only the biggest resolved moves");
    expect(html).toContain("Open detail sheet");
    expect(html).not.toContain("food_starting_stores");
  });

  it("keeps the unrest summary card aligned with the shared headline cause wording", () => {
    const state = createNewRun("lotm_v026_seed_001_baseline");
    const ctx = proposeTurn(state);
    const obligationsContract = buildObligationsCounterpartyContract({
      courtDecisionBudget: null,
      previewState: ctx.preview_state
    });
    ctx.report.turn_explanation_v1.headline_causes = ctx.report.turn_explanation_v1.headline_causes.map((cause) =>
      cause.metric === "unrest"
        ? {
            ...cause,
            detail: "Arrears pressure (+4) pushed unrest up while Relief: Harvest Festival (-1) eased it."
          }
        : cause
    );

    const html = renderToStaticMarkup(
      <TurnReportPanel
        accruedThisTurn={{ coin: 1, bushels: 0 }}
        anchorFood="food"
        anchorHousehold="household"
        arrearsCarried={{ coin: 0, bushels: 0 }}
        baselineConsPerTurn={3}
        builderExtraPerTurn={1}
        consBuilders={0}
        consFarmers={0}
        consIdle={0}
        copy={COPY}
        courtConsumptionBushels={0}
        courtRosterEntries={[]}
        courtSize={0}
        currentHouseLog={[]}
        dueEntering={{ coin: 1, bushels: 1 }}
        fmtObAmount={(value: { bushels?: number; coin?: number }) => `${value.coin ?? 0} coin / ${value.bushels ?? 0} bushels`}
        hasConsumptionSplit={false}
        idle={0}
        manor={ctx.preview_state.manor}
        obligationsSections={obligationsContract?.counterpartySections ?? []}
        onOpenObligationsDetails={() => undefined}
        peasantConsumptionBushels={0}
        pricingSurface={buildEconomyPricingSurface(ctx.preview_state)}
        previewState={ctx.preview_state}
        report={ctx.report}
        showHouseholdDetails={false}
        state={state}
        toggleHouseholdDetails={() => undefined}
        totalConsumptionBushels={ctx.report.total_consumption_bushels}
        totalObligations={{ coin: 1, bushels: 1 }}
        turnYears={3}
      />
    );

    expect(html).toContain("Arrears pressure (+4) pushed unrest up while Relief: Harvest Festival (-1) eased it.");
  });

  it("surfaces source-backed dynastic transition summaries on the player path", () => {
    const state = createNewRun("lotm_v026_seed_001_baseline");
    const ctx = proposeTurn(state);
    const obligationsContract = buildObligationsCounterpartyContract({
      courtDecisionBudget: null,
      previewState: ctx.preview_state
    });
    (ctx.preview_state as any).flags._dynastic_transition_facts_v1 = {
      schema_version: "dynastic_transition_facts_v1",
      turn_index: ctx.preview_state.turn_index,
      facts: [
        {
          kind: "birth",
          person_id: "p_child_new",
          person_name: "Anne",
          house_id: "h_player",
          house_label: "House Rowan",
          year: 9,
          source: "household_demography",
          summary: "Anne was born into House Rowan."
        },
        {
          kind: "death",
          person_id: "p_old_guard",
          person_name: "Sir Odo",
          house_id: "h_ashford",
          house_label: "House Ashford",
          year: 9,
          source: "world_noble_demography",
          summary: "Sir Odo died at age 63 of House Ashford."
        }
      ],
      omitted_count: 1
    };
    ctx.report.household.population_delta = 1;

    const html = renderToStaticMarkup(
      <TurnReportPanel
        accruedThisTurn={{ coin: 1, bushels: 0 }}
        anchorFood="food"
        anchorHousehold="household"
        arrearsCarried={{ coin: 0, bushels: 0 }}
        baselineConsPerTurn={3}
        builderExtraPerTurn={1}
        consBuilders={0}
        consFarmers={0}
        consIdle={0}
        copy={COPY}
        courtConsumptionBushels={0}
        courtRosterEntries={[]}
        courtSize={0}
        currentHouseLog={[
          {
            kind: "marriage_resolved",
            turn_index: ctx.preview_state.turn_index,
            child_name: "Alice",
            spouse_name: "Cedric"
          }
        ]}
        dueEntering={{ coin: 1, bushels: 1 }}
        fmtObAmount={(value: { bushels?: number; coin?: number }) => `${value.coin ?? 0} coin / ${value.bushels ?? 0} bushels`}
        hasConsumptionSplit={false}
        idle={0}
        manor={ctx.preview_state.manor}
        obligationsSections={obligationsContract?.counterpartySections ?? []}
        onOpenObligationsDetails={() => undefined}
        peasantConsumptionBushels={0}
        pricingSurface={buildEconomyPricingSurface(ctx.preview_state)}
        previewState={ctx.preview_state}
        report={ctx.report}
        showHouseholdDetails={false}
        state={state}
        toggleHouseholdDetails={() => undefined}
        totalConsumptionBushels={ctx.report.total_consumption_bushels}
        totalObligations={{ coin: 1, bushels: 1 }}
        turnYears={3}
      />
    );

    expect(html).toContain("Dynastic transitions");
    expect(html).toContain("Household size grew by 1 this turn.");
    expect(html).toContain("Anne was born into House Rowan.");
    expect(html).toContain("Sir Odo died at age 63 of House Ashford.");
    expect(html).toContain("Alice married Cedric.");
    expect(html).toContain("1 additional dynastic change remained off the main list.");
  });
});
