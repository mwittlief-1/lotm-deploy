import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { applyDecisions, createNewRun, proposeTurn } from "../../src/sim";
import { createDefaultDecisions } from "../../src/sim/turn";
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

function buildAcceptedMarriageTurn(seed: string) {
  const state = createNewRun(seed) as any;
  const child = state.house.children[0];
  if (!child) throw new Error("Expected a child eligible for marriage setup.");

  child.age = 18;
  child.married = false;
  child.sex = "M";
  if (state.people?.[child.id]) {
    state.people[child.id].age = 18;
    state.people[child.id].married = false;
    state.people[child.id].sex = "M";
  }
  if (state.locals?.nobles?.[0]) {
    state.locals.nobles[0].sex = "F";
    if (state.people?.[state.locals.nobles[0].id]) {
      state.people[state.locals.nobles[0].id].sex = "F";
    }
  }

  const preview = proposeTurn(state);
  const marriage = preview.prospects_window?.prospects.find((prospect) => prospect.type === "marriage");
  const spouseId = typeof (marriage as any)?.spouse_person_id === "string" ? String((marriage as any).spouse_person_id) : null;
  if (!marriage || !spouseId) {
    throw new Error("Expected a generated marriage prospect with a spouse person id.");
  }

  const decisions: any = createDefaultDecisions(state);
  decisions.prospects = {
    kind: "prospects",
    actions: [{ prospect_id: marriage.id, action: "accept", prospect_i: 0 }]
  };

  const next = applyDecisions(state, decisions);
  return {
    next,
    previewState: proposeTurn(next).preview_state,
    spouseId
  };
}

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

    expect(html).toContain('data-household-presence="household_presence_view_v1"');
    expect(html).toContain("Rules the household and anchors the court this turn.");
    expect(html).toContain("Lives outside your household but still matters as part of the nearby noble web.");
    expect(html).toContain("Lives outside your household but still drives local obligation and liege continuity.");
  });

  it("keeps married-in spouses on the household family path after marriage acceptance", () => {
    const { next, previewState, spouseId } = buildAcceptedMarriageTurn("household_panel_married_in");
    const household = getPlayerHousehold(previewState);
    const html = renderToStaticMarkup(
      <HouseholdPanel
        anchorId="household"
        copy={HOUSEHOLD_COPY}
        courtSize={4}
        onOpenPersonCard={() => undefined}
        onToggleDetails={() => undefined}
        personCardIds={
          new Set(
            [household.head?.id, household.heir_id, household.spouse?.id, spouseId].filter(
              (value): value is string => typeof value === "string" && value.length > 0
            )
          )
        }
        previewState={previewState}
        showDetails={false}
        state={next}
      />
    );

    expect(html).toContain(`data-person-card-open="${spouseId}"`);
    expect(html).toContain("Joined the court through marriage and now counts as household family on the player path.");
    expect(html).toContain("Court Married-in Spouse");
  });
});
