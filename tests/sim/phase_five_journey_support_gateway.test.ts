import { describe, expect, it } from "vitest";
import type { JourneyArrangementV1 } from "../../src/sim/domains/journey/journeyContracts";
import { createJourneyRuntime } from "../../src/sim/domains/journey/journeyLifecycle";
import {
  buildJourneySupportDemandObservations,
  submitJourneySupportGatewayHandoffs,
  type JourneyDemandGatewayV1
} from "../../src/sim/domains/journey/journeySupportGateway";

function completedRuntime() {
  const runtime = createJourneyRuntime([
    { person_id: "person:traveller", location_id: "location:B", evidence_refs: ["arrival:event"] }
  ], { relative_month: 2, phase: "closing" });
  const arrangement: JourneyArrangementV1 = {
    schema_version: "phase_five_journey_arrangement_v1",
    journey_arrangement_id: "arrangement:001",
    journey_request_id: "request:001",
    trigger_id: "JRN-016",
    owning_domain: "estate_holdings",
    primary_purpose_ref: "inspection:001",
    decision_owner_responsibility_instance_id: "responsibility:001",
    competent_proceeding_ref: null,
    principal_person_id: "person:traveller",
    profile_key: "small_noble_retinue",
    route_posture: "fastest_viable",
    return_or_end_posture: "remain",
    authority_evidence_refs: ["authority:001"],
    sponsor_and_support_basis_ref: "support:001",
    hosting_visit_arrangement_id: "hosting:001",
    hosting_entity_id: "house:host",
    planned_destination_stay: {
      arrival_cutpoint: { relative_month: 2, phase: "opening" },
      departure_cutpoint: { relative_month: 2, phase: "midmonth" }
    },
    destination_stay_leg_id: "leg:001",
    route_plan_id: "route-plan:001",
    legs: [
      {
        route_leg_id: "leg:001",
        sequence_no: 1,
        from_location_id: "location:A",
        to_location_id: "location:B",
        selected_route_path_ref: "path:A-B",
        crossing_access_right_refs: ["right:bridge"],
        planned_stops: [],
        condition_posture: "normal",
        departure_cutpoint: { relative_month: 1, phase: "closing" },
        arrival_cutpoint: { relative_month: 2, phase: "opening" },
        distance_cost: 30,
        expected_travel_days: 2,
        source_status: "admitted",
        source_refs: ["route:evidence"],
        named_party: [
          {
            journey_leg_id: "leg:001",
            person_id: "person:traveller",
            party_role: "principal",
            participation_basis_ref: "decision:001",
            required_or_discretionary: "required",
            origin_presence_ref: "presence:A",
            origin_residence_ref: "residence:A",
            absence_impact_refs: [],
            custody_or_authority_basis_ref: null,
            arrival_disposition: "remain",
            source_refs: ["person:evidence"]
          }
        ],
        aggregate_party: {
          ordinary_attendant_count: 2,
          guard_rank_and_file_count: 3,
          driver_groom_handler_count: 1,
          other_service_person_count: 0,
          riding_animal_count: 2,
          pack_animal_count: 1,
          cart_wagon_count: 0,
          baggage_support_band: "ordinary",
          armed_posture: "ordinary_escort",
          aggregate_source_basis: "fixture",
          source_refs: ["party:evidence"]
        }
      }
    ],
    continuation_kind: "root",
    parent_journey_arrangement_ids: [],
    source_refs: ["arrangement:evidence"],
    direct_domain_mutation: false,
    direct_resource_or_gl_mutation: false,
    direct_art_mutation: false
  };
  return {
    ...runtime,
    arrangements_by_id: { [arrangement.journey_arrangement_id]: arrangement },
    runtime_by_arrangement_id: {
      [arrangement.journey_arrangement_id]: {
        journey_arrangement_id: arrangement.journey_arrangement_id,
        status: "completed" as const,
        leg_status_by_id: { "leg:001": "arrived" as const },
        active_leg_id: null,
        result_receipt_refs: ["receipt:arrival"]
      }
    },
    presence_ledger: {
      ...runtime.presence_ledger,
      presence_events: [
        {
          event_id: "event:departure",
          person_id: "person:traveller",
          journey_arrangement_id: arrangement.journey_arrangement_id,
          journey_leg_id: "leg:001",
          event_kind: "departed" as const,
          cutpoint: { relative_month: 1, phase: "closing" as const },
          from_location_id: "location:A",
          to_location_id: null,
          source_refs: ["route:evidence"]
        },
        {
          event_id: "event:arrival",
          person_id: "person:traveller",
          journey_arrangement_id: arrangement.journey_arrangement_id,
          journey_leg_id: "leg:001",
          event_kind: "arrived" as const,
          cutpoint: { relative_month: 2, phase: "opening" as const },
          from_location_id: null,
          to_location_id: "location:B",
          source_refs: ["route:evidence"]
        }
      ],
      stay_facts: [
        {
          stay_fact_id: "stay:destination",
          journey_arrangement_id: arrangement.journey_arrangement_id,
          journey_leg_id: "leg:001",
          location_id: "location:B",
          provider_kind: "journey_destination" as const,
          host_entity_id: "house:host",
          admission_ref: "hosting:001",
          arrival_cutpoint: { relative_month: 2, phase: "opening" as const },
          departure_cutpoint: { relative_month: 2, phase: "midmonth" as const },
          named_person_count: 1,
          aggregate_service_person_count: 6,
          animal_count: 3,
          cart_wagon_count: 0,
          source_refs: ["stay:evidence"]
        }
      ]
    }
  };
}

