import {
  JOURNEY_REQUEST_DRAFT_SCHEMA_VERSION,
  CURRENT_COURTOS_RESPONSIBILITY_KEYS,
  getJourneyTriggerDefinition,
  type CurrentCourtOsResponsibilityKeyV1,
  type JourneyRequestDraftV1,
  type JourneyTriggerIdV1,
} from "../../../sim/phaseFive/journeyDomainAdapter";

export const JOURNEY_COURTOS_READ_MODEL_SCHEMA_VERSION =
  "phase_five_journey_courtos_read_model_v1" as const;
export const JOURNEY_PLANNING_SURFACE_SCHEMA_VERSION =
  "phase_five_journey_planning_surface_v1" as const;

export type JourneyKnowledgePostureV1 =
  | "confirmed"
  | "reported"
  | "assessed"
  | "unknown_or_withheld"
  | "disputed_or_stale";
export type JourneyLifecycleStatusV1 =
  | "requested"
  | "withheld"
  | "rejected"
  | "accepted"
  | "scheduled"
  | "in_transit"
  | "at_destination"
  | "returning"
  | "needs_review"
  | "completed"
  | "failed"
  | "cancelled"
  | "superseded";
export type JourneyMatterPlacementV1 =
  | "owning_workspace"
  | "next_council_docket"
  | "off_cycle_dispatch";

export interface JourneyCourtOsViewerContextV1 {
  viewer_person_id: string;
  acting_house_id: string;
  as_of_cutpoint_id: string;
  development_uat_provenance_enabled: boolean;
}

/**
 * Entitlement is resolved upstream.  The UI never infers access from being
 * Head of House, a councillor, an officeholder, or a relative.
 */
export interface JourneyCourtOsEntitlementV1 {
  governance_visible: boolean;
  operational_visible: boolean;
  report_visible: boolean;
  direct_evidence_visible: boolean;
  domain_actions_visible: boolean;
}

export interface JourneyDisplayRefV1 {
  id: string;
  label: string;
}

export interface JourneyDomainCommandLinkV1 {
  command_id: string;
  command_kind:
    | "open_owning_workspace"
    | "review_purpose"
    | "modify_commitment"
    | "request_report"
    | "respond_to_matter";
  command_owner_ref: string;
  label: string;
  enabled: boolean;
  withheld_reason: string | null;
}

export interface JourneyReportProjectionInputV1 {
  report_id: string;
  author_ref: JourneyDisplayRefV1;
  source_kind: "responsible_party" | "traveller" | "host" | "messenger" | "observer" | "journey_receipt";
  observed_period_label: string;
  received_cutpoint_id: string;
  knowledge_posture: Exclude<JourneyKnowledgePostureV1, "unknown_or_withheld">;
  summary: string;
  uncertainty_note: string | null;
  evidence_basis_label: string;
  receipt_refs: readonly string[];
}

export interface JourneyMatterProjectionInputV1 {
  matter_id: string;
  summary: string;
  why_it_matters: string;
  deadline_label: string | null;
  deadline_before_next_council: boolean;
  retained_decision_required: boolean;
  material_consequence_if_ignored: boolean;
  council_eligible: boolean;
  reason_codes: readonly string[];
  command_links: readonly JourneyDomainCommandLinkV1[];
}

/**
 * Injected, source-driven Journey lifecycle row.  The Journey/UI adapter owns
 * no joins to raw graphs, CSV, SQLite, route topology, or receipts.
 */
export interface JourneyLifecycleProjectionInputV1 {
  journey_record_id: string;
  journey_request_id: string;
  journey_arrangement_id: string | null;
  trigger_id: JourneyTriggerIdV1;
  primary_purpose_ref: string;
  primary_purpose_label: string;
  owning_domain_ref: string;
  owning_responsibility_key?: CurrentCourtOsResponsibilityKeyV1 | null;
  decision_owner_responsibility_instance_id: string | null;
  competent_proceeding_ref: string | null;
  owning_workspace_ref: string;
  owning_workspace_label: string;
  acting_house_id: string;
  principal: JourneyDisplayRefV1;
  origin: JourneyDisplayRefV1;
  destination: JourneyDisplayRefV1;
  departure_window_label: string;
  departure_absolute_month: number | null;
  expected_arrival_label: string | null;
  return_window_label: string | null;
  planned_stay_label: string | null;
  route_posture_label: string;
  end_posture_label: string;
  lifecycle_status: JourneyLifecycleStatusV1;
  status_label: string;
  last_known_location_label: string | null;
  named_party: readonly JourneyDisplayRefV1[];
  aggregate_party_summary: string | null;
  absence_and_coverage_summary: string | null;
  schedule_effect_summary: string | null;
  knowledge_posture: JourneyKnowledgePostureV1;
  report: JourneyReportProjectionInputV1 | null;
  matters: readonly JourneyMatterProjectionInputV1[];
  command_links: readonly JourneyDomainCommandLinkV1[];
  entitlement: JourneyCourtOsEntitlementV1;
  source_status: "runtime_receipt" | "admitted_read_model" | "candidate_evidence";
  runtime_authority: boolean;
  source_refs: readonly string[];
}

