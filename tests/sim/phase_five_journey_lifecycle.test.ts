import { describe, expect, it } from "vitest";
import {
  JOURNEY_REQUEST_SCHEMA_VERSION,
  type JourneyRequestV1,
  type JourneyRouteResolverV1
} from "../../src/sim/domains/journey/journeyContracts";
import {
  buildJourneyContinuationRequest,
  calibrateJourneyAggregateParty,
  planJourneyArrangement,
  validateJourneyRequest
} from "../../src/sim/domains/journey/journeyPartyPlanner";
import {
  admitJourneyArrangement,
  advanceJourneyRuntime,
  createJourneyRuntime,
  resolveJourneyInterruption,
  validateJourneyRuntime
} from "../../src/sim/domains/journey/journeyLifecycle";

const triggerIds = new Set(["JRN-016", "JRN-056"]);
const knownPeople = new Set(["person:lord", "person:steward", "person:ward"]);

function request(overrides: Partial<JourneyRequestV1> = {}): JourneyRequestV1 {
  return {
    schema_version: JOURNEY_REQUEST_SCHEMA_VERSION,
    journey_request_id: "request:inspection:001",
    trigger_id: "JRN-016",
    movement_class: "named_journey",
    owning_domain: "estate_holdings",
    primary_purpose_ref: "manor-inspection:merewatch:001",
    initiating_actor_id: "person:lord",
    decision_owner_responsibility_instance_id: "responsibility:manor-stewardship:merewatch",
    competent_proceeding_ref: null,
    principal_person_id: "person:lord",
    origin_location_id: "location:A",
    destination_location_id: "location:B",
    desired_window: {
      earliest_departure: { relative_month: 1, phase: "opening" },
      latest_arrival: { relative_month: 2, phase: "opening" }
    },
    return_window: {
      earliest_departure: { relative_month: 2, phase: "midmonth" },
      latest_arrival: { relative_month: 2, phase: "closing" }
    },
    planned_destination_stay: {
      arrival_cutpoint: { relative_month: 2, phase: "opening" },
      departure_cutpoint: { relative_month: 2, phase: "midmonth" }
    },
    route_posture: "safest_viable",
    return_or_end_posture: "return",
    profile_key: "small_noble_retinue",
    named_party: [
      {
        person_id: "person:lord",
        party_role: "principal",
        participation_basis_ref: "decision:inspect:001",
        required_or_discretionary: "required",
        origin_presence_ref: "presence:lord:A",
        origin_residence_ref: "residence:lord:A",
        absence_impact_refs: ["responsibility:house-command"],
        custody_or_authority_basis_ref: null,
        arrival_disposition: "return",
        source_refs: ["fixture:lord"]
      },
      {
        person_id: "person:steward",
        party_role: "selected_attendee_or_companion",
        participation_basis_ref: "decision:inspect:001:steward",
        required_or_discretionary: "discretionary",
        origin_presence_ref: "presence:steward:A",
        origin_residence_ref: "residence:steward:A",
        absence_impact_refs: ["responsibility:records"],
        custody_or_authority_basis_ref: null,
        arrival_disposition: "return",
        source_refs: ["fixture:steward"]
      }
    ],
    aggregate_calibration: {
      profile_key: "small_noble_retinue",
      house_posture: "baronial",
      means_band: "ordinary",
      season: "summer",
      armed_posture: "ordinary_escort",
      named_party_count: 2,
      source_refs: ["fixture:party-calibration"]
    },
    authority_evidence_refs: ["authority:hoh-retained"],
    sponsor_and_support_basis_ref: "support:house:A",
    hosting_visit_arrangement_id: "hosting:inspection:B",
    hosting_entity_id: "house:host-b",
    host_acceptance_required: true,
    source_refs: ["fixture:request"],
    ...overrides
  };
}

