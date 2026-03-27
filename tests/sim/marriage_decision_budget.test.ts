import { describe, expect, it } from "vitest";

import {
  chargeCourtDecisionBudget,
  ensureCourtDecisionBudgetRegistry
} from "../../src/sim/domains/court/decisionBudget";
import { applyMarriageDecision } from "../../src/sim/domains/people/marriage";
import type { MarriageWindow, Person, RunState } from "../../src/sim/types";
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
    ...(opts ?? {})
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "M", 40, { married: true });
  const spouse = mkPerson("p_spouse", "F", 38, { married: true });
  const child = mkPerson("p_child_1", "M", 18);
  const liege = mkPerson("p_liege", "M", 50);
  const clergy = mkPerson("p_clergy", "M", 45);
  const candidate = mkPerson("p_cand_a", "F", 19);
  const extHead = mkPerson("p_ext_head", "M", 46);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 9,
    manor: {
      population: 24,
      farmers: 12,
      builders: 0,
      bushels_stored: 80,
      meat_stores: 6,
      coin: 12,
      unrest: 0,
      improvements: [],
      construction: null,
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears: { coin: 0, bushels: 0 },
        war_levy_due: null
      }
    } as any,
    house: {
      head,
      spouse,
      spouse_status: "spouse",
      children: [child],
      energy: { max: 3, available: 3 },
      heir_id: child.id
    },
    locals: { liege, clergy, nobles: [] },
    relationships: [],
    flags: {},
    log: [],
    people: {
      [head.id]: head,
      [spouse.id]: spouse,
      [child.id]: child,
      [liege.id]: liege,
      [clergy.id]: clergy,
      [candidate.id]: candidate,
      [extHead.id]: extHead
    },
    houses: {
      h_player: {
        id: "h_player",
        name: "Player",
        tier: "Knight",
        head_id: head.id,
        spouse_id: spouse.id,
        child_ids: [child.id],
        member_person_ids: [head.id, spouse.id, child.id]
      },
      h_ext_01: {
        id: "h_ext_01",
        name: "Ashford",
        tier: "Baron",
        head_id: extHead.id,
        spouse_id: null,
        child_ids: [candidate.id],
        member_person_ids: [extHead.id, candidate.id]
      }
    },
    player_house_id: "h_player",
    kinship_edges: [{ kind: "spouse_of", a_id: head.id, b_id: spouse.id }]
  } as any;
}

function mkMarriageWindow(): MarriageWindow {
  return {
    eligible_child_ids: ["p_child_1"],
    offers: [
      {
        house_person_id: "p_cand_a",
        house_label: "House Ashford",
        dowry_coin_net: 3,
        relationship_delta: { respect: 6, allegiance: 4, threat: -2 },
        liege_delta: { respect: 1, threat: -1 },
        risk_tags: ["prestige", "profitable"]
      }
    ]
  };
}

describe("marriage decision budget costs", () => {
  it("charges more budget for scouting than for inbound acceptance", () => {
    const scoutState = mkState();
    const scoutNotes: string[] = [];

    applyMarriageDecision(
      scoutState,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "scout" } } as any,
      scoutNotes
    );

    expect(scoutState.house.energy.available).toBe(2);
    expect((scoutState.flags as any)?._mods?.marriage_quality).toBe(1.05);
    expect(scoutNotes).toEqual(["Scouted prospects; next marriage window slightly improved."]);
    expect(ensureCourtDecisionBudgetRegistry(scoutState)).toMatchObject({
      spent: 2,
      remaining: 4,
      spent_by_action: {
        marriage_inbound: 0,
        marriage_scout: 2
      }
    });

    const acceptState = mkState();
    const acceptNotes: string[] = [];

    applyMarriageDecision(
      acceptState,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "accept", child_id: "p_child_1", offer_index: 0 } } as any,
      acceptNotes
    );

    expect(acceptState.house.energy.available).toBe(2);
    expect(acceptState.manor.coin).toBe(15);
    expect(acceptState.house.children[0]?.married).toBe(true);
    expect(acceptState.people?.p_cand_a?.married).toBe(true);
    expect(acceptNotes).toEqual(["Marriage accepted for p_child_1: dowry +3 coin."]);
    expect(ensureCourtDecisionBudgetRegistry(acceptState)).toMatchObject({
      spent: 1,
      remaining: 5,
      spent_by_action: {
        marriage_inbound: 1,
        marriage_scout: 0
      }
    });
  });

  it("charges inbound processing budget when rejecting all offers", () => {
    const state = mkState();
    const notes: string[] = [];

    applyMarriageDecision(
      state,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "reject_all" } } as any,
      notes
    );

    expect(state.house.energy.available).toBe(2);
    expect(state.manor.unrest).toBe(1);
    expect(notes).toEqual(["Rejected all offers; slight social friction (+1 unrest)."]);
    expect(ensureCourtDecisionBudgetRegistry(state)).toMatchObject({
      spent: 1,
      remaining: 5,
      spent_by_action: {
        marriage_inbound: 1,
        marriage_scout: 0
      }
    });
  });

  it("blocks scouting when one decision remains but still allows inbound acceptance", () => {
    const scoutBlocked = mkState();
    chargeCourtDecisionBudget(scoutBlocked, "gift_liege", 5);
    const scoutNotes: string[] = [];

    applyMarriageDecision(
      scoutBlocked,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "scout" } } as any,
      scoutNotes
    );

    expect(scoutBlocked.house.energy.available).toBe(3);
    expect(scoutBlocked.manor.coin).toBe(12);
    expect((scoutBlocked.flags as any)?._mods?.marriage_quality).toBeUndefined();
    expect(scoutNotes).toEqual(["No court budget for marriage scouting."]);
    expect(ensureCourtDecisionBudgetRegistry(scoutBlocked)).toMatchObject({
      spent: 5,
      remaining: 1,
      spent_by_action: {
        gift_liege: 5,
        marriage_inbound: 0,
        marriage_scout: 0
      }
    });

    const acceptAllowed = mkState();
    chargeCourtDecisionBudget(acceptAllowed, "gift_liege", 5);
    const acceptNotes: string[] = [];

    applyMarriageDecision(
      acceptAllowed,
      { marriage_window: mkMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "accept", child_id: "p_child_1", offer_index: 0 } } as any,
      acceptNotes
    );

    expect(acceptAllowed.house.energy.available).toBe(2);
    expect(acceptAllowed.manor.coin).toBe(15);
    expect(acceptAllowed.house.children[0]?.married).toBe(true);
    expect(acceptNotes).toEqual(["Marriage accepted for p_child_1: dowry +3 coin."]);
    expect(ensureCourtDecisionBudgetRegistry(acceptAllowed)).toMatchObject({
      spent: 6,
      remaining: 0,
      exhausted: true,
      spent_by_action: {
        gift_liege: 5,
        marriage_inbound: 1,
        marriage_scout: 0
      }
    });
  });
});
