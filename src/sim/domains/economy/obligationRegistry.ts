import type { Person, PhaseNameV0, RunState } from "../../types";
import { asNonNegInt } from "../../util";
import { makeEvidenceEvent, recordRuntimeDomainEvidence } from "../ai/evidence";
import {
  arrearsBushels,
  arrearsCoin,
  rollTaxDueCoinIntoArrears,
  rollTitheDueBushelsIntoArrears,
  spendArrearsBushels,
  spendArrearsCoin,
  spendTaxDueCoin,
  spendTitheDueBushels,
  taxDueCoin,
  titheDueBushels,
  type LedgerReceiptContextV1
} from "./ledger";
import {
  acceptedPaymentModesFor,
  toAcceptedPaymentContractSnapshot,
  type FiscalPaymentContractIdV1,
  type FiscalPaymentModeV1
} from "./schema";
import {
  applyFiscalSettlementScaffold,
  makeFiscalSettlementScaffold,
  type FiscalSettlementScaffoldV1
} from "./storeReceiptWriters";
import { economyObligationSettlementCadenceTurns } from "./tuningTable";

export const ECONOMY_OBLIGATION_REGISTRY_SCHEMA_VERSION = "economy_obligation_registry_v1" as const;
export const ECONOMY_OBLIGATION_COUNTERPARTY_KINDS = ["church", "liege"] as const;

export type EconomyObligationCounterpartyKindV1 = typeof ECONOMY_OBLIGATION_COUNTERPARTY_KINDS[number];
export type EconomyObligationDueAssetV1 = "tax_due_coin" | "tithe_due_bushels";
export type EconomyObligationArrearsAssetV1 = "arrears_coin" | "arrears_bushels";

export interface EconomyObligationCounterpartyEntryV1 {
  schema_version: typeof ECONOMY_OBLIGATION_REGISTRY_SCHEMA_VERSION;
  counterparty_kind: EconomyObligationCounterpartyKindV1;
  counterparty_id: string;
  counterparty_label: string;
  contract_id: FiscalPaymentContractIdV1;
  due_asset: EconomyObligationDueAssetV1;
  arrears_asset: EconomyObligationArrearsAssetV1;
  due_amount: number;
  arrears_amount: number;
  accepted_payment_modes: FiscalPaymentModeV1[];
  supported_payment_modes: FiscalPaymentModeV1[];
  preferred_payment_mode: FiscalPaymentModeV1;
  settlement_cadence_turns: 1;
  last_settled_turn_index: number | null;
  last_carried_turn_index: number | null;
}

export interface EconomyObligationRegistryV1 {
  schema_version: typeof ECONOMY_OBLIGATION_REGISTRY_SCHEMA_VERSION;
  turn: number;
  counterparty_keys: EconomyObligationCounterpartyKindV1[];
  counterparties_by_key: Record<EconomyObligationCounterpartyKindV1, EconomyObligationCounterpartyEntryV1>;
}

export interface EconomyObligationSettlementInputV1 {
  phase: PhaseNameV0;
  phase_sequence: number;
  counterparty_kind: EconomyObligationCounterpartyKindV1;
  requested_amount?: number;
  payment_mode?: FiscalPaymentModeV1;
  rule_id: string;
  related_actor_ids?: readonly string[];
}

export interface EconomyObligationSettlementResultV1 {
  counterparty_kind: EconomyObligationCounterpartyKindV1;
  contract_id: FiscalPaymentContractIdV1;
  selected_payment_mode: FiscalPaymentModeV1;
  requested_amount: number;
  paid_amount: number;
  paid_to_arrears: number;
  paid_to_due: number;
  blocked: boolean;
  reason:
    | "applied"
    | "already_settled_this_turn"
    | "nothing_due"
    | "zero_requested_amount"
    | "insufficient_payment_asset";
  scaffold: FiscalSettlementScaffoldV1 | null;
  registry: EconomyObligationRegistryV1;
}

export interface EconomyObligationCarryInputV1 {
  phase: PhaseNameV0;
  phase_sequence: number;
  counterparty_kind: EconomyObligationCounterpartyKindV1;
  rule_id: string;
  related_actor_ids?: readonly string[];
}

export interface EconomyObligationCarryResultV1 {
  counterparty_kind: EconomyObligationCounterpartyKindV1;
  carried_amount: number;
  blocked: boolean;
  reason: "applied" | "already_carried_this_turn" | "nothing_due";
  registry: EconomyObligationRegistryV1;
}

