import type {
  EconomyObligationArrearsAssetV1,
  EconomyObligationCounterpartyEntryV1,
  EconomyObligationCounterpartyKindV1,
  EconomyObligationDueAssetV1,
  EconomyObligationRegistryV1
} from "../economy/obligationRegistry";
import { buildEconomyObligationRegistryFromState } from "../economy/obligationRegistry";
import {
  ECONOMY_OBLIGATION_PENALTY_STAGE,
  type EconomyObligationPenaltyStageEntryV1,
  buildEconomyObligationPenaltyStageFromState
} from "../economy/obligationEnforcement";
import type { FiscalPaymentModeV1 } from "../economy/schema";
import type { RunState } from "../../types";

export const ECONOMY_OBLIGATIONS_VIEW_SCHEMA_VERSION = "economy_obligations_view_v1" as const;
export const ECONOMY_OBLIGATIONS_VIEW_COUNTERPARTY_ORDER = ["liege", "church"] as const;

export type EconomyObligationsViewSettlementStatusV1 = "clear" | "due_only" | "arrears_only" | "due_and_arrears";
export type EconomyObligationsViewEnforcementStateV1 = "clear" | "arrears";

export interface EconomyObligationsViewCounterpartySummaryV1 {
  schema_version: typeof ECONOMY_OBLIGATIONS_VIEW_SCHEMA_VERSION;
  counterparty_kind: EconomyObligationCounterpartyKindV1;
  counterparty_id: string;
  counterparty_label: string;
  contract_id: EconomyObligationCounterpartyEntryV1["contract_id"];
  due_asset: EconomyObligationDueAssetV1;
  due_amount: number;
  arrears_asset: EconomyObligationArrearsAssetV1;
  arrears_amount: number;
  total_outstanding: number;
  accepted_payment_modes: FiscalPaymentModeV1[];
  supported_payment_modes: FiscalPaymentModeV1[];
  preferred_payment_mode: FiscalPaymentModeV1;
  settled_this_turn: boolean;
  carried_this_turn: boolean;
  settlement_status: EconomyObligationsViewSettlementStatusV1;
  settlement_summary: string;
  enforcement_stage: typeof ECONOMY_OBLIGATION_PENALTY_STAGE;
  enforcement_state: EconomyObligationsViewEnforcementStateV1;
  enforcement_rule_id: string;
  enforcement_summary: string;
  relationship_delta: {
    respect: number;
    threat: number;
  };
}

export interface EconomyObligationsViewV1 {
  schema_version: typeof ECONOMY_OBLIGATIONS_VIEW_SCHEMA_VERSION;
  turn: number;
  shortage_active: boolean;
  stable_unrest_delta: number;
  stable_unrest_rule_id: string | null;
  stable_unrest_summary: string | null;
  total_due: {
    coin: number;
    bushels: number;
  };
  total_arrears: {
    coin: number;
    bushels: number;
  };
  counterparty_order: EconomyObligationCounterpartyKindV1[];
  counterparty_summaries: EconomyObligationsViewCounterpartySummaryV1[];
}

function normalizeInteger(value: number): number {
  return Math.trunc(value);
}

function amountLabel(amount: number, asset: EconomyObligationDueAssetV1 | EconomyObligationArrearsAssetV1): string {
  if (asset === "tax_due_coin" || asset === "arrears_coin") {
    return `${amount} coin`;
  }
  return `${amount} ${amount === 1 ? "bushel" : "bushels"}`;
}

function settlementStatus(entry: EconomyObligationCounterpartyEntryV1): EconomyObligationsViewSettlementStatusV1 {
  const hasDue = entry.due_amount > 0;
  const hasArrears = entry.arrears_amount > 0;

  if (hasDue && hasArrears) return "due_and_arrears";
  if (hasDue) return "due_only";
  if (hasArrears) return "arrears_only";
  return "clear";
}

function settlementSummary(entry: EconomyObligationCounterpartyEntryV1): string {
  if (entry.arrears_amount > 0 && entry.due_amount > 0) {
    return `${entry.counterparty_label}: ${amountLabel(entry.arrears_amount, entry.arrears_asset)} in arrears, ${amountLabel(entry.due_amount, entry.due_asset)} due.`;
  }
  if (entry.arrears_amount > 0) {
    return `${entry.counterparty_label}: ${amountLabel(entry.arrears_amount, entry.arrears_asset)} in arrears.`;
  }
  if (entry.due_amount > 0) {
    return `${entry.counterparty_label}: ${amountLabel(entry.due_amount, entry.due_asset)} due.`;
  }
  return `${entry.counterparty_label}: clear.`;
}

