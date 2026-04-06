import { describe, expect, it } from "vitest";

import type { Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";
import {
  COURT_OFFICE_REGISTRY_SCHEMA_VERSION,
  COURT_OFFICE_SEAT_SCHEMA_VERSION,
  COURT_SERVICE_RECORD_REGISTRY_SCHEMA_VERSION,
  COURT_SERVICE_RECORD_SCHEMA_VERSION,
  appointCourtOfficeHolder,
  createHouseCourtOfficeRegistry,
  createRealmCourtOfficeRegistry,
  ensureCourtOfficeRegistry,
  ensureCourtServiceRecordRegistry,
  buildCourtOfficeRegistry,
  buildCourtServiceRecordRegistry,
  isVacancyCapExceeded,
  listLegacyFilledHouseCourtOffices,
  planHouseCourtSeatFillDecisions,
  planLegacyHouseCourtAssignments,
  resolveVacancyTurnsOpen,
  syncLegacyHouseCourtServiceRecords,
  vacateCourtOfficeHolder,
} from "../../src/sim/domains/court/officeRegistry";

function mkPerson(id: string, sex: "M" | "F", age: number): Person {
  return {
    id,
    name: id,
    sex,
    age,
    alive: true,
    married: false,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "M", 42);
  const liege = mkPerson("p_liege", "M", 51);
  const clergy = mkPerson("p_clergy", "M", 46);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "office_registry_seed",
    turn_index: 4,
    manor: {
      population: 20,
      farmers: 10,
      builders: 0,
      bushels_stored: 40,
      meat_stores: 0,
      coin: 8,
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
      spouse: null,
      spouse_status: "widow",
      children: [],
      energy: { max: 3, available: 3 },
      heir_id: null,
    },
    locals: { liege, clergy, nobles: [] },
    relationships: [],
    flags: {},
    log: [],
    people: {
      [head.id]: head,
      [liege.id]: liege,
      [clergy.id]: clergy,
    },
    houses: {
      h_player: {
        id: "h_player",
        name: "Player",
        tier: "Knight",
        head_id: head.id,
        spouse_id: null,
        child_ids: [],
        member_person_ids: [head.id],
      },
    },
    player_house_id: "h_player",
    kinship_edges: [],
    game_over: null,
  };
}

