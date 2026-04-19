import type {
  EconomyObligationArrearsAssetV1,
  EconomyObligationCounterpartyEntryV1,
  EconomyObligationCounterpartyKindV1,
  EconomyObligationDueAssetV1,
  EconomyObligationRegistryV1
} from "../economy/obligationRegistry";
import { buildEconomyObligationRegistryFromState } from "../economy/obligationRegistry";
import type {
  EconomyObligationCollectorActorKindV1,
  EconomyObligationCollectorStateV1
} from "../people/obligationCollectorResolution";
import {
  type EconomyObligationPenaltyStageEntryV1,
  buildEconomyObligationPenaltyStageFromState
} from "../economy/obligationEnforcement";
import {
  buildEconomyObligationTangibleBitePreviewFromState,
  type EconomyObligationTangibleBitePreviewV1
} from "../economy/obligationTangibleBite";
import { readLedgerReceiptSnapshots } from "../economy/ledger";
import type { FiscalReceiptSnapshotV1 } from "../economy/receipts";
import type { FiscalPaymentModeV1 } from "../economy/schema";
import type { GameOverState, RunState } from "../../types";

export const ECONOMY_OBLIGATIONS_VIEW_SCHEMA_VERSION = "economy_obligations_view_v2" as const;
export const ECONOMY_OBLIGATIONS_VIEW_COUNTERPARTY_ORDER = ["liege", "church"] as const;
export const ECONOMY_OBLIGATIONS_VIEW_RECEIPT_ROW_SCHEMA_VERSION = "economy_obligations_view_receipt_row_v1" as const;
export const ECONOMY_OBLIGATIONS_VIEW_RECEIPT_GROUP_SCHEMA_VERSION = "economy_obligations_view_receipt_group_v1" as const;
export const ECONOMY_OBLIGATIONS_VIEW_TRIGGER_SCHEMA_VERSION = "economy_obligations_view_trigger_v1" as const;
export const ECONOMY_OBLIGATIONS_VIEW_TERMINAL_RISK_SCHEMA_VERSION = "economy_obligations_view_terminal_risk_v1" as const;
export const ECONOMY_OBLIGATIONS_VIEW_RECEIPT_GROUP_ORDER = ["payment", "penalty", "seizure"] as const;

export type EconomyObligationsViewSettlementStatusV1 = "clear" | "due_only" | "arrears_only" | "due_and_arrears";
export type EconomyObligationsViewEnforcementStateV1 = "clear" | "arrears";
export type EconomyObligationsViewReceiptGroupKindV1 = typeof ECONOMY_OBLIGATIONS_VIEW_RECEIPT_GROUP_ORDER[number];
export type EconomyObligationsViewTriggerKindV1 = "arrears_persist";
export type EconomyObligationsViewStageLabelV1 = "tangible_bite" | "dispossession_danger";

export interface EconomyObligationsViewReceiptRowV1 {
  schema_version: typeof ECONOMY_OBLIGATIONS_VIEW_RECEIPT_ROW_SCHEMA_VERSION;
  receipt_id: string;
  category: string;
  asset: string;
  delta: number;
  balance_after: number;
  summary: string;
  rule_id: string;
}

export interface EconomyObligationsViewReceiptGroupV1 {
  schema_version: typeof ECONOMY_OBLIGATIONS_VIEW_RECEIPT_GROUP_SCHEMA_VERSION;
  group_kind: EconomyObligationsViewReceiptGroupKindV1;
  label: string;
  category_order: string[];
  receipt_count: number;
  receipts: EconomyObligationsViewReceiptRowV1[];
}

export interface EconomyObligationsViewStageTriggerV1 {
  schema_version: typeof ECONOMY_OBLIGATIONS_VIEW_TRIGGER_SCHEMA_VERSION;
  current_stage: number;
  next_stage: 2 | 3;
  next_stage_label: EconomyObligationsViewStageLabelV1;
  trigger_kind: EconomyObligationsViewTriggerKindV1;
  trigger_source_path: string;
  trigger_threshold: number;
  current_value: number;
  armed: boolean;
  rule_id: string;
  summary: string;
}

