import type { RunState } from "../../types";
import { asNonNegInt, clampInt } from "../../util";

export const COURT_DECISION_BUDGET_SCHEMA_VERSION = "court_decision_budget_v0";
export const COURT_DECISION_BUDGET_TURN_YEARS = 3;
export const COURT_DECISION_BUDGET_LIMIT = 6;

export const COURT_DECISION_BUDGET_ACTIONS = [
  "gift_liege",
  "offering_church",
  "marriage_inbound",
  "marriage_scout"
] as const;

export type CourtDecisionBudgetAction = typeof COURT_DECISION_BUDGET_ACTIONS[number];

export type CourtDecisionBudgetSpentByActionV0 = {
  gift_liege: number;
  offering_church: number;
  marriage_inbound: number;
  marriage_scout: number;
};

export type CourtDecisionBudgetRegistryV0 = {
  schema_version: typeof COURT_DECISION_BUDGET_SCHEMA_VERSION;
  turn_years: typeof COURT_DECISION_BUDGET_TURN_YEARS;
  limit: typeof COURT_DECISION_BUDGET_LIMIT;
  spent: number;
  remaining: number;
  exhausted: boolean;
  spent_by_action: CourtDecisionBudgetSpentByActionV0;
};

export type CourtDecisionBudgetChargeResult = {
  action: CourtDecisionBudgetAction;
  requested: number;
  charged: number;
  applied: boolean;
  reason: "applied" | "insufficient_budget" | "non_positive_cost";
  registry: CourtDecisionBudgetRegistryV0;
};

function normalizeCharge(amount: number): number {
  return Math.max(0, Math.trunc(amount));
}

function emptySpentByAction(): CourtDecisionBudgetSpentByActionV0 {
  return {
    gift_liege: 0,
    offering_church: 0,
    marriage_inbound: 0,
    marriage_scout: 0
  };
}

function normalizedSpentByAction(value: any): CourtDecisionBudgetSpentByActionV0 {
  return {
    gift_liege: asNonNegInt(value?.gift_liege),
    offering_church: asNonNegInt(value?.offering_church),
    marriage_inbound: asNonNegInt(value?.marriage_inbound),
    marriage_scout: asNonNegInt(value?.marriage_scout)
  };
}

export function normalizeCourtDecisionBudgetRegistry(value: any): CourtDecisionBudgetRegistryV0 {
  const spentByAction = normalizedSpentByAction(value?.spent_by_action);
  const spent = spentByAction.gift_liege + spentByAction.offering_church + spentByAction.marriage_inbound + spentByAction.marriage_scout;
  const remaining = clampInt(COURT_DECISION_BUDGET_LIMIT - spent, 0, COURT_DECISION_BUDGET_LIMIT);

  return {
    schema_version: COURT_DECISION_BUDGET_SCHEMA_VERSION,
    turn_years: COURT_DECISION_BUDGET_TURN_YEARS,
    limit: COURT_DECISION_BUDGET_LIMIT,
    spent: clampInt(spent, 0, COURT_DECISION_BUDGET_LIMIT),
    remaining,
    exhausted: remaining === 0,
    spent_by_action: spentByAction
  };
}

export function createCourtDecisionBudgetRegistry(): CourtDecisionBudgetRegistryV0 {
  return normalizeCourtDecisionBudgetRegistry({
    spent_by_action: emptySpentByAction()
  });
}

export function resetCourtDecisionBudgetRegistry(): CourtDecisionBudgetRegistryV0 {
  return createCourtDecisionBudgetRegistry();
}

export function ensureCourtDecisionBudgetRegistry(state: RunState): CourtDecisionBudgetRegistryV0 {
  const houseAny: any = state.house as any;
  const existing = houseAny?.court_decision_budget;
  const normalized =
    existing &&
    typeof existing === "object" &&
    existing.schema_version === COURT_DECISION_BUDGET_SCHEMA_VERSION
      ? normalizeCourtDecisionBudgetRegistry(existing)
      : createCourtDecisionBudgetRegistry();

  houseAny.court_decision_budget = normalized;
  return houseAny.court_decision_budget as CourtDecisionBudgetRegistryV0;
}

export function availableCourtDecisionBudget(registry: CourtDecisionBudgetRegistryV0): number {
  return clampInt(asNonNegInt(registry.remaining), 0, COURT_DECISION_BUDGET_LIMIT);
}

export function canChargeCourtDecisionBudget(registry: CourtDecisionBudgetRegistryV0, amount: number): boolean {
  const charge = normalizeCharge(amount);
  return charge > 0 && availableCourtDecisionBudget(registry) >= charge;
}

export function chargeCourtDecisionBudgetRegistry(
  registry: CourtDecisionBudgetRegistryV0,
  action: CourtDecisionBudgetAction,
  amount: number
): CourtDecisionBudgetChargeResult {
  const charge = normalizeCharge(amount);
  const current = normalizeCourtDecisionBudgetRegistry(registry);

  if (charge <= 0) {
    return {
      action,
      requested: charge,
      charged: 0,
      applied: false,
      reason: "non_positive_cost",
      registry: current
    };
  }

  if (!canChargeCourtDecisionBudget(current, charge)) {
    return {
      action,
      requested: charge,
      charged: 0,
      applied: false,
      reason: "insufficient_budget",
      registry: current
    };
  }

  const next = normalizeCourtDecisionBudgetRegistry({
    spent_by_action: {
      ...current.spent_by_action,
      [action]: current.spent_by_action[action] + charge
    }
  });

  return {
    action,
    requested: charge,
    charged: charge,
    applied: true,
    reason: "applied",
    registry: next
  };
}

export function chargeCourtDecisionBudget(
  state: RunState,
  action: CourtDecisionBudgetAction,
  amount: number
): CourtDecisionBudgetChargeResult {
  const houseAny: any = state.house as any;
  const result = chargeCourtDecisionBudgetRegistry(ensureCourtDecisionBudgetRegistry(state), action, amount);
  houseAny.court_decision_budget = result.registry;
  return result;
}
