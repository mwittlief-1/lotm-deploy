import type { PhaseNameV0, RunState } from "../../types";
import type { FiscalReceiptSnapshotV1 } from "./receipts";
import { foodStoreBalance, meatStoreBalance, readLedgerReceiptSnapshots, spendCoin } from "./ledger";

export const COURT_PROVISIONING_RATION_POLICY_SCHEMA_VERSION = "court_provisioning_ration_policy_v1" as const;
export const COURT_PROVISIONING_STIPEND_POLICY_SCHEMA_VERSION = "court_provisioning_stipend_policy_v1" as const;
export const COURT_PROVISIONING_FISCAL_ENTRY_SCHEMA_VERSION = "court_provisioning_fiscal_entry_v1" as const;
export const COURT_PROVISIONING_FISCAL_POLICY_SCHEMA_VERSION = "court_provisioning_fiscal_policy_v1" as const;
export const COURT_PROVISIONING_STIPEND_APPLY_RESULT_SCHEMA_VERSION = "court_provisioning_stipend_apply_result_v1" as const;

export const COURT_PROVISIONING_RISK_BADGES = ["undernourishment_watch", "undernourishment_risk"] as const;

export type CourtProvisioningRationLevelLikeV1 = "full" | "standard" | "light" | "external";
export type CourtProvisioningStipendBasisLikeV1 =
  | "family_service"
  | "retainer_upkeep"
  | "realm_stipend"
  | "benefice"
  | "unknown"
  | "none";
export type CourtProvisioningRiskBadgeV1 = typeof COURT_PROVISIONING_RISK_BADGES[number];
export type CourtProvisioningRationStatusV1 = "covered" | "reduced" | "shortfall" | "external";

export interface CourtProvisioningEntryLikeV1 {
  person_id: string;
  person_name: string;
  ration_level: CourtProvisioningRationLevelLikeV1;
  stipend_basis: CourtProvisioningStipendBasisLikeV1;
  stipend_key: string;
}

export interface CourtProvisioningViewLikeV1 {
  person_ids: string[];
  entries_by_person_id: Record<string, CourtProvisioningEntryLikeV1>;
}

export interface CourtProvisioningRationPolicyV1 {
  schema_version: typeof COURT_PROVISIONING_RATION_POLICY_SCHEMA_VERSION;
  allocation_priority: number;
  ration_level: CourtProvisioningRationLevelLikeV1;
  requested_food_units: number;
  requested_meat_units: number;
  allocated_food_units: number;
  allocated_meat_units: number;
  food_shortfall_units: number;
  meat_shortfall_units: number;
  status: CourtProvisioningRationStatusV1;
  rule_id: string;
}

export interface CourtProvisioningStipendPolicyV1 {
  schema_version: typeof COURT_PROVISIONING_STIPEND_POLICY_SCHEMA_VERSION;
  stipend_key: string;
  stipend_basis: CourtProvisioningStipendBasisLikeV1;
  stipend_amount: number;
  applies_receipt: boolean;
  counterparty_kind: "household";
  counterparty_id: string;
  counterparty_label: string;
  receipt_category: "expense.household_admin";
  rule_id: string;
}

export interface CourtProvisioningFiscalEntryV1 {
  schema_version: typeof COURT_PROVISIONING_FISCAL_ENTRY_SCHEMA_VERSION;
  person_id: string;
  person_name: string;
  ration_policy: CourtProvisioningRationPolicyV1;
  stipend_policy: CourtProvisioningStipendPolicyV1;
  undernourishment_badges: CourtProvisioningRiskBadgeV1[];
}

export interface CourtProvisioningFiscalPolicyV1 {
  schema_version: typeof COURT_PROVISIONING_FISCAL_POLICY_SCHEMA_VERSION;
  generated_at_turn_index: number;
  person_ids: string[];
  allocation_order: string[];
  entries_by_person_id: Record<string, CourtProvisioningFiscalEntryV1>;
  total_requested_food_units: number;
  total_requested_meat_units: number;
  total_allocated_food_units: number;
  total_allocated_meat_units: number;
  total_requested_stipend_coin: number;
  at_risk_person_ids: string[];
}

export interface CourtProvisioningStipendApplyEntryResultV1 {
  stipend_key: string;
  person_id: string;
  requested_coin: number;
  paid_coin: number;
  shortfall_coin: number;
  rule_id: string;
}

export interface CourtProvisioningStipendApplyResultV1 {
  schema_version: typeof COURT_PROVISIONING_STIPEND_APPLY_RESULT_SCHEMA_VERSION;
  person_ids: string[];
  applied_stipend_keys: string[];
  applied_entries_by_key: Record<string, CourtProvisioningStipendApplyEntryResultV1>;
  total_requested_coin: number;
  total_paid_coin: number;
  total_shortfall_coin: number;
  receipt_snapshots: FiscalReceiptSnapshotV1[];
}

