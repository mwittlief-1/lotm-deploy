import { createHash } from "node:crypto";

import {
  COURTOS_PLANNING_AUTHORITY_RECEIPT_SCHEMA_VERSION,
  COURTOS_PLANNING_COMMAND_SCHEMA_VERSION,
  COURTOS_PLANNING_CONTRIBUTION_SCHEMA_VERSION,
  COURTOS_PLANNING_SAVE_RECEIPT_SCHEMA_VERSION,
  COURTOS_PLANNING_SCHEMA_VERSION,
  COURTOS_PLANNING_SCOPE_ADMISSION_SCHEMA_VERSION,
  type CourtOsAuthorityScopedPlanContributionV1,
  type CourtOsHousePlanV1,
  type CourtOsPlanningAuthoritySnapshotV1,
  type CourtOsPlanOperationRequestV1,
  type CourtOsPlanOperationResultV1,
  type CourtOsPlanSaveReceiptV1,
  type CourtOsPlanningSourceSnapshotV1,
  type CourtOsPlanningStoreV1,
  type CourtOsStoredPlanVersionV1,
  type CourtOsSavePlanContributionRequestV1,
  type CourtOsSubmitPlanRequestV1,
  type CourtOsTrack2AuthorityValidationReceiptV1,
  type CourtOsTrack2ScopeAdmissionReceiptV1,
} from "./contracts";

export type CourtOsPlanningErrorCode =
  | "COURTOS_PLAN_INVALID"
  | "COURTOS_PLAN_STALE_SOURCE"
  | "COURTOS_PLAN_STALE_AUTHORITY"
  | "COURTOS_PLAN_STALE_VERSION"
  | "COURTOS_PLAN_IDEMPOTENCY_CONFLICT"
  | "COURTOS_PLAN_ALREADY_SUBMITTED"
  | "COURTOS_PLAN_NOT_READY";

export class CourtOsPlanningError extends Error {
  constructor(
    readonly code: CourtOsPlanningErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CourtOsPlanningError";
  }
}

export const COURTOS_CANONICAL_JSON_ALGORITHM = "RFC8785_JCS" as const;

export function canonicalJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CourtOsPlanningError(
        "COURTOS_PLAN_INVALID",
        "RFC 8785 canonical JSON does not permit non-finite numbers.",
      );
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new CourtOsPlanningError(
        "COURTOS_PLAN_INVALID",
        "RFC 8785 canonical JSON requires a plain JSON object.",
      );
    }
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  throw new CourtOsPlanningError(
    "COURTOS_PLAN_INVALID",
    "RFC 8785 canonical JSON cannot encode this value.",
  );
}

export function courtOsPlanningDigest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function required(value: string, field: string): void {
  if (!value.trim()) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_INVALID",
      `CourtOS planning requires ${field}.`,
    );
  }
}

function assertIsoDate(value: string, field: string): void {
  required(value, field);
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/.test(value)) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_INVALID",
      `${field} must be an ISO date or UTC timestamp.`,
    );
  }
}

function assertDigest(value: string, field: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_INVALID",
      `${field} must be a SHA-256 digest.`,
    );
  }
}

function assertJsonValue(value: unknown, field: string): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (Number.isFinite(value)) return;
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_INVALID",
      `${field} may contain only finite JSON numbers.`,
    );
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertJsonValue(entry, `${field}[${index}]`),
    );
    return;
  }
  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new CourtOsPlanningError(
        "COURTOS_PLAN_INVALID",
        `${field} must be a plain JSON object.`,
      );
    }
    for (const [key, entry] of Object.entries(value)) {
      required(key, `${field} key`);
      assertJsonValue(entry, `${field}.${key}`);
    }
    return;
  }
  throw new CourtOsPlanningError(
    "COURTOS_PLAN_INVALID",
    `${field} contains a non-JSON value.`,
  );
}

function assertUniqueRequiredValues(
  values: readonly string[],
  field: string,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    required(value, field);
    if (seen.has(value)) {
      throw new CourtOsPlanningError(
        "COURTOS_PLAN_INVALID",
        `${field} contains duplicate value ${value}.`,
      );
    }
    seen.add(value);
  }
}

function assertSourceSnapshot(snapshot: CourtOsPlanningSourceSnapshotV1): void {
  required(snapshot.generation_id, "source generation");
  assertIsoDate(snapshot.effective_date, "source effective date");
  assertDigest(snapshot.content_digest, "source content digest");
}

