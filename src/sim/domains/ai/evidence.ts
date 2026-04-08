import type {
  EventResult,
  EvidenceCategoryV0,
  EvidenceConfidenceV0,
  EvidenceEventV0,
  HouseLogEvent,
  MarriageOffer,
  PhaseLogEventV0,
  PhaseNameV0,
  ProspectsLogEvent,
  RunState,
} from "../../types";

export const DOMAIN_EVIDENCE_LOG_SCHEMA_VERSION = "domain_evidence_log_v1" as const;

export interface DomainEvidenceLogEntryV1 {
  phase: PhaseNameV0;
  events: EvidenceEventV0[];
}

export interface DomainEvidenceLogV1 {
  schema_version: typeof DOMAIN_EVIDENCE_LOG_SCHEMA_VERSION;
  entries: DomainEvidenceLogEntryV1[];
}

interface RuntimeDomainEvidencePhaseBucket {
  events: EvidenceEventV0[];
  seen_keys: Set<string>;
}

interface RuntimeDomainEvidenceState {
  turn_index: number;
  by_phase: Partial<Record<PhaseNameV0, RuntimeDomainEvidencePhaseBucket>>;
}

const runtimeDomainEvidenceLogByState = new WeakMap<RunState, RuntimeDomainEvidenceState>();

const DOMAIN_EVIDENCE_PHASE_ORDER: PhaseNameV0[] = [
  "obligations",
  "demography",
  "succession",
  "consumption",
  "events",
  "marriage",
  "prospects",
  "labor",
  "sell",
  "construction"
];

function sortedSubjectIds(subjectIds: Array<string | null | undefined>): string[] | undefined {
  const ids = [...new Set(subjectIds.filter((id): id is string => typeof id === "string" && id.length > 0))]
    .sort((a, b) => a.localeCompare(b));
  return ids.length ? ids : undefined;
}

function evidenceCategoryForPhase(phase: PhaseNameV0): EvidenceCategoryV0 {
  switch (phase) {
    case "construction":
      return "construction";
    case "consumption":
    case "sell":
      return "economy";
    case "demography":
      return "household";
    case "events":
      return "events";
    case "labor":
      return "labor";
    case "marriage":
      return "marriage";
    case "obligations":
      return "obligations";
    case "prospects":
      return "prospects";
    case "succession":
      return "succession";
  }
}

function cloneEvidenceEvent(event: EvidenceEventV0): EvidenceEventV0 {
  return {
    kind: event.kind,
    detail: event.detail,
    category: event.category,
    confidence: event.confidence,
    subject_ids: event.subject_ids ? [...event.subject_ids] : undefined
  };
}

function evidenceEventKey(event: EvidenceEventV0): string {
  return [
    event.kind,
    event.detail,
    event.category,
    event.confidence,
    ...(event.subject_ids ?? [])
  ].join("|");
}

function runtimeDomainEvidenceLog(state: RunState): RuntimeDomainEvidenceState {
  const existing = runtimeDomainEvidenceLogByState.get(state);
  if (existing && existing.turn_index === state.turn_index) return existing;
  const created: RuntimeDomainEvidenceState = {
    turn_index: state.turn_index,
    by_phase: {}
  };
  runtimeDomainEvidenceLogByState.set(state, created);
  return created;
}

function runtimeDomainEvidenceLogView(state: RunState): RuntimeDomainEvidenceState | null {
  const existing = runtimeDomainEvidenceLogByState.get(state);
  if (!existing || existing.turn_index !== state.turn_index) return null;
  return existing;
}

export function makeEvidenceEvent(args: {
  kind: string;
  detail: string;
  category: EvidenceCategoryV0;
  confidence?: EvidenceConfidenceV0;
  subject_ids?: Array<string | null | undefined>;
}): EvidenceEventV0 {
  return {
    kind: args.kind,
    detail: args.detail,
    category: args.category,
    confidence: args.confidence ?? "known",
    subject_ids: sortedSubjectIds(args.subject_ids ?? [])
  };
}

export function phaseLogEventsFromEvidence(events: EvidenceEventV0[]): PhaseLogEventV0[] {
  return events.map((event) => ({ kind: event.kind, detail: event.detail }));
}

export function noteEvidenceEvents(phase: PhaseNameV0, lines: string[]): EvidenceEventV0[] {
  const category = evidenceCategoryForPhase(phase);
  return lines.map((line) => makeEvidenceEvent({ kind: "note", detail: line, category }));
}

