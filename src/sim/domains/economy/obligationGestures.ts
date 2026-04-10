import type { PhaseNameV0, RunState } from "../../types";
import { buildCourtDelegationView } from "../court/delegationRegistry";
import { ensureCourtDecisionBudgetRegistry } from "../court/decisionBudget";
import { applyRelationshipDelta, readRelationshipVector, type RelationshipDelta } from "../people/relationshipEngine";
import { readLedgerReceiptSnapshots, type TrackedStoreAsset } from "./ledger";
import type { FiscalReceiptSnapshotV1 } from "./receipts";
import { isPaymentModeAccepted, type FiscalPaymentModeV1 } from "./schema";
import {
  applyFiscalSettlementScaffoldWithResult,
  makeFiscalSettlementScaffold,
  type FiscalSettlementApplyResultV1,
  type FiscalSettlementScaffoldV1
} from "./storeReceiptWriters";

export const ECONOMY_OBLIGATION_GESTURE_ACTIONS = [
  "gift_liege",
  "offering_church"
] as const;

export const ECONOMY_FISCAL_RECEIPT_OUTCOME_CATEGORIES = [
  "obligation.church_settlement",
  "obligation.liege_settlement",
  "obligation.extraordinary_levy",
  "obligation.arrears_carry",
  "offering.church",
  "gift.liege",
  "enforcement.penalty",
  "enforcement.seizure",
  "enforcement.forced_payment_stores"
] as const;

export type EconomyObligationGestureActionV1 = typeof ECONOMY_OBLIGATION_GESTURE_ACTIONS[number];

export interface EconomyObligationGestureDecisionV1 {
  amount: number;
  payment_mode: FiscalPaymentModeV1;
}

export interface EconomyObligationGestureResolutionInputV1 {
  phase: PhaseNameV0;
  phase_sequence: number;
  gesture_action: EconomyObligationGestureActionV1;
  decision: EconomyObligationGestureDecisionV1;
  related_actor_ids?: readonly string[];
}

export interface EconomyObligationGestureResolutionResultV1 {
  gesture_action: EconomyObligationGestureActionV1;
  contract_id: "liege_gift" | "church_offering";
  counterparty_kind: "liege" | "church";
  counterparty_id: string;
  counterparty_label: string;
  requested_amount: number;
  selected_payment_mode: FiscalPaymentModeV1;
  paid_amount: number;
  applied: boolean;
  blocked_reason:
    | "applied"
    | "zero_requested_amount"
    | "unsupported_payment_mode"
    | "budget_exhausted"
    | "insufficient_payment_asset";
  scaffold: FiscalSettlementScaffoldV1 | null;
  receipt_snapshots: FiscalReceiptSnapshotV1[];
  relationship_delta_applied: RelationshipDelta | null;
  relationship_after: {
    allegiance: number;
    respect: number;
    threat: number;
  } | null;
}

interface EconomyObligationGestureSpecV1 {
  contract_id: "liege_gift" | "church_offering";
  counterparty_kind: "liege" | "church";
  counterparty_ref: (state: RunState) => { counterparty_id: string; counterparty_label: string };
  relationship_delta: RelationshipDelta;
  rule_id: string;
}

const GESTURE_SPECS: Record<EconomyObligationGestureActionV1, EconomyObligationGestureSpecV1> = {
  gift_liege: {
    contract_id: "liege_gift",
    counterparty_kind: "liege",
    counterparty_ref: (state) => ({
      counterparty_id: state.locals.liege.id,
      counterparty_label: state.locals.liege.name
    }),
    relationship_delta: { respect: 1, threat: -1 },
    rule_id: "obligations.gesture.liege_gift"
  },
  offering_church: {
    contract_id: "church_offering",
    counterparty_kind: "church",
    counterparty_ref: (state) => ({
      counterparty_id: state.locals.clergy.id,
      counterparty_label: state.locals.clergy.name
    }),
    relationship_delta: { respect: 1, threat: -1 },
    rule_id: "obligations.gesture.church_offering"
  }
};

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

function isOutcomeCategory(category: string): category is (typeof ECONOMY_FISCAL_RECEIPT_OUTCOME_CATEGORIES)[number] {
  return (ECONOMY_FISCAL_RECEIPT_OUTCOME_CATEGORIES as readonly string[]).includes(category);
}

export function buildEconomyFiscalReceiptSnapshots(state: RunState): FiscalReceiptSnapshotV1[] {
  return readLedgerReceiptSnapshots(state).filter((receipt) => isOutcomeCategory(receipt.category));
}

export function syncEconomyFiscalReceiptSnapshots(state: RunState): FiscalReceiptSnapshotV1[] {
  const snapshots = buildEconomyFiscalReceiptSnapshots(state);
  state.economy_fiscal_receipts = snapshots;
  return snapshots;
}

