/**
 * Phase Five Journey core orchestration seam.
 *
 * This module is the only bridge from a purpose-owning domain's
 * JourneyRequestDraftV1 into the Journey planner/presence lifecycle. It owns
 * neither the purpose, trigger authority, source promotion, economic support,
 * owning-domain effects, nor ART mutation. Every such fact arrives through an
 * explicit port and remains source-labelled in the lifecycle record.
 */

import {
  JOURNEY_REQUEST_DRAFT_SCHEMA_VERSION,
  JOURNEY_TRIGGER_REGISTRY,
  buildJourneyRequestDraft,
  type JourneyDraftSubmissionReceiptV1,
  type JourneyNamedParticipantCandidateV1,
  type JourneyRequestDraftConsumerV1,
  type JourneyRequestDraftV1,
} from "../../phaseFive/journeyDomainAdapter";
import {
  JOURNEY_REQUEST_SCHEMA_VERSION,
  type JourneyArrangementV1,
  type JourneyArmedPostureV1,
  type JourneyConditionPostureV1,
  type JourneyCutpointV1,
  type JourneyHousePostureV1,
  type JourneyInterruptionResolutionV1,
  type JourneyLifecycleInterruptionV1,
  type JourneyMeansBandV1,
  type JourneyNamedPartyInputV1,
  type JourneyPartyCalibrationInputV1,
  type JourneyPersonPresenceV1,
  type JourneyProfileKeyV1,
  type JourneyRequestV1,
  type JourneySeasonV1,
} from "./journeyContracts";
import {
  adaptJourneyFoundationToRouteResolver,
  type JourneyAnchorResolutionV1,
  type JourneyFoundationResolverV1,
  type JourneyResolvedFoundationRouteV1,
  type JourneyRouteStopPlanInputV1,
} from "./journeyFoundationResolver";
import {
  advanceJourneyRuntime,
  admitJourneyArrangement,
  resolveJourneyFutureOriginCommitment,
  resolveJourneyInterruption,
  validateJourneyArrangementAdmission,
  validateJourneyRuntime,
  type JourneyFutureOriginCommitmentV1,
  type JourneyRuntimeV1,
} from "./journeyLifecycle";
import {
  planJourneyArrangement,
  type JourneyRequestValidationContextV1,
} from "./journeyPartyPlanner";

export const JOURNEY_CORE_ORCHESTRATOR_SCHEMA_VERSION =
  "phase_five_journey_core_orchestrator_v1" as const;
export const JOURNEY_CORE_ORCHESTRATOR_STATE_SCHEMA_VERSION =
  "phase_five_journey_core_orchestrator_state_v1" as const;

export type JourneyEvidenceSourceStatusV1 =
  | "admitted_runtime_input"
  | "development_provisional";

export interface JourneyCoreSourcePolicyV1 {
  policy_id: string;
  allow_cpo_candidate_triggers: boolean;
  allow_foundation_a_provisional_routes: boolean;
  allow_development_party_evidence: boolean;
  allow_development_support_evidence: boolean;
  source_refs: readonly string[];
}

export type JourneyTriggerAdmissionResolutionV1 =
  | {
      status: "admitted_runtime_input" | "development_candidate";
      trigger_id: string;
      admission_ref: string;
      source_refs: readonly string[];
    }
  | {
      status: "withheld";
      trigger_id: string;
      reason_codes: readonly string[];
      source_refs: readonly string[];
    };

export interface JourneyTriggerAdmissionPortV1 {
  resolveTriggerAdmission(
    draft: Readonly<JourneyRequestDraftV1>,
  ): JourneyTriggerAdmissionResolutionV1;
}

export type JourneyPartyCalibrationEvidenceResolutionV1 =
  | {
      status: "resolved_admitted" | "resolved_provisional";
      sponsor_entity_id: string;
      house_posture: JourneyHousePostureV1;
      means_band: JourneyMeansBandV1;
      season: JourneySeasonV1;
      armed_posture: JourneyArmedPostureV1;
      source_refs: readonly string[];
    }
  | {
      status: "withheld";
      reason_codes: readonly string[];
      source_refs: readonly string[];
    };

export interface JourneyPartyCalibrationEvidencePortV1 {
  resolvePartyCalibrationEvidence(input: Readonly<{
    draft: JourneyRequestDraftV1;
    core_profile_key: JourneyProfileKeyV1;
  }>): JourneyPartyCalibrationEvidenceResolutionV1;
}

export type JourneyNamedPersonEvidenceResolutionV1 =
  | {
      status: "resolved_admitted" | "resolved_provisional";
      person_id: string;
      origin_presence_ref: string;
      origin_residence_ref: string | null;
      absence_impact_refs: readonly string[];
      source_refs: readonly string[];
    }
  | {
      status: "withheld";
      person_id: string;
      reason_codes: readonly string[];
      source_refs: readonly string[];
    };

/**
 * The resolver may enrich an already-named candidate, but cannot nominate or
 * substitute a person. The orchestrator cross-checks both identity and the
 * exact presence evidence already held by the Journey runtime.
 */
export interface JourneyNamedPersonEvidencePortV1 {
  resolveNamedPersonEvidence(input: Readonly<{
    draft: JourneyRequestDraftV1;
    candidate: JourneyNamedParticipantCandidateV1;
    runtime_presence: JourneyPersonPresenceV1;
  }>): JourneyNamedPersonEvidenceResolutionV1;
}

export type JourneyHostAcceptanceAuthorityResolutionV1 =
  | {
      status: "accepted";
      hosting_visit_arrangement_id: string;
      host_entity_id: string;
      destination_location_anchor_id: string;
      accepted_principal_person_id: string;
      accepted_named_person_ids: readonly string[];
      accepted_desired_window: JourneyRequestDraftV1["desired_window"];
      accepted_destination_stay: JourneyRequestDraftV1["planned_destination_stay"];
      capacity_state: "available";
      acceptance_authority_ref: string;
      source_refs: readonly string[];
    }
  | {
      status: "withheld";
      hosting_visit_arrangement_id: string;
      reason_codes: readonly string[];
      source_refs: readonly string[];
    };

/**
 * A purpose domain may nominate a Hosting/Visit Arrangement, but only this
 * injected competent-authority port can establish that the host accepted it.
 */
export interface JourneyHostAcceptanceAuthorityPortV1 {
  verifyHostAcceptance(input: Readonly<{
    draft: JourneyRequestDraftV1;
    hosting_visit_arrangement_id: string;
  }>): JourneyHostAcceptanceAuthorityResolutionV1;
}

export type JourneyPredepartureSupportResolutionV1 =
  | {
      status: "resolved_admitted" | "resolved_provisional";
      journey_arrangement_id: string;
      sponsor_and_support_basis_ref: string;
      covered_leg_ids: readonly string[];
      support_reservation_ref: string;
      source_refs: readonly string[];
    }
  | {
      status: "withheld";
      journey_arrangement_id: string;
      reason_codes: readonly string[];
      source_refs: readonly string[];
    };

/**
 * Journey calculates support demand but does not reserve Food, Goods, Coin,
 * HSU, animals, transport or lodging itself. Before presence can be reserved,
 * this competent injected authority must attest that the exact arrangement,
 * sponsor basis and complete set of legs have feasible reserved support.
 */
export interface JourneyPredepartureSupportAuthorityPortV1 {
  reservePredepartureSupport(input: Readonly<{
    draft: JourneyRequestDraftV1;
    request: JourneyRequestV1;
    arrangement: JourneyArrangementV1;
  }>): JourneyPredepartureSupportResolutionV1;
  /**
   * Must be idempotent for the tuple
   * (journey_arrangement_id, support_reservation_ref, closure_kind). A process
   * restart may safely replay finalization before the serialized Journey state
   * containing support_closure_ref is durably restored.
   */
  finalizePredepartureSupport(input: Readonly<{
    arrangement: JourneyArrangementV1;
    support_reservation_ref: string;
    closure_kind: "settled_completed" | "released_terminal";
    terminal_resolution: JourneyInterruptionResolutionV1 | null;
  }>):
    | {
        status: "finalized";
        journey_arrangement_id: string;
        support_reservation_ref: string;
        closure_kind: "settled_completed" | "released_terminal";
        support_closure_ref: string;
        source_refs: readonly string[];
      }
    | {
        status: "withheld";
        journey_arrangement_id: string;
        support_reservation_ref: string;
        closure_kind: "settled_completed" | "released_terminal";
        reason_codes: readonly string[];
        source_refs: readonly string[];
      };
}

