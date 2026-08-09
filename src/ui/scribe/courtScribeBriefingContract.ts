/**
 * Reusable CourtOS Scribe boundary for responsibility briefings and later
 * Council/Matter presentation. This is a presentation contract only: it does
 * not create facts, receipts, Matters, actions, or authoritative prose.
 */
export const COURT_SCRIBE_BRIEFING_PACKET_VERSION =
  "courtos_scribe_briefing_packet_v1" as const;

export type CourtScribeBriefingContextV1 =
  | "responsibility_briefing"
  | "council_matter_review";

export type CourtScribeBriefingFactV1 =
  | {
    kind: "accountable_person";
    person_id: string;
    display_name: string;
  }
  | {
    kind: "responsibility_scope";
    scope_id: string;
    scope_label: string;
  }
  | {
    kind: "current_posture";
    posture: "settled" | "watch" | "attention" | "withheld";
  }
  | {
    kind: "prior_cycle_record";
    period: "1117" | "1118" | "1119" | "1117_1119";
    category_code: string;
    quantity?: number;
    unit_code?: string;
  }
  | {
    kind: "matter_record";
    matter_id: string;
    matter_label: string;
    urgency: "routine" | "notable" | "urgent";
    lifecycle_state: "open" | "under_review" | "awaiting_authority";
  };

export interface CourtScribeBriefingClaimV1 {
  claim_id: string;
  status: "confirmed" | "reported";
  fact: CourtScribeBriefingFactV1;
  source_ids: readonly string[];
  source_status: string;
}

export interface CourtScribeBriefingPacketV1 {
  schema_version: typeof COURT_SCRIBE_BRIEFING_PACKET_VERSION;
  request_id: string;
  run_identity: {
    source_generation_id: string;
    effective_date: string;
  };
  actor_context: {
    house_id: string;
    actor_person_id: string;
    authority_basis: string;
    knowledge_lens: "source_bounded_house_records" | "qa_projection";
    responsibility_id: string;
  };
  presentation_context: CourtScribeBriefingContextV1;
  style_card: {
    /** Finite presentation role, never a raw personality or capability trait. */
    role: "responsibility_steward" | "council_adviser";
    cadence: "measured" | "direct" | "deliberative";
    register: "household_account" | "council_review";
  };
  claims: readonly CourtScribeBriefingClaimV1[];
  disclosure_limits: {
    allow_hidden_state: false;
    allow_raw_character_traits: false;
    allow_unadmitted_personal_detail: false;
    require_claim_citations: true;
    preserve_source_status: true;
  };
  output_budget: {
    max_clauses: 5;
  };
}

export type CourtScribeBriefingClauseKindV1 =
  | "speaker_record"
  | "scope_record"
  | "posture_record"
  | "prior_cycle_record"
  | "matter_record";

export interface CourtScribeBriefingClauseV1 {
  kind: CourtScribeBriefingClauseKindV1;
  claim_id: string;
  /** A finite renderer choice—not model-authored words. */
  variant: "plain" | "emphasis" | "transition";
}

export interface CourtScribeBriefingPlanV1 {
  clauses: readonly CourtScribeBriefingClauseV1[];
}

export interface CourtScribeBriefingAdapterV1 {
  brief(packet: CourtScribeBriefingPacketV1): Promise<CourtScribeBriefingPlanV1 | null>;
}

export const unavailableCourtScribeBriefingAdapter: CourtScribeBriefingAdapterV1 = {
  async brief() {
    return null;
  },
};

export function localCourtScribeBriefingAdapterForRuntime(): CourtScribeBriefingAdapterV1 {
  if (typeof window === "undefined" || !window.courtOsScribe) {
    return unavailableCourtScribeBriefingAdapter;
  }
  return {
    brief(packet) {
      return window.courtOsScribe?.briefing(packet) ?? Promise.resolve(null);
    },
  };
}

function objectWithOnlyKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).every((key) => keys.includes(key));
}

