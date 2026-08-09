/**
 * CourtOS UAT-1 stewardship planning.
 *
 * This module records player-authored three-year proposals. It never mutates
 * the admitted current assignment and it deliberately has no execution API.
 * Callers must supply exact scopes and eligible people from admitted read
 * projections; this module does not infer either from council membership,
 * residence, office, kinship, or presentation data.
 */

export const COURTOS_STEWARDSHIP_PLAN_SCHEMA_VERSION =
  "courtos_stewardship_plan_v1" as const;
export const COURTOS_STEWARDSHIP_PLAN_JOURNAL_SCHEMA_VERSION =
  "courtos_stewardship_plan_journal_v1" as const;

/** Foundation A UAT-1 fixture; production callers supply the active cycle. */
export const COURTOS_UAT1_STEWARDSHIP_PLAN_HORIZON = Object.freeze({
  starts_at: "1120-01-01",
  ends_at: "1122-12-31",
} as const);

export type CourtOsStewardshipPlanningHorizonV1 = Readonly<{
  starts_at: string;
  ends_at: string;
}>;

export type CourtOsStewardshipCurrentHolderV1 = Readonly<{
  person_id: string;
  display_name: string;
}>;

export type CourtOsStewardshipScopeV1 = Readonly<{
  responsibility_id: string;
  responsibility_label: string;
  room_id: string;
  room_label: string;
  /** Exact admitted scope identity. Responsibility-wide scopes remain null. */
  scope_id: string | null;
  scope_label: string;
  source_record_id: string;
  current_holder: CourtOsStewardshipCurrentHolderV1 | null;
}>;

export type CourtOsStewardshipCandidateV1 = Readonly<{
  person_id: string;
  display_name: string;
  eligibility: "admitted_candidate" | "current_holder" | "head_self_assignment";
  eligibility_source_id: string;
}>;

export type CourtOsStewardshipPlanContextV1 = Readonly<{
  house_id: string;
  acting_actor_person_id: string;
  actor_authority_basis_id: string;
  source_generation_id: string;
  effective_date: string;
  planning_horizon: CourtOsStewardshipPlanningHorizonV1;
}>;

type StewardshipPlanRecordBase = {
  schema_version: typeof COURTOS_STEWARDSHIP_PLAN_SCHEMA_VERSION;
  house_id: string;
  responsibility_id: string;
  responsibility_label: string;
  room_id: string;
  scope_id: string | null;
  scope_label: string;
  scope_source_record_id: string;
  acting_actor_person_id: string;
  actor_authority_basis_id: string;
  source_generation_id: string;
  effective_date: string;
  planning_horizon: CourtOsStewardshipPlanningHorizonV1;
  current_holder_person_id: string | null;
  current_holder_display_name: string | null;
  version: number;
  supersedes_version: number | null;
  recorded_at: string;
};

export type CourtOsStewardshipProposalV1 = Readonly<
  StewardshipPlanRecordBase & {
    disposition: "proposed";
    proposed_holder_person_id: string;
    proposed_holder_display_name: string;
    eligibility: CourtOsStewardshipCandidateV1["eligibility"];
    eligibility_source_id: string;
  }
>;

export type CourtOsStewardshipDiscardV1 = Readonly<
  StewardshipPlanRecordBase & {
    disposition: "discarded";
    proposed_holder_person_id: null;
    proposed_holder_display_name: null;
    eligibility: null;
    eligibility_source_id: null;
  }
>;

export type CourtOsStewardshipPlanRecordV1 =
  | CourtOsStewardshipProposalV1
  | CourtOsStewardshipDiscardV1;

export type CourtOsStewardshipPlanJournalV1 = Readonly<{
  schema_version: typeof COURTOS_STEWARDSHIP_PLAN_JOURNAL_SCHEMA_VERSION;
  house_id: string;
  responsibility_id: string;
  scope_id: string | null;
  effective_date: string;
  planning_horizon: CourtOsStewardshipPlanningHorizonV1;
  current_version: number;
  records: readonly CourtOsStewardshipPlanRecordV1[];
}>;