/**
 * Injected read port supplied by Journey + Knowledge.  Implementations must
 * return House/viewer-scoped rows and explicit entitlements; this module does
 * not inspect raw lifecycle tables or infer access.
 */
export interface JourneyCourtOsLifecycleReadPortV1 {
  readJourneyLifecycleForCourtOs(input: Readonly<JourneyCourtOsViewerContextV1>):
    readonly JourneyLifecycleProjectionInputV1[];
}

export interface JourneyPlanningSurfacePresentationV1 {
  owning_workspace_ref: string;
  owning_workspace_label: string;
  primary_purpose_label: string;
  principal_label: string;
  origin_label: string;
  destination_label: string;
  departure_window_label: string;
  return_window_label: string | null;
  planned_stay_label: string | null;
  party_summary: string;
  support_summary: string;
  primary_domain_command: JourneyDomainCommandLinkV1;
}

export interface JourneyPlanningSurfaceV1 {
  schema_version: typeof JOURNEY_PLANNING_SURFACE_SCHEMA_VERSION;
  source_draft_schema_version: typeof JOURNEY_REQUEST_DRAFT_SCHEMA_VERSION;
  journey_request_draft_id: string;
  trigger_id: JourneyTriggerIdV1;
  trigger_label: string;
  owning_workspace_ref: string;
  owning_workspace_label: string;
  primary_purpose_label: string;
  principal_label: string;
  route_summary: string;
  timing_summary: string;
  party_summary: string;
  support_summary: string;
  lifecycle_posture: "proposal_not_yet_admitted";
  primary_domain_command: JourneyDomainCommandLinkV1;
  cross_domain_handoff_label: string;
  standalone_journey_navigation: false;
  generic_free_travel_action: false;
}

export interface JourneyCalendarRowV1 {
  journey_record_id: string;
  trigger_id: JourneyTriggerIdV1;
  owning_workspace_ref: string;
  owning_workspace_label: string;
  owning_domain_ref: string;
  owning_responsibility_key: CurrentCourtOsResponsibilityKeyV1 | null;
  primary_purpose_label: string;
  principal_label: string;
  route_summary: string;
  timing_summary: string;
  lifecycle_status: JourneyLifecycleStatusV1;
  status_label: string;
  absence_and_coverage_summary: string | null;
  knowledge_posture: JourneyKnowledgePostureV1;
  open_command: JourneyDomainCommandLinkV1 | null;
}

export interface JourneyStatusCardV1 extends JourneyCalendarRowV1 {
  journey_request_id: string;
  journey_arrangement_id: string | null;
  last_known_location_label: string | null;
  party_summary: string | null;
  schedule_effect_summary: string | null;
  withheld_fields: string[];
  domain_command_links: JourneyDomainCommandLinkV1[];
}

export interface JourneyReportCardV1 {
  journey_record_id: string;
  report_id: string;
  owning_workspace_ref: string;
  owning_domain_ref: string;
  owning_responsibility_key: CurrentCourtOsResponsibilityKeyV1 | null;
  author_label: string;
  source_label: string;
  observed_period_label: string;
  knowledge_posture: JourneyReportProjectionInputV1["knowledge_posture"];
  summary: string;
  uncertainty_note: string | null;
  evidence_basis_label: string;
  receipt_refs: string[];
}

export interface JourneyMatterCardV1 {
  journey_record_id: string;
  matter_id: string;
  owning_workspace_ref: string;
  owning_domain_ref: string;
  owning_responsibility_key: CurrentCourtOsResponsibilityKeyV1 | null;
  placement: JourneyMatterPlacementV1;
  summary: string;
  why_it_matters: string;
  deadline_label: string | null;
  reason_codes: string[];
  command_links: JourneyDomainCommandLinkV1[];
}

