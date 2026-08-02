import {
  JOURNEY_PRESENCE_LEDGER_SCHEMA_VERSION,
  JOURNEY_RECEIPT_SCHEMA_VERSION,
  type JourneyArrangementV1,
  type JourneyCutpointV1,
  type JourneyDomainHandoffIntentV1,
  type JourneyInterruptionResolutionV1,
  type JourneyLifecycleInterruptionV1,
  type JourneyPersonPresenceV1,
  type JourneyPresenceEventV1,
  type JourneyPresenceLedgerV1,
  type JourneyPresenceReservationV1,
  type JourneyReceiptV1,
  type JourneyResolvedStopV1,
  type JourneyResultCodeV1,
  type JourneyStayFactV1
} from "./journeyContracts";
import {
  compareJourneyCutpoints,
  journeyCutpointKey,
  journeyCutpointOrdinal,
  journeyIntervalsOverlap,
  validJourneyCutpoint
} from "./journeyTime";

export const JOURNEY_RUNTIME_SCHEMA_VERSION = "phase_five_journey_runtime_v1" as const;

export type JourneyArrangementRuntimeStatusV1 =
  | "planned"
  | "in_transit"
  | "at_stop"
  | "at_destination"
  | "needs_review"
  | "completed"
  | "cancelled"
  | "superseded"
  | "failed";

export type JourneyLegRuntimeStatusV1 = "pending" | "in_transit" | "at_stop" | "arrived" | "failed";

export interface JourneyArrangementRuntimeRowV1 {
  journey_arrangement_id: string;
  status: JourneyArrangementRuntimeStatusV1;
  leg_status_by_id: Readonly<Record<string, JourneyLegRuntimeStatusV1>>;
  active_leg_id: string | null;
  result_receipt_refs: readonly string[];
}

export interface JourneyRuntimeV1 {
  schema_version: typeof JOURNEY_RUNTIME_SCHEMA_VERSION;
  current_cutpoint: JourneyCutpointV1;
  arrangements_by_id: Readonly<Record<string, JourneyArrangementV1>>;
  runtime_by_arrangement_id: Readonly<Record<string, JourneyArrangementRuntimeRowV1>>;
  presence_ledger: JourneyPresenceLedgerV1;
  direct_domain_mutation: false;
  direct_resource_or_gl_mutation: false;
  direct_art_mutation: false;
}

export interface JourneyOpeningPresenceInputV1 {
  person_id: string;
  location_id: string;
  evidence_refs: readonly string[];
}

export interface JourneyRuntimeAdmissionResultV1 {
  status: "accepted" | "withheld";
  runtime: JourneyRuntimeV1;
  reason_codes: readonly string[];
}

export interface JourneyFutureOriginCommitmentV1 {
  person_id: string;
  location_id: string;
  available_cutpoint: JourneyCutpointV1;
  origin_commitment_ref: string;
  journey_arrangement_id: string;
  source_refs: readonly string[];
}

type ScheduledEventKind = "departure" | "stop_arrival" | "stop_departure" | "arrival" | "destination_stay_end";

type ScheduledJourneyEvent = {
  event_key: string;
  arrangement: JourneyArrangementV1;
  journey_leg_id: string;
  kind: ScheduledEventKind;
  cutpoint: JourneyCutpointV1;
  stop: JourneyResolvedStopV1 | null;
};

function compareStable(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableUnique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(compareStable);
}

function safeId(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9:_.-]+/gu, "_");
}

function clonePresence(person: JourneyPersonPresenceV1): JourneyPersonPresenceV1 {
  return { ...person, evidence_refs: [...person.evidence_refs] };
}

function cloneLedger(ledger: JourneyPresenceLedgerV1): JourneyPresenceLedgerV1 {
  return {
    ...ledger,
    current_cutpoint: { ...ledger.current_cutpoint },
    people_by_id: Object.fromEntries(
      Object.entries(ledger.people_by_id).map(([personId, row]) => [personId, clonePresence(row)])
    ),
    reservations: ledger.reservations.map((row) => ({
      ...row,
      opening_cutpoint: { ...row.opening_cutpoint },
      closing_cutpoint: { ...row.closing_cutpoint },
      absence_impact_refs: [...row.absence_impact_refs]
    })),
    presence_events: ledger.presence_events.map((row) => ({
      ...row,
      cutpoint: { ...row.cutpoint },
      source_refs: [...row.source_refs]
    })),
    stay_facts: ledger.stay_facts.map((row) => ({
      ...row,
      arrival_cutpoint: { ...row.arrival_cutpoint },
      departure_cutpoint: { ...row.departure_cutpoint },
      source_refs: [...row.source_refs]
    })),
    domain_handoff_intents: ledger.domain_handoff_intents.map((row) => ({
      ...row,
      authority_evidence_refs: [...row.authority_evidence_refs],
      source_refs: [...row.source_refs]
    })),
    receipts: ledger.receipts.map((row) => ({
      ...row,
      cutpoint: { ...row.cutpoint },
      named_person_ids: [...row.named_person_ids],
      presence_event_refs: [...row.presence_event_refs],
      hosting_and_material_request_refs: [...row.hosting_and_material_request_refs],
      domain_handoff_intent_refs: [...row.domain_handoff_intent_refs],
      knowledge_evidence_refs: [...row.knowledge_evidence_refs],
      reason_codes: [...row.reason_codes],
      source_refs: [...row.source_refs]
    })),
    processed_event_keys: [...ledger.processed_event_keys]
  };
}

function cloneRuntime(runtime: JourneyRuntimeV1): JourneyRuntimeV1 {
  return {
    ...runtime,
    current_cutpoint: { ...runtime.current_cutpoint },
    arrangements_by_id: { ...runtime.arrangements_by_id },
    runtime_by_arrangement_id: Object.fromEntries(
      Object.entries(runtime.runtime_by_arrangement_id).map(([id, row]) => [
        id,
        {
          ...row,
          leg_status_by_id: { ...row.leg_status_by_id },
          result_receipt_refs: [...row.result_receipt_refs]
        }
      ])
    ),
    presence_ledger: cloneLedger(runtime.presence_ledger)
  };
}

export function createJourneyRuntime(
  openingPresence: readonly JourneyOpeningPresenceInputV1[],
  openingCutpoint: JourneyCutpointV1 = { relative_month: 1, phase: "opening" }
): JourneyRuntimeV1 {
  if (!validJourneyCutpoint(openingCutpoint)) throw new Error("invalid_opening_cutpoint");
  const peopleById: Record<string, JourneyPersonPresenceV1> = {};
  for (const row of [...openingPresence].sort((left, right) => compareStable(left.person_id, right.person_id))) {
    if (!row.person_id.trim() || !row.location_id.trim()) throw new Error("opening_presence_requires_person_and_location");
    if (peopleById[row.person_id]) throw new Error(`duplicate_opening_presence:${row.person_id}`);
    peopleById[row.person_id] = {
      person_id: row.person_id,
      status: "at_location",
      location_id: row.location_id,
      active_journey_arrangement_id: null,
      active_journey_leg_id: null,
      evidence_refs: stableUnique(row.evidence_refs)
    };
  }
  const ledger: JourneyPresenceLedgerV1 = {
    schema_version: JOURNEY_PRESENCE_LEDGER_SCHEMA_VERSION,
    current_cutpoint: { ...openingCutpoint },
    people_by_id: peopleById,
    reservations: [],
    presence_events: [],
    stay_facts: [],
    domain_handoff_intents: [],
    receipts: [],
    processed_event_keys: []
  };
  return {
    schema_version: JOURNEY_RUNTIME_SCHEMA_VERSION,
    current_cutpoint: { ...openingCutpoint },
    arrangements_by_id: {},
    runtime_by_arrangement_id: {},
    presence_ledger: ledger,
    direct_domain_mutation: false,
    direct_resource_or_gl_mutation: false,
    direct_art_mutation: false
  };
}

