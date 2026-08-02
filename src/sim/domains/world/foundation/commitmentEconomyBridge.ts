/**
 * Phase Five's narrow commitment-to-economy boundary.
 *
 * This module deliberately owns no account, custody, amount, counterparty,
 * ledger, due, or settlement state.  It only validates that a domain has
 * supplied an already-admitted, exact material leg and hands that leg to an
 * injected economy gateway.  The current Foundation economy surfaces remain
 * candidate/proof-only, so callers without an admitted gateway receive a
 * withheld evidence result rather than a speculative adapter or posting.
 */

export const COMMITMENT_ECONOMY_BRIDGE_SCHEMA_VERSION =
  "phase_five_commitment_economy_bridge_v1" as const;
export const COMMITMENT_ECONOMY_BRIDGE_ID = "P5_COMMITMENT_ECONOMY_BRIDGE_001" as const;

export type CommitmentAdmissionStatusV1 = "accepted" | "withheld" | "rejected" | "unresolved";
export type CommitmentEconomicClassificationV1 =
  | "legal_material_obligation"
  | "recurring_support_consumption"
  | "planned_commitment"
  | "disputed_claim";
export type CommitmentEconomyGatewayStatusV1 = "accepted" | "rejected" | "withheld" | "settled";
export type CommitmentEconomyResourceKindV1 =
  | "coin"
  | "food"
  | "building_materials"
  | "minerals"
  | "craft_goods";

export interface CommitmentEconomyPartyRefV1 {
  economic_entity_id: string;
  account_id: string;
  custody_ref: string;
}

export interface CommitmentEconomyMaterialTermV1 {
  resource_kind: CommitmentEconomyResourceKindV1;
  quantity: number;
  unit: string;
  due_at: string;
  settlement_mode: string;
}

export interface CommitmentEconomyExactRequestV1 {
  request_id: string;
  idempotency_key: string;
  commitment_id: string;
  economic_leg_id: string;
  economic_classification: CommitmentEconomicClassificationV1;
  material_term: CommitmentEconomyMaterialTermV1;
  payer: CommitmentEconomyPartyRefV1;
  payee: CommitmentEconomyPartyRefV1;
  authority_ref: string;
  source_refs: readonly string[];
}

export interface CommitmentEconomySubmissionV1 {
  schema_version: typeof COMMITMENT_ECONOMY_BRIDGE_SCHEMA_VERSION;
  bridge_id: typeof COMMITMENT_ECONOMY_BRIDGE_ID;
  submission_id: string;
  commitment_id: string;
  commitment_admission_status: CommitmentAdmissionStatusV1;
  commitment_authority_ref: string;
  commitment_source_refs: readonly string[];
  economic_request: CommitmentEconomyExactRequestV1;
}

export interface CommitmentEconomyGatewayEvidenceV1 {
  request_id: string;
  idempotency_key: string;
  economic_leg_id: string;
  status: CommitmentEconomyGatewayStatusV1;
  evidence_id: string;
  reason_codes: readonly string[];
  source_refs: readonly string[];
}

export interface CommitmentEconomyGatewayV1 {
  submitExactCounterpartiedRequest(
    request: Readonly<CommitmentEconomyExactRequestV1>
  ): CommitmentEconomyGatewayEvidenceV1;
}

export interface CommitmentEconomyBridgeEvidenceV1 {
  evidence_id: string;
  status: CommitmentEconomyGatewayStatusV1;
  submission_id: string;
  commitment_id: string;
  request_id: string;
  economic_leg_id: string;
  reason_codes: string[];
  source_refs: string[];
  gateway_evidence_id: string | null;
  material_mutation_by_bridge: false;
  direct_gl_posting_by_bridge: false;
}

export interface CommitmentEconomyBridgeResultV1 {
  schema_version: typeof COMMITMENT_ECONOMY_BRIDGE_SCHEMA_VERSION;
  bridge_id: typeof COMMITMENT_ECONOMY_BRIDGE_ID;
  status: CommitmentEconomyGatewayStatusV1;
  request_forwarded_to_gateway: boolean;
  evidence: CommitmentEconomyBridgeEvidenceV1;
}

function compareStable(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function clean(value: string): string {
  return value.trim();
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values.map(clean).filter(Boolean))].sort(compareStable);
}

function bridgeEvidenceId(submissionId: string): string {
  return `commitment_economy_bridge_evidence:${submissionId.replace(/[^A-Za-z0-9:_.-]+/gu, "_")}`;
}

function requiredTextFailures(value: string, field: string): string[] {
  return clean(value).length > 0 ? [] : [`missing_${field}`];
}

