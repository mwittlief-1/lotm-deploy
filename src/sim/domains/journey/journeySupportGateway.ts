import {
  COMMITMENT_ECONOMY_BRIDGE_ID,
  COMMITMENT_ECONOMY_BRIDGE_SCHEMA_VERSION,
  submitCommitmentEconomicRequest,
  type CommitmentEconomyBridgeResultV1,
  type CommitmentEconomyExactRequestV1,
  type CommitmentEconomyGatewayV1,
  type CommitmentEconomyResourceKindV1
} from "../world/foundation/commitmentEconomyBridge";
import type {
  JourneyArrangementV1,
  JourneyCutpointV1,
  JourneyPresenceEventV1,
  JourneyStayFactV1
} from "./journeyContracts";
import type { JourneyRuntimeV1 } from "./journeyLifecycle";
import {
  journeyCutpointDayOrdinal,
  journeyCutpointOrdinal
} from "./journeyTime";

export const JOURNEY_SUPPORT_OBSERVATION_SCHEMA_VERSION = "phase_five_journey_support_observation_v1" as const;
export const JOURNEY_SUPPORT_GATEWAY_BRIDGE_SCHEMA_VERSION = "phase_five_journey_support_gateway_bridge_v1" as const;

export type JourneySupportObservationKindV1 = "travel_leg" | "hosted_stop" | "destination_stay";

export interface JourneySupportDemandObservationV1 {
  schema_version: typeof JOURNEY_SUPPORT_OBSERVATION_SCHEMA_VERSION;
  observation_id: string;
  observation_kind: JourneySupportObservationKindV1;
  route_completion_state: "completed_leg" | "terminal_partial" | null;
  journey_arrangement_id: string;
  journey_leg_id: string;
  location_or_route_ref: string;
  host_entity_id: string | null;
  opening_cutpoint: JourneyCutpointV1;
  closing_cutpoint: JourneyCutpointV1;
  elapsed_days: number;
  named_person_count: number;
  aggregate_service_person_count: number;
  human_person_days: number;
  animal_count: number;
  animal_days: number;
  cart_wagon_count: number;
  cart_wagon_days: number;
  requested_gateway_kinds: readonly (
    | "food"
    | "craft_goods"
    | "household_service_capacity"
    | "animal_support"
    | "carrier"
    | "toll_or_ferry"
    | "lodging"
    | "escort"
  )[];
  sponsor_and_support_basis_ref: string;
  source_refs: readonly string[];
  direct_resource_or_gl_mutation: false;
  direct_hsu_mutation: false;
}

export interface JourneyDemandGatewayEvidenceV1 {
  observation_id: string;
  status: "accepted" | "withheld" | "rejected";
  evidence_id: string;
  reason_codes: readonly string[];
  source_refs: readonly string[];
}

export interface JourneyDemandGatewayV1 {
  submitActualJourneyDemand(
    observation: Readonly<JourneySupportDemandObservationV1>
  ): JourneyDemandGatewayEvidenceV1;
}

export interface JourneyDemandBridgeEvidenceV1 {
  observation_id: string;
  status: "accepted" | "withheld" | "rejected";
  request_forwarded: boolean;
  gateway_evidence_id: string | null;
  reason_codes: readonly string[];
  source_refs: readonly string[];
  direct_resource_or_gl_mutation: false;
  direct_hsu_mutation: false;
}

export interface JourneyAdmittedEconomicTermV1 {
  term_id: string;
  observation_id: string;
  economic_leg_id: string;
  resource_kind: CommitmentEconomyResourceKindV1;
  quantity: number;
  unit: string;
  due_at: string;
  settlement_mode: string;
  payer: CommitmentEconomyExactRequestV1["payer"];
  payee: CommitmentEconomyExactRequestV1["payee"];
  authority_ref: string;
  source_refs: readonly string[];
}

export interface JourneySupportGatewayBridgeResultV1 {
  schema_version: typeof JOURNEY_SUPPORT_GATEWAY_BRIDGE_SCHEMA_VERSION;
  observations: readonly JourneySupportDemandObservationV1[];
  demand_evidence: readonly JourneyDemandBridgeEvidenceV1[];
  economy_evidence: readonly CommitmentEconomyBridgeResultV1[];
  direct_resource_or_gl_mutation: false;
  direct_hsu_mutation: false;
}

function compareStable(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableUnique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(compareStable);
}

function safeId(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9:_.-]+/gu, "_");
}

function elapsedCutpointDays(opening: JourneyCutpointV1, closing: JourneyCutpointV1): number {
  return Math.max(
    1,
    journeyCutpointDayOrdinal(closing) - journeyCutpointDayOrdinal(opening)
  );
}

