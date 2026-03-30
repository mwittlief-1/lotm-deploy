import type { PhaseNameV0, RunState } from "../../types";
import {
  spendArrearsBushels,
  spendArrearsCoin,
  spendCoin,
  spendTaxDueCoin,
  spendTitheDueBushels,
  type LedgerReceiptContextV1,
  type TrackedStoreAsset
} from "./ledger";
import {
  buildEconomyObligationRegistryFromState,
  type EconomyObligationCounterpartyEntryV1,
  type EconomyObligationCounterpartyKindV1,
  type EconomyObligationRegistryV1
} from "./obligationRegistry";
import { spendTrackedStoreWithReceiptWriter } from "./storeReceiptWriters";

export const ECONOMY_OBLIGATION_TANGIBLE_BITE_SCHEMA_VERSION = "economy_obligation_tangible_bite_v1" as const;
export const ECONOMY_OBLIGATION_TANGIBLE_BITE_STAGE = 2 as const;
export const ECONOMY_OBLIGATION_TANGIBLE_BITE_CATEGORIES = [
  "enforcement.seizure",
  "enforcement.forced_payment_stores"
] as const;

export type EconomyObligationTangibleBiteCategoryV1 = typeof ECONOMY_OBLIGATION_TANGIBLE_BITE_CATEGORIES[number];

export interface EconomyObligationEnterpriseSeizureInputV1 {
  phase: PhaseNameV0;
  phase_sequence: number;
  counterparty_kind: EconomyObligationCounterpartyKindV1;
  requested_amount: number;
  cap_amount: number;
  rule_id: string;
  related_actor_ids?: readonly string[];
}

export interface EconomyObligationForcedStorePaymentInputV1 {
  phase: PhaseNameV0;
  phase_sequence: number;
  counterparty_kind: EconomyObligationCounterpartyKindV1;
  asset: TrackedStoreAsset;
  requested_amount: number;
  cap_amount: number;
  rule_id: string;
  related_actor_ids?: readonly string[];
}

export interface EconomyObligationTangibleBiteResultV1 {
  schema_version: typeof ECONOMY_OBLIGATION_TANGIBLE_BITE_SCHEMA_VERSION;
  stage: typeof ECONOMY_OBLIGATION_TANGIBLE_BITE_STAGE;
  category: EconomyObligationTangibleBiteCategoryV1;
  counterparty_kind: EconomyObligationCounterpartyKindV1;
  counterparty_id: string;
  counterparty_label: string;
  payment_mode: "coin" | TrackedStoreAsset;
  requested_amount: number;
  cap_amount: number;
  remaining_turn_cap: number;
  applied_amount: number;
  applied_to_arrears: number;
  applied_to_due: number;
  blocked: boolean;
  reason: "applied" | "turn_cap_reached" | "nothing_due" | "zero_requested_amount" | "no_available_asset";
  rule_id: string;
  summary: string;
  registry: EconomyObligationRegistryV1;
}

interface EconomyObligationTangibleBiteCounterpartyUsageV1 {
  enterprise_seizure: number;
  forced_payment_stores: Record<TrackedStoreAsset, number>;
}

interface EconomyObligationTangibleBiteRuntimeRegistryV1 {
  turn_index: number;
  usage_by_counterparty: Record<EconomyObligationCounterpartyKindV1, EconomyObligationTangibleBiteCounterpartyUsageV1>;
}

const tangibleBiteRuntimeByState = new WeakMap<RunState, EconomyObligationTangibleBiteRuntimeRegistryV1>();

function normalizeInteger(value: number): number {
  return Math.trunc(value);
}

function normalizeNonNegative(value: number): number {
  return Math.max(0, normalizeInteger(value));
}

function emptyCounterpartyUsage(): EconomyObligationTangibleBiteCounterpartyUsageV1 {
  return {
    enterprise_seizure: 0,
    forced_payment_stores: {
      food_stores: 0,
      meat_stores: 0
    }
  };
}

