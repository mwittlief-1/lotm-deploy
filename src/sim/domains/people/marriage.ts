import { registryPersonFor, resolveCurrentHouseHeadId, structuredHouseIdForPerson } from "../../actors";
import { addCourtExcludeId, addCourtExtraId, removeCourtExcludeId } from "../../court";
import { chargeCourtDecisionBudget } from "../court/decisionBudget";
import { resolveCourtDelegationEntry, resolveDelegatedBudgetCost } from "../court/delegationRegistry";
import { canSpendEnergy, spendEnergy } from "../court/energy";
import { applyCoinDelta, canAffordCoin, spendCoin } from "../economy/ledger";
import { isReserved, listEligibleCandidates } from "../../marriageMarket";
import { Rng } from "../../rng";
import type { TierSets } from "../../tiers";
import type { MarriageOffer, MarriageWindow, Person, RunState, TurnContext, TurnDecisions } from "../../types";
import { clampInt } from "../../util";
import { getLivingSpouse } from "../../kinship";
import { makeEvidenceEvent, recordRuntimeDomainEvidence } from "../ai/evidence";
import { buildPolicyIntelMap, npcPolicyScore } from "../ai/policy";
import { buildMarriageRejectCooldownsFromState, makeMarriageOfferPairingKey } from "./marriageOfferRegistry";
import { buildKnownHouseRelevanceSnapshot, listRelevantTier1HouseIds } from "./knownHouseRelevance";
import { applyRelationshipDelta, readRelationshipVector, relationshipFavorScore } from "./relationshipEngine";
import { ensureResidenceManorBindings } from "./residenceManorRegistry";
import { resolveActionScope, type WorldActionScopeResolutionV1, type WorldScopeCapBucketV1 } from "../world";

const MARRIAGE_INBOUND_DECISION_COST = 1;
const MARRIAGE_SCOUT_DECISION_COST = 2;
const MARRIAGE_SCOUT_MIN_DELEGATED_COST = 1;
export const OUTBOUND_MARRIAGE_SCOUTING_REGISTRY_SCHEMA_VERSION = "outbound_marriage_scouting_registry_v1" as const;
export const OUTBOUND_MARRIAGE_SCOUTING_ENTRY_SCHEMA_VERSION = "outbound_marriage_scouting_candidate_v1" as const;
const OUTBOUND_MARRIAGE_SCOUTING_SHOW_LIMIT = 12;
const OUTBOUND_MARRIAGE_SCOUTING_HELD_OUT_LIMIT = 12;
const OUTBOUND_MARRIAGE_SCOUTING_MIN_AGE = 15;
const OUTBOUND_MARRIAGE_SCOUTING_MAX_AGE = 45;
const SPOUSE_EDGE_A_KEYS = ["a_id", "from_person_id", "from", "a"] as const;
const SPOUSE_EDGE_B_KEYS = ["b_id", "to_person_id", "to", "b"] as const;

export type OutboundMarriageScoutingScopeStatus = "admitted" | "rejected" | "unmapped";

export type OutboundMarriageScoutingCandidateEntry = {
  schema_version: typeof OUTBOUND_MARRIAGE_SCOUTING_ENTRY_SCHEMA_VERSION;
  candidate_person_id: string;
  candidate_person_name: string;
  candidate_house_id: string | null;
  candidate_house_name: string | null;
  residence_manor_id: string | null;
  scope_status: OutboundMarriageScoutingScopeStatus;
  scope_bucket: WorldScopeCapBucketV1 | null;
  selector_contexts: string[];
  travel_cost_distance: number | null;
  route_hop_distance: number | null;
  distance_band: "near" | "far" | null;
  ranking_score: number;
  rank_group: "shown" | "held_out";
  match_ready: boolean;
  include_reasons: string[];
  exclude_reasons: string[];
  relevance_reasons: string[];
};

export type OutboundMarriageScoutingRegistry = {
  schema_version: typeof OUTBOUND_MARRIAGE_SCOUTING_REGISTRY_SCHEMA_VERSION;
  generated_at_turn_index: number;
  subject_person_id: string;
  subject_house_id: string | null;
  anchor_manor_id: string | null;
  scope_mode: string;
  admitted_manor_ids: string[];
  rejected_manor_ids: string[];
  candidate_ids: string[];
  shown_candidate_ids: string[];
  held_out_candidate_ids: string[];
  total_candidates_considered: number;
  total_shown_candidates: number;
  total_held_out_candidates: number;
  entries_by_candidate_id: Record<string, OutboundMarriageScoutingCandidateEntry>;
};