export type CourtOsStewardshipPlanInspectionV1 =
  | { status: "missing"; record: null }
  | { status: "current"; record: CourtOsStewardshipProposalV1 }
  | { status: "discarded"; record: CourtOsStewardshipDiscardV1 }
  | {
      status: "stale_source" | "stale_actor" | "invalid";
      record: CourtOsStewardshipPlanRecordV1 | null;
    };

export type CourtOsStewardshipPlanStorage = Pick<
  Storage,
  "getItem" | "setItem"
>;

export class CourtOsStewardshipPlanError extends Error {
  constructor(
    readonly code:
      | "candidate_not_eligible"
      | "concurrent_version"
      | "invalid_context"
      | "journal_invalid"
      | "invalid_scope"
      | "stale_actor"
      | "stale_source",
    message: string,
  ) {
    super(message);
    this.name = "CourtOsStewardshipPlanError";
  }
}

function required(value: string): boolean {
  return value.trim().length > 0;
}

function scopeToken(scopeId: string | null): string {
  return encodeURIComponent(scopeId ?? "__responsibility_wide__");
}

function cycleToken(
  effectiveDate: string,
  planningHorizon: CourtOsStewardshipPlanningHorizonV1,
): string {
  return encodeURIComponent(
    `${effectiveDate}__${planningHorizon.starts_at}__${planningHorizon.ends_at}`,
  );
}

function currentKey(
  houseId: string,
  responsibilityId: string,
  scopeId: string | null,
  effectiveDate: string,
  planningHorizon: CourtOsStewardshipPlanningHorizonV1,
): string {
  return [
    "merecross.courtos.uat1.stewardship-plan",
    encodeURIComponent(houseId),
    encodeURIComponent(responsibilityId),
    scopeToken(scopeId),
    cycleToken(effectiveDate, planningHorizon),
    "current",
  ].join(":");
}

function versionKey(
  houseId: string,
  responsibilityId: string,
  scopeId: string | null,
  effectiveDate: string,
  planningHorizon: CourtOsStewardshipPlanningHorizonV1,
  version: number,
): string {
  return [
    "merecross.courtos.uat1.stewardship-plan",
    encodeURIComponent(houseId),
    encodeURIComponent(responsibilityId),
    scopeToken(scopeId),
    cycleToken(effectiveDate, planningHorizon),
    `v${version}`,
  ].join(":");
}

function journalKey(
  houseId: string,
  responsibilityId: string,
  scopeId: string | null,
  effectiveDate: string,
  planningHorizon: CourtOsStewardshipPlanningHorizonV1,
): string {
  return [
    "merecross.courtos.uat1.stewardship-plan",
    encodeURIComponent(houseId),
    encodeURIComponent(responsibilityId),
    scopeToken(scopeId),
    cycleToken(effectiveDate, planningHorizon),
    "journal-v1",
  ].join(":");
}

function isCurrentHolder(value: unknown): value is CourtOsStewardshipCurrentHolderV1 {
  if (!value || typeof value !== "object") return false;
  const holder = value as Partial<CourtOsStewardshipCurrentHolderV1>;
  return typeof holder.person_id === "string" && typeof holder.display_name === "string";
}

export function isCourtOsStewardshipScope(
  value: unknown,
): value is CourtOsStewardshipScopeV1 {
  if (!value || typeof value !== "object") return false;
  const scope = value as Partial<CourtOsStewardshipScopeV1>;
  return (
    typeof scope.responsibility_id === "string" &&
    required(scope.responsibility_id) &&
    typeof scope.responsibility_label === "string" &&
    required(scope.responsibility_label) &&
    typeof scope.room_id === "string" &&
    required(scope.room_id) &&
    typeof scope.room_label === "string" &&
    required(scope.room_label) &&
    (typeof scope.scope_id === "string" || scope.scope_id === null) &&
    typeof scope.scope_label === "string" &&
    required(scope.scope_label) &&
    typeof scope.source_record_id === "string" &&
    required(scope.source_record_id) &&
    (scope.current_holder === null || isCurrentHolder(scope.current_holder))
  );
}

