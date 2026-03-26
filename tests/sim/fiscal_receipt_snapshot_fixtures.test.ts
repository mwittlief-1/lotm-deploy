import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import {
  clearLedgerReceiptJournal,
  readLedgerReceiptSnapshots,
  rollTaxDueCoinIntoArrears,
  rollTitheDueBushelsIntoArrears,
  setArrearsBushels,
  setArrearsCoin,
  setBushelBalance,
  setCoinBalance,
  setTaxDueCoin,
  setTitheDueBushels,
  applyCoinDelta,
  applyTaxDueCoinDelta,
  applyTitheDueBushelsDelta,
  spendBushels,
  spendCoin,
  spendTaxDueCoin,
  spendTitheDueBushels
} from "../../src/sim/domains/economy/ledger";
import { FISCAL_RECEIPT_FIELDS } from "../../src/sim/domains/economy/receipts";

function fixturePath(name: string): string {
  return path.resolve("tests/fixtures", name);
}

function readFixture(name: string): string {
  return fs.readFileSync(fixturePath(name), "utf8");
}

function serializeReceiptSnapshots(seed: string, builder: (state: any) => void): string {
  const state: any = createNewRun(seed);
  clearLedgerReceiptJournal(state);
  state.turn_index = 7;
  builder(state);
  return `${JSON.stringify(readLedgerReceiptSnapshots(state), null, 2)}\n`;
}

function buildEconomyFixture(seed: string): string {
  return serializeReceiptSnapshots(seed, (state: any) => {
    setCoinBalance(state, 30);
    setBushelBalance(state, 80);

    const head = state.house.head;
    const spouse = state.house.spouse ?? state.house.head;
    const liege = state.locals.liege;

    applyCoinDelta(state, 4, {
      phase: "events",
      phase_sequence: 4,
      category: "events.market_dues",
      counterparty_kind: "event",
      counterparty_id: "event:market-day",
      counterparty_label: "Market Day",
      summary: "Collected market dues from a favorable event draw.",
      rule_id: "events.market_dues",
      related_actor_ids: [liege.id, head.id]
    });
    spendBushels(state, 6, {
      phase: "consumption",
      phase_sequence: 2,
      category: "consumption.household_rations",
      counterparty_kind: "household",
      counterparty_id: head.id,
      counterparty_label: head.name,
      summary: "Consumed grain stores to cover household rations.",
      rule_id: "consumption.household_rations",
      related_actor_ids: [head.id, spouse.id]
    });
    spendBushels(state, 8, {
      phase: "sell",
      phase_sequence: 1,
      category: "sell.market_grain",
      counterparty_kind: "market",
      counterparty_id: "market:village-square",
      counterparty_label: "Village Market",
      summary: "Sold grain stores at the village market.",
      rule_id: "sell.market_grain",
      related_actor_ids: [head.id]
    });
    applyCoinDelta(state, 12, {
      phase: "sell",
      phase_sequence: 1,
      category: "sell.market_grain",
      counterparty_kind: "market",
      counterparty_id: "market:village-square",
      counterparty_label: "Village Market",
      summary: "Recorded coin proceeds from the grain sale.",
      rule_id: "sell.market_grain.proceeds",
      related_actor_ids: [head.id]
    });
    spendCoin(state, 5, {
      phase: "marriage",
      phase_sequence: 3,
      category: "marriage.dowry_settlement",
      counterparty_kind: "household",
      counterparty_id: spouse.id,
      counterparty_label: spouse.name,
      summary: "Settled a marriage dowry payment.",
      rule_id: "marriage.dowry_settlement",
      related_actor_ids: [head.id, spouse.id]
    });
    applyCoinDelta(state, 3, {
      phase: "prospects",
      phase_sequence: 5,
      category: "prospects.grant_acceptance",
      counterparty_kind: "household",
      counterparty_id: head.id,
      counterparty_label: head.name,
      summary: "Accepted a prospect grant with coin support.",
      rule_id: "prospects.grant_acceptance",
      related_actor_ids: [head.id, liege.id]
    });
  });
}

