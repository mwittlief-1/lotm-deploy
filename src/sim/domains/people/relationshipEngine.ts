import type { RelationshipEdge, RunState } from "../../types";
import { clampInt } from "../../util";

export type RelationshipDelta = {
  allegiance?: number;
  respect?: number;
  threat?: number;
};

export const RELATIONSHIP_BASELINE = {
  allegiance: 50,
  respect: 50,
  threat: 20
} as const;

export function ensureRelationshipEdge(state: RunState, fromId: string, toId: string): RelationshipEdge {
  const found = state.relationships.find((edge) => edge.from_id === fromId && edge.to_id === toId);
  if (found) return found;

  const edge: RelationshipEdge = {
    from_id: fromId,
    to_id: toId,
    allegiance: RELATIONSHIP_BASELINE.allegiance,
    respect: RELATIONSHIP_BASELINE.respect,
    threat: RELATIONSHIP_BASELINE.threat
  };
  state.relationships.push(edge);
  return edge;
}

export function applyRelationshipDelta(
  state: RunState,
  fromId: string,
  toId: string,
  delta: RelationshipDelta,
  _reason?: string
): RelationshipEdge {
  const edge = ensureRelationshipEdge(state, fromId, toId);
  if (delta.allegiance !== undefined) edge.allegiance = clampInt(edge.allegiance + delta.allegiance, 0, 100);
  if (delta.respect !== undefined) edge.respect = clampInt(edge.respect + delta.respect, 0, 100);
  if (delta.threat !== undefined) edge.threat = clampInt(edge.threat + delta.threat, 0, 100);
  return edge;
}

export function driftRelationshipTowardBaseline(
  edge: RelationshipEdge,
  baseline = RELATIONSHIP_BASELINE
): RelationshipEdge {
  edge.allegiance += edge.allegiance < baseline.allegiance ? 1 : edge.allegiance > baseline.allegiance ? -1 : 0;
  edge.respect += edge.respect < baseline.respect ? 1 : edge.respect > baseline.respect ? -1 : 0;
  edge.threat += edge.threat < baseline.threat ? 1 : edge.threat > baseline.threat ? -1 : 0;
  edge.allegiance = clampInt(edge.allegiance, 0, 100);
  edge.respect = clampInt(edge.respect, 0, 100);
  edge.threat = clampInt(edge.threat, 0, 100);
  return edge;
}

export function driftRelationshipsTowardBaseline(state: RunState): void {
  for (const edge of state.relationships) {
    driftRelationshipTowardBaseline(edge);
  }
}
