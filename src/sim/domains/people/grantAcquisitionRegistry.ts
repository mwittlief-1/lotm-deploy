import { playerHouseIdOf, structuredHouseIdForPerson } from "../../actors";
import { computeTierSets } from "../../tiers";
import type { HouseDossierKinshipSummary, Prospect, RunState } from "../../types";
import { clampInt } from "../../util";
import {
  buildBoundedWorldTopologyView,
  classifyTravelDistance,
  getManorById,
  getRouteHopDistance,
  getTravelCostDistance,
  listWorldScopeCandidatesForAnchor,
  loadBundledWorldDomain,
} from "../world";
import { makeEvidenceEvent, recordRuntimeDomainEvidence } from "../ai/evidence";
import { bestMarriageOfferIndexPolicy, buildMarriageWindow } from "./marriage";
import {
  buildClaimantRegistry,
  buildInheritanceClaimProspect,
  inheritanceClaimProspectSignatureForSubject,
  type InheritanceClaimProspect,
} from "./successionRegistry";
import {
  classifyRelationshipStanding,
  readRelationshipVector,
  relationshipFavorScore,
  type RelationshipStandingBand,
} from "./relationshipEngine";

export const GRANT_SOURCE_REGISTRY_SCHEMA_VERSION = "grant_source_registry_v0" as const;
export const GRANT_SOURCE_ENTRY_SCHEMA_VERSION = "grant_source_entry_v0" as const;
export const GRANT_DOSSIER_SUMMARY_SCHEMA_VERSION = "grant_dossier_summary_v0" as const;
export const GRANT_ELIGIBILITY_SCHEMA_VERSION = "grant_eligibility_v0" as const;
export const GRANT_PROSPECT_METADATA_SCHEMA_VERSION = "grant_prospect_meta_v0" as const;
export const ACQUISITION_PROSPECTS_WINDOW_SCHEMA_VERSION = "acquisition_prospects_window_v0" as const;

export const GRANT_SOURCE_ORIGIN_TYPES = ["liege_demesne", "dispossessed_pool"] as const;
export const GRANT_LEDGER_BANDS = ["distressed", "tight", "stable", "flush"] as const;
export const GRANT_CAPACITY_BANDS = ["at_capacity", "limited", "open"] as const;
export const GRANT_OVERHEAD_BANDS = ["strained", "rising", "light"] as const;

export type GrantSourceOriginTypeV0 = (typeof GRANT_SOURCE_ORIGIN_TYPES)[number];
export type GrantLedgerBandV0 = (typeof GRANT_LEDGER_BANDS)[number];
export type GrantCapacityBandV0 = (typeof GRANT_CAPACITY_BANDS)[number];
export type GrantOverheadBandV0 = (typeof GRANT_OVERHEAD_BANDS)[number];

export interface GrantDossierSummaryV0 {
  schema_version: typeof GRANT_DOSSIER_SUMMARY_SCHEMA_VERSION;
  source_entry_id: string;
  origin_type: GrantSourceOriginTypeV0;
  manor_id: string;
  holding_type: string;
  holding_tier: string;
  distance_band: "near" | "far" | null;
  liege_relationship_band: RelationshipStandingBand;
  ledger_band: GrantLedgerBandV0;
  capacity_band: GrantCapacityBandV0;
  current_manor_count: number;
  kinship_summary: HouseDossierKinshipSummary;
}

export interface GrantSourceEntryV0 {
  schema_version: typeof GRANT_SOURCE_ENTRY_SCHEMA_VERSION;
  source_entry_id: string;
  source_key: string;
  origin_type: GrantSourceOriginTypeV0;
  manor_id: string;
  anchor_manor_id: string;
  holding_type: string;
  holding_tier: string;
  tenure_basis: string;
  distance_band: "near" | "far" | null;
  travel_cost_distance: number | null;
  route_hop_distance: number | null;
  sponsor_ref_id: string;
  sponsor_label: string;
  world_holder_actor_id: string;
  priority_score: number;
  tie_key: string;
  dossier_summary: GrantDossierSummaryV0;
}

export interface GrantSourceRegistryV0 {
  schema_version: typeof GRANT_SOURCE_REGISTRY_SCHEMA_VERSION;
  generated_at_turn_index: number;
  anchor_manor_id: string;
  controlled_manor_ids: string[];
  source_entry_ids: string[];
  liege_demesne_entry_ids: string[];
  dispossessed_entry_ids: string[];
  entries_by_id: Record<string, GrantSourceEntryV0>;
  overflow_count: number;
}

