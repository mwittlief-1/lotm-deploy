import { structuredHouseIdForPerson } from "../../actors";
import { addCourtExcludeId, addCourtExtraId, removeCourtExcludeId } from "../../court";
import { canSpendEnergy, spendEnergy } from "../court/energy";
import { applyCoinDelta, canAffordCoin, spendCoin } from "../economy/ledger";
import { listEligibleCandidates } from "../../marriageMarket";
import { Rng } from "../../rng";
import type { TierSets } from "../../tiers";
import type { MarriageOffer, MarriageWindow, Person, RunState, TurnContext, TurnDecisions } from "../../types";
import { clampInt } from "../../util";
import { buildPolicyIntelMap, npcPolicyScore } from "../ai/policy";
import { applyRelationshipDelta } from "./relationshipEngine";

function modsObj(state: RunState): Record<string, number> {
  const anyFlags: any = state.flags;
  if (!anyFlags._mods || typeof anyFlags._mods !== "object") anyFlags._mods = {};
  return anyFlags._mods as Record<string, number>;
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
    if (!person || !person.alive || person.married || person.age < 15) return;
    if (eligibleAll.some((candidate) => candidate.id === person.id)) return;
    eligibleAll.push(person);
  };

  if (!state.house.spouse && state.house.spouse_status !== "widow") pushEligible(state.house.head);
  for (const child of state.house.children) pushEligible(child);
  if (!forced && eligibleAll.length === 0) return null;
  if (eligibleAll.length === 0) return { eligible_child_ids: [], offers: [] };

  const subject = [...eligibleAll].sort((a, b) => (b.age - a.age) || a.id.localeCompare(b.id))[0]!;
  const anyState: any = state as any;
  const houses: Record<string, any> =
    anyState.houses && typeof anyState.houses === "object" ? (anyState.houses as Record<string, any>) : {};
  const playerHouseId: string = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";

  const tier1HouseIds = tierSets
    ? [...tierSets.tier1.houses].filter((houseId) => houseId !== playerHouseId).sort((a, b) => a.localeCompare(b))
    : Object.keys(houses).filter((houseId) => houseId !== playerHouseId).sort((a, b) => a.localeCompare(b));

  const poolIds = listEligibleCandidates(state, {
    subject_person_id: subject.id,
    scope: { kind: "house_ids", house_ids: tier1HouseIds }
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
    reportNotes.push("No energy for marriage action.");
    return;
  }

  if (decision.action === "scout") {
    spendEnergy(state, 1);
    spendCoin(state, 1);
    const mods = modsObj(state);
    mods["marriage_quality"] = (mods["marriage_quality"] ?? 1) * 1.05;
    reportNotes.push("Scouted prospects; next marriage window slightly improved.");
    return;
  }

  if (decision.action === "reject_all") {
    spendEnergy(state, 1);
    state.manor.unrest = clampInt(state.manor.unrest + 1, 0, 100);
    reportNotes.push("Rejected all offers; slight social friction (+1 unrest).");
    return;
  }

  if (decision.action !== "accept") return;

  const isHeadSubject = state.house.head.id === decision.child_id;
  const child = isHeadSubject ? state.house.head : state.house.children.find((person) => person.id === decision.child_id);
  const offer = marriageWindow.offers[decision.offer_index];
  if (!child || !offer) {
    reportNotes.push("Invalid marriage selection.");
    return;
  }

  {
    const anyState: any = state as any;
    const people: Record<string, Person> | undefined = anyState.people as any;
    const spousePerson = people ? people[offer.house_person_id] : null;
    if (spousePerson && spousePerson.sex === child.sex) {
      reportNotes.push("Cannot accept: same-sex marriage is disallowed.");
      return;
    }
  }

  const dowry = offer.dowry_coin_net;
  if (dowry < 0 && !canAffordCoin(state, Math.abs(dowry))) {
    reportNotes.push("Cannot accept: insufficient coin for negative dowry.");
    return;
  }

  spendEnergy(state, 1);
  applyCoinDelta(state, dowry);

  child.married = true;
  {
    const anyState: any = state as any;
    if (anyState.people && anyState.people[child.id]) anyState.people[child.id].married = true;
    if (anyState.people && anyState.people[offer.house_person_id]) anyState.people[offer.house_person_id].married = true;
  }

  ensureMarriageKinshipEdge(state, child.id, offer.house_person_id);

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
  reportNotes.push(`Marriage accepted for ${child.name}: dowry ${dowry >= 0 ? "+" : ""}${dowry} coin.`);
}