type OutboundMarriageScoutingBuildOptions = {
  action_scope?: WorldActionScopeResolutionV1 | null;
  residence_selector_summary?: ReturnType<typeof ensureResidenceManorBindings>["selector_summary"];
  subject_person_id?: string | null;
  tierSets?: TierSets | null;
};

function modsObj(state: RunState): Record<string, number> {
  const anyFlags: any = state.flags;
  if (!anyFlags._mods || typeof anyFlags._mods !== "object") anyFlags._mods = {};
  return anyFlags._mods as Record<string, number>;
}

function attachHiddenSurface(target: object | null | undefined, key: string, value: unknown): void {
  if (!target || typeof target !== "object") return;
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    writable: true,
    configurable: true,
  });
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function sortStrings(values: Iterable<string>): string[] {
  return [...values].sort(compareText);
}

function normalizeOptionalId(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function readHouseNameForCandidate(state: RunState, houseId: string | null): string | null {
  if (!houseId) return null;
  const house = (state as any)?.houses?.[houseId];
  if (!house || typeof house !== "object") return houseId;
  const raw =
    typeof house.house_name === "string"
      ? house.house_name
      : typeof house.houseName === "string"
        ? house.houseName
        : typeof house.name === "string"
          ? house.name
          : houseId;
  const normalized = String(raw ?? "").trim();
  return normalized.length > 0 ? normalized : houseId;
}

export function resolveMarriageScoutDecisionCost(state: RunState): number {
  const entry = resolveCourtDelegationEntry(state, "marriage_scout");
  if (!entry.delegated) return MARRIAGE_SCOUT_DECISION_COST;
  return Math.max(
    MARRIAGE_SCOUT_MIN_DELEGATED_COST,
    resolveDelegatedBudgetCost(MARRIAGE_SCOUT_DECISION_COST, entry)
  );
}

function reserveMarriageDecisionBudget(state: RunState, action: "scout" | "inbound"): boolean {
  if (action === "scout") {
    return chargeCourtDecisionBudget(state, "marriage_scout", resolveMarriageScoutDecisionCost(state)).applied;
  }
  return chargeCourtDecisionBudget(state, "marriage_inbound", MARRIAGE_INBOUND_DECISION_COST).applied;
}

function marriageWindowSubjectIds(marriageWindow: MarriageWindow | null | undefined): string[] {
  if (!marriageWindow) return [];
  return [
    ...new Set(
      [...marriageWindow.eligible_child_ids, ...marriageWindow.offers.map((offer) => offer.house_person_id)]
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  ].sort((a, b) => a.localeCompare(b));
}

function recordMarriageFlowEvidence(
  state: RunState,
  kind: string,
  detail: string,
  subjectIds: Array<string | null | undefined>
): void {
  recordRuntimeDomainEvidence(state, "marriage", [
    makeEvidenceEvent({
      kind,
      detail,
      category: "marriage",
      subject_ids: subjectIds
    })
  ]);
}

export function ensureMarriageKinshipEdge(state: RunState, aId: string, bId: string): void {
  if (!aId || !bId || aId === bId) return;
  const anyState: any = state as any;
  anyState.kinship_edges = (anyState.kinship_edges ?? []) as any[];
  const edges = anyState.kinship_edges as any[];
  const exists = edges.some(
    (edge) =>
      edge?.kind === "spouse_of" &&
      ((edge.a_id === aId && edge.b_id === bId) || (edge.a_id === bId && edge.b_id === aId))
  );
  if (!exists) edges.push({ kind: "spouse_of", a_id: aId, b_id: bId });
}

function readEdgeIdByKeys(edge: any, keys: readonly string[]): string | null {
  if (!edge || typeof edge !== "object") return null;
  for (const key of keys) {
    const value = edge[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function spouseEdgeEndpoints(edge: any): { a: string | null; b: string | null } {
  if (!edge || typeof edge !== "object" || edge.kind !== "spouse_of") return { a: null, b: null };
  return {
    a: readEdgeIdByKeys(edge, SPOUSE_EDGE_A_KEYS),
    b: readEdgeIdByKeys(edge, SPOUSE_EDGE_B_KEYS),
  };
}

function spouseEdgeIsActive(edge: any): boolean {
  if (!edge || typeof edge !== "object") return false;
  if (edge.is_active === false) return false;
  if (edge.end_turn_index != null) return false;
  if (edge.ended_turn_index != null) return false;
  if (edge.end_turn != null) return false;
  if (edge.ended_turn != null) return false;
  if (edge.end_year != null) return false;
  if (edge.ended_year != null) return false;
  return true;
}

function hasActiveSpouseEdge(state: RunState, personId: string): boolean {
  const edges = Array.isArray((state as any).kinship_edges) ? ((state as any).kinship_edges as any[]) : [];
  for (const edge of edges) {
    if (!spouseEdgeIsActive(edge)) continue;
    const { a, b } = spouseEdgeEndpoints(edge);
    if (a === personId || b === personId) return true;
  }
  return false;
}

function householdWidowMarkerApplies(state: RunState, personId: string): boolean {
  if (state.house.spouse_status !== "widow") return false;
  if (personId === state.house.head.id && state.house.head.alive && !getLivingSpouse(state as any, personId)) return true;
  if (state.house.spouse?.id === personId && state.house.spouse.alive && !getLivingSpouse(state as any, personId)) return true;
  return false;
}

function canSeekMarriage(state: RunState, person: Person | undefined | null): boolean {
  if (!person || !person.alive || person.age < 15) return false;
  if (getLivingSpouse(state as any, person.id)) return false;
  if (!person.married) return true;
  if (householdWidowMarkerApplies(state, person.id)) return true;
  return hasActiveSpouseEdge(state, person.id);
}

function collectMarriageEligibleSubjects(state: RunState): Person[] {
  const eligibleAll: Person[] = [];
  const pushEligible = (person: Person | undefined | null) => {
    if (!canSeekMarriage(state, person)) return;
    if (eligibleAll.some((candidate) => candidate.id === person.id)) return;
    eligibleAll.push(person);
  };

  pushEligible(state.house.head);
  for (const child of state.house.children) pushEligible(child);
  return eligibleAll;
}

function selectMarriageSubject(state: RunState): Person | null {
  const eligibleAll = collectMarriageEligibleSubjects(state);
  if (eligibleAll.length === 0) return null;
  return [...eligibleAll].sort((a, b) => (b.age - a.age) || a.id.localeCompare(b.id))[0] ?? null;
}

function marriageScoutScopeWeight(
  scopeStatus: OutboundMarriageScoutingScopeStatus,
  scopeBucket: WorldScopeCapBucketV1 | null
): number {
  if (scopeStatus === "rejected") return -1000;
  if (scopeStatus === "unmapped") return 80;
  if (scopeBucket === "kinship") return 500;
  if (scopeBucket === "territorial_adjacent") return 420;
  if (scopeBucket === "route_adjacent") return 340;
  if (scopeBucket === "near") return 260;
  if (scopeBucket === "far") return 180;
  return 120;
}

function marriageScoutRelevanceBonus(reasons: string[]): number {
  let bonus = 0;
  for (const reason of reasons) {
    if (reason === "blood_tie") bonus += 60;
    else if (reason === "marriage_tie") bonus += 40;
  }
  return bonus;
}

function marriageScoutRankingScore(
  state: RunState,
  subject: Person,
  candidatePersonId: string,
  candidateHouseId: string | null,
  scopeStatus: OutboundMarriageScoutingScopeStatus,
  scopeBucket: WorldScopeCapBucketV1 | null,
  relevanceReasons: string[]
): number {
  const candidate = registryPersonFor(state, candidatePersonId);
  const ageGapPenalty =
    candidate && typeof candidate.age === "number" && typeof subject.age === "number"
      ? Math.abs(candidate.age - subject.age)
      : 32;
  const houseHeadId = candidateHouseId ? resolveCurrentHouseHeadId(state, candidateHouseId) : null;
  const relationship = houseHeadId ? readRelationshipVector(state, houseHeadId, state.house.head.id) : null;
  const favorScore = relationship ? relationshipFavorScore(relationship) : 0;

  return (
    marriageScoutScopeWeight(scopeStatus, scopeBucket) +
    marriageScoutRelevanceBonus(relevanceReasons) +
    favorScore * 6 -
    ageGapPenalty
  );
}

function compareScoutingEntries(
  left: OutboundMarriageScoutingCandidateEntry,
  right: OutboundMarriageScoutingCandidateEntry
): number {
  if (left.match_ready !== right.match_ready) return left.match_ready ? -1 : 1;
  if (left.ranking_score !== right.ranking_score) return right.ranking_score - left.ranking_score;
  const house = compareText(left.candidate_house_id ?? "", right.candidate_house_id ?? "");
  if (house !== 0) return house;
  return compareText(left.candidate_person_id, right.candidate_person_id);
}

function buildCandidateEntry(
  state: RunState,
  subject: Person,
  candidatePersonId: string,
  candidateHouseId: string,
  actionScope: WorldActionScopeResolutionV1 | null,
  relevanceReasons: string[],
  rejectCooldowns: Record<string, number>,
  residenceSummary: ReturnType<typeof ensureResidenceManorBindings>["selector_summary"]
): OutboundMarriageScoutingCandidateEntry | null {
  const candidate = registryPersonFor(state, candidatePersonId);
  if (!candidate || candidate.alive === false || candidate.id === subject.id) return null;
  if (candidate.sex !== (subject.sex === "M" ? "F" : subject.sex === "F" ? "M" : null)) return null;

  const residenceEntry = residenceSummary.entries_by_person_id[candidatePersonId] ?? null;
  const residenceManorId = normalizeOptionalId(residenceEntry?.residence_manor_id);
  const candidateScope = residenceManorId
    ? (actionScope?.candidates ?? []).find((row) => row.manor_id === residenceManorId) ?? null
    : null;

  let scopeStatus: OutboundMarriageScoutingScopeStatus = "unmapped";
  if (residenceManorId && actionScope?.admitted_manor_ids.includes(residenceManorId)) scopeStatus = "admitted";
  else if (residenceManorId && actionScope?.rejected_manor_ids.includes(residenceManorId)) scopeStatus = "rejected";

  const includeReasons = new Set<string>();
  const excludeReasons = new Set<string>();
  if (candidate.age >= OUTBOUND_MARRIAGE_SCOUTING_MIN_AGE && candidate.age <= OUTBOUND_MARRIAGE_SCOUTING_MAX_AGE) {
    includeReasons.add("age_band_match");
  } else {
    excludeReasons.add("outside_age_band");
  }

  const livingSpouse = getLivingSpouse(state as any, candidatePersonId);
  if (livingSpouse) {
    excludeReasons.add("has_living_spouse");
  } else {
    includeReasons.add("no_living_spouse");
  }

  if (candidate.married && !livingSpouse && !hasActiveSpouseEdge(state, candidatePersonId)) {
    excludeReasons.add("married_flag_uncleared");
  }

  if (isReserved(state, candidatePersonId, state.turn_index)) {
    excludeReasons.add("candidate_reserved");
  } else {
    includeReasons.add("not_reserved");
  }

  const pairingKey = makeMarriageOfferPairingKey({
    subject_person_id: subject.id,
    candidate_person_id: candidatePersonId,
  });
  if (rejectCooldowns[pairingKey]) {
    excludeReasons.add("reject_cooldown_active");
  } else {
    includeReasons.add("not_on_reject_cooldown");
  }

  if (scopeStatus === "admitted") {
    includeReasons.add(candidateScope?.bucket ? `scope_${candidateScope.bucket}` : "scope_admitted");
  } else if (scopeStatus === "unmapped") {
    includeReasons.add("scope_unmapped_fallback");
  } else {
    excludeReasons.add("scope_rejected");
  }

  for (const reason of relevanceReasons) includeReasons.add(`house_${reason}`);

  const rankingScore = marriageScoutRankingScore(
    state,
    subject,
    candidatePersonId,
    candidateHouseId,
    scopeStatus,
    candidateScope?.bucket ?? null,
    relevanceReasons
  );

  return {
    schema_version: OUTBOUND_MARRIAGE_SCOUTING_ENTRY_SCHEMA_VERSION,
    candidate_person_id: candidatePersonId,
    candidate_person_name: candidate.name,
    candidate_house_id: candidateHouseId,
    candidate_house_name: readHouseNameForCandidate(state, candidateHouseId),
    residence_manor_id: residenceManorId,
    scope_status: scopeStatus,
    scope_bucket: candidateScope?.bucket ?? null,
    selector_contexts: residenceEntry?.selector_contexts ? [...residenceEntry.selector_contexts] : [],
    travel_cost_distance: residenceEntry?.travel_cost_distance ?? null,
    route_hop_distance: residenceEntry?.route_hop_distance ?? null,
    distance_band: residenceEntry?.distance_band ?? null,
    ranking_score: rankingScore,
    rank_group: "held_out",
    match_ready: excludeReasons.size === 0,
    include_reasons: sortStrings(includeReasons),
    exclude_reasons: sortStrings(excludeReasons),
    relevance_reasons: [...relevanceReasons].sort(compareText),
  };
}

export function buildOutboundMarriageScoutingRegistry(
  state: RunState,
  options?: OutboundMarriageScoutingBuildOptions
): OutboundMarriageScoutingRegistry | null {
  const subject =
    (options?.subject_person_id ? registryPersonFor(state, options.subject_person_id) : null) ?? selectMarriageSubject(state);
  if (!subject) return null;

  const anyState: any = state as any;
  const houses: Record<string, any> =
    anyState.houses && typeof anyState.houses === "object" ? (anyState.houses as Record<string, any>) : {};
  const playerHouseId: string = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
  const residenceSummary = options?.residence_selector_summary ?? ensureResidenceManorBindings(state).selector_summary;
  const scope =
    options?.action_scope ??
    (residenceSummary.anchor_manor_id
      ? resolveActionScope(residenceSummary.anchor_manor_id, "marriage_scout", { state })
      : null);
  const relevanceSnapshot = buildKnownHouseRelevanceSnapshot(state);
  const relevanceByHouseId = new Map(relevanceSnapshot.entries.map((entry) => [entry.house_id, entry.reasons]));
  const tier1HouseIds = options?.tierSets
    ? listRelevantTier1HouseIds(
        state,
        [...options.tierSets.tier1.houses].filter((houseId) => houseId !== playerHouseId)
      )
    : Object.keys(houses).filter((houseId) => houseId !== playerHouseId).sort((a, b) => a.localeCompare(b));
  const rejectCooldowns = buildMarriageRejectCooldownsFromState(state);

  const entries = tier1HouseIds.flatMap((houseId) => {
    const house = houses[houseId];
    if (!house || typeof house !== "object") return [];
    const memberIds = Array.isArray(house.member_person_ids)
      ? [...house.member_person_ids].filter((personId): personId is string => typeof personId === "string" && personId.length > 0)
      : [];
    const uniqueMemberIds = sortStrings(new Set(memberIds));
    return uniqueMemberIds
      .map((candidatePersonId) =>
        buildCandidateEntry(
          state,
          subject,
          candidatePersonId,
          houseId,
          scope,
          relevanceByHouseId.get(houseId) ?? [],
          rejectCooldowns,
          residenceSummary
        )
      )
      .filter((entry): entry is OutboundMarriageScoutingCandidateEntry => entry !== null);
  });

  entries.sort(compareScoutingEntries);

  const shown = entries
    .filter((entry) => entry.match_ready)
    .slice(0, OUTBOUND_MARRIAGE_SCOUTING_SHOW_LIMIT)
    .map((entry) => ({ ...entry, rank_group: "shown" as const }));
  const shownIds = shown.map((entry) => entry.candidate_person_id);
  const heldOut = entries
    .filter((entry) => !shownIds.includes(entry.candidate_person_id))
    .slice(0, OUTBOUND_MARRIAGE_SCOUTING_HELD_OUT_LIMIT)
    .map((entry) => ({ ...entry, rank_group: "held_out" as const }));
  const kept = [...shown, ...heldOut];
  const candidateIds = kept.map((entry) => entry.candidate_person_id);

  return {
    schema_version: OUTBOUND_MARRIAGE_SCOUTING_REGISTRY_SCHEMA_VERSION,
    generated_at_turn_index: Math.trunc(state.turn_index),
    subject_person_id: subject.id,
    subject_house_id: structuredHouseIdForPerson(state, subject.id),
    anchor_manor_id: residenceSummary.anchor_manor_id,
    scope_mode: scope?.scope_mode ?? "anchor_only",
    admitted_manor_ids: scope?.admitted_manor_ids ? [...scope.admitted_manor_ids] : [],
    rejected_manor_ids: scope?.rejected_manor_ids ? [...scope.rejected_manor_ids] : [],
    candidate_ids: candidateIds,
    shown_candidate_ids: shown.map((entry) => entry.candidate_person_id),
    held_out_candidate_ids: heldOut.map((entry) => entry.candidate_person_id),
    total_candidates_considered: entries.length,
    total_shown_candidates: shown.length,
    total_held_out_candidates: heldOut.length,
    entries_by_candidate_id: Object.fromEntries(
      kept.map((entry) => [entry.candidate_person_id, entry] satisfies [string, OutboundMarriageScoutingCandidateEntry])
    ),
  };
}

export function attachOutboundMarriageScoutingRegistry(
  target: RunState | Record<string, unknown>,
  registry: OutboundMarriageScoutingRegistry | null
): void {
  attachHiddenSurface(target as object, "outbound_marriage_scouting_registry", registry);
  attachHiddenSurface((target as any)?.house as object, "outbound_marriage_scouting_registry", registry);
  if (!registry) return;

  const people = (target as any)?.people;
  if (people && typeof people === "object") {
    attachHiddenSurface(
      people[registry.subject_person_id] as object,
      "outbound_marriage_scouting_subject",
      registry
    );
  }
}

function syncMarriedFlag(state: RunState, personId: string): void {
  const nextMarried = Boolean(getLivingSpouse(state as any, personId));
  const anyState: any = state as any;

  if (anyState.people?.[personId]) anyState.people[personId].married = nextMarried;
  if (state.house.head.id === personId) state.house.head.married = nextMarried;
  if (state.house.spouse?.id === personId) state.house.spouse.married = nextMarried;

  const child = state.house.children.find((entry) => entry.id === personId);
  if (child) child.married = nextMarried;
}

function retireObsoleteSpouseEdges(state: RunState, personId: string, keepPartnerId: string): string[] {
  const edges = Array.isArray((state as any).kinship_edges) ? ((state as any).kinship_edges as any[]) : [];
  const affected = new Set<string>();

  for (const edge of edges) {
    if (!spouseEdgeIsActive(edge)) continue;
    const { a, b } = spouseEdgeEndpoints(edge);
    if (!a || !b) continue;

    let otherId: string | null = null;
    if (a === personId) otherId = b;
    else if (b === personId) otherId = a;
    if (!otherId || otherId === keepPartnerId) continue;

    edge.end_turn_index = state.turn_index;
    affected.add(personId);
    affected.add(otherId);
  }

  return [...affected].sort((left, right) => left.localeCompare(right));
}

export function bestMarriageOfferIndexPolicy(state: RunState, marriageWindow: MarriageWindow): number | null {
  let bestIdx: number | null = null;
  let bestScore = -Infinity;
  const offerIntel = buildPolicyIntelMap(state, marriageWindow.offers.map((offer) => offer.house_person_id));

  for (let i = 0; i < marriageWindow.offers.length; i++) {
    const offer = marriageWindow.offers[i]!;
    const dowry = offer.dowry_coin_net;
    if (dowry < 0 && state.manor.coin < Math.abs(dowry)) continue;
    const score = npcPolicyScore({
      hook: "marriage_offer",
      base_score: dowry * 3 + offer.relationship_delta.respect * 2 + offer.relationship_delta.allegiance,
      intel: offerIntel[offer.house_person_id] ?? null,
      state,
      subject_id: offer.house_person_id
    });
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

export function buildMarriageWindow(state: RunState, tierSets?: TierSets | null): MarriageWindow | null {
  const anyFlags: any = state.flags;
  const forced = Boolean(anyFlags.MarriageOffer);
  const eligibleAll = collectMarriageEligibleSubjects(state);
  if (!forced && eligibleAll.length === 0) return null;
  if (eligibleAll.length === 0) return { eligible_child_ids: [], offers: [] };
  const subject = selectMarriageSubject(state);
  if (!subject) return forced ? { eligible_child_ids: [], offers: [] } : null;
  const anyState: any = state as any;
  const houses: Record<string, any> =
    anyState.houses && typeof anyState.houses === "object" ? (anyState.houses as Record<string, any>) : {};
  const playerHouseId: string = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";

  const tier1HouseIds = tierSets
    ? listRelevantTier1HouseIds(
        state,
        [...tierSets.tier1.houses].filter((houseId) => houseId !== playerHouseId)
      )
    : Object.keys(houses).filter((houseId) => houseId !== playerHouseId).sort((a, b) => a.localeCompare(b));

  const rejectCooldowns = buildMarriageRejectCooldownsFromState(state);
  const poolIds = listEligibleCandidates(state, {
    subject_person_id: subject.id,
    scope: { kind: "house_ids", house_ids: tier1HouseIds }
  }).filter((candidatePersonId) => {
    const pairingKey = makeMarriageOfferPairingKey({
      subject_person_id: subject.id,
      candidate_person_id: candidatePersonId,
    });
    return !rejectCooldowns[pairingKey];
  });

  if (poolIds.length === 0) {
    if (forced) {
      const forcedWindow = { eligible_child_ids: [subject.id], offers: [] };
      attachHiddenSurface(
        forcedWindow,
        "outbound_marriage_scouting_registry",
        buildOutboundMarriageScoutingRegistry(state, { subject_person_id: subject.id, tierSets })
      );
      return forcedWindow;
    }
    return null;
  }

  const pool = poolIds.slice();
  const rng = new Rng(state.run_seed, "marriage", state.turn_index, "offers");
  const offers: MarriageOffer[] = [];
  const offerCount = 2 + (rng.bool(0.4) ? 1 : 0);

  for (let i = 0; i < offerCount && pool.length > 0; i++) {
    const idx = rng.int(0, Math.max(0, pool.length - 1));
    const personId = pool.splice(idx, 1)[0]!;
    const houseId = structuredHouseIdForPerson(state, personId) ?? "";
    const house: any = houseId ? houses[houseId] : null;
    const houseName = typeof house?.name === "string" && house.name ? String(house.name) : houseId ? String(houseId) : "Unknown";
    const quality = rng.next();
    const dowry = Math.trunc(-4 + quality * 12) - (rng.bool(0.2) ? rng.int(0, 3) : 0);

    offers.push({
      house_person_id: personId,
      house_label: `House ${houseName}`,
      dowry_coin_net: dowry,
      relationship_delta: {
        respect: Math.trunc(2 + quality * 6),
        allegiance: Math.trunc(1 + quality * 4),
        threat: Math.trunc(-1 - quality * 2)
      },
      liege_delta: rng.bool(0.35) ? { respect: 1, threat: -1 } : null,
      risk_tags: [
        quality > 0.75 ? "prestige" : quality < 0.25 ? "shady" : "plain",
        dowry < 0 ? "costly" : "profitable"
      ]
    });
  }

  const window = { eligible_child_ids: [subject.id], offers };
  attachHiddenSurface(
    window,
    "outbound_marriage_scouting_registry",
    buildOutboundMarriageScoutingRegistry(state, { subject_person_id: subject.id, tierSets })
  );
  return window;
}

export function applyMarriageDecision(state: RunState, ctx: TurnContext, decisions: TurnDecisions, reportNotes: string[]): void {
  const marriageWindow = ctx.marriage_window;
  const decision = decisions.marriage;
  if (!marriageWindow || decision.action === "none") return;

  if (!canSpendEnergy(state, 1)) {
    recordMarriageFlowEvidence(state, "marriage_blocked_energy", "No energy for marriage action.", [
      state.house.head.id,
      ...marriageWindowSubjectIds(marriageWindow)
    ]);
    reportNotes.push("No energy for marriage action.");
    return;
  }

  if (decision.action === "scout") {
    const scoutCost = resolveMarriageScoutDecisionCost(state);
    if (!reserveMarriageDecisionBudget(state, "scout")) {
      recordMarriageFlowEvidence(state, "marriage_scout_blocked_budget", "No court budget for marriage scouting.", [
        state.house.head.id
      ]);
      reportNotes.push("No court budget for marriage scouting.");
      return;
    }
    spendEnergy(state, 1);
    spendCoin(state, 1);
    const mods = modsObj(state);
    mods["marriage_quality"] = (mods["marriage_quality"] ?? 1) * 1.05;
    const scoutingRegistry = buildOutboundMarriageScoutingRegistry(state);
    attachOutboundMarriageScoutingRegistry(state, scoutingRegistry);
    attachHiddenSurface(ctx.marriage_window as object, "outbound_marriage_scouting_registry", scoutingRegistry);
    if (scoutCost !== MARRIAGE_SCOUT_DECISION_COST) {
      recordMarriageFlowEvidence(
        state,
        "marriage_scout_delegated",
        `Delegated scouting used ${scoutCost} court decision${scoutCost === 1 ? "" : "s"}.`,
        [state.house.head.id]
      );
      reportNotes.push(`Delegated scouting used ${scoutCost} court decision${scoutCost === 1 ? "" : "s"}.`);
    }
    recordMarriageFlowEvidence(
      state,
      "marriage_scouted",
      "Scouted prospects; next marriage window slightly improved.",
      [state.house.head.id]
    );
    reportNotes.push("Scouted prospects; next marriage window slightly improved.");
    return;
  }

  if (decision.action === "reject_all") {
    if (!reserveMarriageDecisionBudget(state, "inbound")) {
      recordMarriageFlowEvidence(state, "marriage_inbound_blocked_budget", "No court budget for inbound marriage handling.", [
        state.house.head.id,
        ...marriageWindowSubjectIds(marriageWindow)
      ]);
      reportNotes.push("No court budget for inbound marriage handling.");
      return;
    }
    spendEnergy(state, 1);
    state.manor.unrest = clampInt(state.manor.unrest + 1, 0, 100);
    recordMarriageFlowEvidence(
      state,
      "marriage_rejected_all",
      "Rejected all offers; slight social friction (+1 unrest).",
      [state.house.head.id, ...marriageWindowSubjectIds(marriageWindow)]
    );
    reportNotes.push("Rejected all offers; slight social friction (+1 unrest).");
    return;
  }

  if (decision.action !== "accept") return;

  const isHeadSubject = state.house.head.id === decision.child_id;
  const child = isHeadSubject ? state.house.head : state.house.children.find((person) => person.id === decision.child_id);
  const offer = marriageWindow.offers[decision.offer_index];
  if (!child || !offer) {
    recordMarriageFlowEvidence(state, "marriage_invalid_selection", "Invalid marriage selection.", [state.house.head.id]);
    reportNotes.push("Invalid marriage selection.");
    return;
  }

  {
    const anyState: any = state as any;
    const people: Record<string, Person> | undefined = anyState.people as any;
    const spousePerson = people ? people[offer.house_person_id] : null;
    if (spousePerson && spousePerson.sex === child.sex) {
      recordMarriageFlowEvidence(state, "marriage_accept_blocked", "Cannot accept: same-sex marriage is disallowed.", [
        child.id,
        offer.house_person_id
      ]);
      reportNotes.push("Cannot accept: same-sex marriage is disallowed.");
      return;
    }
  }

  const dowry = offer.dowry_coin_net;
  if (dowry < 0 && !canAffordCoin(state, Math.abs(dowry))) {
    recordMarriageFlowEvidence(state, "marriage_accept_blocked", "Cannot accept: insufficient coin for negative dowry.", [
      child.id,
      offer.house_person_id
    ]);
    reportNotes.push("Cannot accept: insufficient coin for negative dowry.");
    return;
  }

  if (!reserveMarriageDecisionBudget(state, "inbound")) {
    recordMarriageFlowEvidence(state, "marriage_inbound_blocked_budget", "No court budget for inbound marriage handling.", [
      child.id,
      offer.house_person_id
    ]);
    reportNotes.push("No court budget for inbound marriage handling.");
    return;
  }

  spendEnergy(state, 1);
  applyCoinDelta(state, dowry);

  const affectedIds = new Set<string>();
  for (const personId of retireObsoleteSpouseEdges(state, child.id, offer.house_person_id)) affectedIds.add(personId);
  for (const personId of retireObsoleteSpouseEdges(state, offer.house_person_id, child.id)) affectedIds.add(personId);
  ensureMarriageKinshipEdge(state, child.id, offer.house_person_id);
  affectedIds.add(child.id);
  affectedIds.add(offer.house_person_id);
  for (const personId of [...affectedIds].sort((left, right) => left.localeCompare(right))) syncMarriedFlag(state, personId);

  const spouseJoinsCourt = isHeadSubject ? true : child.sex === "M";
  if (spouseJoinsCourt) {
    addCourtExtraId(state, offer.house_person_id);
    {
      const anyState: any = state as any;
      const playerHouseId: string = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
      if (anyState.people && anyState.people[offer.house_person_id]) {
        anyState.people[offer.house_person_id].house_id = playerHouseId;
        anyState.people[offer.house_person_id].residence_house_id = playerHouseId;
      }
      if (anyState.houses && anyState.houses[playerHouseId]) {
        const house: any = anyState.houses[playerHouseId];
        if (!Array.isArray(house.member_person_ids)) house.member_person_ids = [];
        if (!house.member_person_ids.includes(offer.house_person_id)) house.member_person_ids.push(offer.house_person_id);
      }
    }

    if (isHeadSubject) {
      const anyState: any = state as any;
      const spousePerson = anyState.people?.[offer.house_person_id] ?? null;
      if (spousePerson) {
        state.house.spouse = spousePerson;
        state.house.spouse_status = "spouse";
        spousePerson.married = true;
      }
    } else {
      removeCourtExcludeId(state, child.id);
    }
  } else {
    addCourtExcludeId(state, child.id);
    {
      const anyState: any = state as any;
      const destHouseId = structuredHouseIdForPerson(state, offer.house_person_id);
      const playerHouseId: string = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
      if (anyState.people && anyState.people[child.id] && destHouseId) {
        anyState.people[child.id].house_id = destHouseId;
        anyState.people[child.id].residence_house_id = destHouseId;
      }
      const playerHouseRec: any = anyState.houses?.[playerHouseId];
      if (playerHouseRec && Array.isArray(playerHouseRec.member_person_ids)) {
        playerHouseRec.member_person_ids = playerHouseRec.member_person_ids.filter((id: any) => id !== child.id);
      }
      const destHouseRec: any = destHouseId ? anyState.houses?.[destHouseId] : null;
      if (destHouseRec) {
        if (!Array.isArray(destHouseRec.member_person_ids)) destHouseRec.member_person_ids = [];
        if (!destHouseRec.member_person_ids.includes(child.id)) destHouseRec.member_person_ids.push(child.id);
      }
    }
  }

  applyRelationshipDelta(state, state.house.head.id, offer.house_person_id, offer.relationship_delta, "marriage_accept");
  if (offer.liege_delta) {
    applyRelationshipDelta(
      state,
      state.house.head.id,
      state.locals.liege.id,
      { respect: offer.liege_delta.respect, threat: offer.liege_delta.threat },
      "marriage_accept_liege"
    );
  }

  const mods = modsObj(state);
  mods["birth_bonus"] = (mods["birth_bonus"] ?? 1) * 1.03;
  recordMarriageFlowEvidence(
    state,
    "marriage_accepted",
    `Marriage accepted for ${child.name}: dowry ${dowry >= 0 ? "+" : ""}${dowry} coin.`,
    [child.id, offer.house_person_id]
  );
  ensureResidenceManorBindings(state);
  reportNotes.push(`Marriage accepted for ${child.name}: dowry ${dowry >= 0 ? "+" : ""}${dowry} coin.`);
}