function exactRequestFailures(
  submission: CommitmentEconomySubmissionV1
): string[] {
  const request = submission.economic_request;
  const failures = [
    ...requiredTextFailures(submission.submission_id, "submission_id"),
    ...requiredTextFailures(submission.commitment_id, "commitment_id"),
    ...requiredTextFailures(submission.commitment_authority_ref, "commitment_authority_ref"),
    ...requiredTextFailures(request.request_id, "request_id"),
    ...requiredTextFailures(request.idempotency_key, "idempotency_key"),
    ...requiredTextFailures(request.economic_leg_id, "economic_leg_id"),
    ...requiredTextFailures(request.authority_ref, "economic_request_authority_ref"),
    ...requiredTextFailures(request.material_term.unit, "material_term_unit"),
    ...requiredTextFailures(request.material_term.due_at, "material_term_due_at"),
    ...requiredTextFailures(request.material_term.settlement_mode, "material_term_settlement_mode"),
    ...requiredTextFailures(request.payer.economic_entity_id, "payer_economic_entity_id"),
    ...requiredTextFailures(request.payer.account_id, "payer_account_id"),
    ...requiredTextFailures(request.payer.custody_ref, "payer_custody_ref"),
    ...requiredTextFailures(request.payee.economic_entity_id, "payee_economic_entity_id"),
    ...requiredTextFailures(request.payee.account_id, "payee_account_id"),
    ...requiredTextFailures(request.payee.custody_ref, "payee_custody_ref")
  ];

  if (request.commitment_id !== submission.commitment_id) {
    failures.push("request_commitment_id_does_not_match_submission");
  }
  if (!Number.isFinite(request.material_term.quantity) || request.material_term.quantity <= 0) {
    failures.push("material_term_quantity_must_be_positive");
  }
  if (submission.commitment_source_refs.length === 0) failures.push("missing_commitment_source_refs");
  if (request.source_refs.length === 0) failures.push("missing_economic_request_source_refs");

  return sortedUnique(failures);
}

function bridgeEvidence(args: {
  submission: CommitmentEconomySubmissionV1;
  status: CommitmentEconomyGatewayStatusV1;
  reasonCodes: readonly string[];
  sourceRefs: readonly string[];
  gatewayEvidenceId?: string | null;
}): CommitmentEconomyBridgeEvidenceV1 {
  return {
    evidence_id: bridgeEvidenceId(args.submission.submission_id),
    status: args.status,
    submission_id: args.submission.submission_id,
    commitment_id: args.submission.commitment_id,
    request_id: args.submission.economic_request.request_id,
    economic_leg_id: args.submission.economic_request.economic_leg_id,
    reason_codes: sortedUnique(args.reasonCodes),
    source_refs: sortedUnique([
      ...args.submission.commitment_source_refs,
      ...args.submission.economic_request.source_refs,
      ...args.sourceRefs,
      `CommitmentEconomyBridge:${COMMITMENT_ECONOMY_BRIDGE_ID}`
    ]),
    gateway_evidence_id: args.gatewayEvidenceId ?? null,
    material_mutation_by_bridge: false,
    direct_gl_posting_by_bridge: false
  };
}

function result(args: {
  submission: CommitmentEconomySubmissionV1;
  status: CommitmentEconomyGatewayStatusV1;
  requestForwardedToGateway: boolean;
  reasonCodes: readonly string[];
  sourceRefs?: readonly string[];
  gatewayEvidenceId?: string | null;
}): CommitmentEconomyBridgeResultV1 {
  return {
    schema_version: COMMITMENT_ECONOMY_BRIDGE_SCHEMA_VERSION,
    bridge_id: COMMITMENT_ECONOMY_BRIDGE_ID,
    status: args.status,
    request_forwarded_to_gateway: args.requestForwardedToGateway,
    evidence: bridgeEvidence({
      submission: args.submission,
      status: args.status,
      reasonCodes: args.reasonCodes,
      sourceRefs: args.sourceRefs ?? [],
      gatewayEvidenceId: args.gatewayEvidenceId
    })
  };
}

/**
 * Routes a qualified commitment's already-exact material leg to an injected
 * gateway.  It intentionally cannot open accounts, determine custody, derive
 * an amount, select a counterparty, create a due, or write a GL entry.
 */
export function submitCommitmentEconomicRequest(
  submission: CommitmentEconomySubmissionV1,
  gateway?: CommitmentEconomyGatewayV1
): CommitmentEconomyBridgeResultV1 {
  if (submission.commitment_admission_status !== "accepted") {
    const status = submission.commitment_admission_status === "rejected" ? "rejected" : "withheld";
    return result({
      submission,
      status,
      requestForwardedToGateway: false,
      reasonCodes: [`commitment_admission_${submission.commitment_admission_status}`]
    });
  }

  const failures = exactRequestFailures(submission);
  if (failures.length > 0) {
    return result({
      submission,
      status: "withheld",
      requestForwardedToGateway: false,
      reasonCodes: failures
    });
  }

  if (!gateway) {
    return result({
      submission,
      status: "withheld",
      requestForwardedToGateway: false,
      reasonCodes: ["economy_gateway_not_admitted_or_bound"]
    });
  }

  const gatewayEvidence = gateway.submitExactCounterpartiedRequest(submission.economic_request);
  const responseFailures = sortedUnique([
    gatewayEvidence.request_id !== submission.economic_request.request_id
      ? "gateway_evidence_request_id_mismatch"
      : "",
    gatewayEvidence.idempotency_key !== submission.economic_request.idempotency_key
      ? "gateway_evidence_idempotency_key_mismatch"
      : "",
    gatewayEvidence.economic_leg_id !== submission.economic_request.economic_leg_id
      ? "gateway_evidence_economic_leg_id_mismatch"
      : "",
    ...requiredTextFailures(gatewayEvidence.evidence_id, "gateway_evidence_id")
  ]);

  if (responseFailures.length > 0) {
    return result({
      submission,
      status: "withheld",
      requestForwardedToGateway: true,
      reasonCodes: responseFailures,
      sourceRefs: gatewayEvidence.source_refs,
      gatewayEvidenceId: gatewayEvidence.evidence_id || null
    });
  }

  return result({
    submission,
    status: gatewayEvidence.status,
    requestForwardedToGateway: true,
    reasonCodes: gatewayEvidence.reason_codes,
    sourceRefs: gatewayEvidence.source_refs,
    gatewayEvidenceId: gatewayEvidence.evidence_id
  });
}
