import type { PhaseNameV0, RunState } from "../../types";
import type { FiscalReceiptSnapshotV1 } from "./receipts";
import {
  applyCoinDelta,
  applyFoodStoreDelta,
  applyMeatStoreDelta,
  readLedgerReceiptSnapshots,
  spendCoin,
  spendFoodStores,
  spendMeatStores
} from "./ledger";

export const MARRIAGE_SETTLEMENT_SCAFFOLD_SCHEMA_VERSION = "marriage_settlement_scaffold_v1" as const;
export const MARRIAGE_SETTLEMENT_APPLY_RESULT_SCHEMA_VERSION = "marriage_settlement_apply_result_v1" as const;
export const MARRIAGE_SETTLEMENT_ASSET_ORDER = ["coin", "food_stores", "meat_stores"] as const;
export const MARRIAGE_SETTLEMENT_KINDS = ["dowry", "dower"] as const;

export type MarriageSettlementKindV1 = typeof MARRIAGE_SETTLEMENT_KINDS[number];
export type MarriageSettlementAssetV1 = typeof MARRIAGE_SETTLEMENT_ASSET_ORDER[number];
export type MarriageSettlementCategoryV1 = "marriage.dowry_settlement" | "marriage.dower_settlement";

export interface MarriageSettlementScaffoldV1 {
  schema_version: typeof MARRIAGE_SETTLEMENT_SCAFFOLD_SCHEMA_VERSION;
  scaffold_id: string;
  phase: PhaseNameV0;
  phase_sequence: number;
  settlement_kind: MarriageSettlementKindV1;
  category: MarriageSettlementCategoryV1;
  counterparty_kind: "household";
  counterparty_id: string;
  counterparty_label: string;
  subject_person_id: string | null;
  candidate_person_id: string | null;
  asset_order: MarriageSettlementAssetV1[];
  requested_delta_by_asset: Record<MarriageSettlementAssetV1, number>;
  rule_prefix: string;
  related_actor_ids: string[];
}

export interface MarriageSettlementScaffoldInputV1 {
  scaffold_id?: string;
  phase: PhaseNameV0;
  phase_sequence: number;
  settlement_kind: MarriageSettlementKindV1;
  counterparty_id: string;
  counterparty_label: string;
  subject_person_id?: string | null;
  candidate_person_id?: string | null;
  requested_delta_by_asset?: Partial<Record<MarriageSettlementAssetV1, number>>;
  related_actor_ids?: readonly string[];
}

export interface MarriageSettlementApplyEntryResultV1 {
  asset: MarriageSettlementAssetV1;
  requested_delta: number;
  applied_delta: number;
  shortfall_amount: number;
  rule_id: string;
}

export interface MarriageSettlementApplyResultV1 {
  schema_version: typeof MARRIAGE_SETTLEMENT_APPLY_RESULT_SCHEMA_VERSION;
  scaffold: MarriageSettlementScaffoldV1;
  asset_order: MarriageSettlementAssetV1[];
  applied_by_asset: Record<MarriageSettlementAssetV1, MarriageSettlementApplyEntryResultV1>;
  receipt_snapshots: FiscalReceiptSnapshotV1[];
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
  return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))].sort(compareText);
}

function normalizedScaffoldId(input: MarriageSettlementScaffoldInputV1): string {
  if (input.scaffold_id) return input.scaffold_id;
  return [
    "marriage_settlement",
    input.settlement_kind,
    input.phase,
    `p${normalizeInteger(input.phase_sequence)}`,
    input.counterparty_id,
    input.subject_person_id ?? "subject:none",
    input.candidate_person_id ?? "candidate:none"
  ].join(":");
}

function categoryForSettlementKind(kind: MarriageSettlementKindV1): MarriageSettlementCategoryV1 {
  return kind === "dowry" ? "marriage.dowry_settlement" : "marriage.dower_settlement";
}

function rulePrefixForSettlementKind(kind: MarriageSettlementKindV1): string {
  return kind === "dowry" ? "marriage.dowry_settlement" : "marriage.dower_settlement";
}

function normalizedRequestedDeltaByAsset(
  value: Partial<Record<MarriageSettlementAssetV1, number>> | null | undefined
): Record<MarriageSettlementAssetV1, number> {
  return {
    coin: normalizeInteger(value?.coin ?? 0),
    food_stores: normalizeInteger(value?.food_stores ?? 0),
    meat_stores: normalizeInteger(value?.meat_stores ?? 0)
  };
}

function assetLabel(asset: MarriageSettlementAssetV1): string {
  switch (asset) {
    case "coin":
      return "coin";
    case "food_stores":
      return "food stores";
    case "meat_stores":
      return "meat stores";
  }
}

function summaryForDelta(
  settlementKind: MarriageSettlementKindV1,
  asset: MarriageSettlementAssetV1,
  delta: number,
  counterpartyLabel: string
): string {
  const assetName = assetLabel(asset);
  const title = settlementKind === "dowry" ? "Dowry" : "Dower";
  if (delta < 0) return `${title} placeholder transferred ${assetName} to ${counterpartyLabel}.`;
  if (delta > 0) return `${title} placeholder recorded ${assetName} from ${counterpartyLabel}.`;
  return `${title} placeholder kept ${assetName} unchanged for ${counterpartyLabel}.`;
}

