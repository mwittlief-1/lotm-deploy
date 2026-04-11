import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { HouseholdDetailsPanel } from "../../src/ui/panels/HouseholdDetailsPanel";
import { readCourtRosterFromSnapshot } from "../../src/ui/playViewModel";
import { getPlayerHousehold } from "../../src/ui/stateSelectors";

const HOUSEHOLD_DETAILS_COPY = {
  childrenLabel: "Children",
  courtSizeLabel: "Court Size",
  heirLabel: "Heir",
  houseLog: "House log",
  lastSuccessionLabel: "Last succession",
  lastSuccessionNone: "No succession recorded.",
  logOutcome_succession: (name: string) => `Succession: ${name}`,
  noHouseLogYet: "No house log yet.",
  noNewHouseLogThisTurn: "No new house log this turn.",
  none: "None",
  spouseLabel: "Spouse",
  tooltipCourtSize: "Court size help."
};

describe("HouseholdDetailsPanel", () => {
  it("renders roster names as person-card triggers inside the household details modal", () => {
    const state = createNewRun("household_details_routes");
    const ctx = proposeTurn(state);
    const { entries, court_size } = readCourtRosterFromSnapshot(ctx);
    const household = getPlayerHousehold(ctx.preview_state);
    const rosterPersonId = entries[0]?.person.id;

    if (!rosterPersonId) {
      throw new Error("Expected a court roster entry in the preview snapshot.");
    }

    const html = renderToStaticMarkup(
      <HouseholdDetailsPanel
        copy={HOUSEHOLD_DETAILS_COPY}
        currentHouseLog={[]}
        courtRosterEntries={entries}
        courtSize={court_size}
        onOpenPersonCard={() => undefined}
        personCardIds={new Set([household.head.id, ...entries.map((entry) => entry.person.id)])}
        previewState={ctx.preview_state}
        state={state}
      />
    );

    expect(html).toContain(`data-person-card-open="${household.head.id}"`);
    expect(html).toContain(`data-person-card-open="${rosterPersonId}"`);
    expect(html).toContain("Court Size");
  });
});