function buildObligationsFixture(seed: string): string {
  return serializeReceiptSnapshots(seed, (state: any) => {
    setTaxDueCoin(state, 0);
    setTitheDueBushels(state, 0);
    setArrearsCoin(state, 0);
    setArrearsBushels(state, 0);

    const head = state.house.head;
    const liege = state.locals.liege;
    const clergy = state.locals.clergy;

    applyTaxDueCoinDelta(state, 6, {
      phase: "obligations",
      phase_sequence: 1,
      category: "obligations.liege_tax",
      counterparty_kind: "liege",
      counterparty_id: liege.id,
      counterparty_label: liege.name,
      summary: "Assessed liege tax due in coin.",
      rule_id: "obligations.assess_tax",
      related_actor_ids: [head.id, liege.id]
    });
    spendTaxDueCoin(state, 2, {
      phase: "obligations",
      phase_sequence: 2,
      category: "obligations.liege_tax",
      counterparty_kind: "liege",
      counterparty_id: liege.id,
      counterparty_label: liege.name,
      summary: "Paid part of the liege tax due in coin.",
      rule_id: "obligations.pay_tax",
      related_actor_ids: [head.id, liege.id]
    });
    applyTitheDueBushelsDelta(state, 5, {
      phase: "obligations",
      phase_sequence: 3,
      category: "obligations.church_tithe",
      counterparty_kind: "church",
      counterparty_id: clergy.id,
      counterparty_label: clergy.name,
      summary: "Assessed church tithe due in grain.",
      rule_id: "obligations.assess_tithe",
      related_actor_ids: [clergy.id, head.id]
    });
    spendTitheDueBushels(state, 2, {
      phase: "obligations",
      phase_sequence: 4,
      category: "obligations.church_tithe",
      counterparty_kind: "church",
      counterparty_id: clergy.id,
      counterparty_label: clergy.name,
      summary: "Delivered part of the church tithe in grain.",
      rule_id: "obligations.pay_tithe",
      related_actor_ids: [clergy.id, head.id]
    });
    rollTaxDueCoinIntoArrears(state, {
      debit: {
        phase: "succession",
        phase_sequence: 8,
        category: "obligations.tax_to_arrears",
        counterparty_kind: "system",
        counterparty_id: "turn-close",
        counterparty_label: "Turn Close",
        summary: "Moved unpaid liege tax out of the current due slot.",
        rule_id: "obligations.tax_to_arrears.debit",
        related_actor_ids: [head.id, liege.id]
      },
      credit: {
        phase: "succession",
        phase_sequence: 8,
        category: "obligations.tax_to_arrears",
        counterparty_kind: "system",
        counterparty_id: "turn-close",
        counterparty_label: "Turn Close",
        summary: "Moved unpaid liege tax into arrears coin.",
        rule_id: "obligations.tax_to_arrears.credit",
        related_actor_ids: [head.id, liege.id]
      }
    });
    rollTitheDueBushelsIntoArrears(state, {
      debit: {
        phase: "succession",
        phase_sequence: 9,
        category: "obligations.tithe_to_arrears",
        counterparty_kind: "system",
        counterparty_id: "turn-close",
        counterparty_label: "Turn Close",
        summary: "Moved unpaid church tithe out of the current due slot.",
        rule_id: "obligations.tithe_to_arrears.debit",
        related_actor_ids: [clergy.id, head.id]
      },
      credit: {
        phase: "succession",
        phase_sequence: 9,
        category: "obligations.tithe_to_arrears",
        counterparty_kind: "system",
        counterparty_id: "turn-close",
        counterparty_label: "Turn Close",
        summary: "Moved unpaid church tithe into arrears grain.",
        rule_id: "obligations.tithe_to_arrears.credit",
        related_actor_ids: [clergy.id, head.id]
      }
    });
  });
}

function expectBoundedFixture(name: string, expectedRows: number): void {
  const receipts = JSON.parse(readFixture(name)) as Array<Record<string, unknown>>;
  expect(receipts).toHaveLength(expectedRows);
  receipts.forEach((receipt) => {
    expect(Object.keys(receipt)).toEqual([...FISCAL_RECEIPT_FIELDS]);
  });
}

describe("fiscal receipt snapshot fixtures", () => {
  it("matches the seeded economy receipt snapshot fixture", () => {
    const seed = "V03_R0_001_T05_ECONOMY_FIXTURE";
    const expected = readFixture("fiscal_receipt_snapshot_economy_v0.3.0.json");

    expect(buildEconomyFixture(seed)).toBe(expected);
    expect(buildEconomyFixture(seed)).toBe(buildEconomyFixture(seed));
  });

  it("matches the seeded obligations receipt snapshot fixture", () => {
    const seed = "V03_R0_001_T05_OBLIGATIONS_FIXTURE";
    const expected = readFixture("fiscal_receipt_snapshot_obligations_v0.3.0.json");

    expect(buildObligationsFixture(seed)).toBe(expected);
    expect(buildObligationsFixture(seed)).toBe(buildObligationsFixture(seed));
  });

  it("keeps the receipt fixtures bounded and field-stable for review", () => {
    expectBoundedFixture("fiscal_receipt_snapshot_economy_v0.3.0.json", 6);
    expectBoundedFixture("fiscal_receipt_snapshot_obligations_v0.3.0.json", 8);
  });
});