/**
 * Resolve a later origin from the person's latest already-admitted Journey
 * commitment before the proposed departure. This does not predict movement or
 * accept a caller assertion: the evidence is an extant presence reservation
 * whose arrangement is separately identified as runtime-authoritative by the
 * core orchestrator.
 */
export function resolveJourneyFutureOriginCommitment(args: Readonly<{
  runtime: JourneyRuntimeV1;
  person_id: string;
  requested_origin_location_id: string;
  departure_cutpoint: JourneyCutpointV1;
  runtime_authoritative_arrangement_ids: ReadonlySet<string>;
}>): JourneyFutureOriginCommitmentV1 | null {
  const candidates = args.runtime.presence_ledger.reservations
    .filter((reservation) => reservation.person_id === args.person_id)
    .filter((reservation) =>
      compareJourneyCutpoints(reservation.closing_cutpoint, args.departure_cutpoint) <= 0
    )
    .map((reservation) => ({
      reservation,
      arrangement: args.runtime.arrangements_by_id[reservation.journey_arrangement_id],
      runtime_row: args.runtime.runtime_by_arrangement_id[reservation.journey_arrangement_id],
    }))
    .filter((candidate) => Boolean(candidate.arrangement && candidate.runtime_row))
    .filter((candidate) =>
      !new Set<JourneyArrangementRuntimeStatusV1>([
        "needs_review",
        "completed",
        "cancelled",
        "superseded",
        "failed",
      ]).has(candidate.runtime_row!.status)
    )
    .sort((left, right) => {
      const time = compareJourneyCutpoints(
        right.reservation.closing_cutpoint,
        left.reservation.closing_cutpoint,
      );
      if (time !== 0) return time;
      return compareStable(
        left.reservation.journey_arrangement_id,
        right.reservation.journey_arrangement_id,
      );
    });
  const latest = candidates[0];
  if (!latest?.arrangement) return null;
  if (!args.runtime_authoritative_arrangement_ids.has(
    latest.reservation.journey_arrangement_id,
  )) return null;
  const finalLeg = [...latest.arrangement.legs]
    .sort((left, right) => left.sequence_no - right.sequence_no)
    .at(-1);
  if (!finalLeg || finalLeg.to_location_id !== args.requested_origin_location_id) {
    return null;
  }
  if (!finalLeg.named_party.some((member) => member.person_id === args.person_id)) {
    return null;
  }
  return {
    person_id: args.person_id,
    location_id: finalLeg.to_location_id,
    available_cutpoint: { ...latest.reservation.closing_cutpoint },
    origin_commitment_ref: latest.reservation.reservation_id,
    journey_arrangement_id: latest.arrangement.journey_arrangement_id,
    source_refs: stableUnique([
      latest.reservation.reservation_id,
      latest.arrangement.journey_arrangement_id,
      finalLeg.route_leg_id,
      ...latest.arrangement.source_refs,
      ...finalLeg.source_refs,
    ]),
  };
}

function arrangementFailures(arrangement: JourneyArrangementV1): string[] {
  const failures: string[] = [];
  const legs = [...arrangement.legs].sort((left, right) => left.sequence_no - right.sequence_no);
  if (legs.length === 0) return ["arrangement_has_no_legs"];
  const expectedMemberIds = legs[0]!.named_party.map((member) => member.person_id).sort(compareStable);
  for (let index = 0; index < legs.length; index += 1) {
    const leg = legs[index]!;
    if (leg.sequence_no !== index + 1) failures.push(`noncontiguous_leg_sequence:${leg.route_leg_id}`);
    if (compareJourneyCutpoints(leg.departure_cutpoint, leg.arrival_cutpoint) > 0) {
      failures.push(`reversed_leg_cutpoints:${leg.route_leg_id}`);
    }
    if (!leg.selected_route_path_ref.trim()) failures.push(`missing_route_path:${leg.route_leg_id}`);
    const memberIds = leg.named_party.map((member) => member.person_id).sort(compareStable);
    if (memberIds.join("|") !== expectedMemberIds.join("|")) failures.push(`party_changed_inside_arrangement:${leg.route_leg_id}`);
    if (new Set(memberIds).size !== memberIds.length) failures.push(`duplicate_leg_member:${leg.route_leg_id}`);
    const prior = index > 0 ? legs[index - 1] : null;
    if (prior && prior.to_location_id !== leg.from_location_id) failures.push(`noncontiguous_leg_location:${leg.route_leg_id}`);
    if (prior && compareJourneyCutpoints(prior.arrival_cutpoint, leg.departure_cutpoint) > 0) {
      failures.push(`overlapping_leg_time:${leg.route_leg_id}`);
    }
  }
  const principalCount = legs[0]!.named_party.filter(
    (member) => member.person_id === arrangement.principal_person_id && member.party_role === "principal"
  ).length;
  if (principalCount !== 1) failures.push("arrangement_principal_missing_or_duplicated");
  return stableUnique(failures);
}

function reservationFor(arrangement: JourneyArrangementV1, personId: string): JourneyPresenceReservationV1 {
  const firstLeg = arrangement.legs[0]!;
  const lastLeg = arrangement.legs.at(-1)!;
  const member = firstLeg.named_party.find((row) => row.person_id === personId)!;
  const stayClosing = arrangement.planned_destination_stay?.departure_cutpoint;
  const closing =
    stayClosing && compareJourneyCutpoints(stayClosing, lastLeg.arrival_cutpoint) > 0
      ? stayClosing
      : lastLeg.arrival_cutpoint;
  return {
    reservation_id: `journey-presence-reservation:${safeId(arrangement.journey_arrangement_id)}:${safeId(personId)}`,
    person_id: personId,
    journey_arrangement_id: arrangement.journey_arrangement_id,
    opening_cutpoint: { ...firstLeg.departure_cutpoint },
    closing_cutpoint: { ...closing },
    absence_impact_refs: stableUnique(member.absence_impact_refs)
  };
}

export function validateJourneyArrangementAdmission(
  runtime: JourneyRuntimeV1,
  arrangement: JourneyArrangementV1
): string[] {
  const failures = arrangementFailures(arrangement);
  if (runtime.arrangements_by_id[arrangement.journey_arrangement_id]) failures.push("arrangement_id_already_admitted");
  const firstLeg = arrangement.legs[0];
  if (firstLeg) {
    if (compareJourneyCutpoints(firstLeg.departure_cutpoint, runtime.current_cutpoint) < 0) {
      failures.push("arrangement_departs_before_runtime_cutpoint");
    }
    const departsAtCurrentCutpoint = compareJourneyCutpoints(firstLeg.departure_cutpoint, runtime.current_cutpoint) === 0;
    for (const member of firstLeg.named_party) {
      const presence = runtime.presence_ledger.people_by_id[member.person_id];
      if (!presence) failures.push(`person_absent_from_presence_ledger:${member.person_id}`);
      else if (
        departsAtCurrentCutpoint &&
        (presence.status !== "at_location" || presence.location_id !== firstLeg.from_location_id)
      ) {
        failures.push(`person_not_at_arrangement_origin:${member.person_id}`);
      }
      const proposed = reservationFor(arrangement, member.person_id);
      for (const existing of runtime.presence_ledger.reservations.filter((row) => row.person_id === member.person_id)) {
        if (
          journeyIntervalsOverlap(
            proposed.opening_cutpoint,
            proposed.closing_cutpoint,
            existing.opening_cutpoint,
            existing.closing_cutpoint
          )
        ) {
          failures.push(`incompatible_presence_commitment:${member.person_id}:${existing.journey_arrangement_id}`);
        }
      }
    }
  }
  return stableUnique(failures);
}

