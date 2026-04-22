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

  it("renders the fuller dynastic transition list inside household details", () => {
    const state = createNewRun("household_details_dynastic_summary");
    const ctx = proposeTurn(state);
    const { entries, court_size } = readCourtRosterFromSnapshot(ctx);
    (ctx.preview_state as any).flags._dynastic_transition_facts_v1 = {
      schema_version: "dynastic_transition_facts_v1",
      turn_index: ctx.preview_state.turn_index,
      facts: [
        {
          kind: "birth",
          person_id: "p_newborn",
          person_name: "Anne",
          house_id: "h_player",
          house_label: "House Player",
          year: 9,
          source: "household_demography",
          summary: "Anne was born into House Player."
        },
        {
          kind: "death",
          person_id: "p_elder",
          person_name: "Sir Odo",
          house_id: "h_ashford",
          house_label: "House Ashford",
          year: 9,
          source: "world_noble_demography",
          summary: "Sir Odo died at age 63 of House Ashford."
        }
      ],
      omitted_count: 0
    };

    const html = renderToStaticMarkup(
      <HouseholdDetailsPanel
        copy={HOUSEHOLD_DETAILS_COPY}
        currentHouseLog={[
          {
            kind: "marriage_resolved",
            turn_index: ctx.preview_state.turn_index,
            child_name: "Alice",
            spouse_name: "Cedric"
          }
        ]}
        courtRosterEntries={entries}
        courtSize={court_size}
        previewState={ctx.preview_state}
        state={state}
      />
    );

    expect(html).toContain("Dynastic transitions");
    expect(html).toContain("Dynastic changes this turn: 1 birth, 1 death, 1 marriage.");
    expect(html).toContain("Anne was born into House Player.");
    expect(html).toContain("Sir Odo died at age 63 of House Ashford.");
    expect(html).toContain("Alice married Cedric.");
  });
});
