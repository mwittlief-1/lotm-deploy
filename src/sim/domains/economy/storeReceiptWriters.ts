import type { PhaseNameV0, RunState } from "../../types";
import type { EconomyProductionRegistryEntryV1 } from "./productionRegistry";
import {
  applyTrackedStoreDelta,
  spendCoin,
  spendTrackedStores,
  type LedgerReceiptContextV1,
  type TrackedStoreAsset
} from "./ledger";
import type { FiscalReceiptCounterpartyKindV1 } from "./receipts";
import {
  FISCAL_LEDGER_RUNTIME_ASSET_PATHS,
  acceptedPaymentModesFor,
  isPaymentModeAccepted,
  toAcceptedPaymentContractSnapshot,
  type FiscalPaymentContractIdV1,
  type FiscalPaymentContractReceiptCategoryV1,
  type FiscalPaymentContractServiceHookV1,
  type FiscalPaymentModeV1
} from "./schema";

export const TRACKED_STORE_RECEIPT_FLOW_KINDS = [
  "production",
  "consumption",
  "sale",
  "settlement",
  "enforcement"
] as const;

export const FISCAL_SETTLEMENT_SCAFFOLD_SCHEMA_VERSION = "fiscal_settlement_scaffold_v1" as const;

export const FISCAL_SETTLEMENT_SCAFFOLD_FIELDS = [
  "schema_version",
  "scaffold_id",
  "phase",
  "phase_sequence",
  "contract_id",
  "entry_kind",
  "counterparty_kind",
  "counterparty_id",
  "counterparty_label",
  "category",
  "accepted_payment_modes",
  "preferred_payment_mode",
  "selected_payment_mode",
  "amount",
  "runtime_asset_path",
  "service_hook",
  "rule_id",
  "related_actor_ids"
] as const;

export type TrackedStoreReceiptFlowKindV1 = typeof TRACKED_STORE_RECEIPT_FLOW_KINDS[number];
export type FiscalSettlementScaffoldSchemaVersionV1 = typeof FISCAL_SETTLEMENT_SCAFFOLD_SCHEMA_VERSION;
export type FiscalSettlementScaffoldFieldV1 = typeof FISCAL_SETTLEMENT_SCAFFOLD_FIELDS[number];

export interface TrackedStoreReceiptWriterInputV1 {
  receipt_id?: string;
  phase: PhaseNameV0;
  phase_sequence: number;
  asset: TrackedStoreAsset;
  delta: number;
  flow_kind: TrackedStoreReceiptFlowKindV1;
  source_label: string;
  category: string;
  counterparty_kind: FiscalReceiptCounterpartyKindV1;
  counterparty_id: string;
  counterparty_label: string;
  rule_id: string;
  related_actor_ids?: readonly string[];
}

export interface TrackedStoreSpendReceiptWriterInputV1
  extends Omit<TrackedStoreReceiptWriterInputV1, "delta"> {
  amount: number;
}

export interface EconomyProductionReceiptWriterContextV1 {
  phase: PhaseNameV0;
  phase_sequence: number;
  related_actor_ids?: readonly string[];
}

export interface FiscalSettlementScaffoldV1 {
  schema_version: FiscalSettlementScaffoldSchemaVersionV1;
  scaffold_id: string;
  phase: PhaseNameV0;
  phase_sequence: number;
  contract_id: FiscalPaymentContractIdV1;
  entry_kind: "obligation" | "offering";
  counterparty_kind: "church" | "liege";
  counterparty_id: string;
  counterparty_label: string;
  category: FiscalPaymentContractReceiptCategoryV1;
  accepted_payment_modes: FiscalPaymentModeV1[];
  preferred_payment_mode: FiscalPaymentModeV1;
  selected_payment_mode: FiscalPaymentModeV1;
  amount: number;
  runtime_asset_path: string | null;
  service_hook: FiscalPaymentContractServiceHookV1;
  rule_id: string;
  related_actor_ids: string[];
}

export interface FiscalSettlementScaffoldInputV1 {
  scaffold_id?: string;
  phase: PhaseNameV0;
  phase_sequence: number;
  contract_id: FiscalPaymentContractIdV1;
  counterparty_id: string;
  counterparty_label: string;
  selected_payment_mode: FiscalPaymentModeV1;
  amount: number;
  rule_id: string;
  related_actor_ids?: readonly string[];
}

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

function trackedStoreAssetLabel(asset: TrackedStoreAsset): string {
  return asset === "food_stores" ? "food stores" : "meat stores";
}

