import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import {
  COURTOS_PLANNING_AUTHORITY_RECEIPT_SCHEMA_VERSION,
  COURTOS_PLANNING_COMMAND_SCHEMA_VERSION,
  COURTOS_PLANNING_CONTRIBUTION_SCHEMA_VERSION,
  COURTOS_PLANNING_SCOPE_ADMISSION_SCHEMA_VERSION,
  type CourtOsAuthorityScopedPlanContributionV1,
  type CourtOsPlanOperationContextV1,
  type CourtOsPlanningAuthoritySnapshotV1,
  type CourtOsPlanningSourceSnapshotV1,
  type CourtOsTrack2AuthorityValidationReceiptV1,
  type CourtOsTrack2ScopeAdmissionReceiptV1,
} from "../../src/server/courtosPlanning/contracts";
import {
  COURTOS_CANONICAL_JSON_ALGORITHM,
  CourtOsPlanningError,
  CourtOsPlanningLifecycleV1,
  canonicalJson,
  courtOsPlanningDigest,
  courtOsScopeClaimDigest,
} from "../../src/server/courtosPlanning/planLifecycle";
import { CourtOsSqlitePlanningStoreV1 } from "../../src/server/courtosPlanning/sqlitePlanningStore";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

const source: CourtOsPlanningSourceSnapshotV1 = {
  generation_id: "household-turn-opening-v1",
  effective_date: "1120-01-01",
  content_digest: "a".repeat(64),
};

const authority: CourtOsPlanningAuthoritySnapshotV1 = {
  generation_id: "track2-authority-v1",
  effective_date: "1120-01-01",
  content_digest: "c".repeat(64),
};

function apply(
  service: CourtOsPlanningLifecycleV1,
  request: Parameters<CourtOsPlanningLifecycleV1["apply"]>[0],
  currentSource: CourtOsPlanningSourceSnapshotV1 = source,
  currentAuthority: CourtOsPlanningAuthoritySnapshotV1 = authority,
) {
  return service.apply(request, currentSource, currentAuthority);
}

function lifecycle(): CourtOsPlanningLifecycleV1 {
  const directory = mkdtempSync(join(tmpdir(), "courtos-plan-"));
  directories.push(directory);
  return new CourtOsPlanningLifecycleV1(
    new CourtOsSqlitePlanningStoreV1(join(directory, "plans.sqlite")),
  );
}

function operationContext(
  overrides: Partial<CourtOsPlanOperationContextV1> = {},
): CourtOsPlanOperationContextV1 {
  return {
    request_id: "request-1",
    idempotency_key: "operation-key-1",
    house_id: "house-pearwick",
    turn_id: "turn-1120-1122",
    actor_person_id: "delegate-ralph",
    expected_source_snapshot: source,
    expected_authority_snapshot: authority,
    expected_plan_version: null,
    expected_plan_digest: null,
    requested_at: "1120-01-01T09:00:00.000Z",
    ...overrides,
  };
}

function authorityReceipt(input: {
  actor?: string;
  authorityBasisRef?: string;
  commandId?: string;
  commandDigest?: string;
  scope?: string;
  sourceGenerationId?: string;
  verdict?: "permitted" | "blocked" | "needs_evidence";
} = {}): CourtOsTrack2AuthorityValidationReceiptV1 {
  return {
    schema_version: COURTOS_PLANNING_AUTHORITY_RECEIPT_SCHEMA_VERSION,
    validation_id: `validation-${input.commandId ?? "stores"}`,
    command_id: input.commandId ?? "command-stores-policy",
    house_id: "house-pearwick",
    actor_person_id: input.actor ?? "delegate-ralph",
    authority_scope_id: input.scope ?? "scope-household-stores",
    authority_basis_ref: input.authorityBasisRef ?? "track2-grant-stores",
    authority_contract_generation_id: "track2-authority-v1",
    authority_contract_effective_date: authority.effective_date,
    authority_contract_content_digest: authority.content_digest,
    source_generation_id: input.sourceGenerationId ?? source.generation_id,
    command_digest: input.commandDigest ?? "0".repeat(64),
    verdict: input.verdict ?? "permitted",
    reason_codes: [],
    evaluated_at: "1120-01-01T08:59:00.000Z",
  };
}

