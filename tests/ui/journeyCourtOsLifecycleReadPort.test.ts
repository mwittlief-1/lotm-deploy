import { describe, expect, it } from "vitest";

import {
  JOURNEY_ARRANGEMENT_SCHEMA_VERSION,
  type JourneyArrangementV1,
} from "../../src/sim/domains/journey/journeyContracts";
import {
  createJourneyRuntime,
  type JourneyRuntimeV1,
} from "../../src/sim/domains/journey/journeyLifecycle";
import {
  JOURNEY_COURTOS_LIFECYCLE_READ_PORT_SCHEMA_VERSION,
  createJourneyCourtOsLifecycleReadPort,
  journeyCourtOsWorkspacePlacement,
  type JourneyCourtOsKnowledgeProjectionV1,
} from "../../src/ui/readModels/phaseFive/journeyCourtOsLifecycleReadPort";
import { readJourneyCourtOsReadModel } from "../../src/ui/readModels/phaseFive/journeyCourtOsReadModel";

function arrangement(
  id: string,
  principal: string,
  sourceStatus: "admitted" | "foundation_a_provisional" = "admitted",
): JourneyArrangementV1 {
  return {
    schema_version: JOURNEY_ARRANGEMENT_SCHEMA_VERSION,
    journey_arrangement_id: id,
    journey_request_id: `request:${id}`,
    trigger_id: "JRN-016",
    owning_domain: "courtos.responsibility.manor_stewardship",
    primary_purpose_ref: `inspection:${id}`,
    decision_owner_responsibility_instance_id: `responsibility:${id}`,
    competent_proceeding_ref: null,
    principal_person_id: principal,
    profile_key: "light_personal",
    route_posture: "fastest_viable",
    return_or_end_posture: "remain",
    authority_evidence_refs: [`authority:${id}`],
    sponsor_and_support_basis_ref: `support:${id}`,
    hosting_visit_arrangement_id: null,
    planned_destination_stay: null,
    destination_stay_leg_id: null,
    route_plan_id: `route:${id}`,
    legs: [{
      route_leg_id: `leg:${id}`,
      sequence_no: 1,
      from_location_id: "location:A",
      to_location_id: "location:B",
      selected_route_path_ref: `path:${id}`,
      crossing_access_right_refs: [],
      planned_stops: [],
      condition_posture: "normal",
      departure_cutpoint: { relative_month: 2, phase: "opening" },
      arrival_cutpoint: { relative_month: 2, phase: "closing" },
      distance_cost: 10,
      expected_travel_days: 8,
      source_status: sourceStatus,
      source_refs: [`route-source:${id}`],
      named_party: [{
        journey_leg_id: `leg:${id}`,
        person_id: principal,
        party_role: "principal",
        participation_basis_ref: `inspection:${id}`,
        required_or_discretionary: "required",
        origin_presence_ref: `presence:${principal}`,
        origin_residence_ref: `residence:${principal}`,
        absence_impact_refs: [],
        custody_or_authority_basis_ref: null,
        arrival_disposition: "return",
        source_refs: [`party-source:${principal}`],
      }],
      aggregate_party: {
        ordinary_attendant_count: 0,
        guard_rank_and_file_count: 0,
        driver_groom_handler_count: 0,
        other_service_person_count: 0,
        riding_animal_count: 1,
        pack_animal_count: 0,
        cart_wagon_count: 0,
        baggage_support_band: "light",
        armed_posture: "none",
        aggregate_source_basis: "admitted_test_contract",
        source_refs: ["admitted:test-contract"],
      },
    }],
    continuation_kind: "root",
    parent_journey_arrangement_ids: [],
    source_refs: [`arrangement-source:${id}`],
    direct_domain_mutation: false,
    direct_resource_or_gl_mutation: false,
    direct_art_mutation: false,
  };
}

function runtime(rows: readonly JourneyArrangementV1[]): JourneyRuntimeV1 {
  const base = createJourneyRuntime(rows.map((row) => ({
    person_id: row.principal_person_id,
    location_id: "location:A",
    evidence_refs: [`opening:${row.principal_person_id}`],
  })));
  return {
    ...base,
    arrangements_by_id: Object.fromEntries(rows.map((row) => [row.journey_arrangement_id, row])),
    runtime_by_arrangement_id: Object.fromEntries(rows.map((row) => [row.journey_arrangement_id, {
      journey_arrangement_id: row.journey_arrangement_id,
      status: "planned" as const,
      leg_status_by_id: { [row.legs[0]!.route_leg_id]: "pending" as const },
      active_leg_id: null,
      result_receipt_refs: [],
    }])),
  };
}

