import { describe, expect, it } from "vitest";

import { SIM_VERSION } from "../../src/sim/version";
import type { Person, RunState, WarLevyDue } from "../../src/sim/types";
import {
  applyArrearsBushelsDelta,
  applyArrearsCoinDelta,
  applyBushelDelta,
  applyCoinDelta,
  applyMeatStoreDelta,
  applyTaxDueCoinDelta,
  applyTitheDueBushelsDelta,
  canAffordCoin,
  clearLedgerReceiptJournal,
  clearWarLevyDue,
  meatStoreBalance,
  readLedgerReceiptSnapshots,
  rollTitheDueBushelsIntoArrears,
  rollTaxDueCoinIntoArrears,
  setBushelBalance,
  setMeatStoreBalance,
  setTaxDueCoin,
  setTitheDueBushels,
  setWarLevyDue,
  spendArrearsBushels,
  spendArrearsCoin,
  spendBushels,
  spendCoin,
  spendMeatStores,
  spendTitheDueBushels,
  spendTaxDueCoin
} from "../../src/sim/domains/economy/ledger";

function mkPerson(id: string, sex: "M" | "F", age: number): Person {
  return {
    id,
    name: id,
    sex,
    age,
    alive: true,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    married: false
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "M", 40);
  const spouse = mkPerson("p_spouse", "F", 38);
  const liege = mkPerson("p_liege", "M", 50);
  const clergy = mkPerson("p_clergy", "M", 45);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 1,
    manor: {
      population: 20,
      farmers: 10,
      builders: 2,
      bushels_stored: 50,
      meat_stores: 6,
      coin: 10,
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

describe("economy ledger domain", () => {
  it("applies and spends coin with the same clamped semantics as the legacy direct writes", () => {
    const state = mkState();

    expect(canAffordCoin(state, 8)).toBe(true);
    expect(canAffordCoin(state, 11)).toBe(false);

    expect(applyCoinDelta(state, 4)).toBe(4);
    expect(state.manor.coin).toBe(14);

    expect(spendCoin(state, 6)).toBe(6);
    expect(state.manor.coin).toBe(8);

    expect(applyCoinDelta(state, -20)).toBe(-8);
    expect(state.manor.coin).toBe(0);
  });

  it("owns obligation coin fields and levy lifecycle", () => {
    const state = mkState();

    expect(setTaxDueCoin(state, 7)).toBe(7);
    expect(applyTaxDueCoinDelta(state, -2)).toBe(-2);
    expect(state.manor.obligations.tax_due_coin).toBe(5);
    expect(spendTaxDueCoin(state, 3)).toBe(3);
    expect(state.manor.obligations.tax_due_coin).toBe(2);

    expect(applyArrearsCoinDelta(state, 4)).toBe(4);
    expect(spendArrearsCoin(state, 1)).toBe(1);
    expect(state.manor.obligations.arrears.coin).toBe(3);

    expect(rollTaxDueCoinIntoArrears(state)).toBe(2);
    expect(state.manor.obligations.tax_due_coin).toBe(0);
    expect(state.manor.obligations.arrears.coin).toBe(5);

    const levy: WarLevyDue = { kind: "men_or_coin", men: 4, coin: 6, created_turn: state.turn_index };
    setWarLevyDue(state, levy);
    expect(state.manor.obligations.war_levy_due).toEqual(levy);

    clearWarLevyDue(state);
    expect(state.manor.obligations.war_levy_due).toBeNull();
  });

  it("owns stored bushels and bushel obligation fields", () => {
    const state = mkState();

    expect(setBushelBalance(state, 60)).toBe(60);
    expect(applyBushelDelta(state, -5)).toBe(-5);
    expect(spendBushels(state, 10)).toBe(10);
    expect(state.manor.bushels_stored).toBe(45);

    expect(setTitheDueBushels(state, 7)).toBe(7);
    expect(applyTitheDueBushelsDelta(state, -2)).toBe(-2);
    expect(spendTitheDueBushels(state, 3)).toBe(3);
    expect(state.manor.obligations.tithe_due_bushels).toBe(2);

    expect(applyArrearsBushelsDelta(state, 4)).toBe(4);
    expect(spendArrearsBushels(state, 1)).toBe(1);
    expect(state.manor.obligations.arrears.bushels).toBe(3);

    expect(rollTitheDueBushelsIntoArrears(state)).toBe(2);
    expect(state.manor.obligations.tithe_due_bushels).toBe(0);
    expect(state.manor.obligations.arrears.bushels).toBe(5);
  });

  it("emits canonical coin receipt rows when receipt metadata is provided", () => {
    const state = mkState();

    expect(
      applyCoinDelta(state, 4, {
        phase: "events",
        phase_sequence: 7,
        category: "income.justice_fees",
        counterparty_kind: "event",
        counterparty_id: "event:market-day",
        counterparty_label: "Market Day",
        summary: "Collected market dues.",
        rule_id: "events.market_dues",
        related_actor_ids: ["p_liege", "p_head"]
      })
    ).toBe(4);
    expect(
      spendCoin(state, 3, {
        phase: "construction",
        phase_sequence: 2,
        category: "expense.project_capex",
        counterparty_kind: "project",
        counterparty_id: "improvement:mill",
        counterparty_label: "Mill",
        summary: "Paid the mill survey fee.",
        rule_id: "construction.survey",
        related_actor_ids: ["p_head"]
      })
    ).toBe(3);

    const receipts = readLedgerReceiptSnapshots(state);
    expect(receipts).toHaveLength(2);
    expect(receipts.map((receipt) => receipt.receipt_id)).toEqual([
      "ledger:t1:construction:p2:coin:0002",
      "ledger:t1:events:p7:coin:0001"
    ]);
    expect(receipts.map((receipt) => receipt.balance_after)).toEqual([11, 14]);
    expect(receipts.map((receipt) => receipt.delta)).toEqual([-3, 4]);
    expect(receipts[1]?.related_actor_ids).toEqual(["p_head", "p_liege"]);
  });

  it("emits deterministic obligation coin receipts, including tax carry into arrears", () => {
    const state = mkState();

    expect(
      applyTaxDueCoinDelta(state, 6, {
        phase: "obligations",
        phase_sequence: 1,
        category: "obligation.liege_settlement",
        counterparty_kind: "liege",
        counterparty_id: "house:liege",
        counterparty_label: "House Liege",
        summary: "Assessed new liege tax due.",
        rule_id: "obligations.assess_tax"
      })
    ).toBe(6);
    expect(
      spendTaxDueCoin(state, 2, {
        phase: "obligations",
        phase_sequence: 3,
        category: "obligation.liege_settlement",
        counterparty_kind: "liege",
        counterparty_id: "house:liege",
        counterparty_label: "House Liege",
        summary: "Paid part of the liege tax due.",
        rule_id: "obligations.pay_tax"
      })
    ).toBe(2);
    expect(
      rollTaxDueCoinIntoArrears(state, {
        debit: {
          phase: "succession",
          phase_sequence: 9,
          category: "obligation.arrears_carry",
          counterparty_kind: "system",
          counterparty_id: "turn-close",
          counterparty_label: "Turn Close",
          summary: "Moved unpaid tax due out of the current ledger slot.",
          rule_id: "obligations.tax_to_arrears.debit"
        },
        credit: {
          phase: "succession",
          phase_sequence: 9,
          category: "obligation.arrears_carry",
          counterparty_kind: "system",
          counterparty_id: "turn-close",
          counterparty_label: "Turn Close",
          summary: "Moved unpaid tax due into coin arrears.",
          rule_id: "obligations.tax_to_arrears.credit"
        }
      })
    ).toBe(4);

    const receipts = readLedgerReceiptSnapshots(state);
    expect(receipts.map((receipt) => ({
      asset: receipt.asset,
      delta: receipt.delta,
      balance_after: receipt.balance_after,
      rule_id: receipt.rule_id
    }))).toEqual([
      {
        asset: "tax_due_coin",
        delta: 6,
        balance_after: 6,
        rule_id: "obligations.assess_tax"
      },
      {
        asset: "tax_due_coin",
        delta: -2,
        balance_after: 4,
        rule_id: "obligations.pay_tax"
      },
      {
        asset: "arrears_coin",
        delta: 4,
        balance_after: 4,
        rule_id: "obligations.tax_to_arrears.credit"
      },
      {
        asset: "tax_due_coin",
        delta: -4,
        balance_after: 0,
        rule_id: "obligations.tax_to_arrears.debit"
      }
    ]);
  });

  it("emits canonical food store receipt rows with deterministic truncation", () => {
    const state = mkState();

    expect(
      applyBushelDelta(state, 4.8, {
        phase: "consumption",
        phase_sequence: 5,
        category: "stores.granary",
        counterparty_kind: "household",
        counterparty_id: "manor:stores",
        counterparty_label: "Granary",
        summary: "Stored the week harvest surplus.",
        rule_id: "consumption.store_surplus"
      })
    ).toBe(4);
    expect(
      spendBushels(state, 7.9, {
        phase: "sell",
        phase_sequence: 6,
        category: "stores.market_sale",
        counterparty_kind: "market",
        counterparty_id: "market:town",
        counterparty_label: "Town Market",
        summary: "Sold grain stores at market.",
        rule_id: "sell.market_grain"
      })
    ).toBe(7);

    const receipts = readLedgerReceiptSnapshots(state);
    expect(receipts.map((receipt) => ({
      receipt_id: receipt.receipt_id,
      asset: receipt.asset,
      delta: receipt.delta,
      balance_after: receipt.balance_after
    }))).toEqual([
      {
        receipt_id: "ledger:t1:consumption:p5:food_stores:0001",
        asset: "food_stores",
        delta: 4,
        balance_after: 54
      },
      {
        receipt_id: "ledger:t1:sell:p6:food_stores:0002",
        asset: "food_stores",
        delta: -7,
        balance_after: 47
      }
    ]);
  });

  it("emits deterministic bushel obligation receipts, including tithe carry into arrears", () => {
    const state = mkState();

    expect(
      applyTitheDueBushelsDelta(state, 5.6, {
        phase: "obligations",
        phase_sequence: 4,
        category: "obligation.church_settlement",
        counterparty_kind: "church",
        counterparty_id: "parish:st-cuthbert",
        counterparty_label: "St. Cuthbert",
        summary: "Assessed the tithe due in grain.",
        rule_id: "obligations.assess_tithe"
      })
    ).toBe(5);
    expect(
      spendTitheDueBushels(state, 2.3, {
        phase: "obligations",
        phase_sequence: 5,
        category: "obligation.church_settlement",
        counterparty_kind: "church",
        counterparty_id: "parish:st-cuthbert",
        counterparty_label: "St. Cuthbert",
        summary: "Delivered part of the tithe in grain.",
        rule_id: "obligations.pay_tithe"
      })
    ).toBe(2);
    expect(
      rollTitheDueBushelsIntoArrears(state, {
        debit: {
          phase: "succession",
          phase_sequence: 7,
          category: "obligation.arrears_carry",
          counterparty_kind: "system",
          counterparty_id: "turn-close",
          counterparty_label: "Turn Close",
          summary: "Moved unpaid tithe due out of the current bushel slot.",
          rule_id: "obligations.tithe_to_arrears.debit"
        },
        credit: {
          phase: "succession",
          phase_sequence: 7,
          category: "obligation.arrears_carry",
          counterparty_kind: "system",
          counterparty_id: "turn-close",
          counterparty_label: "Turn Close",
          summary: "Moved unpaid tithe due into bushel arrears.",
          rule_id: "obligations.tithe_to_arrears.credit"
        }
      })
    ).toBe(3);

    const receipts = readLedgerReceiptSnapshots(state);
    expect(receipts.map((receipt) => ({
      asset: receipt.asset,
      delta: receipt.delta,
      balance_after: receipt.balance_after,
      rule_id: receipt.rule_id
    }))).toEqual([
      {
        asset: "tithe_due_bushels",
        delta: 5,
        balance_after: 5,
        rule_id: "obligations.assess_tithe"
      },
      {
        asset: "tithe_due_bushels",
        delta: -2,
        balance_after: 3,
        rule_id: "obligations.pay_tithe"
      },
      {
        asset: "arrears_bushels",
        delta: 3,
        balance_after: 3,
        rule_id: "obligations.tithe_to_arrears.credit"
      },
      {
        asset: "tithe_due_bushels",
        delta: -3,
        balance_after: 0,
        rule_id: "obligations.tithe_to_arrears.debit"
      }
    ]);
  });

  it("preserves legacy semantics when no receipt metadata is supplied", () => {
    const state = mkState();

    expect(applyCoinDelta(state, 5)).toBe(5);
    expect(spendCoin(state, 2)).toBe(2);
    expect(applyBushelDelta(state, 3)).toBe(3);
    expect(spendBushels(state, 1)).toBe(1);
    expect(readLedgerReceiptSnapshots(state)).toEqual([]);

    clearLedgerReceiptJournal(state);
    expect(readLedgerReceiptSnapshots(state)).toEqual([]);
  });

  it("tracks meat stores separately from grain with the same clamped semantics", () => {
    const state = mkState();

    expect(meatStoreBalance(state)).toBe(6);
    expect(setMeatStoreBalance(state, 9)).toBe(9);
    expect(applyMeatStoreDelta(state, -4)).toBe(-4);
    expect(spendMeatStores(state, 3)).toBe(3);
    expect(meatStoreBalance(state)).toBe(2);
    expect(state.manor.bushels_stored).toBe(50);
  });
});