export interface GrantEligibilityAssessmentV0 {
  schema_version: typeof GRANT_ELIGIBILITY_SCHEMA_VERSION;
  generated_at_turn_index: number;
  eligible: boolean;
  liege_favor_score: number;
  liege_relationship_band: RelationshipStandingBand;
  current_manor_count: number;
  capacity_limit: number;
  capacity_remaining: number;
  capacity_band: GrantCapacityBandV0;
  admin_overhead_band: GrantOverheadBandV0;
  current_due_coin: number;
  current_due_bushels: number;
  arrears_coin: number;
  arrears_bushels: number;
  ledger_band: GrantLedgerBandV0;
  blockers: string[];
}

export type GrantProspect = Prospect & {
  grant_metadata_schema_version: typeof GRANT_PROSPECT_METADATA_SCHEMA_VERSION;
  source_entry_id: string;
  origin_type: GrantSourceOriginTypeV0;
  source_manor_id: string;
  source_distance_band: "near" | "far" | null;
  dossier_summary: GrantDossierSummaryV0;
  eligibility: GrantEligibilityAssessmentV0;
};

export interface AcquisitionProspectsWindowV0 {
  schema_version: typeof ACQUISITION_PROSPECTS_WINDOW_SCHEMA_VERSION;
  turn_index: number;
  generated_at_turn_index: number;
  prospect_ids: string[];
  prospects: Prospect[];
  shown_ids: string[];
  hidden_ids: string[];
  overflow_count: number;
}

export interface GrantAcquisitionExperienceSurfacesV0 {
  grant_eligibility: GrantEligibilityAssessmentV0;
  grant_source_registry: GrantSourceRegistryV0;
  grant_dossier_summaries: GrantDossierSummaryV0[];
  acquisition_prospects_window: AcquisitionProspectsWindowV0;
}

type GrantSourceCandidateRow = {
  origin_type: GrantSourceOriginTypeV0;
  manor_id: string;
  holding_type: string;
  holding_tier: string;
  tenure_basis: string;
  distance_band: "near" | "far" | null;
  travel_cost_distance: number | null;
  route_hop_distance: number | null;
  world_holder_actor_id: string;
  priority_score: number;
  tie_key: string;
};

type AcquisitionRankMetadata = {
  acquisition_rank_group: number;
  acquisition_sort_score: number;
  acquisition_tie_key: string;
};

const GRANT_SOURCE_PER_ORIGIN_LIMIT = 2;
const GRANT_PORTFOLIO_CAPACITY_LIMIT = 3;
const GRANT_LIEGE_FAVOR_SCORE_MIN = 95;
const GRANT_MAX_CURRENT_DUE_COIN = 8;
const GRANT_MAX_CURRENT_DUE_BUSHELS = 120;
const GRANT_MAX_ARREARS_COIN = 12;
const GRANT_MAX_ARREARS_BUSHELS = 120;
const CANONICAL_ACQUISITION_PROSPECT_LIMIT = 3;

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function buildOrderedRecord<K extends string, V>(keys: readonly K[], valueFor: (key: K) => V): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, valueFor(key)])) as Record<K, V>;
}

function canonicalInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

function nonNegativeInteger(value: unknown): number {
  return Math.max(0, canonicalInteger(value));
}

function portfolioManorCount(state: RunState): number {
  const positions = Array.isArray(state.portfolio?.positions) ? state.portfolio.positions.length : 0;
  return Math.max(1, nonNegativeInteger(positions) + 1);
}

function portfolioCapacityBand(manorCount: number): GrantCapacityBandV0 {
  if (manorCount >= GRANT_PORTFOLIO_CAPACITY_LIMIT) return "at_capacity";
  if (manorCount === GRANT_PORTFOLIO_CAPACITY_LIMIT - 1) return "limited";
  return "open";
}

function adminOverheadBand(manorCount: number): GrantOverheadBandV0 {
  if (manorCount >= GRANT_PORTFOLIO_CAPACITY_LIMIT) return "strained";
  if (manorCount === GRANT_PORTFOLIO_CAPACITY_LIMIT - 1) return "rising";
  return "light";
}

function ledgerBandForState(state: RunState): GrantLedgerBandV0 {
  const coin = nonNegativeInteger(state.manor.coin);
  const currentDueCoin = nonNegativeInteger(state.manor.obligations.tax_due_coin);
  const currentDueBushels = nonNegativeInteger(state.manor.obligations.tithe_due_bushels);
  const arrearsCoin = nonNegativeInteger(state.manor.obligations.arrears.coin);
  const arrearsBushels = nonNegativeInteger(state.manor.obligations.arrears.bushels);

  if (
    arrearsCoin > GRANT_MAX_ARREARS_COIN ||
    arrearsBushels > GRANT_MAX_ARREARS_BUSHELS ||
    coin <= 1
  ) {
    return "distressed";
  }

  if (arrearsCoin > 0 || arrearsBushels > 0 || currentDueCoin > 0 || currentDueBushels > 0 || coin < 6) {
    return "tight";
  }

  if (coin >= 14) return "flush";
  return "stable";
}

