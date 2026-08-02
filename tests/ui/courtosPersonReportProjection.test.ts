import { describe, expect, it } from "vitest";

import {
  projectCourtOsPersonReportsV1,
  projectCourtOsPersonReportsFromReadPortV1,
  type CourtOsPersonReportProjectionInputV1,
} from "../../src/ui/readModels/courtos1120/personReportProjection";

const viewer = {
  viewer_person_id: "person:viewer",
  acting_house_id: "house:pearwick",
  active_responsibility_instance_id: "resp-instance:education",
  as_of_cutpoint_id: "1120-annual-close",
  as_of_cutpoint_ordinal: 112012,
  development_uat_provenance_enabled: false,
} as const;

const admissionPolicy = {
  admission_manifest_id: "manifest:p5-wi-053:1120",
  admission_manifest_digest: "b".repeat(64),
  projection_schema_version: "track1_track2_compacted_information_v1",
  source_generation_id: "runtime:1120:annual-close",
  source_content_digest: "a".repeat(64),
} as const;

function report(overrides: Partial<CourtOsPersonReportProjectionInputV1> = {}): CourtOsPersonReportProjectionInputV1 {
  return {
    report_id: "report:education:1120",
    report_subject_person_id: "person:learner",
    acting_house_id: viewer.acting_house_id,
    responsibility_instance_id: viewer.active_responsibility_instance_id,
    responsibility_key: "courtos.responsibility.education_formation",
    owning_workspace_ref: "workspace:education",
    author: { id: "person:responsible", label: "Responsible party" },
    source_kind: "responsible_party",
    observed_period_label: "1120 annual review",
    received_cutpoint_id: viewer.as_of_cutpoint_id,
    received_cutpoint_ordinal: viewer.as_of_cutpoint_ordinal,
    as_of_cutpoint_id: viewer.as_of_cutpoint_id,
    as_of_cutpoint_ordinal: viewer.as_of_cutpoint_ordinal,
    knowledge_posture: "reported",
    compacted_projection: {
      projection_id: "compacted:education:1120",
      projection_schema_version: "track1_track2_compacted_information_v1",
      source_generation_id: "runtime:1120:annual-close",
      source_content_digest: "a".repeat(64),
      admission_manifest_id: admissionPolicy.admission_manifest_id,
      admission_manifest_digest: admissionPolicy.admission_manifest_digest,
      admission_state: "admitted_compacted_projection",
      runtime_authority: true,
    },
    presentation_ref: {
      ref_id: "presentation:education:1120",
      ref_kind: "opaque_slm_presentation_ref",
      treatment: "deterministic_fallback",
    },
    source_refs: ["source:annual:1"],
    receipt_refs: ["receipt:annual:1"],
    command_links: [{ command_id: "command:review", command_owner_ref: "workspace:education", command_kind: "open_owning_workspace", label: "Review arrangement", enabled: true, withheld_reason: null }],
    entitlement: {
      entitled_viewer_person_id: viewer.viewer_person_id,
      report_visible: true,
      direct_evidence_visible: false,
      domain_actions_visible: false,
    },
    ...overrides,
  };
}

