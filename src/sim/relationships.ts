import {
  applyRelationshipDelta,
  ensureRelationshipEdge
} from "./domains/people/relationshipEngine";
import type { RelationshipEdge, RunState } from "./types";

export function ensureEdge(state: RunState, fromId: string, toId: string): RelationshipEdge {
  return ensureRelationshipEdge(state, fromId, toId);
}

export function adjustEdge(state: RunState, fromId: string, toId: string, delta: { allegiance?: number; respect?: number; threat?: number }): void {
  applyRelationshipDelta(state, fromId, toId, delta);
}

export function relationshipBounds(state: RunState): {
  min_allegiance: number; max_allegiance: number;
  min_respect: number; max_respect: number;
  min_threat: number; max_threat: number;
} {
  let minA = 100, maxA = 0, minR = 100, maxR = 0, minT = 100, maxT = 0;
  for (const e of state.relationships) {
    minA = Math.min(minA, e.allegiance); maxA = Math.max(maxA, e.allegiance);
    minR = Math.min(minR, e.respect); maxR = Math.max(maxR, e.respect);
    minT = Math.min(minT, e.threat); maxT = Math.max(maxT, e.threat);
  }
  if (state.relationships.length === 0) {
    minA = 0; maxA = 0; minR = 0; maxR = 0; minT = 0; maxT = 0;
  }
  return { min_allegiance: minA, max_allegiance: maxA, min_respect: minR, max_respect: maxR, min_threat: minT, max_threat: maxT };
}
