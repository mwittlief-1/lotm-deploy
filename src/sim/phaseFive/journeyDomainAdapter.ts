import type {
  JourneyCutpointV1,
  JourneyWindowV1,
} from "../domains/journey/journeyContracts";

/**
 * Phase Five Journey domain adapter.
 *
 * Purpose-owning responsibilities and competent proceedings use this module
 * to prepare a typed request for the Journey service.  It deliberately does
 * not find a path, size a retinue, reserve support, move a person, or execute
 * a lifecycle.  Those decisions belong to injected Journey owners.
 */

export const JOURNEY_DOMAIN_ADAPTER_SCHEMA_VERSION =
  "phase_five_journey_domain_adapter_v1" as const;
export const JOURNEY_REQUEST_DRAFT_SCHEMA_VERSION =
  "phase_five_journey_request_draft_v1" as const;
export const JOURNEY_TRIGGER_REGISTRY_SCHEMA_VERSION =
  "phase_five_journey_trigger_registry_current_24_v1" as const;

export const CURRENT_COURTOS_RESPONSIBILITY_KEYS = [
  "courtos.responsibility.household_stores_provisioning_procurement",
  "courtos.responsibility.adult_kin_support",
  "courtos.responsibility.education_formation",
  "courtos.responsibility.household_service_care",
  "courtos.responsibility.marriage_dynasty_stewardship",
  "courtos.responsibility.patronage_hospitality_gifts",
  "courtos.responsibility.manor_stewardship",
  "courtos.responsibility.estate_fabric_maintenance_oversight",
  "courtos.responsibility.works_project_supervision",
  "courtos.responsibility.franchise_operations",
  "courtos.responsibility.portfolio_oversight",
  "courtos.responsibility.house_fiscal_administration",
  "courtos.responsibility.manor_fiscal_administration",
  "courtos.responsibility.revenue_right_administration_collection",
  "courtos.responsibility.reception_intake",
  "courtos.responsibility.records_archives",
  "courtos.responsibility.correspondence_dispatch",
  "courtos.responsibility.security_asset_protection",
  "courtos.responsibility.martial_readiness_training",
  "courtos.responsibility.martial_stores_horse_capacity",
  "courtos.responsibility.external_relations_representation",
  "courtos.responsibility.household_observance_chaplaincy",
  "courtos.responsibility.church_rights_institutional_affairs",
  "courtos.responsibility.office_post_appointments",
] as const;

export type CurrentCourtOsResponsibilityKeyV1 =
  (typeof CURRENT_COURTOS_RESPONSIBILITY_KEYS)[number];

export const JOURNEY_MOVEMENT_CLASSES = [
  "named_journey",
  "derived_service_mobility",
  "background_transport",
  "host_binding_only",
  "local_or_remote_no_journey",
] as const;
export type JourneyMovementClassV1 = (typeof JOURNEY_MOVEMENT_CLASSES)[number];

export const JOURNEY_PARTY_ROLES = [
  "principal",
  "subject_transfer",
  "representative_delegate",
  "spouse_or_consort",
  "child_dependent_or_ward",
  "guardian_or_custodian",
  "caregiver",
  "educator_or_provider",
  "negotiator_petitioner_or_party",
  "chaplain_clerk_interpreter_or_witness",
  "escort_commander_or_named_officer",
  "handover_counterparty",
  "selected_attendee_or_companion",
  "return_or_onward_escort",
] as const;
export type JourneyPartyRoleV1 = (typeof JOURNEY_PARTY_ROLES)[number];

export type JourneyRoutePostureV1 =
  | "fastest_viable"
  | "safest_viable"
  | "lowest_support_burden"
  | "domain_required";
export type JourneyEndPostureV1 = "return" | "remain" | "onward" | "transfer";
export type JourneyParticipationRequirementV1 = "required" | "discretionary";

type TriggerRowV1 = readonly [
  triggerId: `JRN-${string}`,
  initiatingOwnerKey: string,
  decisionOwnerKey: string,
  triggerFamily: string,
  triggerName: string,
  movementClass: JourneyMovementClassV1,
  principalSelectorRule: string,
  aggregateProfileCandidate: string,
];

/**
 * Browser-safe compilation of the reviewed 62-row trigger registry.  This is
 * a product adapter registry, not route, frequency, source-promotion, or
 * execution authority.  New domain features may register later triggers
 * without changing the JourneyRequestDraft contract.
 */