function isPlanRecord(value: unknown): value is CourtOsStewardshipPlanRecordV1 {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CourtOsStewardshipPlanRecordV1>;
  const baseValid =
    record.schema_version === COURTOS_STEWARDSHIP_PLAN_SCHEMA_VERSION &&
    typeof record.house_id === "string" &&
    required(record.house_id) &&
    typeof record.responsibility_id === "string" &&
    required(record.responsibility_id) &&
    typeof record.responsibility_label === "string" &&
    typeof record.room_id === "string" &&
    (typeof record.scope_id === "string" || record.scope_id === null) &&
    typeof record.scope_label === "string" &&
    typeof record.scope_source_record_id === "string" &&
    typeof record.acting_actor_person_id === "string" &&
    required(record.acting_actor_person_id) &&
    typeof record.actor_authority_basis_id === "string" &&
    required(record.actor_authority_basis_id) &&
    typeof record.source_generation_id === "string" &&
    required(record.source_generation_id) &&
    typeof record.effective_date === "string" &&
    typeof record.planning_horizon?.starts_at === "string" &&
    typeof record.planning_horizon?.ends_at === "string" &&
    record.effective_date === record.planning_horizon?.starts_at &&
    isThreeYearStewardshipHorizon(record.planning_horizon) &&
    (typeof record.current_holder_person_id === "string" ||
      record.current_holder_person_id === null) &&
    (typeof record.current_holder_display_name === "string" ||
      record.current_holder_display_name === null) &&
    Number.isInteger(record.version) &&
    (record.version ?? 0) > 0 &&
    (record.supersedes_version === null || Number.isInteger(record.supersedes_version)) &&
    typeof record.recorded_at === "string" &&
    !Number.isNaN(Date.parse(record.recorded_at));

  if (!baseValid) return false;
  if (record.disposition === "discarded") {
    return (
      record.proposed_holder_person_id === null &&
      record.proposed_holder_display_name === null &&
      record.eligibility === null &&
      record.eligibility_source_id === null
    );
  }
  return (
    record.disposition === "proposed" &&
    typeof record.proposed_holder_person_id === "string" &&
    required(record.proposed_holder_person_id) &&
    typeof record.proposed_holder_display_name === "string" &&
    required(record.proposed_holder_display_name) &&
    (record.eligibility === "admitted_candidate" ||
      record.eligibility === "current_holder" ||
      record.eligibility === "head_self_assignment") &&
    typeof record.eligibility_source_id === "string" &&
    required(record.eligibility_source_id)
  );
}

function sameHorizon(
  left: CourtOsStewardshipPlanningHorizonV1,
  right: CourtOsStewardshipPlanningHorizonV1,
): boolean {
  return left.starts_at === right.starts_at && left.ends_at === right.ends_at;
}