function ensureTangibleBiteRuntimeRegistry(
  state: RunState
): EconomyObligationTangibleBiteRuntimeRegistryV1 {
  const currentTurn = normalizeInteger(state.turn_index);
  const existing = tangibleBiteRuntimeByState.get(state);
  if (existing && existing.turn_index === currentTurn) return existing;

  const created: EconomyObligationTangibleBiteRuntimeRegistryV1 = {
    turn_index: currentTurn,
    usage_by_counterparty: {
      church: emptyCounterpartyUsage(),
      liege: emptyCounterpartyUsage()
    }
  };
  tangibleBiteRuntimeByState.set(state, created);
  return created;
}

function counterpartyEntry(
  state: RunState,
  counterpartyKind: EconomyObligationCounterpartyKindV1
): EconomyObligationCounterpartyEntryV1 {
  return buildEconomyObligationRegistryFromState(state).counterparties_by_key[counterpartyKind];
}

function outstandingAmount(entry: EconomyObligationCounterpartyEntryV1): number {
  return normalizeNonNegative(entry.arrears_amount + entry.due_amount);
}

function liabilityReceiptContext(
  input: {
    phase: PhaseNameV0;
    phase_sequence: number;
    category: EconomyObligationTangibleBiteCategoryV1;
    entry: EconomyObligationCounterpartyEntryV1;
    summary: string;
    rule_id: string;
    related_actor_ids?: readonly string[];
  }
): LedgerReceiptContextV1 {
  return {
    phase: input.phase,
    phase_sequence: normalizeInteger(input.phase_sequence),
    category: input.category,
    counterparty_kind: input.entry.counterparty_kind,
    counterparty_id: input.entry.counterparty_id,
    counterparty_label: input.entry.counterparty_label,
    summary: input.summary,
    rule_id: input.rule_id,
    related_actor_ids: [...(input.related_actor_ids ?? [])]
  };
}

function spendArrearsForCounterparty(
  state: RunState,
  entry: EconomyObligationCounterpartyEntryV1,
  amount: number,
  receiptContext: LedgerReceiptContextV1
): number {
  return entry.arrears_asset === "arrears_coin"
    ? spendArrearsCoin(state, amount, receiptContext)
    : spendArrearsBushels(state, amount, receiptContext);
}

function spendDueForCounterparty(
  state: RunState,
  entry: EconomyObligationCounterpartyEntryV1,
  amount: number,
  receiptContext: LedgerReceiptContextV1
): number {
  return entry.due_asset === "tax_due_coin"
    ? spendTaxDueCoin(state, amount, receiptContext)
    : spendTitheDueBushels(state, amount, receiptContext);
}

function applyLiabilityReduction(
  state: RunState,
  entry: EconomyObligationCounterpartyEntryV1,
  amount: number,
  input: {
    phase: PhaseNameV0;
    phase_sequence: number;
    category: EconomyObligationTangibleBiteCategoryV1;
    summary_prefix: string;
    rule_id: string;
    related_actor_ids?: readonly string[];
  }
): { applied_to_arrears: number; applied_to_due: number } {
  const appliedToArrears = spendArrearsForCounterparty(
    state,
    entry,
    amount,
    liabilityReceiptContext({
      phase: input.phase,
      phase_sequence: input.phase_sequence,
      category: input.category,
      entry,
      summary: `${input.summary_prefix} cleared arrears owed to ${entry.counterparty_label}.`,
      rule_id: input.rule_id,
      related_actor_ids: input.related_actor_ids
    })
  );
  const appliedToDue = spendDueForCounterparty(
    state,
    entry,
    amount - appliedToArrears,
    liabilityReceiptContext({
      phase: input.phase,
      phase_sequence: input.phase_sequence,
      category: input.category,
      entry,
      summary: `${input.summary_prefix} cleared current due owed to ${entry.counterparty_label}.`,
      rule_id: input.rule_id,
      related_actor_ids: input.related_actor_ids
    })
  );

  return {
    applied_to_arrears: appliedToArrears,
    applied_to_due: appliedToDue
  };
}