const TRIGGER_ROWS = [
  ["JRN-001", "courtos.responsibility.household_stores_provisioning_procurement", "courtos.responsibility.household_stores_provisioning_procurement", "material_support", "Supplier collection or delivery", "background_transport", "no_named_principal_by_default", "freight_or_local_delivery"],
  ["JRN-002", "courtos.responsibility.household_stores_provisioning_procurement", "courtos.responsibility.household_stores_provisioning_procurement", "material_support", "Routine procurement or stores circuit", "derived_service_mobility", "assigned owner or supporter", "light_service_circuit"],
  ["JRN-003", "courtos.responsibility.adult_kin_support", "courtos.responsibility.adult_kin_support", "placement", "Adult-kin residence reassignment", "named_journey", "person_whose_residence_changes", "household_transfer"],
  ["JRN-004", "courtos.responsibility.adult_kin_support", "courtos.responsibility.adult_kin_support", "placement", "External adult support placement or return", "named_journey", "supported_adult", "household_transfer"],
  ["JRN-005", "courtos.responsibility.education_formation", "courtos.responsibility.education_formation", "education_transfer", "Initial off-site education and hosting transfer", "named_journey", "learner", "education_transfer"],
  ["JRN-006", "courtos.responsibility.education_formation", "courtos.responsibility.education_formation", "education_transfer", "Provider or host change", "named_journey", "learner", "education_transfer"],
  ["JRN-007", "courtos.responsibility.education_formation", "courtos.responsibility.education_formation", "education_transfer", "Education completion or return", "named_journey", "learner", "education_transfer"],
  ["JRN-008", "service.health_engine_service", "courtos.responsibility.household_service_care", "health_and_safety", "Care-setting transfer", "named_journey", "sick_person", "protected_care_transfer"],
  ["JRN-009", "service.health_engine_service", "courtos.responsibility.household_service_care", "health_and_safety", "Emergency evacuation or protected health move", "named_journey", "person_at_risk", "protected_care_transfer"],
  ["JRN-010", "courtos.responsibility.marriage_dynasty_stewardship", "courtos.responsibility.marriage_dynasty_stewardship", "marriage", "Purpose-bound introduction or courtship visit", "named_journey", "prospective_spouse_or_house_representative", "small_noble_retinue"],
  ["JRN-011", "courtos.responsibility.marriage_dynasty_stewardship", "courtos.responsibility.marriage_dynasty_stewardship", "marriage", "Marriage ceremony attendance", "named_journey", "travelling_spouse_or_primary_house_party", "ceremonial_retinue"],
  ["JRN-012", "service.marriage_lifecycle_marketplace_service", "courtos.responsibility.marriage_dynasty_stewardship", "marriage", "Post-union residence transfer", "named_journey", "spouse_changing_residence", "household_transfer"],
  ["JRN-013", "courtos.responsibility.patronage_hospitality_gifts", "courtos.responsibility.patronage_hospitality_gifts", "social_visit", "Accepted outbound hospitality, kin, patronage, or courtesy visit", "named_journey", "named_visitor_or_house_representative", "small_noble_retinue"],
  ["JRN-014", "courtos.responsibility.patronage_hospitality_gifts", "courtos.responsibility.patronage_hospitality_gifts", "social_visit", "Host acceptance of an incoming named visit", "host_binding_only", "no_host_travel_principal", "not_applicable"],
  ["JRN-015", "courtos.responsibility.patronage_hospitality_gifts", "courtos.responsibility.patronage_hospitality_gifts", "social_visit", "External hunt, honour, feast, or patronage appearance", "named_journey", "invited_or_sponsoring_principal", "ceremonial_retinue"],
  ["JRN-016", "courtos.responsibility.manor_stewardship", "courtos.responsibility.manor_stewardship", "estate_presence", "Personal or commissioned manor inspection", "named_journey", "selected_inspector", "inspection_party"],
  ["JRN-017", "courtos.responsibility.manor_stewardship", "courtos.responsibility.manor_stewardship", "estate_presence", "In-person operator conference", "named_journey", "party_selected_to_travel", "individual_or_light_party"],
  ["JRN-018", "courtos.responsibility.manor_stewardship", "courtos.responsibility.manor_stewardship", "estate_presence", "Routine local manor operation", "local_or_remote_no_journey", "resident_operator", "not_applicable"],
  ["JRN-019", "courtos.responsibility.estate_fabric_maintenance_oversight", "courtos.responsibility.estate_fabric_maintenance_oversight", "estate_presence", "Commissioned estate-condition inspection", "named_journey", "commissioned_inspector", "inspection_party"],
  ["JRN-020", "courtos.responsibility.estate_fabric_maintenance_oversight", "courtos.responsibility.estate_fabric_maintenance_oversight", "estate_presence", "Routine multi-site condition circuit", "derived_service_mobility", "assigned_owner_or_supporter", "light_service_circuit"],
  ["JRN-021", "courtos.responsibility.works_project_supervision", "courtos.responsibility.works_project_supervision", "project", "Project mobilization, inspection, variance review, or handover", "named_journey", "project_supervisor_or_delegate", "inspection_party"],
  ["JRN-022", "courtos.responsibility.works_project_supervision", "courtos.responsibility.works_project_supervision", "project", "Project material, labor, and equipment delivery", "background_transport", "no_named_principal_by_default", "project_freight"],
  ["JRN-023", "courtos.responsibility.franchise_operations", "courtos.responsibility.franchise_operations", "facility_operation", "Routine facility/franchise circuit", "derived_service_mobility", "assigned_operator_or_supervisor", "light_service_circuit"],
  ["JRN-024", "courtos.responsibility.franchise_operations", "courtos.responsibility.franchise_operations", "facility_operation", "Exceptional franchise-site response or inspection", "named_journey", "competent_operator_or_delegate", "inspection_party"],
  ["JRN-025", "courtos.responsibility.portfolio_oversight", "courtos.responsibility.portfolio_oversight", "estate_presence", "Multi-stop lordly progress or commissioned portfolio review", "named_journey", "selected_principal_or_inspector", "progress_retinue"],
  ["JRN-026", "courtos.responsibility.portfolio_oversight", "courtos.responsibility.portfolio_oversight", "estate_presence", "Delegated portfolio coverage circuit", "derived_service_mobility", "portfolio_owner_or_supporter", "light_service_circuit"],
  ["JRN-027", "courtos.responsibility.house_fiscal_administration", "courtos.responsibility.house_fiscal_administration", "fiscal_custody", "Named treasury, custody, or audit visit", "named_journey", "competent_fiscal_actor", "protected_fiscal_visit"],
  ["JRN-028", "courtos.responsibility.house_fiscal_administration", "courtos.responsibility.house_fiscal_administration", "fiscal_custody", "Coin, treasure, or remittance movement", "background_transport", "no_named_noble_by_default", "treasure_convoy"],
  ["JRN-029", "courtos.responsibility.manor_fiscal_administration", "courtos.responsibility.manor_fiscal_administration", "fiscal_custody", "Routine manor fiscal circuit", "derived_service_mobility", "assigned_fiscal_actor", "light_service_circuit"],
  ["JRN-030", "courtos.responsibility.manor_fiscal_administration", "courtos.responsibility.manor_fiscal_administration", "fiscal_custody", "Manor-to-House remittance", "background_transport", "no_named_noble_by_default", "treasure_convoy"],
  ["JRN-031", "courtos.responsibility.revenue_right_administration_collection", "courtos.responsibility.revenue_right_administration_collection", "right_collection", "Routine collection and administration circuit", "derived_service_mobility", "assigned_collector_or_administrator", "collection_circuit"],
  ["JRN-032", "courtos.responsibility.revenue_right_administration_collection", "courtos.responsibility.revenue_right_administration_collection", "right_collection", "Collected revenue delivery", "background_transport", "no_named_noble_by_default", "freight_or_treasure_delivery"],
  ["JRN-033", "courtos.responsibility.reception_intake", "courtos.responsibility.reception_intake", "intake", "Incoming named-person reception", "host_binding_only", "no_new_principal_created", "not_applicable"],
  ["JRN-034", "courtos.responsibility.reception_intake", "courtos.responsibility.reception_intake", "intake", "Messenger, item, petition, or oral report intake", "local_or_remote_no_journey", "messenger_movement_owned_elsewhere", "not_applicable"],
  ["JRN-035", "courtos.responsibility.records_archives", "courtos.responsibility.records_archives", "records", "External archive or physical evidence search", "named_journey", "assigned_records_actor_or_competent_delegate", "individual_or_light_party"],
  ["JRN-036", "courtos.responsibility.records_archives", "courtos.responsibility.records_archives", "records", "Local or correspondence-based record review", "local_or_remote_no_journey", "records_owner_or_supporter", "not_applicable"],
  ["JRN-037", "courtos.responsibility.correspondence_dispatch", "courtos.responsibility.correspondence_dispatch", "dispatch", "Ordinary or dedicated dispatch", "background_transport", "no_named_noble_by_default", "courier_dispatch"],
  ["JRN-038", "courtos.responsibility.correspondence_dispatch", "courtos.responsibility.external_relations_representation", "dispatch", "Named envoy or representative", "named_journey", "appointed_representative", "individual_or_small_retinue"],
  ["JRN-039", "courtos.responsibility.security_asset_protection", "courtos.responsibility.security_asset_protection", "security", "Protected person, asset, or custody transfer", "named_journey", "protected_subject_or_escort_commander", "protected_transfer"],
  ["JRN-040", "courtos.responsibility.security_asset_protection", "courtos.responsibility.security_asset_protection", "security", "Routine watch-command or security circuit", "derived_service_mobility", "assigned_security_actor", "security_circuit"],
  ["JRN-041", "courtos.responsibility.security_asset_protection", "courtos.responsibility.security_asset_protection", "security", "Cross-location protective response", "named_journey", "competent_security_actor", "protected_response"],
  ["JRN-042", "courtos.responsibility.martial_readiness_training", "courtos.responsibility.martial_readiness_training", "readiness", "Annual roll, training, and readiness circuit", "derived_service_mobility", "assigned_readiness_actor", "readiness_circuit"],
  ["JRN-043", "service.call_to_arms_service", "service.call_to_arms_service", "martial_activation", "Lawful or unlawful call to arms response", "named_journey", "called_named_person_or_appointed_commander", "military_service_party"],
  ["JRN-044", "courtos.responsibility.martial_stores_horse_capacity", "courtos.responsibility.martial_stores_horse_capacity", "martial_support", "Martial stores or horse-capacity inspection circuit", "derived_service_mobility", "assigned_martial_support_actor", "martial_support_circuit"],
  ["JRN-045", "courtos.responsibility.martial_stores_horse_capacity", "courtos.responsibility.martial_stores_horse_capacity", "martial_support", "Martial repair or procurement delivery", "background_transport", "no_named_noble_by_default", "martial_freight"],
  ["JRN-046", "event.court_or_great_council_occasion", "courtos.responsibility.external_relations_representation", "court_and_politics", "Court, liege, or Great Council attendance", "named_journey", "selected_attendee_or_representative", "court_retinue"],
  ["JRN-047", "courtos.responsibility.external_relations_representation", "courtos.responsibility.external_relations_representation", "external_relations", "Formal representation, audience, mediation, or diplomatic visit", "named_journey", "appointed_diplomat_or_HoH", "individual_or_small_retinue"],
  ["JRN-048", "courtos.responsibility.external_relations_representation", "courtos.responsibility.external_relations_representation", "external_relations", "Sustained presence at another court or institution", "named_journey", "appointed_representative_or_companion", "household_transfer_or_small_retinue"],
  ["JRN-049", "courtos.responsibility.external_relations_representation", "courtos.responsibility.external_relations_representation", "external_relations", "Routine relationship contact", "local_or_remote_no_journey", "assigned_relationship_owner", "not_applicable"],
  ["JRN-050", "courtos.responsibility.household_observance_chaplaincy", "courtos.responsibility.household_observance_chaplaincy", "church_and_rite", "Pilgrimage or named external rite", "named_journey", "named_observant_or_house_representative", "pilgrimage_or_rite_party"],
  ["JRN-051", "courtos.responsibility.household_observance_chaplaincy", "courtos.responsibility.household_observance_chaplaincy", "church_and_rite", "Chaplain or observance service circuit", "derived_service_mobility", "assigned_chaplain_or_owner", "light_service_circuit"],
  ["JRN-052", "courtos.responsibility.church_rights_institutional_affairs", "courtos.responsibility.church_rights_institutional_affairs", "church_and_rite", "Church appearance, recognition, institution, or patronage-right visit", "named_journey", "competent_house_representative", "church_legal_party"],
  ["JRN-053", "courtos.responsibility.church_rights_institutional_affairs", "courtos.responsibility.records_archives", "church_and_rite", "Physical Church record verification", "named_journey", "competent_records_or_church_affairs_actor", "individual_or_light_party"],
  ["JRN-054", "courtos.responsibility.church_rights_institutional_affairs", "courtos.responsibility.church_rights_institutional_affairs", "church_and_rite", "Routine parish and Church relationship administration", "local_or_remote_no_journey", "assigned_owner", "not_applicable"],
  ["JRN-055", "courtos.responsibility.office_post_appointments", "courtos.responsibility.office_post_appointments", "office_and_tenure", "Office assumption, oath, investiture, or handover", "named_journey", "incoming_or_outgoing_officeholder", "office_transfer_party"],
  ["JRN-056", "courtos.responsibility.office_post_appointments", "courtos.responsibility.adult_kin_support", "office_and_tenure", "Service-residence move following appointment", "named_journey", "officeholder_changing_residence", "household_transfer"],
  ["JRN-057", "courtos.responsibility.office_post_appointments", "courtos.responsibility.office_post_appointments", "office_and_tenure", "Same-site appointment or removal", "local_or_remote_no_journey", "incoming_or_outgoing_holder", "not_applicable"],
  ["JRN-058", "proceeding.justice_case_proceeding", "proceeding.justice_case_proceeding", "justice", "Named court or legal appearance", "named_journey", "required_party_or_representative", "legal_appearance_party"],
  ["JRN-059", "proceeding.coercive_enforcement_episode", "proceeding.justice_case_proceeding", "justice", "Prisoner, remedy, asset, or enforcement transfer", "named_journey", "named_subject_or_commanding_officer", "protected_transfer"],
  ["JRN-060", "proceeding.succession_regency_review_proceeding", "proceeding.succession_regency_review_proceeding", "authority_continuity", "Succession, regency, custody, or protected-person handover", "named_journey", "person_or_authority_subject_to_handover", "protected_transfer"],
  ["JRN-061", "event.ceremony_event_presentation", "event.ceremony_event_presentation", "ceremony", "Death observance, memorial, or other event-owned attendance", "named_journey", "selected_attendee_or_required_participant", "ceremonial_retinue"],
  ["JRN-062", "proceeding.tenure_change_proceeding", "proceeding.tenure_change_proceeding", "office_and_tenure", "Tenure grant, homage, seisin, regrant, or possession transfer", "named_journey", "grantee_holder_or_competent_representative", "office_transfer_party"],
] as const satisfies readonly TriggerRowV1[];