interface RationRequest {
  food: number;
  meat: number;
  priority: number;
}

const RATION_REQUESTS: Record<CourtProvisioningRationLevelLikeV1, RationRequest> = {
  full: { food: 3, meat: 1, priority: 0 },
  standard: { food: 2, meat: 0, priority: 1 },
  light: { food: 1, meat: 0, priority: 2 },
  external: { food: 0, meat: 0, priority: 3 }
};

const STIPEND_AMOUNTS: Record<CourtProvisioningStipendBasisLikeV1, number> = {
  family_service: 0,
  retainer_upkeep: 1,
  realm_stipend: 2,
  benefice: 0,
  unknown: 0,
  none: 0
};

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeInteger(value: number): number {
  return Math.max(0, Math.trunc(value));
}

function canonicalBadges(badges: readonly CourtProvisioningRiskBadgeV1[]): CourtProvisioningRiskBadgeV1[] {
  return [...new Set(badges)].sort(compareText) as CourtProvisioningRiskBadgeV1[];
}

function canonicalActorIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))].sort(compareText);
}

function rationRequest(level: CourtProvisioningRationLevelLikeV1): RationRequest {
  return RATION_REQUESTS[level] ?? RATION_REQUESTS.standard;
}

function stipendAmountForBasis(basis: CourtProvisioningStipendBasisLikeV1): number {
  return normalizeInteger(STIPEND_AMOUNTS[basis] ?? 0);
}

function stipendRuleId(basis: CourtProvisioningStipendBasisLikeV1, personId: string): string {
  return basis === "retainer_upkeep" || basis === "realm_stipend"
    ? `court.provisioning.stipend.${basis}.${personId}`
    : `court.provisioning.stipend.placeholder.${basis}.${personId}`;
}

function rationRuleId(level: CourtProvisioningRationLevelLikeV1, personId: string): string {
  return `court.provisioning.ration.${level}.${personId}`;
}

function buildAllocationOrder(view: CourtProvisioningViewLikeV1): string[] {
  return [...view.person_ids].sort((leftId, rightId) => {
    const left = view.entries_by_person_id[leftId];
    const right = view.entries_by_person_id[rightId];
    const leftPriority = rationRequest(left?.ration_level ?? "standard").priority;
    const rightPriority = rationRequest(right?.ration_level ?? "standard").priority;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return compareText(leftId, rightId);
  });
}

function badgesForEntry(
  rationLevel: CourtProvisioningRationLevelLikeV1,
  foodShortfall: number,
  meatShortfall: number
): CourtProvisioningRiskBadgeV1[] {
  if (foodShortfall > 0 || meatShortfall > 0) return ["undernourishment_risk"];
  if (rationLevel === "light") return ["undernourishment_watch"];
  return [];
}