function assertAuthoritySnapshot(
  snapshot: CourtOsPlanningAuthoritySnapshotV1,
): void {
  required(snapshot.generation_id, "authority generation");
  assertIsoDate(snapshot.effective_date, "authority effective date");
  assertDigest(snapshot.content_digest, "authority content digest");
}

function assertAuthorityReceipt(
  receipt: CourtOsTrack2AuthorityValidationReceiptV1,
  input: {
    actorPersonId: string;
    authorityBasisRef: string;
    authoritySnapshot: CourtOsPlanningAuthoritySnapshotV1;
    authorityScopeId: string;
    commandId: string;
    commandDigest: string;
    houseId: string;
    sourceGenerationId: string;
  },
): void {
  if (
    receipt.schema_version !==
      COURTOS_PLANNING_AUTHORITY_RECEIPT_SCHEMA_VERSION ||
    receipt.actor_person_id !== input.actorPersonId ||
    receipt.authority_basis_ref !== input.authorityBasisRef ||
    receipt.authority_scope_id !== input.authorityScopeId ||
    receipt.command_id !== input.commandId ||
    receipt.command_digest !== input.commandDigest ||
    receipt.source_generation_id !== input.sourceGenerationId ||
    receipt.house_id !== input.houseId
  ) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_INVALID",
      "Track 2 authority receipt does not match its planning command.",
    );
  }
  required(receipt.validation_id, "authority validation ID");
  required(
    receipt.authority_contract_generation_id,
    "authority contract generation",
  );
  if (
    receipt.authority_contract_generation_id !==
      input.authoritySnapshot.generation_id ||
    receipt.authority_contract_effective_date !==
      input.authoritySnapshot.effective_date ||
    receipt.authority_contract_content_digest !==
      input.authoritySnapshot.content_digest
  ) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_STALE_AUTHORITY",
      "Track 2 authority receipt does not match the trusted current authority snapshot.",
    );
  }
  assertIsoDate(
    receipt.authority_contract_effective_date,
    "authority contract effective date",
  );
  assertDigest(
    receipt.authority_contract_content_digest,
    "authority contract content digest",
  );
  assertDigest(receipt.command_digest, "authority receipt command digest");
  assertIsoDate(receipt.evaluated_at, "authority evaluation time");
}

export function courtOsScopeClaimDigest(input: {
  contribution_id: string;
  house_id: string;
  actor_person_id: string;
  authority_scope_id: string;
  authority_basis_ref: string;
  source_generation_id: string;
}): string {
  return courtOsPlanningDigest(input);
}

function assertScopeAdmissionReceipt(
  receipt: CourtOsTrack2ScopeAdmissionReceiptV1,
  input: {
    contributionId: string;
    houseId: string;
    actorPersonId: string;
    authorityScopeId: string;
    authorityBasisRef: string;
    authoritySnapshot: CourtOsPlanningAuthoritySnapshotV1;
    sourceGenerationId: string;
  },
): void {
  if (!receipt || typeof receipt !== "object") {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_INVALID",
      "Every authority-scoped contribution requires a Track 2 scope-admission receipt.",
    );
  }
  const expectedClaimDigest = courtOsScopeClaimDigest({
    contribution_id: input.contributionId,
    house_id: input.houseId,
    actor_person_id: input.actorPersonId,
    authority_scope_id: input.authorityScopeId,
    authority_basis_ref: input.authorityBasisRef,
    source_generation_id: input.sourceGenerationId,
  });
  if (
    receipt.schema_version !== COURTOS_PLANNING_SCOPE_ADMISSION_SCHEMA_VERSION ||
    receipt.contribution_id !== input.contributionId ||
    receipt.house_id !== input.houseId ||
    receipt.actor_person_id !== input.actorPersonId ||
    receipt.authority_scope_id !== input.authorityScopeId ||
    receipt.authority_basis_ref !== input.authorityBasisRef ||
    receipt.authority_contract_generation_id !==
      input.authoritySnapshot.generation_id ||
    receipt.authority_contract_effective_date !==
      input.authoritySnapshot.effective_date ||
    receipt.authority_contract_content_digest !==
      input.authoritySnapshot.content_digest ||
    receipt.source_generation_id !== input.sourceGenerationId ||
    receipt.scope_claim_digest !== expectedClaimDigest
  ) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_INVALID",
      "Track 2 scope-admission receipt does not match the authority-scoped contribution.",
    );
  }
  required(receipt.validation_id, "scope-admission validation ID");
  assertDigest(receipt.scope_claim_digest, "scope claim digest");
  assertIsoDate(receipt.evaluated_at, "scope-admission evaluation time");
  if (receipt.verdict !== "permitted") {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_NOT_READY",
      "Track 2 has not admitted this actor as the owner of the authority scope.",
    );
  }
}