export type JourneyTriggerIdV1 = (typeof TRIGGER_ROWS)[number][0];

export interface JourneyTriggerDefinitionV1 {
  trigger_id: JourneyTriggerIdV1;
  initiating_owner_key: string;
  decision_owner_key: string;
  trigger_family: string;
  trigger_name: string;
  movement_class: JourneyMovementClassV1;
  principal_selector_rule: string;
  aggregate_profile_candidate: string;
  source_status: "cpo_requirements_candidate";
  runtime_authority: false;
}

export const JOURNEY_TRIGGER_REGISTRY: Readonly<Record<JourneyTriggerIdV1, JourneyTriggerDefinitionV1>> =
  Object.freeze(Object.fromEntries(TRIGGER_ROWS.map((row) => [row[0], Object.freeze({
    trigger_id: row[0],
    initiating_owner_key: row[1],
    decision_owner_key: row[2],
    trigger_family: row[3],
    trigger_name: row[4],
    movement_class: row[5],
    principal_selector_rule: row[6],
    aggregate_profile_candidate: row[7],
    source_status: "cpo_requirements_candidate" as const,
    runtime_authority: false as const,
  })])) as Record<JourneyTriggerIdV1, JourneyTriggerDefinitionV1>);

export type JourneyDesiredWindowV1 = JourneyWindowV1;