function lifecycleAuthorityBinding(row: JourneyArrangementV1) {
  return {
    journey_arrangement_id: row.journey_arrangement_id,
    trigger_source_status: "admitted_runtime_input" as const,
    party_source_status: "admitted_runtime_input" as const,
    route_source_status: "admitted_runtime_input" as const,
    support_source_status: "admitted_runtime_input" as const,
    source_refs: [`lifecycle-authority:${row.journey_arrangement_id}`],
    runtime_authority: true as const,
  };
}

function knowledge(input: {
  arrangementId: string;
  viewerId: string;
  houseId: string;
  governanceVisible?: boolean;
}): JourneyCourtOsKnowledgeProjectionV1 {
  return {
    schema_version: "phase_five_journey_courtos_knowledge_projection_v1",
    journey_arrangement_id: input.arrangementId,
    viewer_person_id: input.viewerId,
    acting_house_id: input.houseId,
    as_of_cutpoint_id: "cutpoint:1120:1:opening",
    entitlement: {
      governance_visible: input.governanceVisible ?? true,
      operational_visible: true,
      report_visible: true,
      direct_evidence_visible: false,
      domain_actions_visible: true,
    },
    knowledge_posture: "confirmed",
    primary_purpose_label: "Inspect the manor",
    principal: { id: "person:A", label: "The appointed inspector" },
    origin: { id: "location:A", label: "Home manor" },
    destination: { id: "location:B", label: "Outlying manor" },
    named_party: [{ id: "person:A", label: "The appointed inspector" }],
    route_posture_label: "Direct admitted route",
    end_posture_label: "Return home",
    aggregate_party_summary: "A light inspection party",
    absence_and_coverage_summary: "Local duties require cover during the absence.",
    schedule_effect_summary: "Orders at the destination begin after arrival.",
    last_known_location_label: "Home manor",
    report: null,
    matters: [],
    domain_action_intents: [{
      command_id: "estate.review-inspection-commitment",
      command_kind: "review_purpose",
      label: "Review the inspection commitment",
      enabled: true,
      withheld_reason: null,
    }],
    source_status: "admitted_read_model",
    source_refs: ["knowledge:admitted-test-contract"],
    runtime_authority: true,
  };
}