export interface EconomyObligationsViewTerminalRiskV1 {
  schema_version: typeof ECONOMY_OBLIGATIONS_VIEW_TERMINAL_RISK_SCHEMA_VERSION;
  stage: 3;
  stage_label: "dispossession_danger";
  armed: boolean;
  active: boolean;
  game_over_reason: GameOverState["reason"];
  trigger_source_path: "manor.unrest";
  trigger_threshold: 100;
  current_value: number;
  remaining_to_threshold: number;
  rule_id: string;
  summary: string;
}

export interface EconomyObligationsViewCounterpartySummaryV1 {
  schema_version: typeof ECONOMY_OBLIGATIONS_VIEW_SCHEMA_VERSION;
  counterparty_kind: EconomyObligationCounterpartyKindV1;
  counterparty_id: string;
  counterparty_label: string;
  counterparty_actor_kind: EconomyObligationCollectorActorKindV1;
  collector_state: EconomyObligationCollectorStateV1;
  collector_successor_label: string | null;
  collector_summary: string;
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
  enforcement_stage: number;
  enforcement_state: EconomyObligationsViewEnforcementStateV1;
  enforcement_rule_id: string;
  enforcement_summary: string;
  next_stage_trigger: EconomyObligationsViewStageTriggerV1 | null;
  terminal_risk: EconomyObligationsViewTerminalRiskV1;
  tangible_bite_preview: EconomyObligationTangibleBitePreviewV1 | null;
  receipt_group_order: EconomyObligationsViewReceiptGroupKindV1[];
  receipt_groups: EconomyObligationsViewReceiptGroupV1[];
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
  receipt_group_order: EconomyObligationsViewReceiptGroupKindV1[];
  counterparty_summaries: EconomyObligationsViewCounterpartySummaryV1[];
}

const RECEIPT_GROUP_META = {
  payment: {
    label: "Payments",
    category_order: [
      "obligation.liege_settlement",
      "obligation.church_settlement",
      "obligation.extraordinary_levy",
      "gift.liege",
      "offering.church"
    ]
  },
  penalty: {
    label: "Penalty trail",
    category_order: [
      "obligation.arrears_carry",
      "enforcement.penalty"
    ]
  },
  seizure: {
    label: "Seizures & forced payment",
    category_order: [
      "enforcement.seizure",
      "enforcement.forced_payment_stores"
    ]
  }
} as const satisfies Record<
  EconomyObligationsViewReceiptGroupKindV1,
  { label: string; category_order: string[] }
>;

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

function receiptGroupKind(category: string): EconomyObligationsViewReceiptGroupKindV1 | null {
  for (const groupKind of ECONOMY_OBLIGATIONS_VIEW_RECEIPT_GROUP_ORDER) {
    if ((RECEIPT_GROUP_META[groupKind].category_order as readonly string[]).includes(category)) return groupKind;
  }
  return null;
}

function obligationReceiptPool(state: RunState, turn: number): FiscalReceiptSnapshotV1[] {
  const source = [
    ...(Array.isArray(state.economy_fiscal_receipts) ? state.economy_fiscal_receipts : []),
    ...readLedgerReceiptSnapshots(state)
  ];
  const dedupedByReceiptId = new Map<string, FiscalReceiptSnapshotV1>();

  for (const receipt of source) {
    if (!receipt || typeof receipt.receipt_id !== "string") continue;
    dedupedByReceiptId.set(receipt.receipt_id, receipt);
  }

  return [...dedupedByReceiptId.values()].filter((receipt) => {
    return (
      receipt.turn === turn &&
      (receipt.counterparty_kind === "liege" || receipt.counterparty_kind === "church") &&
      receiptGroupKind(receipt.category) !== null
    );
  });
}

function receiptRow(receipt: FiscalReceiptSnapshotV1): EconomyObligationsViewReceiptRowV1 {
  return {
    schema_version: ECONOMY_OBLIGATIONS_VIEW_RECEIPT_ROW_SCHEMA_VERSION,
    receipt_id: receipt.receipt_id,
    category: receipt.category,
    asset: receipt.asset,
    delta: normalizeInteger(receipt.delta),
    balance_after: normalizeInteger(receipt.balance_after),
    summary: receipt.summary,
    rule_id: receipt.rule_id
  };
}