export function admitJourneyArrangement(
  runtime: JourneyRuntimeV1,
  arrangement: JourneyArrangementV1
): JourneyRuntimeAdmissionResultV1 {
  const failures = validateJourneyArrangementAdmission(runtime, arrangement);
  if (failures.length > 0) return { status: "withheld", runtime, reason_codes: failures };

  const next = cloneRuntime(runtime);
  const firstLeg = arrangement.legs[0]!;
  const reservations = firstLeg!.named_party.map((member) => reservationFor(arrangement, member.person_id));
  next.arrangements_by_id = { ...next.arrangements_by_id, [arrangement.journey_arrangement_id]: arrangement };
  next.runtime_by_arrangement_id = {
    ...next.runtime_by_arrangement_id,
    [arrangement.journey_arrangement_id]: {
      journey_arrangement_id: arrangement.journey_arrangement_id,
      status: "planned",
      leg_status_by_id: Object.fromEntries(arrangement.legs.map((leg) => [leg.route_leg_id, "pending" as const])),
      active_leg_id: null,
      result_receipt_refs: []
    }
  };
  next.presence_ledger = {
    ...next.presence_ledger,
    reservations: [...next.presence_ledger.reservations, ...reservations].sort((left, right) => compareStable(left.reservation_id, right.reservation_id))
  };
  return { status: "accepted", runtime: next, reason_codes: [] };
}

function scheduledEvents(arrangement: JourneyArrangementV1): ScheduledJourneyEvent[] {
  const events: ScheduledJourneyEvent[] = [];
  for (const leg of arrangement.legs) {
    events.push({
      event_key: `${arrangement.journey_arrangement_id}:${leg.route_leg_id}:departure`,
      arrangement,
      journey_leg_id: leg.route_leg_id,
      kind: "departure",
      cutpoint: leg.departure_cutpoint,
      stop: null
    });
    for (const stop of leg.planned_stops) {
      events.push({
        event_key: `${arrangement.journey_arrangement_id}:${leg.route_leg_id}:stop:${stop.stop_id}:arrival`,
        arrangement,
        journey_leg_id: leg.route_leg_id,
        kind: "stop_arrival",
        cutpoint: stop.arrival_cutpoint,
        stop
      });
      events.push({
        event_key: `${arrangement.journey_arrangement_id}:${leg.route_leg_id}:stop:${stop.stop_id}:departure`,
        arrangement,
        journey_leg_id: leg.route_leg_id,
        kind: "stop_departure",
        cutpoint: stop.departure_cutpoint,
        stop
      });
    }
    events.push({
      event_key: `${arrangement.journey_arrangement_id}:${leg.route_leg_id}:arrival`,
      arrangement,
      journey_leg_id: leg.route_leg_id,
      kind: "arrival",
      cutpoint: leg.arrival_cutpoint,
      stop: null
    });
  }
  const destinationStayLeg = arrangement.destination_stay_leg_id
    ? arrangement.legs.find((leg) => leg.route_leg_id === arrangement.destination_stay_leg_id)
    : null;
  if (destinationStayLeg && arrangement.planned_destination_stay) {
    events.push({
      event_key: `${arrangement.journey_arrangement_id}:${destinationStayLeg.route_leg_id}:destination-stay-end`,
      arrangement,
      journey_leg_id: destinationStayLeg.route_leg_id,
      kind: "destination_stay_end",
      cutpoint: arrangement.planned_destination_stay.departure_cutpoint,
      stop: null
    });
  }
  return events;
}

const EVENT_PRIORITY: Record<ScheduledEventKind, number> = {
  arrival: 0,
  stop_arrival: 1,
  destination_stay_end: 2,
  stop_departure: 3,
  departure: 4
};

function receipt(args: {
  arrangement: JourneyArrangementV1;
  journeyLegId: string | null;
  resultCode: JourneyResultCodeV1;
  cutpoint: JourneyCutpointV1;
  actualLocationId: string | null;
  namedPersonIds: readonly string[];
  presenceEventRefs?: readonly string[];
  domainHandoffIntentRefs?: readonly string[];
  reasonCodes?: readonly string[];
  sourceRefs?: readonly string[];
}): JourneyReceiptV1 {
  return {
    schema_version: JOURNEY_RECEIPT_SCHEMA_VERSION,
    journey_receipt_id: `journey-receipt:${safeId(args.arrangement.journey_arrangement_id)}:${safeId(args.journeyLegId ?? "arrangement")}:${journeyCutpointKey(args.cutpoint)}:${args.resultCode}`,
    journey_arrangement_id: args.arrangement.journey_arrangement_id,
    journey_leg_id: args.journeyLegId,
    result_code: args.resultCode,
    cutpoint: { ...args.cutpoint },
    actual_location_id: args.actualLocationId,
    named_person_ids: stableUnique(args.namedPersonIds),
    presence_event_refs: stableUnique(args.presenceEventRefs ?? []),
    hosting_and_material_request_refs: [],
    domain_handoff_intent_refs: stableUnique(args.domainHandoffIntentRefs ?? []),
    knowledge_evidence_refs: [],
    reason_codes: stableUnique(args.reasonCodes ?? []),
    source_refs: stableUnique([...args.arrangement.source_refs, ...(args.sourceRefs ?? [])]),
    direct_domain_mutation: false,
    direct_resource_or_gl_mutation: false,
    direct_art_mutation: false
  };
}

function updateArrangementRuntime(
  runtime: JourneyRuntimeV1,
  arrangementId: string,
  patch: Partial<JourneyArrangementRuntimeRowV1> & { leg_id?: string; leg_status?: JourneyLegRuntimeStatusV1 },
  receiptRef?: string
): void {
  const existing = runtime.runtime_by_arrangement_id[arrangementId];
  if (!existing) throw new Error(`missing_arrangement_runtime:${arrangementId}`);
  const legStatus = { ...existing.leg_status_by_id };
  if (patch.leg_id && patch.leg_status) legStatus[patch.leg_id] = patch.leg_status;
  runtime.runtime_by_arrangement_id = {
    ...runtime.runtime_by_arrangement_id,
    [arrangementId]: {
      ...existing,
      ...patch,
      leg_status_by_id: legStatus,
      result_receipt_refs: stableUnique([
        ...existing.result_receipt_refs,
        ...(receiptRef ? [receiptRef] : [])
      ])
    }
  };
}

function addReceipt(runtime: JourneyRuntimeV1, row: JourneyReceiptV1): void {
  runtime.presence_ledger = {
    ...runtime.presence_ledger,
    receipts: [...runtime.presence_ledger.receipts, row]
  };
  updateArrangementRuntime(runtime, row.journey_arrangement_id, {}, row.journey_receipt_id);
}

function addPresenceEvents(runtime: JourneyRuntimeV1, rows: readonly JourneyPresenceEventV1[]): void {
  runtime.presence_ledger = {
    ...runtime.presence_ledger,
    presence_events: [...runtime.presence_ledger.presence_events, ...rows]
  };
}

function addHandoffs(runtime: JourneyRuntimeV1, rows: readonly JourneyDomainHandoffIntentV1[]): void {
  runtime.presence_ledger = {
    ...runtime.presence_ledger,
    domain_handoff_intents: [...runtime.presence_ledger.domain_handoff_intents, ...rows]
  };
}

function addStayFact(runtime: JourneyRuntimeV1, row: JourneyStayFactV1): void {
  if (runtime.presence_ledger.stay_facts.some((existing) => existing.stay_fact_id === row.stay_fact_id)) return;
  runtime.presence_ledger = {
    ...runtime.presence_ledger,
    stay_facts: [...runtime.presence_ledger.stay_facts, row]
  };
}

function legFor(event: ScheduledJourneyEvent) {
  return event.arrangement.legs.find((leg) => leg.route_leg_id === event.journey_leg_id)!;
}