function isPlanJournal(value: unknown): value is CourtOsStewardshipPlanJournalV1 {
  if (!value || typeof value !== "object") return false;
  const journal = value as Partial<CourtOsStewardshipPlanJournalV1>;
  if (
    journal.schema_version !== COURTOS_STEWARDSHIP_PLAN_JOURNAL_SCHEMA_VERSION ||
    typeof journal.house_id !== "string" ||
    !required(journal.house_id) ||
    typeof journal.responsibility_id !== "string" ||
    !required(journal.responsibility_id) ||
    (typeof journal.scope_id !== "string" && journal.scope_id !== null) ||
    typeof journal.effective_date !== "string" ||
    !journal.planning_horizon ||
    !isThreeYearStewardshipHorizon(journal.planning_horizon) ||
    journal.effective_date !== journal.planning_horizon.starts_at ||
    !Number.isInteger(journal.current_version) ||
    (journal.current_version ?? 0) < 1 ||
    !Array.isArray(journal.records) ||
    journal.records.length !== journal.current_version
  ) return false;

  for (let index = 0; index < journal.records.length; index += 1) {
    const record = journal.records[index];
    const expectedVersion = index + 1;
    if (
      !isPlanRecord(record) ||
      record.house_id !== journal.house_id ||
      record.responsibility_id !== journal.responsibility_id ||
      record.scope_id !== journal.scope_id ||
      record.effective_date !== journal.effective_date ||
      !sameHorizon(record.planning_horizon, journal.planning_horizon) ||
      record.version !== expectedVersion ||
      record.supersedes_version !== (expectedVersion === 1 ? null : expectedVersion - 1)
    ) return false;
  }
  return journal.records[journal.records.length - 1]?.version === journal.current_version;
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export function isThreeYearStewardshipHorizon(
  horizon: CourtOsStewardshipPlanningHorizonV1,
): boolean {
  const start = parseIsoDate(horizon.starts_at);
  const end = parseIsoDate(horizon.ends_at);
  if (!start || !end) return false;
  const expectedEnd = new Date(start.getTime());
  expectedEnd.setUTCFullYear(expectedEnd.getUTCFullYear() + 3);
  expectedEnd.setUTCDate(expectedEnd.getUTCDate() - 1);
  return expectedEnd.toISOString().slice(0, 10) === horizon.ends_at;
}

export function threeYearStewardshipHorizonFrom(
  effectiveDate: string,
): CourtOsStewardshipPlanningHorizonV1 | null {
  const start = parseIsoDate(effectiveDate);
  if (!start) return null;
  const end = new Date(start.getTime());
  end.setUTCFullYear(end.getUTCFullYear() + 3);
  end.setUTCDate(end.getUTCDate() - 1);
  return Object.freeze({
    starts_at: effectiveDate,
    ends_at: end.toISOString().slice(0, 10),
  });
}

function validateContext(context: CourtOsStewardshipPlanContextV1): void {
  if (
    !required(context.house_id) ||
    !required(context.acting_actor_person_id) ||
    !required(context.actor_authority_basis_id) ||
    !required(context.source_generation_id) ||
    !parseIsoDate(context.effective_date) ||
    context.effective_date !== context.planning_horizon.starts_at ||
    !isThreeYearStewardshipHorizon(context.planning_horizon)
  ) {
    throw new CourtOsStewardshipPlanError(
      "invalid_context",
      "Stewardship planning requires the current House, acting Head, responsibility record, and three-year horizon.",
    );
  }
}

function readLegacyJournal(
  storage: CourtOsStewardshipPlanStorage,
  context: Pick<
    CourtOsStewardshipPlanContextV1,
    "house_id" | "effective_date" | "planning_horizon"
  >,
  scope: Pick<CourtOsStewardshipScopeV1, "responsibility_id" | "scope_id">,
): CourtOsStewardshipPlanJournalV1 | null | "invalid" {
  try {
    const raw = storage.getItem(
      currentKey(
        context.house_id,
        scope.responsibility_id,
        scope.scope_id,
        context.effective_date,
        context.planning_horizon,
      ),
    );
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPlanRecord(parsed)) return "invalid";
    if (
      parsed.house_id !== context.house_id ||
      parsed.responsibility_id !== scope.responsibility_id ||
      parsed.scope_id !== scope.scope_id ||
      parsed.effective_date !== context.effective_date ||
      !sameHorizon(parsed.planning_horizon, context.planning_horizon)
    ) return "invalid";
    const records: CourtOsStewardshipPlanRecordV1[] = [];
    for (let version = 1; version <= parsed.version; version += 1) {
      const versionRaw = storage.getItem(versionKey(
        context.house_id,
        scope.responsibility_id,
        scope.scope_id,
        context.effective_date,
        context.planning_horizon,
        version,
      ));
      if (!versionRaw) return "invalid";
      const versionRecord: unknown = JSON.parse(versionRaw);
      if (!isPlanRecord(versionRecord)) return "invalid";
      records.push(versionRecord);
    }
    const journal: CourtOsStewardshipPlanJournalV1 = {
      schema_version: COURTOS_STEWARDSHIP_PLAN_JOURNAL_SCHEMA_VERSION,
      house_id: context.house_id,
      responsibility_id: scope.responsibility_id,
      scope_id: scope.scope_id,
      effective_date: context.effective_date,
      planning_horizon: { ...context.planning_horizon },
      current_version: parsed.version,
      records,
    };
    return isPlanJournal(journal) ? journal : "invalid";
  } catch {
    return "invalid";
  }
}

