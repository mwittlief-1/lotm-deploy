import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import { applyDecisions, createDefaultDecisions, proposeTurn } from "../../src/sim/turn";
import { assignInstitutionHolder } from "../../src/sim/domains/people/institutionHolderRegistry";
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

function createClergyPhaseState(): RunState {
  const state = createNewRun("clergy_phase_integration_v033");
  const youngerSon = mkChild("p_child3", "Thomas", "M", 14);
  addPlayerChild(state, youngerSon);
  state.house.heir_id = "p_child1";
  (state as any).houses[(state as any).player_house_id].heir_id = "p_child1";
  state.turn_index = 4;
  assignInstitutionHolder(state, {
    institution_id: "i_parish_player_local",
    person_id: "p_child3",
    track_kind: "holy_orders",
    turn_index: 4,
  });
  return state;
}

describe("clergy phase integration", () => {
  it("rehydrates clergy placement registries in preview after household aging", () => {
    const state = createClergyPhaseState();

    const ctx = proposeTurn(state);
    const previewState: any = ctx.preview_state;
    const holder = previewState.institution_holder_registry.entries_by_institution_id.i_parish_player_local;

    expect(previewState.clergy_track_registry).toMatchObject({
      schema_version: "clergy_track_registry_v0",
      entry_ids: ["clergy_track:holy_orders:p_child3"],
    });
    expect(previewState.house.clergy_track_registry).toEqual(previewState.clergy_track_registry);
    expect(previewState.house.institution_holder_registry).toEqual(previewState.institution_holder_registry);
    expect(previewState.institutions.i_parish_player_local.priest_person_id).toBe("p_child3");
    expect(previewState.people.p_child3.age).toBe(17);
    expect(holder).toMatchObject({
      holder_person_id: "p_child3",
      holder_role: "parish_priest",
      start_turn_index: 4,
      last_confirmed_turn_index: 4,
      occupied: true,
    });
  });

  it("preserves institution holder continuity across applied turn advancement", () => {
    const state = createClergyPhaseState();

    const next = applyDecisions(state, createDefaultDecisions(state));
    const nextAny: any = next as any;
    const holder = nextAny.institution_holder_registry.entries_by_institution_id.i_parish_player_local;

    expect(next.turn_index).toBe(5);
    expect(nextAny.clergy_track_registry).toMatchObject({
      schema_version: "clergy_track_registry_v0",
      entry_ids: ["clergy_track:holy_orders:p_child3"],
    });
    expect(next.house.clergy_track_registry).toEqual(nextAny.clergy_track_registry);
    expect(next.house.institution_holder_registry).toEqual(nextAny.institution_holder_registry);
    expect(nextAny.institutions.i_parish_player_local.priest_person_id).toBe("p_child3");
    expect(nextAny.people.p_child3.age).toBe(17);
    expect(holder).toMatchObject({
      holder_person_id: "p_child3",
      holder_role: "parish_priest",
      start_turn_index: 4,
      last_confirmed_turn_index: 5,
      occupied: true,
    });
  });
});
