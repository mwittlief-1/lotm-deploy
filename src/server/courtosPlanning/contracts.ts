export const COURTOS_PLANNING_SCHEMA_VERSION =
  "courtos_house_plan_v1" as const;
export const COURTOS_PLANNING_CONTRIBUTION_SCHEMA_VERSION =
  "courtos_authority_scoped_plan_contribution_v1" as const;
export const COURTOS_PLANNING_COMMAND_SCHEMA_VERSION =
  "courtos_planning_command_intent_v1" as const;
export const COURTOS_PLANNING_AUTHORITY_RECEIPT_SCHEMA_VERSION =
  "courtos_track2_authority_validation_receipt_v1" as const;
export const COURTOS_PLANNING_SCOPE_ADMISSION_SCHEMA_VERSION =
  "courtos_track2_scope_admission_receipt_v1" as const;
export const COURTOS_PLANNING_SAVE_RECEIPT_SCHEMA_VERSION =
  "courtos_plan_save_receipt_v1" as const;

export type CourtOsHousePlanStatusV1 = "draft" | "submitted";
export type CourtOsPlanContributionStatusV1 = "draft" | "locked";
export type CourtOsAuthorityValidationVerdictV1 =
  | "permitted"
  | "blocked"
  | "needs_evidence";

export interface CourtOsPlanningSourceSnapshotV1 {
  generation_id: string;
  effective_date: string;
  content_digest: string;
}

export interface CourtOsPlanningAuthoritySnapshotV1 {
  generation_id: string;
  effective_date: string;
  content_digest: string;
}

export interface CourtOsPlanningCommandIntentV1 {
  schema_version: typeof COURTOS_PLANNING_COMMAND_SCHEMA_VERSION;
  command_id: string;
  command_type: string;
  house_id: string;
  turn_id: string;
  authority_scope_id: string;
  responsibility_id: string;
  target_entity_ids: readonly string[];
  command_payload: Readonly<Record<string, unknown>>;
  evidence_refs: readonly string[];
  expected_source_generation_id: string;
  requested_effective_date: string;
  idempotency_key: string;
}

/**
 * Track 4 consumes this receipt. It does not calculate the verdict or infer a
 * grant from the actor, responsibility, or command payload.
 */
export interface CourtOsTrack2AuthorityValidationReceiptV1 {
  schema_version: typeof COURTOS_PLANNING_AUTHORITY_RECEIPT_SCHEMA_VERSION;
  validation_id: string;
  command_id: string;
  house_id: string;
  actor_person_id: string;
  authority_scope_id: string;
  authority_basis_ref: string;
  authority_contract_generation_id: string;
  authority_contract_effective_date: string;
  authority_contract_content_digest: string;
  source_generation_id: string;
  command_digest: string;
  verdict: CourtOsAuthorityValidationVerdictV1;
  reason_codes: readonly string[];
  evaluated_at: string;
}

export interface CourtOsTrack2ScopeAdmissionReceiptV1 {
  schema_version: typeof COURTOS_PLANNING_SCOPE_ADMISSION_SCHEMA_VERSION;
  validation_id: string;
  contribution_id: string;
  house_id: string;
  actor_person_id: string;
  authority_scope_id: string;
  authority_basis_ref: string;
  authority_contract_generation_id: string;
  authority_contract_effective_date: string;
  authority_contract_content_digest: string;
  source_generation_id: string;
  scope_claim_digest: string;
  verdict: CourtOsAuthorityValidationVerdictV1;
  reason_codes: readonly string[];
  evaluated_at: string;
}

export interface CourtOsAuthorityScopedPlanContributionV1 {
  schema_version: typeof COURTOS_PLANNING_CONTRIBUTION_SCHEMA_VERSION;
  contribution_id: string;
  authority_scope_id: string;
  actor_person_id: string;
  authority_basis_ref: string;
  scope_admission_receipt: CourtOsTrack2ScopeAdmissionReceiptV1;
  status: CourtOsPlanContributionStatusV1;
  commands: readonly CourtOsPlanningCommandIntentV1[];
  authority_receipts: readonly CourtOsTrack2AuthorityValidationReceiptV1[];
}

