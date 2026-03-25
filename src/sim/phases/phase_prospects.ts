import { addCourtExcludeId, addCourtExtraId, removeCourtExcludeId } from "../court";
import { buildPolicyIntelMap, npcPolicyScore } from "../domains/ai/policy";
import { applyCoinDelta } from "../domains/economy/ledger";
import { bestMarriageOfferIndexPolicy, ensureMarriageKinshipEdge } from "../domains/people/marriage";
import { clearReservation, reserveCandidate } from "../marriageMarket";
import { Rng } from "../rng";
import { applyRelationshipDelta } from "../domains/people/relationshipEngine";
import type {
  MarriageWindow,
  Person,
  Prospect,
  ProspectType,
  ProspectsLogEvent,
  ProspectsWindow,
  RunState,
  TurnContext,
  TurnDecisions
} from "../types";
import { asNonNegInt, clampInt } from "../util";
import { resolveCurrentHouseHeadId, structuredHouseIdForPerson } from "../actors";

type ActiveProspectRef = { id: string; expires_turn: number };
type ProspectResolution = { outcome: "accept" | "reject"; turn_index: number };

type BuildProspectsDeps = {
  computeHeirId: (state: RunState) => string | null;
};

function policySubjectIdForProspect(prospect: Prospect): string | null {
  if (prospect.type === "marriage") {
    return typeof prospect.spouse_person_id === "string" && prospect.spouse_person_id.length > 0
      ? prospect.spouse_person_id
      : prospect.subject_person_id;
  }
  return prospect.subject_person_id;
}

function readActiveProspects(state: RunState): ActiveProspectRef[] {
  const anyFlags: any = state.flags;
  const raw = anyFlags._prospects_active_v1;
  if (!Array.isArray(raw)) return [];
  const out: ActiveProspectRef[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const id = (r as any).id;
    const ex = (r as any).expires_turn;
    if (typeof id === "string" && typeof ex === "number" && Number.isFinite(ex)) {
      out.push({ id, expires_turn: Math.trunc(ex) });
    }
  }
  return out.slice(0, 3);
}

function writeActiveProspects(state: RunState, refs: ActiveProspectRef[]): void {
  const anyFlags: any = state.flags;
  const bounded = refs.slice(0, 3).map((r) => ({ id: r.id, expires_turn: Math.trunc(r.expires_turn) }));
  if (bounded.length === 0) {
    delete anyFlags._prospects_active_v1;
    return;
  }
  anyFlags._prospects_active_v1 = bounded;
}

function readResolvedProspectSignatures(state: RunState): Record<string, ProspectResolution> {
  const anyFlags: any = state.flags as any;
  const raw = anyFlags?._prospect_signatures_v1;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, ProspectResolution>;
}

function writeResolvedProspectSignatures(state: RunState, map: Record<string, ProspectResolution>): void {
  const anyFlags: any = state.flags as any;
  const out: Record<string, ProspectResolution> = {};
  for (const key of Object.keys(map).sort((a, b) => a.localeCompare(b)).slice(-64)) {
    const row = map[key];
    if (!row || typeof row !== "object") continue;
    const outcome = row.outcome === "accept" ? "accept" : row.outcome === "reject" ? "reject" : null;
    const turnIndex = typeof row.turn_index === "number" && Number.isFinite(row.turn_index) ? Math.trunc(row.turn_index) : null;
    if (!outcome || turnIndex === null) continue;
    out[key] = { outcome, turn_index: turnIndex };
  }
  if (Object.keys(out).length === 0) {
    delete anyFlags._prospect_signatures_v1;
    return;
  }
  anyFlags._prospect_signatures_v1 = out;
}

function inheritanceClaimSignature(state: RunState): string {
  return `inheritance_claim:${state.house.head.id}`;
}

function prospectSignature(prospect: Prospect): string | null {
  if (prospect.type === "inheritance_claim" && prospect.subject_person_id) {
    return `inheritance_claim:${prospect.subject_person_id}`;
  }
  return null;
}

