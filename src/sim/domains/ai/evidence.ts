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
} from "../../types";

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
