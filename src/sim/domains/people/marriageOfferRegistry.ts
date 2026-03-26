import { structuredHouseIdForPerson } from "../../actors";
import type { MarriageOffer, Prospect, RunState } from "../../types";

export const MARRIAGE_OFFER_REGISTRY_SCHEMA_VERSION = "marriage_offer_registry_v0" as const;
export const MARRIAGE_REJECT_COOLDOWN_TURNS = 3 as const;

export const MARRIAGE_OFFER_DIRECTIONS = ["inbound", "outbound"] as const;
export type MarriageOfferDirection = (typeof MARRIAGE_OFFER_DIRECTIONS)[number];

export const MARRIAGE_OFFER_NON_TERMINAL_STATES = ["generated", "pending"] as const;
export const MARRIAGE_OFFER_TERMINAL_STATES = ["accepted", "rejected", "expired", "withdrawn"] as const;
export const MARRIAGE_OFFER_STATES = [
  ...MARRIAGE_OFFER_NON_TERMINAL_STATES,
  ...MARRIAGE_OFFER_TERMINAL_STATES,
] as const;
export type MarriageOfferState = (typeof MARRIAGE_OFFER_STATES)[number];

export type MarriageOfferRegistryEntry = {
  schema_version: typeof MARRIAGE_OFFER_REGISTRY_SCHEMA_VERSION;
  offer_key: string;
  direction: MarriageOfferDirection;
  state: MarriageOfferState;
  subject_key: string;
  subject_person_id: string;
  subject_house_id: string | null;
  candidate_key: string;
  candidate_person_id: string;
  candidate_house_id: string | null;
  candidate_house_label: string;
  created_turn: number;
  last_state_change_turn: number;
  offer_rank: number;
  dowry_coin_net: number;
  relationship_delta: { respect: number; allegiance: number; threat: number };
  liege_delta: { respect: number; threat: number } | null;
  risk_tags: string[];
};

export type MarriageOfferRegistry = {
  schema_version: typeof MARRIAGE_OFFER_REGISTRY_SCHEMA_VERSION;
  offer_keys: string[];
  subject_keys: string[];
  candidate_keys: string[];
  offers_by_key: Record<string, MarriageOfferRegistryEntry>;
  subject_offer_keys: Record<string, string[]>;
  candidate_offer_keys: Record<string, string[]>;
};

export type MarriageOfferRegistrySubjectDraft = {
  subject_person_id: string;
  offers: MarriageOffer[];
  direction?: MarriageOfferDirection;
  state?: MarriageOfferState;
  created_turn?: number;
};

export type MarriageOfferSubjectOwnership = {
  subject_key: string;
  subject_person_id: string;
  subject_house_id: string | null;
  offer_keys: string[];
  active_offer_keys: string[];
  terminal_offer_keys: string[];
  candidate_keys: string[];
};

export type MarriageOfferOwnershipIndex = {
  schema_version: typeof MARRIAGE_OFFER_REGISTRY_SCHEMA_VERSION;
  subject_keys: string[];
  active_subject_keys: string[];
  subjects_by_key: Record<string, MarriageOfferSubjectOwnership>;
};

export type MarriageRejectCooldownEntry = {
  pairing_key: string;
  offer_key: string;
  subject_key: string;
  subject_person_id: string;
  candidate_key: string;
  candidate_person_id: string;
  rejected_turn: number;
  expires_turn: number;
  remaining_turns: number;
};

export type MarriageOfferRegistryEntryDraft = {
  direction?: MarriageOfferDirection;
  state?: MarriageOfferState;
  subject_person_id: string;
  subject_house_id?: string | null;
  candidate_person_id: string;
  candidate_house_id?: string | null;
  candidate_house_label: string;
  created_turn: number;
  last_state_change_turn?: number;
  offer_rank?: number;
  dowry_coin_net: number;
  relationship_delta: { respect: number; allegiance: number; threat: number };
  liege_delta?: { respect: number; threat: number } | null;
  risk_tags: string[];
};