function aggregateServiceCount(arrangement: JourneyArrangementV1, legId: string): number {
  const aggregate = arrangement.legs.find((leg) => leg.route_leg_id === legId)!.aggregate_party;
  return (
    aggregate.ordinary_attendant_count +
    aggregate.guard_rank_and_file_count +
    aggregate.driver_groom_handler_count +
    aggregate.other_service_person_count
  );
}

function observationFromStay(arrangement: JourneyArrangementV1, stay: JourneyStayFactV1): JourneySupportDemandObservationV1 {
  const elapsedDays = elapsedCutpointDays(stay.arrival_cutpoint, stay.departure_cutpoint);
  const humanCount = stay.named_person_count + stay.aggregate_service_person_count;
  const requested = [
    "food",
    "craft_goods",
    "household_service_capacity",
    "animal_support",
    ...(stay.provider_kind === "eligible_aggregate_commercial" ? (["lodging"] as const) : [])
  ] as const;
  return {
    schema_version: JOURNEY_SUPPORT_OBSERVATION_SCHEMA_VERSION,
    observation_id: `journey-support-observation:${safeId(stay.stay_fact_id)}`,
    observation_kind: stay.provider_kind === "journey_destination" ? "destination_stay" : "hosted_stop",
    route_completion_state: null,
    journey_arrangement_id: stay.journey_arrangement_id,
    journey_leg_id: stay.journey_leg_id,
    location_or_route_ref: stay.location_id,
    host_entity_id: stay.host_entity_id,
    opening_cutpoint: { ...stay.arrival_cutpoint },
    closing_cutpoint: { ...stay.departure_cutpoint },
    elapsed_days: elapsedDays,
    named_person_count: stay.named_person_count,
    aggregate_service_person_count: stay.aggregate_service_person_count,
    human_person_days: humanCount * elapsedDays,
    animal_count: stay.animal_count,
    animal_days: stay.animal_count * elapsedDays,
    cart_wagon_count: stay.cart_wagon_count,
    cart_wagon_days: stay.cart_wagon_count * elapsedDays,
    requested_gateway_kinds: requested,
    sponsor_and_support_basis_ref: arrangement.sponsor_and_support_basis_ref,
    source_refs: stableUnique([...arrangement.source_refs, ...stay.source_refs]),
    direct_resource_or_gl_mutation: false,
    direct_hsu_mutation: false
  };
}

function successfulArrivalForLeg(events: readonly JourneyPresenceEventV1[], arrangementId: string, legId: string) {
  return events
    .filter(
      (event) =>
        event.journey_arrangement_id === arrangementId &&
        event.journey_leg_id === legId &&
        event.event_kind === "arrived"
    )
    .sort((left, right) => journeyCutpointOrdinal(left.cutpoint) - journeyCutpointOrdinal(right.cutpoint))[0];
}

function successfulDepartureForLeg(events: readonly JourneyPresenceEventV1[], arrangementId: string, legId: string) {
  return events
    .filter(
      (event) =>
        event.journey_arrangement_id === arrangementId &&
        event.journey_leg_id === legId &&
        event.event_kind === "departed"
    )
    .sort((left, right) => journeyCutpointOrdinal(left.cutpoint) - journeyCutpointOrdinal(right.cutpoint))[0];
}