function buildTrackedStoreReceiptSummary(input: TrackedStoreReceiptWriterInputV1): string {
  const assetLabel = trackedStoreAssetLabel(input.asset);
  switch (input.flow_kind) {
    case "production":
      return `Production from ${input.source_label} recorded in ${assetLabel}.`;
    case "consumption":
      return `Consumption drained ${assetLabel} for ${input.source_label}.`;
    case "sale":
      return `Sale drew down ${assetLabel} for ${input.source_label}.`;
    case "settlement":
      return `Settlement drew down ${assetLabel} for ${input.source_label}.`;
    case "enforcement":
      return `Enforcement drew down ${assetLabel} for ${input.source_label}.`;
  }
}

function normalizedScaffoldId(input: FiscalSettlementScaffoldInputV1): string {
  if (input.scaffold_id) return input.scaffold_id;
  return [
    "settlement",
    input.phase,
    `p${normalizeInteger(input.phase_sequence)}`,
    input.contract_id,
    input.selected_payment_mode,
    input.counterparty_id
  ].join(":");
}

function isTrackedStorePaymentMode(mode: FiscalPaymentModeV1): mode is TrackedStoreAsset {
  return mode === "food_stores" || mode === "meat_stores";
}

function productionSourceLabel(entry: EconomyProductionRegistryEntryV1): string {
  return entry.source_kind === "hunting" ? "Hunting" : "Demesne grain";
}

function compareSettlementScaffold(
  left: FiscalSettlementScaffoldV1,
  right: FiscalSettlementScaffoldV1
): number {
  const numericDiff = normalizeInteger(left.phase_sequence) - normalizeInteger(right.phase_sequence);
  if (left.phase !== right.phase) return compareText(left.phase, right.phase);
  if (numericDiff !== 0) return numericDiff;
  if (left.category !== right.category) return compareText(left.category, right.category);
  if (left.counterparty_kind !== right.counterparty_kind) return compareText(left.counterparty_kind, right.counterparty_kind);
  if (left.counterparty_id !== right.counterparty_id) return compareText(left.counterparty_id, right.counterparty_id);
  if (left.selected_payment_mode !== right.selected_payment_mode) {
    return compareText(left.selected_payment_mode, right.selected_payment_mode);
  }
  return compareText(left.scaffold_id, right.scaffold_id);
}

export function buildTrackedStoreReceiptContext(input: TrackedStoreReceiptWriterInputV1): LedgerReceiptContextV1 {
  return {
    receipt_id: input.receipt_id,
    phase: input.phase,
    phase_sequence: normalizeInteger(input.phase_sequence),
    category: input.category,
    counterparty_kind: input.counterparty_kind,
    counterparty_id: input.counterparty_id,
    counterparty_label: input.counterparty_label,
    summary: buildTrackedStoreReceiptSummary(input),
    rule_id: input.rule_id,
    related_actor_ids: [...(input.related_actor_ids ?? [])]
  };
}

export function applyTrackedStoreReceiptWriterDelta(
  state: RunState,
  input: TrackedStoreReceiptWriterInputV1
): number {
  return applyTrackedStoreDelta(state, input.asset, input.delta, buildTrackedStoreReceiptContext(input));
}

export function spendTrackedStoreWithReceiptWriter(
  state: RunState,
  input: TrackedStoreSpendReceiptWriterInputV1
): number {
  return spendTrackedStores(
    state,
    input.asset,
    Math.max(0, normalizeInteger(input.amount)),
    buildTrackedStoreReceiptContext({
      ...input,
      delta: -Math.max(0, normalizeInteger(input.amount))
    })
  );
}

export function applyEconomyProductionReceiptEntry(
  state: RunState,
  entry: EconomyProductionRegistryEntryV1,
  context: EconomyProductionReceiptWriterContextV1
): number {
  return applyTrackedStoreReceiptWriterDelta(state, {
    phase: context.phase,
    phase_sequence: context.phase_sequence,
    asset: entry.asset,
    delta: entry.delta,
    flow_kind: "production",
    source_label: productionSourceLabel(entry),
    category: "income.demesne_surplus",
    counterparty_kind: "self",
    counterparty_id: "manor:demesne",
    counterparty_label: "Demesne",
    rule_id: entry.rule_id,
    related_actor_ids: context.related_actor_ids
  });
}

