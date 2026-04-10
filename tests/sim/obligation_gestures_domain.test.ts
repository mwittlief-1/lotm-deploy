import { describe, expect, it } from "vitest";

import { chargeCourtDecisionBudget } from "../../src/sim/domains/court/decisionBudget";
import { coinBalance, foodStoreBalance } from "../../src/sim/domains/economy/ledger";
import {
  readEconomyObligationGestureRelationshipBefore,
  resolveEconomyObligationGesture,
  syncEconomyFiscalReceiptSnapshots
} from "../../src/sim/domains/economy/obligationGestures";
import type { Person, RelationshipEdge, RunState } from "../../src/sim/types";
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

describe("obligation gesture economy domain", () => {
  it("settles a liege gift through canonical economy scaffolds and emits structured receipt snapshots", () => {
    const state = mkState();
    const before = readEconomyObligationGestureRelationshipBefore(state, "gift_liege");

    const result = resolveEconomyObligationGesture(state, {
      phase: "obligations",
      phase_sequence: 3,
      gesture_action: "gift_liege",
      decision: { amount: 3, payment_mode: "coin" },
      related_actor_ids: [state.locals.liege.id]
    });

    expect(result.blocked_reason).toBe("applied");
    expect(result.paid_amount).toBe(3);
    expect(result.contract_id).toBe("liege_gift");
    expect(result.relationship_delta_applied).toEqual({ respect: 1, threat: -1 });
    expect(result.relationship_after).toMatchObject({ respect: before.respect + 1, threat: before.threat - 1 });
    expect(coinBalance(state)).toBe(9);
    expect(relationshipEdge(state, "p_liege", "p_head")).toMatchObject({ respect: 51, threat: 19 });
    expect(result.receipt_snapshots).toEqual([
      expect.objectContaining({
        category: "gift.liege",
        counterparty_kind: "liege",
        counterparty_id: "p_liege",
        asset: "coin",
        delta: -3
      })
    ]);
    expect(syncEconomyFiscalReceiptSnapshots(state)).toEqual(result.receipt_snapshots);
  });

  it("blocks unsupported payment modes before creating gesture scaffolds", () => {
    const state = mkState();

    const result = resolveEconomyObligationGesture(state, {
      phase: "obligations",
      phase_sequence: 3,
      gesture_action: "gift_liege",
      decision: { amount: 1, payment_mode: "service_placeholder" as any },
      related_actor_ids: [state.locals.liege.id]
    });

    expect(result.blocked_reason).toBe("unsupported_payment_mode");
    expect(result.scaffold).toBeNull();
    expect(result.receipt_snapshots).toEqual([]);
    expect(state.economy_fiscal_receipts).toEqual([]);
    expect(relationshipEdge(state, "p_liege", "p_head")).toBeUndefined();
    expect(coinBalance(state)).toBe(12);
  });

  it("blocks a church offering when the court decision budget is exhausted", () => {
    const state = mkState();
    chargeCourtDecisionBudget(state, "marriage_scout", 6);

    const result = resolveEconomyObligationGesture(state, {
      phase: "obligations",
      phase_sequence: 4,
      gesture_action: "offering_church",
      decision: { amount: 2, payment_mode: "food_stores" },
      related_actor_ids: [state.locals.clergy.id]
    });

    expect(result.blocked_reason).toBe("budget_exhausted");
    expect(result.paid_amount).toBe(0);
    expect(result.receipt_snapshots).toEqual([]);
    expect(state.economy_fiscal_receipts).toEqual([]);
    expect(foodStoreBalance(state)).toBe(20);
    expect(relationshipEdge(state, "p_clergy", "p_head")).toBeUndefined();
  });
});