function travelObservation(
  runtime: JourneyRuntimeV1,
  arrangement: JourneyArrangementV1,
  legId: string
): JourneySupportDemandObservationV1 | null {
  const leg = arrangement.legs.find((row) => row.route_leg_id === legId);
  if (!leg) return null;
  const departure = successfulDepartureForLeg(runtime.presence_ledger.presence_events, arrangement.journey_arrangement_id, legId);
  const arrival = successfulArrivalForLeg(runtime.presence_ledger.presence_events, arrangement.journey_arrangement_id, legId);
  if (!departure) return null;
  const terminalReceipt = arrival
    ? null
    : runtime.presence_ledger.receipts
        .filter(
          (row) =>
            row.journey_arrangement_id === arrangement.journey_arrangement_id &&
            row.journey_leg_id === legId &&
            ["cancelled", "superseded", "failed"].includes(row.result_code) &&
            journeyCutpointOrdinal(row.cutpoint) >=
              journeyCutpointOrdinal(departure.cutpoint),
        )
        .sort(
          (left, right) =>
            journeyCutpointOrdinal(left.cutpoint) -
              journeyCutpointOrdinal(right.cutpoint),
        )[0] ?? null;
  if (!arrival && !terminalReceipt) return null;
  // Route calibration expresses moving time. Hosted/self-supported stops are
  // separate realized stay observations and must not be subtracted from it.
  // A terminal partial leg instead uses elapsed support time less any realized
  // stop stays. It makes no assertion that distance or a crossing was
  // completed; it only preserves the Food/Goods/HSU/animal/carrier burden
  // actually carried between departure and the evidenced terminal cutpoint.
  const closingCutpoint = arrival?.cutpoint ?? terminalReceipt!.cutpoint;
  const routeElapsedDays = Math.max(
    1,
    journeyCutpointDayOrdinal(closingCutpoint) -
      journeyCutpointDayOrdinal(departure.cutpoint),
  );
  const realizedStayDays = arrival
    ? 0
    : runtime.presence_ledger.stay_facts
        .filter(
          (stay) =>
            stay.journey_arrangement_id === arrangement.journey_arrangement_id &&
            stay.journey_leg_id === legId,
        )
        .reduce((total, stay) => {
          const opening = Math.max(
            journeyCutpointDayOrdinal(departure.cutpoint),
            journeyCutpointDayOrdinal(stay.arrival_cutpoint),
          );
          const closing = Math.min(
            journeyCutpointDayOrdinal(closingCutpoint),
            journeyCutpointDayOrdinal(stay.departure_cutpoint),
          );
          return total + Math.max(0, closing - opening);
        }, 0);
  const elapsedDays = arrival
    ? Math.max(1, Math.round(leg.expected_travel_days))
    : Math.max(1, routeElapsedDays - realizedStayDays);
  const aggregateService = aggregateServiceCount(arrangement, legId);
  const namedCount = leg.named_party.length;
  const animalCount = leg.aggregate_party.riding_animal_count + leg.aggregate_party.pack_animal_count;
  const requested = [
    "food",
    "craft_goods",
    "household_service_capacity",
    "animal_support",
    ...(arrival && leg.crossing_access_right_refs.length > 0
      ? (["toll_or_ferry"] as const)
      : []),
    ...(leg.aggregate_party.cart_wagon_count > 0 ? (["carrier"] as const) : []),
    ...(leg.aggregate_party.guard_rank_and_file_count > 0 ? (["escort"] as const) : [])
  ] as const;
  return {
    schema_version: JOURNEY_SUPPORT_OBSERVATION_SCHEMA_VERSION,
    observation_id: `journey-support-observation:${safeId(arrangement.journey_arrangement_id)}:${safeId(legId)}:${arrival ? "travel" : "travel-partial"}`,
    observation_kind: "travel_leg",
    route_completion_state: arrival ? "completed_leg" : "terminal_partial",
    journey_arrangement_id: arrangement.journey_arrangement_id,
    journey_leg_id: legId,
    location_or_route_ref: leg.selected_route_path_ref,
    host_entity_id: null,
    opening_cutpoint: { ...departure.cutpoint },
    closing_cutpoint: { ...closingCutpoint },
    elapsed_days: elapsedDays,
    named_person_count: namedCount,
    aggregate_service_person_count: aggregateService,
    human_person_days: (namedCount + aggregateService) * elapsedDays,
    animal_count: animalCount,
    animal_days: animalCount * elapsedDays,
    cart_wagon_count: leg.aggregate_party.cart_wagon_count,
    cart_wagon_days: leg.aggregate_party.cart_wagon_count * elapsedDays,
    requested_gateway_kinds: requested,
    sponsor_and_support_basis_ref: arrangement.sponsor_and_support_basis_ref,
    source_refs: stableUnique([
      ...arrangement.source_refs,
      ...leg.source_refs,
      ...leg.crossing_access_right_refs,
      departure.event_id,
      ...(arrival ? [arrival.event_id] : [terminalReceipt!.journey_receipt_id]),
    ]),
    direct_resource_or_gl_mutation: false,
    direct_hsu_mutation: false
  };
}

export function buildJourneySupportDemandObservations(
  runtime: JourneyRuntimeV1,
  runtimeAuthoritativeArrangementIds: ReadonlySet<string>,
): JourneySupportDemandObservationV1[] {
  const rows: JourneySupportDemandObservationV1[] = [];
  for (const arrangement of Object.values(runtime.arrangements_by_id).sort((left, right) =>
    compareStable(left.journey_arrangement_id, right.journey_arrangement_id)
  )) {
    if (!runtimeAuthoritativeArrangementIds.has(arrangement.journey_arrangement_id)) continue;
    if (arrangement.legs.some((leg) => leg.source_status !== "admitted")) continue;
    for (const leg of arrangement.legs) {
      const travel = travelObservation(runtime, arrangement, leg.route_leg_id);
      if (travel) rows.push(travel);
    }
  }
  for (const stay of [...runtime.presence_ledger.stay_facts].sort((left, right) => compareStable(left.stay_fact_id, right.stay_fact_id))) {
    if (!runtimeAuthoritativeArrangementIds.has(stay.journey_arrangement_id)) continue;
    const arrangement = runtime.arrangements_by_id[stay.journey_arrangement_id];
    if (arrangement) rows.push(observationFromStay(arrangement, stay));
  }
  return rows.sort((left, right) => compareStable(left.observation_id, right.observation_id));
}