function portfolioControlledManorIds(state: RunState, anchorManorId: string): string[] {
  const ids = new Set<string>([anchorManorId]);
  const positions = Array.isArray(state.portfolio?.positions) ? state.portfolio.positions : [];

  for (const raw of positions) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value) continue;

    const suffixMatch = value.match(/:manor:([^:]+)$/);
    if (suffixMatch?.[1]) {
      ids.add(decodeURIComponent(suffixMatch[1]));
      continue;
    }

    if (value.startsWith("manor_")) ids.add(value);
  }

  return [...ids].sort(compareText);
}

function makeGrantSourceEntryId(originType: GrantSourceOriginTypeV0, manorId: string): string {
  return `grant_source:${originType}:${manorId}`;
}

function acquisitionRankMetaFor(prospect: Prospect): AcquisitionRankMetadata {
  const anyProspect = prospect as any;
  return {
    acquisition_rank_group: nonNegativeInteger(anyProspect.acquisition_rank_group ?? 99),
    acquisition_sort_score: canonicalInteger(anyProspect.acquisition_sort_score ?? 0),
    acquisition_tie_key:
      typeof anyProspect.acquisition_tie_key === "string" && anyProspect.acquisition_tie_key.length > 0
        ? anyProspect.acquisition_tie_key
        : prospect.id,
  };
}

