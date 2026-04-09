import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import {
  assignInstitutionHolder,
  ensureInstitutionHolderRegistry,
  lookupInstitutionHolder,
} from "../../src/sim/domains/people/institutionHolderRegistry";
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

function createInstitutionHolderState(): RunState {
  const state = createNewRun("institution_holder_registry_v033");
  const youngerSon = mkChild("p_child3", "Thomas", "M", 14);
  const youngerDaughter = mkChild("p_child4", "Alice", "F", 13);
  addPlayerChild(state, youngerSon);
  addPlayerChild(state, youngerDaughter);
  state.house.heir_id = "p_child1";
  (state as any).houses[(state as any).player_house_id].heir_id = "p_child1";
  (state as any).institutions.i_abbey_local = {
    id: "i_abbey_local",
    type: "abbey",
    name: "St. Mildred's Abbey",
  };
  return state;
}

describe("institution holder registry", () => {
  it("assigns a clergy-track placement into the seeded parish holder slot", () => {
    const state = createInstitutionHolderState();

    const result = assignInstitutionHolder(state, {
      institution_id: "i_parish_player_local",
      person_id: "p_child3",
      track_kind: "holy_orders",
      turn_index: 4,
    });

    expect((state as any).institutions.i_parish_player_local.priest_person_id).toBe("p_child3");
    expect(result.institution_holder_registry.entries_by_institution_id.i_parish_player_local).toMatchObject({
      institution_type: "parish",
      holder_person_id: "p_child3",
      holder_actor_id: { kind: "person", id: "p_child3" },
      holder_role: "parish_priest",
      clergy_track_kind: "holy_orders",
      occupied: true,
      start_turn_index: 4,
      last_confirmed_turn_index: 0,
    });
  });

  it("derives abbey holder roles from convent placements", () => {
    const state = createInstitutionHolderState();

    const result = assignInstitutionHolder(state, {
      institution_id: "i_abbey_local",
      person_id: "p_child4",
      track_kind: "convent",
      turn_index: 6,
    });

    expect(result.institution_holder_registry.entries_by_institution_id.i_abbey_local).toMatchObject({
      institution_type: "abbey",
      holder_person_id: "p_child4",
      holder_role: "abbess",
      clergy_track_kind: "convent",
      occupied: true,
      start_turn_index: 6,
    });
  });

  it("preserves holder continuity across later turns when the same person remains assigned", () => {
    const state = createInstitutionHolderState();
    assignInstitutionHolder(state, {
      institution_id: "i_parish_player_local",
      person_id: "p_child3",
      track_kind: "holy_orders",
      turn_index: 4,
    });

    state.turn_index = 5;
    (state as any).people.p_child3.age = 15;
    const registry = ensureInstitutionHolderRegistry(state);
    const holder = lookupInstitutionHolder(registry, "i_parish_player_local");

    expect(holder).toMatchObject({
      holder_person_id: "p_child3",
      holder_role: "parish_priest",
      start_turn_index: 4,
      last_confirmed_turn_index: 5,
      occupied: true,
    });
    expect((state as any).institution_holder_registry).toBe(registry);
    expect((state.house as any).institution_holder_registry).toBe(registry);
  });

  it("keeps vacant institutions in a deterministic sorted registry", () => {
    const state = createInstitutionHolderState();
    const registry = ensureInstitutionHolderRegistry(state);

    expect(registry.institution_ids).toEqual(["i_abbey_local", "i_parish_player_local"]);
    expect(registry.entries_by_institution_id.i_abbey_local).toMatchObject({
      holder_person_id: null,
      holder_role: "abbot",
      occupied: false,
    });
    expect(registry.entries_by_institution_id.i_parish_player_local).toMatchObject({
      holder_person_id: null,
      holder_role: "parish_priest",
      occupied: false,
    });
  });
});
