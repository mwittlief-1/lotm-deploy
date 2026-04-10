import { describe, expect, it } from "vitest";

import {
  appointCourtOfficeHolder,
  createHouseCourtOfficeRegistry,
  createRealmCourtOfficeRegistry,
  createCourtServiceRecordRegistry,
} from "../../src/sim/domains/court/officeRegistry";
import {
  buildOfficeHolderSuccessionHooks,
  OFFICE_HOLDER_SUCCESSION_HOOKS_SCHEMA_VERSION,
} from "../../src/sim/domains/people/officeSuccessionHooks";
import type { Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

function mkPerson(id: string, sex: "M" | "F", age: number, opts?: Partial<Person>): Person {
  return {
    id,
    name: id,
    sex,
    age,
    alive: true,
    married: false,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    ...(opts ?? {}),
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "M", 48, { married: true });
  const spouse = mkPerson("p_spouse", "F", 44, { married: true });
  const heir = mkPerson("p_heir", "M", 20);
  const daughter = mkPerson("p_daughter", "F", 16);
  const liege = mkPerson("p_liege", "M", 50);
  const clergy = mkPerson("p_clergy", "M", 45);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "office_invariants_seed",
    turn_index: 4,
    manor: {
      population: 20,
      farmers: 10,
      builders: 0,
      bushels_stored: 50,
      meat_stores: 0,
      coin: 10,
      unrest: 0,
      improvements: [],
      construction: null,
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears: { coin: 0, bushels: 0 },
        war_levy_due: null,
      },
    },
    house: {
      head,
      spouse,
      spouse_status: "spouse",
      children: [heir, daughter],
      energy: { max: 3, available: 3 },
      heir_id: heir.id,
    },
    locals: { liege, clergy, nobles: [] },
    relationships: [],
    flags: {},
    log: [],
    people: {
      [head.id]: head,
      [spouse.id]: spouse,
      [heir.id]: heir,
      [daughter.id]: daughter,
      [liege.id]: liege,
      [clergy.id]: clergy,
    },
    houses: {
      h_player: {
        id: "h_player",
        name: "Player",
        tier: "Knight",
        head_id: head.id,
        spouse_id: spouse.id,
        child_ids: [heir.id, daughter.id],
        member_person_ids: [head.id, spouse.id, heir.id, daughter.id],
      },
    },
    player_house_id: "h_player",
    kinship_edges: [
      { kind: "spouse_of", a_id: head.id, b_id: spouse.id },
      { kind: "parent_of", parent_id: head.id, child_id: heir.id },
      { kind: "parent_of", parent_id: spouse.id, child_id: heir.id },
      { kind: "parent_of", parent_id: head.id, child_id: daughter.id },
      { kind: "parent_of", parent_id: spouse.id, child_id: daughter.id },
    ],
    game_over: null,
  };
}

describe("office and service invariants", () => {
  it("locks the canonical house and realm seat baselines", () => {
    const house = createHouseCourtOfficeRegistry();
    const realm = createRealmCourtOfficeRegistry("actor:earl");

    expect(house.seat_ids).toEqual([
      "house:house:h_player:steward",
      "house:house:h_player:clerk",
      "house:house:h_player:marshal",
    ]);
    expect(house.required_seat_ids).toEqual(["house:house:h_player:steward"]);
    expect(house.vacant_required_seat_ids).toEqual(["house:house:h_player:steward"]);
    expect(realm.seat_ids).toEqual([
      "realm:actor:earl:chancellor",
      "realm:actor:earl:chamberlain",
      "realm:actor:earl:constable",
    ]);
    expect(realm.required_seat_ids).toEqual([]);
    expect(new Set([...house.seat_ids, ...realm.seat_ids]).size).toBe(house.seat_ids.length + realm.seat_ids.length);
  });

  it("locks placement continuity and institution-target precedence across holder transitions", () => {
    const state = mkState();
    const serviceRegistry = createCourtServiceRecordRegistry();
    const officeRegistry = createHouseCourtOfficeRegistry();

    const initial = appointCourtOfficeHolder(officeRegistry, serviceRegistry, {
      seat_id: "house:house:h_player:steward",
      holder_person_id: "p_steward",
      holder_kind: "non_family_retainer",
      payment_basis: "retainer_upkeep",
      serve_at_actor_id: "house:h_player",
      transition_turn_index: 4,
    });

    const repeated = appointCourtOfficeHolder(initial.registry, initial.service_record_registry, {
      seat_id: "house:house:h_player:steward",
      holder_person_id: "p_steward",
      holder_kind: "non_family_retainer",
      payment_basis: "retainer_upkeep",
      serve_at_actor_id: "house:h_player",
      transition_turn_index: 5,
    });

    expect(repeated.ended_record_id).toBeNull();
    expect(repeated.started_record_id).toBeNull();
    expect(repeated.service_record_registry.active_record_ids).toEqual([
      "house:house:h_player:steward:p_steward:4",
    ]);

    const institutionShift = appointCourtOfficeHolder(repeated.registry, repeated.service_record_registry, {
      seat_id: "house:house:h_player:steward",
      holder_person_id: "p_steward",
      holder_kind: "institutional_holder",
      payment_basis: "benefice",
      serve_at_actor_id: "house:h_player",
      institution_assignment_id: "i_parish_01",
      transition_turn_index: 6,
    });

    expect(institutionShift.ended_record_id).toBe("house:house:h_player:steward:p_steward:4");
    expect(institutionShift.started_record_id).toBe("house:house:h_player:steward:p_steward:6");
    expect(institutionShift.service_record_registry.records_by_id["house:house:h_player:steward:p_steward:4"]).toMatchObject({
      successor_record_id: "house:house:h_player:steward:p_steward:6",
      end_turn_index: 6,
    });
    expect(institutionShift.service_record_registry.records_by_id["house:house:h_player:steward:p_steward:6"]).toMatchObject({
      institution_assignment_id: "i_parish_01",
      predecessor_record_id: "house:house:h_player:steward:p_steward:4",
      payment_basis: "benefice",
      holder_kind: "institutional_holder",
    });

    const hooks = buildOfficeHolderSuccessionHooks(state, institutionShift.service_record_registry);
    expect(hooks.schema_version).toBe(OFFICE_HOLDER_SUCCESSION_HOOKS_SCHEMA_VERSION);
    expect(hooks.hook_ids).toEqual(["house:house:h_player:steward:p_steward:6:owner_succession"]);
    expect(hooks.entries[0]).toMatchObject({
      continuity_target_kind: "institution_assignment",
      continuity_target_id: "i_parish_01",
      owner_incumbent_person_id: "p_head",
      owner_successor_person_id: "p_heir",
      current_heir_id: "p_heir",
      adult_successor_id: "p_heir",
    });
  });
});