function tangibleBiteResult(
  entry: EconomyObligationCounterpartyEntryV1,
  input: {
    category: EconomyObligationTangibleBiteCategoryV1;
    payment_mode: "coin" | TrackedStoreAsset;
    requested_amount: number;
    cap_amount: number;
    remaining_turn_cap: number;
    applied_amount: number;
    applied_to_arrears: number;
    applied_to_due: number;
    blocked: boolean;
    reason: EconomyObligationTangibleBiteResultV1["reason"];
    rule_id: string;
    summary: string;
  },
  state: RunState
): EconomyObligationTangibleBiteResultV1 {
  return {
    schema_version: ECONOMY_OBLIGATION_TANGIBLE_BITE_SCHEMA_VERSION,
    stage: ECONOMY_OBLIGATION_TANGIBLE_BITE_STAGE,
    category: input.category,
    counterparty_kind: entry.counterparty_kind,
    counterparty_id: entry.counterparty_id,
    counterparty_label: entry.counterparty_label,
    payment_mode: input.payment_mode,
    requested_amount: normalizeNonNegative(input.requested_amount),
    cap_amount: normalizeNonNegative(input.cap_amount),
    remaining_turn_cap: normalizeNonNegative(input.remaining_turn_cap),
    applied_amount: normalizeNonNegative(input.applied_amount),
    applied_to_arrears: normalizeNonNegative(input.applied_to_arrears),
    applied_to_due: normalizeNonNegative(input.applied_to_due),
    blocked: input.blocked,
    reason: input.reason,
    rule_id: input.rule_id,
    summary: input.summary,
    registry: buildEconomyObligationRegistryFromState(state)
  };
}

function assertForcedStorePaymentSupported(
  entry: EconomyObligationCounterpartyEntryV1,
  asset: TrackedStoreAsset
): void {
  if (!entry.accepted_payment_modes.includes(asset)) {
    throw new Error(`Forced store payment asset ${asset} is not accepted for ${entry.contract_id}.`);
  }

  if (entry.counterparty_kind !== "church" || asset !== "food_stores" || entry.due_asset !== "tithe_due_bushels") {
    throw new Error(
      "Forced store payment is only implemented for bushel-backed church dues until store-to-coin valuation work lands."
    );
  }
}

