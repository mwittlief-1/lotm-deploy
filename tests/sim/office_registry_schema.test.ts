import { describe, expect, it } from "vitest";

import type { Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";
import {
  COURT_OFFICE_REGISTRY_SCHEMA_VERSION,
  COURT_OFFICE_SEAT_SCHEMA_VERSION,
  COURT_SERVICE_RECORD_REGISTRY_SCHEMA_VERSION,
  COURT_SERVICE_RECORD_SCHEMA_VERSION,
  createHouseCourtOfficeRegistry,
  ensureCourtOfficeRegistry,
  ensureCourtServiceRecordRegistry,
  buildCourtOfficeRegistry,
  buildCourtServiceRecordRegistry,
  isVacancyCapExceeded,
  resolveVacancyTurnsOpen,
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
      holder_person_id: "p_chancellor",
      holder_house_id: null,
      holder_kind: "realm_holder",
      payment_basis: "realm_stipend",
      start_turn_index: 1,
      end_turn_index: null,
    });
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
});
