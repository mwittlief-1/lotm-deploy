/**
 * CourtOS-native, actor-context person-report projection seam.
 *
 * This is deliberately a pure UI/read-model adapter: it owns no source joins,
 * authority inference, receipt storage, runtime mutation, or generic action.
 * Domain runtimes must supply admitted report rows only after resolving the
 * current responsibility instance and viewer entitlement.
 */

export const COURTOS_PERSON_REPORT_PROJECTION_SCHEMA_VERSION =
  "courtos_person_report_projection_v1" as const;

export const COURTOS_PERSON_REPORT_READ_PORT_SCHEMA_VERSION =
  "courtos_person_report_read_port_v1" as const;

export type CourtOsPersonReportKnowledgePostureV1 =
  | "confirmed"
  | "reported"
  | "assessed"
  | "unknown_or_withheld"
  | "conflicted_or_stale";

export type CourtOsPersonReportSourceKindV1 =
  | "responsible_party"
  | "office_carrier"
  | "provider"
  | "caregiver"
  | "observer"
  | "institution"
  | "domain_receipt";

export interface CourtOsPersonReportActorContextV1 {
  viewer_person_id: string;
  acting_house_id: string;
  active_responsibility_instance_id: string;
  as_of_cutpoint_id: string;
  /** Monotonic runtime ordinal used to prove information existed by the requested cutpoint. */
  as_of_cutpoint_ordinal: number;
  development_uat_provenance_enabled: boolean;
}

/** Entitlement must be resolved by the responsibility/authority layer. */
export interface CourtOsPersonReportEntitlementV1 {
  entitled_viewer_person_id: string;
  report_visible: boolean;
  direct_evidence_visible: boolean;
  domain_actions_visible: boolean;
}

/**
 * Trusted consumer configuration loaded from the admitted P5-WI-053 manifest.
 * Report rows cannot admit themselves by repeating these values.
 */
export interface CourtOsPersonReportAdmissionPolicyV1 {
  admission_manifest_id: string;
  admission_manifest_digest: string;
  projection_schema_version: string;
  source_generation_id: string;
  source_content_digest: string;
}

export interface CourtOsPersonReportAuthorRefV1 {
  id: string;
  label: string;
}

export interface CourtOsPersonReportCommandLinkV1 {
  command_id: string;
  command_owner_ref: string;
  command_kind: "open_owning_workspace" | "request_report" | "respond_to_matter";
  label: string;
  enabled: boolean;
  withheld_reason: string | null;
}

/**
 * An upstream domain may provide only an admitted compacted projection and an
 * opaque presentation reference. It may never inject summary/message prose or
 * a raw receipt payload into this consumer boundary.
 */
export interface CourtOsPersonReportProjectionInputV1 {
  report_id: string;
  report_subject_person_id: string;
  acting_house_id: string;
  responsibility_instance_id: string;
  responsibility_key: string;
  owning_workspace_ref: string;
  author: CourtOsPersonReportAuthorRefV1;
  source_kind: CourtOsPersonReportSourceKindV1;
  observed_period_label: string;
  received_cutpoint_id: string;
  received_cutpoint_ordinal: number;
  /** The cutpoint at which this semantic report was compiled for display. */
  as_of_cutpoint_id: string;
  as_of_cutpoint_ordinal: number;
  knowledge_posture: CourtOsPersonReportKnowledgePostureV1;
  compacted_projection: {
    projection_id: string;
    projection_schema_version: string;
    source_generation_id: string;
    source_content_digest: string;
    admission_manifest_id: string;
    admission_manifest_digest: string;
    admission_state: "admitted_compacted_projection" | "withheld";
    runtime_authority: boolean;
  };
  presentation_ref: {
    ref_id: string;
    ref_kind: "opaque_slm_presentation_ref";
    treatment: "deterministic_fallback" | "slm_eligible";
  };
  /** Audit-only provenance references; never rendered on the normal player card. */
  source_refs: readonly string[];
  receipt_refs: readonly string[];
  command_links: readonly CourtOsPersonReportCommandLinkV1[];
  entitlement: CourtOsPersonReportEntitlementV1;
}