function isProspectSignatureSuppressed(state: RunState, signature: string): boolean {
  const map = readResolvedProspectSignatures(state);
  return Boolean(map[signature]);
}

function rememberResolvedProspect(state: RunState, prospect: Prospect, outcome: "accept" | "reject"): void {
  const signature = prospectSignature(prospect);
  if (!signature) return;
  const map = readResolvedProspectSignatures(state);
  map[signature] = { outcome, turn_index: state.turn_index };
  writeResolvedProspectSignatures(state, map);
}

function clearMarriageReservationsByProspectId(state: RunState, prospectId: string): void {
  const anyFlags: any = state.flags as any;
  const raw: any = anyFlags?.marriage_reservations;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const pid = String(prospectId ?? "");
  if (!pid) return;
  for (const k of Object.keys(raw).sort((a, b) => a.localeCompare(b))) {
    const e: any = raw[k];
    if (e && typeof e === "object" && String(e.prospect_id ?? "") === pid) {
      delete raw[k];
    }
  }
}

function guessProspectTypeFromId(id: string): ProspectType {
  if (id.includes("marriage")) return "marriage";
  if (id.includes("inheritance")) return "inheritance_claim";
  if (id.includes("grant")) return "grant";
  return "grant";
}

function summaryForType(t: ProspectType): string {
  if (t === "marriage") return "Marriage proposal";
  if (t === "grant") return "Grant offer";
  return "Inheritance claim";
}

function uncertaintyForType(t: ProspectType): "known" | "likely" | "possible" {
  if (t === "marriage") return "known";
  if (t === "grant") return "likely";
  return "possible";
}

function lookupProspectFromHistory(state: RunState, prospectId: string): Prospect | null {
  const log: any[] = (state.log ?? []) as any[];
  for (let i = log.length - 1; i >= 0; i--) {
    const rep: any = log[i]?.report;
    const evs: any[] | undefined = rep?.prospects_log;
    if (!Array.isArray(evs)) continue;
    for (let j = evs.length - 1; j >= 0; j--) {
      const ev: any = evs[j];
      if (ev && ev.kind === "prospect_generated" && ev.prospect_id === prospectId && ev.prospect && typeof ev.prospect === "object") {
        return ev.prospect as Prospect;
      }
    }
  }
  return null;
}

function pickSponsorHouseId(state: RunState): string {
  const anyState: any = state as any;
  const playerHouseId: string = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
  const houses: Record<string, any> = anyState.houses && typeof anyState.houses === "object" ? (anyState.houses as Record<string, any>) : {};

  const playerHeadId: string = resolveCurrentHouseHeadId(state, playerHouseId) ?? state.house.head.id;

  let best: string | null = null;
  let bestRespect = -1;

  const ids = Object.keys(houses).filter((id) => id !== playerHouseId).sort((a, b) => a.localeCompare(b));
  for (const hid of ids) {
    const headId = resolveCurrentHouseHeadId(state, hid);
    if (typeof headId !== "string") continue;
    const edge = state.relationships.find((e) => e.from_id === playerHeadId && e.to_id === headId);
    if (!edge) continue;
    if (edge.respect > bestRespect) {
      bestRespect = edge.respect;
      best = hid;
    }
  }

  return best ?? playerHouseId;
}

