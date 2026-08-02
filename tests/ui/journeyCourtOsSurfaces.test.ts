import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildJourneyRequestDraft } from "../../src/sim/phaseFive/journeyDomainAdapter";
import {
  JourneyCourtOsSurfaces,
  JourneyHouseCommandContext,
  JourneyResponsibilityContext,
} from "../../src/ui/panels/JourneyCourtOsSurfaces";
import { courtOsRouteForJourneyCommand } from "../../src/ui/panels/HouseholdVerticalSlice";
import {
  buildJourneyCourtOsReadModel,
  buildJourneyPlanningSurface,
  readJourneyCourtOsReadModel,
  type JourneyLifecycleProjectionInputV1,
} from "../../src/ui/readModels/phaseFive/journeyCourtOsReadModel";

const DOMAIN = "courtos.responsibility.manor_stewardship";

function lifecycle(overrides: Partial<JourneyLifecycleProjectionInputV1> = {}): JourneyLifecycleProjectionInputV1 {
  return {
    journey_record_id: "journey-record:inspection-1",
    journey_request_id: "journey-request:inspection-1",
    journey_arrangement_id: "journey-arrangement:inspection-1",
    trigger_id: "JRN-016",
    primary_purpose_ref: "inspection-commitment:manor-2",
    primary_purpose_label: "Inspect the holding at Eastmere",
    owning_domain_ref: DOMAIN,
    decision_owner_responsibility_instance_id: "responsibility:manor-stewardship:manor-2",
    competent_proceeding_ref: null,
    owning_workspace_ref: "courtos://estate/manor-stewardship/manor-2",
    owning_workspace_label: "Manor Stewardship · Eastmere",
    acting_house_id: "house:1",
    principal: { id: "person:hoh-1", label: "Aldred of Merecross" },
    origin: { id: "anchor:home", label: "Merecross Hall" },
    destination: { id: "anchor:eastmere", label: "Eastmere Manor" },
    departure_window_label: "Spring 1120",
    departure_absolute_month: 4,
    expected_arrival_label: "Before the close of spring",
    return_window_label: "Early summer 1120",
    planned_stay_label: "One monthly cutpoint",
    route_posture_label: "Safest viable route",
    end_posture_label: "Return to Merecross Hall",
    lifecycle_status: "scheduled",
    status_label: "Expected to depart in spring",
    last_known_location_label: "Merecross Hall",
    named_party: [
      { id: "person:hoh-1", label: "Aldred of Merecross" },
      { id: "person:clerk-1", label: "Oswin the Clerk" },
    ],
    aggregate_party_summary: "A light inspection party with ordinary escort",
    absence_and_coverage_summary: "The Head will be away; Household governance remains covered by the steward.",
    schedule_effect_summary: "Instructions issued at Eastmere take effect after arrival.",
    knowledge_posture: "confirmed",
    report: {
      report_id: "report:inspection-1",
      author_ref: { id: "person:steward-2", label: "Godwin of Eastmere" },
      source_kind: "responsible_party",
      observed_period_label: "Winter 1119 to spring 1120",
      received_cutpoint_id: "cutpoint:1120:3:closing",
      knowledge_posture: "reported",
      summary: "The steward expects the residence to be ready for the visit.",
      uncertainty_note: "The southern bridge has not been inspected this season.",
      evidence_basis_label: "Steward's oral report, carried by a household messenger",
      receipt_refs: ["receipt:message-2", "receipt:message-1"],
    },
    matters: [
      {
        matter_id: "matter:bridge",
        summary: "The southern bridge may delay the visit",
        why_it_matters: "The decision must be made before the party departs.",
        deadline_label: "Before month 4",
        deadline_before_next_council: true,
        retained_decision_required: true,
        material_consequence_if_ignored: true,
        council_eligible: true,
        reason_codes: ["route_uncertain"],
        command_links: [{
          command_id: "estate.command.review-inspection-route",
          command_kind: "respond_to_matter",
          command_owner_ref: DOMAIN,
          label: "Review the inspection plan",
          enabled: true,
          withheld_reason: null,
        }],
      },
      {
        matter_id: "matter:report",
        summary: "Review the steward's account at Council",
        why_it_matters: "The condition report remains uncertain.",
        deadline_label: null,
        deadline_before_next_council: false,
        retained_decision_required: true,
        material_consequence_if_ignored: false,
        council_eligible: true,
        reason_codes: ["report_uncertain"],
        command_links: [],
      },
    ],
    command_links: [{
      command_id: "estate.command.open-eastmere-stewardship",
      command_kind: "open_owning_workspace",
      command_owner_ref: DOMAIN,
      label: "Return to Eastmere stewardship",
      enabled: true,
      withheld_reason: null,
    }],
    entitlement: {
      governance_visible: true,
      operational_visible: true,
      report_visible: true,
      direct_evidence_visible: true,
      domain_actions_visible: true,
    },
    source_status: "runtime_receipt",
    runtime_authority: true,
    source_refs: ["journey-arrangement:inspection-1", "journey-receipt:schedule-1"],
    ...overrides,
  };
}

