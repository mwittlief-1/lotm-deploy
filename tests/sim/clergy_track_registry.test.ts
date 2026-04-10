import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import {
  buildClergyEligibilityRegistry,
  buildClergyTrackRegistry,
  ensureClergyTrackRegistry,
  makeClergyEligibilityKey,
  makeClergyTrackEntryId,
  placePersonOnClergyTrack,
} from "../../src/sim/domains/people/clergyTrackRegistry";
import type { Person, RunState, Traits } from "../../src/sim/types";

function mkTraits(): Traits {
  return {
    stewardship: 3,
    martial: 3,
    diplomacy: 3,
    discipline: 3,
    fertility: 3,
  };
}

function mkChild(id: string, name: string, sex: "M" | "F", age: number): Person {
  return {
    id,
    name,
    sex,
    age,
    birth_year: -age,
    alive: true,
    married: false,
    traits: mkTraits(),
    house_id: "h_player",
    residence_house_id: "h_player",
  };
}

function addPlayerChild(state: RunState, child: Person): void {
  const stateAny: any = state as any;
  stateAny.people[child.id] = child;
  state.house.children.push(child);
  const house = stateAny.houses[stateAny.player_house_id];
  house.child_ids = [...new Set([...(house.child_ids ?? []), child.id])].sort();
  house.member_person_ids = [...new Set([...(house.member_person_ids ?? []), child.id])].sort();
  const kinship = Array.isArray(stateAny.kinship_edges) ? stateAny.kinship_edges : [];
  kinship.push({ kind: "parent_of", parent_id: state.house.head.id, child_id: child.id });
  if (state.house.spouse?.id) kinship.push({ kind: "parent_of", parent_id: state.house.spouse.id, child_id: child.id });
  stateAny.kinship_edges = kinship;
}

function createClergyCandidateState(): RunState {
  const state = createNewRun("clergy_track_registry_v033");
  state.house.children[0]!.age = 16;
  state.house.children[1]!.age = 9;
  (state as any).people[state.house.children[0]!.id].age = 16;
  (state as any).people[state.house.children[1]!.id].age = 9;
  const youngerSon = mkChild("p_child3", "Thomas", "M", 14);
  const youngerDaughter = mkChild("p_child4", "Alice", "F", 13);
  addPlayerChild(state, youngerSon);
  addPlayerChild(state, youngerDaughter);
  state.house.heir_id = "p_child1";
  (state as any).houses[(state as any).player_house_id].heir_id = "p_child1";
  return state;
}

describe("clergy track registry", () => {
  it("builds a deterministic registry from unordered placement drafts", () => {
    const registry = buildClergyTrackRegistry([
      {
        track_kind: "convent",
        placement_source: "send_to_convent",
        person_id: "p_child4",
        person_name: "Alice",
        sex: "F",
        age_at_placement: 13,
        house_id: "h_player",
        residence_house_id: "h_player",
        institution_id: null,
        institution_type: "abbey",
        start_turn_index: 4,
        end_turn_index: null,
        active: true,
      },
      {
        track_kind: "holy_orders",
        placement_source: "send_to_orders",
        person_id: "p_child3",
        person_name: "Thomas",
        sex: "M",
        age_at_placement: 14,
        house_id: "h_player",
        residence_house_id: "h_player",
        institution_id: null,
        institution_type: "parish",
        start_turn_index: 3,
        end_turn_index: null,
        active: true,
      },
    ]);

    expect(registry.entry_ids).toEqual([
      "clergy_track:convent:p_child4",
      "clergy_track:holy_orders:p_child3",
    ]);
    expect(registry.active_entry_ids).toEqual([
      "clergy_track:convent:p_child4",
      "clergy_track:holy_orders:p_child3",
    ]);
    expect(registry.person_entry_ids).toEqual({
      p_child3: ["clergy_track:holy_orders:p_child3"],
      p_child4: ["clergy_track:convent:p_child4"],
    });
  });

  it("builds deterministic eligibility with sex, age, and heir blockers", () => {
    const state = createClergyCandidateState();
    const eligibility = buildClergyEligibilityRegistry(state);
    const repeatEligibility = buildClergyEligibilityRegistry(state);

    expect(eligibility).toEqual(repeatEligibility);
    expect(eligibility.entry_keys).toContain("clergy_eligibility:convent:p_child4");
    expect(eligibility.entry_keys).toContain("clergy_eligibility:holy_orders:p_child3");
    expect(eligibility.entry_keys).not.toContain("clergy_eligibility:holy_orders:p_liege");
    expect(eligibility.entry_keys).not.toContain("clergy_eligibility:holy_orders:p_clergy");

    expect(eligibility.entries_by_key[makeClergyEligibilityKey("convent", "p_child4")]).toMatchObject({
      person_name: "Alice",
      eligible: true,
      blocker_codes: [],
    });
    expect(eligibility.entries_by_key[makeClergyEligibilityKey("holy_orders", "p_child3")]).toMatchObject({
      person_name: "Thomas",
      eligible: true,
      blocker_codes: [],
    });
    expect(eligibility.entries_by_key[makeClergyEligibilityKey("convent", "p_child1")]).toMatchObject({
      eligible: false,
    });
    expect(
      eligibility.entries_by_key[makeClergyEligibilityKey("convent", "p_child1")]?.blocker_codes
    ).toContain("current_heir");
    expect(eligibility.entries_by_key[makeClergyEligibilityKey("convent", "p_child2")]).toMatchObject({
      eligible: false,
      blocker_codes: ["underage"],
    });
    expect(eligibility.entries_by_key[makeClergyEligibilityKey("holy_orders", "p_head")]).toMatchObject({
      eligible: false,
      blocker_codes: ["house_head", "married"],
    });
  });

  it("places an eligible person onto a clergy track and mirrors the registry on state", () => {
    const state = createClergyCandidateState();

    const registry = placePersonOnClergyTrack(state, {
      person_id: "p_child4",
      track_kind: "convent",
      turn_index: 5,
    });

    expect(registry.entries_by_id[makeClergyTrackEntryId("convent", "p_child4")]).toMatchObject({
      track_kind: "convent",
      placement_source: "send_to_convent",
      person_name: "Alice",
      institution_type: "abbey",
      start_turn_index: 5,
      active: true,
    });
    expect((state as any).clergy_track_registry).toBe(registry);
    expect((state.house as any).clergy_track_registry).toBe(registry);

    const nextEligibility = buildClergyEligibilityRegistry(state);
    expect(nextEligibility.entries_by_key[makeClergyEligibilityKey("convent", "p_child4")]).toMatchObject({
      eligible: false,
      blocker_codes: ["already_placed"],
    });
  });

  it("normalizes an empty clergy registry onto state when no placements exist yet", () => {
    const state = createClergyCandidateState();
    const registry = ensureClergyTrackRegistry(state);

    expect(registry).toEqual({
      schema_version: "clergy_track_registry_v0",
      entry_ids: [],
      active_entry_ids: [],
      person_ids: [],
      entries_by_id: {},
      person_entry_ids: {},
    });
  });
});