function readStoredJournal(
  storage: CourtOsStewardshipPlanStorage,
  context: Pick<
    CourtOsStewardshipPlanContextV1,
    "house_id" | "effective_date" | "planning_horizon"
  >,
  scope: Pick<CourtOsStewardshipScopeV1, "responsibility_id" | "scope_id">,
): CourtOsStewardshipPlanJournalV1 | null | "invalid" {
  try {
    const raw = storage.getItem(journalKey(
      context.house_id,
      scope.responsibility_id,
      scope.scope_id,
      context.effective_date,
      context.planning_horizon,
    ));
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      return isPlanJournal(parsed) ? parsed : "invalid";
    }
    return readLegacyJournal(storage, context, scope);
  } catch {
    return "invalid";
  }
}

function readStoredRecord(
  storage: CourtOsStewardshipPlanStorage,
  context: Pick<
    CourtOsStewardshipPlanContextV1,
    "house_id" | "effective_date" | "planning_horizon"
  >,
  scope: Pick<CourtOsStewardshipScopeV1, "responsibility_id" | "scope_id">,
): CourtOsStewardshipPlanRecordV1 | null | "invalid" {
  const journal = readStoredJournal(storage, context, scope);
  if (journal === null || journal === "invalid") return journal;
  return journal.records[journal.current_version - 1] ?? "invalid";
}

/**
 * Returns stale records as stale instead of hiding them. The UI can therefore
 * explain why a prior proposal cannot be reused after a source or authority
 * generation changes.
 */
export function inspectCourtOsStewardshipPlan(
  storage: CourtOsStewardshipPlanStorage,
  context: CourtOsStewardshipPlanContextV1,
  scope: CourtOsStewardshipScopeV1,
): CourtOsStewardshipPlanInspectionV1 {
  if (!isCourtOsStewardshipScope(scope)) return { status: "invalid", record: null };
  const record = readStoredRecord(storage, context, scope);
  if (record === null) return { status: "missing", record: null };
  if (record === "invalid") return { status: "invalid", record: null };
  if (
    record.house_id !== context.house_id ||
    record.responsibility_id !== scope.responsibility_id ||
    record.scope_id !== scope.scope_id ||
    record.scope_source_record_id !== scope.source_record_id ||
    record.source_generation_id !== context.source_generation_id ||
    record.effective_date !== context.effective_date
  ) {
    return { status: "stale_source", record };
  }
  if (
    record.acting_actor_person_id !== context.acting_actor_person_id ||
    record.actor_authority_basis_id !== context.actor_authority_basis_id
  ) {
    return { status: "stale_actor", record };
  }
  return record.disposition === "discarded"
    ? { status: "discarded", record }
    : { status: "current", record };
}

function assertExpectedVersion(
  inspection: CourtOsStewardshipPlanInspectionV1,
  expectedVersion: number | null,
): CourtOsStewardshipPlanRecordV1 | null {
  if (inspection.status === "stale_source") {
    throw new CourtOsStewardshipPlanError(
      "stale_source",
      "The House record changed. Review the current assignment before saving.",
    );
  }
  if (inspection.status === "stale_actor") {
    throw new CourtOsStewardshipPlanError(
      "stale_actor",
      "The acting Head or authority basis changed. Review this proposal under the current authority.",
    );
  }
  if (inspection.status === "invalid") {
    throw new CourtOsStewardshipPlanError(
      "journal_invalid",
      "The saved stewardship journal could not be verified. It will not be replaced.",
    );
  }
  const record = inspection.record;
  const actualVersion = record?.version ?? null;
  if (actualVersion !== expectedVersion) {
    throw new CourtOsStewardshipPlanError(
      "concurrent_version",
      "A newer local proposal exists for this scope. Reload it before saving.",
    );
  }
  return record;
}

