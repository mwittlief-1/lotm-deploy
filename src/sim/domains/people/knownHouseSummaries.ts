import { allHouseMemberIds, playerHouseIdOf, registryPersonFor, resolveCurrentHouseHeadId, structuredHouseIdForPerson } from "../../actors";
import type {
  BoundedHouseDossierSummary,
  HouseDossierHoldingsBand,
  HouseDossierHoldingsFootprint,
  HouseDossierHouseholdScope,
  HouseDossierKinshipSummary,
  HouseDossierKnownness,
  HouseDossierKnownnessSource,
  HouseDossierLedgerBand,
  HouseDossierLedgerTrend,
  HouseDossierRelationshipBand,
  HouseDossierRelationshipSummary,
  HouseDossierSummary,
  KnownHouseSummary,
  RunState,
} from "../../types";
import { buildBoundedWorldTopologyView } from "../world";
import { buildMarriageWindow } from "./marriage";
import { classifyRelationshipStanding, readRelationshipVector, relationshipFavorScore } from "./relationshipEngine";
import { buildKnownHouseRelevanceSnapshot, listRelevantTier1HouseIds } from "./knownHouseRelevance";

export const HOUSE_DOSSIER_SUMMARY_SCHEMA_VERSION = "house_dossier_summary_v2" as const;
const BOUNDED_HOUSE_DOSSIER_SNAPSHOT_LIMIT = 24;

type KnownHouseExperienceSurfaces = {
  known_houses: KnownHouseSummary[];
  house_dossiers: HouseDossierSummary[];
};

type BoundedKnownHouseExperienceSurfaces = {
  known_houses: KnownHouseSummary[];
  house_dossiers: BoundedHouseDossierSummary[];
};

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function sortStrings(values: Iterable<string>): string[] {
  return [...values].sort(compareText);
}

function housesMap(state: RunState): Record<string, any> {
  const anyState: any = state as any;
  return anyState?.houses && typeof anyState.houses === "object" ? (anyState.houses as Record<string, any>) : {};
}

