import { describe, expect, it } from "vitest";
import {
  JOURNEY_ARRANGEMENT_SCHEMA_VERSION,
  type JourneyArrangementV1
} from "../../src/sim/domains/journey/journeyContracts";
import { buildJourneyHistoricalReplayCandidate } from "../../src/sim/domains/journey/journeyReplay";

function exactHostedArrangement(): JourneyArrangementV1 {
  return {
    schema_version: JOURNEY_ARRANGEMENT_SCHEMA_VERSION,
    journey_arrangement_id: "journey-arrangement:history-proof:001",
    journey_request_id: "journey-request:history-proof:001",
    trigger_id: "JRN-013",
    owning_domain: "courtos.responsibility.patronage_hospitality_gifts",
    primary_purpose_ref: "generated-sim-purpose:visit:001",
    decision_owner_responsibility_instance_id: "responsibility:patronage-hospitality:house-a",
    competent_proceeding_ref: null,
    principal_person_id: "person:visitor",
    profile_key: "small_noble_retinue",
    route_posture: "fastest_viable",
    return_or_end_posture: "remain",
    authority_evidence_refs: ["generated-sim-authority:visit:001"],
    sponsor_and_support_basis_ref: "generated-sim-support:house-a",
    hosting_visit_arrangement_id: "hosting-visit-arrangement:001",
    hosting_entity_id: "house:historical-host",
    planned_destination_stay: {
      arrival_cutpoint: { relative_month: 1, phase: "midmonth" },
      departure_cutpoint: { relative_month: 1, phase: "closing" }
    },
    destination_stay_leg_id: "journey-leg:history-proof:001",
    route_plan_id: "route-plan:history-proof:001",
    legs: [
      {
        route_leg_id: "journey-leg:history-proof:001",
        sequence_no: 1,
        from_location_id: "location:origin",
        to_location_id: "location:host",
        selected_route_path_ref: "route-path:origin-host",
        crossing_access_right_refs: [],
        planned_stops: [],
        condition_posture: "normal",
        departure_cutpoint: { relative_month: 1, phase: "opening" },
        arrival_cutpoint: { relative_month: 1, phase: "midmonth" },
        distance_cost: 20,
        expected_travel_days: 5,
        source_status: "foundation_a_provisional",
        source_refs: ["generated-sim-route:001"],
        named_party: [
          {
            journey_leg_id: "journey-leg:history-proof:001",
            person_id: "person:visitor",
            party_role: "principal",
            participation_basis_ref: "generated-sim-purpose:visit:001",
            required_or_discretionary: "required",
            origin_presence_ref: "opening-presence:person:visitor:1117",
            origin_residence_ref: "residence:person:visitor:1117",
            absence_impact_refs: ["responsibility:visitor-house-command"],
            custody_or_authority_basis_ref: null,
            arrival_disposition: "remain",
            source_refs: ["generated-sim-party:001"]
          }
        ],
        aggregate_party: {
          ordinary_attendant_count: 2,
          guard_rank_and_file_count: 2,
          driver_groom_handler_count: 1,
          other_service_person_count: 0,
          riding_animal_count: 1,
          pack_animal_count: 2,
          cart_wagon_count: 0,
          baggage_support_band: "ordinary",
          armed_posture: "ordinary_escort",
          aggregate_source_basis: "party-calibration:small-noble-retinue:v1",
          source_refs: ["party-calibration:small-noble-retinue:v1"]
        }
      }
    ],
    continuation_kind: "root",
    parent_journey_arrangement_ids: [],
    source_refs: ["generated-sim-purpose:visit:001", "hosting-visit-arrangement:001"],
    direct_domain_mutation: false,
    direct_resource_or_gl_mutation: false,
    direct_art_mutation: false
  };
}

function exactInput(hostAcceptanceSourceRef: string | null) {
  return {
    replay_id: "journey-history-replay:proof:001",
    start_year: 1117 as const,
    route_foundation_ref: "journey-foundation-a:proof",
    opening_presence: [
      {
        person_id: "person:visitor",
        location_id: "location:origin",
        evidence_refs: ["opening-presence:person:visitor:1117"]
      }
    ],
    purposes: [
      {
        arrangement: exactHostedArrangement(),
        purpose_source_status: "generated_sim_receipt" as const,
        purpose_source_ref: "generated-sim-purpose:visit:001",
        host_acceptance_source_ref: hostAcceptanceSourceRef
      }
    ],
    source_refs: ["generated-sim-run:1117-1119:proof"]
  };
}

describe("Phase Five Journey 1117–1119 historical replay gate", () => {
  it("withholds evidence-only history when no admitted purpose or 1117 opening presence is supplied", () => {
    const result = buildJourneyHistoricalReplayCandidate({
      replay_id: "journey-history-replay:evidence-only",
      start_year: 1117,
      route_foundation_ref: "journey-foundation-a:proof",
      opening_presence: [],
      purposes: [],
      source_refs: ["step5fg:economic-anchor-only"]
    });
    expect(result).toEqual(
      expect.objectContaining({
        status: "withheld",
        reason_codes: expect.arrayContaining([
          "missing_1117_opening_presence",
          "no_admitted_historical_journey_purposes"
        ])
      })
    );
  });

  it("withholds a hosted arrangement when the host acceptance source is absent", () => {
    const result = buildJourneyHistoricalReplayCandidate(exactInput(null));
    expect(result).toEqual(
      expect.objectContaining({
        status: "withheld",
        reason_codes: ["missing_host_acceptance_source_ref:journey-arrangement:history-proof:001"]
      })
    );
  });

  it("builds byte-stable candidate rows when exact generated-simulation inputs are supplied", () => {
    const first = buildJourneyHistoricalReplayCandidate(exactInput("host-acceptance:001"));
    const second = buildJourneyHistoricalReplayCandidate(exactInput("host-acceptance:001"));
    expect(first).toEqual(second);
    expect(first.status).toBe("candidate_built");
    if (first.status !== "candidate_built") return;
    expect(first.replay.month_count).toBe(36);
    expect(first.replay.deterministic_digest).toMatch(/^fnv1a32:/u);
    expect(first.candidate_rows.some((row) => row.candidate_kind === "hosting_person_days")).toBe(true);
    expect(first.source_candidate_only).toBe(true);
    expect(first.promotion_authority).toBe(false);
    expect(first.replay.direct_resource_or_gl_mutation).toBe(false);
    expect(first.replay.direct_art_mutation).toBe(false);
  });
});