function namedIds(event: ScheduledJourneyEvent): string[] {
  return legFor(event).named_party.map((member) => member.person_id).sort(compareStable);
}

function interruptionResult(
  runtime: JourneyRuntimeV1,
  event: ScheduledJourneyEvent,
  interruption: JourneyLifecycleInterruptionV1
): void {
  const ids = namedIds(event);
  const current = runtime.runtime_by_arrangement_id[event.arrangement.journey_arrangement_id];
  if (!current) throw new Error(`missing_arrangement_runtime:${event.arrangement.journey_arrangement_id}`);
  const priorLegStatus = current.leg_status_by_id[event.journey_leg_id];
  if (!priorLegStatus) throw new Error(`journey_interruption_unknown_leg:${event.journey_leg_id}`);
  const status: JourneyArrangementRuntimeStatusV1 = "needs_review";
  const row = receipt({
    arrangement: event.arrangement,
    journeyLegId: event.journey_leg_id,
    resultCode: interruption.result_code,
    cutpoint: interruption.effective_cutpoint,
    actualLocationId: runtime.presence_ledger.people_by_id[ids[0] ?? ""]?.location_id ?? null,
    namedPersonIds: ids,
    reasonCodes: interruption.reason_codes,
    sourceRefs: interruption.source_refs
  });
  addReceipt(runtime, row);
  updateArrangementRuntime(runtime, event.arrangement.journey_arrangement_id, {
    status,
    active_leg_id: event.journey_leg_id,
    leg_id: event.journey_leg_id,
    leg_status: priorLegStatus,
  });
}

function releaseArrangementReservations(
  runtime: JourneyRuntimeV1,
  arrangementId: string
): void {
  runtime.presence_ledger = {
    ...runtime.presence_ledger,
    reservations: runtime.presence_ledger.reservations.filter(
      (row) => row.journey_arrangement_id !== arrangementId
    )
  };
}

function interruptionEvent(
  arrangement: JourneyArrangementV1,
  interruption: JourneyLifecycleInterruptionV1
): ScheduledJourneyEvent {
  return {
    event_key: `interruption-target:${arrangement.journey_arrangement_id}:${interruption.journey_leg_id}`,
    arrangement,
    journey_leg_id: interruption.journey_leg_id,
    kind: "departure",
    cutpoint: interruption.effective_cutpoint,
    stop: null
  };
}

function interruptionTargetFailure(
  runtime: JourneyRuntimeV1,
  arrangement: JourneyArrangementV1,
  row: JourneyArrangementRuntimeRowV1,
  legId: string,
): string | null {
  const targetLeg = arrangement.legs.find((leg) => leg.route_leg_id === legId);
  const targetStatus = row.leg_status_by_id[legId];
  if (!targetLeg || !targetStatus) return "journey_interruption_unknown_leg";
  if (row.active_leg_id && row.active_leg_id !== legId) {
    return "journey_interruption_target_not_active_leg";
  }
  const people = targetLeg.named_party.map(
    (member) => runtime.presence_ledger.people_by_id[member.person_id],
  );
  if (people.some((person) => !person)) {
    return "journey_interruption_target_party_presence_missing";
  }
  if (targetStatus === "in_transit" || targetStatus === "at_stop") {
    return row.active_leg_id === legId
      ? null
      : "journey_interruption_target_not_active_leg";
  }
  if (targetStatus === "pending") {
    const earlierLegs = arrangement.legs.filter(
      (leg) => leg.sequence_no < targetLeg.sequence_no,
    );
    if (earlierLegs.some(
      (leg) => row.leg_status_by_id[leg.route_leg_id] !== "arrived",
    )) {
      return "journey_interruption_target_predecessor_not_arrived";
    }
    return people.every(
      (person) =>
        person!.status === "at_location" &&
        person!.location_id === targetLeg.from_location_id,
    )
      ? null
      : "journey_interruption_target_party_not_at_leg_origin";
  }
  if (targetStatus === "arrived") {
    if (arrangement.destination_stay_leg_id !== legId) {
      return "journey_interruption_target_leg_already_closed";
    }
    return people.every(
      (person) =>
        person!.status === "at_location" &&
        person!.location_id === targetLeg.to_location_id,
    )
      ? null
      : "journey_interruption_target_party_not_at_leg_destination";
  }
  return "journey_interruption_target_leg_not_active";
}

function resumedStatus(
  row: JourneyArrangementRuntimeRowV1,
  legId: string
): JourneyArrangementRuntimeStatusV1 {
  const legStatus = row.leg_status_by_id[legId];
  if (legStatus === "pending") return "planned";
  if (legStatus === "at_stop") return "at_stop";
  if (legStatus === "in_transit") return "in_transit";
  if (legStatus === "arrived") {
    return Object.values(row.leg_status_by_id).some((status) => status === "pending")
      ? "at_destination"
      : "completed";
  }
  throw new Error(`journey_interruption_leg_not_resumable:${legId}`);
}

function addRealizedPartialStayAtTerminalResolution(args: Readonly<{
  runtime: JourneyRuntimeV1;
  arrangement: JourneyArrangementV1;
  leg: JourneyArrangementV1["legs"][number];
  prior_leg_status: JourneyLegRuntimeStatusV1;
  cutpoint: JourneyCutpointV1;
  actual_location_id: string;
  source_refs: readonly string[];
}>): void {
  const aggregate = args.leg.aggregate_party;
  const common = {
    journey_arrangement_id: args.arrangement.journey_arrangement_id,
    journey_leg_id: args.leg.route_leg_id,
    named_person_count: args.leg.named_party.length,
    aggregate_service_person_count:
      aggregate.ordinary_attendant_count +
      aggregate.guard_rank_and_file_count +
      aggregate.driver_groom_handler_count +
      aggregate.other_service_person_count,
    animal_count: aggregate.riding_animal_count + aggregate.pack_animal_count,
    cart_wagon_count: aggregate.cart_wagon_count,
  };
  if (args.prior_leg_status === "at_stop") {
    const stop = args.leg.planned_stops.find(
      (candidate) =>
        candidate.location_id === args.actual_location_id &&
        compareJourneyCutpoints(candidate.arrival_cutpoint, args.cutpoint) < 0 &&
        compareJourneyCutpoints(args.cutpoint, candidate.departure_cutpoint) <= 0,
    );
    if (!stop) return;
    addStayFact(args.runtime, {
      stay_fact_id: `journey-stay-fact:${safeId(
        args.arrangement.journey_arrangement_id,
      )}:${safeId(stop.stop_id)}`,
      ...common,
      location_id: stop.location_id,
      provider_kind: stop.provider_kind,
      host_entity_id: stop.host_entity_id,
      admission_ref: stop.admission_ref,
      arrival_cutpoint: { ...stop.arrival_cutpoint },
      departure_cutpoint: { ...args.cutpoint },
      source_refs: stableUnique([
        ...args.arrangement.source_refs,
        ...stop.source_refs,
        stop.admission_ref,
        ...args.source_refs,
        "JourneyLifecycle:terminal_partial_stop_stay",
      ]),
    });
    return;
  }
  const stay = args.arrangement.planned_destination_stay;
  if (args.prior_leg_status !== "arrived" || !stay ||
      args.arrangement.destination_stay_leg_id !== args.leg.route_leg_id ||
      args.actual_location_id !== args.leg.to_location_id ||
      compareJourneyCutpoints(stay.arrival_cutpoint, args.cutpoint) >= 0 ||
      compareJourneyCutpoints(args.cutpoint, stay.departure_cutpoint) > 0) {
    return;
  }
  addStayFact(args.runtime, {
    stay_fact_id: `journey-stay-fact:${safeId(
      args.arrangement.journey_arrangement_id,
    )}:destination`,
    ...common,
    location_id: args.leg.to_location_id,
    provider_kind: "journey_destination",
    host_entity_id: args.arrangement.hosting_entity_id,
    admission_ref:
      args.arrangement.hosting_visit_arrangement_id ??
      args.arrangement.sponsor_and_support_basis_ref,
    arrival_cutpoint: { ...stay.arrival_cutpoint },
    departure_cutpoint: { ...args.cutpoint },
    source_refs: stableUnique([
      ...args.arrangement.source_refs,
      args.arrangement.hosting_visit_arrangement_id ??
        args.arrangement.sponsor_and_support_basis_ref,
      ...args.source_refs,
      "JourneyLifecycle:terminal_partial_destination_stay",
    ]),
  });
}