export function applyEconomyObligationEnterpriseSeizure(
  state: RunState,
  input: EconomyObligationEnterpriseSeizureInputV1
): EconomyObligationTangibleBiteResultV1 {
  const runtime = ensureTangibleBiteRuntimeRegistry(state);
  const usage = runtime.usage_by_counterparty[input.counterparty_kind];
  const entry = counterpartyEntry(state, input.counterparty_kind);
  const category = "enforcement.seizure" as const;
  const capAmount = normalizeNonNegative(input.cap_amount);
  const requestedAmount = normalizeNonNegative(input.requested_amount);
  const remainingCapBefore = Math.max(0, capAmount - usage.enterprise_seizure);

  if (outstandingAmount(entry) <= 0) {
    return tangibleBiteResult(
      entry,
      {
        category,
        payment_mode: "coin",
        requested_amount: requestedAmount,
        cap_amount: capAmount,
        remaining_turn_cap: remainingCapBefore,
        applied_amount: 0,
        applied_to_arrears: 0,
        applied_to_due: 0,
        blocked: false,
        reason: "nothing_due",
        rule_id: input.rule_id,
        summary: `No open obligation remains for ${entry.counterparty_label}; seizure did not apply.`
      },
      state
    );
  }

  if (requestedAmount <= 0) {
    return tangibleBiteResult(
      entry,
      {
        category,
        payment_mode: "coin",
        requested_amount: requestedAmount,
        cap_amount: capAmount,
        remaining_turn_cap: remainingCapBefore,
        applied_amount: 0,
        applied_to_arrears: 0,
        applied_to_due: 0,
        blocked: false,
        reason: "zero_requested_amount",
        rule_id: input.rule_id,
        summary: `Seizure request for ${entry.counterparty_label} was non-positive.`
      },
      state
    );
  }

  if (remainingCapBefore <= 0) {
    return tangibleBiteResult(
      entry,
      {
        category,
        payment_mode: "coin",
        requested_amount: requestedAmount,
        cap_amount: capAmount,
        remaining_turn_cap: 0,
        applied_amount: 0,
        applied_to_arrears: 0,
        applied_to_due: 0,
        blocked: true,
        reason: "turn_cap_reached",
        rule_id: input.rule_id,
        summary: `Seizure cap is already exhausted for ${entry.counterparty_label} this turn.`
      },
      state
    );
  }

  const requestedWithinCap = Math.min(requestedAmount, remainingCapBefore, outstandingAmount(entry));
  const appliedAmount = spendCoin(state, requestedWithinCap, {
    phase: input.phase,
    phase_sequence: normalizeInteger(input.phase_sequence),
    category,
    counterparty_kind: entry.counterparty_kind,
    counterparty_id: entry.counterparty_id,
    counterparty_label: entry.counterparty_label,
    summary: `Seizure captured coin from ${entry.counterparty_label}.`,
    rule_id: input.rule_id,
    related_actor_ids: [...(input.related_actor_ids ?? [])]
  });

  if (appliedAmount <= 0) {
    return tangibleBiteResult(
      entry,
      {
        category,
        payment_mode: "coin",
        requested_amount: requestedAmount,
        cap_amount: capAmount,
        remaining_turn_cap: remainingCapBefore,
        applied_amount: 0,
        applied_to_arrears: 0,
        applied_to_due: 0,
        blocked: false,
        reason: "no_available_asset",
        rule_id: input.rule_id,
        summary: `No coin was available to seize from ${entry.counterparty_label}.`
      },
      state
    );
  }

  usage.enterprise_seizure += appliedAmount;
  const liabilityReduction = applyLiabilityReduction(state, entry, appliedAmount, {
    phase: input.phase,
    phase_sequence: input.phase_sequence,
    category,
    summary_prefix: "Seizure",
    rule_id: input.rule_id,
    related_actor_ids: input.related_actor_ids
  });

  return tangibleBiteResult(
    entry,
    {
      category,
      payment_mode: "coin",
      requested_amount: requestedAmount,
      cap_amount: capAmount,
      remaining_turn_cap: Math.max(0, capAmount - usage.enterprise_seizure),
      applied_amount: appliedAmount,
      applied_to_arrears: liabilityReduction.applied_to_arrears,
      applied_to_due: liabilityReduction.applied_to_due,
      blocked: false,
      reason: "applied",
      rule_id: input.rule_id,
      summary: `Seizure applied ${appliedAmount} coin against ${entry.counterparty_label}.`
    },
    state
  );
}

