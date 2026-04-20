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
    expect(householdPresenceView.entries_by_person_id[state.locals.liege.id]).toMatchObject({
      presence_kind: "outsider",
      roster_role: "local_power",
      local_role: "liege",
      presence_summary: "Lives outside your household but still drives local obligation and liege continuity."
    });
  });

  it("surfaces local clergy succession and vacancy continuity on the household path", () => {
    const state = createNewRun("household_presence_local_continuity_v1") as any;
    state.turn_index = 7;
    state.locals.clergy.alive = false;
    state.manor.obligations.tithe_due_bushels = 5;
    state.manor.obligations.arrears.bushels = 3;
    state.player_house_id = state.player_house_id ?? "h_player";
    state.institutions = {
      ...(state.institutions ?? {}),
      parish_st_cuthbert: {
        id: "parish_st_cuthbert",
        type: "parish",
        name: "St. Cuthbert Parish",
        patron_actor_id: { kind: "house", id: state.player_house_id },
        priest_person_id: state.locals.clergy.id
      }
    };
    state.locals.parish_institution_id = "parish_st_cuthbert";

    const personCards = buildPersonCardRegistry(state);
    const provisioningView = buildCourtProvisioningView(state, personCards);
    const householdPresenceView = buildHouseholdPresenceView(state, personCards, provisioningView);

    expect(householdPresenceView.entries_by_person_id[state.locals.clergy.id]).toMatchObject({
      presence_kind: "outsider",
      roster_role: "local_power",
      local_role: "clergy",
      succession_note: "St. Cuthbert Parish has no living priest; dues remain with the institution until a successor is placed."
    });
  });
});