function planning() {
  const draft = buildJourneyRequestDraft({
    domain_request_id: "inspection-1",
    trigger_id: "JRN-016",
    initiating_owner_key: DOMAIN,
    primary_purpose_ref: "inspection-commitment:manor-2",
    decision_owner_responsibility_instance_id: "responsibility:manor-stewardship:manor-2",
    competent_proceeding_ref: null,
    initiating_actor_id: "person:hoh-1",
    principal_person_id: "person:hoh-1",
    origin_location_anchor_id: "anchor:home",
    destination_location_anchor_id: "anchor:eastmere",
    desired_window: {
      earliest_departure: { relative_month: 4, phase: "opening" },
      latest_arrival: { relative_month: 5, phase: "closing" },
    },
    return_window: {
      earliest_departure: { relative_month: 6, phase: "opening" },
      latest_arrival: { relative_month: 7, phase: "closing" },
    },
    planned_destination_stay: {
      arrival_cutpoint: { relative_month: 5, phase: "closing" },
      departure_cutpoint: { relative_month: 6, phase: "opening" },
    },
    route_posture: "safest_viable",
    end_posture: "return",
    named_participant_candidates: [{
      person_id: "person:hoh-1",
      party_role: "principal",
      participation_basis_ref: "inspection-commitment:manor-2",
      required_or_discretionary: "required",
      authority_or_custody_ref: "authority:house-1",
      intended_arrival_disposition: "return",
    }],
    authority_evidence_refs: ["authority:house-1"],
    support_basis: {
      sponsor_entity_id: "house:1",
      support_basis_ref: "support:house-journey-policy",
      support_posture: "house_support",
    },
    owning_domain_command_ref: "estate.command.schedule-inspection",
    source_refs: ["inspection-commitment:manor-2"],
  });
  return buildJourneyPlanningSurface({
    draft,
    presentation: {
      owning_workspace_ref: "courtos://estate/manor-stewardship/manor-2",
      owning_workspace_label: "Manor Stewardship · Eastmere",
      primary_purpose_label: "Inspect Eastmere in person",
      principal_label: "Aldred of Merecross",
      origin_label: "Merecross Hall",
      destination_label: "Eastmere Manor",
      departure_window_label: "Spring 1120",
      return_window_label: "Early summer 1120",
      planned_stay_label: "A short stay",
      party_summary: "Aldred and a light inspection party",
      support_summary: "House-supported within the current inspection policy",
      primary_domain_command: {
        command_id: "estate.command.schedule-inspection",
        command_kind: "modify_commitment",
        command_owner_ref: DOMAIN,
        label: "Schedule the inspection",
        enabled: true,
        withheld_reason: null,
      },
    },
  });
}