describe("CourtOS actor-context person report projection", () => {
  it("renders an admitted, responsibility-bound semantic report without raw receipts by default", () => {
    const model = projectCourtOsPersonReportsV1({ viewer_context: viewer, admission_policy: admissionPolicy, reports: [report()] });
    expect(model.report_cards).toMatchObject([{ knowledge_posture: "reported", compacted_projection_id: "compacted:education:1120", presentation_ref_id: "presentation:education:1120", summary: "A reported compacted account is available.", receipt_refs: [], command_links: [], withheld_fields: ["receipt_refs", "command_links"] }]);
    expect(model.boundaries).toMatchObject({ candidate_evidence_exposed_as_runtime: false, responsibility_inferred_from_title_or_membership: false, domain_state_mutated: false });
  });

  it("fails closed for withheld, non-runtime, or non-entitled compacted evidence", () => {
    for (const input of [report({ compacted_projection: { ...report().compacted_projection, admission_state: "withheld" } }), report({ compacted_projection: { ...report().compacted_projection, runtime_authority: false } }), report({ entitlement: { entitled_viewer_person_id: viewer.viewer_person_id, report_visible: false, direct_evidence_visible: true, domain_actions_visible: true } })]) {
      const model = projectCourtOsPersonReportsV1({ viewer_context: viewer, admission_policy: admissionPolicy, reports: [input] });
      expect(model.withheld_report_count).toBe(0);
      expect(model.report_cards).toEqual([]);
    }
  });

  it("does not infer scope from person/title and rejects an outside responsibility row", () => {
    expect(() => projectCourtOsPersonReportsV1({ viewer_context: viewer, admission_policy: admissionPolicy, reports: [report({ responsibility_instance_id: "resp-instance:records" })] })).toThrow(/actor-context responsibility scope/);
  });

  it("rejects stale display cutpoints and structurally incomplete upstream rows", () => {
    expect(() => projectCourtOsPersonReportsV1({ viewer_context: viewer, admission_policy: admissionPolicy, reports: [report({ as_of_cutpoint_id: "1119-close" })] })).toThrow(/cutpoint/);
    expect(() => projectCourtOsPersonReportsV1({ viewer_context: viewer, admission_policy: admissionPolicy, reports: [report({ source_refs: [] })] })).toThrow(/source_refs/);
    expect(() => projectCourtOsPersonReportsV1({ viewer_context: viewer, admission_policy: admissionPolicy, reports: [report({ received_cutpoint_ordinal: viewer.as_of_cutpoint_ordinal + 1 })] })).toThrow(/received after/);
  });

  it("rejects raw summary or prose at the compacted consumer boundary", () => {
    const injected = { ...report(), summary: "Untrusted upstream prose." };
    expect(() =>
      projectCourtOsPersonReportsV1({
        viewer_context: viewer,
        admission_policy: admissionPolicy,
        reports: [injected as CourtOsPersonReportProjectionInputV1],
      }),
    ).toThrow(/not allowed/);
    const disguised = { ...report(), upstream_summary: "Untrusted upstream prose." };
    expect(() => projectCourtOsPersonReportsV1({ viewer_context: viewer, admission_policy: admissionPolicy, reports: [disguised as CourtOsPersonReportProjectionInputV1] })).toThrow(/not allowed/);
  });

  it("binds report entitlement to the exact viewer person", () => {
    expect(() => projectCourtOsPersonReportsV1({ viewer_context: viewer, admission_policy: admissionPolicy, reports: [report({ entitlement: { ...report().entitlement, entitled_viewer_person_id: "person:other" } })] })).toThrow(/another viewer/);
  });

  it("requires an exact independently supplied admission-manifest binding", () => {
    expect(() => projectCourtOsPersonReportsV1({ viewer_context: viewer, admission_policy: admissionPolicy, reports: [report({ compacted_projection: { ...report().compacted_projection, admission_manifest_digest: "c".repeat(64) } })] })).toThrow(/admitted compacted-projection manifest/);
  });

  it("rejects command links owned by another workspace", () => {
    expect(() => projectCourtOsPersonReportsV1({ viewer_context: viewer, admission_policy: admissionPolicy, reports: [report({ command_links: [{ ...report().command_links[0], command_owner_ref: "workspace:records" }] })] })).toThrow(/another workspace/);
  });

  it("permits receipt references only through explicit UAT direct-evidence entitlement", () => {
    const model = projectCourtOsPersonReportsV1({ viewer_context: { ...viewer, development_uat_provenance_enabled: true }, admission_policy: admissionPolicy, reports: [report({ entitlement: { entitled_viewer_person_id: viewer.viewer_person_id, report_visible: true, direct_evidence_visible: true, domain_actions_visible: true } })] });
    expect(model.report_cards[0]).toMatchObject({ receipt_refs: ["receipt:annual:1"], command_links: [{ command_id: "command:review" }] });
  });

  it("accepts a domain-owned read port without letting that port bypass admission checks", () => {
    const model = projectCourtOsPersonReportsFromReadPortV1({
      viewer_context: viewer,
      admission_policy: admissionPolicy,
      read_port: { readPersonReportsForCourtOs: () => [report({ compacted_projection: { ...report().compacted_projection, admission_state: "withheld" } })] },
    });
    expect(model.report_cards).toEqual([]);
  });
});