function nonEmptyString(value: unknown, maxLength = 256): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isBriefingFact(value: unknown): value is CourtScribeBriefingFactV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const fact = value as Record<string, unknown>;
  if (fact.kind === "accountable_person") {
    return objectWithOnlyKeys(fact, ["kind", "person_id", "display_name"]) &&
      nonEmptyString(fact.person_id) && nonEmptyString(fact.display_name);
  }
  if (fact.kind === "responsibility_scope") {
    return objectWithOnlyKeys(fact, ["kind", "scope_id", "scope_label"]) &&
      nonEmptyString(fact.scope_id) && nonEmptyString(fact.scope_label);
  }
  if (fact.kind === "current_posture") {
    return objectWithOnlyKeys(fact, ["kind", "posture"]) &&
      ["settled", "watch", "attention", "withheld"].includes(String(fact.posture));
  }
  if (fact.kind === "prior_cycle_record") {
    return objectWithOnlyKeys(fact, ["kind", "period", "category_code", "quantity", "unit_code"]) &&
      ["1117", "1118", "1119", "1117_1119"].includes(String(fact.period)) &&
      nonEmptyString(fact.category_code, 96) &&
      (fact.quantity === undefined || typeof fact.quantity === "number") &&
      (fact.unit_code === undefined || nonEmptyString(fact.unit_code, 64));
  }
  if (fact.kind === "matter_record") {
    return objectWithOnlyKeys(fact, ["kind", "matter_id", "matter_label", "urgency", "lifecycle_state"]) &&
      nonEmptyString(fact.matter_id) && nonEmptyString(fact.matter_label) &&
      ["routine", "notable", "urgent"].includes(String(fact.urgency)) &&
      ["open", "under_review", "awaiting_authority"].includes(String(fact.lifecycle_state));
  }
  return false;
}

/** Strict native-host input gate; arbitrary chat/prompt/prose keys fail closed. */
export function isCourtScribeBriefingPacket(
  value: unknown,
): value is CourtScribeBriefingPacketV1 {
  if (!objectWithOnlyKeys(value, [
    "schema_version", "request_id", "run_identity", "actor_context",
    "presentation_context", "style_card", "claims", "disclosure_limits", "output_budget",
  ]) || value.schema_version !== COURT_SCRIBE_BRIEFING_PACKET_VERSION ||
    !nonEmptyString(value.request_id) ||
    !["responsibility_briefing", "council_matter_review"].includes(String(value.presentation_context))) {
    return false;
  }
  const run = value.run_identity;
  const actor = value.actor_context;
  const style = value.style_card;
  const limits = value.disclosure_limits;
  const budget = value.output_budget;
  if (!objectWithOnlyKeys(run, ["source_generation_id", "effective_date"]) ||
    !nonEmptyString(run.source_generation_id) || !nonEmptyString(run.effective_date) ||
    !objectWithOnlyKeys(actor, ["house_id", "actor_person_id", "authority_basis", "knowledge_lens", "responsibility_id"]) ||
    !nonEmptyString(actor.house_id) || !nonEmptyString(actor.actor_person_id) ||
    !nonEmptyString(actor.authority_basis) || !nonEmptyString(actor.responsibility_id) ||
    !["source_bounded_house_records", "qa_projection"].includes(String(actor.knowledge_lens)) ||
    !objectWithOnlyKeys(style, ["role", "cadence", "register"]) ||
    !["responsibility_steward", "council_adviser"].includes(String(style.role)) ||
    !["measured", "direct", "deliberative"].includes(String(style.cadence)) ||
    !["household_account", "council_review"].includes(String(style.register)) ||
    !Array.isArray(value.claims) || value.claims.length < 2 || value.claims.length > 16 ||
    !value.claims.every((claim) => objectWithOnlyKeys(claim, [
      "claim_id", "status", "fact", "source_ids", "source_status",
    ]) && nonEmptyString(claim.claim_id) &&
      ["confirmed", "reported"].includes(String(claim.status)) &&
      isBriefingFact(claim.fact) && Array.isArray(claim.source_ids) &&
      claim.source_ids.length > 0 && claim.source_ids.length <= 8 &&
      claim.source_ids.every((sourceId) => nonEmptyString(sourceId)) &&
      nonEmptyString(claim.source_status)) ||
    !objectWithOnlyKeys(limits, [
      "allow_hidden_state", "allow_raw_character_traits", "allow_unadmitted_personal_detail",
      "require_claim_citations", "preserve_source_status",
    ]) || limits.allow_hidden_state !== false || limits.allow_raw_character_traits !== false ||
    limits.allow_unadmitted_personal_detail !== false || limits.require_claim_citations !== true ||
    limits.preserve_source_status !== true ||
    !objectWithOnlyKeys(budget, ["max_clauses"]) || budget.max_clauses !== 5) {
    return false;
  }
  const packet = value as unknown as CourtScribeBriefingPacketV1;
  const kinds = new Set(packet.claims.map((claim) => claim.fact.kind));
  return requiredKinds(packet.presentation_context)
    .every((kind) => kinds.has(CLAUSE_FACT_KIND[kind]));
}