interface EconomyObligationRuntimeMetaV1 {
  last_settled_turn_index: number | null;
  last_carried_turn_index: number | null;
}

interface EconomyObligationRuntimeRegistryV1 {
  schema_version: typeof ECONOMY_OBLIGATION_REGISTRY_SCHEMA_VERSION;
  meta_by_counterparty: Record<EconomyObligationCounterpartyKindV1, EconomyObligationRuntimeMetaV1>;
}

interface EconomyObligationCounterpartyRefV1 {
  counterparty_id: string;
  counterparty_label: string;
}

interface EconomyObligationCounterpartySpecV1 {
  contract_id: Extract<FiscalPaymentContractIdV1, "church_due" | "liege_due">;
  due_asset: EconomyObligationDueAssetV1;
  arrears_asset: EconomyObligationArrearsAssetV1;
  supported_payment_modes: readonly FiscalPaymentModeV1[];
  counterparty_ref: (state: RunState) => EconomyObligationCounterpartyRefV1;
  due_amount: (state: RunState) => number;
  arrears_amount: (state: RunState) => number;
  spend_due: (state: RunState, amount: number, receiptContext?: LedgerReceiptContextV1) => number;
  spend_arrears: (state: RunState, amount: number, receiptContext?: LedgerReceiptContextV1) => number;
  carry_due_into_arrears: (state: RunState, input: EconomyObligationCarryInputV1) => number;
}

const runtimeRegistryByState = new WeakMap<RunState, EconomyObligationRuntimeRegistryV1>();

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeInteger(value: number): number {
  return Math.trunc(value);
}

function normalizeNonNegative(value: number): number {
  return Math.max(0, normalizeInteger(value));
}