export interface JourneyPlannedDestinationStayV1 {
  arrival_cutpoint: JourneyCutpointV1;
  departure_cutpoint: JourneyCutpointV1;
}

export interface JourneyNamedParticipantCandidateV1 {
  person_id: string;
  party_role: JourneyPartyRoleV1;
  participation_basis_ref: string;
  required_or_discretionary: JourneyParticipationRequirementV1;
  authority_or_custody_ref: string | null;
  intended_arrival_disposition: JourneyEndPostureV1;
}

export interface JourneySupportBasisV1 {
  sponsor_entity_id: string;
  support_basis_ref: string;
  support_posture: "house_support" | "contract_support" | "host_support" | "public_or_service_support";
}

export interface JourneyDomainRequestV1 {
  domain_request_id: string;
  trigger_id: JourneyTriggerIdV1;
  initiating_owner_key: string;
  primary_purpose_ref: string;
  decision_owner_responsibility_instance_id: string | null;
  competent_proceeding_ref: string | null;
  initiating_actor_id: string;
  principal_person_id: string;
  origin_location_anchor_id: string;
  destination_location_anchor_id: string;
  desired_window: JourneyDesiredWindowV1;
  return_window?: JourneyDesiredWindowV1 | null;
  planned_destination_stay?: JourneyPlannedDestinationStayV1 | null;
  route_posture: JourneyRoutePostureV1;
  end_posture: JourneyEndPostureV1;
  named_participant_candidates: readonly JourneyNamedParticipantCandidateV1[];
  authority_evidence_refs: readonly string[];
  support_basis: JourneySupportBasisV1;
  hosting_visit_arrangement_id?: string | null;
  host_acceptance_required?: boolean;
  owning_domain_command_ref: string;
  source_refs: readonly string[];
}

