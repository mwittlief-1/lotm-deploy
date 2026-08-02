export const JOURNEY_REQUEST_SCHEMA_VERSION = "phase_five_journey_request_v1" as const;
export const JOURNEY_ARRANGEMENT_SCHEMA_VERSION = "phase_five_journey_arrangement_v1" as const;
export const JOURNEY_RECEIPT_SCHEMA_VERSION = "phase_five_journey_receipt_v1" as const;
export const JOURNEY_PRESENCE_LEDGER_SCHEMA_VERSION = "phase_five_journey_presence_ledger_v1" as const;

export type JourneyMovementClassV1 =
  | "named_journey"
  | "derived_service_mobility"
  | "background_transport"
  | "host_binding_only"
  | "local_or_remote_no_journey";

export type JourneyRoutePostureV1 =
  | "fastest_viable"
  | "safest_viable"
  | "lowest_support_burden"
  | "domain_required";

export type JourneyEndPostureV1 = "return" | "remain" | "onward" | "transfer";
export type JourneyParticipationRequirementV1 = "required" | "discretionary";
export type JourneyPartyRoleV1 =
  | "principal"
  | "subject_transfer"
  | "representative_delegate"
  | "spouse_or_consort"
  | "child_dependent_or_ward"
  | "guardian_or_custodian"
  | "caregiver"
  | "educator_or_provider"
  | "negotiator_petitioner_or_party"
  | "chaplain_clerk_interpreter_or_witness"
  | "escort_commander_or_named_officer"
  | "handover_counterparty"
  | "selected_attendee_or_companion"
  | "return_or_onward_escort";

export type JourneyProfileKeyV1 =
  | "light_personal"
  | "small_noble_retinue"
  | "ceremonial_progress"
  | "household_transfer"
  | "protected_transfer"
  | "martial_party";

export type JourneyHousePostureV1 = "lesser" | "baronial" | "comital" | "royal";
export type JourneyMeansBandV1 = "constrained" | "ordinary" | "ample";
export type JourneySeasonV1 = "winter" | "spring" | "summer" | "autumn";
export type JourneyArmedPostureV1 = "none" | "ordinary_escort" | "protected" | "military";
export type JourneyBaggageBandV1 = "light" | "ordinary" | "heavy" | "exceptional";
export type JourneyConditionPostureV1 = "normal" | "adverse" | "blocked_unviable";
export type JourneyCutpointPhaseV1 = "opening" | "midmonth" | "closing";

export interface JourneyCutpointV1 {
  relative_month: number;
  phase: JourneyCutpointPhaseV1;
}

export interface JourneyWindowV1 {
  earliest_departure: JourneyCutpointV1;
  latest_arrival: JourneyCutpointV1;
}

export interface JourneyNamedPartyInputV1 {
  person_id: string;
  party_role: JourneyPartyRoleV1;
  participation_basis_ref: string;
  required_or_discretionary: JourneyParticipationRequirementV1;
  origin_presence_ref: string;
  origin_residence_ref: string | null;
  absence_impact_refs: readonly string[];
  custody_or_authority_basis_ref: string | null;
  arrival_disposition: JourneyEndPostureV1;
  source_refs: readonly string[];
}

export interface JourneyAggregatePartyCompositionV1 {
  ordinary_attendant_count: number;
  guard_rank_and_file_count: number;
  driver_groom_handler_count: number;
  other_service_person_count: number;
  riding_animal_count: number;
  pack_animal_count: number;
  cart_wagon_count: number;
  baggage_support_band: JourneyBaggageBandV1;
  armed_posture: JourneyArmedPostureV1;
  aggregate_source_basis: string;
  source_refs: readonly string[];
}

export interface JourneyPartyCalibrationInputV1 {
  profile_key: JourneyProfileKeyV1;
  house_posture: JourneyHousePostureV1;
  means_band: JourneyMeansBandV1;
  season: JourneySeasonV1;
  armed_posture: JourneyArmedPostureV1;
  named_party_count: number;
  source_refs: readonly string[];
}

export interface JourneyRequestV1 {
  schema_version: typeof JOURNEY_REQUEST_SCHEMA_VERSION;
  journey_request_id: string;
  trigger_id: string;
  movement_class: "named_journey";
  owning_domain: string;
  primary_purpose_ref: string;
  initiating_actor_id: string;
  decision_owner_responsibility_instance_id: string | null;
  competent_proceeding_ref: string | null;
  principal_person_id: string;
  origin_location_id: string;
  destination_location_id: string;
  desired_window: JourneyWindowV1;
  return_window: JourneyWindowV1 | null;
  planned_destination_stay: {
    arrival_cutpoint: JourneyCutpointV1;
    departure_cutpoint: JourneyCutpointV1;
  } | null;
  route_posture: JourneyRoutePostureV1;
  return_or_end_posture: JourneyEndPostureV1;
  profile_key: JourneyProfileKeyV1;
  named_party: readonly JourneyNamedPartyInputV1[];
  aggregate_calibration: JourneyPartyCalibrationInputV1;
  authority_evidence_refs: readonly string[];
  sponsor_and_support_basis_ref: string;
  hosting_visit_arrangement_id: string | null;
  hosting_entity_id: string | null;
  host_acceptance_required: boolean;
  source_refs: readonly string[];
}