/**
 * Resolve a non-terminal interruption at the runtime's exact cutpoint. This
 * cannot invent a replacement purpose or route: superseding an arrangement
 * releases its reservation, after which the owning domain must submit a new
 * source-backed Journey draft through the normal admission seam.
 */
export function resolveJourneyInterruption(
  runtime: JourneyRuntimeV1,
  resolution: JourneyInterruptionResolutionV1
): JourneyRuntimeV1 {
  if (!validJourneyCutpoint(resolution.effective_cutpoint)) {
    throw new Error("invalid_journey_interruption_resolution_cutpoint");
  }
  if (compareJourneyCutpoints(resolution.effective_cutpoint, runtime.current_cutpoint) !== 0) {
    throw new Error("journey_interruption_resolution_requires_current_cutpoint");
  }
  if (resolution.authority_evidence_refs.length === 0 || resolution.source_refs.length === 0) {
    throw new Error("journey_interruption_resolution_requires_authority_and_provenance");
  }
  const arrangement = runtime.arrangements_by_id[resolution.journey_arrangement_id];
  const existing = runtime.runtime_by_arrangement_id[resolution.journey_arrangement_id];
  if (!arrangement || !existing) throw new Error("journey_interruption_resolution_unknown_arrangement");
  if (existing.status !== "needs_review" || existing.active_leg_id !== resolution.journey_leg_id) {
    throw new Error("journey_interruption_resolution_not_pending_review");
  }
  if (!existing.leg_status_by_id[resolution.journey_leg_id]) {
    throw new Error("journey_interruption_resolution_unknown_leg");
  }

  const next = cloneRuntime(runtime);
  const ids = arrangement.legs
    .find((leg) => leg.route_leg_id === resolution.journey_leg_id)!
    .named_party.map((member) => member.person_id)
    .sort(compareStable);
  const targetLeg = arrangement.legs.find(
    (leg) => leg.route_leg_id === resolution.journey_leg_id,
  )!;
  if (resolution.resolution_kind === "resume") {
    if (resolution.terminal_presence_disposition) {
      throw new Error("journey_resume_cannot_set_terminal_presence");
    }
    const processed = new Set(runtime.presence_ledger.processed_event_keys);
    const missed = scheduledEvents(arrangement).filter(
      (event) =>
        !processed.has(event.event_key) &&
        compareJourneyCutpoints(event.cutpoint, runtime.current_cutpoint) < 0,
    );
    if (missed.length > 0) {
      throw new Error("journey_interruption_resume_requires_replan_after_missed_event");
    }
  }

  const resultCode: JourneyResultCodeV1 =
    resolution.resolution_kind === "resume"
      ? "resumed"
      : resolution.resolution_kind === "cancel"
        ? "cancelled"
        : resolution.resolution_kind === "supersede"
          ? "superseded"
          : "failed";
  let actualLocationId =
    next.presence_ledger.people_by_id[ids[0] ?? ""]?.location_id ?? null;
  const terminalPresenceEvents: JourneyPresenceEventV1[] = [];
  if (resolution.resolution_kind === "resume") {
    const status = resumedStatus(existing, resolution.journey_leg_id);
    updateArrangementRuntime(next, resolution.journey_arrangement_id, {
      status,
      active_leg_id:
        status === "in_transit" || status === "at_stop"
          ? resolution.journey_leg_id
          : null
    });
  } else {
    const disposition = resolution.terminal_presence_disposition ?? null;
    const priorLegStatus = existing.leg_status_by_id[resolution.journey_leg_id];
    if (!priorLegStatus) throw new Error("journey_interruption_resolution_unknown_leg");
    const peopleBefore = ids.map((personId) =>
      next.presence_ledger.people_by_id[personId]
    );
    const anyInTransit = peopleBefore.some((person) => person?.status === "in_transit");
    if (anyInTransit && (!disposition || !disposition.location_id.trim() ||
        !disposition.evidence_ref.trim() || disposition.source_refs.length === 0)) {
      throw new Error("journey_terminal_in_transit_requires_presence_disposition");
    }
    if (disposition) {
      const allowedLocations = new Set([
        targetLeg.from_location_id,
        targetLeg.to_location_id,
        ...targetLeg.planned_stops.map((stop) => stop.location_id),
      ]);
      if (!allowedLocations.has(disposition.location_id)) {
        throw new Error("journey_terminal_presence_not_on_admitted_leg");
      }
      const contradictoryKnownLocation = peopleBefore.some(
        (person) => person?.status === "at_location" &&
          person.location_id !== disposition.location_id,
      );
      if (contradictoryKnownLocation) {
        throw new Error("journey_terminal_presence_contradicts_known_location");
      }
      actualLocationId = disposition.location_id;
    } else {
      const knownLocations = stableUnique(
        peopleBefore
          .map((person) => person?.location_id)
          .filter((location): location is string => Boolean(location)),
      );
      if (knownLocations.length !== 1) {
        throw new Error("journey_terminal_presence_location_not_resolved");
      }
      actualLocationId = knownLocations[0]!;
    }

    const people = { ...next.presence_ledger.people_by_id };
    for (const personId of ids) {
      const prior = people[personId];
      if (!prior) throw new Error(`journey_terminal_presence_person_missing:${personId}`);
      let evidenceRefs = [...prior.evidence_refs];
      if (prior.status === "in_transit") {
        const disposition = resolution.terminal_presence_disposition!;
        const eventId = `journey-presence-event:${safeId(
          resolution.journey_arrangement_id,
        )}:${safeId(resolution.journey_leg_id)}:${journeyCutpointKey(
          resolution.effective_cutpoint,
        )}:recovered:${safeId(personId)}`;
        terminalPresenceEvents.push({
          event_id: eventId,
          person_id: personId,
          journey_arrangement_id: resolution.journey_arrangement_id,
          journey_leg_id: resolution.journey_leg_id,
          event_kind: "recovered",
          cutpoint: { ...resolution.effective_cutpoint },
          from_location_id: null,
          to_location_id: actualLocationId,
          source_refs: stableUnique([
            disposition.evidence_ref,
            ...disposition.source_refs,
            ...resolution.authority_evidence_refs,
            ...resolution.source_refs,
          ]),
        });
        evidenceRefs = stableUnique([
          ...evidenceRefs,
          eventId,
          disposition.evidence_ref,
          ...disposition.source_refs,
        ]);
      }
      people[personId] = {
        ...prior,
        status: "at_location",
        location_id: actualLocationId,
        active_journey_arrangement_id: null,
        active_journey_leg_id: null,
        evidence_refs: evidenceRefs,
      };
    }
    next.presence_ledger = { ...next.presence_ledger, people_by_id: people };
    if (terminalPresenceEvents.length > 0) {
      addPresenceEvents(next, terminalPresenceEvents);
    }
    addRealizedPartialStayAtTerminalResolution({
      runtime: next,
      arrangement,
      leg: targetLeg,
      prior_leg_status: priorLegStatus,
      cutpoint: resolution.effective_cutpoint,
      actual_location_id: actualLocationId,
      source_refs: [
        ...resolution.authority_evidence_refs,
        ...resolution.source_refs,
      ],
    });
    const status: JourneyArrangementRuntimeStatusV1 =
      resolution.resolution_kind === "cancel"
        ? "cancelled"
        : resolution.resolution_kind === "supersede"
          ? "superseded"
          : "failed";
    updateArrangementRuntime(next, resolution.journey_arrangement_id, {
      status,
      active_leg_id: null,
      leg_id: resolution.journey_leg_id,
      leg_status: priorLegStatus === "arrived" ? "arrived" : "failed"
    });
    releaseArrangementReservations(next, resolution.journey_arrangement_id);
  }
  const row = receipt({
    arrangement,
    journeyLegId: resolution.journey_leg_id,
    resultCode,
    cutpoint: resolution.effective_cutpoint,
    actualLocationId,
    namedPersonIds: ids,
    presenceEventRefs: terminalPresenceEvents.map((event) => event.event_id),
    reasonCodes: resolution.reason_codes,
    sourceRefs: [...resolution.authority_evidence_refs, ...resolution.source_refs]
  });
  addReceipt(next, row);
  markEventProcessed(
    next,
    `interruption-resolution:${resolution.journey_arrangement_id}:${resolution.journey_leg_id}:${journeyCutpointKey(resolution.effective_cutpoint)}:${resolution.resolution_kind}`
  );
  return next;
}