export interface JourneyRequestDraftV1 {
  schema_version: typeof JOURNEY_REQUEST_DRAFT_SCHEMA_VERSION;
  journey_request_draft_id: string;
  source_domain_request_id: string;
  trigger_id: JourneyTriggerIdV1;
  trigger_family: string;
  primary_purpose_ref: string;
  initiating_owner_key: string;
  decision_owner_key: string;
  decision_owner_responsibility_instance_id: string | null;
  competent_proceeding_ref: string | null;
  initiating_actor_id: string;
  principal_person_id: string;
  origin_location_anchor_id: string;
  destination_location_anchor_id: string;
  desired_window: JourneyDesiredWindowV1;
  return_window: JourneyDesiredWindowV1 | null;
  planned_destination_stay: JourneyPlannedDestinationStayV1 | null;
  route_posture: JourneyRoutePostureV1;
  end_posture: JourneyEndPostureV1;
  named_participant_candidates: JourneyNamedParticipantCandidateV1[];
  authority_evidence_refs: string[];
  aggregate_profile_candidate: string;
  support_basis: JourneySupportBasisV1;
  hosting_visit_arrangement_id: string | null;
  host_acceptance_required: boolean;
  owning_domain_command_ref: string;
  source_refs: string[];
  lifecycle_submission_status: "draft_not_submitted";
  boundaries: {
    purpose_owned_by_initiating_domain: true;
    route_selected: false;
    arrangement_admitted: false;
    support_reserved: false;
    person_moved: false;
    presence_mutated: false;
    domain_state_mutated: false;
    material_or_gl_mutated: false;
  };
}