export interface JourneyCoreOrchestratorPortsV1 {
  foundation_resolver: JourneyFoundationResolverV1;
  trigger_admission: JourneyTriggerAdmissionPortV1;
  party_calibration: JourneyPartyCalibrationEvidencePortV1;
  named_person_evidence: JourneyNamedPersonEvidencePortV1;
  host_acceptance_authority: JourneyHostAcceptanceAuthorityPortV1;
  predeparture_support_authority: JourneyPredepartureSupportAuthorityPortV1;
  source_policy: JourneyCoreSourcePolicyV1;
  condition_for_draft?: (
    draft: Readonly<JourneyRequestDraftV1>,
  ) => JourneyConditionPostureV1;
  waypoints_for_draft?: (
    draft: Readonly<JourneyRequestDraftV1>,
  ) => readonly string[];
  stops_for_resolved_route?: (input: Readonly<{
    draft: JourneyRequestDraftV1;
    request: JourneyRequestV1;
    resolved_route: JourneyResolvedFoundationRouteV1;
  }>) => readonly JourneyRouteStopPlanInputV1[];
}

export interface JourneyCoreLifecycleRecordV1 {
  schema_version: typeof JOURNEY_CORE_ORCHESTRATOR_SCHEMA_VERSION;
  journey_lifecycle_record_id: string;
  journey_request_draft_id: string;
  journey_request_id: string;
  journey_arrangement_id: string;
  request: JourneyRequestV1;
  arrangement: JourneyArrangementV1;
  lifecycle_status: "planned";
  trigger_source_status: "admitted_runtime_input" | "development_candidate";
  party_source_status: "admitted_runtime_input" | "development_provisional";
  route_source_status: "admitted_runtime_input" | "development_provisional";
  support_source_status: "admitted_runtime_input" | "development_provisional";
  support_reservation_ref: string;
  support_closure_ref: string | null;
  lifecycle_source_status: JourneyEvidenceSourceStatusV1;
  runtime_authority: boolean;
  source_refs: readonly string[];
  direct_domain_mutation: false;
  direct_resource_or_gl_mutation: false;
  direct_art_mutation: false;
}

export interface JourneyCoreSubmissionReceiptV1
  extends JourneyDraftSubmissionReceiptV1 {
  schema_version: typeof JOURNEY_CORE_ORCHESTRATOR_SCHEMA_VERSION;
  submission_receipt_id: string;
  trigger_source_status:
    | "admitted_runtime_input"
    | "development_candidate"
    | null;
  party_source_status: JourneyEvidenceSourceStatusV1 | null;
  route_source_status: JourneyEvidenceSourceStatusV1 | null;
  support_source_status: JourneyEvidenceSourceStatusV1 | null;
  direct_domain_mutation: false;
  direct_resource_or_gl_mutation: false;
  direct_art_mutation: false;
}

export interface JourneyCoreAcceptedDraftStateV1 {
  journey_request_draft_id: string;
  draft_fingerprint: string;
  accepted_receipt: JourneyCoreSubmissionReceiptV1;
}

/**
 * Serializable state required to resume Journey orchestration without losing
 * support closure, future-origin authority, or draft idempotency. This carries
 * no new source authority; every lifecycle record retains its original status.
 */
export interface JourneyCoreOrchestratorStateV1 {
  schema_version: typeof JOURNEY_CORE_ORCHESTRATOR_STATE_SCHEMA_VERSION;
  runtime: JourneyRuntimeV1;
  lifecycle_records: readonly JourneyCoreLifecycleRecordV1[];
  accepted_draft_registry: readonly JourneyCoreAcceptedDraftStateV1[];
  submission_receipts: readonly JourneyCoreSubmissionReceiptV1[];
  source_refs: readonly string[];
}

export interface JourneyCoreOrchestratorV1
  extends JourneyRequestDraftConsumerV1 {
  submitJourneyRequestDraft(
    draft: Readonly<JourneyRequestDraftV1>,
  ): JourneyCoreSubmissionReceiptV1;
  readRuntime(): Readonly<JourneyRuntimeV1>;
  advanceTo(
    cutpoint: JourneyCutpointV1,
    interruptions?: readonly JourneyLifecycleInterruptionV1[],
  ): Readonly<JourneyRuntimeV1>;
  resolveInterruption(
    resolution: JourneyInterruptionResolutionV1,
  ): Readonly<JourneyRuntimeV1>;
  readLifecycleRecords(): readonly JourneyCoreLifecycleRecordV1[];
  readSubmissionReceipts(): readonly JourneyCoreSubmissionReceiptV1[];
  exportState(sourceRefs: readonly string[]): JourneyCoreOrchestratorStateV1;
}

/**
 * Product-profile candidates describe purpose. Core profiles describe actual
 * movement burden. This is a deterministic taxonomy crosswalk, not retinue
 * size calibration; the numeric composition remains in the versioned party
 * planner config.
 */
export const JOURNEY_PROFILE_CANDIDATE_TO_CORE_PROFILE: Readonly<
  Record<string, JourneyProfileKeyV1>
> = Object.freeze({
  ceremonial_retinue: "ceremonial_progress",
  church_legal_party: "small_noble_retinue",
  court_retinue: "ceremonial_progress",
  education_transfer: "household_transfer",
  household_transfer: "household_transfer",
  household_transfer_or_small_retinue: "household_transfer",
  individual_or_light_party: "light_personal",
  individual_or_small_retinue: "small_noble_retinue",
  inspection_party: "small_noble_retinue",
  legal_appearance_party: "small_noble_retinue",
  military_service_party: "martial_party",
  office_transfer_party: "small_noble_retinue",
  pilgrimage_or_rite_party: "small_noble_retinue",
  progress_retinue: "ceremonial_progress",
  protected_care_transfer: "protected_transfer",
  protected_fiscal_visit: "protected_transfer",
  protected_response: "protected_transfer",
  protected_transfer: "protected_transfer",
  small_noble_retinue: "small_noble_retinue",
});

type ConvertedRequest = {
  request: JourneyRequestV1;
  trigger_status: "admitted_runtime_input" | "development_candidate";
  party_status: JourneyEvidenceSourceStatusV1;
  anchor_status: JourneyEvidenceSourceStatusV1;
  future_origin_commitments_by_person_id: Readonly<
    Record<string, JourneyFutureOriginCommitmentV1>
  >;
  source_refs: string[];
};

type ConversionResult =
  | { status: "converted"; value: ConvertedRequest }
  | {
      status: "withheld" | "rejected";
      journey_request_id: string | null;
      trigger_status:
        | "admitted_runtime_input"
        | "development_candidate"
        | null;
      party_status: JourneyEvidenceSourceStatusV1 | null;
      reason_codes: string[];
      source_refs: string[];
    };

