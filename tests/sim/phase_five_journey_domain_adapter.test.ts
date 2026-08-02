import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CURRENT_COURTOS_RESPONSIBILITY_KEYS,
  JOURNEY_TRIGGER_REGISTRY,
  buildJourneyRequestDraft,
  classifyJourneyTrigger,
  type JourneyDomainRequestV1,
  type JourneyTriggerIdV1,
} from "../../src/sim/phaseFive/journeyDomainAdapter";

function parseCsv(text: string): Array<Record<string, string>> {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      record.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      record.push(field);
      if (record.some((value) => value.length > 0)) records.push(record);
      record = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length || record.length) {
    record.push(field);
    records.push(record);
  }
  const headers = records.shift() ?? [];
  return records.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function manorInspectionRequest(): JourneyDomainRequestV1 {
  return {
    domain_request_id: "manor-inspection:house-1:manor-2:1120",
    trigger_id: "JRN-016",
    initiating_owner_key: "courtos.responsibility.manor_stewardship",
    primary_purpose_ref: "inspection-commitment:manor-2",
    decision_owner_responsibility_instance_id: "responsibility:manor-stewardship:manor-2",
    competent_proceeding_ref: null,
    initiating_actor_id: "person:hoh-1",
    principal_person_id: "person:hoh-1",
    origin_location_anchor_id: "anchor:home-manor",
    destination_location_anchor_id: "anchor:manor-2",
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
    named_participant_candidates: [
      {
        person_id: "person:clerk-1",
        party_role: "chaplain_clerk_interpreter_or_witness",
        participation_basis_ref: "inspection:records-support",
        required_or_discretionary: "discretionary",
        authority_or_custody_ref: null,
        intended_arrival_disposition: "return",
      },
      {
        person_id: "person:hoh-1",
        party_role: "principal",
        participation_basis_ref: "inspection-commitment:manor-2",
        required_or_discretionary: "required",
        authority_or_custody_ref: "authority:house-1",
        intended_arrival_disposition: "return",
      },
    ],
    authority_evidence_refs: ["authority:house-1", "responsibility:manor-stewardship:manor-2"],
    support_basis: {
      sponsor_entity_id: "house:1",
      support_basis_ref: "support:house-journey-policy",
      support_posture: "house_support",
    },
    hosting_visit_arrangement_id: "hosting:inspection:manor-2",
    host_acceptance_required: true,
    owning_domain_command_ref: "estate.command.schedule-inspection",
    source_refs: ["responsibility:manor-stewardship:manor-2", "inspection-commitment:manor-2"],
  };
}