export function buildCourtProvisioningFiscalPolicy(
  state: RunState,
  view: CourtProvisioningViewLikeV1
): CourtProvisioningFiscalPolicyV1 {
  const allocationOrder = buildAllocationOrder(view);
  const entriesByPersonId: Record<string, CourtProvisioningFiscalEntryV1> = {};
  const rationPolicies = new Map<string, CourtProvisioningRationPolicyV1>();
  let remainingFood = foodStoreBalance(state);
  let remainingMeat = meatStoreBalance(state);
  let totalRequestedFood = 0;
  let totalRequestedMeat = 0;
  let totalAllocatedFood = 0;
  let totalAllocatedMeat = 0;
  let totalRequestedStipendCoin = 0;

  for (const [index, personId] of allocationOrder.entries()) {
    const entry = view.entries_by_person_id[personId]!;
    const request = rationRequest(entry.ration_level);
    const allocatedFood = Math.min(remainingFood, request.food);
    const allocatedMeat = Math.min(remainingMeat, request.meat);
    remainingFood -= allocatedFood;
    remainingMeat -= allocatedMeat;

    totalRequestedFood += request.food;
    totalRequestedMeat += request.meat;
    totalAllocatedFood += allocatedFood;
    totalAllocatedMeat += allocatedMeat;
    totalRequestedStipendCoin += stipendAmountForBasis(entry.stipend_basis);

    const foodShortfall = Math.max(0, request.food - allocatedFood);
    const meatShortfall = Math.max(0, request.meat - allocatedMeat);
    const badges = badgesForEntry(entry.ration_level, foodShortfall, meatShortfall);
    const status: CourtProvisioningRationStatusV1 =
      entry.ration_level === "external"
        ? "external"
        : foodShortfall > 0 || meatShortfall > 0
          ? "shortfall"
          : entry.ration_level === "light"
            ? "reduced"
            : "covered";

    rationPolicies.set(personId, {
      schema_version: COURT_PROVISIONING_RATION_POLICY_SCHEMA_VERSION,
      allocation_priority: index,
      ration_level: entry.ration_level,
      requested_food_units: request.food,
      requested_meat_units: request.meat,
      allocated_food_units: allocatedFood,
      allocated_meat_units: allocatedMeat,
      food_shortfall_units: foodShortfall,
      meat_shortfall_units: meatShortfall,
      status,
      rule_id: rationRuleId(entry.ration_level, personId)
    });

    entriesByPersonId[personId] = {
      schema_version: COURT_PROVISIONING_FISCAL_ENTRY_SCHEMA_VERSION,
      person_id: personId,
      person_name: entry.person_name,
      ration_policy: rationPolicies.get(personId)!,
      stipend_policy: {
        schema_version: COURT_PROVISIONING_STIPEND_POLICY_SCHEMA_VERSION,
        stipend_key: entry.stipend_key,
        stipend_basis: entry.stipend_basis,
        stipend_amount: stipendAmountForBasis(entry.stipend_basis),
        applies_receipt: stipendAmountForBasis(entry.stipend_basis) > 0,
        counterparty_kind: "household",
        counterparty_id: entry.stipend_key,
        counterparty_label: entry.person_name,
        receipt_category: "expense.household_admin",
        rule_id: stipendRuleId(entry.stipend_basis, personId)
      },
      undernourishment_badges: canonicalBadges(badges)
    };
  }

  return {
    schema_version: COURT_PROVISIONING_FISCAL_POLICY_SCHEMA_VERSION,
    generated_at_turn_index: Math.trunc(state.turn_index),
    person_ids: [...view.person_ids],
    allocation_order: allocationOrder,
    entries_by_person_id: entriesByPersonId,
    total_requested_food_units: totalRequestedFood,
    total_requested_meat_units: totalRequestedMeat,
    total_allocated_food_units: totalAllocatedFood,
    total_allocated_meat_units: totalAllocatedMeat,
    total_requested_stipend_coin: totalRequestedStipendCoin,
    at_risk_person_ids: view.person_ids.filter(
      (personId) => (entriesByPersonId[personId]?.undernourishment_badges.length ?? 0) > 0
    )
  };
}

export function applyCourtProvisioningStipends(
  state: RunState,
  input: {
    phase: PhaseNameV0;
    phase_sequence: number;
    policy: CourtProvisioningFiscalPolicyV1;
    related_actor_ids?: readonly string[];
  }
): CourtProvisioningStipendApplyResultV1 {
  const receiptsBefore = readLedgerReceiptSnapshots(state).length;
  const appliedEntriesByKey: Record<string, CourtProvisioningStipendApplyEntryResultV1> = {};
  let totalRequestedCoin = 0;
  let totalPaidCoin = 0;
  let totalShortfallCoin = 0;

  for (const personId of input.policy.person_ids) {
    const policyEntry = input.policy.entries_by_person_id[personId];
    if (!policyEntry) continue;
    const stipend = policyEntry.stipend_policy;
    if (stipend.stipend_amount <= 0) continue;

    totalRequestedCoin += stipend.stipend_amount;
    const paidCoin = spendCoin(state, stipend.stipend_amount, {
      phase: input.phase,
      phase_sequence: normalizeInteger(input.phase_sequence),
      category: stipend.receipt_category,
      counterparty_kind: stipend.counterparty_kind,
      counterparty_id: stipend.counterparty_id,
      counterparty_label: stipend.counterparty_label,
      summary: `Provisioning stipend placeholder paid ${stipend.stipend_amount} coin to ${stipend.counterparty_label}.`,
      rule_id: stipend.rule_id,
      related_actor_ids: canonicalActorIds([state.house.head.id, personId, ...(input.related_actor_ids ?? [])])
    });
    const shortfallCoin = Math.max(0, stipend.stipend_amount - paidCoin);
    totalPaidCoin += paidCoin;
    totalShortfallCoin += shortfallCoin;
    appliedEntriesByKey[stipend.stipend_key] = {
      stipend_key: stipend.stipend_key,
      person_id: personId,
      requested_coin: stipend.stipend_amount,
      paid_coin: paidCoin,
      shortfall_coin: shortfallCoin,
      rule_id: stipend.rule_id
    };
  }

  return {
    schema_version: COURT_PROVISIONING_STIPEND_APPLY_RESULT_SCHEMA_VERSION,
    person_ids: [...input.policy.person_ids],
    applied_stipend_keys: Object.keys(appliedEntriesByKey).sort(compareText),
    applied_entries_by_key: appliedEntriesByKey,
    total_requested_coin: totalRequestedCoin,
    total_paid_coin: totalPaidCoin,
    total_shortfall_coin: totalShortfallCoin,
    receipt_snapshots: readLedgerReceiptSnapshots(state).slice(receiptsBefore)
  };
}