function authorityReceiptFor(
  contribution: CourtOsAuthorityScopedPlanContributionV1,
  commandId: string,
): CourtOsTrack2AuthorityValidationReceiptV1 | null {
  const matches = contribution.authority_receipts.filter(
    (receipt) => receipt.command_id === commandId,
  );
  if (matches.length > 1) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_INVALID",
      `Command ${commandId} has duplicate authority receipts.`,
    );
  }
  return matches[0] ?? null;
}

function assertContribution(
  contribution: CourtOsAuthorityScopedPlanContributionV1,
  input: {
    actorPersonId: string;
    authoritySnapshot: CourtOsPlanningAuthoritySnapshotV1;
    houseId: string;
    sourceGenerationId: string;
    turnId: string;
  },
): void {
  if (
    contribution.schema_version !==
    COURTOS_PLANNING_CONTRIBUTION_SCHEMA_VERSION
  ) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_INVALID",
      "Unsupported CourtOS contribution schema.",
    );
  }
  required(contribution.contribution_id, "contribution ID");
  required(contribution.authority_scope_id, "authority scope ID");
  required(contribution.authority_basis_ref, "authority basis reference");
  if (contribution.actor_person_id !== input.actorPersonId) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_INVALID",
      "An actor may save only their own authority-scoped contribution.",
    );
  }
  assertScopeAdmissionReceipt(contribution.scope_admission_receipt, {
    contributionId: contribution.contribution_id,
    houseId: input.houseId,
    actorPersonId: input.actorPersonId,
    authorityScopeId: contribution.authority_scope_id,
    authorityBasisRef: contribution.authority_basis_ref,
    authoritySnapshot: input.authoritySnapshot,
    sourceGenerationId: input.sourceGenerationId,
  });

  const commandIds = new Set<string>();
  const idempotencyKeys = new Set<string>();
  for (const command of contribution.commands) {
    if (command.schema_version !== COURTOS_PLANNING_COMMAND_SCHEMA_VERSION) {
      throw new CourtOsPlanningError(
        "COURTOS_PLAN_INVALID",
        "Unsupported CourtOS planning command schema.",
      );
    }
    for (const [value, field] of [
      [command.command_id, "command ID"],
      [command.command_type, "command type"],
      [command.responsibility_id, "responsibility ID"],
      [command.idempotency_key, "command idempotency key"],
    ] as const) {
      required(value, field);
    }
    if (
      command.house_id !== input.houseId ||
      command.turn_id !== input.turnId ||
      command.authority_scope_id !== contribution.authority_scope_id ||
      command.expected_source_generation_id !== input.sourceGenerationId
    ) {
      throw new CourtOsPlanningError(
        "COURTOS_PLAN_INVALID",
        `Command ${command.command_id} crosses its House, turn, authority, or source boundary.`,
      );
    }
    assertIsoDate(command.requested_effective_date, "requested effective date");
    assertUniqueRequiredValues(command.target_entity_ids, "target entity ID");
    assertUniqueRequiredValues(command.evidence_refs, "evidence reference");
    assertJsonValue(command.command_payload, "command payload");
    if (commandIds.has(command.command_id)) {
      throw new CourtOsPlanningError(
        "COURTOS_PLAN_INVALID",
        `Duplicate command ID ${command.command_id}.`,
      );
    }
    if (idempotencyKeys.has(command.idempotency_key)) {
      throw new CourtOsPlanningError(
        "COURTOS_PLAN_INVALID",
        `Duplicate command idempotency key ${command.idempotency_key}.`,
      );
    }
    commandIds.add(command.command_id);
    idempotencyKeys.add(command.idempotency_key);
    const receipt = authorityReceiptFor(contribution, command.command_id);
    if (receipt) {
      assertAuthorityReceipt(receipt, {
        actorPersonId: input.actorPersonId,
        authorityBasisRef: contribution.authority_basis_ref,
        authoritySnapshot: input.authoritySnapshot,
        authorityScopeId: contribution.authority_scope_id,
        commandId: command.command_id,
        commandDigest: courtOsPlanningDigest(command),
        houseId: input.houseId,
        sourceGenerationId: input.sourceGenerationId,
      });
    }
    if (contribution.status === "locked" && receipt?.verdict !== "permitted") {
      throw new CourtOsPlanningError(
        "COURTOS_PLAN_NOT_READY",
        `Locked command ${command.command_id} lacks a permitted Track 2 authority receipt.`,
      );
    }
  }
  for (const receipt of contribution.authority_receipts) {
    if (!commandIds.has(receipt.command_id)) {
      throw new CourtOsPlanningError(
        "COURTOS_PLAN_INVALID",
        `Authority receipt ${receipt.validation_id} has no command in its contribution.`,
      );
    }
  }
}

