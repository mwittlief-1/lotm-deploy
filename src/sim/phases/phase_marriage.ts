import { applyMarriageDecision, buildMarriageWindow } from "../domains/people/marriage";
import type { TierSets } from "../tiers";
import type { MarriageWindow, RunState, TurnContext, TurnDecisions } from "../types";

export function buildMarriageWindowPhase(state: RunState, tierSets?: TierSets | null): MarriageWindow | null {
  return buildMarriageWindow(state, tierSets);
}

export function applyMarriageDecisionPhase(state: RunState, ctx: TurnContext, decisions: TurnDecisions, reportNotes: string[]): void {
  applyMarriageDecision(state, ctx, decisions, reportNotes);
}