const resolver: JourneyRouteResolverV1 = {
  resolveNamedJourneyRoute(input) {
    const returning = input.origin_location_id === "location:B";
    return {
      status: "resolved",
      route_plan_id: returning ? "route-plan:B-A" : "route-plan:A-B",
      source_refs: ["fixture:route-network"],
      legs: [
        {
          route_leg_id: returning ? "resolved:B-A" : "resolved:A-B",
          sequence_no: 1,
          from_location_id: input.origin_location_id,
          to_location_id: input.destination_location_id,
          selected_route_path_ref: returning ? "path:B-A" : "path:A-B",
          crossing_access_right_refs: returning ? [] : ["crossing:right:bridge"],
          planned_stops: returning
            ? []
            : [
                {
                  stop_id: "stop:abbey",
                  location_id: "location:S",
                  provider_kind: "accepted_church_or_institution",
                  admission_ref: "lodging-admission:abbey",
                  arrival_cutpoint: { relative_month: 1, phase: "midmonth" },
                  departure_cutpoint: { relative_month: 1, phase: "closing" },
                  host_entity_id: "institution:abbey",
                  source_refs: ["fixture:abbey-stop"]
                }
              ],
          condition_posture: "normal",
          departure_cutpoint: returning
            ? { relative_month: 2, phase: "midmonth" }
            : { relative_month: 1, phase: "opening" },
          arrival_cutpoint: returning
            ? { relative_month: 2, phase: "closing" }
            : { relative_month: 2, phase: "opening" },
          distance_cost: 58,
          expected_travel_days: returning ? 3 : 13,
          source_status: "foundation_a_provisional",
          source_refs: ["fixture:path"]
        }
      ]
    };
  }
};

function context() {
  return {
    registered_trigger_ids: triggerIds,
    known_person_ids: knownPeople,
    actual_presence_by_person_id: {
      "person:lord": { location_id: "location:A" },
      "person:steward": { location_id: "location:A" },
      "person:ward": { location_id: "location:B" }
    },
    require_current_origin_presence: true
  };
}

describe("Phase Five Journey party planning", () => {
  it("calibrates an exact aggregate retinue without inventing named people", () => {
    const first = calibrateJourneyAggregateParty(request().aggregate_calibration);
    const second = calibrateJourneyAggregateParty(request().aggregate_calibration);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      ordinary_attendant_count: 3,
      guard_rank_and_file_count: 4,
      riding_animal_count: 2,
      pack_animal_count: 3,
      armed_posture: "ordinary_escort"
    });
    expect(JSON.stringify(first)).not.toContain("person:");
  });

  it("withholds unknown people, missing host acceptance, and unregistered purposes", () => {
    const invalid = request({
      trigger_id: "JRN-999",
      hosting_visit_arrangement_id: null,
      hosting_entity_id: null,
      named_party: [
        {
          ...request().named_party[0]!,
          person_id: "person:invented"
        }
      ],
      aggregate_calibration: { ...request().aggregate_calibration, named_party_count: 1 }
    });
    expect(validateJourneyRequest(invalid, context())).toEqual(
      expect.arrayContaining([
        "trigger_not_registered",
        "host_acceptance_not_bound",
        "unknown_named_person:person:invented",
        "person_not_present_at_origin:person:invented",
        "exactly_one_matching_principal_required"
      ])
    );
  });

  it("plans deterministic outbound, hosted stop, destination stay, and return legs", () => {
    const planned = planJourneyArrangement({ request: request(), validation_context: context(), route_resolver: resolver });
    expect(planned.status).toBe("accepted");
    if (planned.status !== "accepted") return;
    expect(planned.arrangement.legs).toHaveLength(2);
    expect(planned.arrangement.destination_stay_leg_id).toBe(planned.arrangement.legs[0]!.route_leg_id);
    expect(planned.arrangement.legs[0]!.named_party.map((row) => row.person_id)).toEqual([
      "person:lord",
      "person:steward"
    ]);
    expect(planned.arrangement.direct_domain_mutation).toBe(false);
    expect(planned.arrangement.direct_resource_or_gl_mutation).toBe(false);
    expect(planned.arrangement.direct_art_mutation).toBe(false);
  });

  it("withholds impossible stop, stay, return, and round-trip disposition sequences", () => {
    const stopBeforeDeparture: JourneyRouteResolverV1 = {
      resolveNamedJourneyRoute(input) {
        const base = resolver.resolveNamedJourneyRoute(input);
        if (base.status !== "resolved" || input.origin_location_id === "location:B") return base;
        return {
          ...base,
          legs: base.legs.map((leg) => ({
            ...leg,
            planned_stops: leg.planned_stops.map((stop) => ({
              ...stop,
              arrival_cutpoint: { relative_month: 2, phase: "midmonth" as const },
              departure_cutpoint: { relative_month: 2, phase: "midmonth" as const }
            }))
          }))
        };
      }
    };
    const invalidStop = planJourneyArrangement({
      request: request(),
      validation_context: context(),
      route_resolver: stopBeforeDeparture
    });
    expect(invalidStop).toMatchObject({
      status: "withheld",
      reason_codes: ["stop_departs_after_leg_arrival:stop:abbey"]
    });

    const earlyStay = planJourneyArrangement({
      request: request({
        planned_destination_stay: {
          arrival_cutpoint: { relative_month: 1, phase: "closing" },
          departure_cutpoint: { relative_month: 2, phase: "midmonth" }
        }
      }),
      validation_context: context(),
      route_resolver: resolver
    });
    expect(earlyStay).toMatchObject({
      status: "withheld",
      reason_codes: ["destination_stay_begins_before_outbound_arrival"]
    });

    const lateStay = planJourneyArrangement({
      request: request({
        planned_destination_stay: {
          arrival_cutpoint: { relative_month: 2, phase: "opening" },
          departure_cutpoint: { relative_month: 2, phase: "closing" }
        }
      }),
      validation_context: context(),
      route_resolver: resolver
    });
    expect(lateStay).toMatchObject({
      status: "withheld",
      reason_codes: ["destination_stay_ends_after_return_departure"]
    });

    expect(validateJourneyRequest(request({
      named_party: [
        request().named_party[0]!,
        { ...request().named_party[1]!, arrival_disposition: "transfer" }
      ]
    }), context())).toContain("round_trip_party_disposition_mismatch:person:steward");
  });
});