const CLAUSE_FACT_KIND: Readonly<Record<
  CourtScribeBriefingClauseKindV1,
  CourtScribeBriefingFactV1["kind"]
>> = {
  speaker_record: "accountable_person",
  scope_record: "responsibility_scope",
  posture_record: "current_posture",
  prior_cycle_record: "prior_cycle_record",
  matter_record: "matter_record",
};

function isBriefingClauseKind(value: unknown): value is CourtScribeBriefingClauseKindV1 {
  return typeof value === "string" && Object.hasOwn(CLAUSE_FACT_KIND, value);
}

function requiredKinds(
  context: CourtScribeBriefingContextV1,
): readonly CourtScribeBriefingClauseKindV1[] {
  return context === "council_matter_review"
    ? ["speaker_record", "matter_record"]
    : ["speaker_record", "scope_record"];
}

/**
 * Validates a finite claim-selection plan. The model cannot supply prose,
 * values, actions, questions, or new IDs; every clause must cite one admitted
 * compatible claim already present in the packet.
 */
export function validateCourtScribeBriefingPlan(
  packet: CourtScribeBriefingPacketV1,
  plan: CourtScribeBriefingPlanV1,
): { ok: true } | { ok: false; reason: string } {
  if (!plan || typeof plan !== "object" || Array.isArray(plan) ||
    Object.keys(plan).some((key) => key !== "clauses") ||
    !Array.isArray(plan.clauses)) {
    return { ok: false, reason: "malformed plan envelope" };
  }
  if (plan.clauses.length < 2 || plan.clauses.length > packet.output_budget.max_clauses) {
    return { ok: false, reason: "clause count" };
  }
  const claimById = new Map(packet.claims.map((claim) => [claim.claim_id, claim]));
  const usedClaims = new Set<string>();
  for (const clause of plan.clauses) {
    if (!clause || typeof clause !== "object" || Array.isArray(clause) ||
      Object.keys(clause).some((key) => !["kind", "claim_id", "variant"].includes(key))) {
      return { ok: false, reason: "malformed clause" };
    }
    const clauseKind: unknown = clause.kind;
    const claimId: unknown = clause.claim_id;
    const variant: unknown = clause.variant;
    if (!isBriefingClauseKind(clauseKind) || typeof claimId !== "string" ||
      typeof variant !== "string" || !["plain", "emphasis", "transition"].includes(variant)) {
      return { ok: false, reason: "malformed clause" };
    }
    if (usedClaims.has(claimId)) return { ok: false, reason: "duplicate claim" };
    usedClaims.add(claimId);
    const claim = claimById.get(claimId);
    if (!claim || claim.fact.kind !== CLAUSE_FACT_KIND[clauseKind]) {
      return { ok: false, reason: "claim or clause mismatch" };
    }
  }
  for (const kind of requiredKinds(packet.presentation_context)) {
    if (!plan.clauses.some((clause) => clause.kind === kind)) {
      return { ok: false, reason: `required ${kind} absent` };
    }
  }
  if (packet.presentation_context === "responsibility_briefing" &&
    plan.clauses.some((clause) => clause.kind === "matter_record")) {
    return { ok: false, reason: "matter clause outside Council review" };
  }
  return { ok: true };
}

export function deterministicCourtScribeBriefingPlan(
  packet: CourtScribeBriefingPacketV1,
): CourtScribeBriefingPlanV1 {
  const desiredKinds: readonly CourtScribeBriefingClauseKindV1[] =
    packet.presentation_context === "council_matter_review"
      ? ["speaker_record", "matter_record", "posture_record", "prior_cycle_record"]
      : ["speaker_record", "scope_record", "posture_record", "prior_cycle_record"];
  const clauses: CourtScribeBriefingClauseV1[] = [];
  for (const kind of desiredKinds) {
    const claim = packet.claims.find((candidate) =>
      candidate.fact.kind === CLAUSE_FACT_KIND[kind],
    );
    if (claim) clauses.push({ kind, claim_id: claim.claim_id, variant: "plain" });
  }
  return { clauses: clauses.slice(0, packet.output_budget.max_clauses) };
}