function recordBase(
  context: CourtOsStewardshipPlanContextV1,
  scope: CourtOsStewardshipScopeV1,
  prior: CourtOsStewardshipPlanRecordV1 | null,
  now: Date,
): StewardshipPlanRecordBase {
  return {
    schema_version: COURTOS_STEWARDSHIP_PLAN_SCHEMA_VERSION,
    house_id: context.house_id,
    responsibility_id: scope.responsibility_id,
    responsibility_label: scope.responsibility_label,
    room_id: scope.room_id,
    scope_id: scope.scope_id,
    scope_label: scope.scope_label,
    scope_source_record_id: scope.source_record_id,
    acting_actor_person_id: context.acting_actor_person_id,
    actor_authority_basis_id: context.actor_authority_basis_id,
    source_generation_id: context.source_generation_id,
    effective_date: context.effective_date,
    planning_horizon: { ...context.planning_horizon },
    current_holder_person_id: scope.current_holder?.person_id ?? null,
    current_holder_display_name: scope.current_holder?.display_name ?? null,
    version: (prior?.version ?? 0) + 1,
    supersedes_version: prior?.version ?? null,
    recorded_at: now.toISOString(),
  };
}

function persistRecord(
  storage: CourtOsStewardshipPlanStorage,
  record: CourtOsStewardshipPlanRecordV1,
): void {
  const identity = {
    house_id: record.house_id,
    effective_date: record.effective_date,
    planning_horizon: record.planning_horizon,
  };
  const scope = {
    responsibility_id: record.responsibility_id,
    scope_id: record.scope_id,
  };
  const prior = readStoredJournal(storage, identity, scope);
  if (prior === "invalid") {
    throw new CourtOsStewardshipPlanError(
      "journal_invalid",
      "The saved stewardship journal could not be verified. It will not be replaced.",
    );
  }
  const records = prior ? [...prior.records, record] : [record];
  const journal: CourtOsStewardshipPlanJournalV1 = {
    schema_version: COURTOS_STEWARDSHIP_PLAN_JOURNAL_SCHEMA_VERSION,
    house_id: record.house_id,
    responsibility_id: record.responsibility_id,
    scope_id: record.scope_id,
    effective_date: record.effective_date,
    planning_horizon: { ...record.planning_horizon },
    current_version: record.version,
    records,
  };
  if (!isPlanJournal(journal)) {
    throw new CourtOsStewardshipPlanError(
      "journal_invalid",
      "The new stewardship journal failed validation and was not written.",
    );
  }
  storage.setItem(
    journalKey(
      record.house_id,
      record.responsibility_id,
      record.scope_id,
      record.effective_date,
      record.planning_horizon,
    ),
    JSON.stringify(journal),
  );
}

