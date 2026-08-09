export const HOUSEHOLD_1120_CONTRACT_GENERATION =
  "9e58577246a3a381395f5a03b520d9790e94ab2d12287999c9bae362466014c0" as const;

export const HOUSEHOLD_1120_SQLITE_SHA256 =
  "4e5cd5c687ef4e862cdda459fa93b6999ada6a4f9a3881b3abd891f70eb631c4" as const;

export interface Household1120ReadBoundary {
  effective_date: string;
  source_authority_status: string;
  runtime_authority: number;
  disclosure_posture: string;
}

export interface Household1120MembershipRow extends Household1120ReadBoundary {
  protected_person_id: string;
  display_name: string;
  life_state: string;
  birth_year: number | null;
  death_year: number | null;
  endpoint_house_protected_id: string | null;
  endpoint_house_label: string | null;
  primary_residence_id: string | null;
  primary_residence_label: string | null;
  residence_state: string;
  father_person_id: string | null;
  mother_person_id: string | null;
  current_union_id: string | null;
  kinship_source_status: string;
  relationship_projection_state: string;
}

export interface Household1120ResponsibilityRow extends Household1120ReadBoundary {
  responsibility_summary_id: string;
  responsibility_demand_id: string;
  demand_entity_id: string;
  demand_entity_label: string | null;
  responsibility_id: string;
  responsibility_label: string;
  source_legacy_responsibility_id: string;
  source_legacy_responsibility_label: string;
  demand_state: string;
  coverage_state: string;
  holder_person_id: string | null;
  holder_display_name: string | null;
  authority_posture: string;
  /** Present only in the Foundation A authority release; legacy rows remain valid. */
  authority_scope_id?: string | null;
  authority_scope_label?: string | null;
  manor_id?: string | null;
}

export interface Household1120StoresPositionRow extends Household1120ReadBoundary {
  stores_position_id: string;
  household_entity_id: string;
  resource_id: string;
  quantity_integer: number | null;
  position_state: string;
  custody_id: string | null;
  capacity_id: string | null;
  availability_posture?: "available" | "committed" | "unknown_withheld";
  source_effective_date?: string;
  projection_generation_id?: string;
  /** Foundation A Stores uses source `manor_hx` as its audited external location key. */
  manor_id?: string | null;
  manor_label?: string | null;
  position_kind?: "house_position" | "custody_position" | "food_capacity";
}

export interface Household1120StoresHistoryRow extends Household1120ReadBoundary {
  stores_history_id: string;
  household_entity_id: string;
  resource_id: string;
  event_kind: string;
  quantity_integer: number | null;
  receipt_id: string | null;
  event_effective_date: string;
}

export interface Household1120SupplyRouteRow extends Household1120ReadBoundary {
  supply_route_id: string;
  household_entity_id: string;
  counterparty_entity_id: string | null;
  route_id: string | null;
  carrier_id: string | null;
  custody_state: string;
  movement_state: string;
  receipt_state: string;
}

export interface Household1120AdultKinRosterRow extends Household1120ReadBoundary {
  support_roster_id: string;
  household_entity_id: string;
  person_id: string;
  roster_state: string;
  /** The explicit eligibility value; CourtOS accepts only `managed_adult_kin`. */
  support_eligibility?: "managed_adult_kin";
  /** Why the person remains a House accountability, not a residence inference. */
  classification_reason?: string | null;
  /** A domain that fully governs support excludes the person from this roster. */
  linked_governing_domain?: string | null;
  primary_support_basis?: string | null;
  independence_qualifier?: string | null;
  manager_person_id?: string | null;
  manager_person_name?: string | null;
  residence_label?: string | null;
}

export interface Household1120AdultKinArrangementRow extends Household1120ReadBoundary {
  support_arrangement_id: string;
  person_id: string;
  responsible_party_id: string;
  commitment_id: string;
  arrangement_state: string;
}

export interface Household1120EducationLearnerPlanRow extends Household1120ReadBoundary {
  education_assignment_id: string;
  learner_person_id: string;
  learner_name: string;
  learner_age_turn0: number | null;
  learner_age_band: string | null;
  learner_house_id: string | null;
  learner_house_name: string | null;
  learner_house_class: string | null;
  recommended_track_id: string;
  recommended_track: string;
  setting_type: string;
  setting_entity: string | null;
  primary_provider_person_id: string | null;
  primary_provider_name: string | null;
  responsible_party_person_id: string | null;
  responsible_party_name: string | null;
  review_date: string | null;
  contract_state: string;
  capacity_availability_state: string;
  knowledge_state: string;
}

export interface Household1120EducationCycleReportRow extends Household1120ReadBoundary {
  cycle_report_id: string;
  learner_person_id: string;
  cycle_year: number;
  report_state: string;
  report_delivery_route?: string;
  progress_interpretation?: string;
  progress_course_interpretation?: string;
  annual_receipt_count?: number;
  assignment_continuity_basis?: string;
}

export interface Household1120HealthRosterRow extends Household1120ReadBoundary {
  health_roster_id: string;
  person_id: string;
  condition_id: string;
  severity_state: string;
}

