import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { HouseholdPanel } from "../../src/ui/panels/HouseholdPanel";
import { getPlayerHousehold } from "../../src/ui/stateSelectors";

const HOUSEHOLD_COPY = {
  childrenLabel: "Children",
  courtSizeLabel: "Court Size",
  heirLabel: "Heir",
  hideHouseholdDetails: "Hide household details",
  household: "Household",
  lastSuccessionLabel: "Last succession",
  lastSuccessionNone: "No succession recorded.",
  logOutcome_succession: (name: string) => `Succession: ${name}`,
  none: "None",
  showHouseholdDetails: "Show household details",
  spouseLabel: "Spouse",
  tooltipCourtSize: "Court size help."
};

describe("HouseholdPanel", () => {
  it("renders person-card triggers for household and local names that resolve through the shared registry", () => {
    const state = createNewRun("household_panel_routes");
    const ctx = proposeTurn(state);
    const household = getPlayerHousehold(ctx.preview_state);
    const localLiegeId =
      typeof (ctx.preview_state as any)?.locals?.liege?.id === "string" ? (ctx.preview_state as any).locals.liege.id : null;
    const routedIds = new Set(
      [household.head?.id, household.heir_id, household.spouse?.id, localLiegeId].filter(
        (value): value is string => typeof value === "string" && value.length > 0
      )
    );

    const html = renderToStaticMarkup(
      <HouseholdPanel
        anchorId="household"
        copy={HOUSEHOLD_COPY}
        courtSize={4}
        onOpenPersonCard={() => undefined}
        onToggleDetails={() => undefined}
        personCardIds={routedIds}
        previewState={ctx.preview_state}
        showDetails={false}
        state={state}
      />
    );

    expect(html).toContain(`data-person-card-open="${household.head.id}"`);

    if (household.heir_id) {
      expect(html).toContain(`data-person-card-open="${household.heir_id}"`);
    }

    if (household.spouse?.id) {
      expect(html).toContain(`data-person-card-open="${household.spouse.id}"`);
    }

    if (localLiegeId) {
      expect(html).toContain(`data-person-card-open="${localLiegeId}"`);
    }
  });
});