describe("Phase Five Journey support/economy boundary", () => {
  it("derives demand only from actual completed movement and stays", () => {
    const observations = buildJourneySupportDemandObservations(
      completedRuntime(),
      new Set(["arrangement:001"]),
    );
    expect(observations).toHaveLength(2);
    expect(observations.map((row) => row.observation_kind)).toEqual(["travel_leg", "destination_stay"]);
    expect(observations.find((row) => row.observation_kind === "travel_leg")).toMatchObject({
      route_completion_state: "completed_leg",
      elapsed_days: 2,
      named_person_count: 1,
      aggregate_service_person_count: 6,
      human_person_days: 14,
      animal_days: 6,
      direct_resource_or_gl_mutation: false,
      direct_hsu_mutation: false
    });
    expect(observations.find((row) => row.observation_kind === "destination_stay")).toMatchObject({
      elapsed_days: 14,
      named_person_count: 1,
      aggregate_service_person_count: 6,
      human_person_days: 98,
      animal_days: 42,
      direct_resource_or_gl_mutation: false,
      direct_hsu_mutation: false
    });
  });

  it("preserves actual partial travel demand after a terminal mid-leg recovery without claiming a crossing", () => {
    const base = completedRuntime();
    const arrangement = base.arrangements_by_id["arrangement:001"]!;
    const interrupted = {
      ...base,
      runtime_by_arrangement_id: {
        "arrangement:001": {
          journey_arrangement_id: "arrangement:001",
          status: "failed" as const,
          leg_status_by_id: { "leg:001": "failed" as const },
          active_leg_id: null,
          result_receipt_refs: ["receipt:terminal"],
        },
      },
      presence_ledger: {
        ...base.presence_ledger,
        stay_facts: [],
        presence_events: [
          base.presence_ledger.presence_events[0]!,
          {
            event_id: "event:recovered",
            person_id: "person:traveller",
            journey_arrangement_id: "arrangement:001",
            journey_leg_id: "leg:001",
            event_kind: "recovered" as const,
            cutpoint: { relative_month: 2, phase: "opening" as const },
            from_location_id: null,
            to_location_id: "location:A",
            source_refs: ["recovery:evidence"],
          },
        ],
        receipts: [{
          schema_version: "phase_five_journey_receipt_v1" as const,
          journey_receipt_id: "receipt:terminal",
          journey_arrangement_id: "arrangement:001",
          journey_leg_id: "leg:001",
          result_code: "failed" as const,
          cutpoint: { relative_month: 2, phase: "opening" as const },
          actual_location_id: "location:A",
          named_person_ids: ["person:traveller"],
          presence_event_refs: ["event:recovered"],
          hosting_and_material_request_refs: [],
          domain_handoff_intent_refs: [],
          knowledge_evidence_refs: [],
          reason_codes: ["route_failed"],
          source_refs: ["terminal:evidence"],
          direct_domain_mutation: false as const,
          direct_resource_or_gl_mutation: false as const,
          direct_art_mutation: false as const,
        }],
      },
    };
    const observations = buildJourneySupportDemandObservations(
      interrupted,
      new Set([arrangement.journey_arrangement_id]),
    );
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      observation_kind: "travel_leg",
      route_completion_state: "terminal_partial",
      opening_cutpoint: { relative_month: 1, phase: "closing" },
      closing_cutpoint: { relative_month: 2, phase: "opening" },
      elapsed_days: 1,
      human_person_days: 7,
    });
    expect(observations[0]!.requested_gateway_kinds).not.toContain("toll_or_ferry");
    expect(observations[0]!.source_refs).toEqual(
      expect.arrayContaining(["event:departure", "receipt:terminal"]),
    );
  });

  it("withholds without gateways and never mutates resources, HSU, or GL", () => {
    const result = submitJourneySupportGatewayHandoffs({
      runtime: completedRuntime(),
      runtime_authoritative_arrangement_ids: new Set(["arrangement:001"]),
    });
    expect(result.demand_evidence).toHaveLength(2);
    expect(result.demand_evidence.every((row) => row.status === "withheld")).toBe(true);
    expect(result.demand_evidence.every((row) => row.reason_codes.includes("journey_demand_gateway_not_bound"))).toBe(true);
    expect(result.economy_evidence).toHaveLength(0);
    expect(result.direct_resource_or_gl_mutation).toBe(false);
    expect(result.direct_hsu_mutation).toBe(false);
  });

  it("forwards actual demand and exact admitted economic terms through injected gateways", () => {
    const observations = buildJourneySupportDemandObservations(
      completedRuntime(),
      new Set(["arrangement:001"]),
    );
    const travel = observations.find((row) => row.observation_kind === "travel_leg")!;
    const demandGateway: JourneyDemandGatewayV1 = {
      submitActualJourneyDemand(observation) {
        return {
          observation_id: observation.observation_id,
          status: "accepted",
          evidence_id: `demand-evidence:${observation.observation_id}`,
          reason_codes: [],
          source_refs: ["demand-gateway:test"]
        };
      }
    };
    const result = submitJourneySupportGatewayHandoffs({
      runtime: completedRuntime(),
      runtime_authoritative_arrangement_ids: new Set(["arrangement:001"]),
      demand_gateway: demandGateway,
      admitted_economic_terms: [
        {
          term_id: "term:toll:001",
          observation_id: travel.observation_id,
          economic_leg_id: "economic-leg:toll:001",
          resource_kind: "coin",
          quantity: 2,
          unit: "coin",
          due_at: "turn:1:month:2",
          settlement_mode: "toll_fee",
          payer: { economic_entity_id: "house:traveller", account_id: "account:traveller", custody_ref: "custody:traveller" },
          payee: { economic_entity_id: "right:bridge", account_id: "account:bridge", custody_ref: "custody:bridge" },
          authority_ref: "right:bridge",
          source_refs: ["term:evidence"]
        }
      ],
      economy_gateway: {
        submitExactCounterpartiedRequest(request) {
          return {
            request_id: request.request_id,
            idempotency_key: request.idempotency_key,
            economic_leg_id: request.economic_leg_id,
            status: "accepted",
            evidence_id: "economy-evidence:toll:001",
            reason_codes: [],
            source_refs: ["economy-gateway:test"]
          };
        }
      }
    });
    expect(result.demand_evidence.every((row) => row.status === "accepted")).toBe(true);
    expect(result.economy_evidence).toHaveLength(1);
    expect(result.economy_evidence[0]).toMatchObject({
      status: "accepted",
      request_forwarded_to_gateway: true,
      evidence: {
        gateway_evidence_id: "economy-evidence:toll:001",
        material_mutation_by_bridge: false,
        direct_gl_posting_by_bridge: false
      }
    });
  });

  it("withholds non-authoritative arrangements and malformed gateway evidence", () => {
    expect(buildJourneySupportDemandObservations(
      completedRuntime(),
      new Set(),
    )).toEqual([]);
    const result = submitJourneySupportGatewayHandoffs({
      runtime: completedRuntime(),
      runtime_authoritative_arrangement_ids: new Set(["arrangement:001"]),
      demand_gateway: {
        submitActualJourneyDemand(observation) {
          return {
            observation_id: observation.observation_id,
            status: "accepted",
            evidence_id: "",
            reason_codes: [],
            source_refs: [],
          };
        },
      },
    });
    expect(result.demand_evidence.every((row) => row.status === "withheld")).toBe(true);
    expect(result.demand_evidence[0]!.reason_codes).toEqual(
      expect.arrayContaining([
        "missing_gateway_evidence_id",
        "missing_gateway_source_refs",
      ]),
    );
  });
});