function applyDeparture(runtime: JourneyRuntimeV1, event: ScheduledJourneyEvent): void {
  const leg = legFor(event);
  const ids = namedIds(event);
  const conflicts = ids.filter((personId) => {
    const row = runtime.presence_ledger.people_by_id[personId];
    return !row || row.status !== "at_location" || row.location_id !== leg.from_location_id;
  });
  if (conflicts.length > 0) {
    interruptionResult(runtime, event, {
      journey_arrangement_id: event.arrangement.journey_arrangement_id,
      journey_leg_id: event.journey_leg_id,
      result_code: "support_failed",
      effective_cutpoint: event.cutpoint,
      reason_codes: conflicts.map((personId) => `presence_revalidation_failed:${personId}`),
      source_refs: ["JourneyLifecycle:departure_presence_revalidation"]
    });
    return;
  }

  const people = { ...runtime.presence_ledger.people_by_id };
  const events: JourneyPresenceEventV1[] = ids.map((personId) => {
    const prior = people[personId]!;
    const eventId = `journey-presence-event:${safeId(event.event_key)}:${safeId(personId)}`;
    people[personId] = {
      ...prior,
      status: "in_transit",
      location_id: null,
      active_journey_arrangement_id: event.arrangement.journey_arrangement_id,
      active_journey_leg_id: event.journey_leg_id,
      evidence_refs: stableUnique([...prior.evidence_refs, eventId])
    };
    return {
      event_id: eventId,
      person_id: personId,
      journey_arrangement_id: event.arrangement.journey_arrangement_id,
      journey_leg_id: event.journey_leg_id,
      event_kind: "departed",
      cutpoint: { ...event.cutpoint },
      from_location_id: leg.from_location_id,
      to_location_id: null,
      source_refs: stableUnique([...event.arrangement.source_refs, leg.selected_route_path_ref])
    };
  });
  runtime.presence_ledger = { ...runtime.presence_ledger, people_by_id: people };
  addPresenceEvents(runtime, events);
  const row = receipt({
    arrangement: event.arrangement,
    journeyLegId: event.journey_leg_id,
    resultCode: "in_transit",
    cutpoint: event.cutpoint,
    actualLocationId: null,
    namedPersonIds: ids,
    presenceEventRefs: events.map((item) => item.event_id),
    sourceRefs: [leg.selected_route_path_ref]
  });
  addReceipt(runtime, row);
  updateArrangementRuntime(runtime, event.arrangement.journey_arrangement_id, {
    status: "in_transit",
    active_leg_id: event.journey_leg_id,
    leg_id: event.journey_leg_id,
    leg_status: "in_transit"
  });
}

function applyStopArrival(runtime: JourneyRuntimeV1, event: ScheduledJourneyEvent): void {
  const stop = event.stop!;
  const ids = namedIds(event);
  const people = { ...runtime.presence_ledger.people_by_id };
  const events: JourneyPresenceEventV1[] = ids.map((personId) => {
    const prior = people[personId]!;
    const eventId = `journey-presence-event:${safeId(event.event_key)}:${safeId(personId)}`;
    people[personId] = {
      ...prior,
      status: "at_location",
      location_id: stop.location_id,
      evidence_refs: stableUnique([...prior.evidence_refs, eventId])
    };
    return {
      event_id: eventId,
      person_id: personId,
      journey_arrangement_id: event.arrangement.journey_arrangement_id,
      journey_leg_id: event.journey_leg_id,
      event_kind: "stop_arrived",
      cutpoint: { ...event.cutpoint },
      from_location_id: null,
      to_location_id: stop.location_id,
      source_refs: stableUnique([...event.arrangement.source_refs, ...stop.source_refs, stop.admission_ref])
    };
  });
  runtime.presence_ledger = { ...runtime.presence_ledger, people_by_id: people };
  addPresenceEvents(runtime, events);
  updateArrangementRuntime(runtime, event.arrangement.journey_arrangement_id, {
    status: "at_stop",
    active_leg_id: event.journey_leg_id,
    leg_id: event.journey_leg_id,
    leg_status: "at_stop"
  });
}

function stayFactForStop(event: ScheduledJourneyEvent): JourneyStayFactV1 {
  const leg = legFor(event);
  const stop = event.stop!;
  const aggregate = leg.aggregate_party;
  return {
    stay_fact_id: `journey-stay-fact:${safeId(event.arrangement.journey_arrangement_id)}:${safeId(stop.stop_id)}`,
    journey_arrangement_id: event.arrangement.journey_arrangement_id,
    journey_leg_id: event.journey_leg_id,
    location_id: stop.location_id,
    provider_kind: stop.provider_kind,
    host_entity_id: stop.host_entity_id,
    admission_ref: stop.admission_ref,
    arrival_cutpoint: { ...stop.arrival_cutpoint },
    departure_cutpoint: { ...stop.departure_cutpoint },
    named_person_count: leg.named_party.length,
    aggregate_service_person_count:
      aggregate.ordinary_attendant_count +
      aggregate.guard_rank_and_file_count +
      aggregate.driver_groom_handler_count +
      aggregate.other_service_person_count,
    animal_count: aggregate.riding_animal_count + aggregate.pack_animal_count,
    cart_wagon_count: aggregate.cart_wagon_count,
    source_refs: stableUnique([...event.arrangement.source_refs, ...stop.source_refs, stop.admission_ref])
  };
}

function applyStopDeparture(runtime: JourneyRuntimeV1, event: ScheduledJourneyEvent): void {
  const stop = event.stop!;
  const ids = namedIds(event);
  const people = { ...runtime.presence_ledger.people_by_id };
  const events: JourneyPresenceEventV1[] = ids.map((personId) => {
    const prior = people[personId]!;
    const eventId = `journey-presence-event:${safeId(event.event_key)}:${safeId(personId)}`;
    people[personId] = {
      ...prior,
      status: "in_transit",
      location_id: null,
      evidence_refs: stableUnique([...prior.evidence_refs, eventId])
    };
    return {
      event_id: eventId,
      person_id: personId,
      journey_arrangement_id: event.arrangement.journey_arrangement_id,
      journey_leg_id: event.journey_leg_id,
      event_kind: "stop_departed",
      cutpoint: { ...event.cutpoint },
      from_location_id: stop.location_id,
      to_location_id: null,
      source_refs: stableUnique([...event.arrangement.source_refs, ...stop.source_refs, stop.admission_ref])
    };
  });
  runtime.presence_ledger = { ...runtime.presence_ledger, people_by_id: people };
  addPresenceEvents(runtime, events);
  addStayFact(runtime, stayFactForStop(event));
  updateArrangementRuntime(runtime, event.arrangement.journey_arrangement_id, {
    status: "in_transit",
    active_leg_id: event.journey_leg_id,
    leg_id: event.journey_leg_id,
    leg_status: "in_transit"
  });
}