describe("Phase Five Journey domain adapter", () => {
  it("matches the exact reviewed SQLite trigger rows and controlling responsibility registry", () => {
    const sourceRows = parseCsv(readFileSync(
      "data/genrun/phase_five_journey_mobility_execution_readiness_v1/journey_trigger_registry.csv",
      "utf8",
    )).map((row) => ({
      trigger_id: row.trigger_id,
      initiating_owner_key: row.initiating_owner_key,
      decision_owner_key: row.decision_owner_key,
      trigger_family: row.trigger_family,
      trigger_name: row.trigger_name,
      movement_class: row.movement_class,
      principal_selector_rule: row.principal_selector_rule,
      aggregate_profile_candidate: row.aggregate_profile_candidate,
    })).sort((left, right) => left.trigger_id.localeCompare(right.trigger_id));
    const compiledRows = Object.values(JOURNEY_TRIGGER_REGISTRY)
      .sort((left, right) => left.trigger_id.localeCompare(right.trigger_id))
      .map((row) => ({
        trigger_id: row.trigger_id,
        initiating_owner_key: row.initiating_owner_key,
        decision_owner_key: row.decision_owner_key,
        trigger_family: row.trigger_family,
        trigger_name: row.trigger_name,
        movement_class: row.movement_class,
        principal_selector_rule: row.principal_selector_rule,
        aggregate_profile_candidate: row.aggregate_profile_candidate,
      }));
    expect(compiledRows).toEqual(sourceRows);

    const controlPlane = JSON.parse(readFileSync(
      "docs/current/PHASE_FIVE_COURTOS_RESPONSIBILITY_CONTROL_PLANE_REGISTRY_V3.json",
      "utf8",
    )) as { responsibility_types: Array<{ key: string }> };
    expect([...CURRENT_COURTOS_RESPONSIBILITY_KEYS].sort()).toEqual(
      controlPlane.responsibility_types.map((row) => row.key).sort(),
    );
  });

  it("compiles all reviewed Round One triggers without creating a 25th responsibility", () => {
    const rows = Object.values(JOURNEY_TRIGGER_REGISTRY);
    expect(rows).toHaveLength(62);
    expect(CURRENT_COURTOS_RESPONSIBILITY_KEYS).toHaveLength(24);
    expect(new Set(CURRENT_COURTOS_RESPONSIBILITY_KEYS).size).toBe(24);
    expect(rows.filter((row) => row.movement_class === "named_journey")).toHaveLength(37);
    expect(rows.filter((row) => row.movement_class === "derived_service_mobility")).toHaveLength(10);
    expect(rows.filter((row) => row.movement_class === "background_transport")).toHaveLength(7);
    expect(rows.filter((row) => row.movement_class === "host_binding_only")).toHaveLength(2);
    expect(rows.filter((row) => row.movement_class === "local_or_remote_no_journey")).toHaveLength(6);

    const represented = new Set(rows.flatMap((row) => [row.initiating_owner_key, row.decision_owner_key]));
    expect(CURRENT_COURTOS_RESPONSIBILITY_KEYS.every((key) => represented.has(key))).toBe(true);
    expect(represented.has("courtos.responsibility.journey")).toBe(false);
  });

  it("builds a deterministic named-Journey draft with exact core window and stay shapes", () => {
    const request = manorInspectionRequest();
    const draft = buildJourneyRequestDraft(request);
    const reordered = buildJourneyRequestDraft({
      ...request,
      authority_evidence_refs: [...request.authority_evidence_refs].reverse(),
      named_participant_candidates: [...request.named_participant_candidates].reverse(),
      source_refs: [...request.source_refs].reverse(),
    });

    expect(reordered).toEqual(draft);
    expect(draft).toMatchObject({
      trigger_id: "JRN-016",
      trigger_family: "estate_presence",
      primary_purpose_ref: "inspection-commitment:manor-2",
      decision_owner_responsibility_instance_id: "responsibility:manor-stewardship:manor-2",
      origin_location_anchor_id: "anchor:home-manor",
      destination_location_anchor_id: "anchor:manor-2",
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
      lifecycle_submission_status: "draft_not_submitted",
      hosting_visit_arrangement_id: "hosting:inspection:manor-2",
      host_acceptance_required: true,
      boundaries: {
        route_selected: false,
        arrangement_admitted: false,
        person_moved: false,
        presence_mutated: false,
        material_or_gl_mutated: false,
      },
    });
    expect(draft.named_participant_candidates[0]).toMatchObject({
      person_id: "person:hoh-1",
      party_role: "principal",
    });
  });

  it("refuses to turn freight, service mobility, host binding, or local work into named travel", () => {
    for (const triggerId of ["JRN-001", "JRN-002", "JRN-014", "JRN-018"] as JourneyTriggerIdV1[]) {
      expect(() => buildJourneyRequestDraft({ ...manorInspectionRequest(), trigger_id: triggerId }))
        .toThrow(`is ${classifyJourneyTrigger(triggerId)}; it cannot create a JourneyRequestDraft`);
    }
  });

  it("enforces trigger ownership and the responsibility-versus-proceeding authority wall", () => {
    expect(() => buildJourneyRequestDraft({
      ...manorInspectionRequest(),
      initiating_owner_key: "courtos.responsibility.education_formation",
    })).toThrow("must be initiated by courtos.responsibility.manor_stewardship");

    expect(() => buildJourneyRequestDraft({
      ...manorInspectionRequest(),
      trigger_id: "JRN-058",
      initiating_owner_key: "proceeding.justice_case_proceeding",
      decision_owner_responsibility_instance_id: null,
      competent_proceeding_ref: null,
    })).toThrow("requires competent_proceeding_ref");

    const proceeding = buildJourneyRequestDraft({
      ...manorInspectionRequest(),
      trigger_id: "JRN-058",
      initiating_owner_key: "proceeding.justice_case_proceeding",
      decision_owner_responsibility_instance_id: null,
      competent_proceeding_ref: "justice-case:44",
    });
    expect(proceeding).toMatchObject({
      decision_owner_key: "proceeding.justice_case_proceeding",
      decision_owner_responsibility_instance_id: null,
      competent_proceeding_ref: "justice-case:44",
    });
  });

  it("requires exact anchors, an ordered window, evidence, and one explicit principal", () => {
    expect(() => buildJourneyRequestDraft({
      ...manorInspectionRequest(),
      destination_location_anchor_id: "anchor:home-manor",
    })).toThrow("distinct origin and destination anchors");
    expect(() => buildJourneyRequestDraft({
      ...manorInspectionRequest(),
      desired_window: {
        earliest_departure: { relative_month: 8, phase: "opening" },
        latest_arrival: { relative_month: 7, phase: "closing" },
      },
    })).toThrow("desired_window must be an ordered cutpoint range");
    expect(() => buildJourneyRequestDraft({
      ...manorInspectionRequest(),
      named_participant_candidates: manorInspectionRequest().named_participant_candidates.filter((row) => row.party_role !== "principal"),
    })).toThrow("must contain the principal exactly once");
    expect(() => buildJourneyRequestDraft({
      ...manorInspectionRequest(),
      authority_evidence_refs: [],
    })).toThrow("authority_evidence_refs requires at least one value");
    expect(() => buildJourneyRequestDraft({
      ...manorInspectionRequest(),
      hosting_visit_arrangement_id: null,
      host_acceptance_required: true,
    })).toThrow("host_acceptance_required requires hosting_visit_arrangement_id");
  });
});
