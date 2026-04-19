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
});