function assertOperationContext(request: CourtOsPlanOperationRequestV1): void {
  for (const [value, field] of [
    [request.request_id, "request ID"],
    [request.idempotency_key, "operation idempotency key"],
    [request.house_id, "House ID"],
    [request.turn_id, "turn ID"],
    [request.actor_person_id, "actor person ID"],
  ] as const) {
    required(value, field);
  }
  assertIsoDate(request.requested_at, "request time");
  assertSourceSnapshot(request.expected_source_snapshot);
  assertAuthoritySnapshot(request.expected_authority_snapshot);
  if ((request.expected_plan_version === null) !== (request.expected_plan_digest === null)) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_INVALID",
      "Expected plan version and digest must be supplied together.",
    );
  }
  if (request.expected_plan_digest !== null) {
    assertDigest(request.expected_plan_digest, "expected plan digest");
  }
}

function assertCurrentAuthority(
  request: CourtOsPlanOperationRequestV1,
  currentAuthority: CourtOsPlanningAuthoritySnapshotV1,
): void {
  assertAuthoritySnapshot(currentAuthority);
  if (
    request.expected_authority_snapshot.generation_id !==
      currentAuthority.generation_id ||
    request.expected_authority_snapshot.effective_date !==
      currentAuthority.effective_date ||
    request.expected_authority_snapshot.content_digest !==
      currentAuthority.content_digest
  ) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_STALE_AUTHORITY",
      "The authority contract changed; reload and revalidate the planning contribution.",
    );
  }
}

function assertCurrentSource(
  request: CourtOsPlanOperationRequestV1,
  currentSource: CourtOsPlanningSourceSnapshotV1,
): void {
  assertSourceSnapshot(currentSource);
  if (
    request.expected_source_snapshot.generation_id !==
      currentSource.generation_id ||
    request.expected_source_snapshot.effective_date !==
      currentSource.effective_date ||
    request.expected_source_snapshot.content_digest !==
      currentSource.content_digest
  ) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_STALE_SOURCE",
      "The planning source changed; reload and review before saving.",
    );
  }
}

function assertExpectedPlan(
  request: CourtOsPlanOperationRequestV1,
  current: CourtOsHousePlanV1 | null,
): void {
  const actualVersion = current?.version ?? null;
  const actualDigest = current?.content_digest ?? null;
  if (
    request.expected_plan_version !== actualVersion ||
    request.expected_plan_digest !== actualDigest
  ) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_STALE_VERSION",
      "The House plan changed; reload before saving another version.",
    );
  }
  if (
    current &&
    (current.source_snapshot.generation_id !==
      request.expected_source_snapshot.generation_id ||
      current.source_snapshot.effective_date !==
        request.expected_source_snapshot.effective_date ||
      current.source_snapshot.content_digest !==
        request.expected_source_snapshot.content_digest)
  ) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_STALE_SOURCE",
      "The existing plan was authored from a different source generation and requires an explicit rebase before it can change or submit.",
    );
  }
  if (
    current &&
    (current.authority_snapshot.generation_id !==
      request.expected_authority_snapshot.generation_id ||
      current.authority_snapshot.effective_date !==
        request.expected_authority_snapshot.effective_date ||
      current.authority_snapshot.content_digest !==
        request.expected_authority_snapshot.content_digest)
  ) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_STALE_AUTHORITY",
      "The existing plan was validated under a different authority generation and requires an explicit Track 2 rebase before it can change or submit.",
    );
  }
  if (current?.status === "submitted") {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_ALREADY_SUBMITTED",
      "The submitted House plan is immutable.",
    );
  }
}

