import { describe, expect, it } from "vitest";

import { applyDecisionObligationsPhase } from "../../src/sim/phases/phase_obligations";
import { closeTurnPhase } from "../../src/sim/phases/phase_succession";
import type { Person, RelationshipEdge, RunState, TurnDecisions } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

function mkPerson(id: string, name: string, sex: "M" | "F", age: number): Person {
  return {
    id,
    name,
    sex,
    age,
    alive: true,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    married: false
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "Lord Rowan", "M", 40);
  const spouse = mkPerson("p_spouse", "Lady Rowan", "F", 38);
  const liege = mkPerson("p_liege", "House Liege", "M", 50);
  const clergy = mkPerson("p_clergy", "Parish Church", "M", 45);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 1,
    manor: {
      population: 20,
      farmers: 10,
      builders: 2,
      bushels_stored: 20,
      meat_stores: 6,
      coin: 12,
      unrest: 12,
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
      children: [],
      energy: { max: 3, available: 3 },
      heir_id: null
    },
    locals: { liege, clergy, nobles: [] },
    relationships: [],
    flags: {},
    log: []
  };
}

function relationshipEdge(state: RunState, fromId: string, toId: string): RelationshipEdge | undefined {
  return state.relationships.find((edge) => edge.from_id === fromId && edge.to_id === toId);
}

const DECISIONS: TurnDecisions = {
  labor: { kind: "labor", desired_farmers: 10, desired_builders: 2 },
  sell: { kind: "sell", sell_bushels: 0 },
  obligations: {
    kind: "pay_obligations",
    pay_coin: 6,
    pay_bushels: 5,
    war_levy_choice: "ignore",
    gestures: {
      gift_liege: { amount: 0, payment_mode: "coin" },
      offering_church: { amount: 0, payment_mode: "food_stores" }
    }
  },
  construction: { kind: "construction", action: "none" },
  marriage: { kind: "marriage", action: "none" },
  prospects: { kind: "prospects", actions: [] }
};

describe("obligations phase integration", () => {
  it("settles liege and church obligations through the canonical registry order", () => {
    const state = mkState();
    const reportNotes: string[] = [];

    state.manor.obligations.tax_due_coin = 8;
    state.manor.obligations.tithe_due_bushels = 6;
    state.manor.obligations.arrears.coin = 1;
    state.manor.obligations.arrears.bushels = 2;

    applyDecisionObligationsPhase(state, DECISIONS, reportNotes);

    expect(state.manor.coin).toBe(6);
    expect(state.manor.bushels_stored).toBe(15);
    expect(state.manor.obligations.tax_due_coin).toBe(3);
    expect(state.manor.obligations.tithe_due_bushels).toBe(3);
    expect(state.manor.obligations.arrears).toEqual({ coin: 0, bushels: 0 });
    expect(reportNotes).toEqual([
      "Paid arrears: coin -1, bushels -2.",
      "Paid current dues: tax -5 coin, tithe -3 bushels."
    ]);
  });

  it("routes close-turn carry and enforcement through the obligation phase seam", () => {
    const state = mkState();
    const reportNotes: string[] = [];

    state.manor.obligations.tax_due_coin = 7;
    state.manor.obligations.tithe_due_bushels = 9;

    closeTurnPhase(state, reportNotes, [], {
      computeAdultSuccessorId: () => null,
      computeHeirId: () => null,
      rebaseHeadRelationships: () => {},
      syncPlayerHouseSummaryFromRegistry: () => {}
    });

    expect(state.manor.obligations.tax_due_coin).toBe(0);
    expect(state.manor.obligations.tithe_due_bushels).toBe(0);
    expect(state.manor.obligations.arrears).toEqual({ coin: 7, bushels: 9 });
    expect(state.turn_index).toBe(2);
    expect(state.manor.unrest).toBe(12);
    expect(relationshipEdge(state, "p_liege", "p_head")).toMatchObject({ respect: 49, threat: 21 });
    expect(relationshipEdge(state, "p_clergy", "p_head")).toMatchObject({ respect: 49, threat: 21 });
    expect(reportNotes).toEqual([
      "Obligation carry: tax +7 coin to arrears; tithe +9 bushels to arrears.",
      "Obligation enforcement: liege arrears 7 coin; church arrears 9 bushels; unrest unchanged."
    ]);
  });

  it("records clear enforcement state and stable unrest relief when arrears stay clear", () => {
    const state = mkState();
    const reportNotes: string[] = [];

    state.manor.unrest = 10;

    closeTurnPhase(state, reportNotes, [], {
      computeAdultSuccessorId: () => null,
      computeHeirId: () => null,
      rebaseHeadRelationships: () => {},
      syncPlayerHouseSummaryFromRegistry: () => {}
    });

    expect(state.manor.obligations.arrears).toEqual({ coin: 0, bushels: 0 });
    expect(state.manor.unrest).toBe(8);
    expect(relationshipEdge(state, "p_liege", "p_head")).toMatchObject({ respect: 51, threat: 19 });
    expect(relationshipEdge(state, "p_clergy", "p_head")).toMatchObject({ respect: 51, threat: 20 });
    expect(reportNotes).toEqual([
      "Obligation carry: tax +0 coin to arrears; tithe +0 bushels to arrears.",
      "Obligation enforcement: liege clear; church clear; unrest eased by 2."
    ]);
  });
});