export function saveCourtOsStewardshipProposal(input: {
  storage: CourtOsStewardshipPlanStorage;
  context: CourtOsStewardshipPlanContextV1;
  scope: CourtOsStewardshipScopeV1;
  candidate: CourtOsStewardshipCandidateV1;
  eligible_candidates: readonly CourtOsStewardshipCandidateV1[];
  expected_version: number | null;
  now?: Date;
}): CourtOsStewardshipProposalV1 {
  validateContext(input.context);
  if (!isCourtOsStewardshipScope(input.scope)) {
    throw new CourtOsStewardshipPlanError(
      "invalid_scope",
      "Stewardship planning requires an exact recorded charge.",
    );
  }
  const exactCandidate = input.eligible_candidates.find(
    (candidate) =>
      candidate.person_id === input.candidate.person_id &&
      candidate.display_name === input.candidate.display_name &&
      candidate.eligibility === input.candidate.eligibility &&
      candidate.eligibility_source_id === input.candidate.eligibility_source_id,
  );
  if (!exactCandidate) {
    throw new CourtOsStewardshipPlanError(
      "candidate_not_eligible",
      "The selected person is not in the supplied eligibility projection for this scope.",
    );
  }
  const inspection = inspectCourtOsStewardshipPlan(
    input.storage,
    input.context,
    input.scope,
  );
  const prior = assertExpectedVersion(inspection, input.expected_version);
  const proposal: CourtOsStewardshipProposalV1 = {
    ...recordBase(input.context, input.scope, prior, input.now ?? new Date()),
    disposition: "proposed",
    proposed_holder_person_id: exactCandidate.person_id,
    proposed_holder_display_name: exactCandidate.display_name,
    eligibility: exactCandidate.eligibility,
    eligibility_source_id: exactCandidate.eligibility_source_id,
  };
  persistRecord(input.storage, proposal);
  return proposal;
}

/**
 * Discarding is a versioned tombstone. Prior proposal versions remain
 * available for audit, while no active proposal is returned to the player.
 */
export function discardCourtOsStewardshipProposal(input: {
  storage: CourtOsStewardshipPlanStorage;
  context: CourtOsStewardshipPlanContextV1;
  scope: CourtOsStewardshipScopeV1;
  expected_version: number;
  now?: Date;
}): CourtOsStewardshipDiscardV1 {
  validateContext(input.context);
  if (!isCourtOsStewardshipScope(input.scope)) {
    throw new CourtOsStewardshipPlanError(
      "invalid_scope",
      "Stewardship planning requires an exact recorded charge.",
    );
  }
  const inspection = inspectCourtOsStewardshipPlan(
    input.storage,
    input.context,
    input.scope,
  );
  const prior = assertExpectedVersion(inspection, input.expected_version);
  if (!prior || prior.disposition !== "proposed") {
    throw new CourtOsStewardshipPlanError(
      "concurrent_version",
      "There is no current proposal at the expected version to discard.",
    );
  }
  const discarded: CourtOsStewardshipDiscardV1 = {
    ...recordBase(input.context, input.scope, prior, input.now ?? new Date()),
    disposition: "discarded",
    proposed_holder_person_id: null,
    proposed_holder_display_name: null,
    eligibility: null,
    eligibility_source_id: null,
  };
  persistRecord(input.storage, discarded);
  return discarded;
}

/**
 * Explicitly sets aside a stale proposal after the player has seen why it is
 * stale. The tombstone binds the new source/actor context; ordinary save never
 * bypasses a stale gate.
 */
export function archiveStaleCourtOsStewardshipProposal(input: {
  storage: CourtOsStewardshipPlanStorage;
  context: CourtOsStewardshipPlanContextV1;
  scope: CourtOsStewardshipScopeV1;
  expected_stale_version: number;
  now?: Date;
}): CourtOsStewardshipDiscardV1 {
  validateContext(input.context);
  if (!isCourtOsStewardshipScope(input.scope)) {
    throw new CourtOsStewardshipPlanError(
      "invalid_scope",
      "Stewardship planning requires an exact recorded charge.",
    );
  }
  const inspection = inspectCourtOsStewardshipPlan(
    input.storage,
    input.context,
    input.scope,
  );
  if (
    (inspection.status !== "stale_source" && inspection.status !== "stale_actor") ||
    !inspection.record ||
    inspection.record.version !== input.expected_stale_version
  ) {
    throw new CourtOsStewardshipPlanError(
      "concurrent_version",
      "The stale proposal changed before it could be set aside. Reload it first.",
    );
  }
  const discarded: CourtOsStewardshipDiscardV1 = {
    ...recordBase(
      input.context,
      input.scope,
      inspection.record,
      input.now ?? new Date(),
    ),
    disposition: "discarded",
    proposed_holder_person_id: null,
    proposed_holder_display_name: null,
    eligibility: null,
    eligibility_source_id: null,
  };
  persistRecord(input.storage, discarded);
  return discarded;
}