/**
 * The data/lifecycle layer owns this port. Its returned rows remain subject to
 * the projection's scope and admission validation; an implementation cannot
 * grant UI entitlement merely by satisfying this interface.
 */
export interface CourtOsPersonReportReadPortV1 {
  readPersonReportsForCourtOs(
    viewer_context: Readonly<CourtOsPersonReportActorContextV1>,
  ): readonly CourtOsPersonReportProjectionInputV1[];
}

export interface CourtOsPersonReportCardV1 {
  report_id: string;
  report_subject_person_id: string;
  responsibility_key: string;
  owning_workspace_ref: string;
  author_label: string;
  source_label: string;
  observed_period_label: string;
  knowledge_posture: CourtOsPersonReportKnowledgePostureV1;
  compacted_projection_id: string;
  presentation_ref_id: string | null;
  summary: string;
  uncertainty_note: string | null;
  evidence_basis_label: string;
  receipt_refs: string[];
  command_links: CourtOsPersonReportCommandLinkV1[];
  withheld_fields: string[];
}

export interface CourtOsPersonReportReadModelV1 {
  schema_version: typeof COURTOS_PERSON_REPORT_PROJECTION_SCHEMA_VERSION;
  viewer_context: CourtOsPersonReportActorContextV1;
  report_cards: CourtOsPersonReportCardV1[];
  withheld_report_count: number;
  boundaries: {
    upstream_entitlements_only: true;
    candidate_evidence_exposed_as_runtime: false;
    raw_receipt_payload_exposed: false;
    responsibility_inferred_from_title_or_membership: false;
    generic_action_created: false;
    domain_state_mutated: false;
  };
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function assertContext(context: CourtOsPersonReportActorContextV1): void {
  assertExactKeys(
    context,
    [
      "viewer_person_id",
      "acting_house_id",
      "active_responsibility_instance_id",
      "as_of_cutpoint_id",
      "as_of_cutpoint_ordinal",
      "development_uat_provenance_enabled",
    ],
    "viewer_context",
  );
  requiredText(context.viewer_person_id, "viewer_person_id");
  requiredText(context.acting_house_id, "acting_house_id");
  requiredText(context.active_responsibility_instance_id, "active_responsibility_instance_id");
  requiredText(context.as_of_cutpoint_id, "as_of_cutpoint_id");
  assertNonNegativeInteger(context.as_of_cutpoint_ordinal, "as_of_cutpoint_ordinal");
  assertBoolean(
    context.development_uat_provenance_enabled,
    "development_uat_provenance_enabled",
  );
}

function assertBoolean(value: unknown, field: string): void {
  if (typeof value !== "boolean") throw new Error(`${field} must be boolean`);
}

function assertNonNegativeInteger(value: unknown, field: string): void {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
}

function assertExactKeys(
  value: unknown,
  allowedKeys: readonly string[],
  field: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${field}.${key} is not allowed`);
  }
  for (const key of allowedKeys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new Error(`${field}.${key} is required`);
    }
  }
}

function assertTextList(value: unknown, field: string, required = false): void {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  if (required && value.length === 0) throw new Error(`${field} must not be empty`);
  value.forEach((entry, index) => requiredText(entry, `${field}[${index}]`));
}

function oneOf<T extends string>(value: unknown, values: readonly T[], field: string): asserts value is T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`${field} is not supported`);
  }
}

const knowledgePostures: readonly CourtOsPersonReportKnowledgePostureV1[] = [
  "confirmed",
  "reported",
  "assessed",
  "unknown_or_withheld",
  "conflicted_or_stale",
];
const sourceKinds: readonly CourtOsPersonReportSourceKindV1[] = [
  "responsible_party",
  "office_carrier",
  "provider",
  "caregiver",
  "observer",
  "institution",
  "domain_receipt",
];
const commandKinds: readonly CourtOsPersonReportCommandLinkV1["command_kind"][] = [
  "open_owning_workspace",
  "request_report",
  "respond_to_matter",
];

function assertReportContract(
  report: CourtOsPersonReportProjectionInputV1,
  viewer: CourtOsPersonReportActorContextV1,
  policy: CourtOsPersonReportAdmissionPolicyV1,
): void {
  assertExactKeys(
    report,
    [
      "report_id",
      "report_subject_person_id",
      "acting_house_id",
      "responsibility_instance_id",
      "responsibility_key",
      "owning_workspace_ref",
      "author",
      "source_kind",
      "observed_period_label",
      "received_cutpoint_id",
      "received_cutpoint_ordinal",
      "as_of_cutpoint_id",
      "as_of_cutpoint_ordinal",
      "knowledge_posture",
      "compacted_projection",
      "presentation_ref",
      "source_refs",
      "receipt_refs",
      "command_links",
      "entitlement",
    ],
    "report",
  );
  assertExactKeys(report.author, ["id", "label"], "report.author");
  assertExactKeys(
    report.compacted_projection,
    [
      "projection_id",
      "projection_schema_version",
      "source_generation_id",
      "source_content_digest",
      "admission_manifest_id",
      "admission_manifest_digest",
      "admission_state",
      "runtime_authority",
    ],
    "report.compacted_projection",
  );
  assertExactKeys(
    report.presentation_ref,
    ["ref_id", "ref_kind", "treatment"],
    "report.presentation_ref",
  );
  assertExactKeys(
    report.entitlement,
    [
      "entitled_viewer_person_id",
      "report_visible",
      "direct_evidence_visible",
      "domain_actions_visible",
    ],
    "report.entitlement",
  );
  requiredText(report.report_id, "report_id");
  requiredText(report.report_subject_person_id, "report_subject_person_id");
  requiredText(report.acting_house_id, "report.acting_house_id");
  requiredText(report.responsibility_instance_id, "report.responsibility_instance_id");
  requiredText(report.responsibility_key, "report.responsibility_key");
  requiredText(report.owning_workspace_ref, "report.owning_workspace_ref");
  requiredText(report.author.id, "report.author.id");
  requiredText(report.author.label, "report.author.label");
  requiredText(report.observed_period_label, "report.observed_period_label");
  requiredText(report.received_cutpoint_id, "report.received_cutpoint_id");
  assertNonNegativeInteger(
    report.received_cutpoint_ordinal,
    "report.received_cutpoint_ordinal",
  );
  requiredText(report.as_of_cutpoint_id, "report.as_of_cutpoint_id");
  assertNonNegativeInteger(report.as_of_cutpoint_ordinal, "report.as_of_cutpoint_ordinal");
  requiredText(
    report.compacted_projection.projection_id,
    "report.compacted_projection.projection_id",
  );
  requiredText(
    report.compacted_projection.projection_schema_version,
    "report.compacted_projection.projection_schema_version",
  );
  requiredText(
    report.compacted_projection.source_generation_id,
    "report.compacted_projection.source_generation_id",
  );
  if (!/^[a-f0-9]{64}$/.test(report.compacted_projection.source_content_digest)) {
    throw new Error("report.compacted_projection.source_content_digest must be SHA-256");
  }
  requiredText(
    report.compacted_projection.admission_manifest_id,
    "report.compacted_projection.admission_manifest_id",
  );
  if (!/^[a-f0-9]{64}$/.test(report.compacted_projection.admission_manifest_digest)) {
    throw new Error("report.compacted_projection.admission_manifest_digest must be SHA-256");
  }
  oneOf(
    report.compacted_projection.admission_state,
    ["admitted_compacted_projection", "withheld"] as const,
    "report.compacted_projection.admission_state",
  );
  assertBoolean(
    report.compacted_projection.runtime_authority,
    "report.compacted_projection.runtime_authority",
  );
  requiredText(report.presentation_ref.ref_id, "report.presentation_ref.ref_id");
  oneOf(
    report.presentation_ref.ref_kind,
    ["opaque_slm_presentation_ref"] as const,
    "report.presentation_ref.ref_kind",
  );
  oneOf(
    report.presentation_ref.treatment,
    ["deterministic_fallback", "slm_eligible"] as const,
    "report.presentation_ref.treatment",
  );
  if (report.as_of_cutpoint_id !== viewer.as_of_cutpoint_id) {
    throw new Error("person report row is outside the requested actor-context cutpoint");
  }
  if (report.as_of_cutpoint_ordinal !== viewer.as_of_cutpoint_ordinal) {
    throw new Error("person report row has an invalid display cutpoint ordinal");
  }
  if (report.received_cutpoint_ordinal > viewer.as_of_cutpoint_ordinal) {
    throw new Error("person report row was received after the requested actor-context cutpoint");
  }
  if (
    report.compacted_projection.projection_schema_version !== policy.projection_schema_version ||
    report.compacted_projection.source_generation_id !== policy.source_generation_id ||
    report.compacted_projection.source_content_digest !== policy.source_content_digest ||
    report.compacted_projection.admission_manifest_id !== policy.admission_manifest_id ||
    report.compacted_projection.admission_manifest_digest !== policy.admission_manifest_digest
  ) {
    throw new Error("person report row does not match the admitted compacted-projection manifest");
  }
  oneOf(report.knowledge_posture, knowledgePostures, "report.knowledge_posture");
  oneOf(report.source_kind, sourceKinds, "report.source_kind");
  assertTextList(report.source_refs, "report.source_refs", true);
  assertTextList(report.receipt_refs, "report.receipt_refs");
  if (!Array.isArray(report.command_links)) throw new Error("report.command_links must be an array");
  report.command_links.forEach((command, index) => {
    assertExactKeys(
      command,
      [
        "command_id",
        "command_owner_ref",
        "command_kind",
        "label",
        "enabled",
        "withheld_reason",
      ],
      `report.command_links[${index}]`,
    );
    requiredText(command.command_id, `report.command_links[${index}].command_id`);
    requiredText(command.command_owner_ref, `report.command_links[${index}].command_owner_ref`);
    requiredText(command.label, `report.command_links[${index}].label`);
    oneOf(command.command_kind, commandKinds, `report.command_links[${index}].command_kind`);
    assertBoolean(command.enabled, `report.command_links[${index}].enabled`);
    if (command.withheld_reason !== null) {
      requiredText(command.withheld_reason, `report.command_links[${index}].withheld_reason`);
    }
    if (command.command_owner_ref !== report.owning_workspace_ref) {
      throw new Error(`report.command_links[${index}] is owned by another workspace`);
    }
  });
  requiredText(
    report.entitlement.entitled_viewer_person_id,
    "report.entitlement.entitled_viewer_person_id",
  );
  assertBoolean(report.entitlement.report_visible, "report.entitlement.report_visible");
  assertBoolean(report.entitlement.direct_evidence_visible, "report.entitlement.direct_evidence_visible");
  assertBoolean(report.entitlement.domain_actions_visible, "report.entitlement.domain_actions_visible");
}

function deterministicSummary(
  posture: CourtOsPersonReportKnowledgePostureV1,
): string {
  if (posture === "confirmed") return "A confirmed compacted report is available.";
  if (posture === "reported") return "A reported compacted account is available.";
  if (posture === "assessed") return "A bounded assessment is available.";
  if (posture === "conflicted_or_stale") {
    return "A compacted report is available, but its evidence is conflicted or stale.";
  }
  return "The compacted report preserves an unknown or withheld state.";
}

function acceptedCard(
  input: CourtOsPersonReportProjectionInputV1,
  viewer: CourtOsPersonReportActorContextV1,
): CourtOsPersonReportCardV1 {
  const directEvidence =
    viewer.development_uat_provenance_enabled && input.entitlement.direct_evidence_visible;
  const actions = input.entitlement.domain_actions_visible
    ? input.command_links.map((command) => ({ ...command }))
    : [];
  const withheldFields: string[] = [];
  if (!directEvidence) withheldFields.push("receipt_refs");
  if (!input.entitlement.domain_actions_visible) withheldFields.push("command_links");
  return {
    report_id: input.report_id,
    report_subject_person_id: input.report_subject_person_id,
    responsibility_key: input.responsibility_key,
    owning_workspace_ref: input.owning_workspace_ref,
    author_label: input.author.label,
    source_label: input.source_kind,
    observed_period_label: input.observed_period_label,
    knowledge_posture: input.knowledge_posture,
    compacted_projection_id: input.compacted_projection.projection_id,
    presentation_ref_id: input.presentation_ref.ref_id,
    summary: deterministicSummary(input.knowledge_posture),
    uncertainty_note:
      input.knowledge_posture === "confirmed"
        ? null
        : "Open the admitted presentation treatment for bounded detail.",
    evidence_basis_label: "Admitted compacted information projection.",
    receipt_refs: directEvidence ? [...input.receipt_refs] : [],
    command_links: actions,
    withheld_fields: withheldFields,
  };
}

/**
 * Projects only rows bound to the supplied active responsibility instance and
 * House. A caller must already have resolved entitlement; this module never
 * grants it from a title, membership, or person identity.
 */
export function projectCourtOsPersonReportsV1(args: {
  viewer_context: CourtOsPersonReportActorContextV1;
  admission_policy: CourtOsPersonReportAdmissionPolicyV1;
  reports: readonly CourtOsPersonReportProjectionInputV1[];
}): CourtOsPersonReportReadModelV1 {
  const viewer = args.viewer_context;
  assertContext(viewer);
  assertAdmissionPolicy(args.admission_policy);
  const reportCards: CourtOsPersonReportCardV1[] = [];

  for (const report of args.reports) {
    assertReportContract(report, viewer, args.admission_policy);
    const inScope =
      report.acting_house_id === viewer.acting_house_id &&
      report.responsibility_instance_id === viewer.active_responsibility_instance_id;
    if (!inScope) {
      throw new Error("person report row is outside the requested actor-context responsibility scope");
    }
    if (report.entitlement.entitled_viewer_person_id !== viewer.viewer_person_id) {
      throw new Error("person report entitlement is bound to another viewer");
    }
    const admitted =
      report.compacted_projection.runtime_authority &&
      report.compacted_projection.admission_state ===
        "admitted_compacted_projection" &&
      report.entitlement.report_visible;
    if (!admitted) {
      continue;
    }
    reportCards.push(acceptedCard(report, viewer));
  }

  return {
    schema_version: COURTOS_PERSON_REPORT_PROJECTION_SCHEMA_VERSION,
    viewer_context: { ...viewer },
    report_cards: reportCards,
    // Suppressed rows are deliberately indistinguishable from absent rows.
    withheld_report_count: 0,
    boundaries: {
      upstream_entitlements_only: true,
      candidate_evidence_exposed_as_runtime: false,
      raw_receipt_payload_exposed: false,
      responsibility_inferred_from_title_or_membership: false,
      generic_action_created: false,
      domain_state_mutated: false,
    },
  };
}

/** Convenience boundary for a domain-owned read port once it is admitted. */
export function projectCourtOsPersonReportsFromReadPortV1(args: {
  viewer_context: CourtOsPersonReportActorContextV1;
  admission_policy: CourtOsPersonReportAdmissionPolicyV1;
  read_port: CourtOsPersonReportReadPortV1;
}): CourtOsPersonReportReadModelV1 {
  return projectCourtOsPersonReportsV1({
    viewer_context: args.viewer_context,
    admission_policy: args.admission_policy,
    reports: args.read_port.readPersonReportsForCourtOs(args.viewer_context),
  });
}

function assertAdmissionPolicy(policy: CourtOsPersonReportAdmissionPolicyV1): void {
  assertExactKeys(
    policy,
    [
      "admission_manifest_id",
      "admission_manifest_digest",
      "projection_schema_version",
      "source_generation_id",
      "source_content_digest",
    ],
    "admission_policy",
  );
  requiredText(policy.admission_manifest_id, "admission_policy.admission_manifest_id");
  requiredText(policy.projection_schema_version, "admission_policy.projection_schema_version");
  requiredText(policy.source_generation_id, "admission_policy.source_generation_id");
  if (!/^[a-f0-9]{64}$/.test(policy.admission_manifest_digest)) {
    throw new Error("admission_policy.admission_manifest_digest must be SHA-256");
  }
  if (!/^[a-f0-9]{64}$/.test(policy.source_content_digest)) {
    throw new Error("admission_policy.source_content_digest must be SHA-256");
  }
}
