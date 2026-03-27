import {
  buildCourtDecisionBudgetView,
  ensureCourtDecisionBudgetRegistry,
  formatCourtDecisionBudgetReceiptLine
} from "../domains/court/decisionBudget";
import { applyMarriageDecision, buildMarriageWindow } from "../domains/people/marriage";
import type { TierSets } from "../tiers";
import type { MarriageWindow, RunState, TurnContext, TurnDecisions } from "../types";

export function buildMarriageWindowPhase(state: RunState, tierSets?: TierSets | null): MarriageWindow | null {
  ensureCourtDecisionBudgetRegistry(state);
  const marriageWindow = buildMarriageWindow(state, tierSets);
  if (marriageWindow && typeof marriageWindow === "object") {
    const budgetView = buildCourtDecisionBudgetView(state);
    (marriageWindow as any).court_decision_budget = budgetView;
  }
  return marriageWindow;
}

export function applyMarriageDecisionPhase(state: RunState, ctx: TurnContext, decisions: TurnDecisions, reportNotes: string[]): void {
  ensureCourtDecisionBudgetRegistry(state);
  applyMarriageDecision(state, ctx, decisions, reportNotes);
  const budgetView = buildCourtDecisionBudgetView(state);
  (ctx.report as any).court_decision_budget = budgetView;
  if (ctx.marriage_window && typeof ctx.marriage_window === "object") {
    (ctx.marriage_window as any).court_decision_budget = budgetView;
  }
  if (decisions.marriage.action !== "none") {
    reportNotes.push(formatCourtDecisionBudgetReceiptLine(state));
  }
}