describe("Phase Five Journey monthly presence lifecycle", () => {
  it("executes stop, stay, return, presence, and receipts without mutating owning-domain state", () => {
    const planned = planJourneyArrangement({ request: request(), validation_context: context(), route_resolver: resolver });
    if (planned.status !== "accepted") throw new Error(planned.reason_codes.join(","));
    const opening = createJourneyRuntime([
      { person_id: "person:lord", location_id: "location:A", evidence_refs: ["presence:lord:A"] },
      { person_id: "person:steward", location_id: "location:A", evidence_refs: ["presence:steward:A"] }
    ]);
    const admission = admitJourneyArrangement(opening, planned.arrangement);
    expect(admission.status).toBe("accepted");
    const monthOne = advanceJourneyRuntime(admission.runtime, { relative_month: 1, phase: "closing" });
    expect(monthOne.presence_ledger.people_by_id["person:lord"]).toMatchObject({
      status: "in_transit",
      location_id: null
    });
    expect(monthOne.presence_ledger.stay_facts).toHaveLength(1);
    expect(monthOne.presence_ledger.stay_facts[0]).toMatchObject({
      location_id: "location:S",
      provider_kind: "accepted_church_or_institution",
      host_entity_id: "institution:abbey"
    });

    const completed = advanceJourneyRuntime(monthOne, { relative_month: 2, phase: "closing" });
    expect(completed.runtime_by_arrangement_id[planned.arrangement.journey_arrangement_id]?.status).toBe("completed");
    expect(completed.presence_ledger.people_by_id["person:lord"]).toMatchObject({
      status: "at_location",
      location_id: "location:A",
      active_journey_arrangement_id: null
    });
    expect(completed.presence_ledger.stay_facts).toHaveLength(2);
    expect(completed.presence_ledger.stay_facts[1]).toMatchObject({
      location_id: "location:B",
      provider_kind: "journey_destination",
      admission_ref: "hosting:inspection:B"
    });
    expect(completed.presence_ledger.receipts.map((row) => row.result_code)).toEqual(
      expect.arrayContaining(["in_transit", "arrived", "returned"])
    );
    expect(completed.presence_ledger.domain_handoff_intents).toHaveLength(0);
    expect(validateJourneyRuntime(completed)).toEqual([]);
    expect(completed.direct_domain_mutation).toBe(false);
    expect(completed.direct_resource_or_gl_mutation).toBe(false);
    expect(completed.direct_art_mutation).toBe(false);
  });

  it("rejects overlapping named-person commitments", () => {
    const first = planJourneyArrangement({ request: request(), validation_context: context(), route_resolver: resolver });
    const second = planJourneyArrangement({
      request: request({ journey_request_id: "request:inspection:002" }),
      validation_context: context(),
      route_resolver: resolver
    });
    if (first.status !== "accepted" || second.status !== "accepted") throw new Error("fixtures must plan");
    const opening = createJourneyRuntime([
      { person_id: "person:lord", location_id: "location:A", evidence_refs: ["presence:lord:A"] },
      { person_id: "person:steward", location_id: "location:A", evidence_refs: ["presence:steward:A"] }
    ]);
    const admitted = admitJourneyArrangement(opening, first.arrangement);
    const conflict = admitJourneyArrangement(admitted.runtime, second.arrangement);
    expect(conflict.status).toBe("withheld");
    expect(conflict.reason_codes).toEqual(
      expect.arrayContaining([
        expect.stringContaining("incompatible_presence_commitment:person:lord"),
        expect.stringContaining("incompatible_presence_commitment:person:steward")
      ])
    );
  });

  it("surfaces route failure as a receipt and keeps the party in reviewable transit", () => {
    const planned = planJourneyArrangement({ request: request(), validation_context: context(), route_resolver: resolver });
    if (planned.status !== "accepted") throw new Error("fixture must plan");
    let runtime = createJourneyRuntime([
      { person_id: "person:lord", location_id: "location:A", evidence_refs: ["presence:lord:A"] },
      { person_id: "person:steward", location_id: "location:A", evidence_refs: ["presence:steward:A"] }
    ]);
    runtime = admitJourneyArrangement(runtime, planned.arrangement).runtime;
    const failed = advanceJourneyRuntime(
      runtime,
      { relative_month: 2, phase: "opening" },
      [
        {
          journey_arrangement_id: planned.arrangement.journey_arrangement_id,
          journey_leg_id: planned.arrangement.legs[0]!.route_leg_id,
          result_code: "route_blocked",
          effective_cutpoint: { relative_month: 2, phase: "opening" },
          reason_codes: ["crossing_closed"],
          source_refs: ["route-condition:bridge:closed"]
        }
      ]
    );
    expect(failed.runtime_by_arrangement_id[planned.arrangement.journey_arrangement_id]?.status).toBe("needs_review");
    expect(failed.presence_ledger.receipts.at(-1)).toMatchObject({
      result_code: "route_blocked",
      reason_codes: ["crossing_closed"]
    });
    expect(failed.presence_ledger.people_by_id["person:lord"]?.status).toBe("in_transit");
  });

  it("rejects an interruption aimed at a later leg while the party is still on the active leg", () => {
    const planned = planJourneyArrangement({
      request: request(),
      validation_context: context(),
      route_resolver: resolver
    });
    if (planned.status !== "accepted") throw new Error("fixture must plan");
    let runtime = admitJourneyArrangement(createJourneyRuntime([
      { person_id: "person:lord", location_id: "location:A", evidence_refs: ["presence:lord:A"] },
      { person_id: "person:steward", location_id: "location:A", evidence_refs: ["presence:steward:A"] }
    ]), planned.arrangement).runtime;
    runtime = advanceJourneyRuntime(runtime, {
      relative_month: 1,
      phase: "opening"
    });
    const laterLeg = planned.arrangement.legs[1]!;
    expect(() => advanceJourneyRuntime(
      runtime,
      { relative_month: 1, phase: "midmonth" },
      [{
        journey_arrangement_id: planned.arrangement.journey_arrangement_id,
        journey_leg_id: laterLeg.route_leg_id,
        result_code: "route_blocked",
        effective_cutpoint: { relative_month: 1, phase: "midmonth" },
        reason_codes: ["return_crossing_closed"],
        source_refs: ["route-condition:return-crossing"]
      }]
    )).toThrow("journey_interruption_target_not_active_leg");
  });

  it("applies an interruption at its exact between-event cutpoint and preserves future events until explicit resume", () => {
    const directResolver: JourneyRouteResolverV1 = {
      resolveNamedJourneyRoute(input) {
        const resolved = resolver.resolveNamedJourneyRoute(input);
        if (resolved.status === "withheld") return resolved;
        return {
          ...resolved,
          legs: resolved.legs.map((leg) => ({ ...leg, planned_stops: [] }))
        };
      }
    };
    const directRequest = request({
      return_or_end_posture: "remain",
      return_window: null,
      planned_destination_stay: null,
      hosting_visit_arrangement_id: null,
      hosting_entity_id: null,
      host_acceptance_required: false
    });
    const planned = planJourneyArrangement({
      request: directRequest,
      validation_context: context(),
      route_resolver: directResolver
    });
    if (planned.status !== "accepted") throw new Error(planned.reason_codes.join(","));
    const arrangementId = planned.arrangement.journey_arrangement_id;
    const legId = planned.arrangement.legs[0]!.route_leg_id;
    let runtime = admitJourneyArrangement(createJourneyRuntime([
      { person_id: "person:lord", location_id: "location:A", evidence_refs: ["presence:lord:A"] },
      { person_id: "person:steward", location_id: "location:A", evidence_refs: ["presence:steward:A"] }
    ]), planned.arrangement).runtime;

    runtime = advanceJourneyRuntime(runtime, { relative_month: 1, phase: "midmonth" }, [{
      journey_arrangement_id: arrangementId,
      journey_leg_id: legId,
      result_code: "route_blocked",
      effective_cutpoint: { relative_month: 1, phase: "midmonth" },
      reason_codes: ["road_flooded"],
      source_refs: ["route-condition:flood"]
    }]);
    expect(runtime.runtime_by_arrangement_id[arrangementId]?.status).toBe("needs_review");
    expect(runtime.presence_ledger.receipts.at(-1)).toMatchObject({
      result_code: "route_blocked",
      cutpoint: { relative_month: 1, phase: "midmonth" }
    });

    runtime = advanceJourneyRuntime(runtime, { relative_month: 2, phase: "opening" });
    const arrivalKey = `${arrangementId}:${legId}:arrival`;
    expect(runtime.presence_ledger.processed_event_keys).not.toContain(arrivalKey);
    expect(runtime.presence_ledger.people_by_id["person:lord"]?.status).toBe("in_transit");

    runtime = resolveJourneyInterruption(runtime, {
      journey_arrangement_id: arrangementId,
      journey_leg_id: legId,
      resolution_kind: "resume",
      effective_cutpoint: { relative_month: 2, phase: "opening" },
      authority_evidence_refs: ["authority:manor-stewardship-owner"],
      reason_codes: ["road_reopened"],
      source_refs: ["route-condition:flood-cleared"]
    });
    expect(runtime.runtime_by_arrangement_id[arrangementId]?.status).toBe("in_transit");
    expect(runtime.presence_ledger.receipts.at(-1)?.result_code).toBe("resumed");

    runtime = advanceJourneyRuntime(runtime, { relative_month: 2, phase: "opening" });
    expect(runtime.presence_ledger.processed_event_keys).toContain(arrivalKey);
    expect(runtime.runtime_by_arrangement_id[arrangementId]?.status).toBe("completed");
    expect(runtime.presence_ledger.people_by_id["person:lord"]).toMatchObject({
      status: "at_location",
      location_id: "location:B"
    });
  });

  it("requires replanning instead of pretending a delayed resume can replay missed events", () => {
    const directResolver: JourneyRouteResolverV1 = {
      resolveNamedJourneyRoute(input) {
        const resolved = resolver.resolveNamedJourneyRoute(input);
        if (resolved.status === "withheld") return resolved;
        return {
          ...resolved,
          legs: resolved.legs.map((leg) => ({ ...leg, planned_stops: [] }))
        };
      }
    };
    const directRequest = request({
      return_or_end_posture: "remain",
      return_window: null,
      planned_destination_stay: null,
      hosting_visit_arrangement_id: null,
      hosting_entity_id: null,
      host_acceptance_required: false
    });
    const planned = planJourneyArrangement({
      request: directRequest,
      validation_context: context(),
      route_resolver: directResolver
    });
    if (planned.status !== "accepted") throw new Error(planned.reason_codes.join(","));
    const arrangementId = planned.arrangement.journey_arrangement_id;
    const legId = planned.arrangement.legs[0]!.route_leg_id;
    let runtime = admitJourneyArrangement(createJourneyRuntime([
      { person_id: "person:lord", location_id: "location:A", evidence_refs: ["presence:lord:A"] },
      { person_id: "person:steward", location_id: "location:A", evidence_refs: ["presence:steward:A"] }
    ]), planned.arrangement).runtime;
    runtime = advanceJourneyRuntime(runtime, { relative_month: 1, phase: "midmonth" }, [{
      journey_arrangement_id: arrangementId,
      journey_leg_id: legId,
      result_code: "route_blocked",
      effective_cutpoint: { relative_month: 1, phase: "midmonth" },
      reason_codes: ["road_flooded"],
      source_refs: ["route-condition:flood"]
    }]);
    runtime = advanceJourneyRuntime(runtime, { relative_month: 2, phase: "closing" });
    expect(() => resolveJourneyInterruption(runtime, {
      journey_arrangement_id: arrangementId,
      journey_leg_id: legId,
      resolution_kind: "resume",
      effective_cutpoint: { relative_month: 2, phase: "closing" },
      authority_evidence_refs: ["authority:manor-stewardship-owner"],
      reason_codes: ["road_reopened_too_late"],
      source_refs: ["route-condition:flood-cleared"]
    })).toThrow("journey_interruption_resume_requires_replan_after_missed_event");
  });

  it("records only the realized portion of a hosted stay when the journey terminates early", () => {
    const stayRequest = request({
      return_or_end_posture: "remain",
      return_window: null,
      planned_destination_stay: {
        arrival_cutpoint: { relative_month: 2, phase: "opening" },
        departure_cutpoint: { relative_month: 2, phase: "closing" }
      },
      named_party: [request().named_party[0]!],
      aggregate_calibration: {
        ...request().aggregate_calibration,
        named_party_count: 1
      }
    });
    const directResolver: JourneyRouteResolverV1 = {
      resolveNamedJourneyRoute(input) {
        const resolved = resolver.resolveNamedJourneyRoute(input);
        if (resolved.status === "withheld") return resolved;
        return {
          ...resolved,
          legs: resolved.legs.map((leg) => ({ ...leg, planned_stops: [] }))
        };
      }
    };
    const planned = planJourneyArrangement({
      request: stayRequest,
      validation_context: context(),
      route_resolver: directResolver
    });
    if (planned.status !== "accepted") throw new Error(planned.reason_codes.join(","));
    const arrangementId = planned.arrangement.journey_arrangement_id;
    const legId = planned.arrangement.legs[0]!.route_leg_id;
    let runtime = admitJourneyArrangement(createJourneyRuntime([
      { person_id: "person:lord", location_id: "location:A", evidence_refs: ["presence:lord:A"] }
    ]), planned.arrangement).runtime;
    runtime = advanceJourneyRuntime(runtime, { relative_month: 2, phase: "midmonth" }, [{
      journey_arrangement_id: arrangementId,
      journey_leg_id: legId,
      result_code: "support_failed",
      effective_cutpoint: { relative_month: 2, phase: "midmonth" },
      reason_codes: ["host_can_no_longer_receive_party"],
      source_refs: ["host-report:changed-capacity"]
    }]);
    runtime = resolveJourneyInterruption(runtime, {
      journey_arrangement_id: arrangementId,
      journey_leg_id: legId,
      resolution_kind: "cancel",
      effective_cutpoint: { relative_month: 2, phase: "midmonth" },
      authority_evidence_refs: ["authority:manor-stewardship-owner"],
      reason_codes: ["stay_ended_early"],
      source_refs: ["decision:end-visit"]
    });
    expect(runtime.presence_ledger.stay_facts).toEqual([
      expect.objectContaining({
        provider_kind: "journey_destination",
        host_entity_id: "house:host-b",
        arrival_cutpoint: { relative_month: 2, phase: "opening" },
        departure_cutpoint: { relative_month: 2, phase: "midmonth" }
      })
    ]);
    expect(validateJourneyRuntime(runtime)).toEqual([]);
  });

  it("preserves a realized stop stay when termination lands exactly on its scheduled departure", () => {
    const planned = planJourneyArrangement({
      request: request(),
      validation_context: context(),
      route_resolver: resolver
    });
    if (planned.status !== "accepted") throw new Error("fixture must plan");
    const arrangementId = planned.arrangement.journey_arrangement_id;
    const legId = planned.arrangement.legs[0]!.route_leg_id;
    let runtime = admitJourneyArrangement(createJourneyRuntime([
      { person_id: "person:lord", location_id: "location:A", evidence_refs: ["presence:lord:A"] },
      { person_id: "person:steward", location_id: "location:A", evidence_refs: ["presence:steward:A"] }
    ]), planned.arrangement).runtime;
    runtime = advanceJourneyRuntime(runtime, { relative_month: 1, phase: "closing" }, [{
      journey_arrangement_id: arrangementId,
      journey_leg_id: legId,
      result_code: "support_failed",
      effective_cutpoint: { relative_month: 1, phase: "closing" },
      reason_codes: ["onward_support_failed"],
      source_refs: ["support-state:stop-departure"]
    }]);
    runtime = resolveJourneyInterruption(runtime, {
      journey_arrangement_id: arrangementId,
      journey_leg_id: legId,
      resolution_kind: "cancel",
      effective_cutpoint: { relative_month: 1, phase: "closing" },
      authority_evidence_refs: ["authority:manor-stewardship-owner"],
      reason_codes: ["party_remains_at_abbey"],
      source_refs: ["decision:end-journey-at-stop"]
    });
    expect(runtime.presence_ledger.stay_facts).toEqual([
      expect.objectContaining({
        location_id: "location:S",
        provider_kind: "accepted_church_or_institution",
        host_entity_id: "institution:abbey",
        arrival_cutpoint: { relative_month: 1, phase: "midmonth" },
        departure_cutpoint: { relative_month: 1, phase: "closing" }
      })
    ]);
    expect(validateJourneyRuntime(runtime)).toEqual([]);
  });

  it("requires an explicit terminal resolution and releases the arrangement reservation", () => {
    const planned = planJourneyArrangement({ request: request(), validation_context: context(), route_resolver: resolver });
    if (planned.status !== "accepted") throw new Error(planned.reason_codes.join(","));
    const arrangementId = planned.arrangement.journey_arrangement_id;
    const legId = planned.arrangement.legs[0]!.route_leg_id;
    let runtime = admitJourneyArrangement(createJourneyRuntime([
      { person_id: "person:lord", location_id: "location:A", evidence_refs: ["presence:lord:A"] },
      { person_id: "person:steward", location_id: "location:A", evidence_refs: ["presence:steward:A"] }
    ]), planned.arrangement).runtime;
    runtime = advanceJourneyRuntime(runtime, { relative_month: 1, phase: "midmonth" }, [{
      journey_arrangement_id: arrangementId,
      journey_leg_id: legId,
      result_code: "support_failed",
      effective_cutpoint: { relative_month: 1, phase: "midmonth" },
      reason_codes: ["escort_unavailable"],
      source_refs: ["support-check:escort"]
    }]);
    expect(runtime.presence_ledger.reservations).toHaveLength(2);

    runtime = resolveJourneyInterruption(runtime, {
      journey_arrangement_id: arrangementId,
      journey_leg_id: legId,
      resolution_kind: "supersede",
      effective_cutpoint: { relative_month: 1, phase: "midmonth" },
      authority_evidence_refs: ["authority:manor-stewardship-owner"],
      reason_codes: ["replacement_plan_required"],
      source_refs: ["decision:replan-journey"],
      terminal_presence_disposition: {
        location_id: "location:A",
        evidence_ref: "recovery:party-returned-to-origin",
        source_refs: ["presence-witness:origin-gate"]
      }
    });
    expect(runtime.runtime_by_arrangement_id[arrangementId]?.status).toBe("superseded");
    expect(runtime.presence_ledger.reservations).toEqual([]);
    expect(runtime.presence_ledger.receipts.at(-1)?.result_code).toBe("superseded");
    expect(runtime.presence_ledger.people_by_id["person:lord"]).toMatchObject({
      status: "at_location",
      location_id: "location:A",
      active_journey_arrangement_id: null,
      active_journey_leg_id: null
    });
    expect(runtime.presence_ledger.presence_events.some((event) =>
      event.event_kind === "recovered" && event.person_id === "person:lord"
    )).toBe(true);
    expect(runtime.direct_domain_mutation).toBe(false);
    expect(runtime.direct_resource_or_gl_mutation).toBe(false);
    expect(runtime.direct_art_mutation).toBe(false);
    expect(validateJourneyRuntime(runtime)).toEqual([]);
  });

  it("creates an explicit linked child request when a transfer party splits", () => {
    const transferRequest = request({
      journey_request_id: "request:ward-transfer:001",
      trigger_id: "JRN-056",
      return_or_end_posture: "transfer",
      return_window: null,
      planned_destination_stay: null,
      named_party: [
        { ...request().named_party[0]!, arrival_disposition: "return" },
        {
          ...request().named_party[1]!,
          person_id: "person:ward",
          party_role: "subject_transfer",
          arrival_disposition: "transfer",
          origin_presence_ref: "presence:ward:A"
        }
      ]
    });
    const transferContext = {
      ...context(),
      actual_presence_by_person_id: {
        ...context().actual_presence_by_person_id,
        "person:ward": { location_id: "location:A" }
      }
    };
    const planned = planJourneyArrangement({ request: transferRequest, validation_context: transferContext, route_resolver: resolver });
    if (planned.status !== "accepted") throw new Error(planned.reason_codes.join(","));
    const child = buildJourneyContinuationRequest({
      parent: planned.arrangement,
      continuation_request_id: "request:ward-transfer:001:return-escort",
      trigger_id: "JRN-056",
      initiating_actor_id: "person:lord",
      origin_location_id: "location:B",
      destination_location_id: "location:A",
      window: {
        earliest_departure: { relative_month: 2, phase: "midmonth" },
        latest_arrival: { relative_month: 2, phase: "closing" }
      },
      selected_person_ids: ["person:lord"],
      actual_presence_refs_by_person_id: { "person:lord": "arrival:transfer:B" },
      continuation_kind: "split_child",
      route_posture: "safest_viable",
      end_posture: "return",
      continuation_posture_authority_refs: ["authority:ward-transfer-return"],
      aggregate_calibration_posture: {
        house_posture: "baronial",
        means_band: "ordinary",
        season: "summer"
      },
      source_refs: ["decision:return-escort"]
    });
    expect(child.parent_ids).toEqual([planned.arrangement.journey_arrangement_id]);
    expect(child.continuation_kind).toBe("split_child");
    expect(child.request.named_party).toHaveLength(1);
    expect(child.request.principal_person_id).toBe("person:lord");
    expect(child.request.origin_location_id).toBe("location:B");
    expect(child.request.authority_evidence_refs).toContain(
      "authority:ward-transfer-return"
    );
    expect(child.request.aggregate_calibration).toMatchObject({
      house_posture: "baronial",
      means_band: "ordinary",
      season: "summer"
    });
  });
});