function normalizeOptionalTurnIndex(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function canonicalRelatedActorIds(ids: readonly string[]): string[] {
  return [...ids].sort(compareText);
}

function personRef(person: Person | undefined, fallbackLabel: string): EconomyObligationCounterpartyRefV1 {
  return {
    counterparty_id: typeof person?.id === "string" && person.id.length > 0 ? person.id : fallbackLabel.toLowerCase(),
    counterparty_label:
      typeof person?.name === "string" && person.name.length > 0
        ? person.name
        : typeof person?.id === "string" && person.id.length > 0
          ? person.id
          : fallbackLabel
  };
}

function recordObligationFlowEvidence(
  state: RunState,
  kind: string,
  detail: string,
  counterpartyId: string
): void {
  recordRuntimeDomainEvidence(state, "obligations", [
    makeEvidenceEvent({
      kind,
      detail,
      category: "obligations",
      subject_ids: [state.house.head.id, counterpartyId]
    })
  ]);
}

function emptyRuntimeMeta(): EconomyObligationRuntimeMetaV1 {
  return {
    last_settled_turn_index: null,
    last_carried_turn_index: null
  };
}

function normalizeRuntimeMeta(value: unknown): EconomyObligationRuntimeMetaV1 {
  const row = value as Partial<EconomyObligationRuntimeMetaV1> | null | undefined;
  return {
    last_settled_turn_index: normalizeOptionalTurnIndex(row?.last_settled_turn_index),
    last_carried_turn_index: normalizeOptionalTurnIndex(row?.last_carried_turn_index)
  };
}

function ensureRuntimeRegistry(state: RunState): EconomyObligationRuntimeRegistryV1 {
  const existing = runtimeRegistryByState.get(state);
  if (existing) return existing;

  const created: EconomyObligationRuntimeRegistryV1 = {
    schema_version: ECONOMY_OBLIGATION_REGISTRY_SCHEMA_VERSION,
    meta_by_counterparty: {
      church: emptyRuntimeMeta(),
      liege: emptyRuntimeMeta()
    }
  };

  runtimeRegistryByState.set(state, created);
  return created;
}

function runtimeMetaFor(
  state: RunState,
  counterpartyKind: EconomyObligationCounterpartyKindV1
): EconomyObligationRuntimeMetaV1 {
  const registry = ensureRuntimeRegistry(state);
  const normalized = normalizeRuntimeMeta(registry.meta_by_counterparty[counterpartyKind]);
  registry.meta_by_counterparty[counterpartyKind] = normalized;
  return normalized;
}

const COUNTERPARTY_SPECS: Record<EconomyObligationCounterpartyKindV1, EconomyObligationCounterpartySpecV1> = {
  church: {
    contract_id: "church_due",
    due_asset: "tithe_due_bushels",
    arrears_asset: "arrears_bushels",
    supported_payment_modes: ["food_stores"],
    counterparty_ref: (state) => personRef(state.locals?.clergy, "Church"),
    due_amount: (state) => titheDueBushels(state),
    arrears_amount: (state) => arrearsBushels(state),
    spend_due: (state, amount, receiptContext) => spendTitheDueBushels(state, amount, receiptContext),
    spend_arrears: (state, amount, receiptContext) => spendArrearsBushels(state, amount, receiptContext),
    carry_due_into_arrears: (state, input) =>
      rollTitheDueBushelsIntoArrears(state, {
        debit: {
          phase: input.phase,
          phase_sequence: normalizeInteger(input.phase_sequence),
          category: "obligation.arrears_carry",
          counterparty_kind: "church",
          counterparty_id: personRef(state.locals?.clergy, "Church").counterparty_id,
          counterparty_label: personRef(state.locals?.clergy, "Church").counterparty_label,
          summary: `Moved unpaid current tithe due out of the active ledger slot for ${personRef(state.locals?.clergy, "Church").counterparty_label}.`,
          rule_id: `${input.rule_id}.debit`,
          related_actor_ids: [...(input.related_actor_ids ?? [])]
        },
        credit: {
          phase: input.phase,
          phase_sequence: normalizeInteger(input.phase_sequence),
          category: "obligation.arrears_carry",
          counterparty_kind: "church",
          counterparty_id: personRef(state.locals?.clergy, "Church").counterparty_id,
          counterparty_label: personRef(state.locals?.clergy, "Church").counterparty_label,
          summary: `Moved unpaid tithe due into arrears for ${personRef(state.locals?.clergy, "Church").counterparty_label}.`,
          rule_id: `${input.rule_id}.credit`,
          related_actor_ids: [...(input.related_actor_ids ?? [])]
        }
      })
  },
  liege: {
    contract_id: "liege_due",
    due_asset: "tax_due_coin",
    arrears_asset: "arrears_coin",
    supported_payment_modes: ["coin"],
    counterparty_ref: (state) => personRef(state.locals?.liege, "Liege"),
    due_amount: (state) => taxDueCoin(state),
    arrears_amount: (state) => arrearsCoin(state),
    spend_due: (state, amount, receiptContext) => spendTaxDueCoin(state, amount, receiptContext),
    spend_arrears: (state, amount, receiptContext) => spendArrearsCoin(state, amount, receiptContext),
    carry_due_into_arrears: (state, input) =>
      rollTaxDueCoinIntoArrears(state, {
        debit: {
          phase: input.phase,
          phase_sequence: normalizeInteger(input.phase_sequence),
          category: "obligation.arrears_carry",
          counterparty_kind: "liege",
          counterparty_id: personRef(state.locals?.liege, "Liege").counterparty_id,
          counterparty_label: personRef(state.locals?.liege, "Liege").counterparty_label,
          summary: `Moved unpaid current tax due out of the active ledger slot for ${personRef(state.locals?.liege, "Liege").counterparty_label}.`,
          rule_id: `${input.rule_id}.debit`,
          related_actor_ids: [...(input.related_actor_ids ?? [])]
        },
        credit: {
          phase: input.phase,
          phase_sequence: normalizeInteger(input.phase_sequence),
          category: "obligation.arrears_carry",
          counterparty_kind: "liege",
          counterparty_id: personRef(state.locals?.liege, "Liege").counterparty_id,
          counterparty_label: personRef(state.locals?.liege, "Liege").counterparty_label,
          summary: `Moved unpaid tax due into arrears for ${personRef(state.locals?.liege, "Liege").counterparty_label}.`,
          rule_id: `${input.rule_id}.credit`,
          related_actor_ids: [...(input.related_actor_ids ?? [])]
        }
      })
  }
};

function counterpartySpec(
  counterpartyKind: EconomyObligationCounterpartyKindV1
): EconomyObligationCounterpartySpecV1 {
  return COUNTERPARTY_SPECS[counterpartyKind];
}

function outstandingAmount(
  state: RunState,
  counterpartyKind: EconomyObligationCounterpartyKindV1
): number {
  const spec = counterpartySpec(counterpartyKind);
  return normalizeNonNegative(spec.arrears_amount(state) + spec.due_amount(state));
}

function requestedSettlementAmount(
  state: RunState,
  counterpartyKind: EconomyObligationCounterpartyKindV1,
  requestedAmount: number | undefined
): number {
  const outstanding = outstandingAmount(state, counterpartyKind);
  if (requestedAmount == null) return outstanding;
  return Math.min(outstanding, normalizeNonNegative(requestedAmount));
}

function selectedPaymentMode(
  counterpartyKind: EconomyObligationCounterpartyKindV1,
  paymentMode: FiscalPaymentModeV1 | undefined
): FiscalPaymentModeV1 {
  const spec = counterpartySpec(counterpartyKind);
  return paymentMode ?? spec.supported_payment_modes[0] ?? "coin";
}

function assertSupportedPaymentMode(
  counterpartyKind: EconomyObligationCounterpartyKindV1,
  paymentMode: FiscalPaymentModeV1
): void {
  const spec = counterpartySpec(counterpartyKind);
  if (spec.supported_payment_modes.includes(paymentMode)) return;

  throw new Error(
    `Payment mode ${paymentMode} is not yet implemented for ${counterpartyKind} obligations; supported modes: ${spec.supported_payment_modes.join(", ")}.`
  );
}

function buildCounterpartyEntry(
  state: RunState,
  counterpartyKind: EconomyObligationCounterpartyKindV1
): EconomyObligationCounterpartyEntryV1 {
  const spec = counterpartySpec(counterpartyKind);
  const ref = spec.counterparty_ref(state);
  const contractSnapshot = toAcceptedPaymentContractSnapshot(spec.contract_id);
  const meta = runtimeMetaFor(state, counterpartyKind);

  return {
    schema_version: ECONOMY_OBLIGATION_REGISTRY_SCHEMA_VERSION,
    counterparty_kind: counterpartyKind,
    counterparty_id: ref.counterparty_id,
    counterparty_label: ref.counterparty_label,
    contract_id: spec.contract_id,
    due_asset: spec.due_asset,
    arrears_asset: spec.arrears_asset,
    due_amount: normalizeNonNegative(spec.due_amount(state)),
    arrears_amount: normalizeNonNegative(spec.arrears_amount(state)),
    accepted_payment_modes: acceptedPaymentModesFor(spec.contract_id),
    supported_payment_modes: [...spec.supported_payment_modes],
    preferred_payment_mode: contractSnapshot.preferred_payment_mode,
    settlement_cadence_turns: economyObligationSettlementCadenceTurns(),
    last_settled_turn_index: meta.last_settled_turn_index,
    last_carried_turn_index: meta.last_carried_turn_index
  };
}

function liabilityReceiptContext(
  scaffold: FiscalSettlementScaffoldV1,
  summary: string
): LedgerReceiptContextV1 {
  return {
    phase: scaffold.phase,
    phase_sequence: normalizeInteger(scaffold.phase_sequence),
    category: scaffold.category,
    counterparty_kind: scaffold.counterparty_kind,
    counterparty_id: scaffold.counterparty_id,
    counterparty_label: scaffold.counterparty_label,
    summary,
    rule_id: scaffold.rule_id,
    related_actor_ids: [...scaffold.related_actor_ids]
  };
}

export function buildEconomyObligationRegistryFromState(
  state: RunState
): EconomyObligationRegistryV1 {
  const counterpartyKeys = [...ECONOMY_OBLIGATION_COUNTERPARTY_KINDS];
  const counterpartiesByKey = Object.fromEntries(
    counterpartyKeys.map((counterpartyKind) => [counterpartyKind, buildCounterpartyEntry(state, counterpartyKind)])
  ) as Record<EconomyObligationCounterpartyKindV1, EconomyObligationCounterpartyEntryV1>;

  return {
    schema_version: ECONOMY_OBLIGATION_REGISTRY_SCHEMA_VERSION,
    turn: normalizeInteger(state.turn_index),
    counterparty_keys: counterpartyKeys,
    counterparties_by_key: counterpartiesByKey
  };
}

export function serializeEconomyObligationRegistry(
  registry: EconomyObligationRegistryV1
): string {
  return JSON.stringify({
    schema_version: registry.schema_version,
    turn: normalizeInteger(registry.turn),
    counterparty_keys: [...registry.counterparty_keys],
    counterparties_by_key: Object.fromEntries(
      [...registry.counterparty_keys].sort(compareText).map((counterpartyKind) => [
        counterpartyKind,
        registry.counterparties_by_key[counterpartyKind]
      ])
    )
  });
}

export function makeEconomyObligationSettlementScaffold(
  state: RunState,
  input: EconomyObligationSettlementInputV1
): FiscalSettlementScaffoldV1 {
  const spec = counterpartySpec(input.counterparty_kind);
  const ref = spec.counterparty_ref(state);
  const paymentMode = selectedPaymentMode(input.counterparty_kind, input.payment_mode);

  assertSupportedPaymentMode(input.counterparty_kind, paymentMode);

  return makeFiscalSettlementScaffold({
    phase: input.phase,
    phase_sequence: normalizeInteger(input.phase_sequence),
    contract_id: spec.contract_id,
    counterparty_id: ref.counterparty_id,
    counterparty_label: ref.counterparty_label,
    selected_payment_mode: paymentMode,
    amount: requestedSettlementAmount(state, input.counterparty_kind, input.requested_amount),
    rule_id: input.rule_id,
    related_actor_ids: canonicalRelatedActorIds(input.related_actor_ids ?? [])
  });
}

export function settleEconomyObligationCounterparty(
  state: RunState,
  input: EconomyObligationSettlementInputV1
): EconomyObligationSettlementResultV1 {
  const spec = counterpartySpec(input.counterparty_kind);
  const meta = runtimeMetaFor(state, input.counterparty_kind);
  const paymentMode = selectedPaymentMode(input.counterparty_kind, input.payment_mode);
  const counterparty = spec.counterparty_ref(state);

  assertSupportedPaymentMode(input.counterparty_kind, paymentMode);

  if (meta.last_settled_turn_index === normalizeInteger(state.turn_index)) {
    recordObligationFlowEvidence(
      state,
      "obligation_settlement_already_settled_this_turn",
      `${counterparty.counterparty_label}: settlement already applied this turn.`,
      counterparty.counterparty_id
    );
    return {
      counterparty_kind: input.counterparty_kind,
      contract_id: spec.contract_id,
      selected_payment_mode: paymentMode,
      requested_amount: requestedSettlementAmount(state, input.counterparty_kind, input.requested_amount),
      paid_amount: 0,
      paid_to_arrears: 0,
      paid_to_due: 0,
      blocked: true,
      reason: "already_settled_this_turn",
      scaffold: null,
      registry: buildEconomyObligationRegistryFromState(state)
    };
  }

  const scaffold = makeEconomyObligationSettlementScaffold(state, input);
  if (outstandingAmount(state, input.counterparty_kind) <= 0) {
    recordObligationFlowEvidence(
      state,
      "obligation_settlement_nothing_due",
      `${counterparty.counterparty_label}: nothing due.`,
      counterparty.counterparty_id
    );
    return {
      counterparty_kind: input.counterparty_kind,
      contract_id: spec.contract_id,
      selected_payment_mode: scaffold.selected_payment_mode,
      requested_amount: scaffold.amount,
      paid_amount: 0,
      paid_to_arrears: 0,
      paid_to_due: 0,
      blocked: false,
      reason: "nothing_due",
      scaffold,
      registry: buildEconomyObligationRegistryFromState(state)
    };
  }

  if (scaffold.amount <= 0) {
    recordObligationFlowEvidence(
      state,
      "obligation_settlement_zero_requested",
      `${counterparty.counterparty_label}: settlement requested zero amount.`,
      counterparty.counterparty_id
    );
    return {
      counterparty_kind: input.counterparty_kind,
      contract_id: spec.contract_id,
      selected_payment_mode: scaffold.selected_payment_mode,
      requested_amount: scaffold.amount,
      paid_amount: 0,
      paid_to_arrears: 0,
      paid_to_due: 0,
      blocked: false,
      reason: "zero_requested_amount",
      scaffold,
      registry: buildEconomyObligationRegistryFromState(state)
    };
  }

  const paidAmount = normalizeNonNegative(applyFiscalSettlementScaffold(state, scaffold));
  if (paidAmount <= 0) {
    recordObligationFlowEvidence(
      state,
      "obligation_settlement_insufficient_asset",
      `${counterparty.counterparty_label}: settlement could not draw a payment asset.`,
      counterparty.counterparty_id
    );
    return {
      counterparty_kind: input.counterparty_kind,
      contract_id: spec.contract_id,
      selected_payment_mode: scaffold.selected_payment_mode,
      requested_amount: scaffold.amount,
      paid_amount: 0,
      paid_to_arrears: 0,
      paid_to_due: 0,
      blocked: false,
      reason: "insufficient_payment_asset",
      scaffold,
      registry: buildEconomyObligationRegistryFromState(state)
    };
  }

  const paidToArrears = spec.spend_arrears(
    state,
    paidAmount,
    liabilityReceiptContext(
      scaffold,
      `Settlement cleared arrears owed to ${scaffold.counterparty_label}.`
    )
  );
  const paidToDue = spec.spend_due(
    state,
    paidAmount - paidToArrears,
    liabilityReceiptContext(
      scaffold,
      `Settlement cleared current due owed to ${scaffold.counterparty_label}.`
    )
  );

  meta.last_settled_turn_index = normalizeInteger(state.turn_index);
  recordObligationFlowEvidence(
    state,
    "obligation_settlement_applied",
    `${scaffold.counterparty_label}: settled ${paidToArrears + paidToDue} via ${scaffold.selected_payment_mode}.`,
    scaffold.counterparty_id
  );

  return {
    counterparty_kind: input.counterparty_kind,
    contract_id: spec.contract_id,
    selected_payment_mode: scaffold.selected_payment_mode,
    requested_amount: scaffold.amount,
    paid_amount: paidToArrears + paidToDue,
    paid_to_arrears: paidToArrears,
    paid_to_due: paidToDue,
    blocked: false,
    reason: "applied",
    scaffold,
    registry: buildEconomyObligationRegistryFromState(state)
  };
}

export function carryEconomyObligationCounterpartyIntoArrears(
  state: RunState,
  input: EconomyObligationCarryInputV1
): EconomyObligationCarryResultV1 {
  const meta = runtimeMetaFor(state, input.counterparty_kind);
  const counterparty = counterpartySpec(input.counterparty_kind).counterparty_ref(state);
  if (meta.last_carried_turn_index === normalizeInteger(state.turn_index)) {
    recordObligationFlowEvidence(
      state,
      "obligation_carry_already_applied",
      `${counterparty.counterparty_label}: arrears carry already applied this turn.`,
      counterparty.counterparty_id
    );
    return {
      counterparty_kind: input.counterparty_kind,
      carried_amount: 0,
      blocked: true,
      reason: "already_carried_this_turn",
      registry: buildEconomyObligationRegistryFromState(state)
    };
  }

  if (counterpartySpec(input.counterparty_kind).due_amount(state) <= 0) {
    recordObligationFlowEvidence(
      state,
      "obligation_carry_nothing_due",
      `${counterparty.counterparty_label}: no current due remained for arrears carry.`,
      counterparty.counterparty_id
    );
    return {
      counterparty_kind: input.counterparty_kind,
      carried_amount: 0,
      blocked: false,
      reason: "nothing_due",
      registry: buildEconomyObligationRegistryFromState(state)
    };
  }

  const carriedAmount = normalizeNonNegative(counterpartySpec(input.counterparty_kind).carry_due_into_arrears(state, input));
  meta.last_carried_turn_index = normalizeInteger(state.turn_index);
  recordObligationFlowEvidence(
    state,
    "obligation_arrears_carried",
    `${counterparty.counterparty_label}: carried ${carriedAmount} into arrears.`,
    counterparty.counterparty_id
  );

  return {
    counterparty_kind: input.counterparty_kind,
    carried_amount: carriedAmount,
    blocked: false,
    reason: "applied",
    registry: buildEconomyObligationRegistryFromState(state)
  };
}

export function clearEconomyObligationRuntimeRegistry(state: RunState): void {
  runtimeRegistryByState.delete(state);
}

export function obligationArrearsOutstandingForCounterparty(
  state: RunState,
  counterpartyKind: EconomyObligationCounterpartyKindV1
): number {
  return asNonNegInt(counterpartySpec(counterpartyKind).arrears_amount(state));
}

export function obligationCurrentDueOutstandingForCounterparty(
  state: RunState,
  counterpartyKind: EconomyObligationCounterpartyKindV1
): number {
  return asNonNegInt(counterpartySpec(counterpartyKind).due_amount(state));
}
