import type { CourtOsSessionContextV1 } from "../../courtosSessionContext";
import type {
  Household1120EconomicActivityLookbackRow,
  Household1120ReadOnlyProjection,
  Household1120ResponsibilityRow,
  Household1120StoresPositionRow,
} from "../readModels/household1120/types";
import type { CourtScribeRuntimeTelemetryV1 } from "./courtScribeRuntime";
import type {
  CourtScribeBriefingPacketV1,
  CourtScribeBriefingPlanV1,
} from "./courtScribeBriefingContract";

/**
 * CourtOS Scribe's financial pilot boundary.  This module deliberately has no
 * fetch, SQLite, filesystem, or model-runtime dependency: callers can hand a
 * local Scribe host only the compact request constructed below.
 */
export const COURT_SCRIBE_FISCAL_PACKET_VERSION =
  "courtos_scribe_fiscal_brief_packet_v1" as const;

export type CourtScribeClaimStatus = "confirmed" | "reported" | "candidate";

export interface CourtScribeFiscalClaimV1 {
  claim_id: string;
  status: CourtScribeClaimStatus;
  /** Compact semantic fact fields, never player-facing prose or a receipt. */
  fact: {
    kind: "accountable_steward" | "opening_position" | "prior_cycle_posting";
    subject_label?: string;
    resource_id?: string;
    quantity?: number;
    activity_year?: number;
    flow_family?: string;
    direction?: string;
  };
  numeric_values: readonly number[];
  source_ids: readonly string[];
  source_status: string;
}

export interface CourtScribeFiscalBriefRequestV1 {
  schema_version: typeof COURT_SCRIBE_FISCAL_PACKET_VERSION;
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
    responsibility: "house_fiscal_administration";
  };
  task: "briefing";
  style_card: {
    role: "house_fiscal_steward";
    voice: "measured_household_account";
  };
  confirmed: readonly CourtScribeFiscalClaimV1[];
  reported: readonly CourtScribeFiscalClaimV1[];
  allowed_assessments: readonly [];
  allowed_action_ids: readonly [];
  allowed_query_kinds: readonly [];
  disclosure_limits: {
    allow_counterparty_identity: false;
    allow_personal_financial_detail: false;
    allow_hidden_state: false;
    require_claim_citations: true;
    preserve_source_status: true;
  };
  output_budget: {
    min_words: 60;
    max_words: 180;
  };
}

export interface CourtScribeFiscalBriefResponseV1 {
  /**
   * The native model may select an ordered, finite set of typed clauses. It
   * never returns player-visible prose. CourtOS renders every clause from the
   * packet below, keeping claim-level provenance and language deterministic.
   */
  clauses: readonly CourtScribeFiscalClauseV1[];
}

export type CourtScribeFiscalClauseKindV1 =
  | "steward_record"
  | "opening_position_record"
  | "prior_cycle_posting_record";

export interface CourtScribeFiscalClauseV1 {
  kind: CourtScribeFiscalClauseKindV1;
  /** Required claim-level citation; must be compatible with `kind`. */
  claim_id: string;
}

export interface CourtScribeLocalAdapterV1 {
  /**
   * A native/local host owns this call in production.  It receives the
   * bounded packet only; it never receives a database handle or a generic
   * query capability.
   */
  brief(
    request: CourtScribeFiscalBriefRequestV1,
  ): Promise<CourtScribeFiscalBriefResponseV1 | null>;
}

export const unavailableLocalCourtScribeAdapter: CourtScribeLocalAdapterV1 = {
  async brief() {
    return null;
  },
};

declare global {
  interface Window {
    /** Narrow desktop preload bridge; intentionally not a general model API. */
    courtOsScribe?: {
      fiscalBrief(
        request: CourtScribeFiscalBriefRequestV1,
      ): Promise<CourtScribeFiscalBriefResponseV1 | null>;
      briefing(request: CourtScribeBriefingPacketV1): Promise<CourtScribeBriefingPlanV1 | null>;
      warm(): Promise<boolean>;
      status(): Promise<CourtScribeRuntimeTelemetryV1>;
    };
  }
}

/**
 * The desktop preload layer may install this one-method bridge. There is no
 * browser network fallback, no free-form prompt channel, and no ambient model
 * or data handle when it is unavailable.
 */
export function localCourtScribeAdapterForRuntime(): CourtScribeLocalAdapterV1 {
  if (typeof window === "undefined" || !window.courtOsScribe) {
    return unavailableLocalCourtScribeAdapter;
  }
  return {
    brief(request) {
      return window.courtOsScribe?.fiscalBrief(request) ?? Promise.resolve(null);
    },
  };
}

export type CourtScribeFiscalBriefResultV1 = {
  mode: "generated" | "fallback";
  prose: string;
  cited_claim_ids: readonly string[];
};

function stableNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function fiscalHousePositions(
  projection: Household1120ReadOnlyProjection,
): readonly Household1120StoresPositionRow[] {
  const positions = projection.stores_positions.filter(
    (position) => position.position_kind === "house_position",
  );
  return positions.length > 0
    ? positions
    : projection.stores_positions.filter(
      (position) => !position.manor_id && position.position_kind !== "food_capacity",
    );
}

function fiscalAuthority(
  projection: Household1120ReadOnlyProjection,
): Household1120ResponsibilityRow | null {
  return projection.responsibility_summary.find(
    (row) =>
      row.source_legacy_responsibility_id ===
      "courtos.responsibility.house_fiscal_administration",
  ) ?? null;
}

function movementOrder(
  left: Household1120EconomicActivityLookbackRow,
  right: Household1120EconomicActivityLookbackRow,
): number {
  return Math.abs(right.signed_amount) - Math.abs(left.signed_amount) ||
    left.source_economic_leg_id.localeCompare(right.source_economic_leg_id);
}

function scopeError(message: string): never {
  throw new Error(`CourtOS Scribe fiscal packet withheld: ${message}`);
}

/**
 * Compiles an intentionally small financial briefing packet from the existing
 * House-scoped read model. It rejects before a model is called if the
 * projection, House session, actor, or fiscal authority do not agree.
 */
export function compileCourtScribeFiscalBriefRequest(input: {
  projection: Household1120ReadOnlyProjection;
  session: CourtOsSessionContextV1;
}): CourtScribeFiscalBriefRequestV1 {
  const { projection, session } = input;
  if (projection.query.house_id !== session.selected_house_id) {
    return scopeError("projection House does not match the current CourtOS session");
  }
  if (session.acting_actor.status !== "house_head" || !session.acting_actor.person_id) {
    return scopeError("no source-resolved acting Head may receive this briefing");
  }
  if (!session.capabilities.inspect_house_records) {
    return scopeError("House record inspection is not permitted in this session");
  }
  const authority = fiscalAuthority(projection);
  if (!authority || authority.holder_person_id === null || authority.holder_display_name === null) {
    return scopeError("the House fiscal responsibility has no named accountable steward");
  }

  const confirmed: CourtScribeFiscalClaimV1[] = [
    {
      claim_id: "fiscal:steward",
      status: "confirmed",
      fact: {
        kind: "accountable_steward",
        subject_label: authority.holder_display_name,
      },
      numeric_values: [],
      source_ids: [authority.responsibility_summary_id],
      source_status: authority.authority_posture,
    },
    ...fiscalHousePositions(projection)
      .filter((position) => position.quantity_integer !== null)
      .slice(0, 8)
      .map((position) => ({
        claim_id: `fiscal:position:${position.stores_position_id}`,
        status: "confirmed" as const,
        fact: {
          kind: "opening_position" as const,
          resource_id: position.resource_id,
          quantity: position.quantity_integer ?? 0,
        },
        numeric_values: [position.quantity_integer ?? 0],
        source_ids: [position.stores_position_id],
        source_status: position.position_state,
      })),
  ];
  const reported: CourtScribeFiscalClaimV1[] = projection.economic_activity_lookback
    .slice()
    .sort(movementOrder)
    .slice(0, 8)
    .map((movement) => ({
      claim_id: `fiscal:lookback:${movement.activity_id}`,
      status: "reported" as const,
      fact: {
        kind: "prior_cycle_posting" as const,
        resource_id: movement.resource_id,
        quantity: movement.signed_amount,
        activity_year: movement.activity_year,
        flow_family: movement.flow_family,
        direction: movement.direction,
      },
      numeric_values: [movement.activity_year, movement.signed_amount],
      source_ids: [movement.source_economic_leg_id],
      source_status: movement.evidence_status,
    }));
  if (confirmed.length < 2) {
    return scopeError("no opening fiscal position is available for this House");
  }

  const generation = projection.contract.generation_id;
  return {
    schema_version: COURT_SCRIBE_FISCAL_PACKET_VERSION,
    request_id: [
      "fiscal-brief",
      projection.query.house_id,
      session.acting_actor.person_id,
      generation,
      projection.contract.effective_date,
    ].join(":"),
    run_identity: {
      source_generation_id: generation,
      effective_date: projection.contract.effective_date,
    },
    actor_context: {
      house_id: projection.query.house_id,
      actor_person_id: session.acting_actor.person_id,
      authority_basis: session.acting_actor.authority_basis,
      knowledge_lens: session.knowledge.lens,
      responsibility: "house_fiscal_administration",
    },
    task: "briefing",
    style_card: {
      role: "house_fiscal_steward",
      voice: "measured_household_account",
    },
    confirmed,
    reported,
    allowed_assessments: [],
    allowed_action_ids: [],
    allowed_query_kinds: [],
    disclosure_limits: {
      allow_counterparty_identity: false,
      allow_personal_financial_detail: false,
      allow_hidden_state: false,
      require_claim_citations: true,
      preserve_source_status: true,
    },
    output_budget: { min_words: 60, max_words: 180 },
  };
}

