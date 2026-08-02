import partyProfilesJson from "../../../../config/journey_party_profiles_v1.json";
import {
  JOURNEY_ARRANGEMENT_SCHEMA_VERSION,
  JOURNEY_REQUEST_SCHEMA_VERSION,
  type JourneyAggregatePartyCompositionV1,
  type JourneyArrangementResultV1,
  type JourneyArrangementV1,
  type JourneyContinuationKindV1,
  type JourneyCutpointV1,
  type JourneyNamedPartyInputV1,
  type JourneyPartyCalibrationInputV1,
  type JourneyRequestV1,
  type JourneyResolvedRouteLegV1,
  type JourneyRouteResolverV1,
  type JourneyWindowV1
} from "./journeyContracts";
import { compareJourneyCutpoints, validJourneyCutpoint } from "./journeyTime";

type PartyProfileConfig = {
  ordinary_attendants: number;
  guards: number;
  handlers: number;
  other_service: number;
  riding_animals_per_named_person: number;
  pack_animals: number;
  carts: number;
  baggage: JourneyAggregatePartyCompositionV1["baggage_support_band"];
};

type PartyProfileConfigV1 = {
  schema_version: "phase_five_journey_party_profiles_v1";
  profiles: Record<JourneyPartyCalibrationInputV1["profile_key"], PartyProfileConfig>;
  house_posture_adjustments: Record<
    JourneyPartyCalibrationInputV1["house_posture"],
    { attendants: number; guards: number; pack_animals: number }
  >;
  means_adjustments: Record<
    JourneyPartyCalibrationInputV1["means_band"],
    { optional_attendant_delta: number; pack_animal_delta: number }
  >;
  armed_posture_minimum_guards: Record<JourneyPartyCalibrationInputV1["armed_posture"], number>;
  winter_extra_pack_animals: number;
  source_refs: string[];
};

const PARTY_PROFILE_CONFIG = partyProfilesJson as PartyProfileConfigV1;