function withAcquisitionRankMetadata<T extends Prospect>(prospect: T, metadata: AcquisitionRankMetadata): T {
  const typedProspect = prospect as T & AcquisitionRankMetadata;
  for (const [key, value] of Object.entries(metadata)) {
    Object.defineProperty(typedProspect, key, {
      value,
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }
  return typedProspect;
}

function withGrantMetadata(
  prospect: Prospect,
  metadata: Omit<GrantProspect, keyof Prospect>
): GrantProspect {
  const typedProspect = prospect as GrantProspect;
  for (const [key, value] of Object.entries(metadata)) {
    Object.defineProperty(typedProspect, key, {
      value,
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }
  return typedProspect;
}

function inheritanceClaimSuppressed(state: RunState): boolean {
  const subjectPersonId = state.house.head?.id ?? "";
  if (!subjectPersonId) return false;

  const raw = (state.flags as Record<string, unknown>)?._prospect_signatures_v1;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;

  const signature = inheritanceClaimProspectSignatureForSubject(subjectPersonId);
  return Boolean((raw as Record<string, unknown>)[signature]);
}

function grantSourceKinshipSummary(): HouseDossierKinshipSummary {
  return "none";
}

function buildGrantDossierSummary(
  state: RunState,
  entryId: string,
  row: GrantSourceCandidateRow,
  eligibility: GrantEligibilityAssessmentV0
): GrantDossierSummaryV0 {
  return {
    schema_version: GRANT_DOSSIER_SUMMARY_SCHEMA_VERSION,
    source_entry_id: entryId,
    origin_type: row.origin_type,
    manor_id: row.manor_id,
    holding_type: row.holding_type,
    holding_tier: row.holding_tier,
    distance_band: row.distance_band,
    liege_relationship_band: eligibility.liege_relationship_band,
    ledger_band: eligibility.ledger_band,
    capacity_band: eligibility.capacity_band,
    current_manor_count: portfolioManorCount(state),
    kinship_summary: grantSourceKinshipSummary(),
  };
}

function createGrantSourceEntry(
  state: RunState,
  anchorManorId: string,
  row: GrantSourceCandidateRow,
  eligibility: GrantEligibilityAssessmentV0
): GrantSourceEntryV0 {
  const sourceEntryId = makeGrantSourceEntryId(row.origin_type, row.manor_id);
  const sponsorLabel = row.origin_type === "liege_demesne" ? "Liege demesne" : "Dispossessed pool";

  return {
    schema_version: GRANT_SOURCE_ENTRY_SCHEMA_VERSION,
    source_entry_id: sourceEntryId,
    source_key: sourceEntryId,
    origin_type: row.origin_type,
    manor_id: row.manor_id,
    anchor_manor_id: anchorManorId,
    holding_type: row.holding_type,
    holding_tier: row.holding_tier,
    tenure_basis: row.tenure_basis,
    distance_band: row.distance_band,
    travel_cost_distance: row.travel_cost_distance,
    route_hop_distance: row.route_hop_distance,
    sponsor_ref_id: state.locals.liege.id,
    sponsor_label: sponsorLabel,
    world_holder_actor_id: row.world_holder_actor_id,
    priority_score: row.priority_score,
    tie_key: row.tie_key,
    dossier_summary: buildGrantDossierSummary(state, sourceEntryId, row, eligibility),
  };
}

function compareGrantSourceRows(left: GrantSourceCandidateRow, right: GrantSourceCandidateRow): number {
  if (left.priority_score !== right.priority_score) return right.priority_score - left.priority_score;
  if ((left.travel_cost_distance ?? 999) !== (right.travel_cost_distance ?? 999)) {
    return (left.travel_cost_distance ?? 999) - (right.travel_cost_distance ?? 999);
  }
  if ((left.route_hop_distance ?? 999) !== (right.route_hop_distance ?? 999)) {
    return (left.route_hop_distance ?? 999) - (right.route_hop_distance ?? 999);
  }
  return compareText(left.tie_key, right.tie_key);
}

function compareGrantSourceEntries(left: GrantSourceEntryV0, right: GrantSourceEntryV0): number {
  if (left.priority_score !== right.priority_score) return right.priority_score - left.priority_score;
  return compareText(left.tie_key, right.tie_key);
}

function basePriorityScore(originType: GrantSourceOriginTypeV0, distanceBand: "near" | "far" | null): number {
  const originBase = originType === "liege_demesne" ? 90 : 70;
  const distanceBase = distanceBand === "near" ? 12 : distanceBand === "far" ? 4 : 0;
  return originBase + distanceBase;
}

function buildGrantSourceRows(state: RunState): {
  anchor_manor_id: string;
  controlled_manor_ids: string[];
  liege_rows: GrantSourceCandidateRow[];
  dispossessed_rows: GrantSourceCandidateRow[];
  overflow_count: number;
} {
  const domain = loadBundledWorldDomain();
  const topology = buildBoundedWorldTopologyView(domain);
  const anchorManorId = topology.anchor_manor_id;
  const ownedManorIds = portfolioControlledManorIds(state, anchorManorId);
  const controlled = new Set(ownedManorIds);

  const scopedCandidates = listWorldScopeCandidatesForAnchor(domain, anchorManorId)
    .filter((candidate) => !controlled.has(candidate.manor_id))
    .map((candidate) => {
      const manor = getManorById(domain, candidate.manor_id);
      if (!manor || manor.tenure_basis === "church_temporalities") return null;

      const distanceBand = candidate.distance_band ?? null;
      const distancePenalty = Math.max(0, candidate.travel_cost_distance ?? 0);
      const routePenalty = Math.max(0, candidate.route_hop_distance ?? 0);
      const priorityCore = Math.max(0, 24 - distancePenalty - routePenalty);

      return {
        manor,
        distance_band: distanceBand,
        travel_cost_distance: candidate.travel_cost_distance,
        route_hop_distance: candidate.route_hop_distance,
        priority_core: priorityCore,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const liegeRows = domain.manor_units.manors
    .filter((manor) => manor.immediate_lord_actor_id === "actor_crown")
    .filter((manor) => manor.tenure_basis !== "church_temporalities")
    .filter((manor) => !controlled.has(manor.manor_id))
    .map<GrantSourceCandidateRow>((row) => ({
      origin_type: "liege_demesne",
      manor_id: row.manor_id,
      holding_type: row.holding_type,
      holding_tier: row.holding_tier,
      tenure_basis: row.tenure_basis,
      distance_band: classifyTravelDistance(domain, anchorManorId, row.manor_id),
      travel_cost_distance: getTravelCostDistance(domain, anchorManorId, row.manor_id),
      route_hop_distance: getRouteHopDistance(domain, anchorManorId, row.manor_id),
      world_holder_actor_id: row.holder_actor_id,
      priority_score:
        basePriorityScore("liege_demesne", classifyTravelDistance(domain, anchorManorId, row.manor_id)) +
        Math.max(
          0,
          24 -
            Math.max(0, getTravelCostDistance(domain, anchorManorId, row.manor_id) ?? 24) -
            Math.max(0, getRouteHopDistance(domain, anchorManorId, row.manor_id) ?? 0)
        ),
      tie_key: `liege_demesne:${row.manor_id}`,
    }))
    .sort(compareGrantSourceRows);

  const dispossessedRows = scopedCandidates
    .filter((row) => row.manor.immediate_lord_actor_id !== "actor_crown")
    .map<GrantSourceCandidateRow>((row) => ({
      origin_type: "dispossessed_pool",
      manor_id: row.manor.manor_id,
      holding_type: row.manor.holding_type,
      holding_tier: row.manor.holding_tier,
      tenure_basis: row.manor.tenure_basis,
      distance_band: row.distance_band,
      travel_cost_distance: row.travel_cost_distance,
      route_hop_distance: row.route_hop_distance,
      world_holder_actor_id: row.manor.holder_actor_id,
      priority_score: basePriorityScore("dispossessed_pool", row.distance_band) + row.priority_core,
      tie_key: `dispossessed_pool:${row.manor.manor_id}`,
    }))
    .sort(compareGrantSourceRows);

  return {
    anchor_manor_id: anchorManorId,
    controlled_manor_ids: ownedManorIds,
    liege_rows: liegeRows.slice(0, GRANT_SOURCE_PER_ORIGIN_LIMIT),
    dispossessed_rows: dispossessedRows.slice(0, GRANT_SOURCE_PER_ORIGIN_LIMIT),
    overflow_count:
      Math.max(0, liegeRows.length - Math.min(liegeRows.length, GRANT_SOURCE_PER_ORIGIN_LIMIT)) +
      Math.max(0, dispossessedRows.length - Math.min(dispossessedRows.length, GRANT_SOURCE_PER_ORIGIN_LIMIT)),
  };
}

function grantCoinDeltaFor(
  state: RunState,
  entry: GrantSourceEntryV0,
  eligibility: GrantEligibilityAssessmentV0
): number {
  const arrearsPressure =
    nonNegativeInteger(state.manor.obligations.arrears.coin) +
    Math.floor(nonNegativeInteger(state.manor.obligations.arrears.bushels) / 100);
  const originBonus = entry.origin_type === "liege_demesne" ? 2 : 1;
  const favorBonus = eligibility.liege_favor_score >= 110 ? 2 : eligibility.liege_favor_score >= 100 ? 1 : 0;
  const capacityPenalty = eligibility.capacity_band === "limited" ? 1 : 0;
  return clampInt(2 + Math.floor(Math.max(1, arrearsPressure) * 0.5) + originBonus + favorBonus - capacityPenalty, 2, 12);
}

function grantRelationshipDeltasFor(state: RunState, entry: GrantSourceEntryV0): Prospect["predicted_effects"]["relationship_deltas"] {
  const deltas =
    entry.origin_type === "liege_demesne"
      ? { allegiance_delta: 1, respect_delta: 0, threat_delta: 2 }
      : { allegiance_delta: 1, respect_delta: -1, threat_delta: 3 };

  return [
    {
      scope: "person",
      from_id: state.locals.liege.id,
      to_id: state.house.head.id,
      allegiance_delta: deltas.allegiance_delta,
      respect_delta: deltas.respect_delta,
      threat_delta: deltas.threat_delta,
    },
  ];
}

function grantRequirementsFor(eligibility: GrantEligibilityAssessmentV0): Prospect["requirements"] {
  return [
    {
      kind: "custom",
      value: `favor>=${GRANT_LIEGE_FAVOR_SCORE_MIN}`,
      text: "Liege favor must stay above the bounded grant threshold.",
    },
    {
      kind: "custom",
      value: `manors<${GRANT_PORTFOLIO_CAPACITY_LIMIT}`,
      text: "Portfolio must retain manor-capacity headroom.",
    },
    {
      kind: "custom",
      value: `ledger=${eligibility.ledger_band}`,
      text: "Household ledger standing must remain inside the grant tolerance bands.",
    },
  ];
}

function buildCanonicalMarriageProspect(state: RunState): Prospect | null {
  const sanitized: RunState = {
    ...state,
    flags: { ...(state.flags as Record<string, unknown>) },
  };
  delete (sanitized.flags as Record<string, unknown>).marriage_reservations;

  const marriageWindow = buildMarriageWindow(sanitized, computeTierSets(sanitized));
  if (!marriageWindow || marriageWindow.eligible_child_ids.length === 0 || marriageWindow.offers.length === 0) {
    return null;
  }

  const subjectId = [...marriageWindow.eligible_child_ids].sort(compareText)[0] ?? null;
  const offerIndex = bestMarriageOfferIndexPolicy(sanitized, marriageWindow);
  if (!subjectId || offerIndex === null) return null;

  const offer = marriageWindow.offers[offerIndex];
  if (!offer) return null;

  const playerHouseId = playerHouseIdOf(sanitized);
  const spouseHouseId = structuredHouseIdForPerson(sanitized, offer.house_person_id) ?? `house:${offer.house_person_id}`;
  const relationshipDeltas: NonNullable<Prospect["predicted_effects"]["relationship_deltas"]> = [
    {
      scope: "person",
      from_id: state.house.head.id,
      to_id: offer.house_person_id,
      allegiance_delta: offer.relationship_delta.allegiance,
      respect_delta: offer.relationship_delta.respect,
      threat_delta: offer.relationship_delta.threat,
    },
  ];

  if (spouseHouseId !== playerHouseId) {
    relationshipDeltas.push(
      {
        scope: "house",
        from_id: playerHouseId,
        to_id: spouseHouseId,
        allegiance_delta: 6,
        respect_delta: 4,
        threat_delta: -3,
      },
      {
        scope: "house",
        from_id: spouseHouseId,
        to_id: playerHouseId,
        allegiance_delta: 6,
        respect_delta: 4,
        threat_delta: -3,
      }
    );
  }

  if (offer.liege_delta) {
    relationshipDeltas.push({
      scope: "person",
      from_id: state.house.head.id,
      to_id: state.locals.liege.id,
      allegiance_delta: 0,
      respect_delta: offer.liege_delta.respect,
      threat_delta: offer.liege_delta.threat,
    });
  }

  const baseScore =
    canonicalInteger(offer.dowry_coin_net) * 3 +
    canonicalInteger(offer.relationship_delta.respect) * 2 +
    canonicalInteger(offer.relationship_delta.allegiance);

  const prospect: Prospect = {
    id: `acq_marriage:${subjectId}:${offer.house_person_id}`,
    type: "marriage",
    from_house_id: spouseHouseId,
    to_house_id: playerHouseId,
    subject_person_id: subjectId,
    spouse_person_id: offer.house_person_id,
    summary: "Marriage proposal",
    requirements: [],
    costs: {},
    predicted_effects: {
      coin_delta: canonicalInteger(offer.dowry_coin_net),
      relationship_deltas: relationshipDeltas,
      flags_set: [],
    },
    uncertainty: "known",
    expires_turn: state.turn_index + 2,
    actions: ["accept", "reject"],
  };

  return withAcquisitionRankMetadata(prospect, {
    acquisition_rank_group: 0,
    acquisition_sort_score: baseScore,
    acquisition_tie_key: `marriage:${subjectId}:${offer.house_person_id}`,
  });
}

function buildCanonicalInheritanceProspect(state: RunState): InheritanceClaimProspect | null {
  const registry = buildClaimantRegistry(state);
  const heirId = state.house.heir_id ?? registry.current_heir_id;
  if (heirId !== null || inheritanceClaimSuppressed(state)) return null;

  const playerHouseId = playerHouseIdOf(state);
  const claimantHouseId = registry.entries[0]?.house_id ?? playerHouseId;
  const prospect = buildInheritanceClaimProspect(state, {
    prospect_id: `acq_inheritance_claim:${state.house.head.id}`,
    from_house_id: claimantHouseId,
    to_house_id: playerHouseId,
    expires_turn: state.turn_index + 2,
    heir_id: heirId,
    subject_person_id: state.house.head.id,
  });
  if (!prospect) return null;

  const claimantScore =
    100 -
    nonNegativeInteger(registry.entries[0]?.succession_position ?? 90) -
    (registry.entries[0]?.adult_eligible ? 0 : 10);

  return withAcquisitionRankMetadata(prospect, {
    acquisition_rank_group: 2,
    acquisition_sort_score: claimantScore,
    acquisition_tie_key: `inheritance_claim:${registry.entries[0]?.claimant_person_id ?? state.house.head.id}`,
  }) as InheritanceClaimProspect;
}

function buildCanonicalGrantProspectFromInputs(
  state: RunState,
  eligibility: GrantEligibilityAssessmentV0,
  registry: GrantSourceRegistryV0
): GrantProspect | null {
  if (!eligibility.eligible) return null;

  const sourceEntryId = registry.source_entry_ids[0] ?? null;
  if (!sourceEntryId) return null;

  const source = registry.entries_by_id[sourceEntryId];
  if (!source) return null;

  const prospect: Prospect = {
    id: `acq_grant:${source.source_entry_id}`,
    type: "grant",
    from_house_id: source.sponsor_ref_id,
    to_house_id: playerHouseIdOf(state),
    subject_person_id: state.house.head?.id ?? null,
    summary: "Grant offer",
    requirements: grantRequirementsFor(eligibility),
    costs: {},
    predicted_effects: {
      coin_delta: grantCoinDeltaFor(state, source, eligibility),
      relationship_deltas: grantRelationshipDeltasFor(state, source),
      flags_set: [],
    },
    uncertainty: "likely",
    expires_turn: state.turn_index + 2,
    actions: ["accept", "reject"],
  };

  const ranked = withAcquisitionRankMetadata(prospect, {
    acquisition_rank_group: 1,
    acquisition_sort_score: source.priority_score + eligibility.liege_favor_score,
    acquisition_tie_key: `grant:${source.source_entry_id}`,
  });

  return withGrantMetadata(ranked, {
    grant_metadata_schema_version: GRANT_PROSPECT_METADATA_SCHEMA_VERSION,
    source_entry_id: source.source_entry_id,
    origin_type: source.origin_type,
    source_manor_id: source.manor_id,
    source_distance_band: source.distance_band,
    dossier_summary: source.dossier_summary,
    eligibility,
  });
}

export function buildGrantEligibilityAssessment(state: RunState): GrantEligibilityAssessmentV0 {
  const liegeVector = readRelationshipVector(state, state.locals.liege.id, state.house.head.id);
  const favorScore = relationshipFavorScore(liegeVector);
  const manorCount = portfolioManorCount(state);
  const capacityBand = portfolioCapacityBand(manorCount);
  const currentDueCoin = nonNegativeInteger(state.manor.obligations.tax_due_coin);
  const currentDueBushels = nonNegativeInteger(state.manor.obligations.tithe_due_bushels);
  const arrearsCoin = nonNegativeInteger(state.manor.obligations.arrears.coin);
  const arrearsBushels = nonNegativeInteger(state.manor.obligations.arrears.bushels);
  const blockers: string[] = [];

  if (favorScore < GRANT_LIEGE_FAVOR_SCORE_MIN) blockers.push("liege_favor_below_threshold");
  if (currentDueCoin > GRANT_MAX_CURRENT_DUE_COIN || currentDueBushels > GRANT_MAX_CURRENT_DUE_BUSHELS) {
    blockers.push("current_dues_above_tolerance");
  }
  if (arrearsCoin > GRANT_MAX_ARREARS_COIN || arrearsBushels > GRANT_MAX_ARREARS_BUSHELS) {
    blockers.push("arrears_above_tolerance");
  }
  if (capacityBand === "at_capacity") blockers.push("portfolio_at_capacity");

  return {
    schema_version: GRANT_ELIGIBILITY_SCHEMA_VERSION,
    generated_at_turn_index: state.turn_index,
    eligible: blockers.length === 0,
    liege_favor_score: favorScore,
    liege_relationship_band: classifyRelationshipStanding(liegeVector),
    current_manor_count: manorCount,
    capacity_limit: GRANT_PORTFOLIO_CAPACITY_LIMIT,
    capacity_remaining: Math.max(0, GRANT_PORTFOLIO_CAPACITY_LIMIT - manorCount),
    capacity_band: capacityBand,
    admin_overhead_band: adminOverheadBand(manorCount),
    current_due_coin: currentDueCoin,
    current_due_bushels: currentDueBushels,
    arrears_coin: arrearsCoin,
    arrears_bushels: arrearsBushels,
    ledger_band: ledgerBandForState(state),
    blockers,
  };
}

export function buildGrantSourceRegistry(state: RunState): GrantSourceRegistryV0 {
  const eligibility = buildGrantEligibilityAssessment(state);
  const rows = buildGrantSourceRows(state);

  const entries = [...rows.liege_rows, ...rows.dispossessed_rows]
    .map((row) => createGrantSourceEntry(state, rows.anchor_manor_id, row, eligibility))
    .sort(compareGrantSourceEntries);
  const entryIds = entries.map((entry) => entry.source_entry_id);

  return {
    schema_version: GRANT_SOURCE_REGISTRY_SCHEMA_VERSION,
    generated_at_turn_index: state.turn_index,
    anchor_manor_id: rows.anchor_manor_id,
    controlled_manor_ids: [...rows.controlled_manor_ids],
    source_entry_ids: entryIds,
    liege_demesne_entry_ids: entryIds.filter((entryId) => entryId.includes(":liege_demesne:")),
    dispossessed_entry_ids: entryIds.filter((entryId) => entryId.includes(":dispossessed_pool:")),
    entries_by_id: buildOrderedRecord(entryIds, (entryId) => entries.find((entry) => entry.source_entry_id === entryId)!),
    overflow_count: rows.overflow_count,
  };
}

export function buildGrantProspect(state: RunState): GrantProspect | null {
  const eligibility = buildGrantEligibilityAssessment(state);
  const registry = buildGrantSourceRegistry(state);
  return buildCanonicalGrantProspectFromInputs(state, eligibility, registry);
}

function compareAcquisitionProspects(left: Prospect, right: Prospect): number {
  const leftMeta = acquisitionRankMetaFor(left);
  const rightMeta = acquisitionRankMetaFor(right);
  if (leftMeta.acquisition_rank_group !== rightMeta.acquisition_rank_group) {
    return leftMeta.acquisition_rank_group - rightMeta.acquisition_rank_group;
  }
  if (leftMeta.acquisition_sort_score !== rightMeta.acquisition_sort_score) {
    return rightMeta.acquisition_sort_score - leftMeta.acquisition_sort_score;
  }
  const tieCmp = compareText(leftMeta.acquisition_tie_key, rightMeta.acquisition_tie_key);
  if (tieCmp !== 0) return tieCmp;
  return compareText(left.id, right.id);
}

export function buildAcquisitionProspectsWindow(
  state: RunState,
  options?: {
    grant_eligibility?: GrantEligibilityAssessmentV0;
    grant_source_registry?: GrantSourceRegistryV0;
  }
): AcquisitionProspectsWindowV0 {
  const eligibility = options?.grant_eligibility ?? buildGrantEligibilityAssessment(state);
  const grantSourceRegistry = options?.grant_source_registry ?? buildGrantSourceRegistry(state);
  const prospects = [
    buildCanonicalMarriageProspect(state),
    buildCanonicalGrantProspectFromInputs(state, eligibility, grantSourceRegistry),
    buildCanonicalInheritanceProspect(state),
  ].filter((prospect): prospect is Prospect => prospect !== null);

  const ordered = [...prospects].sort(compareAcquisitionProspects);
  const shown = ordered.slice(0, CANONICAL_ACQUISITION_PROSPECT_LIMIT);
  const hidden = ordered.slice(CANONICAL_ACQUISITION_PROSPECT_LIMIT);
  const shownIds = shown.map((prospect) => prospect.id);
  const hiddenIds = hidden.map((prospect) => prospect.id);

  return {
    schema_version: ACQUISITION_PROSPECTS_WINDOW_SCHEMA_VERSION,
    turn_index: state.turn_index,
    generated_at_turn_index: state.turn_index,
    prospect_ids: shownIds,
    prospects: shown,
    shown_ids: shownIds,
    hidden_ids: hiddenIds,
    overflow_count: hidden.length,
  };
}

export function buildGrantAcquisitionExperienceSurfaces(
  state: RunState
): GrantAcquisitionExperienceSurfacesV0 {
  const grantEligibility = buildGrantEligibilityAssessment(state);
  const grantSourceRegistry = buildGrantSourceRegistry(state);
  const acquisitionWindow = buildAcquisitionProspectsWindow(state, {
    grant_eligibility: grantEligibility,
    grant_source_registry: grantSourceRegistry,
  });
  const grantProspect = acquisitionWindow.prospects.find((prospect) => prospect.type === "grant") ?? null;

  recordRuntimeDomainEvidence(state, "prospects", [
    makeEvidenceEvent({
      kind: grantEligibility.eligible ? "grant_eligibility_open" : "grant_eligibility_blocked",
      detail: grantEligibility.eligible
        ? "Grant eligibility open for bounded acquisition review."
        : `Grant eligibility blocked: ${grantEligibility.blockers.join(", ") || "unknown blocker"}.`,
      category: "prospects",
      confidence: "known",
      subject_ids: [state.house.head.id, state.locals.liege.id]
    }),
    makeEvidenceEvent({
      kind: grantProspect ? "grant_prospect_available" : "grant_prospect_unavailable",
      detail: grantProspect
        ? `Grant prospect available: ${grantProspect.id}.`
        : "No bounded grant prospect is currently available.",
      category: "prospects",
      confidence: grantProspect ? grantProspect.uncertainty : "known",
      subject_ids: [state.house.head.id, state.locals.liege.id]
    })
  ]);

  return {
    grant_eligibility: grantEligibility,
    grant_source_registry: grantSourceRegistry,
    grant_dossier_summaries: grantSourceRegistry.source_entry_ids.map(
      (entryId) => grantSourceRegistry.entries_by_id[entryId]!.dossier_summary
    ),
    acquisition_prospects_window: acquisitionWindow,
  };
}

export function serializeGrantSourceRegistry(registry: GrantSourceRegistryV0): string {
  const sourceEntryIds = [...registry.source_entry_ids].sort(compareText);
  return JSON.stringify({
    schema_version: registry.schema_version,
    generated_at_turn_index: nonNegativeInteger(registry.generated_at_turn_index),
    anchor_manor_id: registry.anchor_manor_id,
    controlled_manor_ids: [...registry.controlled_manor_ids].sort(compareText),
    source_entry_ids: sourceEntryIds,
    liege_demesne_entry_ids: [...registry.liege_demesne_entry_ids].sort(compareText),
    dispossessed_entry_ids: [...registry.dispossessed_entry_ids].sort(compareText),
    entries_by_id: buildOrderedRecord(sourceEntryIds, (entryId) => registry.entries_by_id[entryId]),
    overflow_count: nonNegativeInteger(registry.overflow_count),
  });
}

export function serializeAcquisitionProspectsWindow(window: AcquisitionProspectsWindowV0): string {
  return JSON.stringify({
    schema_version: window.schema_version,
    turn_index: nonNegativeInteger(window.turn_index),
    generated_at_turn_index: nonNegativeInteger(window.generated_at_turn_index),
    prospect_ids: [...window.prospect_ids],
    prospects: window.prospects.map((prospect) => ({
      id: prospect.id,
      type: prospect.type,
      from_house_id: prospect.from_house_id,
      to_house_id: prospect.to_house_id,
      subject_person_id: prospect.subject_person_id,
      spouse_person_id: prospect.spouse_person_id ?? null,
      summary: prospect.summary,
      requirements: prospect.requirements.map((requirement) => ({
        kind: requirement.kind,
        value: requirement.value,
        text: requirement.text,
      })),
      costs: { ...prospect.costs },
      predicted_effects: {
        coin_delta: prospect.predicted_effects.coin_delta ?? null,
        relationship_deltas: prospect.predicted_effects.relationship_deltas ?? [],
        flags_set: prospect.predicted_effects.flags_set ?? [],
      },
      uncertainty: prospect.uncertainty,
      expires_turn: nonNegativeInteger(prospect.expires_turn),
      actions: [...prospect.actions],
    })),
    shown_ids: [...window.shown_ids],
    hidden_ids: [...window.hidden_ids],
    overflow_count: nonNegativeInteger(window.overflow_count),
  });
}
