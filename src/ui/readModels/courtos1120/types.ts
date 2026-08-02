export const COURTOS_1120_CONTRACT_GENERATION =
  "d338fca408a5bfb6bfe65c66a2dc18c0adbad0934d7879f4835806f6492ef2b9" as const;

export const COURTOS_1120_SQLITE_SHA256 =
  "0929255c270ac259e28dc750e4ec3cad8f438d50d8e0bb4cde9b34cccb966a8b" as const;

export const COURTOS_1120_DATABASE_FILENAME = "courtos_read_only_uat_contract_1120_01_01_v1.sqlite" as const;

export const COURTOS_1120_READ_ONLY_PROJECTION_SCHEMA_VERSION =
  "courtos_1120_read_only_uat_projection_v1" as const;

export type CourtOs1120Scalar = string | number | boolean | null;
export type CourtOs1120RawRow = Record<string, CourtOs1120Scalar>;

export interface CourtOs1120EntitySummaryRow {
  entity_id: string;
  canonical_business_key: string;
  entity_type: string;
  display_label: string | null;
  protected_graph_entity_id: string | null;
  protected_house_class: string | null;
  protected_landed_rank_class: string | null;
  identity_state: string;
  identity_readiness_state: string;
  office_definition_count: number;
  occupied_office_count: number;
  vacant_office_count: number;
  unresolved_office_count: number;
  martial_service_slot_count: number;
  named_martial_occupant_count: number;
  conditional_martial_slot_count: number;
  responsibility_demand_count: number;
  structural_carrier_present_count: number;
  review_item_count: number;
  workload_state: string;
  capacity_state: string;
  occupancy_state: string;
  occupancy_value: number | null;
  specialized_rights_state: string;
  readiness_state: string;
  effective_date: string;
  runtime_authority: number;
}

export interface CourtOs1120OfficeRow {
  office_id: string;
  source_office_key: string;
  office_title: string;
  office_scope: string;
  office_object_type: string;
  office_status: string;
  authority_entity_id: string;
  authority_entity_label: string | null;
  assignment_id: string | null;
  assignment_state: string;
  vacancy_class: string | null;
  holder_person_id: string | null;
  holder_display_name: string | null;
  holder_life_state: string | null;
  holder_age_1120: number | null;
  appointing_authority_entity_id: string | null;
  supervisory_office_id: string | null;
  station_entity_id: string | null;
  jurisdictions_json: string;
  functional_roles_json: string;
  standing_responsibilities_json: string;
  service_record_policy: string;
  workload_state: string;
  capacity_demand_units: number | null;
  capacity_state: string;
  review_required: number;
  readiness_state: string;
  source_assertion_id: string;
  effective_date: string;
  runtime_authority: number;
}

export interface CourtOs1120ResponsibilityRow {
  responsibility_demand_id: string;
  predecessor_responsibility_demand_id: string | null;
  demand_entity_id: string;
  demand_entity_label: string | null;
  demand_scope_type: string;
  standing_responsibility_id: string;
  responsibility_label: string;
  demand_state: string;
  minimum_coverage_band: string;
  coverage_assignment_id: string;
  carrier_kind: string;
  carrier_record_id: string | null;
  protected_person_id: string | null;
  holder_display_name: string | null;
  coverage_state: string;
  retarget_state: string;
  workload_driver_bundle_id: string | null;
  demand_capacity_units: number | null;
  effective_coverage_units: number | null;
  numeric_demand_state: string;
  numeric_coverage_state: string;
  occupancy_state: string;
  review_required: number;
  effective_date: string;
  runtime_authority: number;
}

export interface CourtOs1120StandingOrderTaskRow {
  standing_order_task_state_id: string;
  responsibility_demand_id: string;
  demand_entity_id: string;
  standing_responsibility_id: string;
  coverage_assignment_id: string;
  carrier_kind: string;
  carrier_record_id: string | null;
  protected_person_id: string | null;
  standing_order_id: string | null;
  ordinary_order: string | null;
  cadence_policy: string | null;
  escalation_trigger: string | null;
  absence_delegation_policy: string | null;
  standing_order_state: string;
  runtime_task_count: number | null;
  runtime_task_state: string;
  runtime_receipt_state: string;
  event_commitment_state: string;
  capacity_commitment_units: number | null;
  readiness_state: string;
  review_required: number;
  effective_date: string;
  runtime_authority: number;
}

export interface CourtOs1120PersonAssignmentRow {
  protected_person_id: string;
  display_name: string;
  sex: string | null;
  birth_year: number | null;
  death_year: number | null;
  age_1120: number | null;
  life_state: string;
  rank_scope_raw: string | null;
  endpoint_house_protected_id: string | null;
  endpoint_house_entity_id: string | null;
  endpoint_house_label: string | null;
  office_assignment_count: number;
  occupied_office_count: number;
  unresolved_office_count: number;
  martial_assignment_count: number;
  assignment_titles_json: string;
  assignment_state: string;
  primary_residence_type: string | null;
  primary_residence_id: string | null;
  primary_residence_label: string | null;
  residence_state: string;
  presence_disposition_state: string;
  distinct_duty_station_count: number;
  food_support_state: string;
  gross_capacity_units: number | null;
  committed_capacity_units: number | null;
  residual_capacity_units: number | null;
  capacity_state: string;
  utilization_value: number | null;
  utilization_state: string;
  review_required: number;
  review_reason: string | null;
  effective_date: string;
  runtime_authority: number;
}

