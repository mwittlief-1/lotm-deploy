import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import { buildCourtProvisioningView } from "../../src/sim/domains/people/courtProvisioningRegistry";
import { buildHouseholdPresenceView } from "../../src/sim/domains/people/householdPresenceView";
import { buildPersonCardRegistry } from "../../src/sim/domains/people/personCardRegistry";

describe("household_presence_view_v1", () => {
  it("explains household residents and outside local powers from one bounded view", () => {
    const state = createNewRun("household_presence_view_v1");
    state.turn_index = 4;
    state.log.push({
      processed_turn_index: 3,
      summary: "succession",
      report: {
        house_log: [
          {
            kind: "succession",
            turn_index: 3,
            new_ruler_name: state.house.head.name
          }
        ]
      }
    } as any);

    const personCards = buildPersonCardRegistry(state);
    const provisioningView = buildCourtProvisioningView(state, personCards);
    const householdPresenceView = buildHouseholdPresenceView(state, personCards, provisioningView);
    const outsiderId = state.locals.nobles[0]?.id;

    if (!outsiderId) {
      throw new Error("Expected at least one local noble outsider in the seed state.");
    }

    expect(householdPresenceView).toMatchObject({
      schema_version: "household_presence_view_v1",
      generated_at_turn_index: 4,
      recent_succession: {
        turn_index: 3,
        new_ruler_name: state.house.head.name
      }
    });
    expect(householdPresenceView.entries_by_person_id[state.house.head.id]).toMatchObject({
      schema_version: "household_presence_entry_v1",
      presence_kind: "resident",
      roster_role: "head",
      provisioning_class: "head_of_house",
      presence_summary: "Rules the household and anchors the court this turn.",
      succession_note: "Current ruler since Turn 3."
    });
    expect(householdPresenceView.entries_by_person_id[outsiderId]).toMatchObject({
      schema_version: "household_presence_entry_v1",
      presence_kind: "outsider",
      roster_role: "local_power",
      local_role: "noble",
      presence_summary: "Lives outside your household but still matters as part of the nearby noble web."
    });
  });
});