export interface Household1120HealthCycleReportRow extends Household1120ReadBoundary {
  health_cycle_report_id: string;
  person_id: string;
  cycle_year: number;
  report_state: string;
  health_condition_id?: string;
  current_presentation?: string;
  course_since_last_report?: string;
  household_consequence?: string;
  prior_care_reading?: string;
  current_care_arrangement?: string;
  review_prompt?: string;
  evidence_label?: string;
  evidence_attribution?: string;
}

export interface Household1120CareArrangementRow extends Household1120ReadBoundary {
  care_arrangement_id: string;
  person_id: string;
  commitment_id: string;
  provider_id: string | null;
  arrangement_state: string;
}

/** Founder-approved provisional 1117–1119 economic-harness evidence. */
export interface Household1120EconomicActivityLookbackRow extends Household1120ReadBoundary {
  activity_id: string;
  source_economic_leg_id: string;
  activity_year: 1117 | 1118 | 1119;
  effective_date: string;
  resource_id: string;
  flow_family: string;
  regularity: "regular";
  direction: string;
  signed_amount: number;
  counterparty_entity_id: string | null;
  counterparty_label: string | null;
  temporal_basis: "annual_regular_posting";
  evidence_status: "founder_approved_provisional_economic_lookback";
}

export interface Household1120ProtectedPersonDossierRow extends Household1120ReadBoundary {
  protected_person_dossier_id: string;
  person_id: string;
  mandate_id: string;
  responsible_party_id: string | null;
  dossier_state: string;
}

export interface Household1120MatterRow extends Household1120ReadBoundary {
  household_matter_id: string;
  household_entity_id: string;
  responsibility_id: string;
  matter_state: string;
  cause_receipt_id: string | null;
}

export interface Household1120ProvenanceRow extends Household1120ReadBoundary {
  provenance_id: string;
  record_kind: "source" | "surface";
  record_key: string;
  source_path: string | null;
  source_sha256: string | null;
  admission_state: "projected_read_ready" | "withheld_pending_admission";
  row_count: number;
  withheld_reason: string | null;
}

export interface CourtOsResponsibilityWorkspaceRecordV1 {
  responsibility_key: string;
  record_id: string;
  record_kind: "authority_scope" | "subject" | "evidence" | "target" | "withheld";
  scope_id: string | null;
  scope_label: string | null;
  subject_id: string | null;
  subject_label: string | null;
  state_label: string;
  evidence_label: string;
  source_package_id: string;
  runtime_authority: false;
}

/** Source-bound proposal candidates; these rows grant no runtime authority. */
export interface Household1120StewardshipCandidateRow {
  eligibility_candidate_id: string;
  generation_id: string;
  effective_date: string;
  house_id: string;
  responsibility_id: string;
  responsibility_instance_id: string;
  scope_id: string;
  person_id: string;
  person_name: string;
  eligibility_posture: string;
  eligibility_bounds: string;
  deterministic_order: string;
  selector_priority: string;
  selector: string;
  eligibility_basis: string;
  affiliation_basis: string;
  evidence_kind: string;
  evidence_ids: string;
  provenance_refs: string;
  authority_boundary: string;
  source_authority_assignment_id: string;
  source_authority_generation_id: string;
  source_candidate_only_lineage: string;
  foundation_a_authority_admission_disposition: string;
  source_runtime_authority_posture: string;
  policy_id: string;
  policy_sha256: string;
  capacity_posture: string;
  runtime_authority: string;
  canon_status: string;
}

export interface Household1120ReadOnlyProjection {
  schema_version:
    | "household_1120_read_only_projection_v2"
    | "foundation_a_household_runtime_release_v1"
    | "foundation_a_household_uat1_release_v1";
  contract: {
    generation_id: string;
    effective_date: "1120-01-01";
    sqlite_sha256: string;
    sqlite_integrity: "ok";
    runtime_authority: false;
  };
  query: {
    household_entity_id: string;
    house_id: string;
  };
  membership_context: readonly Household1120MembershipRow[];
  responsibility_summary: readonly Household1120ResponsibilityRow[];
  stores_positions: readonly Household1120StoresPositionRow[];
  stores_history: readonly Household1120StoresHistoryRow[];
  supply_routes: readonly Household1120SupplyRouteRow[];
  adult_kin_roster: readonly Household1120AdultKinRosterRow[];
  adult_kin_arrangements: readonly Household1120AdultKinArrangementRow[];
  education_plans: readonly Household1120EducationLearnerPlanRow[];
  education_cycle_reports: readonly Household1120EducationCycleReportRow[];
  health_roster: readonly Household1120HealthRosterRow[];
  health_cycle_reports: readonly Household1120HealthCycleReportRow[];
  care_arrangements: readonly Household1120CareArrangementRow[];
  economic_activity_lookback: readonly Household1120EconomicActivityLookbackRow[];
  protected_person_dossiers: readonly Household1120ProtectedPersonDossierRow[];
  matters: readonly Household1120MatterRow[];
  provenance: readonly Household1120ProvenanceRow[];
  responsibility_workspace_records?: readonly CourtOsResponsibilityWorkspaceRecordV1[];
  responsibility_assignment_candidates?: readonly Household1120StewardshipCandidateRow[];
  responsibility_assignment_candidate_generation_id?: string | null;
}

export interface Household1120ReadModelSessionContract {
  projection(input: {
    householdEntityId: string;
    houseId: string;
  }): Promise<Household1120ReadOnlyProjection>;
  close(): Promise<void>;
}