function finalArrivalResult(arrangement: JourneyArrangementV1, isFinalLeg: boolean): JourneyResultCodeV1 {
  if (!isFinalLeg) return "arrived";
  const dispositions = stableUnique(arrangement.legs.at(-1)!.named_party.map((member) => member.arrival_disposition));
  if (dispositions.length !== 1) return "arrived";
  if (dispositions[0] === "return") return "returned";
  if (dispositions[0] === "remain" || dispositions[0] === "transfer") return "remained";
  if (dispositions[0] === "onward") return "continued_onward";
  return "arrived";
}

function handoffsForFinalArrival(event: ScheduledJourneyEvent): JourneyDomainHandoffIntentV1[] {
  const leg = legFor(event);
  const isFinal = event.arrangement.legs.at(-1)?.route_leg_id === leg.route_leg_id;
  if (!isFinal) return [];
  return leg.named_party
    .filter((member) => member.arrival_disposition !== "return")
    .map((member) => ({
      handoff_id: `journey-domain-handoff:${safeId(event.arrangement.journey_arrangement_id)}:${safeId(member.person_id)}:${member.arrival_disposition}`,
      journey_arrangement_id: event.arrangement.journey_arrangement_id,
      journey_leg_id: leg.route_leg_id,
      person_id: member.person_id,
      owning_domain: event.arrangement.owning_domain,
      disposition: member.arrival_disposition,
      arrived_location_id: leg.to_location_id,
      authority_evidence_refs: [...event.arrangement.authority_evidence_refs],
      source_refs: stableUnique([...event.arrangement.source_refs, leg.selected_route_path_ref]),
      mutation_applied_by_journey: false as const
    }));
}

function applyArrival(runtime: JourneyRuntimeV1, event: ScheduledJourneyEvent): void {
  const leg = legFor(event);
  const ids = namedIds(event);
  const people = { ...runtime.presence_ledger.people_by_id };
  const events: JourneyPresenceEventV1[] = ids.map((personId) => {
    const prior = people[personId]!;
    const eventId = `journey-presence-event:${safeId(event.event_key)}:${safeId(personId)}`;
    people[personId] = {
      ...prior,
      status: "at_location",
      location_id: leg.to_location_id,
      active_journey_arrangement_id: null,
      active_journey_leg_id: null,
      evidence_refs: stableUnique([...prior.evidence_refs, eventId])
    };
    return {
      event_id: eventId,
      person_id: personId,
      journey_arrangement_id: event.arrangement.journey_arrangement_id,
      journey_leg_id: event.journey_leg_id,
      event_kind: "arrived",
      cutpoint: { ...event.cutpoint },
      from_location_id: null,
      to_location_id: leg.to_location_id,
      source_refs: stableUnique([...event.arrangement.source_refs, leg.selected_route_path_ref])
    };
  });
  runtime.presence_ledger = { ...runtime.presence_ledger, people_by_id: people };
  addPresenceEvents(runtime, events);
  const handoffs = handoffsForFinalArrival(event);
  addHandoffs(runtime, handoffs);
  const isFinal = event.arrangement.legs.at(-1)?.route_leg_id === leg.route_leg_id;
  const finalStayStillOpen = Boolean(
    isFinal &&
    event.arrangement.planned_destination_stay &&
    compareJourneyCutpoints(
      event.cutpoint,
      event.arrangement.planned_destination_stay.departure_cutpoint,
    ) < 0,
  );
  const resultCode = finalArrivalResult(event.arrangement, isFinal);
  const row = receipt({
    arrangement: event.arrangement,
    journeyLegId: event.journey_leg_id,
    resultCode,
    cutpoint: event.cutpoint,
    actualLocationId: leg.to_location_id,
    namedPersonIds: ids,
    presenceEventRefs: events.map((item) => item.event_id),
    domainHandoffIntentRefs: handoffs.map((item) => item.handoff_id),
    sourceRefs: [leg.selected_route_path_ref]
  });
  addReceipt(runtime, row);
  updateArrangementRuntime(runtime, event.arrangement.journey_arrangement_id, {
    status: isFinal && !finalStayStillOpen ? "completed" : "at_destination",
    active_leg_id: null,
    leg_id: event.journey_leg_id,
    leg_status: "arrived"
  });
  if (isFinal && !finalStayStillOpen) {
    releaseArrangementReservations(
      runtime,
      event.arrangement.journey_arrangement_id,
    );
  }
}

function applyDestinationStayEnd(runtime: JourneyRuntimeV1, event: ScheduledJourneyEvent): void {
  const stay = event.arrangement.planned_destination_stay;
  if (!stay) return;
  const leg = legFor(event);
  const aggregate = leg.aggregate_party;
  addStayFact(runtime, {
    stay_fact_id: `journey-stay-fact:${safeId(event.arrangement.journey_arrangement_id)}:destination`,
    journey_arrangement_id: event.arrangement.journey_arrangement_id,
    journey_leg_id: leg.route_leg_id,
    location_id: leg.to_location_id,
    provider_kind: "journey_destination",
    host_entity_id: event.arrangement.hosting_entity_id,
    admission_ref: event.arrangement.hosting_visit_arrangement_id ?? event.arrangement.sponsor_and_support_basis_ref,
    arrival_cutpoint: { ...stay.arrival_cutpoint },
    departure_cutpoint: { ...stay.departure_cutpoint },
    named_person_count: leg.named_party.length,
    aggregate_service_person_count:
      aggregate.ordinary_attendant_count +
      aggregate.guard_rank_and_file_count +
      aggregate.driver_groom_handler_count +
      aggregate.other_service_person_count,
    animal_count: aggregate.riding_animal_count + aggregate.pack_animal_count,
    cart_wagon_count: aggregate.cart_wagon_count,
    source_refs: stableUnique([
      ...event.arrangement.source_refs,
      event.arrangement.hosting_visit_arrangement_id ?? event.arrangement.sponsor_and_support_basis_ref
    ])
  });
  const isFinal = event.arrangement.legs.at(-1)?.route_leg_id === leg.route_leg_id;
  if (isFinal) {
    updateArrangementRuntime(runtime, event.arrangement.journey_arrangement_id, {
      status: "completed",
      active_leg_id: null,
    });
    releaseArrangementReservations(
      runtime,
      event.arrangement.journey_arrangement_id,
    );
  }
}

function markEventProcessed(runtime: JourneyRuntimeV1, key: string): void {
  runtime.presence_ledger = {
    ...runtime.presence_ledger,
    processed_event_keys: stableUnique([...runtime.presence_ledger.processed_event_keys, key])
  };
}