export function buildProspectsWindowPhase(
  state: RunState,
  marriageWindow: MarriageWindow | null,
  prospectsLog: ProspectsLogEvent[],
  deps: BuildProspectsDeps
): ProspectsWindow {
  const t = state.turn_index;
  const anyState: any = state as any;
  const playerHouseId: string = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";

  const sponsorHouseId = pickSponsorHouseId(state);

  const active0 = readActiveProspects(state);
  const active: ActiveProspectRef[] = [];
  for (const ref of active0) {
    if (t > ref.expires_turn) {
      clearMarriageReservationsByProspectId(state, ref.id);
      const p = lookupProspectFromHistory(state, ref.id);
      if (p && (p as any).type === "marriage") {
        const spouseId: any = (p as any).spouse_person_id;
        if (typeof spouseId === "string" && spouseId.length > 0) clearReservation(state, spouseId);
      }
      if (p) {
        prospectsLog.push({
          kind: "prospect_expired",
          turn_index: t,
          type: p.type,
          from_house_id: p.from_house_id,
          to_house_id: p.to_house_id,
          subject_person_id: p.subject_person_id,
          prospect_id: p.id,
          effects_applied: {}
        });
      } else {
        const tg = guessProspectTypeFromId(ref.id);
        prospectsLog.push({
          kind: "prospect_expired",
          turn_index: t,
          type: tg,
          from_house_id: sponsorHouseId,
          to_house_id: playerHouseId,
          subject_person_id: null,
          prospect_id: ref.id,
          effects_applied: {}
        });
      }
      continue;
    }
    active.push(ref);
  }

  writeActiveProspects(state, active);

  const prospects: Prospect[] = [];
  for (const ref of active) {
    const p = lookupProspectFromHistory(state, ref.id);
    if (p) {
      prospects.push({ ...p, expires_turn: ref.expires_turn });
    } else {
      const tg = guessProspectTypeFromId(ref.id);
      prospects.push({
        id: ref.id,
        type: tg,
        from_house_id: sponsorHouseId,
        to_house_id: playerHouseId,
        subject_person_id: null,
        summary: summaryForType(tg),
        requirements: [],
        costs: {},
        predicted_effects: {},
        uncertainty: uncertaintyForType(tg),
        expires_turn: ref.expires_turn,
        actions: ["accept", "reject"]
      });
    }
  }

  const activeTypes = new Set<ProspectType>(prospects.map((p) => p.type));
  const idRng = new Rng(state.run_seed, "prospects", t, "id");
  const makeId = (pt: ProspectType, subject: string | null): string => {
    const n = idRng.fork(`id:${pt}:${sponsorHouseId}:${subject ?? "none"}`).int(0, 1_000_000_000);
    return `pros_${pt}_${t}_${n.toString(36)}`;
  };

  const emitGenerated = (p: Prospect): void => {
    prospectsLog.push({
      kind: "prospect_generated",
      turn_index: t,
      type: p.type,
      from_house_id: p.from_house_id,
      to_house_id: p.to_house_id,
      subject_person_id: p.subject_person_id,
      prospect_id: p.id,
      prospect: p
    });
  };

  const addProspect = (p: Prospect): void => {
    if (prospects.length >= 3) return;
    prospects.push(p);
    active.push({ id: p.id, expires_turn: p.expires_turn });
    activeTypes.add(p.type);
    emitGenerated(p);
  };

  if (prospects.length < 3 && !activeTypes.has("marriage") && marriageWindow && marriageWindow.eligible_child_ids.length > 0 && marriageWindow.offers.length > 0) {
    const subjectId = [...marriageWindow.eligible_child_ids].sort((a, b) => a.localeCompare(b))[0]!;
    const bestIdx = bestMarriageOfferIndexPolicy(state, marriageWindow);
    if (bestIdx !== null) {
      const offer = marriageWindow.offers[bestIdx]!;
      const spouseHouseId = structuredHouseIdForPerson(state, offer.house_person_id) ?? sponsorHouseId;
      const relDeltas: any[] = [{
        scope: "person",
        from_id: state.house.head.id,
        to_id: offer.house_person_id,
        allegiance_delta: offer.relationship_delta.allegiance,
        respect_delta: offer.relationship_delta.respect,
        threat_delta: offer.relationship_delta.threat
      }];

      const hhDelta = { allegiance: 6, respect: 4, threat: -3 };
      if (spouseHouseId && playerHouseId && spouseHouseId !== playerHouseId) {
        relDeltas.push({
          scope: "house",
          from_id: playerHouseId,
          to_id: spouseHouseId,
          allegiance_delta: hhDelta.allegiance,
          respect_delta: hhDelta.respect,
          threat_delta: hhDelta.threat
        });
        relDeltas.push({
          scope: "house",
          from_id: spouseHouseId,
          to_id: playerHouseId,
          allegiance_delta: hhDelta.allegiance,
          respect_delta: hhDelta.respect,
          threat_delta: hhDelta.threat
        });
      }
      if (offer.liege_delta) {
        relDeltas.push({
          scope: "person",
          from_id: state.house.head.id,
          to_id: state.locals.liege.id,
          allegiance_delta: 0,
          respect_delta: offer.liege_delta.respect,
          threat_delta: offer.liege_delta.threat
        });
      }

      const p: Prospect = {
        id: makeId("marriage", subjectId),
        type: "marriage",
        from_house_id: spouseHouseId,
        to_house_id: playerHouseId,
        subject_person_id: subjectId,
        spouse_person_id: offer.house_person_id,
        summary: "Marriage proposal",
        requirements: [],
        costs: {},
        predicted_effects: {
          coin_delta: offer.dowry_coin_net,
          relationship_deltas: relDeltas,
          flags_set: []
        },
        uncertainty: "known",
        expires_turn: t + 2,
        actions: ["accept", "reject"]
      };
      reserveCandidate(state, offer.house_person_id, p.id, p.expires_turn);
      addProspect(p);
    }
  }

  const arrears = state.manor.obligations.arrears;
  const hasArrears = (arrears?.coin ?? 0) > 0 || (arrears?.bushels ?? 0) > 0;
  if (prospects.length < 3 && !activeTypes.has("grant") && hasArrears) {
    const arrearsCoin = asNonNegInt(Math.trunc(arrears?.coin ?? 0));
    const arrearsBushels = asNonNegInt(Math.trunc(arrears?.bushels ?? 0));
    const pressure = arrearsCoin + Math.floor(arrearsBushels / 100);
    const grantCoin = clampInt(2 + Math.floor(pressure * 0.5), 2, 12);

    const relDeltas: any[] = [{
      scope: "person",
      from_id: state.locals.liege.id,
      to_id: state.house.head.id,
      allegiance_delta: 1,
      respect_delta: -1,
      threat_delta: 3
    }];

    addProspect({
      id: makeId("grant", null),
      type: "grant",
      from_house_id: sponsorHouseId,
      to_house_id: playerHouseId,
      subject_person_id: null,
      summary: "Grant offer",
      requirements: [],
      costs: {},
      predicted_effects: {
        coin_delta: grantCoin,
        relationship_deltas: relDeltas,
        flags_set: []
      },
      uncertainty: "likely",
      expires_turn: t + 2,
      actions: ["accept", "reject"]
    });
  }

  const heir = state.house.heir_id ?? deps.computeHeirId(state);
  const inheritanceSignature = heir === null ? inheritanceClaimSignature(state) : null;
  if (
    prospects.length < 3 &&
    !activeTypes.has("inheritance_claim") &&
    heir === null &&
    inheritanceSignature &&
    !isProspectSignatureSuppressed(state, inheritanceSignature)
  ) {
    addProspect({
      id: makeId("inheritance_claim", state.house.head.id),
      type: "inheritance_claim",
      from_house_id: sponsorHouseId,
      to_house_id: playerHouseId,
      subject_person_id: state.house.head.id,
      summary: "Inheritance claim",
      requirements: [],
      costs: {},
      predicted_effects: { flags_set: ["inheritance_claim_active"] },
      uncertainty: "possible",
      expires_turn: t + 2,
      actions: ["accept", "reject"]
    });
  }

  writeActiveProspects(state, active);

  const order: Record<string, number> = { marriage: 0, grant: 1, inheritance_claim: 2 };
  const prospectIntel = buildPolicyIntelMap(state, prospects.map((prospect) => policySubjectIdForProspect(prospect)));
  prospects.sort((a, b) => {
    const da = order[a.type] ?? 99;
    const db = order[b.type] ?? 99;
    if (da !== db) return da - db;
    const policySubjectA = policySubjectIdForProspect(a);
    const policySubjectB = policySubjectIdForProspect(b);
    const scoreA = npcPolicyScore({
      hook: "prospect",
      base_score: 0,
      intel: policySubjectA ? prospectIntel[policySubjectA] ?? null : null,
      state,
      subject_id: policySubjectA
    });
    const scoreB = npcPolicyScore({
      hook: "prospect",
      base_score: 0,
      intel: policySubjectB ? prospectIntel[policySubjectB] ?? null : null,
      state,
      subject_id: policySubjectB
    });
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.id.localeCompare(b.id);
  });

  const householdIds = new Set<string>([state.house.head.id]);
  if (state.house.spouse) householdIds.add(state.house.spouse.id);
  for (const c of state.house.children) householdIds.add(c.id);

  const sponsorRespectOk = (fromHouseId: string): boolean => {
    const houses: Record<string, any> = anyState.houses && typeof anyState.houses === "object" ? (anyState.houses as Record<string, any>) : {};
    const playerHeadId: string = resolveCurrentHouseHeadId(state, playerHouseId) ?? state.house.head.id;
    const sponsorHeadId: string | null = resolveCurrentHouseHeadId(state, fromHouseId);
    if (!sponsorHeadId) return false;
    const e = state.relationships.find((x) => x.from_id === playerHeadId && x.to_id === sponsorHeadId);
    return Boolean(e && e.respect >= 55);
  };

  const shown_ids: string[] = [];
  const hidden_ids: string[] = [];
  for (const p of prospects) {
    const involvesPlayer = p.subject_person_id ? householdIds.has(p.subject_person_id) : false;
    const expiresThisTurn = p.expires_turn === t;
    const sponsorOk = sponsorRespectOk(p.from_house_id);
    const show = involvesPlayer || sponsorOk || expiresThisTurn;
    if (show) shown_ids.push(p.id);
    else hidden_ids.push(p.id);
  }

  if (prospects.length > 0) {
    prospectsLog.push({ kind: "prospects_window_built", turn_index: t, shown_ids, hidden_ids });
  }

  return {
    schema_version: "prospects_window_v1",
    turn_index: t,
    generated_at_turn_index: t,
    prospects,
    shown_ids,
    hidden_ids
  };
}