export function makeFiscalSettlementScaffold(
  input: FiscalSettlementScaffoldInputV1
): FiscalSettlementScaffoldV1 {
  if (!isPaymentModeAccepted(input.contract_id, input.selected_payment_mode)) {
    throw new Error(`Payment mode ${input.selected_payment_mode} is not accepted for contract ${input.contract_id}.`);
  }

  const contract = toAcceptedPaymentContractSnapshot(input.contract_id);

  return {
    schema_version: FISCAL_SETTLEMENT_SCAFFOLD_SCHEMA_VERSION,
    scaffold_id: normalizedScaffoldId(input),
    phase: input.phase,
    phase_sequence: normalizeInteger(input.phase_sequence),
    contract_id: input.contract_id,
    entry_kind: contract.entry_kind,
    counterparty_kind: contract.counterparty_kind,
    counterparty_id: input.counterparty_id,
    counterparty_label: input.counterparty_label,
    category: contract.receipt_category,
    accepted_payment_modes: acceptedPaymentModesFor(input.contract_id),
    preferred_payment_mode: contract.preferred_payment_mode,
    selected_payment_mode: input.selected_payment_mode,
    amount: Math.max(0, normalizeInteger(input.amount)),
    runtime_asset_path: FISCAL_LEDGER_RUNTIME_ASSET_PATHS[input.selected_payment_mode],
    service_hook: contract.service_hook,
    rule_id: input.rule_id,
    related_actor_ids: canonicalRelatedActorIds(input.related_actor_ids ?? [])
  };
}

export function toFiscalSettlementScaffoldSnapshot(
  scaffold: FiscalSettlementScaffoldV1
): FiscalSettlementScaffoldV1 {
  return {
    schema_version: scaffold.schema_version,
    scaffold_id: scaffold.scaffold_id,
    phase: scaffold.phase,
    phase_sequence: normalizeInteger(scaffold.phase_sequence),
    contract_id: scaffold.contract_id,
    entry_kind: scaffold.entry_kind,
    counterparty_kind: scaffold.counterparty_kind,
    counterparty_id: scaffold.counterparty_id,
    counterparty_label: scaffold.counterparty_label,
    category: scaffold.category,
    accepted_payment_modes: acceptedPaymentModesFor(scaffold.contract_id),
    preferred_payment_mode: scaffold.preferred_payment_mode,
    selected_payment_mode: scaffold.selected_payment_mode,
    amount: Math.max(0, normalizeInteger(scaffold.amount)),
    runtime_asset_path: scaffold.runtime_asset_path,
    service_hook: scaffold.service_hook,
    rule_id: scaffold.rule_id,
    related_actor_ids: canonicalRelatedActorIds(scaffold.related_actor_ids)
  };
}

export function buildFiscalSettlementScaffoldSnapshot(
  scaffolds: readonly FiscalSettlementScaffoldV1[]
): FiscalSettlementScaffoldV1[] {
  return [...scaffolds].sort(compareSettlementScaffold).map((scaffold) => toFiscalSettlementScaffoldSnapshot(scaffold));
}

export function serializeFiscalSettlementScaffoldSnapshot(
  scaffolds: readonly FiscalSettlementScaffoldV1[]
): string {
  return JSON.stringify(buildFiscalSettlementScaffoldSnapshot(scaffolds));
}

export function applyFiscalSettlementScaffold(
  state: RunState,
  scaffold: FiscalSettlementScaffoldV1
): number {
  const snapshot = toFiscalSettlementScaffoldSnapshot(scaffold);

  if (snapshot.selected_payment_mode === "coin") {
    return spendCoin(state, snapshot.amount, {
      phase: snapshot.phase,
      phase_sequence: snapshot.phase_sequence,
      category: snapshot.category,
      counterparty_kind: snapshot.counterparty_kind,
      counterparty_id: snapshot.counterparty_id,
      counterparty_label: snapshot.counterparty_label,
      summary: `Settlement paid in coin to ${snapshot.counterparty_label}.`,
      rule_id: snapshot.rule_id,
      related_actor_ids: snapshot.related_actor_ids
    });
  }

  if (isTrackedStorePaymentMode(snapshot.selected_payment_mode)) {
    return spendTrackedStoreWithReceiptWriter(state, {
      phase: snapshot.phase,
      phase_sequence: snapshot.phase_sequence,
      asset: snapshot.selected_payment_mode,
      amount: snapshot.amount,
      flow_kind: "settlement",
      source_label: snapshot.counterparty_label,
      category: snapshot.category,
      counterparty_kind: snapshot.counterparty_kind,
      counterparty_id: snapshot.counterparty_id,
      counterparty_label: snapshot.counterparty_label,
      rule_id: snapshot.rule_id,
      related_actor_ids: snapshot.related_actor_ids
    });
  }

  return 0;
}