function applyDeltaForAsset(
  state: RunState,
  asset: MarriageSettlementAssetV1,
  delta: number,
  scaffold: MarriageSettlementScaffoldV1
): number {
  const ruleId = `${scaffold.rule_prefix}.${asset}`;
  const receiptContext = {
    phase: scaffold.phase,
    phase_sequence: scaffold.phase_sequence,
    category: scaffold.category,
    counterparty_kind: scaffold.counterparty_kind,
    counterparty_id: scaffold.counterparty_id,
    counterparty_label: scaffold.counterparty_label,
    summary: summaryForDelta(scaffold.settlement_kind, asset, delta, scaffold.counterparty_label),
    rule_id: ruleId,
    related_actor_ids: scaffold.related_actor_ids
  } as const;

  if (delta < 0) {
    const requested = Math.abs(delta);
    const paid =
      asset === "coin"
        ? spendCoin(state, requested, receiptContext)
        : asset === "food_stores"
          ? spendFoodStores(state, requested, receiptContext)
          : spendMeatStores(state, requested, receiptContext);
    return -paid;
  }

  if (delta > 0) {
    return asset === "coin"
      ? applyCoinDelta(state, delta, receiptContext)
      : asset === "food_stores"
        ? applyFoodStoreDelta(state, delta, receiptContext)
        : applyMeatStoreDelta(state, delta, receiptContext);
  }

  return 0;
}

export function makeMarriageSettlementScaffold(
  input: MarriageSettlementScaffoldInputV1
): MarriageSettlementScaffoldV1 {
  const subjectPersonId =
    typeof input.subject_person_id === "string" && input.subject_person_id.length > 0 ? input.subject_person_id : null;
  const candidatePersonId =
    typeof input.candidate_person_id === "string" && input.candidate_person_id.length > 0 ? input.candidate_person_id : null;
  const relatedActorIds = canonicalRelatedActorIds([
    ...(input.related_actor_ids ?? []),
    ...(subjectPersonId ? [subjectPersonId] : []),
    ...(candidatePersonId ? [candidatePersonId] : [])
  ]);

  return {
    schema_version: MARRIAGE_SETTLEMENT_SCAFFOLD_SCHEMA_VERSION,
    scaffold_id: normalizedScaffoldId({
      ...input,
      subject_person_id: subjectPersonId,
      candidate_person_id: candidatePersonId
    }),
    phase: input.phase,
    phase_sequence: normalizeInteger(input.phase_sequence),
    settlement_kind: input.settlement_kind,
    category: categoryForSettlementKind(input.settlement_kind),
    counterparty_kind: "household",
    counterparty_id: input.counterparty_id,
    counterparty_label: input.counterparty_label,
    subject_person_id: subjectPersonId,
    candidate_person_id: candidatePersonId,
    asset_order: [...MARRIAGE_SETTLEMENT_ASSET_ORDER],
    requested_delta_by_asset: normalizedRequestedDeltaByAsset(input.requested_delta_by_asset),
    rule_prefix: rulePrefixForSettlementKind(input.settlement_kind),
    related_actor_ids: relatedActorIds
  };
}

export function applyMarriageSettlementScaffold(
  state: RunState,
  scaffold: MarriageSettlementScaffoldV1
): MarriageSettlementApplyResultV1 {
  const receiptsBefore = readLedgerReceiptSnapshots(state).length;
  const appliedByAsset = Object.fromEntries(
    MARRIAGE_SETTLEMENT_ASSET_ORDER.map((asset) => {
      const requestedDelta = normalizeInteger(scaffold.requested_delta_by_asset[asset] ?? 0);
      const appliedDelta = applyDeltaForAsset(state, asset, requestedDelta, scaffold);
      const shortfallAmount =
        requestedDelta < 0 ? Math.max(0, Math.abs(requestedDelta) - Math.abs(appliedDelta)) : Math.max(0, requestedDelta - appliedDelta);

      return [
        asset,
        {
          asset,
          requested_delta: requestedDelta,
          applied_delta: appliedDelta,
          shortfall_amount: shortfallAmount,
          rule_id: `${scaffold.rule_prefix}.${asset}`
        } satisfies MarriageSettlementApplyEntryResultV1
      ];
    })
  ) as Record<MarriageSettlementAssetV1, MarriageSettlementApplyEntryResultV1>;

  return {
    schema_version: MARRIAGE_SETTLEMENT_APPLY_RESULT_SCHEMA_VERSION,
    scaffold,
    asset_order: [...MARRIAGE_SETTLEMENT_ASSET_ORDER],
    applied_by_asset: appliedByAsset,
    receipt_snapshots: readLedgerReceiptSnapshots(state).slice(receiptsBefore)
  };
}