export function applyProspectsDecisionPhase(
  state: RunState,
  ctx: TurnContext,
  decisions: TurnDecisions,
  prospectsLog: ProspectsLogEvent[]
): void {
  const anyDecisions: any = decisions as any;
  const pd: any = anyDecisions.prospects;
  if (!pd || typeof pd !== "object" || pd.kind !== "prospects") return;
  const actions: any[] = Array.isArray(pd.actions) ? pd.actions : [];
  if (actions.length === 0) return;

  const active = readActiveProspects(state);
  let activeList = active.slice();
  const activeSet = new Set(activeList.map((r) => r.id));

  const windowProspects = ctx.prospects_window?.prospects ?? [];
  const byId = new Map(windowProspects.map((p) => [p.id, p] as const));
  const processed = new Set<string>();

  for (const a of actions) {
    if (!a || typeof a !== "object") continue;
    const pid = (a as any).prospect_id;
    const act = (a as any).action;
    if (typeof pid !== "string" || (act !== "accept" && act !== "reject")) continue;
    if (processed.has(pid) || !activeSet.has(pid)) continue;

    const prospect = byId.get(pid) ?? lookupProspectFromHistory(state, pid);
    if (!prospect) continue;

    let effectiveAct: "accept" | "reject" = act;
    if (effectiveAct === "accept" && prospect.type === "marriage") {
      const sid: any = (prospect as any).subject_person_id;
      const spouseId: any = (prospect as any).spouse_person_id;
      const anyState: any = state as any;
      const reg: Record<string, Person> | undefined = anyState.people as any;
      const subj = sid && reg ? reg[sid] : null;
      const sp = spouseId && reg ? reg[spouseId] : null;
      if (subj && sp && subj.sex === sp.sex) {
        effectiveAct = "reject";
      }
    }

    const applied: any = {};
    const applyRelationshipDeltas = (): void => {
      const rds: any[] | undefined = (prospect as any).predicted_effects?.relationship_deltas;
      if (!Array.isArray(rds) || rds.length === 0) return;
      for (const rd of rds) {
        if (!rd || typeof rd !== "object") continue;
        const from = (rd as any).from_id;
        const to = (rd as any).to_id;
        if (typeof from !== "string" || typeof to !== "string") continue;
        applyRelationshipDelta(
          state,
          from,
          to,
          {
            allegiance: Math.trunc((rd as any).allegiance_delta ?? 0),
            respect: Math.trunc((rd as any).respect_delta ?? 0),
            threat: Math.trunc((rd as any).threat_delta ?? 0)
          },
          "prospect_effect"
        );
      }
      applied.relationship_deltas = rds;
    };

    if (effectiveAct === "accept") {
      const cd = (prospect as any).predicted_effects?.coin_delta;
      if (typeof cd === "number" && Number.isFinite(cd)) {
        const d = Math.trunc(cd);
        applyCoinDelta(state, d);
        applied.coin_delta = d;
      }

      applyRelationshipDeltas();

      if (prospect.type === "marriage") {
        const rds: any[] = Array.isArray((prospect as any).predicted_effects?.relationship_deltas)
          ? (prospect as any).predicted_effects.relationship_deltas
          : [];
        const playerHouseId: string | null = typeof (state as any)?.player_house_id === "string" ? String((state as any).player_house_id) : null;
        const hh = rds.find((rd: any) => rd && rd.scope === "house" && typeof rd.from_id === "string" && typeof rd.to_id === "string" && (rd.from_id === playerHouseId || rd.to_id === playerHouseId));
        if (hh) {
          const otherHouseId = hh.from_id === playerHouseId ? hh.to_id : hh.from_id;
          const houses: any = (state as any)?.houses;
          const houseName = typeof houses?.[otherHouseId]?.name === "string" ? houses[otherHouseId].name : otherHouseId;
          const aDelta = Math.trunc(hh.allegiance_delta ?? 0);
          const rDelta = Math.trunc(hh.respect_delta ?? 0);
          const tDelta = Math.trunc(hh.threat_delta ?? 0);
          applied.receipt_line = `Marriage alliance with House ${houseName}: A ${aDelta >= 0 ? "+" : ""}${aDelta}, R ${rDelta >= 0 ? "+" : ""}${rDelta}, T ${tDelta >= 0 ? "+" : ""}${tDelta}`;
        }
      }

      const fs: any[] | undefined = (prospect as any).predicted_effects?.flags_set;
      if (Array.isArray(fs) && fs.length > 0) {
        const anyFlags: any = state.flags;
        const appliedFlags: string[] = [];
        for (const f of fs) {
          if (typeof f === "string" && f.length > 0) {
            anyFlags[f] = true;
            appliedFlags.push(f);
          }
        }
        if (appliedFlags.length > 0) applied.flags_set = appliedFlags;
      }

      if (prospect.type === "marriage" && prospect.subject_person_id) {
        const sid = prospect.subject_person_id;
        const anyState: any = state as any;
        if (anyState.people && anyState.people[sid]) {
          anyState.people[sid].married = true;
        }
        if (state.house.head.id === sid) state.house.head.married = true;
        if (state.house.spouse && state.house.spouse.id === sid) state.house.spouse.married = true;
        for (const c of state.house.children) {
          if (c.id === sid) c.married = true;
        }

        const spouseId: any = (prospect as any).spouse_person_id;
        if (typeof spouseId === "string" && spouseId.length > 0 && spouseId !== sid) {
          if (anyState.people && anyState.people[spouseId]) {
            anyState.people[spouseId].married = true;
          }
        }

        if (typeof spouseId === "string" && spouseId.length > 0 && spouseId !== sid) {
          ensureMarriageKinshipEdge(state, sid, spouseId);
        }

        const subjectChild = state.house.children.find((c) => c.id === sid) ?? null;
        const spouseJoinsCourt = Boolean(subjectChild) && subjectChild.sex === "M";

        if (spouseJoinsCourt && typeof spouseId === "string" && spouseId.length > 0 && spouseId !== sid) {
          addCourtExtraId(state, spouseId);
          const playerHouseId: string = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
          if (anyState.people && anyState.people[spouseId]) {
            anyState.people[spouseId].house_id = playerHouseId;
            anyState.people[spouseId].residence_house_id = playerHouseId;
          }
          if (anyState.houses && anyState.houses[playerHouseId]) {
            const h: any = anyState.houses[playerHouseId];
            if (!Array.isArray(h.member_person_ids)) h.member_person_ids = [];
            if (!h.member_person_ids.includes(spouseId)) h.member_person_ids.push(spouseId);
          }
          removeCourtExcludeId(state, sid);
        } else if (subjectChild && subjectChild.sex === "F") {
          addCourtExcludeId(state, sid);
          const destHouseId = typeof prospect.from_house_id === "string" && prospect.from_house_id.length > 0 ? prospect.from_house_id : null;
          if (anyState.people && anyState.people[sid] && destHouseId) {
            anyState.people[sid].house_id = destHouseId;
            anyState.people[sid].residence_house_id = destHouseId;
          }
          const playerHouseId: string = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
          const playerHouseRec: any = anyState.houses?.[playerHouseId];
          if (playerHouseRec && Array.isArray(playerHouseRec.member_person_ids)) {
            playerHouseRec.member_person_ids = playerHouseRec.member_person_ids.filter((x: any) => x !== sid);
          }
          const destHouseRec: any = destHouseId ? anyState.houses?.[destHouseId] : null;
          if (destHouseRec) {
            if (!Array.isArray(destHouseRec.member_person_ids)) destHouseRec.member_person_ids = [];
            if (!destHouseRec.member_person_ids.includes(sid)) destHouseRec.member_person_ids.push(sid);
          }
        }
      }

      prospectsLog.push({
        kind: "prospect_accepted",
        turn_index: state.turn_index,
        type: prospect.type,
        from_house_id: prospect.from_house_id,
        to_house_id: prospect.to_house_id,
        subject_person_id: prospect.subject_person_id,
        prospect_id: prospect.id,
        effects_applied: applied
      });
      rememberResolvedProspect(state, prospect, "accept");
    } else {
      prospectsLog.push({
        kind: "prospect_rejected",
        turn_index: state.turn_index,
        type: prospect.type,
        from_house_id: prospect.from_house_id,
        to_house_id: prospect.to_house_id,
        subject_person_id: prospect.subject_person_id,
        prospect_id: prospect.id,
        effects_applied: applied
      });
      rememberResolvedProspect(state, prospect, "reject");
    }

    if (prospect.type === "marriage") {
      const spouseForReservation: any = (prospect as any).spouse_person_id;
      if (typeof spouseForReservation === "string" && spouseForReservation.length > 0) {
        clearReservation(state, spouseForReservation);
      }
    }

    activeList = activeList.filter((r) => r.id !== pid);
    activeSet.delete(pid);
    processed.add(pid);
  }

  writeActiveProspects(state, activeList);
}