function compareStable(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function clean(value: string): string {
  return value.trim();
}

function stableUnique(values: readonly string[]): string[] {
  return [...new Set(values.map(clean).filter(Boolean))].sort(compareStable);
}

function nonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function safeId(value: string): string {
  return clean(value).replace(/[^A-Za-z0-9:_.-]+/gu, "_");
}

export function calibrateJourneyAggregateParty(
  input: JourneyPartyCalibrationInputV1
): JourneyAggregatePartyCompositionV1 {
  const profile = PARTY_PROFILE_CONFIG.profiles[input.profile_key];
  const house = PARTY_PROFILE_CONFIG.house_posture_adjustments[input.house_posture];
  const means = PARTY_PROFILE_CONFIG.means_adjustments[input.means_band];
  const namedCount = Math.max(1, nonNegativeInteger(input.named_party_count));
  const ordinaryAttendants = Math.max(
    0,
    profile.ordinary_attendants + house.attendants + means.optional_attendant_delta
  );
  const guards = Math.max(
    profile.guards + house.guards,
    PARTY_PROFILE_CONFIG.armed_posture_minimum_guards[input.armed_posture]
  );
  const winterPack = input.season === "winter" ? PARTY_PROFILE_CONFIG.winter_extra_pack_animals : 0;

  return {
    ordinary_attendant_count: nonNegativeInteger(ordinaryAttendants),
    guard_rank_and_file_count: nonNegativeInteger(guards),
    driver_groom_handler_count: nonNegativeInteger(profile.handlers),
    other_service_person_count: nonNegativeInteger(profile.other_service),
    riding_animal_count: nonNegativeInteger(Math.ceil(profile.riding_animals_per_named_person * namedCount)),
    pack_animal_count: nonNegativeInteger(
      profile.pack_animals + house.pack_animals + means.pack_animal_delta + winterPack
    ),
    cart_wagon_count: nonNegativeInteger(profile.carts),
    baggage_support_band: profile.baggage,
    armed_posture: input.armed_posture,
    aggregate_source_basis: [
      `profile:${input.profile_key}`,
      `house_posture:${input.house_posture}`,
      `means:${input.means_band}`,
      `season:${input.season}`,
      `armed_posture:${input.armed_posture}`,
      `named_party_count:${namedCount}`
    ].join("|"),
    source_refs: stableUnique([...PARTY_PROFILE_CONFIG.source_refs, ...input.source_refs])
  };
}

function validWindow(window: JourneyWindowV1): boolean {
  return (
    validJourneyCutpoint(window.earliest_departure) &&
    validJourneyCutpoint(window.latest_arrival) &&
    compareJourneyCutpoints(window.earliest_departure, window.latest_arrival) <= 0
  );
}

export interface JourneyRequestValidationContextV1 {
  registered_trigger_ids: ReadonlySet<string>;
  known_person_ids: ReadonlySet<string>;
  actual_presence_by_person_id: Readonly<Record<string, { location_id: string | null }>>;
  /**
   * An admitted Journey commitment may establish where a named person will be
   * before a later request departs. This is deliberately narrower than a
   * caller-supplied location override: the orchestrator may populate it only
   * from an already-admitted, nonterminal Journey lifecycle record.
   */
  future_origin_commitment_by_person_id?: Readonly<Record<string, {
    location_id: string;
    available_cutpoint: JourneyCutpointV1;
    evidence_ref: string;
  }>>;
  require_current_origin_presence?: boolean;
}

export function validateJourneyRequest(
  request: JourneyRequestV1,
  context: JourneyRequestValidationContextV1
): string[] {
  const failures: string[] = [];
  if (request.schema_version !== JOURNEY_REQUEST_SCHEMA_VERSION) failures.push("unsupported_request_schema");
  if (request.movement_class !== "named_journey") failures.push("movement_class_not_named_journey");
  if (!context.registered_trigger_ids.has(request.trigger_id)) failures.push("trigger_not_registered");
  if (!clean(request.journey_request_id)) failures.push("missing_journey_request_id");
  if (!clean(request.primary_purpose_ref)) failures.push("missing_primary_purpose_ref");
  if (!clean(request.owning_domain)) failures.push("missing_owning_domain");
  if (!clean(request.initiating_actor_id)) failures.push("missing_initiating_actor_id");
  if (!clean(request.origin_location_id)) failures.push("missing_origin_location_id");
  if (!clean(request.destination_location_id)) failures.push("missing_destination_location_id");
  if (request.origin_location_id === request.destination_location_id) failures.push("origin_equals_destination");
  if (!validWindow(request.desired_window)) failures.push("invalid_desired_window");
  if (request.return_or_end_posture === "return") {
    if (!request.return_window || !validWindow(request.return_window)) failures.push("return_window_required");
    if (!request.planned_destination_stay) failures.push("destination_stay_required_for_return");
    for (const member of request.named_party) {
      if (member.arrival_disposition !== "return") {
        failures.push(`round_trip_party_disposition_mismatch:${member.person_id}`);
      }
    }
  }
  if (request.planned_destination_stay) {
    const stay = request.planned_destination_stay;
    if (!validJourneyCutpoint(stay.arrival_cutpoint) || !validJourneyCutpoint(stay.departure_cutpoint)) {
      failures.push("invalid_destination_stay_cutpoint");
    } else if (compareJourneyCutpoints(stay.arrival_cutpoint, stay.departure_cutpoint) > 0) {
      failures.push("destination_stay_is_reversed");
    }
  }
  const ownerCount = Number(Boolean(request.decision_owner_responsibility_instance_id)) + Number(Boolean(request.competent_proceeding_ref));
  if (ownerCount !== 1) failures.push("exactly_one_decision_owner_route_required");
  if (request.authority_evidence_refs.length === 0) failures.push("missing_authority_evidence");
  if (request.source_refs.length === 0) failures.push("missing_request_source_refs");
  if (!clean(request.sponsor_and_support_basis_ref)) failures.push("missing_sponsor_and_support_basis");
  if (request.host_acceptance_required && !request.hosting_visit_arrangement_id) {
    failures.push("host_acceptance_not_bound");
  }
  if (request.host_acceptance_required && !clean(request.hosting_entity_id ?? "")) {
    failures.push("hosting_entity_not_bound");
  }
  if (!request.host_acceptance_required &&
      (request.hosting_visit_arrangement_id || request.hosting_entity_id)) {
    failures.push("hosting_binding_without_acceptance_requirement");
  }
  if (request.named_party.length === 0) failures.push("named_party_empty");

  const memberIds = request.named_party.map((member) => member.person_id);
  if (new Set(memberIds).size !== memberIds.length) failures.push("duplicate_named_party_member");
  const principals = request.named_party.filter((member) => member.party_role === "principal");
  if (principals.length !== 1 || principals[0]?.person_id !== request.principal_person_id) {
    failures.push("exactly_one_matching_principal_required");
  }

  for (const member of request.named_party) {
    if (!context.known_person_ids.has(member.person_id)) failures.push(`unknown_named_person:${member.person_id}`);
    if (!clean(member.participation_basis_ref)) failures.push(`missing_participation_basis:${member.person_id}`);
    if (!clean(member.origin_presence_ref)) failures.push(`missing_origin_presence_ref:${member.person_id}`);
    if (member.source_refs.length === 0) failures.push(`missing_member_source_refs:${member.person_id}`);
    const actual = context.actual_presence_by_person_id[member.person_id];
    if (context.require_current_origin_presence && (!actual || actual.location_id !== request.origin_location_id)) {
      const future = context.future_origin_commitment_by_person_id?.[member.person_id];
      const exactAdmittedFutureOrigin = Boolean(
        future &&
        future.location_id === request.origin_location_id &&
        future.evidence_ref.trim() &&
        member.origin_presence_ref === future.evidence_ref &&
        compareJourneyCutpoints(
          future.available_cutpoint,
          request.desired_window.earliest_departure
        ) <= 0
      );
      if (!exactAdmittedFutureOrigin) {
        failures.push(`person_not_present_at_origin:${member.person_id}`);
      }
    }
  }

  if (request.aggregate_calibration.named_party_count !== request.named_party.length) {
    failures.push("aggregate_named_party_count_mismatch");
  }
  if (request.aggregate_calibration.profile_key !== request.profile_key) {
    failures.push("aggregate_profile_key_mismatch");
  }

  return stableUnique(failures);
}

function normalizeResolvedLegs(
  arrangementId: string,
  legs: readonly JourneyResolvedRouteLegV1[],
  namedParty: readonly JourneyNamedPartyInputV1[],
  aggregateParty: JourneyAggregatePartyCompositionV1,
  sequenceOffset: number
): JourneyArrangementV1["legs"] {
  return legs.map((leg, index) => {
    const journeyLegId = `${arrangementId}:leg:${String(sequenceOffset + index + 1).padStart(2, "0")}`;
    return {
      ...leg,
      route_leg_id: journeyLegId,
      sequence_no: sequenceOffset + index + 1,
      named_party: namedParty.map((member) => ({ ...member, journey_leg_id: journeyLegId })),
      aggregate_party: aggregateParty
    };
  });
}

function routeShapeFailures(
  request: JourneyRequestV1,
  legs: readonly JourneyResolvedRouteLegV1[],
  expectedOrigin: string,
  expectedDestination: string,
  window: JourneyWindowV1
): string[] {
  const failures: string[] = [];
  if (legs.length === 0) return ["route_has_no_legs"];
  const ordered = [...legs].sort((left, right) => left.sequence_no - right.sequence_no);
  if (ordered[0]?.from_location_id !== expectedOrigin) failures.push("route_origin_mismatch");
  if (ordered.at(-1)?.to_location_id !== expectedDestination) failures.push("route_destination_mismatch");
  for (let index = 0; index < ordered.length; index += 1) {
    const leg = ordered[index];
    if (!leg) continue;
    if (!clean(leg.selected_route_path_ref)) failures.push(`route_path_missing:${leg.route_leg_id}`);
    if (!validJourneyCutpoint(leg.departure_cutpoint) || !validJourneyCutpoint(leg.arrival_cutpoint)) {
      failures.push(`invalid_leg_cutpoint:${leg.route_leg_id}`);
      continue;
    }
    if (compareJourneyCutpoints(leg.departure_cutpoint, leg.arrival_cutpoint) > 0) {
      failures.push(`leg_time_reversed:${leg.route_leg_id}`);
    }
    if (index > 0) {
      const prior = ordered[index - 1];
      if (prior && prior.to_location_id !== leg.from_location_id) failures.push(`route_not_contiguous:${leg.route_leg_id}`);
      if (prior && compareJourneyCutpoints(prior.arrival_cutpoint, leg.departure_cutpoint) > 0) {
        failures.push(`route_leg_time_overlap:${leg.route_leg_id}`);
      }
    }
    const orderedStops = [...leg.planned_stops].sort((left, right) =>
      compareJourneyCutpoints(left.arrival_cutpoint, right.arrival_cutpoint) ||
      compareStable(left.stop_id, right.stop_id)
    );
    for (let stopIndex = 0; stopIndex < orderedStops.length; stopIndex += 1) {
      const stop = orderedStops[stopIndex]!;
      if (!validJourneyCutpoint(stop.arrival_cutpoint) ||
          !validJourneyCutpoint(stop.departure_cutpoint)) {
        failures.push(`invalid_stop_cutpoint:${stop.stop_id}`);
        continue;
      }
      if (compareJourneyCutpoints(stop.arrival_cutpoint, stop.departure_cutpoint) > 0) {
        failures.push(`stop_time_reversed:${stop.stop_id}`);
      }
      if (compareJourneyCutpoints(stop.arrival_cutpoint, leg.departure_cutpoint) < 0) {
        failures.push(`stop_arrives_before_leg_departure:${stop.stop_id}`);
      }
      if (compareJourneyCutpoints(stop.departure_cutpoint, leg.arrival_cutpoint) > 0) {
        failures.push(`stop_departs_after_leg_arrival:${stop.stop_id}`);
      }
      const priorStop = orderedStops[stopIndex - 1];
      if (priorStop && compareJourneyCutpoints(
        priorStop.departure_cutpoint,
        stop.arrival_cutpoint
      ) > 0) {
        failures.push(`stop_time_overlap:${stop.stop_id}`);
      }
    }
  }
  if (compareJourneyCutpoints(ordered[0]!.departure_cutpoint, window.earliest_departure) < 0) {
    failures.push("route_departs_before_window");
  }
  if (compareJourneyCutpoints(ordered.at(-1)!.arrival_cutpoint, window.latest_arrival) > 0) {
    failures.push("route_arrives_after_window");
  }
  if (request.host_acceptance_required && !request.hosting_visit_arrangement_id) failures.push("host_acceptance_not_bound");
  return stableUnique(failures);
}

function withheld(request: JourneyRequestV1, reasonCodes: readonly string[], sourceRefs: readonly string[] = []): JourneyArrangementResultV1 {
  return {
    status: "withheld",
    journey_request_id: request.journey_request_id,
    reason_codes: stableUnique(reasonCodes),
    source_refs: stableUnique([...request.source_refs, ...sourceRefs])
  };
}

export interface PlanJourneyArrangementInputV1 {
  request: JourneyRequestV1;
  validation_context: JourneyRequestValidationContextV1;
  route_resolver: JourneyRouteResolverV1;
  continuation_kind?: JourneyContinuationKindV1;
  parent_journey_arrangement_ids?: readonly string[];
}

export function planJourneyArrangement(input: PlanJourneyArrangementInputV1): JourneyArrangementResultV1 {
  const { request } = input;
  const requestFailures = validateJourneyRequest(request, input.validation_context);
  if (requestFailures.length > 0) return withheld(request, requestFailures);

  const outbound = input.route_resolver.resolveNamedJourneyRoute(request);
  if (outbound.status === "withheld") return withheld(request, outbound.reason_codes, outbound.source_refs);
  const outboundFailures = routeShapeFailures(
    request,
    outbound.legs,
    request.origin_location_id,
    request.destination_location_id,
    request.desired_window
  );
  if (outboundFailures.length > 0) return withheld(request, outboundFailures, outbound.source_refs);

  const arrangementId = `journey-arrangement:${safeId(request.journey_request_id)}`;
  const aggregateParty = calibrateJourneyAggregateParty(request.aggregate_calibration);
  let routePlanIds = [outbound.route_plan_id];
  let allSourceRefs = [...outbound.source_refs];
  let legs = normalizeResolvedLegs(arrangementId, outbound.legs, request.named_party, aggregateParty, 0);
  const destinationStayLegId = request.planned_destination_stay ? (legs.at(-1)?.route_leg_id ?? null) : null;

  if (request.planned_destination_stay) {
    const outboundArrival = outbound.legs.at(-1)!.arrival_cutpoint;
    if (compareJourneyCutpoints(
      request.planned_destination_stay.arrival_cutpoint,
      outboundArrival
    ) < 0) {
      return withheld(request, ["destination_stay_begins_before_outbound_arrival"], outbound.source_refs);
    }
  }

  if (request.return_or_end_posture === "return") {
    const reverseRequest: JourneyRequestV1 = {
      ...request,
      journey_request_id: `${request.journey_request_id}:return`,
      origin_location_id: request.destination_location_id,
      destination_location_id: request.origin_location_id,
      desired_window: request.return_window!,
      return_window: null,
      planned_destination_stay: null,
      return_or_end_posture: "remain",
      host_acceptance_required: false,
      hosting_visit_arrangement_id: null,
      hosting_entity_id: null,
      source_refs: stableUnique([...request.source_refs, `JourneyReturnOf:${request.journey_request_id}`])
    };
    const returnResolution = input.route_resolver.resolveNamedJourneyRoute(reverseRequest);
    if (returnResolution.status === "withheld") {
      return withheld(request, returnResolution.reason_codes.map((code) => `return_${code}`), returnResolution.source_refs);
    }
    const returnFailures = routeShapeFailures(
      reverseRequest,
      returnResolution.legs,
      reverseRequest.origin_location_id,
      reverseRequest.destination_location_id,
      reverseRequest.desired_window
    );
    if (returnFailures.length > 0) {
      return withheld(request, returnFailures.map((code) => `return_${code}`), returnResolution.source_refs);
    }
    const returnDeparture = returnResolution.legs[0]!.departure_cutpoint;
    const outboundArrival = outbound.legs.at(-1)!.arrival_cutpoint;
    if (compareJourneyCutpoints(returnDeparture, outboundArrival) < 0) {
      return withheld(
        request,
        ["return_departs_before_outbound_arrival"],
        [...outbound.source_refs, ...returnResolution.source_refs]
      );
    }
    if (request.planned_destination_stay && compareJourneyCutpoints(
      request.planned_destination_stay.departure_cutpoint,
      returnDeparture
    ) > 0) {
      return withheld(
        request,
        ["destination_stay_ends_after_return_departure"],
        [...outbound.source_refs, ...returnResolution.source_refs]
      );
    }
    routePlanIds = [...routePlanIds, returnResolution.route_plan_id];
    allSourceRefs = [...allSourceRefs, ...returnResolution.source_refs];
    legs = [
      ...legs,
      ...normalizeResolvedLegs(arrangementId, returnResolution.legs, request.named_party, aggregateParty, legs.length)
    ];
  }

  return {
    status: "accepted",
    arrangement: {
      schema_version: JOURNEY_ARRANGEMENT_SCHEMA_VERSION,
      journey_arrangement_id: arrangementId,
      journey_request_id: request.journey_request_id,
      trigger_id: request.trigger_id,
      owning_domain: request.owning_domain,
      primary_purpose_ref: request.primary_purpose_ref,
      decision_owner_responsibility_instance_id: request.decision_owner_responsibility_instance_id,
      competent_proceeding_ref: request.competent_proceeding_ref,
      principal_person_id: request.principal_person_id,
      profile_key: request.profile_key,
      route_posture: request.route_posture,
      return_or_end_posture: request.return_or_end_posture,
      authority_evidence_refs: stableUnique(request.authority_evidence_refs),
      sponsor_and_support_basis_ref: request.sponsor_and_support_basis_ref,
      hosting_visit_arrangement_id: request.hosting_visit_arrangement_id,
      hosting_entity_id: request.hosting_entity_id,
      planned_destination_stay: request.planned_destination_stay,
      destination_stay_leg_id: destinationStayLegId,
      route_plan_id: routePlanIds.join("+"),
      legs,
      continuation_kind: input.continuation_kind ?? "root",
      parent_journey_arrangement_ids: stableUnique(input.parent_journey_arrangement_ids ?? []),
      source_refs: stableUnique([...request.source_refs, ...allSourceRefs, ...aggregateParty.source_refs]),
      direct_domain_mutation: false,
      direct_resource_or_gl_mutation: false,
      direct_art_mutation: false
    }
  };
}

export function buildJourneyContinuationRequest(args: {
  parent: JourneyArrangementV1;
  continuation_request_id: string;
  trigger_id: string;
  initiating_actor_id: string;
  origin_location_id: string;
  destination_location_id: string;
  window: JourneyWindowV1;
  selected_person_ids: readonly string[];
  actual_presence_refs_by_person_id: Readonly<Record<string, string>>;
  actual_residence_refs_by_person_id?: Readonly<Record<string, string | null>>;
  continuation_kind: Exclude<JourneyContinuationKindV1, "root">;
  route_posture: JourneyRequestV1["route_posture"];
  end_posture: JourneyRequestV1["return_or_end_posture"];
  /** Exact competent-domain evidence for the newly selected continuation posture. */
  continuation_posture_authority_refs: readonly string[];
  aggregate_calibration_posture: Readonly<{
    house_posture: JourneyPartyCalibrationInputV1["house_posture"];
    means_band: JourneyPartyCalibrationInputV1["means_band"];
    season: JourneyPartyCalibrationInputV1["season"];
  }>;
  source_refs: readonly string[];
}): {
  request: JourneyRequestV1;
  continuation_kind: Exclude<JourneyContinuationKindV1, "root">;
  parent_ids: string[];
} {
  const finalLeg = args.parent.legs.at(-1);
  if (!finalLeg) throw new Error("parent_arrangement_has_no_legs");
  if (args.continuation_posture_authority_refs.length === 0 ||
      args.continuation_posture_authority_refs.some((ref) => !ref.trim())) {
    throw new Error("continuation_posture_authority_required");
  }
  const parentMembers = new Map(finalLeg.named_party.map((member) => [member.person_id, member]));
  const selectedIds = stableUnique(args.selected_person_ids);
  if (selectedIds.length === 0) throw new Error("continuation_party_empty");
  const missing = selectedIds.filter((personId) => !parentMembers.has(personId));
  if (missing.length > 0) throw new Error(`continuation_person_not_in_parent:${missing.join(",")}`);
  const namedParty = selectedIds.map((personId, index) => {
    const parentMember = parentMembers.get(personId)!;
    return {
      ...parentMember,
      journey_leg_id: undefined,
      party_role: index === 0 ? ("principal" as const) : ("return_or_onward_escort" as const),
      origin_presence_ref: args.actual_presence_refs_by_person_id[personId] ?? "",
      origin_residence_ref: args.actual_residence_refs_by_person_id?.[personId] ?? parentMember.origin_residence_ref,
      arrival_disposition: args.end_posture,
      source_refs: stableUnique([...parentMember.source_refs, ...args.source_refs])
    };
  }).map(({ journey_leg_id: _discarded, ...member }) => member);

  const request: JourneyRequestV1 = {
    schema_version: JOURNEY_REQUEST_SCHEMA_VERSION,
    journey_request_id: args.continuation_request_id,
    trigger_id: args.trigger_id,
    movement_class: "named_journey",
    owning_domain: args.parent.owning_domain,
    primary_purpose_ref: args.parent.primary_purpose_ref,
    initiating_actor_id: args.initiating_actor_id,
    decision_owner_responsibility_instance_id: args.parent.decision_owner_responsibility_instance_id,
    competent_proceeding_ref: args.parent.competent_proceeding_ref,
    principal_person_id: selectedIds[0]!,
    origin_location_id: args.origin_location_id,
    destination_location_id: args.destination_location_id,
    desired_window: args.window,
    return_window: null,
    planned_destination_stay: null,
    route_posture: args.route_posture,
    return_or_end_posture: args.end_posture,
    profile_key: args.parent.profile_key,
    named_party: namedParty,
    aggregate_calibration: {
      profile_key: args.parent.profile_key,
      house_posture: args.aggregate_calibration_posture.house_posture,
      means_band: args.aggregate_calibration_posture.means_band,
      season: args.aggregate_calibration_posture.season,
      armed_posture: finalLeg.aggregate_party.armed_posture,
      named_party_count: namedParty.length,
      source_refs: stableUnique([...args.parent.source_refs, ...args.source_refs])
    },
    authority_evidence_refs: stableUnique([
      ...args.parent.authority_evidence_refs,
      ...args.continuation_posture_authority_refs,
    ]),
    sponsor_and_support_basis_ref: args.parent.sponsor_and_support_basis_ref,
    hosting_visit_arrangement_id: null,
    hosting_entity_id: null,
    host_acceptance_required: false,
    source_refs: stableUnique([
      ...args.parent.source_refs,
      ...args.source_refs,
      ...args.continuation_posture_authority_refs,
      `JourneyContinuationOf:${args.parent.journey_arrangement_id}`,
    ])
  };
  return {
    request,
    continuation_kind: args.continuation_kind,
    parent_ids: [args.parent.journey_arrangement_id]
  };
}