function buildCounterpartySummary(
  turn: number,
  registry: EconomyObligationRegistryV1,
  penaltyByKind: Record<EconomyObligationCounterpartyKindV1, EconomyObligationPenaltyStageEntryV1>,
  counterpartyKind: EconomyObligationCounterpartyKindV1
): EconomyObligationsViewCounterpartySummaryV1 {
  const entry = registry.counterparties_by_key[counterpartyKind];
  const penalty = penaltyByKind[counterpartyKind];

  return {
    schema_version: ECONOMY_OBLIGATIONS_VIEW_SCHEMA_VERSION,
    counterparty_kind: counterpartyKind,
    counterparty_id: entry.counterparty_id,
    counterparty_label: entry.counterparty_label,
    contract_id: entry.contract_id,
    due_asset: entry.due_asset,
    due_amount: entry.due_amount,
    arrears_asset: entry.arrears_asset,
    arrears_amount: entry.arrears_amount,
    total_outstanding: entry.due_amount + entry.arrears_amount,
    accepted_payment_modes: [...entry.accepted_payment_modes],
    supported_payment_modes: [...entry.supported_payment_modes],
    preferred_payment_mode: entry.preferred_payment_mode,
    settled_this_turn: entry.last_settled_turn_index === turn,
    carried_this_turn: entry.last_carried_turn_index === turn,
    settlement_status: settlementStatus(entry),
    settlement_summary: settlementSummary(entry),
    enforcement_stage: penalty.stage,
    enforcement_state: penalty.arrears_amount > 0 ? "arrears" : "clear",
    enforcement_rule_id: penalty.rule_id,
    enforcement_summary: penalty.summary,
    relationship_delta: {
      respect: penalty.relationship_delta.respect,
      threat: penalty.relationship_delta.threat
    }
  };
}

function totalForAsset(
  registry: EconomyObligationRegistryV1,
  assetKey: "due_asset" | "arrears_asset",
  assetValue: EconomyObligationDueAssetV1 | EconomyObligationArrearsAssetV1,
  amountKey: "due_amount" | "arrears_amount"
): number {
  let total = 0;
  for (const counterpartyKind of registry.counterparty_keys) {
    const entry = registry.counterparties_by_key[counterpartyKind];
    if (entry[assetKey] === assetValue) {
      total += entry[amountKey];
    }
  }
  return normalizeInteger(total);
}

export function buildEconomyObligationsView(state: RunState): EconomyObligationsViewV1 {
  const registry = buildEconomyObligationRegistryFromState(state);
  const penaltyStage = buildEconomyObligationPenaltyStageFromState(state);
  const turn = normalizeInteger(state.turn_index);
  const penaltyByKind = Object.fromEntries(
    penaltyStage.entries.map((entry) => [entry.counterparty_kind, entry])
  ) as Record<EconomyObligationCounterpartyKindV1, EconomyObligationPenaltyStageEntryV1>;
  const counterpartyOrder = [...ECONOMY_OBLIGATIONS_VIEW_COUNTERPARTY_ORDER];

  return {
    schema_version: ECONOMY_OBLIGATIONS_VIEW_SCHEMA_VERSION,
    turn,
    shortage_active: penaltyStage.shortage_active,
    stable_unrest_delta: penaltyStage.stable_unrest_delta,
    stable_unrest_rule_id: penaltyStage.stable_unrest_rule_id,
    stable_unrest_summary: penaltyStage.stable_unrest_summary,
    total_due: {
      coin: totalForAsset(registry, "due_asset", "tax_due_coin", "due_amount"),
      bushels: totalForAsset(registry, "due_asset", "tithe_due_bushels", "due_amount")
    },
    total_arrears: {
      coin: totalForAsset(registry, "arrears_asset", "arrears_coin", "arrears_amount"),
      bushels: totalForAsset(registry, "arrears_asset", "arrears_bushels", "arrears_amount")
    },
    counterparty_order: counterpartyOrder,
    counterparty_summaries: counterpartyOrder.map((counterpartyKind) =>
      buildCounterpartySummary(turn, registry, penaltyByKind, counterpartyKind)
    )
  };
}

export function serializeEconomyObligationsView(state: RunState): string {
  return JSON.stringify(buildEconomyObligationsView(state));
}