describe("office registry schema", () => {
  it("builds a stable house baseline with an explicit required steward seat", () => {
    const registry = createHouseCourtOfficeRegistry();

    expect(registry.schema_version).toBe(COURT_OFFICE_REGISTRY_SCHEMA_VERSION);
    expect(registry.seat_ids).toEqual([
      "house:house:h_player:steward",
      "house:house:h_player:clerk",
      "house:house:h_player:marshal",
    ]);
    expect(registry.required_seat_ids).toEqual(["house:house:h_player:steward"]);
    expect(registry.filled_seat_ids).toEqual([]);
    expect(registry.vacant_required_seat_ids).toEqual(["house:house:h_player:steward"]);
    expect(registry.seats_by_id["house:house:h_player:steward"]).toEqual({
      schema_version: COURT_OFFICE_SEAT_SCHEMA_VERSION,
      seat_id: "house:house:h_player:steward",
      scope: "house",
      owner_actor_id: "house:h_player",
      seat_key: "steward",
      title: "Steward",
      requirement: "required",
      vacancy_cap_turns: 1,
      holder_person_id: null,
      holder_house_id: null,
      holder_kind: null,
      filled_turn_index: null,
      vacancy_started_turn_index: null,
      last_transition_turn_index: null,
      active_service_record_id: null,
    });
  });

  it("builds a stable realm baseline with deterministic seat order", () => {
    const registry = createRealmCourtOfficeRegistry("actor:earl");

    expect(registry.schema_version).toBe(COURT_OFFICE_REGISTRY_SCHEMA_VERSION);
    expect(registry.seat_ids).toEqual([
      "realm:actor:earl:chancellor",
      "realm:actor:earl:chamberlain",
      "realm:actor:earl:constable",
    ]);
    expect(registry.required_seat_ids).toEqual([]);
    expect(registry.filled_seat_ids).toEqual([]);
    expect(registry.vacant_required_seat_ids).toEqual([]);
  });

  it("normalizes mixed house and realm seats into a deterministic order", () => {
    const registry = buildCourtOfficeRegistry([
      {
        scope: "realm",
        owner_actor_id: "actor:earl",
        seat_key: "chancellor",
        requirement: "required",
        holder_person_id: "p_chancellor",
        holder_kind: "realm_holder",
        filled_turn_index: 3,
        active_service_record_id: "sr_realm_chancellor",
      },
      {
        scope: "house",
        owner_actor_id: "house:h_player",
        seat_key: "marshal",
        holder_person_id: "p_marshal",
        holder_kind: "non_family_retainer",
        filled_turn_index: 2,
        active_service_record_id: "sr_house_marshal",
      },
      {
        scope: "house",
        owner_actor_id: "house:h_player",
        seat_key: "steward",
        requirement: "required",
        vacancy_started_turn_index: 4,
      },
    ]);

    expect(registry.seat_ids).toEqual([
      "house:house:h_player:steward",
      "house:house:h_player:marshal",
      "realm:actor:earl:chancellor",
    ]);
    expect(registry.required_seat_ids).toEqual([
      "house:house:h_player:steward",
      "realm:actor:earl:chancellor",
    ]);
    expect(registry.filled_seat_ids).toEqual([
      "house:house:h_player:marshal",
      "realm:actor:earl:chancellor",
    ]);
    expect(registry.vacant_required_seat_ids).toEqual(["house:house:h_player:steward"]);
  });

  it("tracks the one-turn vacancy window on required seats", () => {
    const seat = buildCourtOfficeRegistry([
      {
        scope: "house",
        owner_actor_id: "house:h_player",
        seat_key: "steward",
        requirement: "required",
        vacancy_started_turn_index: 4,
      },
    ]).seats_by_id["house:house:h_player:steward"];

    expect(resolveVacancyTurnsOpen(seat, 4)).toBe(0);
    expect(resolveVacancyTurnsOpen(seat, 5)).toBe(1);
    expect(isVacancyCapExceeded(seat, 5)).toBe(false);
    expect(isVacancyCapExceeded(seat, 6)).toBe(true);
  });

  it("builds stable service records with ordered active entries", () => {
    const registry = buildCourtServiceRecordRegistry([
      {
        seat_id: "realm:actor:earl:chancellor",
        scope: "realm",
        owner_actor_id: "actor:earl",
        seat_key: "chancellor",
        holder_person_id: "p_chancellor",
        holder_kind: "realm_holder",
        payment_basis: "realm_stipend",
        start_turn_index: 1,
      },
      {
        seat_id: "house:house:h_player:marshal",
        scope: "house",
        owner_actor_id: "house:h_player",
        seat_key: "marshal",
        holder_person_id: "p_marshal",
        holder_kind: "non_family_retainer",
        payment_basis: "retainer_upkeep",
        start_turn_index: 2,
        end_turn_index: 3,
      },
    ]);

    expect(registry.schema_version).toBe(COURT_SERVICE_RECORD_REGISTRY_SCHEMA_VERSION);
    expect(registry.record_ids).toEqual([
      "house:house:h_player:marshal:p_marshal:2",
      "realm:actor:earl:chancellor:p_chancellor:1",
    ]);
    expect(registry.active_record_ids).toEqual(["realm:actor:earl:chancellor:p_chancellor:1"]);
    expect(registry.records_by_id["realm:actor:earl:chancellor:p_chancellor:1"]).toEqual({
      schema_version: COURT_SERVICE_RECORD_SCHEMA_VERSION,
      record_id: "realm:actor:earl:chancellor:p_chancellor:1",
      seat_id: "realm:actor:earl:chancellor",
      scope: "realm",
      owner_actor_id: "actor:earl",
      seat_key: "chancellor",
      serve_at_actor_id: "actor:earl",
      institution_assignment_id: null,
      holder_person_id: "p_chancellor",
      holder_house_id: null,
      holder_kind: "realm_holder",
      payment_basis: "realm_stipend",
      predecessor_record_id: null,
      successor_record_id: null,
      start_turn_index: 1,
      end_turn_index: null,
    });
  });

  it("replaces a realm office holder with deterministic tenure transitions", () => {
    const registry = createRealmCourtOfficeRegistry("actor:earl", [
      {
        seat_key: "chancellor",
        holder_person_id: "p_old_chancellor",
        holder_kind: "realm_holder",
        filled_turn_index: 2,
        active_service_record_id: "realm:actor:earl:chancellor:p_old_chancellor:2",
      },
    ]);
    const services = buildCourtServiceRecordRegistry([
      {
        seat_id: "realm:actor:earl:chancellor",
        scope: "realm",
        owner_actor_id: "actor:earl",
        seat_key: "chancellor",
        holder_person_id: "p_old_chancellor",
        holder_kind: "realm_holder",
        payment_basis: "realm_stipend",
        start_turn_index: 2,
      },
    ]);

    const result = appointCourtOfficeHolder(registry, services, {
      seat_id: "realm:actor:earl:chancellor",
      holder_person_id: "p_new_chancellor",
      holder_kind: "realm_holder",
      payment_basis: "realm_stipend",
      transition_turn_index: 5,
    });

    expect(result.ended_record_id).toBe("realm:actor:earl:chancellor:p_old_chancellor:2");
    expect(result.started_record_id).toBe("realm:actor:earl:chancellor:p_new_chancellor:5");
    expect(result.seat).toMatchObject({
      seat_id: "realm:actor:earl:chancellor",
      holder_person_id: "p_new_chancellor",
      holder_kind: "realm_holder",
      filled_turn_index: 5,
      vacancy_started_turn_index: null,
      last_transition_turn_index: 5,
      active_service_record_id: "realm:actor:earl:chancellor:p_new_chancellor:5",
    });
    expect(result.service_record_registry.records_by_id["realm:actor:earl:chancellor:p_old_chancellor:2"]).toMatchObject({
      end_turn_index: 5,
      successor_record_id: "realm:actor:earl:chancellor:p_new_chancellor:5",
    });
    expect(result.service_record_registry.records_by_id["realm:actor:earl:chancellor:p_new_chancellor:5"]).toEqual({
      schema_version: COURT_SERVICE_RECORD_SCHEMA_VERSION,
      record_id: "realm:actor:earl:chancellor:p_new_chancellor:5",
      seat_id: "realm:actor:earl:chancellor",
      scope: "realm",
      owner_actor_id: "actor:earl",
      seat_key: "chancellor",
      serve_at_actor_id: "actor:earl",
      institution_assignment_id: null,
      holder_person_id: "p_new_chancellor",
      holder_house_id: null,
      holder_kind: "realm_holder",
      payment_basis: "realm_stipend",
      predecessor_record_id: "realm:actor:earl:chancellor:p_old_chancellor:2",
      successor_record_id: null,
      start_turn_index: 5,
      end_turn_index: null,
    });
  });

  it("vacates a realm office holder and starts a deterministic vacancy window", () => {
    const registry = createRealmCourtOfficeRegistry("actor:earl", [
      {
        seat_key: "constable",
        requirement: "required",
        vacancy_cap_turns: 1,
        holder_person_id: "p_constable",
        holder_kind: "realm_holder",
        filled_turn_index: 3,
        active_service_record_id: "realm:actor:earl:constable:p_constable:3",
      },
    ]);
    const services = buildCourtServiceRecordRegistry([
      {
        seat_id: "realm:actor:earl:constable",
        scope: "realm",
        owner_actor_id: "actor:earl",
        seat_key: "constable",
        holder_person_id: "p_constable",
        holder_kind: "realm_holder",
        payment_basis: "realm_stipend",
        start_turn_index: 3,
      },
    ]);

    const result = vacateCourtOfficeHolder(registry, services, {
      seat_id: "realm:actor:earl:constable",
      transition_turn_index: 6,
    });

    expect(result.ended_record_id).toBe("realm:actor:earl:constable:p_constable:3");
    expect(result.started_record_id).toBeNull();
    expect(result.seat).toMatchObject({
      seat_id: "realm:actor:earl:constable",
      holder_person_id: null,
      filled_turn_index: null,
      vacancy_started_turn_index: 6,
      last_transition_turn_index: 6,
      active_service_record_id: null,
    });
    expect(result.service_record_registry.records_by_id["realm:actor:earl:constable:p_constable:3"]).toMatchObject({
      end_turn_index: 6,
    });
    expect(resolveVacancyTurnsOpen(result.seat, 7)).toBe(1);
    expect(isVacancyCapExceeded(result.seat, 7)).toBe(false);
    expect(isVacancyCapExceeded(result.seat, 8)).toBe(true);
  });

  it("attaches baseline office and service registries onto state", () => {
    const state = mkState();

    expect(ensureCourtOfficeRegistry(state).seat_ids).toEqual([
      "house:house:h_player:steward",
      "house:house:h_player:clerk",
      "house:house:h_player:marshal",
    ]);
    expect(ensureCourtServiceRecordRegistry(state)).toEqual({
      schema_version: COURT_SERVICE_RECORD_REGISTRY_SCHEMA_VERSION,
      record_ids: [],
      active_record_ids: [],
      records_by_id: {},
    });
    expect((state.house as any).court_office_registry.schema_version).toBe(COURT_OFFICE_REGISTRY_SCHEMA_VERSION);
    expect((state.house as any).court_service_record_registry.schema_version).toBe(
      COURT_SERVICE_RECORD_REGISTRY_SCHEMA_VERSION
    );
  });

  it("plans legacy house court assignments without changing the old variant rules", () => {
    const people = {
      p_steward: { alive: true },
      p_clerk: { alive: true },
      p_dead: { alive: false },
    };

    expect(planLegacyHouseCourtAssignments({ steward: "p_steward", clerk: "p_clerk" }, people, null)).toEqual({
      clerk: "p_clerk",
      steward: "p_steward",
    });
    expect(planLegacyHouseCourtAssignments({ steward: "p_dead", marshal: "p_dead" }, people, null)).toEqual({
      steward: "p_court_steward",
    });
    expect(planLegacyHouseCourtAssignments({ steward: "p_steward", clerk: "p_clerk" }, people, "A")).toEqual({});
    expect(planLegacyHouseCourtAssignments({ steward: "p_steward", marshal: "p_dead" }, people, "B")).toEqual({
      steward: "p_steward",
    });
    expect(planLegacyHouseCourtAssignments({}, people, "C")).toEqual({
      steward: "p_court_steward",
      clerk: "p_court_clerk",
    });
  });

  it("lists and mirrors legacy house court officers in stable role order", () => {
    const state = mkState();
    (state as any).houses.h_player.court_officers = {
      marshal: "p_marshal",
      steward: "p_steward",
      clerk: "p_clerk",
    };
    (state as any).people.p_steward = mkPerson("p_steward", "M", 37);
    (state as any).people.p_clerk = mkPerson("p_clerk", "M", 33);
    (state as any).people.p_marshal = mkPerson("p_marshal", "M", 35);

    expect(listLegacyFilledHouseCourtOffices(state)).toEqual([
      { role: "steward", person_id: "p_steward" },
      { role: "clerk", person_id: "p_clerk" },
      { role: "marshal", person_id: "p_marshal" },
    ]);

    syncLegacyHouseCourtServiceRecords(state, {
      steward: "p_steward",
      clerk: "p_clerk",
    });

    expect((state as any).service_records).toEqual([
      {
        id: "sr_h_player_clerk",
        person_id: "p_clerk",
        serving_actor_id: { kind: "house", id: "h_player" },
        role: "clerk",
        start_turn_index: 4,
        end_turn_index: null,
      },
      {
        id: "sr_h_player_steward",
        person_id: "p_steward",
        serving_actor_id: { kind: "house", id: "h_player" },
        role: "steward",
        start_turn_index: 4,
        end_turn_index: null,
      },
    ]);
  });

  it("keeps service placement tenure stable until the holder actually changes", () => {
    const state = mkState();
    (state as any).people.p_steward = mkPerson("p_steward", "M", 37);
    (state as any).people.p_new_steward = mkPerson("p_new_steward", "M", 34);

    const initialTransition = appointCourtOfficeHolder(
      ensureCourtOfficeRegistry(state),
      ensureCourtServiceRecordRegistry(state),
      {
        seat_id: "house:house:h_player:steward",
        holder_person_id: "p_steward",
        holder_kind: "non_family_retainer",
        payment_basis: "retainer_upkeep",
        transition_turn_index: 4,
      }
    );

    (state.house as any).court_office_registry = initialTransition.registry;
    (state.house as any).court_service_record_registry = initialTransition.service_record_registry;

    const persisted = appointCourtOfficeHolder(
      initialTransition.registry,
      initialTransition.service_record_registry,
      {
        seat_id: "house:house:h_player:steward",
        holder_person_id: "p_steward",
        holder_kind: "non_family_retainer",
        payment_basis: "retainer_upkeep",
        transition_turn_index: 5,
      }
    );

    expect(persisted.ended_record_id).toBeNull();
    expect(persisted.started_record_id).toBeNull();
    expect(persisted.service_record_registry.record_ids).toEqual([
      "house:house:h_player:steward:p_steward:4",
    ]);
    expect(persisted.service_record_registry.records_by_id["house:house:h_player:steward:p_steward:4"]).toMatchObject({
      serve_at_actor_id: "house:h_player",
      institution_assignment_id: null,
      predecessor_record_id: null,
      successor_record_id: null,
      start_turn_index: 4,
      end_turn_index: null,
    });

    const transitioned = appointCourtOfficeHolder(
      persisted.registry,
      persisted.service_record_registry,
      {
        seat_id: "house:house:h_player:steward",
        holder_person_id: "p_new_steward",
        holder_kind: "non_family_retainer",
        payment_basis: "retainer_upkeep",
        transition_turn_index: 5,
      }
    );

    expect(transitioned.service_record_registry.record_ids).toEqual([
      "house:house:h_player:steward:p_new_steward:5",
      "house:house:h_player:steward:p_steward:4",
    ]);
    expect(transitioned.service_record_registry.active_record_ids).toEqual([
      "house:house:h_player:steward:p_new_steward:5",
    ]);
    expect(transitioned.service_record_registry.records_by_id["house:house:h_player:steward:p_steward:4"]).toMatchObject({
      end_turn_index: 5,
      successor_record_id: "house:house:h_player:steward:p_new_steward:5",
    });
    expect(transitioned.service_record_registry.records_by_id["house:house:h_player:steward:p_new_steward:5"]).toMatchObject({
      serve_at_actor_id: "house:h_player",
      institution_assignment_id: null,
      predecessor_record_id: "house:house:h_player:steward:p_steward:4",
      successor_record_id: null,
      start_turn_index: 5,
      end_turn_index: null,
    });
  });

  it("classifies household members separately from non-family retainers for seat filling", () => {
    const state = mkState();
    const houseSon = mkPerson("p_house_son", "M", 16);
    const outsiderClerk = mkPerson("p_outsider_clerk", "F", 29);

    (state as any).people.p_house_son = houseSon;
    (state as any).people.p_outsider_clerk = outsiderClerk;
    (state as any).houses.h_player.member_person_ids = ["p_head", "p_house_son"];

    expect(planHouseCourtSeatFillDecisions(state, {
      steward: "p_house_son",
      clerk: "p_outsider_clerk",
    })).toEqual([
      {
        seat_id: "house:house:h_player:steward",
        seat_key: "steward",
        person_id: "p_house_son",
        holder_kind: "household_member",
        payment_basis: "family_service",
      },
      {
        seat_id: "house:house:h_player:clerk",
        seat_key: "clerk",
        person_id: "p_outsider_clerk",
        holder_kind: "non_family_retainer",
        payment_basis: "retainer_upkeep",
      },
    ]);
  });
});