function scopeAdmissionReceipt(input: {
  actor: string;
  authorityBasisRef: string;
  contributionId: string;
  verdict?: "permitted" | "blocked" | "needs_evidence";
}): CourtOsTrack2ScopeAdmissionReceiptV1 {
  const authorityScopeId = "scope-household-stores";
  return {
    schema_version: COURTOS_PLANNING_SCOPE_ADMISSION_SCHEMA_VERSION,
    validation_id: `scope-validation-${input.contributionId}`,
    contribution_id: input.contributionId,
    house_id: "house-pearwick",
    actor_person_id: input.actor,
    authority_scope_id: authorityScopeId,
    authority_basis_ref: input.authorityBasisRef,
    authority_contract_generation_id: authority.generation_id,
    authority_contract_effective_date: authority.effective_date,
    authority_contract_content_digest: authority.content_digest,
    source_generation_id: source.generation_id,
    scope_claim_digest: courtOsScopeClaimDigest({
      contribution_id: input.contributionId,
      house_id: "house-pearwick",
      actor_person_id: input.actor,
      authority_scope_id: authorityScopeId,
      authority_basis_ref: input.authorityBasisRef,
      source_generation_id: source.generation_id,
    }),
    verdict: input.verdict ?? "permitted",
    reason_codes: [],
    evaluated_at: "1120-01-01T08:58:00.000Z",
  };
}

function contribution(input: {
  actor?: string;
  authorityBasisRef?: string;
  scopeVerdict?: "permitted" | "blocked" | "needs_evidence";
  status?: "draft" | "locked";
  verdict?: "permitted" | "blocked" | "needs_evidence";
} = {}): CourtOsAuthorityScopedPlanContributionV1 {
  const actor = input.actor ?? "delegate-ralph";
  const authorityBasisRef = input.authorityBasisRef ?? "track2-grant-stores";
  const contributionId = "contribution-stores";
  const commandId = "command-stores-policy";
  const command = {
    schema_version: COURTOS_PLANNING_COMMAND_SCHEMA_VERSION,
    command_id: commandId,
    command_type: "household_stores_policy_change",
    house_id: "house-pearwick",
    turn_id: "turn-1120-1122",
    authority_scope_id: "scope-household-stores",
    responsibility_id: "household_stores_provisioning_procurement",
    target_entity_ids: ["house-pearwick"],
    command_payload: {
      household_standard: "customary",
      reserve_posture: "deep",
    },
    evidence_refs: ["opening-stores-record"],
    expected_source_generation_id: source.generation_id,
    requested_effective_date: "1120-01-01",
    idempotency_key: "command-key-stores-policy",
  } as const;
  const receipt = authorityReceipt({
    actor,
    authorityBasisRef,
    commandId,
    commandDigest: courtOsPlanningDigest(command),
    verdict: input.verdict,
  });
  return {
    schema_version: COURTOS_PLANNING_CONTRIBUTION_SCHEMA_VERSION,
    contribution_id: contributionId,
    authority_scope_id: "scope-household-stores",
    actor_person_id: actor,
    authority_basis_ref: authorityBasisRef,
    scope_admission_receipt: scopeAdmissionReceipt({
      actor,
      authorityBasisRef,
      contributionId,
      verdict: input.scopeVerdict,
    }),
    status: input.status ?? "draft",
    commands: [command],
    authority_receipts: [receipt],
  };
}

function saveRequest(input: {
  context?: Partial<CourtOsPlanOperationContextV1>;
  contribution?: CourtOsAuthorityScopedPlanContributionV1;
} = {}) {
  return {
    ...operationContext(input.context),
    operation: "save_contribution" as const,
    contribution: input.contribution ?? contribution(),
  };
}

