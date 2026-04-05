import { allHouseMemberIds, playerHouseIdOf, registryPersonFor, resolveCurrentHouseHeadId } from "../../actors";
import type {
  HouseDossierHouseholdScope,
  HouseDossierKinshipSummary,
  HouseDossierRelationshipBand,
  HouseDossierSummary,
  KnownHouseSummary,
  RunState,
} from "../../types";
import { buildKnownHouseRelevanceSnapshot, listRelevantTier1HouseIds } from "./knownHouseRelevance";

export const HOUSE_DOSSIER_SUMMARY_SCHEMA_VERSION = "house_dossier_summary_v1" as const;

type KnownHouseExperienceSurfaces = {
  known_houses: KnownHouseSummary[];
  house_dossiers: HouseDossierSummary[];
};

function housesMap(state: RunState): Record<string, any> {
  const anyState: any = state as any;
  return anyState?.houses && typeof anyState.houses === "object" ? (anyState.houses as Record<string, any>) : {};
}

function readHouseName(houseId: string, house: any): string {
  const raw =
    typeof house?.house_name === "string"
      ? house.house_name
      : typeof house?.houseName === "string"
        ? house.houseName
        : typeof house?.name === "string"
          ? house.name
          : houseId;
  const value = String(raw ?? "").trim();
  return value || houseId;
}

function readTier(house: any): string {
  return typeof house?.tier === "string" && house.tier.trim().length > 0 ? String(house.tier).trim() : "";
}

function readRelationshipToPlayer(state: RunState, houseId: string): KnownHouseSummary["relationship"] {
  const playerHeadId = state.house?.head?.id ?? null;
  const headId = resolveCurrentHouseHeadId(state, houseId);
  if (!playerHeadId || !headId) return null;

  const edge = (state.relationships ?? []).find((entry) => entry.from_id === headId && entry.to_id === playerHeadId);
  if (!edge) return null;

  return {
    allegiance: edge.allegiance,
    respect: edge.respect,
    threat: edge.threat,
  };
}

function classifyRelationshipBand(relationship: KnownHouseSummary["relationship"]): HouseDossierRelationshipBand {
  if (!relationship) return "unknown";
  if (relationship.threat >= 26 || relationship.allegiance <= 42 || relationship.respect <= 44) return "hostile";
  if (relationship.allegiance >= 60 && relationship.respect >= 56 && relationship.threat <= 16) return "favorable";
  if (relationship.allegiance >= 48 && relationship.respect >= 48 && relationship.threat <= 22) return "steady";
  return "wary";
}

function kinshipSummaryForReasons(reasons: KnownHouseSummary["relevance_reasons"]): HouseDossierKinshipSummary {
  const hasBlood = reasons.includes("blood_tie");
  const hasMarriage = reasons.includes("marriage_tie");
  if (hasBlood && hasMarriage) return "blood_and_marriage_tie";
  if (hasBlood) return "blood_tie";
  if (hasMarriage) return "marriage_tie";
  return "none";
}

function householdScopeForHouse(house: any, memberCount: number, childCount: number): HouseDossierHouseholdScope {
  if (memberCount > 1) return "household_seeded";
  if (childCount > 0) return "household_seeded";
  if (typeof house?.spouse_id === "string" && house.spouse_id.length > 0) return "household_seeded";
  return "head_only";
}

function heirSignalsForHouse(state: RunState, house: any): {
  has_male_heir: boolean;
  heiress_possible: boolean;
  heir_indicator: KnownHouseSummary["heir_indicator"];
} {
  const childIds = Array.isArray(house?.child_ids) ? house.child_ids.filter((id: unknown) => typeof id === "string" && id.length > 0) : [];
  const livingChildren = childIds
    .map((childId: string) => registryPersonFor(state, childId))
    .filter((person): person is NonNullable<typeof person> => !!person && person.alive !== false);

  const hasMaleHeir = livingChildren.some((person) => person.sex === "M");
  const heiressPossible = !hasMaleHeir && livingChildren.some((person) => person.sex === "F");

  return {
    has_male_heir: hasMaleHeir,
    heiress_possible: heiressPossible,
    heir_indicator: hasMaleHeir ? "has_male_heir" : heiressPossible ? "heiress_possible" : "no_male_heir",
  };
}

export function buildKnownHouseExperienceSurfaces(state: RunState): KnownHouseExperienceSurfaces {
  const houses = housesMap(state);
  const playerHouseId = playerHouseIdOf(state);
  const relevance = buildKnownHouseRelevanceSnapshot(state);
  const relevanceByHouseId = new Map(relevance.entries.map((entry) => [entry.house_id, entry]));
  const selectedHouseIds = listRelevantTier1HouseIds(
    state,
    Object.keys(houses).filter((houseId) => houseId !== playerHouseId)
  );

  const known_houses: KnownHouseSummary[] = [];
  const house_dossiers: HouseDossierSummary[] = [];

  for (const houseId of selectedHouseIds) {
    const house = houses[houseId];
    if (!house || typeof house !== "object") continue;

    const relevanceEntry = relevanceByHouseId.get(houseId);
    const headId = resolveCurrentHouseHeadId(state, houseId);
    const head = registryPersonFor(state, headId);
    const relationship = readRelationshipToPlayer(state, houseId);
    const heirSignals = heirSignalsForHouse(state, house);
    const memberIds = allHouseMemberIds(state, houseId);
    const householdMemberCount = memberIds.length;
    const livingMemberCount = memberIds
      .map((personId) => registryPersonFor(state, personId))
      .filter((person) => !!person && person.alive !== false).length;
    const childCount = Array.isArray(house.child_ids) ? house.child_ids.length : 0;
    const reasons = relevanceEntry?.reasons ?? [];
    const houseName = readHouseName(houseId, house);
    const tier = readTier(house);

    known_houses.push({
      house_id: houseId,
      house_name: houseName,
      tier,
      relevance_tier: relevanceEntry?.tier ?? "tier1",
      relevance_reasons: [...reasons],
      head_id: headId,
      head_name: head?.name ?? "",
      head_age: typeof head?.age === "number" ? head.age : null,
      head_status: head ? (head.alive === false ? "Deceased" : "Alive") : "Unknown",
      head_short_id: typeof (head as any)?.short_id === "string" ? String((head as any).short_id) : null,
      heir_indicator: heirSignals.heir_indicator,
      has_male_heir: heirSignals.has_male_heir,
      heiress_possible: heirSignals.heiress_possible,
      relationship,
    });

    house_dossiers.push({
      schema_version: HOUSE_DOSSIER_SUMMARY_SCHEMA_VERSION,
      house_id: houseId,
      house_name: houseName,
      tier,
      relevance_tier: relevanceEntry?.tier ?? "tier1",
      relevance_reasons: [...reasons],
      kinship_summary: kinshipSummaryForReasons(reasons),
      relationship_band: classifyRelationshipBand(relationship),
      household_scope: householdScopeForHouse(house, householdMemberCount, childCount),
      household_member_count: householdMemberCount,
      living_member_count: livingMemberCount,
      child_count: childCount,
      has_male_heir: heirSignals.has_male_heir,
      heiress_possible: heirSignals.heiress_possible,
    });
  }

  return { known_houses, house_dossiers };
}