export interface JourneyDraftSubmissionReceiptV1 {
  journey_request_draft_id: string;
  submission_status: "accepted_for_resolution" | "withheld" | "rejected" | "idempotent";
  journey_request_id: string | null;
  /** Present only after the core planner has produced and admitted an arrangement. */
  journey_arrangement_id: string | null;
  /** Stable read-port identity for the admitted lifecycle; null before admission. */
  journey_lifecycle_record_id: string | null;
  /** Candidate/provisional execution is never represented as runtime authority. */
  lifecycle_source_status: "admitted_runtime_input" | "development_provisional" | null;
  runtime_authority: boolean;
  reason_codes: readonly string[];
  source_refs: readonly string[];
}

/** Injected Journey core port; this adapter does not execute the request. */
export interface JourneyRequestDraftConsumerV1 {
  submitJourneyRequestDraft(draft: Readonly<JourneyRequestDraftV1>): JourneyDraftSubmissionReceiptV1;
}

function cleanText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function stableStrings(values: readonly string[], field: string): string[] {
  const normalized = [...new Set(values.map((value) => cleanText(value, field)))].sort();
  if (normalized.length === 0) throw new Error(`${field} requires at least one value`);
  return normalized;
}

function isResponsibilityOwner(key: string): key is CurrentCourtOsResponsibilityKeyV1 {
  return (CURRENT_COURTOS_RESPONSIBILITY_KEYS as readonly string[]).includes(key);
}