describe("CourtOS authority-scoped durable planning lifecycle", () => {
  it("uses the portable RFC 8785 canonical JSON contract for digests", () => {
    expect(COURTOS_CANONICAL_JSON_ALGORITHM).toBe("RFC8785_JCS");
    expect(
      canonicalJson({
        numbers: [333333333.33333329, 1e30, 4.5, 0.002, 1e-27],
        b: 1,
        a: 2,
      }),
    ).toBe(
      '{"a":2,"b":1,"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27]}',
    );
  });

  it("saves an incomplete draft durably and reopens it after a process boundary", () => {
    const directory = mkdtempSync(join(tmpdir(), "courtos-plan-reopen-"));
    directories.push(directory);
    const databasePath = join(directory, "plans.sqlite");
    const first = new CourtOsPlanningLifecycleV1(
      new CourtOsSqlitePlanningStoreV1(databasePath),
    );
    const result = apply(first, saveRequest(), source);
    expect(result.plan).toMatchObject({ version: 1, status: "draft" });
    expect(result.receipt).toMatchObject({
      operation: "save_contribution",
      plan_version: 1,
      actor_person_id: "delegate-ralph",
    });
    first.close();

    const reopened = new CourtOsPlanningLifecycleV1(
      new CourtOsSqlitePlanningStoreV1(databasePath),
    );
    expect(reopened.currentPlan("house-pearwick", "turn-1120-1122")).toEqual(
      result.plan,
    );
    reopened.close();
  });

  it("returns the immutable prior result for an exact idempotent replay", () => {
    const service = lifecycle();
    const request = saveRequest();
    const first = apply(service, request, source);
    const replay = apply(service, request, source);
    expect(replay.plan).toEqual(first.plan);
    expect(replay.receipt).toEqual(first.receipt);
    expect(replay.idempotent_replay).toBe(true);
    service.close();
  });

  it("retains immutable superseded versions and their save receipts", () => {
    const service = lifecycle();
    const first = apply(service, saveRequest(), source);
    const second = apply(service,
      saveRequest({
        context: {
          request_id: "request-2",
          idempotency_key: "operation-key-2",
          expected_plan_version: first.plan.version,
          expected_plan_digest: first.plan.content_digest,
          requested_at: "1120-01-01T10:00:00.000Z",
        },
      }),
      source,
    );
    expect(second.plan).toMatchObject({ version: 2, supersedes_version: 1 });
    expect(service.planHistory("house-pearwick", "turn-1120-1122")).toEqual([
      { plan: second.plan, receipt: second.receipt },
      { plan: first.plan, receipt: first.receipt },
    ]);
    expect(service.planVersion("house-pearwick", "turn-1120-1122", 1)).toEqual(
      { plan: first.plan, receipt: first.receipt },
    );
    service.close();
  });

  it("rejects reuse of an operation idempotency key for changed content", () => {
    const service = lifecycle();
    const request = saveRequest();
    apply(service, request, source);
    expect(() =>
      apply(service,
        {
          ...request,
          contribution: {
            ...request.contribution,
            contribution_id: "changed-contribution",
          },
        },
        source,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "COURTOS_PLAN_IDEMPOTENCY_CONFLICT" }),
    );
    service.close();
  });

  it("rejects stale read generations and stale plan versions", () => {
    const service = lifecycle();
    expect(() =>
      apply(service,
        saveRequest({
          context: {
            expected_source_snapshot: {
              ...source,
              content_digest: "b".repeat(64),
            },
          },
        }),
        source,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "COURTOS_PLAN_STALE_SOURCE" }),
    );

    const first = apply(service, saveRequest(), source);
    expect(() =>
      apply(service,
        saveRequest({
          context: {
            request_id: "request-2",
            idempotency_key: "operation-key-2",
            expected_plan_version: null,
            expected_plan_digest: null,
          },
        }),
        source,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "COURTOS_PLAN_STALE_VERSION" }),
    );
    expect(first.plan.version).toBe(1);
    service.close();
  });

  it("rejects a receipt after the trusted authority generation changes", () => {
    const service = lifecycle();
    const changedAuthority: CourtOsPlanningAuthoritySnapshotV1 = {
      generation_id: "track2-authority-v2",
      effective_date: "1120-02-01",
      content_digest: "d".repeat(64),
    };
    expect(() =>
      apply(service, saveRequest(), source, changedAuthority),
    ).toThrowError(
      expect.objectContaining({ code: "COURTOS_PLAN_STALE_AUTHORITY" }),
    );
    service.close();
  });

  it("cannot submit a v1 draft after the trusted source advances to v2", () => {
    const service = lifecycle();
    const draft = apply(
      service,
      saveRequest({ contribution: contribution({ status: "locked" }) }),
    );
    const sourceV2: CourtOsPlanningSourceSnapshotV1 = {
      generation_id: "household-turn-opening-v2",
      effective_date: "1120-02-01",
      content_digest: "b".repeat(64),
    };
    expect(() =>
      apply(
        service,
        {
          ...operationContext({
            request_id: "request-submit-source-v2",
            idempotency_key: "operation-submit-source-v2",
            actor_person_id: "head-edmund",
            expected_source_snapshot: sourceV2,
            expected_plan_version: draft.plan.version,
            expected_plan_digest: draft.plan.content_digest,
          }),
          operation: "submit_plan",
          submission_authority_receipt: authorityReceipt({
            actor: "head-edmund",
            authorityBasisRef: "track2-house-submission-grant",
            commandId: draft.plan.plan_id,
            commandDigest: draft.plan.content_digest,
            scope: "house_turn_submission",
          }),
        },
        sourceV2,
        authority,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "COURTOS_PLAN_STALE_SOURCE" }),
    );
    service.close();
  });

  it("cannot submit a v1 draft after the trusted authority advances to v2", () => {
    const service = lifecycle();
    const draft = apply(
      service,
      saveRequest({ contribution: contribution({ status: "locked" }) }),
    );
    const authorityV2: CourtOsPlanningAuthoritySnapshotV1 = {
      generation_id: "track2-authority-v2",
      effective_date: "1120-02-01",
      content_digest: "d".repeat(64),
    };
    expect(() =>
      apply(
        service,
        {
          ...operationContext({
            request_id: "request-submit-authority-v2",
            idempotency_key: "operation-submit-authority-v2",
            actor_person_id: "head-edmund",
            expected_authority_snapshot: authorityV2,
            expected_plan_version: draft.plan.version,
            expected_plan_digest: draft.plan.content_digest,
          }),
          operation: "submit_plan",
          submission_authority_receipt: authorityReceipt({
            actor: "head-edmund",
            authorityBasisRef: "track2-house-submission-grant",
            commandId: draft.plan.plan_id,
            commandDigest: draft.plan.content_digest,
            scope: "house_turn_submission",
          }),
        },
        source,
        authorityV2,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "COURTOS_PLAN_STALE_AUTHORITY" }),
    );
    service.close();
  });

  it("prevents an HoH actor from writing a delegate-owned contribution", () => {
    const service = lifecycle();
    expect(() =>
      apply(service,
        saveRequest({
          context: { actor_person_id: "head-edmund" },
          contribution: contribution({ actor: "delegate-ralph" }),
        }),
        source,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "COURTOS_PLAN_INVALID" }),
    );
    service.close();
  });

  it("rejects an empty first draft without a permitted Track 2 scope grant", () => {
    const service = lifecycle();
    const blockedScope: CourtOsAuthorityScopedPlanContributionV1 = {
      ...contribution({
        actor: "head-edmund",
        authorityBasisRef: "invented-head-claim",
        scopeVerdict: "blocked",
      }),
      commands: [],
      authority_receipts: [],
    };
    expect(() =>
      apply(
        service,
        saveRequest({
          context: { actor_person_id: "head-edmund" },
          contribution: blockedScope,
        }),
      ),
    ).toThrowError(expect.objectContaining({ code: "COURTOS_PLAN_NOT_READY" }));
    service.close();
  });

  it("prevents an HoH actor from replacing an existing delegate-owned scope", () => {
    const service = lifecycle();
    const delegateDraft = apply(service, saveRequest(), source);
    expect(() =>
      apply(service,
        saveRequest({
          context: {
            request_id: "request-hoh-replacement",
            idempotency_key: "operation-hoh-replacement",
            actor_person_id: "head-edmund",
            expected_plan_version: delegateDraft.plan.version,
            expected_plan_digest: delegateDraft.plan.content_digest,
          },
          contribution: contribution({
            actor: "head-edmund",
            authorityBasisRef: "track2-head-retained-authority",
          }),
        }),
        source,
      ),
    ).toThrowError(expect.objectContaining({ code: "COURTOS_PLAN_INVALID" }));
    expect(service.currentPlan("house-pearwick", "turn-1120-1122")).toEqual(
      delegateDraft.plan,
    );
    service.close();
  });

  it("allows incomplete drafts but requires permitted authority before a scope locks", () => {
    const service = lifecycle();
    const blockedDraft = contribution({ verdict: "needs_evidence" });
    expect(
      apply(service, saveRequest({ contribution: blockedDraft }), source).plan
        .contributions.at(0)?.status,
    ).toBe("draft");

    const current = service.currentPlan("house-pearwick", "turn-1120-1122");
    expect(() =>
      apply(service,
        saveRequest({
          context: {
            request_id: "request-lock",
            idempotency_key: "operation-key-lock",
            expected_plan_version: current?.version ?? null,
            expected_plan_digest: current?.content_digest ?? null,
          },
          contribution: contribution({
            status: "locked",
            verdict: "needs_evidence",
          }),
        }),
        source,
      ),
    ).toThrowError(expect.objectContaining({ code: "COURTOS_PLAN_NOT_READY" }));
    service.close();
  });

  it("submits only locked authority-scoped contributions and freezes the plan", () => {
    const service = lifecycle();
    const draft = apply(service,
      saveRequest({ contribution: contribution({ status: "locked" }) }),
      source,
    );
    const submit = apply(service,
      {
        ...operationContext({
          request_id: "request-submit",
          idempotency_key: "operation-key-submit",
          actor_person_id: "head-edmund",
          expected_plan_version: draft.plan.version,
          expected_plan_digest: draft.plan.content_digest,
          requested_at: "1120-01-02T09:00:00.000Z",
        }),
        operation: "submit_plan",
        submission_authority_receipt: authorityReceipt({
          actor: "head-edmund",
          authorityBasisRef: "track2-house-submission-grant",
          commandId: draft.plan.plan_id,
          commandDigest: draft.plan.content_digest,
          scope: "house_turn_submission",
        }),
      },
      source,
    );
    expect(submit.plan).toMatchObject({ version: 2, status: "submitted" });
    expect(submit.plan).toMatchObject({
      submitted_by_person_id: "head-edmund",
      submitted_at: "1120-01-02T09:00:00.000Z",
      submission_authority_receipt: {
        verdict: "permitted",
        authority_scope_id: "house_turn_submission",
      },
    });
    expect(submit.plan.contributions[0]).toMatchObject({
      actor_person_id: "delegate-ralph",
      status: "locked",
    });
    expect(() =>
      apply(service,
        saveRequest({
          context: {
            request_id: "request-after-submit",
            idempotency_key: "operation-after-submit",
            expected_plan_version: submit.plan.version,
            expected_plan_digest: submit.plan.content_digest,
          },
        }),
        source,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "COURTOS_PLAN_ALREADY_SUBMITTED" }),
    );
    service.close();
  });

  it("never interprets a blocked Track 2 verdict as a permitted command", () => {
    const service = lifecycle();
    const current = apply(service,
      saveRequest({ contribution: contribution({ verdict: "blocked" }) }),
      source,
    );
    expect(current.plan.contributions.at(0)?.authority_receipts.at(0)?.verdict).toBe(
      "blocked",
    );
    expect(() =>
      apply(service,
        saveRequest({
          context: {
            request_id: "request-blocked-lock",
            idempotency_key: "blocked-lock",
            expected_plan_version: current.plan.version,
            expected_plan_digest: current.plan.content_digest,
          },
          contribution: contribution({ status: "locked", verdict: "blocked" }),
        }),
        source,
      ),
    ).toThrowError(expect.objectContaining({ code: "COURTOS_PLAN_NOT_READY" }));
    service.close();
  });

  it("rejects command payloads that cannot be hashed and persisted as JSON", () => {
    const service = lifecycle();
    const valid = contribution();
    const firstCommand = valid.commands.at(0);
    expect(firstCommand).toBeDefined();
    const unsafe: CourtOsAuthorityScopedPlanContributionV1 = {
      ...valid,
      commands: [
        {
          ...firstCommand!,
          command_payload: { unsafe: Number.NaN },
        },
      ],
    };
    expect(() =>
      apply(service, saveRequest({ contribution: unsafe }), source),
    ).toThrowError(expect.objectContaining({ code: "COURTOS_PLAN_INVALID" }));
    service.close();
  });

  it("rejects an authority receipt reused for changed command content", () => {
    const service = lifecycle();
    const original = contribution({ status: "locked" });
    const firstCommand = original.commands.at(0);
    expect(firstCommand).toBeDefined();
    const changed: CourtOsAuthorityScopedPlanContributionV1 = {
      ...original,
      commands: [
        {
          ...firstCommand!,
          command_payload: {
            household_standard: "customary",
            reserve_posture: "shallow",
          },
        },
      ],
    };
    expect(() =>
      apply(service, saveRequest({ contribution: changed }), source),
    ).toThrowError(expect.objectContaining({ code: "COURTOS_PLAN_INVALID" }));
    service.close();
  });
});