function buildReceiptGroups(
  receipts: readonly FiscalReceiptSnapshotV1[],
  counterpartyKind: EconomyObligationCounterpartyKindV1
): EconomyObligationsViewReceiptGroupV1[] {
  return ECONOMY_OBLIGATIONS_VIEW_RECEIPT_GROUP_ORDER.map((groupKind) => {
    const rows = receipts
      .filter((receipt) => receipt.counterparty_kind === counterpartyKind && receiptGroupKind(receipt.category) === groupKind)
      .map((receipt) => receiptRow(receipt));

    return {
      schema_version: ECONOMY_OBLIGATIONS_VIEW_RECEIPT_GROUP_SCHEMA_VERSION,
      group_kind: groupKind,
      label: RECEIPT_GROUP_META[groupKind].label,
      category_order: [...RECEIPT_GROUP_META[groupKind].category_order],
      receipt_count: rows.length,
      receipts: rows
    };
  });
}

function arrearsSourcePath(entry: EconomyObligationCounterpartyEntryV1): string {
  return entry.arrears_asset === "arrears_coin"
    ? "manor.obligations.arrears.coin"
    : "manor.obligations.arrears.bushels";
}

function derivedEnforcementStage(
  state: RunState,
  entry: EconomyObligationCounterpartyEntryV1,
  penalty: EconomyObligationPenaltyStageEntryV1,
  receiptGroups: readonly EconomyObligationsViewReceiptGroupV1[]
): number {
  const seizureGroup = receiptGroups.find((group) => group.group_kind === "seizure");
  if (entry.arrears_amount > 0 && (state.game_over?.reason === "Dispossessed" || state.manor.unrest >= 100)) {
    return 3;
  }
  if ((seizureGroup?.receipt_count ?? 0) > 0) {
    return 2;
  }
  return penalty.stage;
}

function derivedEnforcementRuleId(
  state: RunState,
  entry: EconomyObligationCounterpartyEntryV1,
  penalty: EconomyObligationPenaltyStageEntryV1,
  stage: number
): string {
  if (stage >= 3 && entry.arrears_amount > 0 && (state.game_over?.reason === "Dispossessed" || state.manor.unrest >= 100)) {
    return `enforcement.dispossession.stage_three.${entry.counterparty_kind}`;
  }
  if (stage >= 2 && entry.arrears_amount > 0) {
    return `enforcement.tangible_bite.stage_two.${entry.counterparty_kind}`;
  }
  return penalty.rule_id;
}

function derivedEnforcementSummary(
  state: RunState,
  entry: EconomyObligationCounterpartyEntryV1,
  penalty: EconomyObligationPenaltyStageEntryV1,
  stage: number
): string {
  if (stage >= 3 && entry.arrears_amount > 0 && (state.game_over?.reason === "Dispossessed" || state.manor.unrest >= 100)) {
    return `Stage-three dispossession danger is active for ${entry.counterparty_label}; unrest is ${normalizeInteger(state.manor.unrest)}/100 while arrears remain open.`;
  }
  if (stage >= 2 && entry.arrears_amount > 0) {
    return `Stage-two tangible bite is active for ${entry.counterparty_label}; forced collection receipts are already landing against open arrears.`;
  }
  return penalty.summary;
}

function nextStageTrigger(
  entry: EconomyObligationCounterpartyEntryV1,
  stage: number
): EconomyObligationsViewStageTriggerV1 | null {
  if (entry.arrears_amount <= 0 || stage >= 3) return null;

  const nextStage = stage >= 2 ? 3 : 2;
  const nextStageLabel = nextStage === 2 ? "tangible_bite" : "dispossession_danger";

  return {
    schema_version: ECONOMY_OBLIGATIONS_VIEW_TRIGGER_SCHEMA_VERSION,
    current_stage: stage,
    next_stage: nextStage,
    next_stage_label: nextStageLabel,
    trigger_kind: "arrears_persist",
    trigger_source_path: arrearsSourcePath(entry),
    trigger_threshold: 1,
    current_value: normalizeInteger(entry.arrears_amount),
    armed: entry.arrears_amount > 0,
    rule_id: `enforcement.trigger.${nextStageLabel}.${entry.counterparty_kind}`,
    summary:
      nextStage === 2
        ? `If ${entry.counterparty_label} arrears remain open into the next collection step, stage-two tangible bite can start.`
        : `If ${entry.counterparty_label} arrears remain open after stage-two collections, stage-three dispossession danger can start.`
  };
}