/**
 * Defence in depth for deterministic renderer text. No SLM prose is accepted
 * anywhere in this pilot; keeping this guard beside the templates prevents a
 * future template edit from accidentally turning a position/posting into a
 * world-event assertion.
 */
const FORBIDDEN_FISCAL_WORLD_EFFECT = /\b(?:receiv(?:e|ed|es|ing)|pay(?:s|ing|ment|ments|able)?|paid|transfer(?:red|s|ring)?|settle(?:d|s|ment|ments|ing)?|approv(?:e|ed|al|als|ing)|execut(?:e|ed|es|ing|ion)|purchas(?:e|ed|es|ing)|buy|bought|sell|sold|deliver(?:ed|s|ing|y|ies)|ship(?:ped|s|ping)?|collect(?:ed|s|ing|ion)|consum(?:e|ed|es|ing|ption)|borrow(?:ed|s|ing)|lend(?:ing|s|ed)|loan(?:ed|s|ing)?|owe(?:d|s|ing)?|build(?:s|ing|t|ed)?|repair(?:ed|s|ing)?|improv(?:e|ed|es|ing|ement|ements)|award(?:ed|s|ing)?|grant(?:ed|s|ing)?|contract(?:ed|s|ing)?|hire(?:d|s|ing)?|dismiss(?:ed|es|ing)?|appoint(?:ed|s|ing)?|order(?:ed|s|ing)?|command(?:ed|s|ing)?|pledge(?:d|s|ing)?|promise(?:d|s|ing)?|breach(?:ed|es|ing)?|default(?:ed|s|ing)?|fail(?:ed|s|ing)?|succeed(?:ed|s|ing)?|profit(?:ed|s|ing)?|loss|lost|gain(?:ed|s|ing)?|spend(?:s|ing|t)?|withdraw(?:n|s|ing)?|deposit(?:ed|s|ing)?|mov(?:e|ed|es|ing|ement|ements))\b/i;

function claimForClause(
  request: CourtScribeFiscalBriefRequestV1,
  clause: CourtScribeFiscalClauseV1,
): CourtScribeFiscalClaimV1 | null {
  const claim = [...request.confirmed, ...request.reported]
    .find((candidate) => candidate.claim_id === clause.claim_id) ?? null;
  if (!claim || claim.status === "candidate") return null;
  if (clause.kind === "steward_record") {
    return claim.status === "confirmed" && claim.fact.kind === "accountable_steward"
      ? claim : null;
  }
  if (clause.kind === "opening_position_record") {
    return claim.status === "confirmed" && claim.fact.kind === "opening_position"
      ? claim : null;
  }
  return claim.status === "reported" && claim.fact.kind === "prior_cycle_posting"
    ? claim : null;
}

/**
 * A response is a finite, claim-cited sentence plan—not player prose. This
 * makes semantic grounding mechanical: every selected clause has exactly one
 * compatible structured claim, and CourtOS owns the rendered wording.
 */
export function validateCourtScribeFiscalBriefResponse(
  request: CourtScribeFiscalBriefRequestV1,
  response: CourtScribeFiscalBriefResponseV1,
): { ok: true } | { ok: false; reason: string } {
  if (!response || typeof response !== "object" ||
    Object.keys(response).some((key) => key !== "clauses") || !Array.isArray(response.clauses)) {
    return { ok: false, reason: "malformed response envelope" };
  }
  if (response.clauses.length < 2 || response.clauses.length > 5) {
    return { ok: false, reason: "clause count" };
  }
  const keys = new Set<string>();
  for (const clause of response.clauses) {
    if (!clause || typeof clause !== "object" ||
      Object.keys(clause).some((key) => key !== "kind" && key !== "claim_id") ||
      !["steward_record", "opening_position_record", "prior_cycle_posting_record"].includes(clause.kind) ||
      typeof clause.claim_id !== "string") return { ok: false, reason: "malformed clause" };
    const key = `${clause.kind}:${clause.claim_id}`;
    if (keys.has(key)) return { ok: false, reason: "duplicate clause" };
    keys.add(key);
    if (!claimForClause(request, clause)) return { ok: false, reason: "claim or clause mismatch" };
  }
  if (!response.clauses.some((clause) => clause.kind === "steward_record") ||
    !response.clauses.some((clause) => clause.kind === "opening_position_record")) {
    return { ok: false, reason: "required fiscal clause absent" };
  }
  return { ok: true };
}