function submitDemand(
  observation: JourneySupportDemandObservationV1,
  gateway?: JourneyDemandGatewayV1
): JourneyDemandBridgeEvidenceV1 {
  if (!gateway) {
    return {
      observation_id: observation.observation_id,
      status: "withheld",
      request_forwarded: false,
      gateway_evidence_id: null,
      reason_codes: ["journey_demand_gateway_not_bound"],
      source_refs: observation.source_refs,
      direct_resource_or_gl_mutation: false,
      direct_hsu_mutation: false
    };
  }
  const evidence = gateway.submitActualJourneyDemand(observation);
  const mismatch = evidence.observation_id !== observation.observation_id;
  const missingEvidenceId = !evidence.evidence_id.trim();
  const missingProvenance = evidence.source_refs.length === 0;
  const invalidEvidence = mismatch || missingEvidenceId || missingProvenance;
  return {
    observation_id: observation.observation_id,
    status: invalidEvidence ? "withheld" : evidence.status,
    request_forwarded: true,
    gateway_evidence_id: evidence.evidence_id || null,
    reason_codes: stableUnique([
      ...evidence.reason_codes,
      ...(mismatch ? ["gateway_observation_id_mismatch"] : []),
      ...(missingEvidenceId ? ["missing_gateway_evidence_id"] : []),
      ...(missingProvenance ? ["missing_gateway_source_refs"] : [])
    ]),
    source_refs: stableUnique([...observation.source_refs, ...evidence.source_refs]),
    direct_resource_or_gl_mutation: false,
    direct_hsu_mutation: false
  };
}

function submitEconomicTerm(
  observation: JourneySupportDemandObservationV1,
  term: JourneyAdmittedEconomicTermV1,
  gateway?: CommitmentEconomyGatewayV1
): CommitmentEconomyBridgeResultV1 {
  const requestId = `journey-economic-request:${safeId(term.term_id)}`;
  return submitCommitmentEconomicRequest(
    {
      schema_version: COMMITMENT_ECONOMY_BRIDGE_SCHEMA_VERSION,
      bridge_id: COMMITMENT_ECONOMY_BRIDGE_ID,
      submission_id: `journey-economic-submission:${safeId(term.term_id)}`,
      commitment_id: observation.journey_arrangement_id,
      commitment_admission_status: term.observation_id === observation.observation_id ? "accepted" : "withheld",
      commitment_authority_ref: term.authority_ref,
      commitment_source_refs: stableUnique([...observation.source_refs, ...term.source_refs]),
      economic_request: {
        request_id: requestId,
        idempotency_key: requestId,
        commitment_id: observation.journey_arrangement_id,
        economic_leg_id: term.economic_leg_id,
        economic_classification: "planned_commitment",
        material_term: {
          resource_kind: term.resource_kind,
          quantity: term.quantity,
          unit: term.unit,
          due_at: term.due_at,
          settlement_mode: term.settlement_mode
        },
        payer: term.payer,
        payee: term.payee,
        authority_ref: term.authority_ref,
        source_refs: stableUnique([...observation.source_refs, ...term.source_refs])
      }
    },
    gateway
  );
}

export function submitJourneySupportGatewayHandoffs(args: {
  runtime: JourneyRuntimeV1;
  runtime_authoritative_arrangement_ids: ReadonlySet<string>;
  demand_gateway?: JourneyDemandGatewayV1;
  admitted_economic_terms?: readonly JourneyAdmittedEconomicTermV1[];
  economy_gateway?: CommitmentEconomyGatewayV1;
}): JourneySupportGatewayBridgeResultV1 {
  const observations = buildJourneySupportDemandObservations(
    args.runtime,
    args.runtime_authoritative_arrangement_ids,
  );
  const byObservationId = new Map(observations.map((row) => [row.observation_id, row]));
  const economyEvidence: CommitmentEconomyBridgeResultV1[] = [];
  for (const term of [...(args.admitted_economic_terms ?? [])].sort((left, right) => compareStable(left.term_id, right.term_id))) {
    const observation = byObservationId.get(term.observation_id);
    if (!observation) continue;
    economyEvidence.push(submitEconomicTerm(observation, term, args.economy_gateway));
  }
  return {
    schema_version: JOURNEY_SUPPORT_GATEWAY_BRIDGE_SCHEMA_VERSION,
    observations,
    demand_evidence: observations.map((row) => submitDemand(row, args.demand_gateway)),
    economy_evidence: economyEvidence,
    direct_resource_or_gl_mutation: false,
    direct_hsu_mutation: false
  };
}