function compareStable(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableUnique(
  values: readonly (string | null | undefined)[],
): string[] {
  return [...new Set(
    values
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  )].sort(compareStable);
}

function safeId(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9:_.-]+/gu, "_");
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => compareStable(left, right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

function stableSerialization(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function fingerprint(value: unknown): string {
  let hash = 0x811c9dc5;
  const serialized = stableSerialization(value);
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function safeDraftId(value: unknown): string {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : "journey:draft:invalid";
}

function requestIdFor(draft: Readonly<JourneyRequestDraftV1>): string {
  return `journey:request:${safeId(draft.source_domain_request_id)}`;
}

function lifecycleIdFor(requestId: string): string {
  return `journey:lifecycle:${safeId(requestId)}`;
}

function draftSourceRefs(draft: unknown): string[] {
  if (!draft || typeof draft !== "object") return [];
  const values = (draft as { source_refs?: unknown }).source_refs;
  return Array.isArray(values)
    ? stableUnique(values.filter((value): value is string => typeof value === "string"))
    : [];
}

function validateDraftEnvelope(draft: Readonly<JourneyRequestDraftV1>): string[] {
  const failures: string[] = [];
  if (draft.schema_version !== JOURNEY_REQUEST_DRAFT_SCHEMA_VERSION) {
    failures.push("unsupported_draft_schema");
  }
  const trigger = JOURNEY_TRIGGER_REGISTRY[draft.trigger_id];
  if (!trigger) failures.push("trigger_not_registered");
  else {
    if (trigger.movement_class !== "named_journey") failures.push("trigger_not_named_journey");
    if (draft.initiating_owner_key !== trigger.initiating_owner_key) {
      failures.push("trigger_initiating_owner_mismatch");
    }
    if (draft.decision_owner_key !== trigger.decision_owner_key) {
      failures.push("trigger_decision_owner_mismatch");
    }
    if (draft.trigger_family !== trigger.trigger_family) {
      failures.push("trigger_family_mismatch");
    }
    if (draft.aggregate_profile_candidate !== trigger.aggregate_profile_candidate) {
      failures.push("trigger_profile_candidate_mismatch");
    }
  }
  if (draft.lifecycle_submission_status !== "draft_not_submitted") {
    failures.push("draft_not_unsubmitted");
  }
  const boundaries = draft.boundaries;
  if (!boundaries ||
      boundaries.purpose_owned_by_initiating_domain !== true ||
      boundaries.route_selected !== false ||
      boundaries.arrangement_admitted !== false ||
      boundaries.support_reserved !== false ||
      boundaries.person_moved !== false ||
      boundaries.presence_mutated !== false ||
      boundaries.domain_state_mutated !== false ||
      boundaries.material_or_gl_mutated !== false) {
    failures.push("draft_boundary_contract_breached");
  }

  try {
    const rebuilt = buildJourneyRequestDraft({
      domain_request_id: draft.source_domain_request_id,
      trigger_id: draft.trigger_id,
      initiating_owner_key: draft.initiating_owner_key,
      primary_purpose_ref: draft.primary_purpose_ref,
      decision_owner_responsibility_instance_id:
        draft.decision_owner_responsibility_instance_id,
      competent_proceeding_ref: draft.competent_proceeding_ref,
      initiating_actor_id: draft.initiating_actor_id,
      principal_person_id: draft.principal_person_id,
      origin_location_anchor_id: draft.origin_location_anchor_id,
      destination_location_anchor_id: draft.destination_location_anchor_id,
      desired_window: draft.desired_window,
      return_window: draft.return_window,
      planned_destination_stay: draft.planned_destination_stay,
      route_posture: draft.route_posture,
      end_posture: draft.end_posture,
      named_participant_candidates: draft.named_participant_candidates,
      authority_evidence_refs: draft.authority_evidence_refs,
      support_basis: draft.support_basis,
      hosting_visit_arrangement_id: draft.hosting_visit_arrangement_id,
      host_acceptance_required: draft.host_acceptance_required,
      owning_domain_command_ref: draft.owning_domain_command_ref,
      source_refs: draft.source_refs,
    });
    if (JSON.stringify(stableValue(rebuilt)) !== JSON.stringify(stableValue(draft))) {
      failures.push("draft_envelope_not_canonical");
    }
  } catch {
    failures.push("malformed_draft_envelope");
  }
  return stableUnique(failures);
}

function acceptedAnchorStatus(
  resolution: JourneyAnchorResolutionV1,
): JourneyEvidenceSourceStatusV1 | null {
  if (resolution.status === "resolved_admitted") return "admitted_runtime_input";
  if (resolution.status === "resolved_provisional") return "development_provisional";
  return null;
}

function futureOriginCommitmentsForDraft(args: Readonly<{
  draft: JourneyRequestDraftV1;
  runtime: JourneyRuntimeV1;
  lifecycle_records: ReadonlyMap<string, JourneyCoreLifecycleRecordV1>;
}>): Readonly<Record<string, JourneyFutureOriginCommitmentV1>> {
  const authoritativeArrangementIds = new Set(
    [...args.lifecycle_records.values()]
      .filter((record) => record.runtime_authority)
      .map((record) => record.journey_arrangement_id),
  );
  const rows: Record<string, JourneyFutureOriginCommitmentV1> = {};
  for (const candidate of args.draft.named_participant_candidates) {
    const current = args.runtime.presence_ledger.people_by_id[candidate.person_id];
    if (current?.status === "at_location" &&
        current.location_id === args.draft.origin_location_anchor_id) {
      continue;
    }
    const commitment = resolveJourneyFutureOriginCommitment({
      runtime: args.runtime,
      person_id: candidate.person_id,
      requested_origin_location_id: args.draft.origin_location_anchor_id,
      departure_cutpoint: args.draft.desired_window.earliest_departure,
      runtime_authoritative_arrangement_ids: authoritativeArrangementIds,
    });
    if (commitment) rows[candidate.person_id] = commitment;
  }
  return rows;
}

function buildNamedParty(args: {
  draft: JourneyRequestDraftV1;
  runtime: JourneyRuntimeV1;
  person_port: JourneyNamedPersonEvidencePortV1;
  allow_development: boolean;
  future_origin_commitments_by_person_id: Readonly<
    Record<string, JourneyFutureOriginCommitmentV1>
  >;
}):
  | {
      status: "resolved";
      members: JourneyNamedPartyInputV1[];
      evidence_status: JourneyEvidenceSourceStatusV1;
      source_refs: string[];
    }
  | { status: "withheld" | "rejected"; reason_codes: string[]; source_refs: string[] } {
  const members: JourneyNamedPartyInputV1[] = [];
  const refs: string[] = [];
  let provisional = false;
  for (const candidate of args.draft.named_participant_candidates) {
    const presence = args.runtime.presence_ledger.people_by_id[candidate.person_id];
    if (!presence) {
      return {
        status: "withheld",
        reason_codes: [`named_person_not_in_presence_ledger:${candidate.person_id}`],
        source_refs: refs,
      };
    }
    const currentAtOrigin =
      presence.status === "at_location" &&
      presence.location_id === args.draft.origin_location_anchor_id;
    const futureOrigin =
      args.future_origin_commitments_by_person_id[candidate.person_id];
    if (futureOrigin) refs.push(...futureOrigin.source_refs);
    if (!currentAtOrigin && !futureOrigin) {
      return {
        status: "withheld",
        reason_codes: [`named_person_not_at_exact_origin:${candidate.person_id}`],
        source_refs: stableUnique([...refs, ...presence.evidence_refs]),
      };
    }
    const evidence = args.person_port.resolveNamedPersonEvidence({
      draft: args.draft,
      candidate,
      runtime_presence: presence,
    });
    refs.push(...evidence.source_refs, ...presence.evidence_refs);
    if (evidence.status === "withheld") {
      return {
        status: "withheld",
        reason_codes: stableUnique(evidence.reason_codes),
        source_refs: stableUnique(refs),
      };
    }
    if (evidence.person_id !== candidate.person_id) {
      return {
        status: "rejected",
        reason_codes: [`named_person_evidence_identity_mismatch:${candidate.person_id}`],
        source_refs: stableUnique(refs),
      };
    }
    if (!evidence.origin_presence_ref.trim() ||
        !presence.evidence_refs.includes(evidence.origin_presence_ref)) {
      return {
        status: "rejected",
        reason_codes: [`origin_presence_ref_not_in_runtime_evidence:${candidate.person_id}`],
        source_refs: stableUnique(refs),
      };
    }
    const originEvidenceRef = futureOrigin
      ? futureOrigin.origin_commitment_ref
      : evidence.origin_presence_ref;
    if (futureOrigin && (
      futureOrigin.person_id !== candidate.person_id ||
      futureOrigin.location_id !== args.draft.origin_location_anchor_id ||
      !futureOrigin.source_refs.includes(futureOrigin.origin_commitment_ref)
    )) {
      return {
        status: "rejected",
        reason_codes: [`future_origin_commitment_identity_mismatch:${candidate.person_id}`],
        source_refs: stableUnique([
          ...refs,
          ...futureOrigin.source_refs,
        ]),
      };
    }
    if (evidence.source_refs.length === 0) {
      return {
        status: "withheld",
        reason_codes: [`named_person_evidence_missing_source_refs:${candidate.person_id}`],
        source_refs: stableUnique(refs),
      };
    }
    if (evidence.status === "resolved_provisional") {
      if (!args.allow_development) {
        return {
          status: "withheld",
          reason_codes: [`named_person_evidence_not_admitted:${candidate.person_id}`],
          source_refs: stableUnique(refs),
        };
      }
      provisional = true;
    }
    members.push({
      person_id: candidate.person_id,
      party_role: candidate.party_role,
      participation_basis_ref: candidate.participation_basis_ref,
      required_or_discretionary: candidate.required_or_discretionary,
      origin_presence_ref: originEvidenceRef,
      origin_residence_ref: evidence.origin_residence_ref,
      absence_impact_refs: stableUnique(evidence.absence_impact_refs),
      custody_or_authority_basis_ref: candidate.authority_or_custody_ref,
      arrival_disposition: candidate.intended_arrival_disposition,
      source_refs: stableUnique([
        ...evidence.source_refs,
        ...(futureOrigin?.source_refs ?? []),
        originEvidenceRef,
        candidate.participation_basis_ref,
        candidate.authority_or_custody_ref,
      ]),
    });
  }
  return {
    status: "resolved",
    members,
    evidence_status: provisional
      ? "development_provisional"
      : "admitted_runtime_input",
    source_refs: stableUnique(refs),
  };
}

function convertDraft(args: {
  draft: Readonly<JourneyRequestDraftV1>;
  runtime: JourneyRuntimeV1;
  ports: JourneyCoreOrchestratorPortsV1;
  future_origin_commitments_by_person_id: Readonly<
    Record<string, JourneyFutureOriginCommitmentV1>
  >;
}): ConversionResult {
  const envelopeFailures = validateDraftEnvelope(args.draft);
  if (envelopeFailures.length > 0) {
    return {
      status: "rejected",
      journey_request_id: null,
      trigger_status: null,
      party_status: null,
      reason_codes: envelopeFailures,
      source_refs: draftSourceRefs(args.draft),
    };
  }
  const draft = args.draft as JourneyRequestDraftV1;
  const journeyRequestId = requestIdFor(draft);
  const triggerAdmission = args.ports.trigger_admission.resolveTriggerAdmission(draft);
  if (triggerAdmission.trigger_id !== draft.trigger_id) {
    return {
      status: "rejected",
      journey_request_id: journeyRequestId,
      trigger_status: null,
      party_status: null,
      reason_codes: ["trigger_admission_identity_mismatch"],
      source_refs: stableUnique([...draft.source_refs, ...triggerAdmission.source_refs]),
    };
  }
  if (triggerAdmission.status === "withheld") {
    return {
      status: "withheld",
      journey_request_id: journeyRequestId,
      trigger_status: null,
      party_status: null,
      reason_codes: stableUnique(triggerAdmission.reason_codes),
      source_refs: stableUnique([...draft.source_refs, ...triggerAdmission.source_refs]),
    };
  }
  if (!triggerAdmission.admission_ref.trim() || triggerAdmission.source_refs.length === 0) {
    return {
      status: "rejected",
      journey_request_id: journeyRequestId,
      trigger_status: triggerAdmission.status,
      party_status: null,
      reason_codes: ["trigger_admission_missing_provenance"],
      source_refs: stableUnique([...draft.source_refs, ...triggerAdmission.source_refs]),
    };
  }
  if (triggerAdmission.status === "development_candidate" &&
      !args.ports.source_policy.allow_cpo_candidate_triggers) {
    return {
      status: "withheld",
      journey_request_id: journeyRequestId,
      trigger_status: triggerAdmission.status,
      party_status: null,
      reason_codes: ["trigger_not_admitted_for_runtime"],
      source_refs: stableUnique([
        ...draft.source_refs,
        triggerAdmission.admission_ref,
        ...triggerAdmission.source_refs,
      ]),
    };
  }

  let hostAcceptanceAuthorityRef: string | null = null;
  let hostingEntityId: string | null = null;
  let hostAcceptanceSourceRefs: readonly string[] = [];
  if (draft.host_acceptance_required) {
    const hostingId = draft.hosting_visit_arrangement_id;
    if (!hostingId) {
      return {
        status: "rejected",
        journey_request_id: journeyRequestId,
        trigger_status: triggerAdmission.status,
        party_status: null,
        reason_codes: ["host_acceptance_arrangement_missing"],
        source_refs: stableUnique([...draft.source_refs, ...triggerAdmission.source_refs]),
      };
    }
    const hostAcceptance = args.ports.host_acceptance_authority.verifyHostAcceptance({
      draft,
      hosting_visit_arrangement_id: hostingId,
    });
    if (hostAcceptance.hosting_visit_arrangement_id !== hostingId) {
      return {
        status: "rejected",
        journey_request_id: journeyRequestId,
        trigger_status: triggerAdmission.status,
        party_status: null,
        reason_codes: ["host_acceptance_identity_mismatch"],
        source_refs: stableUnique([...draft.source_refs, ...hostAcceptance.source_refs]),
      };
    }
    if (hostAcceptance.status === "withheld") {
      return {
        status: "withheld",
        journey_request_id: journeyRequestId,
        trigger_status: triggerAdmission.status,
        party_status: null,
        reason_codes: stableUnique(hostAcceptance.reason_codes),
        source_refs: stableUnique([...draft.source_refs, ...hostAcceptance.source_refs]),
      };
    }
    if (!hostAcceptance.acceptance_authority_ref.trim() || hostAcceptance.source_refs.length === 0) {
      return {
        status: "rejected",
        journey_request_id: journeyRequestId,
        trigger_status: triggerAdmission.status,
        party_status: null,
        reason_codes: ["host_acceptance_missing_authority_or_provenance"],
        source_refs: stableUnique([...draft.source_refs, ...hostAcceptance.source_refs]),
      };
    }
    const acceptedNamedIds = [...hostAcceptance.accepted_named_person_ids]
      .sort(compareStable);
    const requestedNamedIds = draft.named_participant_candidates
      .map((candidate) => candidate.person_id)
      .sort(compareStable);
    if (!hostAcceptance.host_entity_id.trim() ||
        hostAcceptance.destination_location_anchor_id !==
          draft.destination_location_anchor_id ||
        hostAcceptance.accepted_principal_person_id !== draft.principal_person_id ||
        acceptedNamedIds.join("|") !== requestedNamedIds.join("|") ||
        JSON.stringify(stableValue(hostAcceptance.accepted_desired_window)) !==
          JSON.stringify(stableValue(draft.desired_window)) ||
        JSON.stringify(stableValue(hostAcceptance.accepted_destination_stay)) !==
          JSON.stringify(stableValue(draft.planned_destination_stay)) ||
        hostAcceptance.capacity_state !== "available") {
      return {
        status: "rejected",
        journey_request_id: journeyRequestId,
        trigger_status: triggerAdmission.status,
        party_status: null,
        reason_codes: ["host_acceptance_scope_or_capacity_mismatch"],
        source_refs: stableUnique([...draft.source_refs, ...hostAcceptance.source_refs]),
      };
    }
    hostAcceptanceAuthorityRef = hostAcceptance.acceptance_authority_ref;
    hostingEntityId = hostAcceptance.host_entity_id;
    hostAcceptanceSourceRefs = hostAcceptance.source_refs;
  }

  const origin = args.ports.foundation_resolver.resolveAnchor(
    draft.origin_location_anchor_id,
  );
  const destination = args.ports.foundation_resolver.resolveAnchor(
    draft.destination_location_anchor_id,
  );
  const anchorReasons = stableUnique([
    ...origin.reason_codes.map((code) => `origin_${code}`),
    ...destination.reason_codes.map((code) => `destination_${code}`),
  ]);
  if (origin.status === "withheld" || destination.status === "withheld" ||
      !origin.anchor || !destination.anchor) {
    return {
      status: "withheld",
      journey_request_id: journeyRequestId,
      trigger_status: triggerAdmission.status,
      party_status: null,
      reason_codes: anchorReasons.length
        ? anchorReasons
        : ["exact_location_anchor_resolution_withheld"],
      source_refs: stableUnique([
        ...draft.source_refs,
        ...origin.source_refs,
        ...destination.source_refs,
      ]),
    };
  }
  const originStatus = acceptedAnchorStatus(origin)!;
  const destinationStatus = acceptedAnchorStatus(destination)!;
  const anchorStatus: JourneyEvidenceSourceStatusV1 =
    originStatus === "development_provisional" ||
    destinationStatus === "development_provisional"
      ? "development_provisional"
      : "admitted_runtime_input";
  if (anchorStatus === "development_provisional" &&
      !args.ports.source_policy.allow_foundation_a_provisional_routes) {
    return {
      status: "withheld",
      journey_request_id: journeyRequestId,
      trigger_status: triggerAdmission.status,
      party_status: null,
      reason_codes: ["location_anchor_not_admitted_for_runtime"],
      source_refs: stableUnique([
        ...draft.source_refs,
        ...origin.source_refs,
        ...destination.source_refs,
      ]),
    };
  }

  const profileKey =
    JOURNEY_PROFILE_CANDIDATE_TO_CORE_PROFILE[draft.aggregate_profile_candidate];
  if (!profileKey) {
    return {
      status: "rejected",
      journey_request_id: journeyRequestId,
      trigger_status: triggerAdmission.status,
      party_status: null,
      reason_codes: ["aggregate_profile_candidate_has_no_core_mapping"],
      source_refs: stableUnique([...draft.source_refs, ...origin.source_refs, ...destination.source_refs]),
    };
  }
  const partyEvidence =
    args.ports.party_calibration.resolvePartyCalibrationEvidence({
      draft,
      core_profile_key: profileKey,
    });
  if (partyEvidence.status === "withheld") {
    return {
      status: "withheld",
      journey_request_id: journeyRequestId,
      trigger_status: triggerAdmission.status,
      party_status: null,
      reason_codes: stableUnique(partyEvidence.reason_codes),
      source_refs: stableUnique([...draft.source_refs, ...partyEvidence.source_refs]),
    };
  }
  if (partyEvidence.sponsor_entity_id !== draft.support_basis.sponsor_entity_id) {
    return {
      status: "rejected",
      journey_request_id: journeyRequestId,
      trigger_status: triggerAdmission.status,
      party_status: null,
      reason_codes: ["party_calibration_sponsor_identity_mismatch"],
      source_refs: stableUnique([...draft.source_refs, ...partyEvidence.source_refs]),
    };
  }
  if (partyEvidence.source_refs.length === 0) {
    return {
      status: "withheld",
      journey_request_id: journeyRequestId,
      trigger_status: triggerAdmission.status,
      party_status: null,
      reason_codes: ["party_calibration_missing_source_refs"],
      source_refs: stableUnique(draft.source_refs),
    };
  }
  const partyStatus: JourneyEvidenceSourceStatusV1 =
    partyEvidence.status === "resolved_admitted"
      ? "admitted_runtime_input"
      : "development_provisional";
  if (partyStatus === "development_provisional" &&
      !args.ports.source_policy.allow_development_party_evidence) {
    return {
      status: "withheld",
      journey_request_id: journeyRequestId,
      trigger_status: triggerAdmission.status,
      party_status: partyStatus,
      reason_codes: ["party_calibration_not_admitted_for_runtime"],
      source_refs: stableUnique([...draft.source_refs, ...partyEvidence.source_refs]),
    };
  }

  const namedParty = buildNamedParty({
    draft,
    runtime: args.runtime,
    person_port: args.ports.named_person_evidence,
    allow_development: args.ports.source_policy.allow_development_party_evidence,
    future_origin_commitments_by_person_id:
      args.future_origin_commitments_by_person_id,
  });
  if (namedParty.status !== "resolved") {
    return {
      status: namedParty.status,
      journey_request_id: journeyRequestId,
      trigger_status: triggerAdmission.status,
      party_status: partyStatus,
      reason_codes: namedParty.reason_codes,
      source_refs: stableUnique([...draft.source_refs, ...namedParty.source_refs]),
    };
  }
  const combinedPartyStatus: JourneyEvidenceSourceStatusV1 =
    partyStatus === "development_provisional" ||
    namedParty.evidence_status === "development_provisional"
      ? "development_provisional"
      : "admitted_runtime_input";

  const calibration: JourneyPartyCalibrationInputV1 = {
    profile_key: profileKey,
    house_posture: partyEvidence.house_posture,
    means_band: partyEvidence.means_band,
    season: partyEvidence.season,
    armed_posture: partyEvidence.armed_posture,
    named_party_count: namedParty.members.length,
    source_refs: stableUnique([
      ...partyEvidence.source_refs,
      ...namedParty.source_refs,
      args.ports.source_policy.policy_id,
      ...args.ports.source_policy.source_refs,
    ]),
  };
  const hostAcceptanceRequired = draft.host_acceptance_required;
  const sourceRefs = stableUnique([
    ...draft.source_refs,
    draft.owning_domain_command_ref,
    draft.support_basis.support_basis_ref,
    draft.hosting_visit_arrangement_id,
    hostingEntityId,
    hostAcceptanceAuthorityRef,
    ...hostAcceptanceSourceRefs,
    triggerAdmission.admission_ref,
    ...triggerAdmission.source_refs,
    ...origin.source_refs,
    ...destination.source_refs,
    ...calibration.source_refs,
  ]);
  const request: JourneyRequestV1 = {
    schema_version: JOURNEY_REQUEST_SCHEMA_VERSION,
    journey_request_id: journeyRequestId,
    trigger_id: draft.trigger_id,
    movement_class: "named_journey",
    owning_domain: draft.initiating_owner_key,
    primary_purpose_ref: draft.primary_purpose_ref,
    initiating_actor_id: draft.initiating_actor_id,
    decision_owner_responsibility_instance_id:
      draft.decision_owner_responsibility_instance_id,
    competent_proceeding_ref: draft.competent_proceeding_ref,
    principal_person_id: draft.principal_person_id,
    origin_location_id: origin.anchor.anchor_id,
    destination_location_id: destination.anchor.anchor_id,
    desired_window: draft.desired_window,
    return_window: draft.return_window,
    planned_destination_stay: draft.planned_destination_stay,
    route_posture: draft.route_posture,
    return_or_end_posture: draft.end_posture,
    profile_key: profileKey,
    named_party: namedParty.members,
    aggregate_calibration: calibration,
    authority_evidence_refs: stableUnique([
      ...draft.authority_evidence_refs,
      triggerAdmission.admission_ref,
      hostAcceptanceAuthorityRef,
    ]),
    sponsor_and_support_basis_ref: draft.support_basis.support_basis_ref,
    hosting_visit_arrangement_id: hostAcceptanceRequired
      ? draft.hosting_visit_arrangement_id
      : null,
    hosting_entity_id: hostAcceptanceRequired ? hostingEntityId : null,
    host_acceptance_required: hostAcceptanceRequired,
    source_refs: sourceRefs,
  };
  return {
    status: "converted",
    value: {
      request,
      trigger_status: triggerAdmission.status,
      party_status: combinedPartyStatus,
      anchor_status: anchorStatus,
      future_origin_commitments_by_person_id:
        args.future_origin_commitments_by_person_id,
      source_refs: sourceRefs,
    },
  };
}

function makeReceipt(args: {
  draft: Readonly<JourneyRequestDraftV1>;
  status: JourneyCoreSubmissionReceiptV1["submission_status"];
  journeyRequestId: string | null;
  journeyArrangementId?: string | null;
  journeyLifecycleRecordId?: string | null;
  triggerStatus?: JourneyCoreSubmissionReceiptV1["trigger_source_status"];
  partyStatus?: JourneyEvidenceSourceStatusV1 | null;
  routeStatus?: JourneyEvidenceSourceStatusV1 | null;
  supportStatus?: JourneyEvidenceSourceStatusV1 | null;
  runtimeAuthority?: boolean;
  reasonCodes?: readonly string[];
  sourceRefs?: readonly string[];
}): JourneyCoreSubmissionReceiptV1 {
  return {
    schema_version: JOURNEY_CORE_ORCHESTRATOR_SCHEMA_VERSION,
    submission_receipt_id: `journey:submission:${safeId(safeDraftId(args.draft.journey_request_draft_id))}:${args.status}`,
    journey_request_draft_id: safeDraftId(args.draft.journey_request_draft_id),
    submission_status: args.status,
    journey_request_id: args.journeyRequestId,
    journey_arrangement_id: args.journeyArrangementId ?? null,
    journey_lifecycle_record_id: args.journeyLifecycleRecordId ?? null,
    lifecycle_source_status:
      args.journeyLifecycleRecordId
        ? args.runtimeAuthority
          ? "admitted_runtime_input"
          : "development_provisional"
        : null,
    runtime_authority: args.runtimeAuthority ?? false,
    trigger_source_status: args.triggerStatus ?? null,
    party_source_status: args.partyStatus ?? null,
    route_source_status: args.routeStatus ?? null,
    support_source_status: args.supportStatus ?? null,
    reason_codes: stableUnique(args.reasonCodes ?? []),
    source_refs: stableUnique([
      ...draftSourceRefs(args.draft),
      ...(args.sourceRefs ?? []),
    ]),
    direct_domain_mutation: false,
    direct_resource_or_gl_mutation: false,
    direct_art_mutation: false,
  };
}

export function createJourneyCoreOrchestrator(args: {
  opening_runtime: JourneyRuntimeV1;
  ports: JourneyCoreOrchestratorPortsV1;
  rehydrated_state?: JourneyCoreOrchestratorStateV1;
}): JourneyCoreOrchestratorV1 {
  if (typeof args.ports.host_acceptance_authority?.verifyHostAcceptance !== "function") {
    throw new Error("journey_host_acceptance_authority_port_required");
  }
  if (typeof args.ports.predeparture_support_authority?.reservePredepartureSupport !== "function") {
    throw new Error("journey_predeparture_support_authority_port_required");
  }
  if (typeof args.ports.predeparture_support_authority?.finalizePredepartureSupport !== "function") {
    throw new Error("journey_predeparture_support_finalization_port_required");
  }
  if (!args.ports.source_policy.policy_id.trim() ||
      args.ports.source_policy.source_refs.length === 0) {
    throw new Error("journey_source_policy_requires_identity_and_provenance");
  }
  const restored = args.rehydrated_state;
  if (restored) {
    if (restored.schema_version !== JOURNEY_CORE_ORCHESTRATOR_STATE_SCHEMA_VERSION) {
      throw new Error("unsupported_journey_orchestrator_state_schema");
    }
    if (restored.source_refs.length === 0) {
      throw new Error("journey_orchestrator_state_provenance_required");
    }
    if (stableSerialization(restored.runtime) !==
        stableSerialization(args.opening_runtime)) {
      throw new Error("journey_orchestrator_state_runtime_mismatch");
    }
    const runtimeFailures = validateJourneyRuntime(restored.runtime);
    if (runtimeFailures.length > 0) {
      throw new Error(
        `journey_orchestrator_state_runtime_invalid:${runtimeFailures.join("|")}`,
      );
    }
  }
  if (!restored && Object.keys(args.opening_runtime.arrangements_by_id).length > 0) {
    throw new Error("journey_orchestrator_existing_runtime_requires_rehydrated_state");
  }
  let runtime = restored?.runtime ?? args.opening_runtime;
  const lifecycleRecords = new Map<string, JourneyCoreLifecycleRecordV1>();
  const lifecycleArrangementIds = new Set<string>();
  for (const record of restored?.lifecycle_records ?? []) {
    if (record.schema_version !== JOURNEY_CORE_ORCHESTRATOR_SCHEMA_VERSION) {
      throw new Error("unsupported_journey_lifecycle_record_schema");
    }
    if (lifecycleRecords.has(record.journey_lifecycle_record_id)) {
      throw new Error(
        `duplicate_rehydrated_journey_lifecycle:${record.journey_lifecycle_record_id}`,
      );
    }
    if (lifecycleArrangementIds.has(record.journey_arrangement_id)) {
      throw new Error(
        `duplicate_rehydrated_journey_arrangement:${record.journey_arrangement_id}`,
      );
    }
    const runtimeArrangement = runtime.arrangements_by_id[
      record.journey_arrangement_id
    ];
    const runtimeRow = runtime.runtime_by_arrangement_id[
      record.journey_arrangement_id
    ];
    if (!runtimeArrangement || !runtimeRow ||
        stableSerialization(runtimeArrangement) !==
          stableSerialization(record.arrangement) ||
        record.request.journey_request_id !== record.journey_request_id ||
        record.arrangement.journey_request_id !== record.journey_request_id ||
        record.journey_lifecycle_record_id !== lifecycleIdFor(
          record.journey_request_id,
        ) || !record.support_reservation_ref.trim() ||
        record.source_refs.length === 0) {
      throw new Error(
        `journey_orchestrator_state_lifecycle_mismatch:${record.journey_arrangement_id}`,
      );
    }
    const expectedRuntimeAuthority =
      record.trigger_source_status === "admitted_runtime_input" &&
      record.party_source_status === "admitted_runtime_input" &&
      record.route_source_status === "admitted_runtime_input" &&
      record.support_source_status === "admitted_runtime_input";
    if (record.runtime_authority !== expectedRuntimeAuthority ||
        record.lifecycle_source_status !== (expectedRuntimeAuthority
          ? "admitted_runtime_input"
          : "development_provisional")) {
      throw new Error(
        `journey_orchestrator_state_authority_mismatch:${record.journey_arrangement_id}`,
      );
    }
    const terminal = ["completed", "cancelled", "superseded", "failed"].includes(
      runtimeRow.status,
    );
    if ((terminal && !record.support_closure_ref) ||
        (!terminal && record.support_closure_ref)) {
      throw new Error(
        `journey_orchestrator_state_support_lifecycle_mismatch:${record.journey_arrangement_id}`,
      );
    }
    lifecycleRecords.set(record.journey_lifecycle_record_id, record);
    lifecycleArrangementIds.add(record.journey_arrangement_id);
  }
  if (restored) {
    const runtimeArrangementIds = Object.keys(runtime.arrangements_by_id).sort(
      compareStable,
    );
    if (runtimeArrangementIds.join("|") !==
        [...lifecycleArrangementIds].sort(compareStable).join("|")) {
      throw new Error("journey_orchestrator_state_missing_lifecycle_records");
    }
  }
  const acceptedByDraftId = new Map<string, {
    fingerprint: string;
    receipt: JourneyCoreSubmissionReceiptV1;
  }>();
  for (const row of restored?.accepted_draft_registry ?? []) {
    if (!row.journey_request_draft_id.trim() || !row.draft_fingerprint.trim() ||
        row.accepted_receipt.journey_request_draft_id !==
          row.journey_request_draft_id ||
        row.accepted_receipt.submission_status !== "accepted_for_resolution" ||
        !row.accepted_receipt.journey_lifecycle_record_id ||
        !lifecycleRecords.has(row.accepted_receipt.journey_lifecycle_record_id) ||
        acceptedByDraftId.has(row.journey_request_draft_id)) {
      throw new Error(
        `journey_orchestrator_state_draft_registry_invalid:${row.journey_request_draft_id}`,
      );
    }
    acceptedByDraftId.set(row.journey_request_draft_id, {
      fingerprint: row.draft_fingerprint,
      receipt: row.accepted_receipt,
    });
  }
  if (restored && acceptedByDraftId.size !== lifecycleRecords.size) {
    throw new Error("journey_orchestrator_state_draft_registry_incomplete");
  }
  const submissionReceipts: JourneyCoreSubmissionReceiptV1[] = [
    ...(restored?.submission_receipts ?? []),
  ];

  function recordReceipt(receipt: JourneyCoreSubmissionReceiptV1): JourneyCoreSubmissionReceiptV1 {
    submissionReceipts.push(receipt);
    return receipt;
  }

  function finalizeSupport(
    record: JourneyCoreLifecycleRecordV1,
    closureKind: "settled_completed" | "released_terminal",
    terminalResolution: JourneyInterruptionResolutionV1 | null,
  ): void {
    if (record.support_closure_ref) return;
    const resolution =
      args.ports.predeparture_support_authority.finalizePredepartureSupport({
        arrangement: record.arrangement,
        support_reservation_ref: record.support_reservation_ref,
        closure_kind: closureKind,
        terminal_resolution: terminalResolution,
      });
    if (resolution.status === "withheld") {
      throw new Error(
        `journey_predeparture_support_finalization_withheld:${stableUnique(
          resolution.reason_codes,
        ).join("|") || "reason_missing"}`,
      );
    }
    if (resolution.journey_arrangement_id !== record.journey_arrangement_id ||
        resolution.support_reservation_ref !== record.support_reservation_ref ||
        resolution.closure_kind !== closureKind ||
        !resolution.support_closure_ref.trim() ||
        resolution.source_refs.length === 0) {
      throw new Error("journey_predeparture_support_finalization_mismatch");
    }
    lifecycleRecords.set(record.journey_lifecycle_record_id, {
      ...record,
      support_closure_ref: resolution.support_closure_ref,
      source_refs: stableUnique([
        ...record.source_refs,
        resolution.support_closure_ref,
        ...resolution.source_refs,
      ]),
    });
  }

  return {
    submitJourneyRequestDraft(
      draft: Readonly<JourneyRequestDraftV1>,
    ): JourneyCoreSubmissionReceiptV1 {
      const envelopeFailures = validateDraftEnvelope(draft);
      if (envelopeFailures.length > 0) {
        return recordReceipt(makeReceipt({
          draft,
          status: "rejected",
          journeyRequestId: null,
          reasonCodes: envelopeFailures,
        }));
      }
      const draftId = draft.journey_request_draft_id;
      const draftFingerprint = fingerprint(draft);
      const prior = acceptedByDraftId.get(draftId);
      if (prior) {
        if (prior.fingerprint !== draftFingerprint) {
          return recordReceipt(makeReceipt({
            draft,
            status: "rejected",
            journeyRequestId: null,
            reasonCodes: ["draft_id_reused_with_different_payload"],
          }));
        }
        return recordReceipt({
          ...prior.receipt,
          submission_receipt_id: `journey:submission:${safeId(draftId)}:idempotent`,
          submission_status: "idempotent",
          reason_codes: ["exact_draft_already_admitted"],
        });
      }

      const futureOriginCommitments = futureOriginCommitmentsForDraft({
        draft: draft as JourneyRequestDraftV1,
        runtime,
        lifecycle_records: lifecycleRecords,
      });
      const converted = convertDraft({
        draft,
        runtime,
        ports: args.ports,
        future_origin_commitments_by_person_id: futureOriginCommitments,
      });
      if (converted.status !== "converted") {
        return recordReceipt(makeReceipt({
          draft,
          status: converted.status,
          journeyRequestId: converted.journey_request_id,
          triggerStatus: converted.trigger_status,
          partyStatus: converted.party_status,
          reasonCodes: converted.reason_codes,
          sourceRefs: converted.source_refs,
        }));
      }

      const request = converted.value.request;
      const registeredTriggerIds = new Set(Object.keys(JOURNEY_TRIGGER_REGISTRY));
      const validationContext: JourneyRequestValidationContextV1 = {
        registered_trigger_ids: registeredTriggerIds,
        known_person_ids: new Set(Object.keys(runtime.presence_ledger.people_by_id)),
        actual_presence_by_person_id: Object.fromEntries(
          Object.entries(runtime.presence_ledger.people_by_id).map(([personId, row]) => [
            personId,
            { location_id: row.location_id },
          ]),
        ),
        future_origin_commitment_by_person_id: Object.fromEntries(
          Object.entries(
            converted.value.future_origin_commitments_by_person_id,
          ).map(([personId, commitment]) => [personId, {
            location_id: commitment.location_id,
            available_cutpoint: commitment.available_cutpoint,
            evidence_ref: commitment.origin_commitment_ref,
          }]),
        ),
        require_current_origin_presence: true,
      };
      const condition = args.ports.condition_for_draft?.(draft) ?? "normal";
      const waypoints = args.ports.waypoints_for_draft?.(draft) ?? [];
      const routeResolver = adaptJourneyFoundationToRouteResolver(
        args.ports.foundation_resolver,
        {
          conditionForRequest: () => condition,
          waypointsForRequest: () => waypoints,
          stopsForResolvedRoute: (resolvedRequest, resolvedRoute) =>
            args.ports.stops_for_resolved_route?.({
              draft: draft as JourneyRequestDraftV1,
              request: resolvedRequest,
              resolved_route: resolvedRoute,
            }) ?? [],
        },
      );
      const planned = planJourneyArrangement({
        request,
        validation_context: validationContext,
        route_resolver: routeResolver,
      });
      if (planned.status === "withheld") {
        return recordReceipt(makeReceipt({
          draft,
          status: "withheld",
          journeyRequestId: request.journey_request_id,
          triggerStatus: converted.value.trigger_status,
          partyStatus: converted.value.party_status,
          reasonCodes: planned.reason_codes,
          sourceRefs: [...converted.value.source_refs, ...planned.source_refs],
        }));
      }

      const routeStatus: JourneyEvidenceSourceStatusV1 =
        planned.arrangement.legs.some(
          (leg) => leg.source_status === "foundation_a_provisional",
        )
          ? "development_provisional"
          : "admitted_runtime_input";
      if (routeStatus === "development_provisional" &&
          !args.ports.source_policy.allow_foundation_a_provisional_routes) {
        return recordReceipt(makeReceipt({
          draft,
          status: "withheld",
          journeyRequestId: request.journey_request_id,
          triggerStatus: converted.value.trigger_status,
          partyStatus: converted.value.party_status,
          routeStatus,
          reasonCodes: ["route_not_admitted_for_runtime"],
          sourceRefs: [...converted.value.source_refs, ...planned.arrangement.source_refs],
        }));
      }

      // Validate presence feasibility before asking another domain to reserve
      // material support. This is a pure check: no lifecycle or presence state
      // is admitted until the support authority accepts the exact arrangement.
      const admissionFailures = validateJourneyArrangementAdmission(
        runtime,
        planned.arrangement,
      );
      if (admissionFailures.length > 0) {
        return recordReceipt(makeReceipt({
          draft,
          status: "withheld",
          journeyRequestId: request.journey_request_id,
          triggerStatus: converted.value.trigger_status,
          partyStatus: converted.value.party_status,
          routeStatus,
          reasonCodes: admissionFailures,
          sourceRefs: [
            ...converted.value.source_refs,
            ...planned.arrangement.source_refs,
          ],
        }));
      }

      const supportResolution =
        args.ports.predeparture_support_authority.reservePredepartureSupport({
          draft,
          request,
          arrangement: planned.arrangement,
        });
      if (supportResolution.status === "withheld") {
        return recordReceipt(makeReceipt({
          draft,
          status: "withheld",
          journeyRequestId: request.journey_request_id,
          triggerStatus: converted.value.trigger_status,
          partyStatus: converted.value.party_status,
          routeStatus,
          reasonCodes: [
            ...(supportResolution.reason_codes.length > 0
              ? supportResolution.reason_codes
              : ["predeparture_support_withheld_without_reason"]),
            ...(supportResolution.source_refs.length > 0
              ? []
              : ["predeparture_support_withheld_without_provenance"]),
          ],
          sourceRefs: [
            ...converted.value.source_refs,
            ...planned.arrangement.source_refs,
            ...supportResolution.source_refs,
          ],
        }));
      }

      const supportStatus: JourneyEvidenceSourceStatusV1 =
        supportResolution.status === "resolved_admitted"
          ? "admitted_runtime_input"
          : "development_provisional";
      if (supportStatus === "development_provisional" &&
          !args.ports.source_policy.allow_development_support_evidence) {
        return recordReceipt(makeReceipt({
          draft,
          status: "withheld",
          journeyRequestId: request.journey_request_id,
          triggerStatus: converted.value.trigger_status,
          partyStatus: converted.value.party_status,
          routeStatus,
          supportStatus,
          reasonCodes: ["predeparture_support_not_admitted_for_runtime"],
          sourceRefs: [
            ...converted.value.source_refs,
            ...planned.arrangement.source_refs,
            ...supportResolution.source_refs,
          ],
        }));
      }
      const expectedLegIds = planned.arrangement.legs
        .map((leg) => leg.route_leg_id)
        .sort(compareStable);
      const suppliedLegIds = [...supportResolution.covered_leg_ids]
        .sort(compareStable);
      const supportFailures: string[] = [];
      if (
        supportResolution.journey_arrangement_id !==
        planned.arrangement.journey_arrangement_id
      ) {
        supportFailures.push("predeparture_support_arrangement_mismatch");
      }
      if (
        supportResolution.sponsor_and_support_basis_ref !==
        planned.arrangement.sponsor_and_support_basis_ref
      ) {
        supportFailures.push("predeparture_support_sponsor_basis_mismatch");
      }
      if (
        suppliedLegIds.length !== new Set(suppliedLegIds).size ||
        suppliedLegIds.join("|") !== expectedLegIds.join("|")
      ) {
        supportFailures.push("predeparture_support_leg_coverage_mismatch");
      }
      if (!supportResolution.support_reservation_ref.trim()) {
        supportFailures.push("predeparture_support_reservation_ref_missing");
      }
      if (supportResolution.source_refs.length === 0) {
        supportFailures.push("predeparture_support_provenance_missing");
      }
      if (supportFailures.length > 0) {
        return recordReceipt(makeReceipt({
          draft,
          status: "withheld",
          journeyRequestId: request.journey_request_id,
          triggerStatus: converted.value.trigger_status,
          partyStatus: converted.value.party_status,
          routeStatus,
          supportStatus,
          reasonCodes: supportFailures,
          sourceRefs: [
            ...converted.value.source_refs,
            ...planned.arrangement.source_refs,
            ...supportResolution.source_refs,
          ],
        }));
      }

      // Preserve the support authority trail on the admitted arrangement so
      // every later movement/stay/result receipt inherits the exact reservation
      // evidence without giving Journey authority to mutate the support domain.
      const supportedArrangement: JourneyArrangementV1 = {
        ...planned.arrangement,
        source_refs: stableUnique([
          ...planned.arrangement.source_refs,
          supportResolution.support_reservation_ref,
          ...supportResolution.source_refs,
        ]),
      };

      const admission = admitJourneyArrangement(runtime, supportedArrangement);
      if (admission.status === "withheld") {
        return recordReceipt(makeReceipt({
          draft,
          status: "withheld",
          journeyRequestId: request.journey_request_id,
          triggerStatus: converted.value.trigger_status,
          partyStatus: converted.value.party_status,
          routeStatus,
          supportStatus,
          reasonCodes: admission.reason_codes,
          sourceRefs: [
            ...converted.value.source_refs,
            ...supportedArrangement.source_refs,
            supportResolution.support_reservation_ref,
            ...supportResolution.source_refs,
          ],
        }));
      }

      runtime = admission.runtime;
      const arrangementId = planned.arrangement.journey_arrangement_id;
      const lifecycleId = lifecycleIdFor(request.journey_request_id);
      const runtimeAuthority =
        converted.value.trigger_status === "admitted_runtime_input" &&
        converted.value.party_status === "admitted_runtime_input" &&
        converted.value.anchor_status === "admitted_runtime_input" &&
        routeStatus === "admitted_runtime_input" &&
        supportStatus === "admitted_runtime_input";
      const lifecycleStatus: JourneyEvidenceSourceStatusV1 = runtimeAuthority
        ? "admitted_runtime_input"
        : "development_provisional";
      const record: JourneyCoreLifecycleRecordV1 = {
        schema_version: JOURNEY_CORE_ORCHESTRATOR_SCHEMA_VERSION,
        journey_lifecycle_record_id: lifecycleId,
        journey_request_draft_id: draftId,
        journey_request_id: request.journey_request_id,
        journey_arrangement_id: arrangementId,
        request,
        arrangement: supportedArrangement,
        lifecycle_status: "planned",
        trigger_source_status: converted.value.trigger_status,
        party_source_status: converted.value.party_status,
        route_source_status: routeStatus,
        support_source_status: supportStatus,
        support_reservation_ref: supportResolution.support_reservation_ref,
        support_closure_ref: null,
        lifecycle_source_status: lifecycleStatus,
        runtime_authority: runtimeAuthority,
        source_refs: stableUnique([
          ...converted.value.source_refs,
          ...supportedArrangement.source_refs,
          supportResolution.support_reservation_ref,
          ...supportResolution.source_refs,
          args.ports.source_policy.policy_id,
          ...args.ports.source_policy.source_refs,
        ]),
        direct_domain_mutation: false,
        direct_resource_or_gl_mutation: false,
        direct_art_mutation: false,
      };
      lifecycleRecords.set(lifecycleId, record);
      const receipt = makeReceipt({
        draft,
        status: "accepted_for_resolution",
        journeyRequestId: request.journey_request_id,
        journeyArrangementId: arrangementId,
        journeyLifecycleRecordId: lifecycleId,
        triggerStatus: converted.value.trigger_status,
        partyStatus: converted.value.party_status,
        routeStatus,
        supportStatus,
        runtimeAuthority,
        sourceRefs: record.source_refs,
      });
      acceptedByDraftId.set(draftId, { fingerprint: draftFingerprint, receipt });
      return recordReceipt(receipt);
    },

    readRuntime(): Readonly<JourneyRuntimeV1> {
      return runtime;
    },

    advanceTo(
      cutpoint: JourneyCutpointV1,
      interruptions: readonly JourneyLifecycleInterruptionV1[] = [],
    ): Readonly<JourneyRuntimeV1> {
      const prospective = advanceJourneyRuntime(runtime, cutpoint, interruptions);
      for (const record of lifecycleRecords.values()) {
        const beforeStatus = runtime.runtime_by_arrangement_id[
          record.journey_arrangement_id
        ]?.status;
        const afterStatus = prospective.runtime_by_arrangement_id[
          record.journey_arrangement_id
        ]?.status;
        if (beforeStatus !== "completed" && afterStatus === "completed") {
          finalizeSupport(record, "settled_completed", null);
        }
      }
      runtime = prospective;
      return runtime;
    },

    resolveInterruption(
      resolution: JourneyInterruptionResolutionV1,
    ): Readonly<JourneyRuntimeV1> {
      const prospective = resolveJourneyInterruption(runtime, resolution);
      if (resolution.resolution_kind !== "resume") {
        const record = [...lifecycleRecords.values()].find(
          (candidate) =>
            candidate.journey_arrangement_id === resolution.journey_arrangement_id,
        );
        if (!record) throw new Error("journey_support_lifecycle_record_missing");
        finalizeSupport(record, "released_terminal", resolution);
      }
      runtime = prospective;
      return runtime;
    },

    readLifecycleRecords(): readonly JourneyCoreLifecycleRecordV1[] {
      return [...lifecycleRecords.values()].sort((left, right) =>
        compareStable(
          left.journey_lifecycle_record_id,
          right.journey_lifecycle_record_id,
        )
      );
    },

    readSubmissionReceipts(): readonly JourneyCoreSubmissionReceiptV1[] {
      return [...submissionReceipts];
    },

    exportState(sourceRefs: readonly string[]): JourneyCoreOrchestratorStateV1 {
      if (sourceRefs.length === 0 || sourceRefs.some((ref) => !ref.trim())) {
        throw new Error("journey_orchestrator_state_provenance_required");
      }
      return {
        schema_version: JOURNEY_CORE_ORCHESTRATOR_STATE_SCHEMA_VERSION,
        runtime,
        lifecycle_records: [...lifecycleRecords.values()].sort((left, right) =>
          compareStable(
            left.journey_lifecycle_record_id,
            right.journey_lifecycle_record_id,
          )
        ),
        accepted_draft_registry: [...acceptedByDraftId.entries()]
          .sort(([left], [right]) => compareStable(left, right))
          .map(([draftId, row]) => ({
            journey_request_draft_id: draftId,
            draft_fingerprint: row.fingerprint,
            accepted_receipt: row.receipt,
          })),
        submission_receipts: [...submissionReceipts],
        source_refs: stableUnique(sourceRefs),
      };
    },
  };
}