function canonicalParticipants(
  participants: readonly JourneyNamedParticipantCandidateV1[],
  principalPersonId: string,
): JourneyNamedParticipantCandidateV1[] {
  const seen = new Set<string>();
  const normalized = participants.map((participant) => {
    const personId = cleanText(participant.person_id, "named_participant_candidates.person_id");
    if (seen.has(personId)) throw new Error(`duplicate named participant ${personId}`);
    seen.add(personId);
    return {
      person_id: personId,
      party_role: participant.party_role,
      participation_basis_ref: cleanText(participant.participation_basis_ref, "participation_basis_ref"),
      required_or_discretionary: participant.required_or_discretionary,
      authority_or_custody_ref: participant.authority_or_custody_ref?.trim() || null,
      intended_arrival_disposition: participant.intended_arrival_disposition,
    };
  });
  const principal = normalized.filter((row) => row.person_id === principalPersonId && row.party_role === "principal");
  if (principal.length !== 1) {
    throw new Error("named_participant_candidates must contain the principal exactly once with party_role principal");
  }
  return normalized.sort((left, right) => {
    const principalOrder = Number(right.party_role === "principal") - Number(left.party_role === "principal");
    if (principalOrder !== 0) return principalOrder;
    const requirementOrder = Number(right.required_or_discretionary === "required") - Number(left.required_or_discretionary === "required");
    if (requirementOrder !== 0) return requirementOrder;
    return left.person_id.localeCompare(right.person_id) || left.party_role.localeCompare(right.party_role);
  });
}

const CUTPOINT_PHASE_ORDER = { opening: 1, midmonth: 2, closing: 3 } as const;

function compareCutpoints(left: JourneyCutpointV1, right: JourneyCutpointV1): number {
  return left.relative_month - right.relative_month ||
    CUTPOINT_PHASE_ORDER[left.phase] - CUTPOINT_PHASE_ORDER[right.phase];
}

function canonicalCutpoint(cutpoint: JourneyCutpointV1, fieldPrefix: string): JourneyCutpointV1 {
  if (!Number.isInteger(cutpoint.relative_month) || cutpoint.relative_month < 1) {
    throw new Error(`${fieldPrefix}.relative_month must be a positive integer`);
  }
  return {
    relative_month: cutpoint.relative_month,
    phase: cutpoint.phase,
  };
}

function canonicalWindow(window: JourneyDesiredWindowV1, fieldPrefix: string): JourneyDesiredWindowV1 {
  const earliest = canonicalCutpoint(window.earliest_departure, `${fieldPrefix}.earliest_departure`);
  const latest = canonicalCutpoint(window.latest_arrival, `${fieldPrefix}.latest_arrival`);
  if (compareCutpoints(latest, earliest) < 0) {
    throw new Error(`${fieldPrefix} must be an ordered cutpoint range`);
  }
  return { earliest_departure: earliest, latest_arrival: latest };
}

function canonicalStay(stay: JourneyPlannedDestinationStayV1 | null | undefined): JourneyPlannedDestinationStayV1 | null {
  if (!stay) return null;
  const arrival = canonicalCutpoint(stay.arrival_cutpoint, "planned_destination_stay.arrival_cutpoint");
  const departure = canonicalCutpoint(stay.departure_cutpoint, "planned_destination_stay.departure_cutpoint");
  if (compareCutpoints(departure, arrival) < 0) throw new Error("planned_destination_stay must be ordered");
  return {
    arrival_cutpoint: arrival,
    departure_cutpoint: departure,
  };
}

export function getJourneyTriggerDefinition(
  triggerId: JourneyTriggerIdV1,
): JourneyTriggerDefinitionV1 {
  const definition = JOURNEY_TRIGGER_REGISTRY[triggerId];
  if (!definition) throw new Error(`unregistered Journey trigger ${triggerId}`);
  return definition;
}

export function classifyJourneyTrigger(triggerId: JourneyTriggerIdV1): JourneyMovementClassV1 {
  return getJourneyTriggerDefinition(triggerId).movement_class;
}

