import type { PhaseNameV0 } from "../../types";
import { FISCAL_LEDGER_RUNTIME_ASSET_PATHS } from "./schema";

export const FISCAL_RECEIPT_SCHEMA_VERSION = "fiscal_receipt_v1" as const;

export const FISCAL_RECEIPT_FIELDS = [
  "schema_version",
  "receipt_id",
  "turn",
  "phase",
  "phase_sequence",
  "category",
  "counterparty_kind",
  "counterparty_id",
  "counterparty_label",
  "asset",
  "delta",
  "balance_after",
  "summary",
  "rule_id",
  "related_actor_ids"
] as const;

export const FISCAL_RECEIPT_SORT_FIELDS = [
  "turn",
  "phase",
  "phase_sequence",
  "category",
  "counterparty_kind",
  "counterparty_id",
  "counterparty_label",
  "asset",
  "receipt_id"
] as const;

export const FISCAL_RECEIPT_ASSETS = [
  "coin",
  "food_stores",
  "meat_stores",
  "tax_due_coin",
  "tithe_due_bushels",
  "arrears_coin",
  "arrears_bushels"
] as const;

export const FISCAL_RECEIPT_RUNTIME_ASSET_PATHS = {
  coin: FISCAL_LEDGER_RUNTIME_ASSET_PATHS.coin,
  food_stores: FISCAL_LEDGER_RUNTIME_ASSET_PATHS.food_stores,
  meat_stores: FISCAL_LEDGER_RUNTIME_ASSET_PATHS.meat_stores,
  tax_due_coin: "manor.obligations.tax_due_coin",
  tithe_due_bushels: "manor.obligations.tithe_due_bushels",
  arrears_coin: "manor.obligations.arrears.coin",
  arrears_bushels: "manor.obligations.arrears.bushels"
} as const;

export const FISCAL_RECEIPT_COUNTERPARTY_KINDS = [
  "self",
  "household",
  "liege",
  "church",
  "market",
  "project",
  "event",
  "system",
  "unknown"
] as const;

export type FiscalReceiptSchemaVersionV1 = typeof FISCAL_RECEIPT_SCHEMA_VERSION;
export type FiscalReceiptFieldV1 = typeof FISCAL_RECEIPT_FIELDS[number];
export type FiscalReceiptSortFieldV1 = typeof FISCAL_RECEIPT_SORT_FIELDS[number];
export type FiscalReceiptAssetV1 = typeof FISCAL_RECEIPT_ASSETS[number];
export type FiscalReceiptCounterpartyKindV1 = typeof FISCAL_RECEIPT_COUNTERPARTY_KINDS[number];

export interface FiscalReceiptV1 {
  schema_version: FiscalReceiptSchemaVersionV1;
  receipt_id: string;
  turn: number;
  phase: PhaseNameV0;
  phase_sequence: number;
  category: string;
  counterparty_kind: FiscalReceiptCounterpartyKindV1;
  counterparty_id: string;
  counterparty_label: string;
  asset: FiscalReceiptAssetV1;
  delta: number;
  balance_after: number;
  summary: string;
  rule_id: string;
  related_actor_ids: string[];
}

export type FiscalReceiptInputV1 = Omit<FiscalReceiptV1, "schema_version"> & {
  schema_version?: FiscalReceiptSchemaVersionV1;
};

export type FiscalReceiptSnapshotV1 = FiscalReceiptV1;

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeInteger(value: number): number {
  return Math.trunc(value);
}

function canonicalRelatedActorIds(ids: readonly string[]): string[] {
  return [...ids].sort(compareText);
}

export function makeFiscalReceipt(input: FiscalReceiptInputV1): FiscalReceiptV1 {
  return toFiscalReceiptSnapshot({
    schema_version: input.schema_version ?? FISCAL_RECEIPT_SCHEMA_VERSION,
    receipt_id: input.receipt_id,
    turn: input.turn,
    phase: input.phase,
    phase_sequence: input.phase_sequence,
    category: input.category,
    counterparty_kind: input.counterparty_kind,
    counterparty_id: input.counterparty_id,
    counterparty_label: input.counterparty_label,
    asset: input.asset,
    delta: input.delta,
    balance_after: input.balance_after,
    summary: input.summary,
    rule_id: input.rule_id,
    related_actor_ids: input.related_actor_ids
  });
}

export function toFiscalReceiptSnapshot(receipt: FiscalReceiptV1): FiscalReceiptSnapshotV1 {
  return {
    schema_version: receipt.schema_version,
    receipt_id: receipt.receipt_id,
    turn: normalizeInteger(receipt.turn),
    phase: receipt.phase,
    phase_sequence: normalizeInteger(receipt.phase_sequence),
    category: receipt.category,
    counterparty_kind: receipt.counterparty_kind,
    counterparty_id: receipt.counterparty_id,
    counterparty_label: receipt.counterparty_label,
    asset: receipt.asset,
    delta: normalizeInteger(receipt.delta),
    balance_after: normalizeInteger(receipt.balance_after),
    summary: receipt.summary,
    rule_id: receipt.rule_id,
    related_actor_ids: canonicalRelatedActorIds(receipt.related_actor_ids)
  };
}

export function fiscalReceiptSortKey(receipt: FiscalReceiptV1): readonly [number, string, number, string, string, string, string, string, string] {
  const snapshot = toFiscalReceiptSnapshot(receipt);
  return [
    snapshot.turn,
    snapshot.phase,
    snapshot.phase_sequence,
    snapshot.category,
    snapshot.counterparty_kind,
    snapshot.counterparty_id,
    snapshot.counterparty_label,
    snapshot.asset,
    snapshot.receipt_id
  ] as const;
}

export function compareFiscalReceipts(a: FiscalReceiptV1, b: FiscalReceiptV1): number {
  const left = fiscalReceiptSortKey(a);
  const right = fiscalReceiptSortKey(b);

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];
    if (leftValue === rightValue) continue;
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return leftValue - rightValue;
    }
    return compareText(String(leftValue), String(rightValue));
  }

  return 0;
}

export function sortFiscalReceipts<T extends FiscalReceiptV1>(receipts: readonly T[]): T[] {
  return [...receipts].sort(compareFiscalReceipts);
}

export function buildFiscalReceiptSnapshot(receipts: readonly FiscalReceiptV1[]): FiscalReceiptSnapshotV1[] {
  return sortFiscalReceipts(receipts).map((receipt) => toFiscalReceiptSnapshot(receipt));
}

export function serializeFiscalReceipt(receipt: FiscalReceiptV1): string {
  return JSON.stringify(toFiscalReceiptSnapshot(receipt));
}

export function serializeFiscalReceiptSnapshot(receipts: readonly FiscalReceiptV1[]): string {
  return JSON.stringify(buildFiscalReceiptSnapshot(receipts));
}