function normalizeOptionalId(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

export function readHouseName(houseId: string, house: any): string {
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

export function readHouseNameForId(state: RunState, houseId: string | null): string | null {
  if (!houseId) return null;
  const house = housesMap(state)[houseId];
  return readHouseName(houseId, house);
}

export function readTier(house: any): string {
  return typeof house?.tier === "string" && house.tier.trim().length > 0 ? String(house.tier).trim() : "";
}

export function readTierForHouseId(state: RunState, houseId: string | null): string | null {
  if (!houseId) return null;
  return readTier(housesMap(state)[houseId]) || null;
}

function readRelationshipToPlayer(state: RunState, houseId: string): KnownHouseSummary["relationship"] {
  const playerHeadId = state.house?.head?.id ?? null;
  const headId = resolveCurrentHouseHeadId(state, houseId);
  if (!playerHeadId || !headId) return null;
  return readRelationshipVector(state, headId, playerHeadId);
}

function classifyRelationshipBand(relationship: KnownHouseSummary["relationship"]): HouseDossierRelationshipBand {
  if (!relationship) return "unknown";
  return classifyRelationshipStanding(relationship);
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

function extractPortfolioManorId(position: unknown): string | null {
  if (typeof position !== "string") return null;
  const trimmed = position.trim();
  if (trimmed.length === 0) return null;
  const manorToken = ":manor:";
  const manorIndex = trimmed.indexOf(manorToken);
  if (manorIndex >= 0) {
    const manorId = trimmed.slice(manorIndex + manorToken.length).trim();
    return manorId.length > 0 ? manorId : null;
  }
  return trimmed.startsWith("manor_") ? trimmed : null;
}

function knownManorIdsForHouse(state: RunState, houseId: string): string[] {
  if (houseId !== playerHouseIdOf(state)) return [];
  const topology = buildBoundedWorldTopologyView();
  const manorIds = new Set<string>();
  const anchorManorId = normalizeOptionalId(topology.anchor_manor_id);
  if (anchorManorId) manorIds.add(anchorManorId);
  const positions = Array.isArray(state.portfolio?.positions) ? state.portfolio.positions : [];
  for (const position of positions) {
    const manorId = extractPortfolioManorId(position);
    if (manorId) manorIds.add(manorId);
  }
  return sortStrings(manorIds);
}

function holdingsBandForCount(count: number): HouseDossierHoldingsBand {
  if (count >= 4) return "broad_domain";
  if (count >= 2) return "minor_cluster";
  return "single_holding";
}

function holdingsFootprintForHouse(state: RunState, houseId: string, house: any): HouseDossierHoldingsFootprint {
  const holdingsCount =
    typeof house?.holdings_count === "number" && Number.isFinite(house.holdings_count)
      ? Math.max(1, Math.trunc(house.holdings_count))
      : 1;
  const knownManorIds = knownManorIdsForHouse(state, houseId);
  const anchorManorId = knownManorIds[0] ?? null;
  return {
    holdings_count: holdingsCount,
    holdings_band: holdingsBandForCount(holdingsCount),
    anchor_manor_id: anchorManorId,
    known_manor_ids: knownManorIds,
    source_kind: houseId === playerHouseIdOf(state) ? "player_portfolio" : "house_seed",
  };
}

function ledgerBandForPlayerHouse(state: RunState): HouseDossierLedgerBand {
  const coin = Math.max(0, Math.trunc(state.manor?.coin ?? 0));
  const taxDueCoin = Math.max(0, Math.trunc(state.manor?.obligations?.tax_due_coin ?? 0));
  const titheDueBushels = Math.max(0, Math.trunc(state.manor?.obligations?.tithe_due_bushels ?? 0));
  const arrearsCoin = Math.max(0, Math.trunc(state.manor?.obligations?.arrears?.coin ?? 0));
  const arrearsBushels = Math.max(0, Math.trunc(state.manor?.obligations?.arrears?.bushels ?? 0));

  if (arrearsCoin > 12 || arrearsBushels > 120 || coin <= 1) return "distressed";
  if (taxDueCoin > 8 || titheDueBushels > 120 || coin <= 4) return "tight";
  if (coin >= 16 && taxDueCoin === 0 && titheDueBushels === 0 && arrearsCoin === 0 && arrearsBushels === 0) return "flush";
  return "stable";
}

function ledgerTrendForPlayerHouse(state: RunState): HouseDossierLedgerTrend {
  const coin = Math.max(0, Math.trunc(state.manor?.coin ?? 0));
  const taxDueCoin = Math.max(0, Math.trunc(state.manor?.obligations?.tax_due_coin ?? 0));
  const titheDueBushels = Math.max(0, Math.trunc(state.manor?.obligations?.tithe_due_bushels ?? 0));
  const arrearsCoin = Math.max(0, Math.trunc(state.manor?.obligations?.arrears?.coin ?? 0));
  const arrearsBushels = Math.max(0, Math.trunc(state.manor?.obligations?.arrears?.bushels ?? 0));

  if (arrearsCoin > 0 || arrearsBushels > 0 || taxDueCoin > 8 || titheDueBushels > 120) return "declining";
  if (coin >= 12 && taxDueCoin === 0 && titheDueBushels === 0) return "rising";
  return "flat";
}

function coarseExternalLedgerBand(house: any): HouseDossierLedgerBand {
  const holdingsCount =
    typeof house?.holdings_count === "number" && Number.isFinite(house.holdings_count)
      ? Math.max(1, Math.trunc(house.holdings_count))
      : 1;
  if (holdingsCount >= 4) return "flush";
  if (holdingsCount >= 2) return "stable";
  return "tight";
}

function ledgerBandForHouse(state: RunState, houseId: string, house: any): HouseDossierLedgerBand {
  return houseId === playerHouseIdOf(state) ? ledgerBandForPlayerHouse(state) : coarseExternalLedgerBand(house);
}

function ledgerTrendForHouse(state: RunState, houseId: string): HouseDossierLedgerTrend {
  return houseId === playerHouseIdOf(state) ? ledgerTrendForPlayerHouse(state) : "flat";
}

function relationshipSummaryForHouse(
  state: RunState,
  houseId: string
): { relationship: KnownHouseSummary["relationship"]; summary: HouseDossierRelationshipSummary | null } {
  const relationship = readRelationshipToPlayer(state, houseId);
  if (!relationship) return { relationship: null, summary: null };
  return {
    relationship,
    summary: {
      allegiance: relationship.allegiance,
      respect: relationship.respect,
      threat: relationship.threat,
      favor_score: relationshipFavorScore(relationship),
      standing_band: classifyRelationshipBand(relationship),
    },
  };
}

function collectProspectHouseSources(state: RunState): Map<string, Set<HouseDossierKnownnessSource>> {
  const sourcesByHouseId = new Map<string, Set<HouseDossierKnownnessSource>>();
  const playerHouseId = playerHouseIdOf(state);
  const addSource = (houseId: string | null, source: HouseDossierKnownnessSource) => {
    if (!houseId || houseId === playerHouseId) return;
    let sources = sourcesByHouseId.get(houseId);
    if (!sources) {
      sources = new Set<HouseDossierKnownnessSource>();
      sourcesByHouseId.set(houseId, sources);
    }
    sources.add(source);
  };

  const marriageWindow = buildMarriageWindow(state);
  for (const offer of marriageWindow?.offers ?? []) {
    const offerHouseId = structuredHouseIdForPerson(state, offer.house_person_id);
    addSource(offerHouseId, "marriage_offer");
  }

  const prospectsWindow = (state as any)?.prospects_window;
  const prospects = Array.isArray(prospectsWindow?.prospects) ? prospectsWindow.prospects : [];
  for (const prospect of prospects) {
    addSource(normalizeOptionalId(prospect?.from_house_id), "prospect");
    addSource(normalizeOptionalId(prospect?.to_house_id), "prospect");
  }

  return sourcesByHouseId;
}

function knownnessForHouse(
  relevanceReasons: KnownHouseSummary["relevance_reasons"],
  prospectSources: ReadonlySet<HouseDossierKnownnessSource> | undefined
): { knownness: HouseDossierKnownness; knownness_sources: HouseDossierKnownnessSource[] } {
  const sources: HouseDossierKnownnessSource[] = [];
  const isProspectHouse = !!prospectSources && prospectSources.size > 0;
  if (relevanceReasons.length > 0) sources.push("relevance");
  if (prospectSources?.has("marriage_offer")) sources.push("marriage_offer");
  if (prospectSources?.has("prospect")) sources.push("prospect");

  if (relevanceReasons.length > 0 && isProspectHouse) return { knownness: "known_house_and_prospect", knownness_sources: sources };
  if (isProspectHouse) return { knownness: "prospect_house", knownness_sources: sources };
  return { knownness: "known_house", knownness_sources: sources.length > 0 ? sources : ["relevance"] };
}

function compactHoldingsFootprintForBoundedSnapshot(
  holdingsFootprint: HouseDossierHoldingsFootprint
): HouseDossierHoldingsFootprint {
  const { known_manor_ids: _knownManorIds, ...boundedFootprint } = holdingsFootprint;
  return boundedFootprint;
}

function compactHouseDossierForBoundedSnapshot(dossier: HouseDossierSummary): BoundedHouseDossierSummary {
  return {
    schema_version: dossier.schema_version,
    house_id: dossier.house_id,
    knownness: dossier.knownness,
    kinship_summary: dossier.kinship_summary,
    kinship_tags: [...dossier.kinship_tags],
    relationship_band: dossier.relationship_band,
    relationship_summary: dossier.relationship_summary ? { ...dossier.relationship_summary } : null,
    holdings_footprint: compactHoldingsFootprintForBoundedSnapshot(dossier.holdings_footprint),
    ledger_band: dossier.ledger_band,
    ledger_trend: dossier.ledger_trend,
  };
}

function selectBoundedHouseDossiersForSnapshot(dossiers: HouseDossierSummary[]): HouseDossierSummary[] {
  const prospectIds = new Set(
    dossiers
      .filter((dossier) => dossier.knownness !== "known_house")
      .map((dossier) => dossier.house_id)
  );
  const selectedIds = new Set<string>();

  for (const dossier of dossiers) {
    if (prospectIds.has(dossier.house_id)) selectedIds.add(dossier.house_id);
  }

  if (selectedIds.size < BOUNDED_HOUSE_DOSSIER_SNAPSHOT_LIMIT) {
    for (const dossier of dossiers) {
      if (selectedIds.has(dossier.house_id)) continue;
      selectedIds.add(dossier.house_id);
      if (selectedIds.size >= BOUNDED_HOUSE_DOSSIER_SNAPSHOT_LIMIT) break;
    }
  }

  return dossiers.filter((dossier) => selectedIds.has(dossier.house_id)).slice(0, BOUNDED_HOUSE_DOSSIER_SNAPSHOT_LIMIT);
}

export function buildKnownHouseExperienceSurfaces(state: RunState): KnownHouseExperienceSurfaces {
  const houses = housesMap(state);
  const playerHouseId = playerHouseIdOf(state);
  const relevance = buildKnownHouseRelevanceSnapshot(state);
  const relevanceByHouseId = new Map(relevance.entries.map((entry) => [entry.house_id, entry]));
  const selectedKnownHouseIds = listRelevantTier1HouseIds(
    state,
    Object.keys(houses).filter((houseId) => houseId !== playerHouseId)
  );
  const prospectSourcesByHouseId = collectProspectHouseSources(state);
  const prospectHouseIds = sortStrings(prospectSourcesByHouseId.keys());
  const selectedHouseIds: string[] = [];
  const seenHouseIds = new Set<string>();
  const pushHouseId = (houseId: string) => {
    if (!houseId || houseId === playerHouseId || seenHouseIds.has(houseId)) return;
    seenHouseIds.add(houseId);
    selectedHouseIds.push(houseId);
  };
  for (const houseId of selectedKnownHouseIds) pushHouseId(houseId);
  for (const houseId of prospectHouseIds) pushHouseId(houseId);

  const known_houses: KnownHouseSummary[] = [];
  const house_dossiers: HouseDossierSummary[] = [];

  for (const houseId of selectedHouseIds) {
    const house = houses[houseId];
    if (!house || typeof house !== "object") continue;

    const relevanceEntry = relevanceByHouseId.get(houseId);
    const headId = resolveCurrentHouseHeadId(state, houseId);
    const head = registryPersonFor(state, headId);
    const { relationship, summary: relationshipSummary } = relationshipSummaryForHouse(state, houseId);
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
    const knownness = knownnessForHouse(reasons, prospectSourcesByHouseId.get(houseId));
    const holdingsFootprint = holdingsFootprintForHouse(state, houseId, house);

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
      knownness: knownness.knownness,
      knownness_sources: [...knownness.knownness_sources],
      kinship_summary: kinshipSummaryForReasons(reasons),
      kinship_tags: [...reasons],
      relationship_band: classifyRelationshipBand(relationship),
      relationship_summary: relationshipSummary,
      household_scope: householdScopeForHouse(house, householdMemberCount, childCount),
      household_member_count: householdMemberCount,
      living_member_count: livingMemberCount,
      child_count: childCount,
      has_male_heir: heirSignals.has_male_heir,
      heiress_possible: heirSignals.heiress_possible,
      holdings_footprint: holdingsFootprint,
      ledger_band: ledgerBandForHouse(state, houseId, house),
      ledger_trend: ledgerTrendForHouse(state, houseId),
    });
  }

  return { known_houses, house_dossiers };
}

export function buildBoundedKnownHouseExperienceSurfaces(state: RunState): BoundedKnownHouseExperienceSurfaces {
  const surfaces = buildKnownHouseExperienceSurfaces(state);
  return {
    known_houses: surfaces.known_houses,
    // Keep replay snapshots under cap by leaning on known_houses for duplicated identity fields.
    house_dossiers: selectBoundedHouseDossiersForSnapshot(surfaces.house_dossiers).map(compactHouseDossierForBoundedSnapshot),
  };
}
