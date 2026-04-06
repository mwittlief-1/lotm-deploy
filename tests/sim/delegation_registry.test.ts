import { describe, expect, it } from "vitest";

import {
  buildCourtDelegationRegistry,
  COURT_DELEGATION_ACTIONS,
  COURT_DELEGATION_EFFECT_CONTRACT_SCHEMA_VERSION,
  COURT_DELEGATION_REGISTRY_SCHEMA_VERSION,
  ensureCourtDelegationRegistry,
  resolveCourtDelegationEntry,
  resolveDelegatedAmount,
  resolveDelegatedBudgetCost,
  resolveDelegatedEnergyCost,
} from "../../src/sim/domains/court/delegationRegistry";
import type { Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

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
  const head = mkPerson("p_head", "M", 40);
  const liege = mkPerson("p_liege", "M", 55);
  const clergy = mkPerson("p_clergy", "M", 46);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 2,
    manor: {
      population: 20,
      farmers: 10,
      builders: 0,
      bushels_stored: 30,
      meat_stores: 8,
      coin: 12,
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

describe("court delegation registry", () => {
  it("builds a stable baseline registry for all delegation families", () => {
    const registry = buildCourtDelegationRegistry();

    expect(registry.schema_version).toBe(COURT_DELEGATION_REGISTRY_SCHEMA_VERSION);
    expect(registry.action_keys).toEqual([...COURT_DELEGATION_ACTIONS]);
    expect(registry.active_action_keys).toEqual([]);
    expect(registry.entries_by_action.gift_liege).toEqual({
      action: "gift_liege",
      mode: "manual",
      delegated: false,
      summary_label: "Liege gifts",
      effect: {
        schema_version: COURT_DELEGATION_EFFECT_CONTRACT_SCHEMA_VERSION,
        budget_cost_delta: 0,
        budget_cost_floor: 0,
        amount_multiplier_pct: 100,
        energy_cost_delta: 0,
        energy_cost_floor: 0,
      },
    });
  });

  it("normalizes partial delegated entries and preserves canonical action order", () => {
    const registry = buildCourtDelegationRegistry([
      {
        action: "marriage_scout",
        delegated: true,
        summary_label: " Delegated scouting ",
        effect: {
          budget_cost_delta: -1,
          budget_cost_floor: 1,
          amount_multiplier_pct: 95,
          energy_cost_delta: -1,
          energy_cost_floor: 0,
        },
      },
      {
        action: "gift_liege",
        mode: "delegated",
        effect: {
          amount_multiplier_pct: 80,
        },
      },
    ]);

    expect(registry.action_keys).toEqual([
      "gift_liege",
      "offering_church",
      "marriage_scout",
      "maintenance",
    ]);
    expect(registry.active_action_keys).toEqual(["gift_liege", "marriage_scout"]);
    expect(registry.entries_by_action.gift_liege).toMatchObject({
      mode: "delegated",
      delegated: true,
      summary_label: "Liege gifts",
      effect: {
        amount_multiplier_pct: 80,
      },
    });
    expect(registry.entries_by_action.marriage_scout).toMatchObject({
      mode: "delegated",
      delegated: true,
      summary_label: "Delegated scouting",
      effect: {
        budget_cost_delta: -1,
        budget_cost_floor: 1,
        amount_multiplier_pct: 95,
        energy_cost_delta: -1,
        energy_cost_floor: 0,
      },
    });
    expect(registry.entries_by_action.offering_church.delegated).toBe(false);
  });

  it("resolves deterministic cost and amount transforms from the effect contract", () => {
    const entry = buildCourtDelegationRegistry([
      {
        action: "maintenance",
        delegated: true,
        effect: {
          budget_cost_delta: -3,
          budget_cost_floor: 1,
          amount_multiplier_pct: 85,
          energy_cost_delta: -2,
          energy_cost_floor: 0,
        },
      },
    ]).entries_by_action.maintenance;

    expect(resolveDelegatedBudgetCost(4, entry)).toBe(1);
    expect(resolveDelegatedBudgetCost(1, entry)).toBe(1);
    expect(resolveDelegatedAmount(9, entry)).toBe(7);
    expect(resolveDelegatedEnergyCost(2, entry)).toBe(0);
  });

  it("stores a normalized registry on state and resolves entries by action", () => {
    const state = mkState();
    (state.house as any).court_delegation_registry = {
      schema_version: COURT_DELEGATION_REGISTRY_SCHEMA_VERSION,
      entries_by_action: {
        offering_church: {
          action: "offering_church",
          mode: "delegated",
          delegated: true,
          summary_label: "Church offerings",
          effect: {
            schema_version: COURT_DELEGATION_EFFECT_CONTRACT_SCHEMA_VERSION,
            budget_cost_delta: -1,
            budget_cost_floor: 0,
            amount_multiplier_pct: 90,
            energy_cost_delta: 0,
            energy_cost_floor: 0,
          },
        },
      },
    };

    const registry = ensureCourtDelegationRegistry(state);
    const entry = resolveCourtDelegationEntry(state, "offering_church");

    expect(registry.action_keys).toEqual([...COURT_DELEGATION_ACTIONS]);
    expect(registry.active_action_keys).toEqual(["offering_church"]);
    expect(entry).toMatchObject({
      action: "offering_church",
      delegated: true,
      effect: {
        budget_cost_delta: -1,
        amount_multiplier_pct: 90,
      },
    });
    expect(resolveCourtDelegationEntry(state, "marriage_scout").delegated).toBe(false);
  });
});
