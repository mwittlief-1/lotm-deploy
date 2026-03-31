import { describe, expect, it } from "vitest";

import {
  arrearsBushels,
  arrearsCoin,
  coinBalance,
  foodStoreBalance,
  readLedgerReceiptSnapshots,
  taxDueCoin,
  titheDueBushels
} from "../../src/sim/domains/economy/ledger";
import {
  ECONOMY_OBLIGATION_TANGIBLE_BITE_SCHEMA_VERSION,
  ECONOMY_OBLIGATION_TANGIBLE_BITE_STAGE,
  applyEconomyObligationEnterpriseSeizure,
  applyEconomyObligationForcedStorePayment
} from "../../src/sim/domains/economy/obligationTangibleBite";
import type { Person, RunState } from "../../src/sim/types";
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

describe("economy obligation tangible bite", () => {
  it("applies enterprise seizure through an explicit per-turn coin cap with canonical receipts", () => {
    const state = mkState();
    state.manor.coin = 10;
    state.manor.obligations.tax_due_coin = 5;
    state.manor.obligations.arrears.coin = 3;

    const first = applyEconomyObligationEnterpriseSeizure(state, {
      phase: "obligations",
      phase_sequence: 4,
      counterparty_kind: "liege",
      requested_amount: 6,
      cap_amount: 5,
      rule_id: "enforcement.seizure.liege_first",
      related_actor_ids: ["p_liege", "p_head"]
    });
    const second = applyEconomyObligationEnterpriseSeizure(state, {
      phase: "obligations",
      phase_sequence: 5,
      counterparty_kind: "liege",
      requested_amount: 2,
      cap_amount: 5,
      rule_id: "enforcement.seizure.liege_repeat",
      related_actor_ids: ["p_head", "p_liege"]
    });

    expect(first).toMatchObject({
      schema_version: ECONOMY_OBLIGATION_TANGIBLE_BITE_SCHEMA_VERSION,
      stage: ECONOMY_OBLIGATION_TANGIBLE_BITE_STAGE,
      category: "enforcement.seizure",
      counterparty_kind: "liege",
      payment_mode: "coin",
      requested_amount: 6,
      cap_amount: 5,
      remaining_turn_cap: 0,
      applied_amount: 5,
      applied_to_arrears: 3,
      applied_to_due: 2,
      blocked: false,
      reason: "applied"
    });
    expect(second).toMatchObject({
      category: "enforcement.seizure",
      counterparty_kind: "liege",
      remaining_turn_cap: 0,
      applied_amount: 0,
      applied_to_arrears: 0,
      applied_to_due: 0,
      blocked: true,
      reason: "turn_cap_reached"
    });

    expect(coinBalance(state)).toBe(5);
    expect(arrearsCoin(state)).toBe(0);
    expect(taxDueCoin(state)).toBe(3);

    expect(
      readLedgerReceiptSnapshots(state).map((receipt) => ({
        category: receipt.category,
        counterparty_kind: receipt.counterparty_kind,
        asset: receipt.asset,
        delta: receipt.delta,
        balance_after: receipt.balance_after,
        rule_id: receipt.rule_id,
        related_actor_ids: receipt.related_actor_ids
      }))
    ).toEqual([
      {
        category: "enforcement.seizure",
        counterparty_kind: "liege",
        asset: "arrears_coin",
        delta: -3,
        balance_after: 0,
        rule_id: "enforcement.seizure.liege_first",
        related_actor_ids: ["p_head", "p_liege"]
      },
      {
        category: "enforcement.seizure",
        counterparty_kind: "liege",
        asset: "coin",
        delta: -5,
        balance_after: 5,
        rule_id: "enforcement.seizure.liege_first",
        related_actor_ids: ["p_head", "p_liege"]
      },
      {
        category: "enforcement.seizure",
        counterparty_kind: "liege",
        asset: "tax_due_coin",
        delta: -2,
        balance_after: 3,
        rule_id: "enforcement.seizure.liege_first",
        related_actor_ids: ["p_head", "p_liege"]
      }
    ]);
  });

  it("applies forced store payment through an explicit per-turn food cap with canonical receipts", () => {
    const state = mkState();
    state.manor.bushels_stored = 10;
    state.manor.obligations.tithe_due_bushels = 7;
    state.manor.obligations.arrears.bushels = 2;

    const first = applyEconomyObligationForcedStorePayment(state, {
      phase: "obligations",
      phase_sequence: 4,
      counterparty_kind: "church",
      asset: "food_stores",
      requested_amount: 5,
      cap_amount: 4,
      rule_id: "enforcement.stores.church_first",
      related_actor_ids: ["p_clergy", "p_head"]
    });
    const second = applyEconomyObligationForcedStorePayment(state, {
      phase: "obligations",
      phase_sequence: 5,
      counterparty_kind: "church",
      asset: "food_stores",
      requested_amount: 3,
      cap_amount: 4,
      rule_id: "enforcement.stores.church_repeat",
      related_actor_ids: ["p_head", "p_clergy"]
    });

    expect(first).toMatchObject({
      schema_version: ECONOMY_OBLIGATION_TANGIBLE_BITE_SCHEMA_VERSION,
      stage: ECONOMY_OBLIGATION_TANGIBLE_BITE_STAGE,
      category: "enforcement.forced_payment_stores",
      counterparty_kind: "church",
      payment_mode: "food_stores",
      requested_amount: 5,
      cap_amount: 4,
      remaining_turn_cap: 0,
      applied_amount: 4,
      applied_to_arrears: 2,
      applied_to_due: 2,
      blocked: false,
      reason: "applied"
    });
    expect(second).toMatchObject({
      category: "enforcement.forced_payment_stores",
      counterparty_kind: "church",
      remaining_turn_cap: 0,
      applied_amount: 0,
      applied_to_arrears: 0,
      applied_to_due: 0,
      blocked: true,
      reason: "turn_cap_reached"
    });

    expect(foodStoreBalance(state)).toBe(6);
    expect(arrearsBushels(state)).toBe(0);
    expect(titheDueBushels(state)).toBe(5);

    expect(
      readLedgerReceiptSnapshots(state).map((receipt) => ({
        category: receipt.category,
        counterparty_kind: receipt.counterparty_kind,
        asset: receipt.asset,
        delta: receipt.delta,
        balance_after: receipt.balance_after,
        rule_id: receipt.rule_id,
        related_actor_ids: receipt.related_actor_ids
      }))
    ).toEqual([
      {
        category: "enforcement.forced_payment_stores",
        counterparty_kind: "church",
        asset: "arrears_bushels",
        delta: -2,
        balance_after: 0,
        rule_id: "enforcement.stores.church_first",
        related_actor_ids: ["p_clergy", "p_head"]
      },
      {
        category: "enforcement.forced_payment_stores",
        counterparty_kind: "church",
        asset: "food_stores",
        delta: -4,
        balance_after: 6,
        rule_id: "enforcement.stores.church_first",
        related_actor_ids: ["p_clergy", "p_head"]
      },
      {
        category: "enforcement.forced_payment_stores",
        counterparty_kind: "church",
        asset: "tithe_due_bushels",
        delta: -2,
        balance_after: 5,
        rule_id: "enforcement.stores.church_first",
        related_actor_ids: ["p_clergy", "p_head"]
      }
    ]);
  });

  it("rejects forced store payment paths that would require unsupported store-to-coin valuation", () => {
    const state = mkState();
    state.manor.bushels_stored = 10;
    state.manor.obligations.tax_due_coin = 4;

    expect(() =>
      applyEconomyObligationForcedStorePayment(state, {
        phase: "obligations",
        phase_sequence: 4,
        counterparty_kind: "liege",
        asset: "food_stores",
        requested_amount: 3,
        cap_amount: 3,
        rule_id: "enforcement.stores.liege_unsupported",
        related_actor_ids: ["p_liege", "p_head"]
      })
    ).toThrowError(
      "Forced store payment is only implemented for bushel-backed church dues until store-to-coin valuation work lands."
    );
  });
});
