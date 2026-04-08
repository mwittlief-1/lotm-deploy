import type {
  BeliefObservationV0,
  BeliefRegistryV0,
  EvidenceCategoryV0,
  EvidenceConfidenceV0,
  EvidenceEventV0,
  PhaseNameV0,
  RunState,
} from "../../types";

const MAX_OBSERVATIONS_PER_SUBJECT = 12;
export const BELIEF_PAYLOAD_SCHEMA_VERSION = "belief_payload_v1" as const;
export const BELIEF_PAYLOAD_CONFIDENCE_ORDER = ["known", "likely", "possible"] as const;

export interface BeliefConfidenceStatePayloadV1 {
  confidence: EvidenceConfidenceV0;
  observation_count: number;
  latest_turn_index: number | null;
  categories: EvidenceCategoryV0[];
  kinds: string[];
  observations: BeliefObservationV0[];
}

export interface BeliefSubjectPayloadV1 {
  schema_version: typeof BELIEF_PAYLOAD_SCHEMA_VERSION;
  subject_id: string;
  latest_turn_index: number | null;
  dominant_confidence: EvidenceConfidenceV0 | null;
  states: {
    known: BeliefConfidenceStatePayloadV1;
    likely: BeliefConfidenceStatePayloadV1;
    possible: BeliefConfidenceStatePayloadV1;
  };
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function confidenceRank(confidence: EvidenceConfidenceV0): number {
  switch (confidence) {
    case "known":
      return 0;
    case "likely":
      return 1;
    case "possible":
      return 2;
  }
}

function sortedUnique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort(compareText) as T[];
}

function compareObservations(left: BeliefObservationV0, right: BeliefObservationV0): number {
  if (left.turn_index !== right.turn_index) return left.turn_index - right.turn_index;
  if (left.phase !== right.phase) return compareText(left.phase, right.phase);
  if (left.category !== right.category) return compareText(left.category, right.category);
  const confidenceDiff = confidenceRank(left.confidence) - confidenceRank(right.confidence);
  if (confidenceDiff !== 0) return confidenceDiff;
  if (left.kind !== right.kind) return compareText(left.kind, right.kind);
  return compareText(left.detail, right.detail);
}

function sortObservations(observations: readonly BeliefObservationV0[]): BeliefObservationV0[] {
  return [...observations].sort(compareObservations);
}

function emptyConfidenceState(confidence: EvidenceConfidenceV0): BeliefConfidenceStatePayloadV1 {
  return {
    confidence,
    observation_count: 0,
    latest_turn_index: null,
    categories: [],
    kinds: [],
    observations: []
  };
}

function normalizeConfidenceState(
  confidence: EvidenceConfidenceV0,
  observations: readonly BeliefObservationV0[]
): BeliefConfidenceStatePayloadV1 {
  const ordered = sortObservations(observations);
  return {
    confidence,
    observation_count: ordered.length,
    latest_turn_index: ordered.length > 0 ? ordered[ordered.length - 1]!.turn_index : null,
    categories: sortedUnique(ordered.map((observation) => observation.category)),
    kinds: sortedUnique(ordered.map((observation) => observation.kind)),
    observations: ordered
  };
}

function dominantConfidenceForStates(states: BeliefSubjectPayloadV1["states"]): EvidenceConfidenceV0 | null {
  for (const confidence of BELIEF_PAYLOAD_CONFIDENCE_ORDER) {
    if (states[confidence].observation_count > 0) return confidence;
  }
  return null;
}

export function createBeliefRegistry(): BeliefRegistryV0 {
  return {
    schema_version: "belief_registry_v0",
    by_subject: {}
  };
}

export function ensureBeliefRegistry(state: RunState): BeliefRegistryV0 {
  const anyState: any = state as any;
  const registry = anyState?.beliefs;
  if (
    !registry ||
    typeof registry !== "object" ||
    registry.schema_version !== "belief_registry_v0" ||
    !registry.by_subject ||
    typeof registry.by_subject !== "object" ||
    Array.isArray(registry.by_subject)
  ) {
    anyState.beliefs = createBeliefRegistry();
  }
  return anyState.beliefs as BeliefRegistryV0;
}

function observationKey(observation: BeliefObservationV0): string {
  return [
    observation.subject_id,
    observation.phase,
    observation.turn_index,
    observation.kind,
    observation.detail,
    observation.category,
    observation.confidence
  ].join("|");
}

function normalizeObservationWindow(observations: BeliefObservationV0[]): BeliefObservationV0[] {
  return observations.slice(-MAX_OBSERVATIONS_PER_SUBJECT);
}

export function recordBeliefEvidence(
  state: RunState,
  phase: PhaseNameV0,
  turnIndex: number,
  events: EvidenceEventV0[]
): BeliefRegistryV0 {
  const registry = ensureBeliefRegistry(state);

  for (const event of events) {
    for (const subjectId of event.subject_ids ?? []) {
      const observation: BeliefObservationV0 = {
        subject_id: subjectId,
        phase,
        turn_index: turnIndex,
        kind: event.kind,
        detail: event.detail,
        category: event.category,
        confidence: event.confidence
      };
      const prior = registry.by_subject[subjectId] ?? [];
      const key = observationKey(observation);
      if (!prior.some((item) => observationKey(item) === key)) {
        registry.by_subject[subjectId] = normalizeObservationWindow([...prior, observation]);
      }
    }
  }

  return registry;
}

export function getBeliefObservations(state: RunState, subjectId: string): BeliefObservationV0[] {
  const registry = ensureBeliefRegistry(state);
  return registry.by_subject[subjectId] ?? [];
}

export function buildBeliefPayloadForSubject(
  state: RunState,
  subjectId: string
): BeliefSubjectPayloadV1 {
  const ordered = sortObservations(getBeliefObservations(state, subjectId));
  const known = ordered.filter((observation) => observation.confidence === "known");
  const likely = ordered.filter((observation) => observation.confidence === "likely");
  const possible = ordered.filter((observation) => observation.confidence === "possible");
  const states = {
    known: known.length > 0 ? normalizeConfidenceState("known", known) : emptyConfidenceState("known"),
    likely: likely.length > 0 ? normalizeConfidenceState("likely", likely) : emptyConfidenceState("likely"),
    possible: possible.length > 0 ? normalizeConfidenceState("possible", possible) : emptyConfidenceState("possible")
  };

  return {
    schema_version: BELIEF_PAYLOAD_SCHEMA_VERSION,
    subject_id: subjectId,
    latest_turn_index: ordered.length > 0 ? ordered[ordered.length - 1]!.turn_index : null,
    dominant_confidence: dominantConfidenceForStates(states),
    states
  };
}

export function buildBeliefPayloadRegistry(state: RunState): Record<string, BeliefSubjectPayloadV1> {
  const registry = ensureBeliefRegistry(state);
  const subjectIds = Object.keys(registry.by_subject).sort(compareText);
  return Object.fromEntries(
    subjectIds.map((subjectId) => [subjectId, buildBeliefPayloadForSubject(state, subjectId)])
  );
}

export function knownBeliefSubjects(state: RunState): string[] {
  const registry = ensureBeliefRegistry(state);
  return Object.keys(registry.by_subject).sort(compareText);
}