export function applyEconomyObligationForcedStorePayment(
  state: RunState,
  input: EconomyObligationForcedStorePaymentInputV1
): EconomyObligationTangibleBiteResultV1 {
  const runtime = ensureTangibleBiteRuntimeRegistry(state);
  const usage = runtime.usage_by_counterparty[input.counterparty_kind];
  const entry = counterpartyEntry(state, input.counterparty_kind);
  const category = "enforcement.forced_payment_stores" as const;
  const capAmount = normalizeNonNegative(input.cap_amount);
  const requestedAmount = normalizeNonNegative(input.requested_amount);
  const remainingCapBefore = Math.max(0, capAmount - usage.forced_payment_stores[input.asset]);

  assertForcedStorePaymentSupported(entry, input.asset);

  if (outstandingAmount(entry) <= 0) {
    return tangibleBiteResult(
      entry,
      {
        category,
        payment_mode: input.asset,
        requested_amount: requestedAmount,
        cap_amount: capAmount,
        remaining_turn_cap: remainingCapBefore,
        applied_amount: 0,
        applied_to_arrears: 0,
        applied_to_due: 0,
        blocked: false,
        reason: "nothing_due",
        rule_id: input.rule_id,
        summary: `No open obligation remains for ${entry.counterparty_label}; forced store payment did not apply.`
      },
      state
    );
  }

  if (requestedAmount <= 0) {
    return tangibleBiteResult(
      entry,
      {
        category,
        payment_mode: input.asset,
        requested_amount: requestedAmount,
        cap_amount: capAmount,
        remaining_turn_cap: remainingCapBefore,
        applied_amount: 0,
        applied_to_arrears: 0,
        applied_to_due: 0,
        blocked: false,
        reason: "zero_requested_amount",
        rule_id: input.rule_id,
        summary: `Forced store payment request for ${entry.counterparty_label} was non-positive.`
      },
      state
    );
  }

  if (remainingCapBefore <= 0) {
    return tangibleBiteResult(
      entry,
      {
        category,
        payment_mode: input.asset,
        requested_amount: requestedAmount,
        cap_amount: capAmount,
        remaining_turn_cap: 0,
        applied_amount: 0,
        applied_to_arrears: 0,
        applied_to_due: 0,
        blocked: true,
        reason: "turn_cap_reached",
        rule_id: input.rule_id,
        summary: `Forced store payment cap is already exhausted for ${entry.counterparty_label} this turn.`
      },
      state
    );
  }

  const requestedWithinCap = Math.min(requestedAmount, remainingCapBefore, outstandingAmount(entry));
  const appliedAmount = spendTrackedStoreWithReceiptWriter(state, {
    phase: input.phase,
    phase_sequence: normalizeInteger(input.phase_sequence),
    asset: input.asset,
    amount: requestedWithinCap,
    flow_kind: "enforcement",
    source_label: entry.counterparty_label,
    category,
    counterparty_kind: entry.counterparty_kind,
    counterparty_id: entry.counterparty_id,
    counterparty_label: entry.counterparty_label,
    rule_id: input.rule_id,
    related_actor_ids: input.related_actor_ids
  });

  if (appliedAmount <= 0) {
    return tangibleBiteResult(
      entry,
      {
        category,
        payment_mode: input.asset,
        requested_amount: requestedAmount,
        cap_amount: capAmount,
        remaining_turn_cap: remainingCapBefore,
        applied_amount: 0,
        applied_to_arrears: 0,
        applied_to_due: 0,
        blocked: false,
        reason: "no_available_asset",
        rule_id: input.rule_id,
        summary: `No ${input.asset} were available to force from ${entry.counterparty_label}.`
      },
      state
    );
  }

  usage.forced_payment_stores[input.asset] += appliedAmount;
  const liabilityReduction = applyLiabilityReduction(state, entry, appliedAmount, {
    phase: input.phase,
    phase_sequence: input.phase_sequence,
    category,
    summary_prefix: "Forced store payment",
    rule_id: input.rule_id,
    related_actor_ids: input.related_actor_ids
  });

  return tangibleBiteResult(
    entry,
    {
      category,
      payment_mode: input.asset,
      requested_amount: requestedAmount,
      cap_amount: capAmount,
      remaining_turn_cap: Math.max(0, capAmount - usage.forced_payment_stores[input.asset]),
      applied_amount: appliedAmount,
      applied_to_arrears: liabilityReduction.applied_to_arrears,
      applied_to_due: liabilityReduction.applied_to_due,
      blocked: false,
      reason: "applied",
      rule_id: input.rule_id,
      summary: `Forced store payment applied ${appliedAmount} ${input.asset} against ${entry.counterparty_label}.`
    },
    state
  );
}

export function clearEconomyObligationTangibleBiteRuntimeRegistry(state: RunState): void {
  tangibleBiteRuntimeByState.delete(state);
}