function planId(houseId: string, turnId: string): string {
  return `cplan_${courtOsPlanningDigest({ houseId, turnId }).slice(0, 24)}`;
}

function withPlanDigest(
  plan: Omit<CourtOsHousePlanV1, "content_digest">,
): CourtOsHousePlanV1 {
  return { ...plan, content_digest: courtOsPlanningDigest(plan) };
}

function makeReceipt(input: {
  plan: CourtOsHousePlanV1;
  request: CourtOsPlanOperationRequestV1;
  requestDigest: string;
}): CourtOsPlanSaveReceiptV1 {
  const body = {
    operation: input.request.operation,
    request_id: input.request.request_id,
    plan_id: input.plan.plan_id,
    plan_version: input.plan.version,
    plan_digest: input.plan.content_digest,
    request_digest: input.requestDigest,
  };
  return {
    schema_version: COURTOS_PLANNING_SAVE_RECEIPT_SCHEMA_VERSION,
    receipt_id: `cpr_${courtOsPlanningDigest(body).slice(0, 24)}`,
    operation: input.request.operation,
    request_id: input.request.request_id,
    idempotency_key: input.request.idempotency_key,
    request_digest: input.requestDigest,
    plan_id: input.plan.plan_id,
    house_id: input.request.house_id,
    turn_id: input.request.turn_id,
    actor_person_id: input.request.actor_person_id,
    plan_version: input.plan.version,
    plan_digest: input.plan.content_digest,
    source_generation_id: input.plan.source_snapshot.generation_id,
    authority_generation_id: input.plan.authority_snapshot.generation_id,
    supersedes_version: input.plan.supersedes_version,
    recorded_at: input.request.requested_at,
  };
}

function nextDraftPlan(
  request: CourtOsSavePlanContributionRequestV1,
  current: CourtOsHousePlanV1 | null,
): CourtOsHousePlanV1 {
  assertContribution(request.contribution, {
    actorPersonId: request.actor_person_id,
    authoritySnapshot: request.expected_authority_snapshot,
    houseId: request.house_id,
    sourceGenerationId: request.expected_source_snapshot.generation_id,
    turnId: request.turn_id,
  });
  const existingContribution = current?.contributions.find(
    (entry) =>
      entry.authority_scope_id === request.contribution.authority_scope_id,
  );
  if (
    existingContribution &&
    (existingContribution.contribution_id !==
      request.contribution.contribution_id ||
      existingContribution.actor_person_id !==
        request.contribution.actor_person_id ||
      existingContribution.authority_basis_ref !==
        request.contribution.authority_basis_ref)
  ) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_INVALID",
      "An existing authority-scoped contribution cannot be replaced by another actor, authority basis, or contribution identity. Change of authority requires a separate admitted Track 2 operation.",
    );
  }
  const contributions = (current?.contributions ?? []).filter(
    (entry) => entry.authority_scope_id !== request.contribution.authority_scope_id,
  );
  contributions.push(request.contribution);
  contributions.sort((left, right) =>
    left.authority_scope_id.localeCompare(right.authority_scope_id),
  );
  return withPlanDigest({
    schema_version: COURTOS_PLANNING_SCHEMA_VERSION,
    plan_id: current?.plan_id ?? planId(request.house_id, request.turn_id),
    house_id: request.house_id,
    turn_id: request.turn_id,
    version: (current?.version ?? 0) + 1,
    status: "draft",
    source_snapshot: request.expected_source_snapshot,
    authority_snapshot: request.expected_authority_snapshot,
    contributions,
    submission_authority_receipt: null,
    submitted_by_person_id: null,
    submitted_at: null,
    supersedes_version: current?.version ?? null,
    created_at: request.requested_at,
  });
}

