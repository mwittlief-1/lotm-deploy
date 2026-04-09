import { structuredHouseIdForPerson } from "../../actors";
import { addCourtExcludeId, addCourtExtraId, removeCourtExcludeId } from "../../court";
import { chargeCourtDecisionBudget } from "../court/decisionBudget";
import { resolveCourtDelegationEntry, resolveDelegatedBudgetCost } from "../court/delegationRegistry";
import { canSpendEnergy, spendEnergy } from "../court/energy";
import { applyCoinDelta, canAffordCoin, spendCoin } from "../economy/ledger";
import { listEligibleCandidates } from "../../marriageMarket";
import { Rng } from "../../rng";
import type { TierSets } from "../../tiers";
import type { MarriageOffer, MarriageWindow, Person, RunState, TurnContext, TurnDecisions } from "../../types";
import { clampInt } from "../../util";
import { getLivingSpouse } from "../../kinship";
import { makeEvidenceEvent, recordRuntimeDomainEvidence } from "../ai/evidence";
import { buildPolicyIntelMap, npcPolicyScore } from "../ai/policy";
import { buildMarriageRejectCooldownsFromState, makeMarriageOfferPairingKey } from "./marriageOfferRegistry";
import { listRelevantTier1HouseIds } from "./knownHouseRelevance";
import { applyRelationshipDelta } from "./relationshipEngine";

const MARRIAGE_INBOUND_DECISION_COST = 1;
const MARRIAGE_SCOUT_DECISION_COST = 2;
const MARRIAGE_SCOUT_MIN_DELEGATED_COST = 1;
const SPOUSE_EDGE_A_KEYS = ["a_id", "from_person_id", "from", "a"] as const;
const SPOUSE_EDGE_B_KEYS = ["b_id", "to_person_id", "to", "b"] as const;

function modsObj(state: RunState): Record<string, number> {
  const anyFlags: any = state.flags;
  if (!anyFlags._mods || typeof anyFlags._mods !== "object") anyFlags._mods = {};
  return anyFlags._mods as Record<string, number>;
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

  const eligibleAll: Person[] = [];
  const pushEligible = (person: Person | undefined | null) => {
    if (!canSeekMarriage(state, person)) return;
    if (eligibleAll.some((candidate) => candidate.id === person.id)) return;
    eligibleAll.push(person);
  };

  pushEligible(state.house.head);
  for (const child of state.house.children) pushEligible(child);
  if (!forced && eligibleAll.length === 0) return null;
  if (eligibleAll.length === 0) return { eligible_child_ids: [], offers: [] };

  const subject = [...eligibleAll].sort((a, b) => (b.age - a.age) || a.id.localeCompare(b.id))[0]!;
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
    if (forced) return { eligible_child_ids: [subject.id], offers: [] };
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

  return { eligible_child_ids: [subject.id], offers };
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
  reportNotes.push(`Marriage accepted for ${child.name}: dowry ${dowry >= 0 ? "+" : ""}${dowry} coin.`);
}