export function advanceJourneyRuntime(
  runtime: JourneyRuntimeV1,
  targetCutpoint: JourneyCutpointV1,
  interruptions: readonly JourneyLifecycleInterruptionV1[] = []
): JourneyRuntimeV1 {
  if (!validJourneyCutpoint(targetCutpoint)) throw new Error("invalid_target_cutpoint");
  if (compareJourneyCutpoints(targetCutpoint, runtime.current_cutpoint) < 0) throw new Error("journey_runtime_cannot_reverse_time");
  const next = cloneRuntime(runtime);
  const processed = new Set(next.presence_ledger.processed_event_keys);
  const terminalStatuses = new Set<JourneyArrangementRuntimeStatusV1>(["cancelled", "superseded", "failed"]);
  for (const interruption of interruptions) {
    const interruptionKey = `interruption:${interruption.journey_arrangement_id}:${interruption.journey_leg_id}:${journeyCutpointKey(interruption.effective_cutpoint)}:${interruption.result_code}`;
    if (processed.has(interruptionKey)) continue;
    if (!validJourneyCutpoint(interruption.effective_cutpoint)) {
      throw new Error("invalid_journey_interruption_cutpoint");
    }
    if (compareJourneyCutpoints(interruption.effective_cutpoint, next.current_cutpoint) < 0) {
      throw new Error("journey_interruption_before_runtime_cutpoint");
    }
    if (interruption.reason_codes.length === 0 || interruption.source_refs.length === 0) {
      throw new Error("journey_interruption_requires_reason_and_provenance");
    }
    const arrangement = next.arrangements_by_id[interruption.journey_arrangement_id];
    if (!arrangement) throw new Error("journey_interruption_unknown_arrangement");
    if (!arrangement.legs.some((leg) => leg.route_leg_id === interruption.journey_leg_id)) {
      throw new Error("journey_interruption_unknown_leg");
    }
  }

  const events = Object.values(next.arrangements_by_id)
    .flatMap(scheduledEvents)
    .filter(
      (event) =>
        !processed.has(event.event_key) &&
        compareJourneyCutpoints(event.cutpoint, next.current_cutpoint) >= 0 &&
        compareJourneyCutpoints(event.cutpoint, targetCutpoint) <= 0
    )
    .map((event) => ({ item_kind: "event" as const, event, cutpoint: event.cutpoint }));
  const interruptionEvents = interruptions
    .filter((interruption) => {
      const key = `interruption:${interruption.journey_arrangement_id}:${interruption.journey_leg_id}:${journeyCutpointKey(interruption.effective_cutpoint)}:${interruption.result_code}`;
      return (
        !processed.has(key) &&
        compareJourneyCutpoints(interruption.effective_cutpoint, next.current_cutpoint) >= 0 &&
        compareJourneyCutpoints(interruption.effective_cutpoint, targetCutpoint) <= 0
      );
    })
    .map((interruption) => ({
      item_kind: "interruption" as const,
      interruption,
      cutpoint: interruption.effective_cutpoint
    }));
  const timeline = [...events, ...interruptionEvents]
    .sort((left, right) => {
      const time = journeyCutpointOrdinal(left.cutpoint) - journeyCutpointOrdinal(right.cutpoint);
      if (time !== 0) return time;
      if (left.item_kind !== right.item_kind) {
        return left.item_kind === "interruption" ? -1 : 1;
      }
      if (left.item_kind === "interruption" && right.item_kind === "interruption") {
        return compareStable(
          `${left.interruption.journey_arrangement_id}:${left.interruption.journey_leg_id}:${left.interruption.result_code}`,
          `${right.interruption.journey_arrangement_id}:${right.interruption.journey_leg_id}:${right.interruption.result_code}`
        );
      }
      if (left.item_kind !== "event" || right.item_kind !== "event") return 0;
      const priority = EVENT_PRIORITY[left.event.kind] - EVENT_PRIORITY[right.event.kind];
      if (priority !== 0) return priority;
      return compareStable(left.event.event_key, right.event.event_key);
    });

  for (const item of timeline) {
    if (item.item_kind === "interruption") {
      const interruption = item.interruption;
      const interruptionKey = `interruption:${interruption.journey_arrangement_id}:${interruption.journey_leg_id}:${journeyCutpointKey(interruption.effective_cutpoint)}:${interruption.result_code}`;
      const row = next.runtime_by_arrangement_id[interruption.journey_arrangement_id];
      if (!row || terminalStatuses.has(row.status) || row.status === "completed") {
        throw new Error("journey_interruption_arrangement_not_active");
      }
      if (row.status === "needs_review") continue;
      const arrangement = next.arrangements_by_id[interruption.journey_arrangement_id]!;
      const targetFailure = interruptionTargetFailure(
        next,
        arrangement,
        row,
        interruption.journey_leg_id,
      );
      if (targetFailure) throw new Error(targetFailure);
      interruptionResult(next, interruptionEvent(arrangement, interruption), interruption);
      markEventProcessed(next, interruptionKey);
      processed.add(interruptionKey);
      continue;
    }

    const event = item.event;
    const row = next.runtime_by_arrangement_id[event.arrangement.journey_arrangement_id];
    if (!row || terminalStatuses.has(row.status) || row.status === "needs_review") {
      continue;
    }
    if (event.kind === "departure") applyDeparture(next, event);
    else if (event.kind === "stop_arrival") applyStopArrival(next, event);
    else if (event.kind === "stop_departure") applyStopDeparture(next, event);
    else if (event.kind === "arrival") applyArrival(next, event);
    else applyDestinationStayEnd(next, event);
    markEventProcessed(next, event.event_key);
    processed.add(event.event_key);
  }

  next.current_cutpoint = { ...targetCutpoint };
  next.presence_ledger = { ...next.presence_ledger, current_cutpoint: { ...targetCutpoint } };
  return next;
}

export function validateJourneyRuntime(runtime: JourneyRuntimeV1): string[] {
  const failures: string[] = [];
  if (runtime.schema_version !== JOURNEY_RUNTIME_SCHEMA_VERSION) failures.push("unsupported_runtime_schema");
  if (!validJourneyCutpoint(runtime.current_cutpoint)) failures.push("invalid_runtime_cutpoint");
  if (compareJourneyCutpoints(runtime.current_cutpoint, runtime.presence_ledger.current_cutpoint) !== 0) {
    failures.push("runtime_presence_cutpoint_mismatch");
  }
  for (const [arrangementId, arrangement] of Object.entries(runtime.arrangements_by_id)) {
    if (!runtime.runtime_by_arrangement_id[arrangementId]) failures.push(`missing_runtime_row:${arrangementId}`);
    failures.push(...arrangementFailures(arrangement).map((failure) => `${arrangementId}:${failure}`));
  }
  for (const person of Object.values(runtime.presence_ledger.people_by_id)) {
    if (person.status === "at_location" && !person.location_id) failures.push(`present_person_missing_location:${person.person_id}`);
    if (person.status === "in_transit" && person.location_id) failures.push(`in_transit_person_has_location:${person.person_id}`);
    if (person.status === "in_transit" &&
        (!person.active_journey_arrangement_id || !person.active_journey_leg_id)) {
      failures.push(`in_transit_person_missing_active_journey:${person.person_id}`);
    }
    if (person.active_journey_arrangement_id) {
      const active = runtime.runtime_by_arrangement_id[
        person.active_journey_arrangement_id
      ];
      if (!active) {
        failures.push(`person_active_journey_missing_runtime:${person.person_id}`);
      } else if (["completed", "cancelled", "superseded", "failed"].includes(active.status)) {
        failures.push(`person_linked_to_terminal_journey:${person.person_id}:${active.status}`);
      }
    }
  }
  const reservations = runtime.presence_ledger.reservations;
  for (const reservation of reservations) {
    const status = runtime.runtime_by_arrangement_id[
      reservation.journey_arrangement_id
    ]?.status;
    if (status && ["completed", "cancelled", "superseded", "failed"].includes(status)) {
      failures.push(`terminal_journey_retains_reservation:${reservation.reservation_id}`);
    }
  }
  for (let leftIndex = 0; leftIndex < reservations.length; leftIndex += 1) {
    const left = reservations[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < reservations.length; rightIndex += 1) {
      const right = reservations[rightIndex]!;
      if (left.person_id !== right.person_id) continue;
      if (
        journeyIntervalsOverlap(
          left.opening_cutpoint,
          left.closing_cutpoint,
          right.opening_cutpoint,
          right.closing_cutpoint
        )
      ) failures.push(`overlapping_presence_reservations:${left.person_id}:${left.reservation_id}:${right.reservation_id}`);
    }
  }
  return stableUnique(failures);
}