function nextSubmittedPlan(
  request: CourtOsSubmitPlanRequestV1,
  current: CourtOsHousePlanV1 | null,
): CourtOsHousePlanV1 {
  if (!current || current.contributions.length === 0) {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_NOT_READY",
      "A House plan must contain at least one authority-scoped contribution.",
    );
  }
  for (const contribution of current.contributions) {
    if (contribution.status !== "locked") {
      throw new CourtOsPlanningError(
        "COURTOS_PLAN_NOT_READY",
        `Authority scope ${contribution.authority_scope_id} is not locked.`,
      );
    }
    assertContribution(contribution, {
      actorPersonId: contribution.actor_person_id,
      authoritySnapshot: current.authority_snapshot,
      houseId: request.house_id,
      sourceGenerationId: current.source_snapshot.generation_id,
      turnId: request.turn_id,
    });
  }
  assertAuthorityReceipt(request.submission_authority_receipt, {
    actorPersonId: request.actor_person_id,
    authorityBasisRef: request.submission_authority_receipt.authority_basis_ref,
    authoritySnapshot: current.authority_snapshot,
    authorityScopeId: "house_turn_submission",
    commandId: current.plan_id,
    commandDigest: current.content_digest,
    houseId: request.house_id,
    sourceGenerationId: current.source_snapshot.generation_id,
  });
  if (request.submission_authority_receipt.verdict !== "permitted") {
    throw new CourtOsPlanningError(
      "COURTOS_PLAN_NOT_READY",
      "Track 2 has not permitted submission of the aggregate House plan.",
    );
  }
  const { content_digest: _currentDigest, ...currentWithoutDigest } = current;
  return withPlanDigest({
    ...currentWithoutDigest,
    version: current.version + 1,
    status: "submitted",
    submission_authority_receipt: request.submission_authority_receipt,
    submitted_by_person_id: request.actor_person_id,
    submitted_at: request.requested_at,
    supersedes_version: current.version,
    created_at: request.requested_at,
  });
}

export class CourtOsPlanningLifecycleV1 {
  constructor(private readonly store: CourtOsPlanningStoreV1) {}

  currentPlan(houseId: string, turnId: string): CourtOsHousePlanV1 | null {
    required(houseId, "House ID");
    required(turnId, "turn ID");
    return this.store.currentPlan({ houseId, turnId });
  }

  planVersion(
    houseId: string,
    turnId: string,
    version: number,
  ): CourtOsStoredPlanVersionV1 | null {
    required(houseId, "House ID");
    required(turnId, "turn ID");
    if (!Number.isSafeInteger(version) || version < 1) {
      throw new CourtOsPlanningError(
        "COURTOS_PLAN_INVALID",
        "Plan version must be a positive safe integer.",
      );
    }
    return this.store.planVersion({ houseId, turnId, version });
  }

  planHistory(
    houseId: string,
    turnId: string,
  ): readonly CourtOsStoredPlanVersionV1[] {
    required(houseId, "House ID");
    required(turnId, "turn ID");
    return this.store.planHistory({ houseId, turnId });
  }

  apply(
    request: CourtOsPlanOperationRequestV1,
    currentSource: CourtOsPlanningSourceSnapshotV1,
    currentAuthority: CourtOsPlanningAuthoritySnapshotV1,
  ): CourtOsPlanOperationResultV1 {
    assertOperationContext(request);
    const requestDigest = courtOsPlanningDigest(request);
    const replay = this.store.idempotentResult({
      houseId: request.house_id,
      turnId: request.turn_id,
      operation: request.operation,
      idempotencyKey: request.idempotency_key,
      requestDigest,
    });
    if (replay) return { ...replay, idempotent_replay: true };

    assertCurrentSource(request, currentSource);
    assertCurrentAuthority(request, currentAuthority);
    const current = this.store.currentPlan({
      houseId: request.house_id,
      turnId: request.turn_id,
    });
    assertExpectedPlan(request, current);
    const plan =
      request.operation === "save_contribution"
        ? nextDraftPlan(request, current)
        : nextSubmittedPlan(request, current);
    const receipt = makeReceipt({ plan, request, requestDigest });
    const result: CourtOsPlanOperationResultV1 = {
      plan,
      receipt,
      idempotent_replay: false,
    };
    return this.store.commit({
      operation: request.operation,
      idempotency_key: request.idempotency_key,
      request_digest: requestDigest,
      expected_plan_version: request.expected_plan_version,
      expected_plan_digest: request.expected_plan_digest,
      result,
    });
  }

  close(): void {
    this.store.close();
  }
}
