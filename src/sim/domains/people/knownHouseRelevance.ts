import { houseIdForPerson, playerHouseIdOf, structuredHouseIdForPerson } from "../../actors";
import { getChildren, getLivingSpouse, getParents, getSiblings } from "../../kinship";
import type { RunState } from "../../types";

export const KNOWN_HOUSE_RELEVANCE_SCHEMA_VERSION = "known_house_relevance_v1";
export const KNOWN_HOUSE_RELEVANCE_MAX_HOUSES_DEFAULT = 160;

export type KnownHouseRelevanceReason = "player_house" | "blood_tie" | "marriage_tie";
export type KnownHouseRelevanceTier = "tier0" | "tier1";

export type KnownHouseRelevanceEntry = {
  house_id: string;
  tier: KnownHouseRelevanceTier;
  reasons: KnownHouseRelevanceReason[];
  via_person_ids: string[];
};

export type KnownHouseRelevanceSnapshot = {
  schema_version: typeof KNOWN_HOUSE_RELEVANCE_SCHEMA_VERSION;
  turn_index: number;
  tier0_house_ids: string[];
  tier1_house_ids: string[];
  entries: KnownHouseRelevanceEntry[];
  max_tier1_houses: number;
  truncated: boolean;
};

type Tier1PromotionReason = Exclude<KnownHouseRelevanceReason, "player_house">;

type Tier1Promotion = {
  house_id: string;
  reasons: Set<Tier1PromotionReason>;
  via_person_ids: Set<string>;
};

function readMaxTier1Houses(state: RunState, override: number | null | undefined): number {
  if (typeof override === "number" && Number.isFinite(override)) return Math.max(0, Math.trunc(override));

  const anyFlags: any = (state as any)?.flags;
  const tuned = anyFlags?._tuning?.tier1_max_houses;
  if (typeof tuned === "number" && Number.isFinite(tuned)) return Math.max(0, Math.trunc(tuned));

  return KNOWN_HOUSE_RELEVANCE_MAX_HOUSES_DEFAULT;
}

function householdPersonIds(state: RunState): string[] {
  const ids = new Set<string>();
  const add = (personId: unknown) => {
    if (typeof personId === "string" && personId.length > 0) ids.add(personId);
  };

  add(state.house?.head?.id);
  add(state.house?.spouse?.id ?? null);
  for (const child of state.house?.children ?? []) add(child?.id);

  return [...ids].sort((a, b) => a.localeCompare(b));
}

function resolveHouseIdForPerson(state: RunState, personId: string): string | null {
  return structuredHouseIdForPerson(state, personId) ?? houseIdForPerson(state, personId);
}

function recordTier1Promotion(
  promotions: Map<string, Tier1Promotion>,
  state: RunState,
  playerHouseId: string,
  personId: string,
  reason: Tier1PromotionReason
): void {
  if (!personId) return;

  const houseId = resolveHouseIdForPerson(state, personId);
  if (!houseId || houseId === playerHouseId) return;

  let existing = promotions.get(houseId);
  if (!existing) {
    existing = {
      house_id: houseId,
      reasons: new Set<Tier1PromotionReason>(),
      via_person_ids: new Set<string>(),
    };
    promotions.set(houseId, existing);
  }

  existing.reasons.add(reason);
  existing.via_person_ids.add(personId);
}

function tier1PromotionScore(promotion: Tier1Promotion): number {
  let score = 0;
  if (promotion.reasons.has("marriage_tie")) score += 2;
  if (promotion.reasons.has("blood_tie")) score += 1;
  return score;
}

function sortTier1Promotions(a: Tier1Promotion, b: Tier1Promotion): number {
  const scoreDelta = tier1PromotionScore(b) - tier1PromotionScore(a);
  if (scoreDelta !== 0) return scoreDelta;
  return a.house_id.localeCompare(b.house_id);
}

function sortedTier1Reasons(reasons: Set<Tier1PromotionReason>): Tier1PromotionReason[] {
  const ordered: Tier1PromotionReason[] = [];
  if (reasons.has("blood_tie")) ordered.push("blood_tie");
  if (reasons.has("marriage_tie")) ordered.push("marriage_tie");
  return ordered;
}

export function buildKnownHouseRelevanceSnapshot(
  state: RunState,
  options?: { max_tier1_houses?: number | null }
): KnownHouseRelevanceSnapshot {
  const playerHouseId = playerHouseIdOf(state);
  const playerHouseholdIds = householdPersonIds(state);
  const promotions = new Map<string, Tier1Promotion>();

  for (const personId of playerHouseholdIds) {
    for (const parentId of getParents(state as any, personId)) {
      recordTier1Promotion(promotions, state, playerHouseId, parentId, "blood_tie");
    }
    for (const childId of getChildren(state as any, personId)) {
      recordTier1Promotion(promotions, state, playerHouseId, childId, "blood_tie");
    }
    for (const siblingId of getSiblings(state as any, personId)) {
      recordTier1Promotion(promotions, state, playerHouseId, siblingId, "blood_tie");
    }

    const spouseId = getLivingSpouse(state as any, personId);
    if (spouseId) recordTier1Promotion(promotions, state, playerHouseId, spouseId, "marriage_tie");
  }

  const maxTier1Houses = readMaxTier1Houses(state, options?.max_tier1_houses);
  const tier1Promotions = [...promotions.values()].sort(sortTier1Promotions);
  const includedTier1Promotions = tier1Promotions.slice(0, maxTier1Houses);

  const entries: KnownHouseRelevanceEntry[] = [
    {
      house_id: playerHouseId,
      tier: "tier0",
      reasons: ["player_house"],
      via_person_ids: playerHouseholdIds,
    },
    ...includedTier1Promotions.map((promotion) => ({
      house_id: promotion.house_id,
      tier: "tier1" as const,
      reasons: sortedTier1Reasons(promotion.reasons),
      via_person_ids: [...promotion.via_person_ids].sort((a, b) => a.localeCompare(b)),
    })),
  ];

  return {
    schema_version: KNOWN_HOUSE_RELEVANCE_SCHEMA_VERSION,
    turn_index: Math.trunc(state.turn_index),
    tier0_house_ids: [playerHouseId],
    tier1_house_ids: includedTier1Promotions.map((promotion) => promotion.house_id),
    entries,
    max_tier1_houses: maxTier1Houses,
    truncated: tier1Promotions.length > includedTier1Promotions.length,
  };
}

export function listRelevantTier1HouseIds(
  state: RunState,
  baseHouseIds: Iterable<string>,
  options?: { max_tier1_houses?: number | null }
): string[] {
  const snapshot = buildKnownHouseRelevanceSnapshot(state, options);
  const out: string[] = [];
  const seen = new Set<string>();
  const playerHouseId = playerHouseIdOf(state);

  const push = (houseId: string) => {
    if (!houseId || houseId === playerHouseId) return;
    if (seen.has(houseId)) return;
    if (out.length >= snapshot.max_tier1_houses) return;
    seen.add(houseId);
    out.push(houseId);
  };

  for (const houseId of snapshot.tier1_house_ids) push(houseId);
  for (const houseId of [...baseHouseIds].sort((a, b) => a.localeCompare(b))) push(houseId);

  return out;
}
