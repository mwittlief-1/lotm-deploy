import { describe, expect, it } from "vitest";

import {
  FISCAL_RECEIPT_ASSETS,
  FISCAL_RECEIPT_FIELDS,
  FISCAL_RECEIPT_RUNTIME_ASSET_PATHS,
  FISCAL_RECEIPT_SCHEMA_VERSION,
  FISCAL_RECEIPT_SORT_FIELDS,
  buildFiscalReceiptSnapshot,
  makeFiscalReceipt,
  serializeFiscalReceiptSnapshot,
  sortFiscalReceipts,
  toFiscalReceiptSnapshot,
  type FiscalReceiptInputV1
} from "../../src/sim/domains/economy/receipts";

function mkReceipt(overrides: Partial<FiscalReceiptInputV1> = {}) {
  return makeFiscalReceipt({
    receipt_id: "receipt-002",
    turn: 7,
    phase: "obligations",
    phase_sequence: 2,
    category: "obligation.liege_settlement",
    counterparty_kind: "liege",
    counterparty_id: "house:westmarch",
    counterparty_label: "House Westmarch",
    asset: "coin",
    delta: -4,
    balance_after: 11,
    summary: "Paid four coin toward liege obligations.",
    rule_id: "obligations.pay_coin",
    related_actor_ids: ["person:b", "person:a"],
    ...overrides
  });
}

describe("fiscal receipt contract", () => {
  it("locks the canonical field order and asset mappings used for snapshots", () => {
    expect(FISCAL_RECEIPT_ASSETS).toEqual([
      "coin",
      "food_stores",
      "meat_stores",
      "tax_due_coin",
      "tithe_due_bushels",
      "arrears_coin",
      "arrears_bushels"
    ]);
    expect(FISCAL_RECEIPT_RUNTIME_ASSET_PATHS.food_stores).toBe("manor.bushels_stored");
    expect(FISCAL_RECEIPT_RUNTIME_ASSET_PATHS.meat_stores).toBe("manor.meat_stores");

    const snapshot = toFiscalReceiptSnapshot(mkReceipt());

    expect(Object.keys(snapshot)).toEqual([...FISCAL_RECEIPT_FIELDS]);
    expect(snapshot.schema_version).toBe(FISCAL_RECEIPT_SCHEMA_VERSION);
    expect(snapshot.related_actor_ids).toEqual(["person:a", "person:b"]);
  });

  it("sorts receipts by the explicit stable key tuple", () => {
    expect(FISCAL_RECEIPT_SORT_FIELDS).toEqual([
      "turn",
      "phase",
      "phase_sequence",
      "category",
      "counterparty_kind",
      "counterparty_id",
      "counterparty_label",
      "asset",
      "receipt_id"
    ]);

    const sorted = sortFiscalReceipts([
      mkReceipt({ receipt_id: "receipt-z", turn: 8 }),
      mkReceipt({ receipt_id: "receipt-d", turn: 7, phase_sequence: 3 }),
      mkReceipt({ receipt_id: "receipt-c", turn: 7, phase_sequence: 2, category: "expense.household_admin" }),
      mkReceipt({ receipt_id: "receipt-b", turn: 7, phase_sequence: 2, category: "expense.household_admin", counterparty_id: "house:eastwatch" }),
      mkReceipt({
        receipt_id: "receipt-a",
        turn: 7,
        phase_sequence: 2,
        category: "expense.household_admin",
        counterparty_id: "house:eastwatch",
        asset: "arrears_coin"
      }),
      mkReceipt({
        receipt_id: "receipt-0",
        turn: 7,
        phase_sequence: 2,
        category: "expense.household_admin",
        counterparty_id: "house:eastwatch",
        asset: "arrears_coin"
      })
    ]);

    expect(sorted.map((receipt) => receipt.receipt_id)).toEqual([
      "receipt-0",
      "receipt-a",
      "receipt-b",
      "receipt-c",
      "receipt-d",
      "receipt-z"
    ]);
  });

  it("serializes the same snapshot regardless of insertion order", () => {
    const receiptA = mkReceipt({
      receipt_id: "receipt-a",
      category: "expense.household_admin",
      counterparty_id: "house:eastwatch",
      related_actor_ids: ["person:b", "person:a"]
    });
    const receiptB = mkReceipt({
      receipt_id: "receipt-b",
      phase_sequence: 1,
      asset: "food_stores",
      delta: -9,
      balance_after: 41,
      related_actor_ids: ["person:d", "person:c"]
    });

    const one = serializeFiscalReceiptSnapshot([receiptB, receiptA]);
    const two = serializeFiscalReceiptSnapshot([
      mkReceipt({
        receipt_id: "receipt-a",
        category: "expense.household_admin",
        counterparty_id: "house:eastwatch",
        related_actor_ids: ["person:a", "person:b"]
      }),
      mkReceipt({
        receipt_id: "receipt-b",
        phase_sequence: 1,
        asset: "food_stores",
        delta: -9,
        balance_after: 41,
        related_actor_ids: ["person:c", "person:d"]
      })
    ]);

    expect(one).toBe(two);
    expect(buildFiscalReceiptSnapshot([receiptB, receiptA]).map((receipt) => receipt.receipt_id)).toEqual([
      "receipt-b",
      "receipt-a"
    ]);
  });
});