export function readCourtOsStewardshipPlanVersion(
  storage: CourtOsStewardshipPlanStorage,
  key: {
    house_id: string;
    responsibility_id: string;
    scope_id: string | null;
    effective_date: string;
    planning_horizon: CourtOsStewardshipPlanningHorizonV1;
    version: number;
  },
): CourtOsStewardshipPlanRecordV1 | null {
  try {
    const journal = readStoredJournal(
      storage,
      {
        house_id: key.house_id,
        effective_date: key.effective_date,
        planning_horizon: key.planning_horizon,
      },
      {
        responsibility_id: key.responsibility_id,
        scope_id: key.scope_id,
      },
    );
    if (!journal || journal === "invalid") return null;
    return journal.records[key.version - 1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Candidate assembly is source-preserving. The HoH is included only when the
 * caller supplies the exact authority basis that permits self-assignment.
 */
export function courtOsStewardshipCandidates(input: {
  admitted_candidates: readonly CourtOsStewardshipCandidateV1[];
  current_holder: CourtOsStewardshipCurrentHolderV1 | null;
  current_holder_source_id: string | null;
  head: CourtOsStewardshipCurrentHolderV1;
  head_self_assignment_authority_id: string | null;
}): readonly CourtOsStewardshipCandidateV1[] {
  const candidates: CourtOsStewardshipCandidateV1[] = [];
  const seen = new Set<string>();
  const push = (candidate: CourtOsStewardshipCandidateV1) => {
    if (
      !required(candidate.person_id) ||
      !required(candidate.display_name) ||
      !required(candidate.eligibility_source_id) ||
      seen.has(candidate.person_id)
    ) return;
    seen.add(candidate.person_id);
    candidates.push(candidate);
  };

  for (const candidate of input.admitted_candidates) push(candidate);
  if (input.current_holder && input.current_holder_source_id) {
    push({
      person_id: input.current_holder.person_id,
      display_name: input.current_holder.display_name,
      eligibility: "current_holder",
      eligibility_source_id: input.current_holder_source_id,
    });
  }
  if (input.head_self_assignment_authority_id) {
    push({
      person_id: input.head.person_id,
      display_name: input.head.display_name,
      eligibility: "head_self_assignment",
      eligibility_source_id: input.head_self_assignment_authority_id,
    });
  }
  return candidates;
}

export type CourtOsStewardshipResponsibilityV1 = Readonly<{
  responsibility_id: string;
  responsibility_label: string;
  room_id: string;
  room_label: string;
  scopes: readonly CourtOsStewardshipScopeV1[];
}>;

export function buildCourtOsStewardshipRegister(
  responsibilities: readonly CourtOsStewardshipResponsibilityV1[],
): Readonly<{
  responsibilities: readonly CourtOsStewardshipResponsibilityV1[];
  responsibility_count: number;
  scope_count: number;
  duplicate_responsibility_ids: readonly string[];
  invalid_scope_count: number;
}> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  let scopeCount = 0;
  let invalidScopeCount = 0;
  for (const responsibility of responsibilities) {
    if (seen.has(responsibility.responsibility_id)) {
      duplicates.add(responsibility.responsibility_id);
    }
    seen.add(responsibility.responsibility_id);
    for (const scope of responsibility.scopes) {
      if (
        !isCourtOsStewardshipScope(scope) ||
        scope.responsibility_id !== responsibility.responsibility_id ||
        scope.room_id !== responsibility.room_id
      ) {
        invalidScopeCount += 1;
      } else {
        scopeCount += 1;
      }
    }
  }
  return Object.freeze({
    responsibilities: Object.freeze([...responsibilities]),
    responsibility_count: responsibilities.length,
    scope_count: scopeCount,
    duplicate_responsibility_ids: Object.freeze([...duplicates]),
    invalid_scope_count: invalidScopeCount,
  });
}