export interface CourtOsHousePlanV1 {
  schema_version: typeof COURTOS_PLANNING_SCHEMA_VERSION;
  plan_id: string;
  house_id: string;
  turn_id: string;
  version: number;
  status: CourtOsHousePlanStatusV1;
  source_snapshot: CourtOsPlanningSourceSnapshotV1;
  authority_snapshot: CourtOsPlanningAuthoritySnapshotV1;
  contributions: readonly CourtOsAuthorityScopedPlanContributionV1[];
  submission_authority_receipt: CourtOsTrack2AuthorityValidationReceiptV1 | null;
  submitted_by_person_id: string | null;
  submitted_at: string | null;
  supersedes_version: number | null;
  created_at: string;
  content_digest: string;
}

export interface CourtOsPlanOperationContextV1 {
  request_id: string;
  idempotency_key: string;
  house_id: string;
  turn_id: string;
  actor_person_id: string;
  expected_source_snapshot: CourtOsPlanningSourceSnapshotV1;
  expected_authority_snapshot: CourtOsPlanningAuthoritySnapshotV1;
  expected_plan_version: number | null;
  expected_plan_digest: string | null;
  requested_at: string;
}

export interface CourtOsSavePlanContributionRequestV1
  extends CourtOsPlanOperationContextV1 {
  operation: "save_contribution";
  contribution: CourtOsAuthorityScopedPlanContributionV1;
}

export interface CourtOsSubmitPlanRequestV1
  extends CourtOsPlanOperationContextV1 {
  operation: "submit_plan";
  submission_authority_receipt: CourtOsTrack2AuthorityValidationReceiptV1;
}

export type CourtOsPlanOperationRequestV1 =
  | CourtOsSavePlanContributionRequestV1
  | CourtOsSubmitPlanRequestV1;

export interface CourtOsPlanSaveReceiptV1 {
  schema_version: typeof COURTOS_PLANNING_SAVE_RECEIPT_SCHEMA_VERSION;
  receipt_id: string;
  operation: CourtOsPlanOperationRequestV1["operation"];
  request_id: string;
  idempotency_key: string;
  request_digest: string;
  plan_id: string;
  house_id: string;
  turn_id: string;
  actor_person_id: string;
  plan_version: number;
  plan_digest: string;
  source_generation_id: string;
  authority_generation_id: string;
  supersedes_version: number | null;
  recorded_at: string;
}

export interface CourtOsPlanOperationResultV1 {
  plan: CourtOsHousePlanV1;
  receipt: CourtOsPlanSaveReceiptV1;
  idempotent_replay: boolean;
}

export interface CourtOsStoredPlanVersionV1 {
  plan: CourtOsHousePlanV1;
  receipt: CourtOsPlanSaveReceiptV1;
}

export interface CourtOsPlanningStoreCommitV1 {
  operation: CourtOsPlanOperationRequestV1["operation"];
  idempotency_key: string;
  request_digest: string;
  expected_plan_version: number | null;
  expected_plan_digest: string | null;
  result: CourtOsPlanOperationResultV1;
}

export interface CourtOsPlanningStoreV1 {
  currentPlan(input: {
    houseId: string;
    turnId: string;
  }): CourtOsHousePlanV1 | null;
  planVersion(input: {
    houseId: string;
    turnId: string;
    version: number;
  }): CourtOsStoredPlanVersionV1 | null;
  planHistory(input: {
    houseId: string;
    turnId: string;
  }): readonly CourtOsStoredPlanVersionV1[];
  idempotentResult(input: {
    houseId: string;
    turnId: string;
    operation: CourtOsPlanOperationRequestV1["operation"];
    idempotencyKey: string;
    requestDigest: string;
  }): CourtOsPlanOperationResultV1 | null;
  commit(input: CourtOsPlanningStoreCommitV1): CourtOsPlanOperationResultV1;
  close(): void;
}