export function summarizeHouseLogEvent(event: HouseLogEvent): string {
  if (event.kind === "widowed") return `Widowed: ${event.survivor_name} lost ${event.spouse_name}.`;
  if (event.kind === "heir_selected") return `Heir selected: ${event.heir_name}.`;
  return `Succession: ${event.new_ruler_name} assumes rule.`;
}

export function houseLogEvidenceEvents(events: HouseLogEvent[]): EvidenceEventV0[] {
  return events.map((event) =>
    makeEvidenceEvent({
      kind: event.kind,
      detail: summarizeHouseLogEvent(event),
      category: event.kind === "widowed" ? "household" : "succession",
      subject_ids:
        event.kind === "widowed"
          ? [event.survivor_id, event.deceased_id]
          : undefined
    })
  );
}

export function summarizeProspectsLogEvent(event: ProspectsLogEvent): string {
  if (event.kind === "prospect_generated") return `Prospect generated: ${event.type} (${event.prospect_id}).`;
  if (event.kind === "prospects_window_built") {
    return `Prospects window built: shown ${event.shown_ids.length}, hidden ${event.hidden_ids.length}.`;
  }
  if (event.kind === "prospect_accepted") return `Prospect accepted: ${event.type} (${event.prospect_id}).`;
  if (event.kind === "prospect_rejected") return `Prospect rejected: ${event.type} (${event.prospect_id}).`;
  return `Prospect expired: ${event.type} (${event.prospect_id}).`;
}

export function prospectsLogEvidenceEvents(events: ProspectsLogEvent[]): EvidenceEventV0[] {
  return events.map((event) => {
    if (event.kind === "prospect_generated") {
      return makeEvidenceEvent({
        kind: event.kind,
        detail: summarizeProspectsLogEvent(event),
        category: "prospects",
        confidence: event.prospect.uncertainty,
        subject_ids: [event.subject_person_id, event.prospect.spouse_person_id]
      });
    }
    if (event.kind === "prospects_window_built") {
      return makeEvidenceEvent({
        kind: event.kind,
        detail: summarizeProspectsLogEvent(event),
        category: "prospects"
      });
    }
    return makeEvidenceEvent({
      kind: event.kind,
      detail: summarizeProspectsLogEvent(event),
      category: "prospects",
      subject_ids: [event.subject_person_id]
    });
  });
}

export function marriageOfferEvidenceEvents(offers: MarriageOffer[]): EvidenceEventV0[] {
  return offers.map((offer) =>
    makeEvidenceEvent({
      kind: "marriage_offer",
      detail: `${offer.house_label} (${offer.house_person_id})`,
      category: "marriage",
      subject_ids: [offer.house_person_id]
    })
  );
}

export function appliedEventEvidenceEvents(events: EventResult[]): EvidenceEventV0[] {
  return events.map((event) =>
    makeEvidenceEvent({
      kind: "event_applied",
      detail: event.title,
      category: event.category
    })
  );
}

export function recordRuntimeDomainEvidence(
  state: RunState,
  phase: PhaseNameV0,
  events: EvidenceEventV0[]
): void {
  if (events.length === 0) return;

  const runtime = runtimeDomainEvidenceLog(state);
  const bucket = runtime.by_phase[phase] ?? {
    events: [],
    seen_keys: new Set<string>()
  };

  for (const event of events) {
    const cloned = cloneEvidenceEvent(event);
    const key = evidenceEventKey(cloned);
    if (bucket.seen_keys.has(key)) continue;
    bucket.events.push(cloned);
    bucket.seen_keys.add(key);
  }

  runtime.by_phase[phase] = bucket;
}

export function readRuntimeDomainEvidence(state: RunState): DomainEvidenceLogV1 {
  const runtime = runtimeDomainEvidenceLogView(state);
  const entries = DOMAIN_EVIDENCE_PHASE_ORDER
    .filter((phase) => (runtime?.by_phase[phase]?.events.length ?? 0) > 0)
    .map((phase) => ({
      phase,
      events: (runtime?.by_phase[phase]?.events ?? []).map(cloneEvidenceEvent)
    }));

  return {
    schema_version: DOMAIN_EVIDENCE_LOG_SCHEMA_VERSION,
    entries
  };
}

export function clearRuntimeDomainEvidence(state: RunState): void {
  runtimeDomainEvidenceLogByState.delete(state);
}