export interface JourneyResolvedStopV1 {
  stop_id: string;
  location_id: string;
  provider_kind:
    | "controlled_house_manor"
    | "accepted_house_or_court"
    | "accepted_church_or_institution"
    | "eligible_aggregate_commercial"
    | "constrained_self_supported";
  admission_ref: string;
  arrival_cutpoint: JourneyCutpointV1;
  departure_cutpoint: JourneyCutpointV1;
  host_entity_id: string | null;
  source_refs: readonly string[];
}

export interface JourneyResolvedRouteLegV1 {
  route_leg_id: string;
  sequence_no: number;
  from_location_id: string;
  to_location_id: string;
  selected_route_path_ref: string;
  crossing_access_right_refs: readonly string[];
  planned_stops: readonly JourneyResolvedStopV1[];
  condition_posture: JourneyConditionPostureV1;
  departure_cutpoint: JourneyCutpointV1;
  arrival_cutpoint: JourneyCutpointV1;
  distance_cost: number;
  expected_travel_days: number;
  source_status: "admitted" | "foundation_a_provisional";
  source_refs: readonly string[];
}

export type JourneyRouteResolutionV1 =
  | {
      status: "resolved";
      route_plan_id: string;
      legs: readonly JourneyResolvedRouteLegV1[];
      source_refs: readonly string[];
    }
  | {
      status: "withheld";
      reason_codes: readonly string[];
      source_refs: readonly string[];
    };

export interface JourneyRouteResolverV1 {
  resolveNamedJourneyRoute(request: Readonly<JourneyRequestV1>): JourneyRouteResolutionV1;
}

export interface JourneyLegNamedMemberV1 extends JourneyNamedPartyInputV1 {
  journey_leg_id: string;
}

export interface JourneyLegV1 extends JourneyResolvedRouteLegV1 {
  named_party: readonly JourneyLegNamedMemberV1[];
  aggregate_party: JourneyAggregatePartyCompositionV1;
}

export type JourneyContinuationKindV1 =
  | "root"
  | "split_child"
  | "merge_child"
  | "return_child"
  | "onward_child";

export interface JourneyArrangementV1 {
  schema_version: typeof JOURNEY_ARRANGEMENT_SCHEMA_VERSION;
  journey_arrangement_id: string;
  journey_request_id: string;
  trigger_id: string;
  owning_domain: string;
  primary_purpose_ref: string;
  decision_owner_responsibility_instance_id: string | null;
  competent_proceeding_ref: string | null;
  principal_person_id: string;
  profile_key: JourneyProfileKeyV1;
  route_posture: JourneyRoutePostureV1;
  return_or_end_posture: JourneyEndPostureV1;
  authority_evidence_refs: readonly string[];
  sponsor_and_support_basis_ref: string;
  hosting_visit_arrangement_id: string | null;
  hosting_entity_id: string | null;
  planned_destination_stay: {
    arrival_cutpoint: JourneyCutpointV1;
    departure_cutpoint: JourneyCutpointV1;
  } | null;
  /** The outbound leg whose destination owns planned_destination_stay. */
  destination_stay_leg_id: string | null;
  route_plan_id: string;
  legs: readonly JourneyLegV1[];
  continuation_kind: JourneyContinuationKindV1;
  parent_journey_arrangement_ids: readonly string[];
  source_refs: readonly string[];
  direct_domain_mutation: false;
  direct_resource_or_gl_mutation: false;
  direct_art_mutation: false;
}

export interface JourneyArrangementWithheldV1 {
  status: "withheld";
  journey_request_id: string;
  reason_codes: readonly string[];
  source_refs: readonly string[];
}

export interface JourneyArrangementAcceptedV1 {
  status: "accepted";
  arrangement: JourneyArrangementV1;
}

export type JourneyArrangementResultV1 =
  | JourneyArrangementAcceptedV1
  | JourneyArrangementWithheldV1;

export type JourneyResultCodeV1 =
  | "arrived"
  | "arrived_late"
  | "in_transit"
  | "resumed"
  | "stop_withheld"
  | "route_blocked"
  | "support_failed"
  | "returned"
  | "remained"
  | "continued_onward"
  | "cancelled"
  | "superseded"
  | "failed";