function sortStrings(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function sortUniqueStrings(values: Iterable<string>): string[] {
  return sortStrings(new Set([...values].filter((value) => value.length > 0)));
}

function normalizeState(state: MarriageOfferState | undefined): MarriageOfferState {
  return state ?? "generated";
}

export function makeMarriageOfferSubjectKey(subjectPersonId: string): string {
  return `subject:${subjectPersonId}`;
}

export function makeMarriageOfferCandidateKey(candidatePersonId: string): string {
  return `candidate:${candidatePersonId}`;
}

export function makeMarriageOfferKey(input: {
  direction?: MarriageOfferDirection;
  subject_person_id: string;
  candidate_person_id: string;
}): string {
  const direction = input.direction ?? "inbound";
  const subjectKey = makeMarriageOfferSubjectKey(input.subject_person_id);
  const candidateKey = makeMarriageOfferCandidateKey(input.candidate_person_id);
  return `marriage_offer:${direction}:${subjectKey}:${candidateKey}`;
}

export function makeMarriageOfferPairingKey(input: {
  subject_person_id: string;
  candidate_person_id: string;
}): string {
  const subjectKey = makeMarriageOfferSubjectKey(input.subject_person_id);
  const candidateKey = makeMarriageOfferCandidateKey(input.candidate_person_id);
  return `marriage_pairing:${subjectKey}:${candidateKey}`;
}

export function isMarriageOfferTerminalState(state: MarriageOfferState): boolean {
  return (MARRIAGE_OFFER_TERMINAL_STATES as readonly string[]).includes(state);
}

export function isMarriageOfferNonTerminalState(state: MarriageOfferState): boolean {
  return (MARRIAGE_OFFER_NON_TERMINAL_STATES as readonly string[]).includes(state);
}

export function canTransitionMarriageOfferState(from: MarriageOfferState, to: MarriageOfferState): boolean {
  if (from === to) return true;
  if (from === "generated") return true;
  if (from === "pending") return to !== "generated";
  return false;
}

export function assertMarriageOfferStateTransition(from: MarriageOfferState, to: MarriageOfferState): void {
  if (canTransitionMarriageOfferState(from, to)) return;
  throw new Error(`Invalid marriage offer state transition: ${from} -> ${to}`);
}

export function createMarriageOfferRegistryEntry(
  draft: MarriageOfferRegistryEntryDraft
): MarriageOfferRegistryEntry {
  const direction = draft.direction ?? "inbound";
  const state = normalizeState(draft.state);
  const subjectKey = makeMarriageOfferSubjectKey(draft.subject_person_id);
  const candidateKey = makeMarriageOfferCandidateKey(draft.candidate_person_id);

  return {
    schema_version: MARRIAGE_OFFER_REGISTRY_SCHEMA_VERSION,
    offer_key: makeMarriageOfferKey({
      direction,
      subject_person_id: draft.subject_person_id,
      candidate_person_id: draft.candidate_person_id,
    }),
    direction,
    state,
    subject_key: subjectKey,
    subject_person_id: draft.subject_person_id,
    subject_house_id: draft.subject_house_id ?? null,
    candidate_key: candidateKey,
    candidate_person_id: draft.candidate_person_id,
    candidate_house_id: draft.candidate_house_id ?? null,
    candidate_house_label: draft.candidate_house_label,
    created_turn: Math.trunc(draft.created_turn),
    last_state_change_turn: Math.trunc(draft.last_state_change_turn ?? draft.created_turn),
    offer_rank: Math.trunc(draft.offer_rank ?? 0),
    dowry_coin_net: Math.trunc(draft.dowry_coin_net),
    relationship_delta: {
      respect: Math.trunc(draft.relationship_delta.respect),
      allegiance: Math.trunc(draft.relationship_delta.allegiance),
      threat: Math.trunc(draft.relationship_delta.threat),
    },
    liege_delta: draft.liege_delta
      ? {
          respect: Math.trunc(draft.liege_delta.respect),
          threat: Math.trunc(draft.liege_delta.threat),
        }
      : null,
    risk_tags: sortUniqueStrings(draft.risk_tags),
  };
}

export function buildMarriageOfferRegistry(
  entries: MarriageOfferRegistryEntryDraft[]
): MarriageOfferRegistry {
  const normalized = entries
    .map((entry) => createMarriageOfferRegistryEntry(entry))
    .sort((a, b) => a.offer_key.localeCompare(b.offer_key));

  const offersByKey: Record<string, MarriageOfferRegistryEntry> = {};
  const subjectOfferKeys = new Map<string, string[]>();
  const candidateOfferKeys = new Map<string, string[]>();

  for (const entry of normalized) {
    offersByKey[entry.offer_key] = entry;

    const subjectKeys = subjectOfferKeys.get(entry.subject_key) ?? [];
    subjectKeys.push(entry.offer_key);
    subjectOfferKeys.set(entry.subject_key, subjectKeys);

    const candidateKeys = candidateOfferKeys.get(entry.candidate_key) ?? [];
    candidateKeys.push(entry.offer_key);
    candidateOfferKeys.set(entry.candidate_key, candidateKeys);
  }

  const subjectKeys = sortStrings(subjectOfferKeys.keys());
  const candidateKeys = sortStrings(candidateOfferKeys.keys());
  const offerKeys = normalized.map((entry) => entry.offer_key);

  return {
    schema_version: MARRIAGE_OFFER_REGISTRY_SCHEMA_VERSION,
    offer_keys: offerKeys,
    subject_keys: subjectKeys,
    candidate_keys: candidateKeys,
    offers_by_key: offersByKey,
    subject_offer_keys: Object.fromEntries(
      subjectKeys.map((subjectKey) => [subjectKey, sortStrings(subjectOfferKeys.get(subjectKey) ?? [])])
    ),
    candidate_offer_keys: Object.fromEntries(
      candidateKeys.map((candidateKey) => [candidateKey, sortStrings(candidateOfferKeys.get(candidateKey) ?? [])])
    ),
  };
}

export function buildMarriageOfferRegistryFromSubjectOffers(
  state: RunState,
  subjectDrafts: MarriageOfferRegistrySubjectDraft[]
): MarriageOfferRegistry {
  return buildMarriageOfferRegistry(
    subjectDrafts.flatMap((subjectDraft) => {
      const subjectHouseId = structuredHouseIdForPerson(state, subjectDraft.subject_person_id);
      const direction = subjectDraft.direction ?? "inbound";
      const offerState = normalizeState(subjectDraft.state);
      const createdTurn = Math.trunc(subjectDraft.created_turn ?? state.turn_index);

      return subjectDraft.offers.map((offer, index) => ({
        direction,
        state: offerState,
        subject_person_id: subjectDraft.subject_person_id,
        subject_house_id: subjectHouseId,
        candidate_person_id: offer.house_person_id,
        candidate_house_id: structuredHouseIdForPerson(state, offer.house_person_id),
        candidate_house_label: offer.house_label,
        created_turn: createdTurn,
        offer_rank: index,
        dowry_coin_net: offer.dowry_coin_net,
        relationship_delta: {
          respect: offer.relationship_delta.respect,
          allegiance: offer.relationship_delta.allegiance,
          threat: offer.relationship_delta.threat,
        },
        liege_delta: offer.liege_delta
          ? { respect: offer.liege_delta.respect, threat: offer.liege_delta.threat }
          : null,
        risk_tags: offer.risk_tags,
      }));
    })
  );
}

export function buildMarriageOfferRegistryFromOffers(
  state: RunState,
  opts: MarriageOfferRegistrySubjectDraft
): MarriageOfferRegistry {
  return buildMarriageOfferRegistryFromSubjectOffers(state, [opts]);
}

export function buildMarriageOfferOwnershipIndex(
  registry: MarriageOfferRegistry
): MarriageOfferOwnershipIndex {
  const subjectsByKey: Record<string, MarriageOfferSubjectOwnership> = {};
  const activeSubjectKeys: string[] = [];

  for (const subjectKey of registry.subject_keys) {
    const offerKeys = registry.subject_offer_keys[subjectKey] ?? [];
    const entries = offerKeys
      .map((offerKey) => registry.offers_by_key[offerKey])
      .filter((entry): entry is MarriageOfferRegistryEntry => Boolean(entry));
    if (entries.length === 0) continue;

    const firstEntry = entries[0]!;
    const activeOfferKeys = entries
      .filter((entry) => isMarriageOfferNonTerminalState(entry.state))
      .map((entry) => entry.offer_key);
    const terminalOfferKeys = entries
      .filter((entry) => isMarriageOfferTerminalState(entry.state))
      .map((entry) => entry.offer_key);

    if (activeOfferKeys.length > 0) activeSubjectKeys.push(subjectKey);

    subjectsByKey[subjectKey] = {
      subject_key: subjectKey,
      subject_person_id: firstEntry.subject_person_id,
      subject_house_id: firstEntry.subject_house_id,
      offer_keys: offerKeys,
      active_offer_keys: activeOfferKeys,
      terminal_offer_keys: terminalOfferKeys,
      candidate_keys: sortUniqueStrings(entries.map((entry) => entry.candidate_key)),
    };
  }

  return {
    schema_version: MARRIAGE_OFFER_REGISTRY_SCHEMA_VERSION,
    subject_keys: [...registry.subject_keys],
    active_subject_keys: activeSubjectKeys,
    subjects_by_key: subjectsByKey,
  };
}

export function buildMarriageOfferOwnershipIndexFromState(
  state: RunState
): MarriageOfferOwnershipIndex {
  return buildMarriageOfferOwnershipIndex(buildMarriageOfferRegistryFromState(state));
}

type ActiveProspectRef = { id: string; expires_turn: number };

function readActiveProspects(state: RunState): ActiveProspectRef[] {
  const anyFlags: any = state.flags as any;
  const raw = anyFlags?._prospects_active_v1;
  if (!Array.isArray(raw)) return [];

  const out: ActiveProspectRef[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const id = typeof (row as any).id === "string" ? String((row as any).id) : "";
    const expiresTurn = (row as any).expires_turn;
    if (!id || typeof expiresTurn !== "number" || !Number.isFinite(expiresTurn)) continue;
    out.push({ id, expires_turn: Math.trunc(expiresTurn) });
  }

  return out;
}

function inferCandidateHouseLabel(state: RunState, candidateHouseId: string | null): string {
  if (!candidateHouseId) return "Unknown";
  const houses: Record<string, any> =
    (state as any)?.houses && typeof (state as any).houses === "object"
      ? ((state as any).houses as Record<string, any>)
      : {};
  const house = houses[candidateHouseId];
  const name = typeof house?.name === "string" && house.name ? String(house.name) : candidateHouseId;
  return name.startsWith("House ") ? name : `House ${name}`;
}

function relationshipDeltaFromProspect(state: RunState, prospect: Prospect): {
  respect: number;
  allegiance: number;
  threat: number;
} {
  const candidateId = typeof prospect.spouse_person_id === "string" ? prospect.spouse_person_id : "";
  const relDeltas = Array.isArray((prospect as any)?.predicted_effects?.relationship_deltas)
    ? ((prospect as any).predicted_effects.relationship_deltas as any[])
    : [];
  const row = relDeltas.find(
    (delta) =>
      delta &&
      typeof delta === "object" &&
      delta.scope === "person" &&
      typeof delta.to_id === "string" &&
      delta.to_id === candidateId
  );

  return {
    respect: Math.trunc((row as any)?.respect_delta ?? 0),
    allegiance: Math.trunc((row as any)?.allegiance_delta ?? 0),
    threat: Math.trunc((row as any)?.threat_delta ?? 0),
  };
}

function liegeDeltaFromProspect(state: RunState, prospect: Prospect): { respect: number; threat: number } | null {
  const liegeId = state.locals?.liege?.id;
  if (typeof liegeId !== "string" || !liegeId) return null;

  const relDeltas = Array.isArray((prospect as any)?.predicted_effects?.relationship_deltas)
    ? ((prospect as any).predicted_effects.relationship_deltas as any[])
    : [];
  const row = relDeltas.find(
    (delta) =>
      delta &&
      typeof delta === "object" &&
      delta.scope === "person" &&
      typeof delta.to_id === "string" &&
      delta.to_id === liegeId
  );
  if (!row) return null;

  return {
    respect: Math.trunc((row as any)?.respect_delta ?? 0),
    threat: Math.trunc((row as any)?.threat_delta ?? 0),
  };
}

function draftFromProspect(
  state: RunState,
  prospect: Prospect,
  createdTurn: number
): MarriageOfferRegistryEntryDraft | null {
  const subjectPersonId = typeof prospect.subject_person_id === "string" ? prospect.subject_person_id : "";
  const candidatePersonId =
    typeof prospect.spouse_person_id === "string" && prospect.spouse_person_id.length > 0
      ? prospect.spouse_person_id
      : "";
  if (!subjectPersonId || !candidatePersonId) return null;

  const subjectHouseId = structuredHouseIdForPerson(state, subjectPersonId);
  const candidateHouseId =
    typeof prospect.from_house_id === "string" && prospect.from_house_id.length > 0
      ? prospect.from_house_id
      : structuredHouseIdForPerson(state, candidatePersonId);

  return {
    direction: "inbound",
    state: "generated",
    subject_person_id: subjectPersonId,
    subject_house_id: subjectHouseId,
    candidate_person_id: candidatePersonId,
    candidate_house_id: candidateHouseId,
    candidate_house_label: inferCandidateHouseLabel(state, candidateHouseId),
    created_turn: Math.trunc(createdTurn),
    last_state_change_turn: Math.trunc(createdTurn),
    offer_rank: 0,
    dowry_coin_net: Math.trunc((prospect as any)?.predicted_effects?.coin_delta ?? 0),
    relationship_delta: relationshipDeltaFromProspect(state, prospect),
    liege_delta: liegeDeltaFromProspect(state, prospect),
    risk_tags: [],
  };
}

function comparePendingPrecedence(a: MarriageOfferRegistryEntry, b: MarriageOfferRegistryEntry): number {
  if (a.created_turn !== b.created_turn) return a.created_turn - b.created_turn;
  if (a.last_state_change_turn !== b.last_state_change_turn) {
    return a.last_state_change_turn - b.last_state_change_turn;
  }
  return a.offer_key.localeCompare(b.offer_key);
}

function updatedEntryState(
  entry: MarriageOfferRegistryEntry,
  nextState: MarriageOfferState,
  turnIndex: number
): MarriageOfferRegistryEntry {
  assertMarriageOfferStateTransition(entry.state, nextState);
  return {
    ...entry,
    state: nextState,
    last_state_change_turn: Math.trunc(turnIndex),
  };
}

export function buildMarriageRejectCooldowns(
  registry: MarriageOfferRegistry,
  currentTurn: number
): Record<string, MarriageRejectCooldownEntry> {
  const currentTurnIndex = Math.trunc(currentTurn);
  const cooldowns = new Map<string, MarriageRejectCooldownEntry>();

  for (const offerKey of registry.offer_keys) {
    const entry = registry.offers_by_key[offerKey];
    if (!entry || entry.state !== "rejected") continue;

    const rejectedTurn = Math.trunc(entry.last_state_change_turn);
    const expiresTurn = rejectedTurn + MARRIAGE_REJECT_COOLDOWN_TURNS;
    const remainingTurns = expiresTurn - currentTurnIndex + 1;
    if (remainingTurns <= 0) continue;

    const pairingKey = makeMarriageOfferPairingKey({
      subject_person_id: entry.subject_person_id,
      candidate_person_id: entry.candidate_person_id,
    });
    const current = cooldowns.get(pairingKey);
    if (current && current.rejected_turn > rejectedTurn) continue;

    cooldowns.set(pairingKey, {
      pairing_key: pairingKey,
      offer_key: entry.offer_key,
      subject_key: entry.subject_key,
      subject_person_id: entry.subject_person_id,
      candidate_key: entry.candidate_key,
      candidate_person_id: entry.candidate_person_id,
      rejected_turn: rejectedTurn,
      expires_turn: expiresTurn,
      remaining_turns: remainingTurns,
    });
  }

  return Object.fromEntries(
    sortStrings(cooldowns.keys()).map((pairingKey) => [pairingKey, cooldowns.get(pairingKey)!])
  );
}

export function buildMarriageRejectCooldownsFromState(
  state: RunState
): Record<string, MarriageRejectCooldownEntry> {
  return buildMarriageRejectCooldowns(buildMarriageOfferRegistryFromState(state), state.turn_index);
}

export function getMarriageRejectCooldown(
  state: RunState,
  subjectPersonId: string,
  candidatePersonId: string
): MarriageRejectCooldownEntry | null {
  const pairingKey = makeMarriageOfferPairingKey({
    subject_person_id: subjectPersonId,
    candidate_person_id: candidatePersonId,
  });
  return buildMarriageRejectCooldownsFromState(state)[pairingKey] ?? null;
}

export function isMarriagePairCoolingDown(
  state: RunState,
  subjectPersonId: string,
  candidatePersonId: string
): boolean {
  return (
    getMarriageRejectCooldown(state, subjectPersonId, candidatePersonId) !== null
  );
}

export function buildMarriageOfferRegistryFromState(state: RunState): MarriageOfferRegistry {
  const entriesByKey = new Map<string, MarriageOfferRegistryEntry>();
  const prospectKeyById = new Map<string, string>();

  const log: any[] = Array.isArray(state.log) ? (state.log as any[]) : [];
  for (const turnEntry of log) {
    const report = turnEntry?.report;
    const events: any[] = Array.isArray(report?.prospects_log) ? report.prospects_log : [];

    for (const event of events) {
      if (!event || typeof event !== "object") continue;
      if (event.type !== "marriage") continue;

      if (event.kind === "prospect_generated" && event.prospect && typeof event.prospect === "object") {
        const draft = draftFromProspect(state, event.prospect as Prospect, Math.trunc(event.turn_index ?? 0));
        if (!draft) continue;
        const entry = createMarriageOfferRegistryEntry(draft);
        entriesByKey.set(entry.offer_key, entry);
        prospectKeyById.set(String(event.prospect_id ?? ""), entry.offer_key);
        continue;
      }

      if (
        event.kind === "prospect_accepted" ||
        event.kind === "prospect_rejected" ||
        event.kind === "prospect_expired"
      ) {
        const prospectId = String(event.prospect_id ?? "");
        const offerKey = prospectKeyById.get(prospectId);
        if (!offerKey) continue;
        const entry = entriesByKey.get(offerKey);
        if (!entry) continue;

        const nextState: MarriageOfferState =
          event.kind === "prospect_accepted"
            ? "accepted"
            : event.kind === "prospect_rejected"
              ? "rejected"
              : "expired";

        entriesByKey.set(offerKey, updatedEntryState(entry, nextState, Math.trunc(event.turn_index ?? 0)));
      }
    }
  }

  for (const ref of readActiveProspects(state)) {
    const offerKey = prospectKeyById.get(ref.id);
    if (!offerKey) continue;
    const entry = entriesByKey.get(offerKey);
    if (!entry) continue;
    if (isMarriageOfferTerminalState(entry.state)) continue;
    entriesByKey.set(offerKey, updatedEntryState(entry, "pending", entry.created_turn));
  }

  const pendingByCandidate = new Map<string, MarriageOfferRegistryEntry[]>();
  for (const entry of entriesByKey.values()) {
    if (entry.state !== "pending") continue;
    const rows = pendingByCandidate.get(entry.candidate_key) ?? [];
    rows.push(entry);
    pendingByCandidate.set(entry.candidate_key, rows);
  }

  for (const rows of pendingByCandidate.values()) {
    if (rows.length <= 1) continue;
    const sorted = [...rows].sort(comparePendingPrecedence);
    const keep = sorted[0]?.offer_key;
    for (const row of sorted) {
      if (row.offer_key === keep) continue;
      entriesByKey.set(row.offer_key, updatedEntryState(row, "withdrawn", state.turn_index));
    }
  }

  return buildMarriageOfferRegistry([...entriesByKey.values()]);
}