export function buildJourneyRequestDraft(input: JourneyDomainRequestV1): JourneyRequestDraftV1 {
  const trigger = getJourneyTriggerDefinition(input.trigger_id);
  if (trigger.movement_class !== "named_journey") {
    throw new Error(`${trigger.trigger_id} is ${trigger.movement_class}; it cannot create a JourneyRequestDraft`);
  }
  if (cleanText(input.initiating_owner_key, "initiating_owner_key") !== trigger.initiating_owner_key) {
    throw new Error(`${trigger.trigger_id} must be initiated by ${trigger.initiating_owner_key}`);
  }

  const responsibilityOwned = isResponsibilityOwner(trigger.decision_owner_key);
  const decisionInstanceId = input.decision_owner_responsibility_instance_id?.trim() || null;
  const proceedingRef = input.competent_proceeding_ref?.trim() || null;
  if (responsibilityOwned && !decisionInstanceId) {
    throw new Error(`${trigger.trigger_id} requires decision_owner_responsibility_instance_id`);
  }
  if (responsibilityOwned && proceedingRef) {
    throw new Error(`${trigger.trigger_id} is responsibility-owned and cannot substitute a competent proceeding`);
  }
  if (!responsibilityOwned && decisionInstanceId) {
    throw new Error(`${trigger.trigger_id} is proceeding-owned and cannot name a responsibility instance`);
  }
  if (!responsibilityOwned && !proceedingRef) {
    throw new Error(`${trigger.trigger_id} requires competent_proceeding_ref`);
  }

  const origin = cleanText(input.origin_location_anchor_id, "origin_location_anchor_id");
  const destination = cleanText(input.destination_location_anchor_id, "destination_location_anchor_id");
  if (origin === destination) throw new Error("a named Journey requires distinct origin and destination anchors");
  const desiredWindow = canonicalWindow(input.desired_window, "desired_window");
  const returnWindow = input.return_window ? canonicalWindow(input.return_window, "return_window") : null;
  if (returnWindow && compareCutpoints(returnWindow.earliest_departure, desiredWindow.earliest_departure) < 0) {
    throw new Error("return_window cannot begin before the departure window");
  }

  const principalPersonId = cleanText(input.principal_person_id, "principal_person_id");
  const hostAcceptanceRequired = input.host_acceptance_required ?? false;
  const hostingVisitArrangementId = input.hosting_visit_arrangement_id?.trim() || null;
  if (input.support_basis.support_posture === "host_support" && !hostAcceptanceRequired) {
    throw new Error("host_support requires host_acceptance_required");
  }
  if (hostAcceptanceRequired && !hostingVisitArrangementId) {
    throw new Error("host_acceptance_required requires hosting_visit_arrangement_id");
  }
  return {
    schema_version: JOURNEY_REQUEST_DRAFT_SCHEMA_VERSION,
    journey_request_draft_id: `journey:draft:${cleanText(input.domain_request_id, "domain_request_id")}`,
    source_domain_request_id: input.domain_request_id.trim(),
    trigger_id: trigger.trigger_id,
    trigger_family: trigger.trigger_family,
    primary_purpose_ref: cleanText(input.primary_purpose_ref, "primary_purpose_ref"),
    initiating_owner_key: trigger.initiating_owner_key,
    decision_owner_key: trigger.decision_owner_key,
    decision_owner_responsibility_instance_id: decisionInstanceId,
    competent_proceeding_ref: proceedingRef,
    initiating_actor_id: cleanText(input.initiating_actor_id, "initiating_actor_id"),
    principal_person_id: principalPersonId,
    origin_location_anchor_id: origin,
    destination_location_anchor_id: destination,
    desired_window: desiredWindow,
    return_window: returnWindow,
    planned_destination_stay: canonicalStay(input.planned_destination_stay),
    route_posture: input.route_posture,
    end_posture: input.end_posture,
    named_participant_candidates: canonicalParticipants(input.named_participant_candidates, principalPersonId),
    authority_evidence_refs: stableStrings(input.authority_evidence_refs, "authority_evidence_refs"),
    aggregate_profile_candidate: trigger.aggregate_profile_candidate,
    support_basis: {
      sponsor_entity_id: cleanText(input.support_basis.sponsor_entity_id, "support_basis.sponsor_entity_id"),
      support_basis_ref: cleanText(input.support_basis.support_basis_ref, "support_basis.support_basis_ref"),
      support_posture: input.support_basis.support_posture,
    },
    hosting_visit_arrangement_id: hostingVisitArrangementId,
    host_acceptance_required: hostAcceptanceRequired,
    owning_domain_command_ref: cleanText(input.owning_domain_command_ref, "owning_domain_command_ref"),
    source_refs: stableStrings(input.source_refs, "source_refs"),
    lifecycle_submission_status: "draft_not_submitted",
    boundaries: {
      purpose_owned_by_initiating_domain: true,
      route_selected: false,
      arrangement_admitted: false,
      support_reserved: false,
      person_moved: false,
      presence_mutated: false,
      domain_state_mutated: false,
      material_or_gl_mutated: false,
    },
  };
}