export interface CourtScribeBriefingResultV1 {
  mode: "generated" | "fallback";
  prose: string;
  cited_claim_ids: readonly string[];
}

function controlledPeriodLabel(period: Extract<
  CourtScribeBriefingFactV1,
  { kind: "prior_cycle_record" }
>["period"]): string {
  return period === "1117_1119" ? "1117–1119" : period;
}

function renderBriefingClause(
  packet: CourtScribeBriefingPacketV1,
  clause: CourtScribeBriefingClauseV1,
): string {
  const claim = packet.claims.find((candidate) => candidate.claim_id === clause.claim_id);
  if (!claim || claim.fact.kind !== CLAUSE_FACT_KIND[clause.kind]) {
    throw new Error("CourtOS Scribe refused an uncited or mismatched briefing clause");
  }
  const reportedPrefix = claim.status === "reported" ? "The responsible account reports that " : "";
  const emphasisPrefix = clause.variant === "emphasis" ? "Of note, " : "";
  const transitionPrefix = clause.variant === "transition" ? "In the retained account, " : "";
  const prefix = `${emphasisPrefix}${transitionPrefix}${reportedPrefix}`;
  const lead = (text: string): string => prefix
    ? `${prefix}${text}`
    : `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
  if (claim.fact.kind === "accountable_person") {
    return `${lead(claim.fact.display_name)} brings this account before the Head.`;
  }
  if (claim.fact.kind === "responsibility_scope") {
    return `${lead("the charge extends across")} ${claim.fact.scope_label}.`;
  }
  if (claim.fact.kind === "current_posture") {
    const postureText: Record<typeof claim.fact.posture, string> = {
      settled: "the current record marks the work as settled",
      watch: "the current record marks the work for watch",
      attention: "the current record marks the work for attention",
      withheld: "the House papers contain no verified present charge",
    };
    return `${lead(postureText[claim.fact.posture])}.`;
  }
  if (claim.fact.kind === "prior_cycle_record") {
    // Category codes and quantities remain structured facts. The generic
    // renderer does not guess domain vocabulary or turn a posting/report into
    // an asserted event; domain renderers may later opt into controlled labels.
    return `${lead("the retained papers include")} a ${controlledPeriodLabel(claim.fact.period)} prior-cycle record.`;
  }
  const urgency = claim.fact.urgency === "routine"
    ? "routine"
    : claim.fact.urgency === "notable" ? "notable" : "urgent";
  const lifecycle = claim.fact.lifecycle_state === "open"
    ? "open"
    : claim.fact.lifecycle_state === "under_review" ? "under review" : "awaiting authority";
  return `${lead("the Council docket names")} ${claim.fact.matter_label} as a ${urgency} Matter, ${lifecycle}.`;
}

/** Player language is assembled only from validated typed claims and templates. */
export function renderCourtScribeBriefingPlan(
  packet: CourtScribeBriefingPacketV1,
  plan: CourtScribeBriefingPlanV1,
): string {
  const validation = validateCourtScribeBriefingPlan(packet, plan);
  if (!validation.ok) {
    throw new Error(`CourtOS Scribe refused briefing plan: ${validation.reason}`);
  }
  return plan.clauses.map((clause) => renderBriefingClause(packet, clause)).join(" ");
}

export async function resolveCourtScribeBriefing(input: {
  packet: CourtScribeBriefingPacketV1;
  adapter: CourtScribeBriefingAdapterV1;
}): Promise<CourtScribeBriefingResultV1> {
  const generated = await input.adapter.brief(input.packet).catch(() => null);
  if (generated && validateCourtScribeBriefingPlan(input.packet, generated).ok) {
    return {
      mode: "generated",
      prose: renderCourtScribeBriefingPlan(input.packet, generated),
      cited_claim_ids: generated.clauses.map((clause) => clause.claim_id),
    };
  }
  const fallback = deterministicCourtScribeBriefingPlan(input.packet);
  const validation = validateCourtScribeBriefingPlan(input.packet, fallback);
  if (!validation.ok) {
    throw new Error(`CourtOS Scribe briefing withheld: ${validation.reason}`);
  }
  return {
    mode: "fallback",
    prose: renderCourtScribeBriefingPlan(input.packet, fallback),
    cited_claim_ids: fallback.clauses.map((clause) => clause.claim_id),
  };
}
