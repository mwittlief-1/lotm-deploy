const COURT_DECISION_BUDGET_ACTION_ORDER = [
  "gift_liege",
  "offering_church",
  "marriage_inbound",
  "marriage_scout"
] as const;

type CourtDecisionBudgetActionId = (typeof COURT_DECISION_BUDGET_ACTION_ORDER)[number];

type CourtDecisionBudgetActionEntry = {
  action: CourtDecisionBudgetActionId;
  cost: number;
  spent: number;
};

type CourtDecisionBudgetView = {
  limit: number;
  spent: number;
  remaining: number;
  exhausted: boolean;
  actions: CourtDecisionBudgetActionEntry[];
};

export type CourtDecisionBudgetSurfaceEntry = {
  action: CourtDecisionBudgetActionId;
  cost: number;
  spent: number;
  label: string;
  detail: string;
  isHighestCost: boolean;
};

export type CourtDecisionBudgetSurface = {
  limit: number;
  spent: number;
  remaining: number;
  exhausted: boolean;
  entries: CourtDecisionBudgetSurfaceEntry[];
};

const COURT_DECISION_BUDGET_ACTION_COPY: Record<CourtDecisionBudgetActionId, { label: string; detail: string }> = {
  gift_liege: {
    label: "Gift to liege",
    detail: "Court favor spent on noble gifts."
  },
  offering_church: {
    label: "Offering to church",
    detail: "Court effort spent on religious offerings."
  },
  marriage_inbound: {
    label: "Marriage reply",
    detail: "Processing existing offers or refusals."
  },
  marriage_scout: {
    label: "Marriage scouting",
    detail: "Seeking new prospects beyond the current offers."
  }
};

function toNonNegativeInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function normalizeCourtDecisionBudgetView(value: unknown): CourtDecisionBudgetView | null {
  if (!value || typeof value !== "object") return null;

  const valueAny = value as Record<string, unknown>;
  const rawActions = Array.isArray(valueAny.actions) ? valueAny.actions : [];
  const actionMap = new Map<string, CourtDecisionBudgetActionEntry>();

  for (const rawAction of rawActions) {
    if (!rawAction || typeof rawAction !== "object") continue;
    const actionAny = rawAction as Record<string, unknown>;
    const action = actionAny.action;
    if (typeof action !== "string") continue;
    if (!COURT_DECISION_BUDGET_ACTION_ORDER.includes(action as CourtDecisionBudgetActionId)) continue;
    actionMap.set(action, {
      action: action as CourtDecisionBudgetActionId,
      cost: toNonNegativeInt(actionAny.cost),
      spent: toNonNegativeInt(actionAny.spent)
    });
  }

  const actions = COURT_DECISION_BUDGET_ACTION_ORDER.map((action) => {
    const existing = actionMap.get(action);
    return existing ?? { action, cost: 0, spent: 0 };
  });

  const spent = toNonNegativeInt(valueAny.spent);
  const remaining = toNonNegativeInt(valueAny.remaining);
  const limit = Math.max(toNonNegativeInt(valueAny.limit), spent + remaining);

  return {
    limit,
    spent,
    remaining,
    exhausted: Boolean(valueAny.exhausted) || remaining === 0,
    actions
  };
}

export function buildCourtDecisionBudgetSurface(report: unknown, marriageWindow: unknown): CourtDecisionBudgetSurface | null {
  const reportBudget =
    report && typeof report === "object" ? normalizeCourtDecisionBudgetView((report as Record<string, unknown>).court_decision_budget) : null;
  const marriageBudget =
    marriageWindow && typeof marriageWindow === "object"
      ? normalizeCourtDecisionBudgetView((marriageWindow as Record<string, unknown>).court_decision_budget)
      : null;

  const budget = reportBudget ?? marriageBudget;
  if (!budget) return null;

  const highestCost = budget.actions.reduce((maxCost, action) => Math.max(maxCost, action.cost), 0);

  return {
    limit: budget.limit,
    spent: budget.spent,
    remaining: budget.remaining,
    exhausted: budget.exhausted,
    entries: budget.actions.map((action) => ({
      ...action,
      ...COURT_DECISION_BUDGET_ACTION_COPY[action.action],
      isHighestCost: highestCost > 0 && action.cost === highestCost
    }))
  };
}
