import type { RunState } from "../../types";
import { asNonNegInt } from "../../util";

export function hasActiveConstruction(state: RunState): boolean {
  return Boolean(state.manor.construction);
}

export function constructionProgress(state: RunState): number {
  return state.manor.construction ? asNonNegInt(state.manor.construction.progress) : 0;
}

export function startConstructionProject(state: RunState, improvementId: string, required: number): void {
  state.manor.construction = {
    improvement_id: improvementId,
    progress: 0,
    required: Math.max(1, asNonNegInt(required))
  };
}

export function clearConstructionProject(state: RunState): void {
  state.manor.construction = null;
}

export function setConstructionProgress(state: RunState, amount: number): number {
  if (!state.manor.construction) return 0;
  const next = asNonNegInt(amount);
  state.manor.construction.progress = next;
  return next;
}

export function applyConstructionProgressDelta(state: RunState, delta: number): number {
  if (!state.manor.construction) return 0;
  const before = constructionProgress(state);
  const after = setConstructionProgress(state, before + Math.trunc(delta));
  return after - before;
}

export function applyConstructionWork(state: RunState, addedProgress: number): { progress_added: number; completed_improvement_id?: string } {
  if (!state.manor.construction) return { progress_added: 0 };

  const project = state.manor.construction;
  project.required = Math.max(1, asNonNegInt(project.required ?? 1));
  const progressAdded = Math.max(0, Math.trunc(addedProgress));
  const nextProgress = setConstructionProgress(state, project.progress + progressAdded);
  if (nextProgress < project.required) {
    return { progress_added: progressAdded };
  }

  const completedImprovementId = project.improvement_id;
  if (!state.manor.improvements.includes(completedImprovementId)) {
    state.manor.improvements.push(completedImprovementId);
  }
  clearConstructionProject(state);
  return {
    progress_added: progressAdded,
    completed_improvement_id: completedImprovementId
  };
}

export function normalizeConstructionState(state: RunState): void {
  if (!state.manor.construction) return;
  state.manor.construction.progress = asNonNegInt(state.manor.construction.progress);
  state.manor.construction.required = Math.max(1, asNonNegInt(state.manor.construction.required ?? 1));
}