export type JourneyPresenceStatusV1 = "at_location" | "in_transit";

export interface JourneyPersonPresenceV1 {
  person_id: string;
  status: JourneyPresenceStatusV1;
  location_id: string | null;
  active_journey_arrangement_id: string | null;
  active_journey_leg_id: string | null;
  evidence_refs: readonly string[];
}

export interface JourneyPresenceReservationV1 {
  reservation_id: string;
  person_id: string;
  journey_arrangement_id: string;
  opening_cutpoint: JourneyCutpointV1;
  closing_cutpoint: JourneyCutpointV1;
  absence_impact_refs: readonly string[];
}

export interface JourneyPresenceEventV1 {
  event_id: string;
  person_id: string;
  journey_arrangement_id: string;
  journey_leg_id: string;
  event_kind: "departed" | "arrived" | "stop_arrived" | "stop_departed" | "recovered";
  cutpoint: JourneyCutpointV1;
  from_location_id: string | null;
  to_location_id: string | null;
  source_refs: readonly string[];
}

export interface JourneyStayFactV1 {
  stay_fact_id: string;
  journey_arrangement_id: string;
  journey_leg_id: string;
  location_id: string;
  provider_kind: JourneyResolvedStopV1["provider_kind"] | "journey_destination";
  host_entity_id: string | null;
  admission_ref: string;
  arrival_cutpoint: JourneyCutpointV1;
  departure_cutpoint: JourneyCutpointV1;
  named_person_count: number;
  aggregate_service_person_count: number;
  animal_count: number;
  cart_wagon_count: number;
  source_refs: readonly string[];
}

export interface JourneyDomainHandoffIntentV1 {
  handoff_id: string;
  journey_arrangement_id: string;
  journey_leg_id: string;
  person_id: string;
  owning_domain: string;
  disposition: JourneyEndPostureV1;
  arrived_location_id: string;
  authority_evidence_refs: readonly string[];
  source_refs: readonly string[];
  mutation_applied_by_journey: false;
}

export interface JourneyReceiptV1 {
  schema_version: typeof JOURNEY_RECEIPT_SCHEMA_VERSION;
  journey_receipt_id: string;
  journey_arrangement_id: string;
  journey_leg_id: string | null;
  result_code: JourneyResultCodeV1;
  cutpoint: JourneyCutpointV1;
  actual_location_id: string | null;
  named_person_ids: readonly string[];
  presence_event_refs: readonly string[];
  hosting_and_material_request_refs: readonly string[];
  domain_handoff_intent_refs: readonly string[];
  knowledge_evidence_refs: readonly string[];
  reason_codes: readonly string[];
  source_refs: readonly string[];
  direct_domain_mutation: false;
  direct_resource_or_gl_mutation: false;
  direct_art_mutation: false;
}

export interface JourneyPresenceLedgerV1 {
  schema_version: typeof JOURNEY_PRESENCE_LEDGER_SCHEMA_VERSION;
  current_cutpoint: JourneyCutpointV1;
  people_by_id: Readonly<Record<string, JourneyPersonPresenceV1>>;
  reservations: readonly JourneyPresenceReservationV1[];
  presence_events: readonly JourneyPresenceEventV1[];
  stay_facts: readonly JourneyStayFactV1[];
  domain_handoff_intents: readonly JourneyDomainHandoffIntentV1[];
  receipts: readonly JourneyReceiptV1[];
  processed_event_keys: readonly string[];
}

export interface JourneyLifecycleInterruptionV1 {
  journey_arrangement_id: string;
  journey_leg_id: string;
  result_code: "stop_withheld" | "route_blocked" | "support_failed";
  effective_cutpoint: JourneyCutpointV1;
  reason_codes: readonly string[];
  source_refs: readonly string[];
}

/**
 * An interruption which leaves an arrangement in needs_review cannot clear
 * itself merely because the clock advances. The competent owning-domain
 * authority must either resume the existing plan or end it explicitly. A
 * replacement plan is admitted separately after the old arrangement is
 * superseded, preserving Journey's no-purpose/no-authority boundary.
 */
export interface JourneyInterruptionResolutionV1 {
  journey_arrangement_id: string;
  journey_leg_id: string;
  resolution_kind: "resume" | "cancel" | "supersede" | "fail";
  effective_cutpoint: JourneyCutpointV1;
  /**
   * Required when a terminal resolution is issued while the party is between
   * known locations. The competent authority must identify the admitted route
   * endpoint or stop at which the party was recovered; Journey never invents
   * an en-route location.
   */
  terminal_presence_disposition?: {
    location_id: string;
    evidence_ref: string;
    source_refs: readonly string[];
  } | null;
  authority_evidence_refs: readonly string[];
  reason_codes: readonly string[];
  source_refs: readonly string[];
}