function terminalRisk(
  state: RunState,
  entry: EconomyObligationCounterpartyEntryV1,
  stage: number
): EconomyObligationsViewTerminalRiskV1 {
  const currentValue = normalizeInteger(state.manor.unrest);
  const active = entry.arrears_amount > 0 && stage >= 3;

  return {
    schema_version: ECONOMY_OBLIGATIONS_VIEW_TERMINAL_RISK_SCHEMA_VERSION,
    stage: 3,
    stage_label: "dispossession_danger",
    armed: entry.arrears_amount > 0,
    active,
    game_over_reason: "Dispossessed",
    trigger_source_path: "manor.unrest",
    trigger_threshold: 100,
    current_value: currentValue,
    remaining_to_threshold: Math.max(0, 100 - currentValue),
    rule_id: "succession.dispossession.unrest_threshold",
    summary: active
      ? `Dispossession danger is active while ${entry.counterparty_label} arrears remain open; unrest is ${currentValue}/100.`
      : `Dispossession occurs if unrest reaches 100 at end of turn; current unrest is ${currentValue}.`
  };
}

function buildCounterpartySummary(
  state: RunState,
  turn: number,
  registry: EconomyObligationRegistryV1,
  penaltyByKind: Record<EconomyObligationCounterpartyKindV1, EconomyObligationPenaltyStageEntryV1>,
  obligationReceipts: readonly FiscalReceiptSnapshotV1[],
  counterpartyKind: EconomyObligationCounterpartyKindV1
): EconomyObligationsViewCounterpartySummaryV1 {
  const entry = registry.counterparties_by_key[counterpartyKind];
  const penalty = penaltyByKind[counterpartyKind];
  const receiptGroups = buildReceiptGroups(obligationReceipts, counterpartyKind);
  const enforcementStage = derivedEnforcementStage(state, entry, penalty, receiptGroups);

  return {
    schema_version: ECONOMY_OBLIGATIONS_VIEW_SCHEMA_VERSION,
    counterparty_kind: counterpartyKind,
    counterparty_id: entry.counterparty_id,
    counterparty_label: entry.counterparty_label,
    counterparty_actor_kind: entry.counterparty_actor_kind,
    collector_state: entry.collector_state,
    collector_successor_label: entry.collector_successor_label,
    collector_summary: entry.collector_summary,
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
    enforcement_stage: enforcementStage,
    enforcement_state: penalty.arrears_amount > 0 ? "arrears" : "clear",
    enforcement_rule_id: derivedEnforcementRuleId(state, entry, penalty, enforcementStage),
    enforcement_summary: derivedEnforcementSummary(state, entry, penalty, enforcementStage),
    next_stage_trigger: nextStageTrigger(entry, enforcementStage),
    terminal_risk: terminalRisk(state, entry, enforcementStage),
    tangible_bite_preview:
      entry.arrears_amount > 0 ? buildEconomyObligationTangibleBitePreviewFromState(state, counterpartyKind) : null,
    receipt_group_order: [...ECONOMY_OBLIGATIONS_VIEW_RECEIPT_GROUP_ORDER],
    receipt_groups: receiptGroups,
    relationship_delta: {
      respect: penalty.relationship_delta.respect,
      threat: penalty.relationship_delta.threat
    }
  };
}

export function buildEconomyObligationsView(state: RunState): EconomyObligationsViewV1 {
  const registry = buildEconomyObligationRegistryFromState(state);
  const penaltyStage = buildEconomyObligationPenaltyStageFromState(state);
  const turn = normalizeInteger(state.turn_index);
  const penaltyByKind = Object.fromEntries(
    penaltyStage.entries.map((entry) => [entry.counterparty_kind, entry])
  ) as Record<EconomyObligationCounterpartyKindV1, EconomyObligationPenaltyStageEntryV1>;
  const counterpartyOrder = [...ECONOMY_OBLIGATIONS_VIEW_COUNTERPARTY_ORDER];
  const obligationReceipts = obligationReceiptPool(state, turn);

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
    receipt_group_order: [...ECONOMY_OBLIGATIONS_VIEW_RECEIPT_GROUP_ORDER],
    counterparty_summaries: counterpartyOrder.map((counterpartyKind) =>
      buildCounterpartySummary(state, turn, registry, penaltyByKind, obligationReceipts, counterpartyKind)
    )
  };
}

export function serializeEconomyObligationsView(state: RunState): string {
  return JSON.stringify(buildEconomyObligationsView(state));
}