export interface CourtOs1120ResidencePresenceRow {
  residence_presence_id: string;
  source_projection_row_id: string | null;
  protected_person_id: string | null;
  display_name: string | null;
  life_state: string;
  residence_entity_type: string | null;
  residence_entity_id: string | null;
  residence_label: string | null;
  residence_county_or_orbit: string | null;
  primary_residence_state: string;
  location_validation_state: string;
  house_alignment_state: string;
  duty_station_count: number;
  duty_station_entity_ids: string | null;
  presence_disposition_state: string;
  feeds_entity_type: string | null;
  feeds_entity_id: string | null;
  feeds_entity_label: string | null;
  food_support_model: string | null;
  support_validation_state: string;
  review_required: number;
  review_reason: string | null;
  effective_date: string;
  runtime_authority: number;
}

export interface CourtOs1120ReviewDocketRow {
  review_docket_id: string;
  docket_class: string;
  subject_record_type: string;
  subject_record_id: string;
  severity: string;
  decision_required: string;
  recommended_disposition: string;
  docket_status: string;
  uat_1120_state: string;
  source_assertion_id: string | null;
  effective_date: string;
  runtime_authority: number;
}

export interface CourtOs1120ProvenanceReadinessRow {
  provenance_readiness_id: string;
  record_kind: string;
  record_key: string;
  source_path: string | null;
  source_sha256: string | null;
  authority_status: string;
  temporal_basis: string;
  readiness_status: string;
  effective_date: string | null;
  opening_1116_historical_inference: number;
  runtime_authority: number;
  mutation_state: string;
  notes: string | null;
}

export interface CourtOs1120EntityTypeSummary {
  entity_type: string;
  entity_count: number;
  office_definition_count: number;
  occupied_office_count: number;
  vacant_office_count: number;
  unresolved_office_count: number;
  responsibility_demand_count: number;
  review_item_count: number;
}

export interface CourtOs1120OfficeViewRow extends CourtOs1120OfficeRow {
  functional_roles: readonly CourtOs1120JsonObject[];
  standing_responsibilities: readonly CourtOs1120JsonObject[];
}

export type CourtOs1120JsonObject = Record<string, unknown>;

export interface CourtOs1120ReadOnlyProjection {
  schema_version: typeof COURTOS_1120_READ_ONLY_PROJECTION_SCHEMA_VERSION;
  contract: {
    package_id: "january_1120_courtos_read_only_uat_contract_v1";
    contract_status: "LOCKED_READ_ONLY_UAT_PROJECTION_CONTRACT_NOT_EXECUTABLE_RUNTIME_AUTHORITY";
    generation_id: typeof COURTOS_1120_CONTRACT_GENERATION;
    effective_date: "1120-01-01";
    sqlite_sha256: typeof COURTOS_1120_SQLITE_SHA256;
    sqlite_integrity: "ok";
  };
  query: {
    entity_id: string | null;
    house_id: string | null;
    entity_label: string;
  };
  selected_entity: CourtOs1120EntitySummaryRow;
  offices: readonly CourtOs1120OfficeViewRow[];
  responsibilities: readonly CourtOs1120ResponsibilityRow[];
  standing_order_tasks: readonly CourtOs1120StandingOrderTaskRow[];
  people: readonly CourtOs1120PersonAssignmentRow[];
  household_people: readonly CourtOs1120PersonAssignmentRow[];
  residence_presence: readonly CourtOs1120ResidencePresenceRow[];
  review_docket: readonly CourtOs1120ReviewDocketRow[];
  totals: {
    office_count: number;
    occupied_office_count: number;
    vacancy_or_unresolved_office_count: number;
    responsibility_count: number;
    structural_carrier_present_count: number;
    review_required_responsibility_count: number;
    standing_order_route_count: number;
    initialized_standing_order_count: number;
    runtime_task_count: number | null;
    people_count: number;
    household_people_count: number;
    residence_presence_count: number;
    review_docket_count: number;
  };
  unavailable_states: {
    workload_state: string;
    capacity_state: string;
    occupancy_state: string;
    standing_order_state: string;
    runtime_task_state: string;
    runtime_receipt_state: string;
    event_commitment_state: string;
  };
  boundaries: {
    read_only_contract: true;
    runtime_authority: false;
    executable_command_authority: false;
    source_graph_mutation: false;
    workload_values_available: false;
    capacity_values_available: false;
    initialized_orders_available: false;
  };
}

export interface CourtOs1120ReadModelSessionContract {
  readonly descriptor: {
    generation: typeof COURTOS_1120_CONTRACT_GENERATION;
    sqliteSha256: typeof COURTOS_1120_SQLITE_SHA256;
    databasePath: string;
    connectionPolicy: {
      mode: "ro";
      sqliteImmutableUri: false;
      sourceSnapshotChecksumPinned: true;
      queryOnly: true;
      generationPinnedForSession: true;
    };
  };
  projection(input?: {
    entityId?: string | null;
    houseId?: string | null;
    entityLabel?: string | null;
  }): Promise<CourtOs1120ReadOnlyProjection>;
  close(): Promise<void>;
}
