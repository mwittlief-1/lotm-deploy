import { structuredHouseIdForPerson } from "../../actors";
import type { MarriageOffer, RunState } from "../../types";

export const MARRIAGE_OFFER_REGISTRY_SCHEMA_VERSION = "marriage_offer_registry_v0" as const;

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

export function buildMarriageOfferRegistryFromOffers(
  state: RunState,
  opts: {
    subject_person_id: string;
    offers: MarriageOffer[];
    direction?: MarriageOfferDirection;
    state?: MarriageOfferState;
    created_turn?: number;
  }
): MarriageOfferRegistry {
  const subjectHouseId = structuredHouseIdForPerson(state, opts.subject_person_id);
  const direction = opts.direction ?? "inbound";
  const offerState = normalizeState(opts.state);
  const createdTurn = Math.trunc(opts.created_turn ?? state.turn_index);

  return buildMarriageOfferRegistry(
    opts.offers.map((offer, index) => ({
      direction,
      state: offerState,
      subject_person_id: opts.subject_person_id,
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
    }))
  );
}