function renderFiscalClause(
  request: CourtScribeFiscalBriefRequestV1,
  clause: CourtScribeFiscalClauseV1,
): string {
  const claim = claimForClause(request, clause);
  if (!claim) throw new Error("CourtOS Scribe attempted to render an invalid fiscal clause");
  // The renderer recognizes the small resource vocabulary that this fiscal
  // pilot admits. Unknown resource IDs are deliberately generalized rather
  // than being echoed into the player-facing layer.
  const resourceLabel = (() => {
    switch (claim.fact.resource_id) {
      case "coin": return "coin";
      case "food": return "food";
      case "building_materials": return "building materials";
      case "craft_goods": return "craft goods";
      case "minerals": return "minerals";
      default: return "recorded House resources";
    }
  })();
  const directionLabel = claim.fact.direction === "inflow" || claim.fact.direction === "outflow"
    ? claim.fact.direction
    : "classified";
  let template: string;
  let replacements: Record<string, string>;
  if (clause.kind === "steward_record") {
    template = "__subject__ is the recorded House fiscal steward.";
    replacements = { "__subject__": claim.fact.subject_label ?? "The named steward" };
  } else if (clause.kind === "opening_position_record") {
    template = "The opening House position records __quantity__ __resource__.";
    replacements = {
      "__quantity__": stableNumber(claim.fact.quantity ?? 0),
      "__resource__": resourceLabel,
    };
  } else {
    // `flow_family` is an accounting classification, not an assertion that the
    // underlying transaction happened. Some valid classifications (for
    // example, `tax_collection`) also contain event verbs. Keep this briefing
    // at its intended grain: a recorded prior-cycle posting, never a narrated
    // settlement, collection, purchase, or delivery.
    template = "The account papers retain a recorded __year__ __direction__ posting of __quantity__ __resource__.";
    replacements = {
      "__year__": String(claim.fact.activity_year ?? "the prior cycle"),
      "__direction__": directionLabel,
      "__quantity__": stableNumber(claim.fact.quantity ?? 0),
      "__resource__": resourceLabel,
    };
  }
  // Inspect only the fixed template. Source-grounded names and controlled
  // resource labels are values, not model-authored event assertions; scanning
  // their letters would falsely reject valid labels such as “building
  // materials.”
  const worldEffect = template.match(FORBIDDEN_FISCAL_WORLD_EFFECT)?.[0] ?? null;
  if (worldEffect) {
    throw new Error("CourtOS Scribe renderer rejected a world-effect assertion");
  }
  return Object.entries(replacements).reduce(
    (sentence, [placeholder, replacement]) => sentence.replace(placeholder, replacement),
    template,
  );
}

export function renderCourtScribeFiscalClausePlan(
  request: CourtScribeFiscalBriefRequestV1,
  clauses: readonly CourtScribeFiscalClauseV1[],
): string {
  return clauses.map((clause) => renderFiscalClause(request, clause)).join(" ");
}

/** The non-SLM baseline derives exclusively from the same approved packet. */
export function deterministicCourtScribeFiscalBrief(
  request: CourtScribeFiscalBriefRequestV1,
): CourtScribeFiscalBriefResultV1 {
  const steward = request.confirmed.find((claim) =>
    claim.status === "confirmed" && claim.fact.kind === "accountable_steward",
  );
  const position = request.confirmed.find((claim) =>
    claim.status === "confirmed" && claim.fact.kind === "opening_position",
  );
  const posting = request.reported.find((claim) =>
    claim.status === "reported" && claim.fact.kind === "prior_cycle_posting",
  );
  if (!steward || !position) {
    throw new Error("CourtOS Scribe fiscal fallback requires a steward and opening position");
  }
  const clauses: CourtScribeFiscalClauseV1[] = [
    { kind: "steward_record", claim_id: steward.claim_id },
    { kind: "opening_position_record", claim_id: position.claim_id },
    ...(posting ? [{ kind: "prior_cycle_posting_record" as const, claim_id: posting.claim_id }] : []),
  ];
  return {
    mode: "fallback",
    prose: renderCourtScribeFiscalClausePlan(request, clauses),
    cited_claim_ids: clauses.map((clause) => clause.claim_id),
  };
}

export async function resolveCourtScribeFiscalBrief(input: {
  request: CourtScribeFiscalBriefRequestV1;
  adapter: CourtScribeLocalAdapterV1;
}): Promise<CourtScribeFiscalBriefResultV1> {
  const response = await input.adapter.brief(input.request).catch(() => null);
  if (response) {
    const validation = validateCourtScribeFiscalBriefResponse(input.request, response);
    if (validation.ok) {
      return {
        mode: "generated",
        prose: renderCourtScribeFiscalClausePlan(input.request, response.clauses),
        cited_claim_ids: response.clauses.map((clause) => clause.claim_id),
      };
    }
  }
  return deterministicCourtScribeFiscalBrief(input.request);
}
