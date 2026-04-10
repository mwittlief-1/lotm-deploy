import { describe, expect, it } from "vitest";

import { chargeCourtDecisionBudget, ensureCourtDecisionBudgetRegistry } from "../../src/sim/domains/court/decisionBudget";
import { coinBalance, foodStoreBalance, readLedgerReceiptSnapshots } from "../../src/sim/domains/economy/ledger";
import { applyDecisionObligationsPhase } from "../../src/sim/phases/phase_obligations";
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

function mkDecisions(overrides?: Partial<TurnDecisions["obligations"]>): TurnDecisions {
  return {
    labor: { kind: "labor", desired_farmers: 10, desired_builders: 2 },
    sell: { kind: "sell", sell_bushels: 0 },
    obligations: {
      kind: "pay_obligations",
      pay_coin: 0,
      pay_bushels: 0,
      war_levy_choice: "ignore",
      gestures: {
        gift_liege: { amount: 0, payment_mode: "coin" },
        offering_church: { amount: 0, payment_mode: "food_stores" }
      },
      ...overrides
    },
    construction: { kind: "construction", action: "none" },
    marriage: { kind: "marriage", action: "none" },
    prospects: { kind: "prospects", actions: [] }
  };
}

describe("obligation gesture actions", () => {
  it("resolves liege gifts and church offerings through fiscal settlement receipts and relationship deltas", () => {
    const state = mkState();
    const reportNotes: string[] = [];
    const decisions = mkDecisions({
      gestures: {
        gift_liege: { amount: 3, payment_mode: "coin" },
        offering_church: { amount: 4, payment_mode: "food_stores" }
      }
    });

    applyDecisionObligationsPhase(state, decisions, reportNotes);

    expect(coinBalance(state)).toBe(9);
    expect(foodStoreBalance(state)).toBe(16);
    expect(ensureCourtDecisionBudgetRegistry(state).spent_by_action).toMatchObject({
      gift_liege: 1,
      offering_church: 1
    });
    expect(relationshipEdge(state, "p_liege", "p_head")).toMatchObject({ respect: 51, threat: 19 });
    expect(relationshipEdge(state, "p_clergy", "p_head")).toMatchObject({ respect: 51, threat: 19 });

    const receipts = readLedgerReceiptSnapshots(state);
    expect(receipts.map((receipt) => ({
      category: receipt.category,
      counterparty_kind: receipt.counterparty_kind,
      asset: receipt.asset,
      delta: receipt.delta
    }))).toEqual([
      {
        category: "gift.liege",
        counterparty_kind: "liege",
        asset: "coin",
        delta: -3
      },
      {
        category: "offering.church",
        counterparty_kind: "church",
        asset: "food_stores",
        delta: -4
      }
    ]);
    expect(state.economy_fiscal_receipts).toEqual(receipts);
    expect(reportNotes).toEqual([
      "Liege gift paid 3 coin.",
      "Church offering paid 4 food stores."
    ]);
  });

  it("blocks gestures cleanly when the court decision budget is exhausted", () => {
    const state = mkState();
    const reportNotes: string[] = [];
    chargeCourtDecisionBudget(state, "marriage_scout", 6);

    applyDecisionObligationsPhase(
      state,
      mkDecisions({
        gestures: {
          gift_liege: { amount: 2, payment_mode: "coin" },
          offering_church: { amount: 2, payment_mode: "food_stores" }
        }
      }),
      reportNotes
    );

    expect(coinBalance(state)).toBe(12);
    expect(foodStoreBalance(state)).toBe(20);
    expect(ensureCourtDecisionBudgetRegistry(state).spent_by_action).toMatchObject({
      gift_liege: 0,
      offering_church: 0,
      marriage_scout: 6
    });
    expect(readLedgerReceiptSnapshots(state)).toEqual([]);
    expect(state.economy_fiscal_receipts).toEqual([]);
    expect(reportNotes).toEqual([
      "Liege gift blocked: court decision budget exhausted.",
      "Church offering blocked: court decision budget exhausted."
    ]);
  });

  it("blocks unsupported gesture payment modes before scaffold application", () => {
    const state = mkState();
    const reportNotes: string[] = [];

    applyDecisionObligationsPhase(
      state,
      mkDecisions({
        gestures: {
          gift_liege: { amount: 1, payment_mode: "service_placeholder" as any },
          offering_church: { amount: 0, payment_mode: "food_stores" }
        }
      }),
      reportNotes
    );

    expect(coinBalance(state)).toBe(12);
    expect(readLedgerReceiptSnapshots(state)).toEqual([]);
    expect(state.economy_fiscal_receipts).toEqual([]);
    expect(relationshipEdge(state, "p_liege", "p_head")).toBeUndefined();
    expect(reportNotes).toEqual([
      "Liege gift blocked: payment mode service placeholder unsupported."
    ]);
  });
});