describe("Journey CourtOS shared-service surfaces", () => {
  it("projects planning, calendar, lifecycle, report, and Matter views without a Journey room or free-travel action", () => {
    const model = buildJourneyCourtOsReadModel({
      viewer_context: {
        viewer_person_id: "person:hoh-1",
        acting_house_id: "house:1",
        as_of_cutpoint_id: "cutpoint:1120:3:closing",
        development_uat_provenance_enabled: false,
      },
      journeys: [lifecycle()],
    });
    const html = renderToStaticMarkup(React.createElement(JourneyCourtOsSurfaces, { model, planning: planning() }));

    expect(model.visible_journey_count).toBe(1);
    expect(model.next_off_cycle_dispatch_count).toBe(1);
    expect(model.next_council_docket_count).toBe(1);
    expect(model.report_cards[0]?.receipt_refs).toEqual([]);
    expect(html).toContain("Inspect Eastmere in person");
    expect(html).toContain("Schedule the inspection");
    expect(html).toContain("Needs attention before Council");
    expect(html).toContain("Return to Eastmere stewardship");
    expect(html).not.toContain("Send anyone anywhere");
    expect(model.boundaries).toMatchObject({
      journey_is_shared_service_not_responsibility: true,
      standalone_journey_navigation: false,
      generic_free_travel_action: false,
    });
  });

  it("consumes an injected lifecycle port and withholds candidate or non-authoritative rows", () => {
    const model = readJourneyCourtOsReadModel({
      viewer_context: {
        viewer_person_id: "person:hoh-1",
        acting_house_id: "house:1",
        as_of_cutpoint_id: "cutpoint:1120:3:closing",
        development_uat_provenance_enabled: true,
      },
      lifecycle_port: {
        readJourneyLifecycleForCourtOs: () => [
          lifecycle(),
          lifecycle({
            journey_record_id: "candidate:journey-2",
            source_status: "candidate_evidence",
            runtime_authority: false,
            principal: { id: "person:hidden", label: "Must not leak" },
          }),
          lifecycle({ journey_record_id: "other-house", acting_house_id: "house:2" }),
        ],
      },
    });

    expect(model.visible_journey_count).toBe(1);
    expect(model.withheld_journey_count).toBe(1);
    expect(model.candidate_source_row_count).toBe(1);
    expect(JSON.stringify(model)).not.toContain("Must not leak");
    expect(model.report_cards[0]?.receipt_refs).toEqual(["receipt:message-1", "receipt:message-2"]);
  });

  it("honors upstream governance-only entitlement without leaking operational detail", () => {
    const model = buildJourneyCourtOsReadModel({
      viewer_context: {
        viewer_person_id: "person:hoh-1",
        acting_house_id: "house:1",
        as_of_cutpoint_id: "cutpoint:1120:3:closing",
        development_uat_provenance_enabled: true,
      },
      journeys: [lifecycle({
        entitlement: {
          governance_visible: true,
          operational_visible: false,
          report_visible: true,
          direct_evidence_visible: false,
          domain_actions_visible: false,
        },
      })],
    });

    expect(model.calendar_rows[0]).toMatchObject({
      principal_label: "Aldred of Merecross",
      route_summary: "Origin and destination withheld",
      open_command: null,
    });
    expect(model.status_cards[0]?.party_summary).toBeNull();
    expect(model.status_cards[0]?.last_known_location_label).toBeNull();
    expect(model.status_cards[0]?.withheld_fields).toEqual(expect.arrayContaining([
      "origin", "destination", "party", "last_known_location", "direct_evidence",
    ]));
    expect(model.report_cards).toHaveLength(1);
    expect(model.report_cards[0]?.receipt_refs).toEqual([]);
    expect(model.matter_cards).toHaveLength(0);
  });

  it("rejects a generic Journey action because commands remain purpose-owned", () => {
    expect(() => buildJourneyCourtOsReadModel({
      viewer_context: {
        viewer_person_id: "person:hoh-1",
        acting_house_id: "house:1",
        as_of_cutpoint_id: "cutpoint:1120:3:closing",
        development_uat_provenance_enabled: false,
      },
      journeys: [lifecycle({
        command_links: [{
          command_id: "journey.send-anywhere",
          command_kind: "modify_commitment",
          command_owner_ref: DOMAIN,
          label: "Travel anywhere",
          enabled: true,
          withheld_reason: null,
        }],
      })],
    })).toThrow("may not expose a generic Journey command");
  });

  it("embeds all entitled commitments in House Command but only purpose-owned commitments in a responsibility workspace", () => {
    const estate = lifecycle();
    const fiscalOwner = "courtos.responsibility.house_fiscal_administration";
    const fiscal = lifecycle({
      journey_record_id: "journey-record:fiscal-1",
      journey_request_id: "journey-request:fiscal-1",
      journey_arrangement_id: "journey-arrangement:fiscal-1",
      trigger_id: "JRN-027",
      primary_purpose_label: "Inspect the treasury custody",
      owning_domain_ref: fiscalOwner,
      owning_responsibility_key: fiscalOwner,
      owning_workspace_ref: "?place=responsibility&domain=resources_finance&responsibility=house_fiscal_administration",
      owning_workspace_label: "House Fiscal Administration",
      command_links: [{
        command_id: "courtos.open-owning-workspace:house-fiscal",
        command_kind: "open_owning_workspace",
        command_owner_ref: fiscalOwner,
        label: "Open House Fiscal Administration",
        enabled: true,
        withheld_reason: null,
      }],
      matters: [],
      report: null,
    });
    const model = buildJourneyCourtOsReadModel({
      viewer_context: {
        viewer_person_id: "person:hoh-1",
        acting_house_id: "house:1",
        as_of_cutpoint_id: "cutpoint:1120:3:closing",
        development_uat_provenance_enabled: false,
      },
      journeys: [estate, fiscal],
    });
    const houseCommand = renderToStaticMarkup(React.createElement(JourneyHouseCommandContext, { model }));
    const manorWorkspace = renderToStaticMarkup(React.createElement(JourneyResponsibilityContext, {
      model,
      responsibility: "manor_stewardship",
    }));

    expect(houseCommand).toContain("Inspect the holding at Eastmere");
    expect(houseCommand).toContain("Inspect the treasury custody");
    expect(manorWorkspace).toContain("Inspect the holding at Eastmere");
    expect(manorWorkspace).not.toContain("Inspect the treasury custody");
    expect(manorWorkspace).toContain("Commitments owned here");
  });

  it("keeps manor-scoped commitments in their exact workspace and routes only owner-matched commands", () => {
    const eastmere = lifecycle({
      owning_workspace_ref: "?place=responsibility&domain=estate_holdings&responsibility=manor_stewardship&scope=manor:eastmere",
    });
    const westmere = lifecycle({
      journey_record_id: "journey-record:inspection-westmere",
      journey_request_id: "journey-request:inspection-westmere",
      journey_arrangement_id: "journey-arrangement:inspection-westmere",
      primary_purpose_label: "Inspect the holding at Westmere",
      owning_workspace_ref: "?place=responsibility&domain=estate_holdings&responsibility=manor_stewardship&scope=manor:westmere",
      matters: [],
      report: null,
    });
    const model = buildJourneyCourtOsReadModel({
      viewer_context: {
        viewer_person_id: "person:hoh-1",
        acting_house_id: "house:1",
        as_of_cutpoint_id: "cutpoint:1120:3:closing",
        development_uat_provenance_enabled: false,
      },
      journeys: [eastmere, westmere],
    });
    const eastmereWorkspace = renderToStaticMarkup(React.createElement(JourneyResponsibilityContext, {
      model,
      responsibility: "manor_stewardship",
      scopeId: "manor:eastmere",
    }));

    expect(eastmereWorkspace).toContain("Inspect the holding at Eastmere");
    expect(eastmereWorkspace).not.toContain("Inspect the holding at Westmere");
    expect(courtOsRouteForJourneyCommand({
      command_id: "estate.command.open-eastmere-stewardship",
      command_owner_ref: DOMAIN,
      owning_workspace_ref: eastmere.owning_workspace_ref,
    })?.place).toMatchObject({
      kind: "responsibility",
      responsibility: "manor_stewardship",
      scopeId: "manor:eastmere",
    });
    expect(courtOsRouteForJourneyCommand({
      command_id: "spoofed.command",
      command_owner_ref: "courtos.responsibility.house_fiscal_administration",
      owning_workspace_ref: eastmere.owning_workspace_ref,
    })).toBeNull();
    expect(courtOsRouteForJourneyCommand({
      command_id: "proceeding.command.open",
      command_owner_ref: "courtos.proceeding.royal_summons",
      owning_workspace_ref: "?place=house_command",
    })?.place).toEqual({ kind: "house_command" });
    expect(courtOsRouteForJourneyCommand({
      command_id: "spoofed.responsibility.command",
      command_owner_ref: DOMAIN,
      owning_workspace_ref: "?place=house_command",
    })).toBeNull();
  });
});