function noteScaffoldActors(
  state: RunState,
  counterpartyId: string,
  relatedActorIds: readonly string[]
): string[] {
  return canonicalRelatedActorIds([state.house.head.id, counterpartyId, ...relatedActorIds]);
}

function readNewReceipts(state: RunState, beforeLength: number): FiscalReceiptSnapshotV1[] {
  return readLedgerReceiptSnapshots(state).slice(beforeLength);
}

export function resolveEconomyObligationGesture(
  state: RunState,
  input: EconomyObligationGestureResolutionInputV1
): EconomyObligationGestureResolutionResultV1 {
  const spec = GESTURE_SPECS[input.gesture_action];
  const counterparty = spec.counterparty_ref(state);
  const requestedAmount = Math.max(0, normalizeInteger(input.decision.amount));
  const selectedPaymentMode = input.decision.payment_mode;
  const receiptsBefore = readLedgerReceiptSnapshots(state).length;

  if (requestedAmount <= 0) {
    syncEconomyFiscalReceiptSnapshots(state);
    return {
      gesture_action: input.gesture_action,
      contract_id: spec.contract_id,
      counterparty_kind: spec.counterparty_kind,
      counterparty_id: counterparty.counterparty_id,
      counterparty_label: counterparty.counterparty_label,
      requested_amount: requestedAmount,
      selected_payment_mode: selectedPaymentMode,
      paid_amount: 0,
      applied: false,
      blocked_reason: "zero_requested_amount",
      scaffold: null,
      receipt_snapshots: [],
      relationship_delta_applied: null,
      relationship_after: null
    };
  }

  if (!isPaymentModeAccepted(spec.contract_id, selectedPaymentMode)) {
    syncEconomyFiscalReceiptSnapshots(state);
    return {
      gesture_action: input.gesture_action,
      contract_id: spec.contract_id,
      counterparty_kind: spec.counterparty_kind,
      counterparty_id: counterparty.counterparty_id,
      counterparty_label: counterparty.counterparty_label,
      requested_amount: requestedAmount,
      selected_payment_mode: selectedPaymentMode,
      paid_amount: 0,
      applied: false,
      blocked_reason: "unsupported_payment_mode",
      scaffold: null,
      receipt_snapshots: [],
      relationship_delta_applied: null,
      relationship_after: null
    };
  }

  const scaffold = makeFiscalSettlementScaffold({
    phase: input.phase,
    phase_sequence: input.phase_sequence,
    contract_id: spec.contract_id,
    counterparty_id: counterparty.counterparty_id,
    counterparty_label: counterparty.counterparty_label,
    selected_payment_mode: selectedPaymentMode,
    amount: requestedAmount,
    rule_id: spec.rule_id,
    related_actor_ids: noteScaffoldActors(state, counterparty.counterparty_id, input.related_actor_ids ?? [])
  });

  const settlement = applyFiscalSettlementScaffoldWithResult(state, scaffold);
  let relationshipAfter: EconomyObligationGestureResolutionResultV1["relationship_after"] = null;
  let relationshipDeltaApplied: RelationshipDelta | null = null;

  if (settlement.applied && settlement.paid_amount > 0) {
    relationshipDeltaApplied = spec.relationship_delta;
    const edge = applyRelationshipDelta(
      state,
      counterparty.counterparty_id,
      state.house.head.id,
      relationshipDeltaApplied,
      spec.rule_id
    );
    relationshipAfter = {
      allegiance: edge.allegiance,
      respect: edge.respect,
      threat: edge.threat
    };
  }

  syncEconomyFiscalReceiptSnapshots(state);

  return {
    gesture_action: input.gesture_action,
    contract_id: spec.contract_id,
    counterparty_kind: spec.counterparty_kind,
    counterparty_id: counterparty.counterparty_id,
    counterparty_label: counterparty.counterparty_label,
    requested_amount: requestedAmount,
    selected_payment_mode: selectedPaymentMode,
    paid_amount: settlement.paid_amount,
    applied: settlement.applied,
    blocked_reason: settlement.reason,
    scaffold: settlement.scaffold,
    receipt_snapshots: readNewReceipts(state, receiptsBefore),
    relationship_delta_applied: relationshipDeltaApplied,
    relationship_after: relationshipAfter
  };
}

export function readEconomyObligationGestureRelationshipBefore(
  state: RunState,
  gestureAction: EconomyObligationGestureActionV1
): { allegiance: number; respect: number; threat: number } {
  const spec = GESTURE_SPECS[gestureAction];
  const counterparty = spec.counterparty_ref(state);
  return readRelationshipVector(state, counterparty.counterparty_id, state.house.head.id);
}

export function readEconomyGestureBudgetState(state: RunState) {
  return ensureCourtDecisionBudgetRegistry(state);
}

export function readEconomyGestureDelegationView(state: RunState) {
  return buildCourtDelegationView(state);
}