describe("Journey CourtOS lifecycle read port", () => {
  it("filters by House before querying Knowledge and emits a real 24-hierarchy workspace route", () => {
    const houseAJourney = arrangement("arrangement:A", "person:A");
    const houseBJourney = arrangement("arrangement:B", "person:B");
    const queried: string[] = [];
    const port = createJourneyCourtOsLifecycleReadPort({
      schema_version: JOURNEY_COURTOS_LIFECYCLE_READ_PORT_SCHEMA_VERSION,
      runtime_source: {
        runtime: runtime([houseAJourney, houseBJourney]),
        calendar_epoch: { opening_year: 1120, opening_month: 1 },
        source_refs: ["runtime:admitted-test-contract"],
        runtime_authority: true,
      },
      lifecycle_authority_bindings: [
        lifecycleAuthorityBinding(houseAJourney),
        lifecycleAuthorityBinding(houseBJourney),
      ],
      house_scope_bindings: [
        {
          journey_arrangement_id: houseAJourney.journey_arrangement_id,
          acting_house_id: "house:A",
          owning_scope_id: "manor:A",
          source_refs: ["scope:A"],
          runtime_authority: true,
        },
        {
          journey_arrangement_id: houseBJourney.journey_arrangement_id,
          acting_house_id: "house:B",
          owning_scope_id: "manor:B",
          source_refs: ["scope:B"],
          runtime_authority: true,
        },
      ],
      knowledge_gateway: {
        readJourneyKnowledge(input) {
          queried.push(input.journey_arrangement_id);
          return knowledge({
            arrangementId: input.journey_arrangement_id,
            viewerId: input.viewer_context.viewer_person_id,
            houseId: input.acting_house_id,
          });
        },
      },
    });
    const model = readJourneyCourtOsReadModel({
      viewer_context: {
        viewer_person_id: "viewer:A",
        acting_house_id: "house:A",
        as_of_cutpoint_id: "cutpoint:1120:1:opening",
        development_uat_provenance_enabled: false,
      },
      lifecycle_port: port,
    });

    expect(queried).toEqual(["arrangement:A"]);
    expect(model.visible_journey_count).toBe(1);
    expect(JSON.stringify(model)).not.toContain("arrangement:B");
    expect(model.status_cards[0]).toMatchObject({
      owning_domain_ref: "courtos.responsibility.manor_stewardship",
      owning_responsibility_key: "courtos.responsibility.manor_stewardship",
      owning_workspace_ref: expect.stringContaining("responsibility=manor_stewardship"),
      lifecycle_status: "scheduled",
    });
    expect(model.status_cards[0]?.owning_workspace_ref).toContain("scope=manor%3AA");
    expect(model.status_cards[0]?.domain_command_links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        command_kind: "open_owning_workspace",
        command_owner_ref: "courtos.responsibility.manor_stewardship",
      }),
      expect.objectContaining({ command_id: "estate.review-inspection-commitment" }),
    ]));
  });

  it("withholds the entire row when the Knowledge gateway denies existence visibility", () => {
    const row = arrangement("arrangement:hidden", "person:A");
    const port = createJourneyCourtOsLifecycleReadPort({
      schema_version: JOURNEY_COURTOS_LIFECYCLE_READ_PORT_SCHEMA_VERSION,
      runtime_source: {
        runtime: runtime([row]),
        calendar_epoch: { opening_year: 1120, opening_month: 1 },
        source_refs: ["runtime:test"],
        runtime_authority: true,
      },
      lifecycle_authority_bindings: [lifecycleAuthorityBinding(row)],
      house_scope_bindings: [{
        journey_arrangement_id: row.journey_arrangement_id,
        acting_house_id: "house:A",
        owning_scope_id: null,
        source_refs: ["scope:test"],
        runtime_authority: true,
      }],
      knowledge_gateway: {
        readJourneyKnowledge(input) {
          return knowledge({
            arrangementId: input.journey_arrangement_id,
            viewerId: input.viewer_context.viewer_person_id,
            houseId: input.acting_house_id,
            governanceVisible: false,
          });
        },
      },
    });
    expect(port.readJourneyLifecycleForCourtOs({
      viewer_person_id: "viewer:A",
      acting_house_id: "house:A",
      as_of_cutpoint_id: "cutpoint:1120:1:opening",
      development_uat_provenance_enabled: false,
    })).toEqual([]);
  });

  it("rejects provisional route legs instead of presenting them as runtime-authoritative", () => {
    const provisional = arrangement(
      "arrangement:provisional",
      "person:A",
      "foundation_a_provisional",
    );
    expect(() => createJourneyCourtOsLifecycleReadPort({
      schema_version: JOURNEY_COURTOS_LIFECYCLE_READ_PORT_SCHEMA_VERSION,
      runtime_source: {
        runtime: runtime([provisional]),
        calendar_epoch: { opening_year: 1120, opening_month: 1 },
        source_refs: ["runtime:provisional-test"],
        runtime_authority: true,
      },
      lifecycle_authority_bindings: [lifecycleAuthorityBinding(provisional)],
      house_scope_bindings: [],
      knowledge_gateway: { readJourneyKnowledge: () => null },
    })).toThrow(
      "journey_lifecycle_authority_not_admitted:arrangement:provisional",
    );
  });

  it("ignores an unbound development arrangement in a mixed runtime", () => {
    const admitted = arrangement("arrangement:admitted", "person:A");
    const development = arrangement(
      "arrangement:development",
      "person:B",
      "foundation_a_provisional",
    );
    const queried: string[] = [];
    const port = createJourneyCourtOsLifecycleReadPort({
      schema_version: JOURNEY_COURTOS_LIFECYCLE_READ_PORT_SCHEMA_VERSION,
      runtime_source: {
        runtime: runtime([admitted, development]),
        calendar_epoch: { opening_year: 1120, opening_month: 1 },
        source_refs: ["runtime:mixed-test"],
        runtime_authority: true,
      },
      lifecycle_authority_bindings: [lifecycleAuthorityBinding(admitted)],
      house_scope_bindings: [{
        journey_arrangement_id: admitted.journey_arrangement_id,
        acting_house_id: "house:A",
        owning_scope_id: "manor:A",
        source_refs: ["scope:admitted"],
        runtime_authority: true,
      }],
      knowledge_gateway: {
        readJourneyKnowledge(input) {
          queried.push(input.journey_arrangement_id);
          return knowledge({
            arrangementId: input.journey_arrangement_id,
            viewerId: input.viewer_context.viewer_person_id,
            houseId: input.acting_house_id,
          });
        },
      },
    });
    const rows = port.readJourneyLifecycleForCourtOs({
      viewer_person_id: "viewer:A",
      acting_house_id: "house:A",
      as_of_cutpoint_id: "cutpoint:1120:1:opening",
      development_uat_provenance_enabled: false,
    });
    expect(queried).toEqual(["arrangement:admitted"]);
    expect(rows.map((row) => row.journey_arrangement_id)).toEqual([
      "arrangement:admitted",
    ]);
  });

  it("routes proceeding-owned journeys to House Command rather than inventing a responsibility", () => {
    const placement = journeyCourtOsWorkspacePlacement({
      trigger_id: "JRN-058",
      owning_scope_id: "case:1",
    });
    expect(placement).toMatchObject({
      workspace_ref: "?place=house_command",
      workspace_label: "House Command",
      command_owner_ref: "proceeding.justice_case_proceeding",
      responsibility_key: null,
    });
  });
});