export interface JourneyCourtOsReadModelV1 {
  schema_version: typeof JOURNEY_COURTOS_READ_MODEL_SCHEMA_VERSION;
  viewer_context: JourneyCourtOsViewerContextV1;
  calendar_rows: JourneyCalendarRowV1[];
  status_cards: JourneyStatusCardV1[];
  report_cards: JourneyReportCardV1[];
  matter_cards: JourneyMatterCardV1[];
  visible_journey_count: number;
  withheld_journey_count: number;
  candidate_source_row_count: number;
  next_off_cycle_dispatch_count: number;
  next_council_docket_count: number;
  boundaries: {
    current_24_responsibility_control_plane_only: true;
    journey_is_shared_service_not_responsibility: true;
    standalone_journey_navigation: false;
    generic_free_travel_action: false;
    upstream_entitlements_only: true;
    candidate_evidence_exposed_as_runtime: false;
    raw_route_or_receipt_payload_exposed: false;
    domain_or_journey_state_mutated: false;
  };
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${field} is required`);
  return value.trim();
}

function stableStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => requiredText(value, "string list value")))].sort();
}

function validateCommand(
  command: JourneyDomainCommandLinkV1,
  owningDomainRef: string,
): JourneyDomainCommandLinkV1 {
  if (requiredText(command.command_owner_ref, "command_owner_ref") !== owningDomainRef) {
    throw new Error("Journey surfaces may expose only owning-domain commands");
  }
  if (/^journey(?:[.:_-]|$)/i.test(command.command_id) && command.command_kind !== "open_owning_workspace") {
    throw new Error("Journey surfaces may not expose a generic Journey command");
  }
  return {
    ...command,
    command_id: requiredText(command.command_id, "command_id"),
    label: requiredText(command.label, "command label"),
    command_owner_ref: owningDomainRef,
    withheld_reason: command.withheld_reason?.trim() || null,
  };
}

function commandsFor(
  commands: readonly JourneyDomainCommandLinkV1[],
  owningDomainRef: string,
  entitlement: JourneyCourtOsEntitlementV1,
): JourneyDomainCommandLinkV1[] {
  if (!entitlement.domain_actions_visible) return [];
  return commands
    .map((command) => validateCommand(command, owningDomainRef))
    .sort((left, right) => left.command_id.localeCompare(right.command_id));
}

function matterPlacement(matter: JourneyMatterProjectionInputV1): JourneyMatterPlacementV1 {
  if (matter.deadline_before_next_council &&
      matter.retained_decision_required &&
      matter.material_consequence_if_ignored) {
    return "off_cycle_dispatch";
  }
  return matter.council_eligible ? "next_council_docket" : "owning_workspace";
}

function responsibilityOwnerFor(
  row: JourneyLifecycleProjectionInputV1,
): CurrentCourtOsResponsibilityKeyV1 | null {
  if (row.owning_responsibility_key) return row.owning_responsibility_key;
  return (CURRENT_COURTOS_RESPONSIBILITY_KEYS as readonly string[]).includes(row.owning_domain_ref)
    ? row.owning_domain_ref as CurrentCourtOsResponsibilityKeyV1
    : null;
}

export function buildJourneyPlanningSurface(input: {
  draft: JourneyRequestDraftV1;
  presentation: JourneyPlanningSurfacePresentationV1;
}): JourneyPlanningSurfaceV1 {
  const trigger = getJourneyTriggerDefinition(input.draft.trigger_id);
  if (input.draft.schema_version !== JOURNEY_REQUEST_DRAFT_SCHEMA_VERSION) {
    throw new Error("unsupported JourneyRequestDraft schema version");
  }
  const command = validateCommand(
    input.presentation.primary_domain_command,
    input.draft.decision_owner_key,
  );
  if (input.presentation.owning_workspace_ref.trim().length === 0) {
    throw new Error("owning_workspace_ref is required");
  }
  return {
    schema_version: JOURNEY_PLANNING_SURFACE_SCHEMA_VERSION,
    source_draft_schema_version: input.draft.schema_version,
    journey_request_draft_id: input.draft.journey_request_draft_id,
    trigger_id: input.draft.trigger_id,
    trigger_label: trigger.trigger_name,
    owning_workspace_ref: input.presentation.owning_workspace_ref,
    owning_workspace_label: input.presentation.owning_workspace_label,
    primary_purpose_label: input.presentation.primary_purpose_label,
    principal_label: input.presentation.principal_label,
    route_summary: `${input.presentation.origin_label} to ${input.presentation.destination_label} · ${input.draft.route_posture.replaceAll("_", " ")}`,
    timing_summary: [
      input.presentation.departure_window_label,
      input.presentation.planned_stay_label,
      input.presentation.return_window_label,
    ].filter(Boolean).join(" · "),
    party_summary: input.presentation.party_summary,
    support_summary: input.presentation.support_summary,
    lifecycle_posture: "proposal_not_yet_admitted",
    primary_domain_command: command,
    cross_domain_handoff_label: "If accepted, Journey will resolve route, timing, party support, presence and return receipts.",
    standalone_journey_navigation: false,
    generic_free_travel_action: false,
  };
}

export function buildJourneyCourtOsReadModel(input: {
  viewer_context: JourneyCourtOsViewerContextV1;
  journeys: readonly JourneyLifecycleProjectionInputV1[];
}): JourneyCourtOsReadModelV1 {
  const viewer = {
    viewer_person_id: requiredText(input.viewer_context.viewer_person_id, "viewer_person_id"),
    acting_house_id: requiredText(input.viewer_context.acting_house_id, "acting_house_id"),
    as_of_cutpoint_id: requiredText(input.viewer_context.as_of_cutpoint_id, "as_of_cutpoint_id"),
    development_uat_provenance_enabled: input.viewer_context.development_uat_provenance_enabled,
  };
  const eligible = input.journeys.filter((row) => row.acting_house_id === viewer.acting_house_id);
  const candidateRows = eligible.filter((row) => row.source_status === "candidate_evidence" || !row.runtime_authority);
  const admitted = eligible.filter((row) =>
    row.source_status !== "candidate_evidence" && row.runtime_authority && row.entitlement.governance_visible
  );
  const withheldCount = eligible.length - admitted.length;

  const statusCards = admitted.map((row): JourneyStatusCardV1 => {
    getJourneyTriggerDefinition(row.trigger_id);
    const operational = row.entitlement.operational_visible;
    const owningResponsibilityKey = responsibilityOwnerFor(row);
    const routeSummary = operational
      ? `${row.origin.label} to ${row.destination.label}`
      : "Origin and destination withheld";
    const domainCommands = commandsFor(row.command_links, row.owning_domain_ref, row.entitlement);
    const withheldFields = [
      ...(!operational ? ["origin", "destination", "party", "last_known_location", "schedule_effect"] : []),
      ...(!row.entitlement.report_visible ? ["report"] : []),
      ...(!row.entitlement.direct_evidence_visible ? ["direct_evidence"] : []),
    ];
    return {
      journey_record_id: row.journey_record_id,
      journey_request_id: row.journey_request_id,
      journey_arrangement_id: row.journey_arrangement_id,
      trigger_id: row.trigger_id,
      owning_workspace_ref: row.owning_workspace_ref,
      owning_workspace_label: row.owning_workspace_label,
      owning_domain_ref: row.owning_domain_ref,
      owning_responsibility_key: owningResponsibilityKey,
      primary_purpose_label: row.primary_purpose_label,
      principal_label: row.principal.label,
      route_summary: routeSummary,
      timing_summary: [row.departure_window_label, row.return_window_label].filter(Boolean).join(" · "),
      lifecycle_status: row.lifecycle_status,
      status_label: row.status_label,
      absence_and_coverage_summary: row.absence_and_coverage_summary,
      knowledge_posture: row.knowledge_posture,
      open_command: domainCommands.find((command) => command.command_kind === "open_owning_workspace") ?? null,
      last_known_location_label: operational ? row.last_known_location_label : null,
      party_summary: operational
        ? row.aggregate_party_summary ?? `${row.named_party.length} named traveller${row.named_party.length === 1 ? "" : "s"}`
        : null,
      schedule_effect_summary: operational ? row.schedule_effect_summary : null,
      withheld_fields: withheldFields,
      domain_command_links: domainCommands,
    };
  }).sort((left, right) => {
    const leftMonth = admitted.find((row) => row.journey_record_id === left.journey_record_id)?.departure_absolute_month ?? Number.MAX_SAFE_INTEGER;
    const rightMonth = admitted.find((row) => row.journey_record_id === right.journey_record_id)?.departure_absolute_month ?? Number.MAX_SAFE_INTEGER;
    return leftMonth - rightMonth || left.journey_record_id.localeCompare(right.journey_record_id);
  });

  const calendarRows: JourneyCalendarRowV1[] = statusCards.map((card) => ({
    journey_record_id: card.journey_record_id,
    trigger_id: card.trigger_id,
    owning_workspace_ref: card.owning_workspace_ref,
    owning_workspace_label: card.owning_workspace_label,
    owning_domain_ref: card.owning_domain_ref,
    owning_responsibility_key: card.owning_responsibility_key,
    primary_purpose_label: card.primary_purpose_label,
    principal_label: card.principal_label,
    route_summary: card.route_summary,
    timing_summary: card.timing_summary,
    lifecycle_status: card.lifecycle_status,
    status_label: card.status_label,
    absence_and_coverage_summary: card.absence_and_coverage_summary,
    knowledge_posture: card.knowledge_posture,
    open_command: card.open_command,
  }));

  const reportCards = admitted.flatMap((row): JourneyReportCardV1[] => {
    if (!row.entitlement.report_visible || !row.report) return [];
    return [{
      journey_record_id: row.journey_record_id,
      report_id: row.report.report_id,
      owning_workspace_ref: row.owning_workspace_ref,
      owning_domain_ref: row.owning_domain_ref,
      owning_responsibility_key: responsibilityOwnerFor(row),
      author_label: row.report.author_ref.label,
      source_label: row.report.source_kind.replaceAll("_", " "),
      observed_period_label: row.report.observed_period_label,
      knowledge_posture: row.report.knowledge_posture,
      summary: row.report.summary,
      uncertainty_note: row.report.uncertainty_note,
      evidence_basis_label: row.report.evidence_basis_label,
      receipt_refs: row.entitlement.direct_evidence_visible && viewer.development_uat_provenance_enabled
        ? stableStrings(row.report.receipt_refs)
        : [],
    }];
  }).sort((left, right) => left.report_id.localeCompare(right.report_id));

  const matterCards = admitted.flatMap((row): JourneyMatterCardV1[] => {
    if (!row.entitlement.operational_visible && !row.entitlement.domain_actions_visible) return [];
    return row.matters.map((matter) => ({
      journey_record_id: row.journey_record_id,
      matter_id: matter.matter_id,
      owning_workspace_ref: row.owning_workspace_ref,
      owning_domain_ref: row.owning_domain_ref,
      owning_responsibility_key: responsibilityOwnerFor(row),
      placement: matterPlacement(matter),
      summary: matter.summary,
      why_it_matters: matter.why_it_matters,
      deadline_label: matter.deadline_label,
      reason_codes: stableStrings(matter.reason_codes),
      command_links: commandsFor(matter.command_links, row.owning_domain_ref, row.entitlement),
    }));
  }).sort((left, right) => left.matter_id.localeCompare(right.matter_id));

  return {
    schema_version: JOURNEY_COURTOS_READ_MODEL_SCHEMA_VERSION,
    viewer_context: viewer,
    calendar_rows: calendarRows,
    status_cards: statusCards,
    report_cards: reportCards,
    matter_cards: matterCards,
    visible_journey_count: statusCards.length,
    withheld_journey_count: withheldCount,
    candidate_source_row_count: candidateRows.length,
    next_off_cycle_dispatch_count: matterCards.filter((row) => row.placement === "off_cycle_dispatch").length,
    next_council_docket_count: matterCards.filter((row) => row.placement === "next_council_docket").length,
    boundaries: {
      current_24_responsibility_control_plane_only: true,
      journey_is_shared_service_not_responsibility: true,
      standalone_journey_navigation: false,
      generic_free_travel_action: false,
      upstream_entitlements_only: true,
      candidate_evidence_exposed_as_runtime: false,
      raw_route_or_receipt_payload_exposed: false,
      domain_or_journey_state_mutated: false,
    },
  };
}

export function readJourneyCourtOsReadModel(input: {
  viewer_context: JourneyCourtOsViewerContextV1;
  lifecycle_port: JourneyCourtOsLifecycleReadPortV1;
}): JourneyCourtOsReadModelV1 {
  return buildJourneyCourtOsReadModel({
    viewer_context: input.viewer_context,
    journeys: input.lifecycle_port.readJourneyLifecycleForCourtOs(input.viewer_context),
  });
}
