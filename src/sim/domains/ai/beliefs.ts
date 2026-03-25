import type {
  BeliefObservationV0,
  BeliefRegistryV0,
  EvidenceEventV0,
  PhaseNameV0,
  RunState,
} from "../../types";

const MAX_OBSERVATIONS_PER_SUBJECT = 12;

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

export function knownBeliefSubjects(state: RunState): string[] {
  const registry = ensureBeliefRegistry(state);
  return Object.keys(registry.by_subject).sort((a, b) => a.localeCompare(b));
}
