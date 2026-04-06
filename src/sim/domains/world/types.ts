export const MANOR_UNITS_SCHEMA_VERSION = "manor_units_v1" as const;
export const HOLDING_FABRIC_SCHEMA_VERSION = "holding_fabric_v1" as const;
export const WORLD_TOPOLOGY_SCHEMA_VERSION = "world_topology_v1" as const;
export const XMAP_ALPHA_MANIFEST_SCHEMA_VERSION = "xmap_alpha_manifest_v1" as const;
export const HOLDING_FABRIC_LEGAL_RULE_VERSION = "holding_fabric_legal_rules_v0_1" as const;
export const WORLD_DOMAIN_SCHEMA_VERSION = "xmap_world_domain_v1" as const;
export const CANONICAL_NUMERIC_DISTANCE_METRIC = "travel_cost_distance" as const;
export const ROUTE_HOP_DISTANCE_METRIC = "route_hop_distance" as const;
export const WORLD_TOPOLOGY_SNAPSHOT_SCHEMA_VERSION = "world_topology_snapshot_v1" as const;
export const WORLD_SCOPE_CAP_TABLE_SCHEMA_VERSION = "world_scope_cap_table_v1" as const;

export type XMapFranchiseBundleV1 = {
  market_right: string;
  fair_right: string;
  toll_right: string;
  bridge_or_crossing_revenue: string;
  [key: string]: unknown;
};

export type XMapJurisdictionBundleV1 = {
  demesne_administration: boolean;
  seigneurial_court: boolean;
  county_administration: boolean;
  county_court: boolean;
  royal_justice_claim: boolean;
  diocesan_spiritual_jurisdiction: boolean;
  metropolitan_spiritual_jurisdiction: boolean;
  ecclesiastical_temporal_control: boolean;
  forest_special_jurisdiction: boolean;
  [key: string]: unknown;
};

export interface XMapManorUnitV1 {
  manor_id: string;
  holding_id: string;
  holding_type: string;
  holding_tier: string;
  county_id: string;
  bishopric_id: string | null;
  archbishopric_id: string | null;
  legal_rule_version: string;
  immediate_lord_actor_id: string;
  superior_lord_actor_id: string;
  holder_actor_id: string;
  holder_actor_type: string;
  church_holder_kind: string | null;
  tenure_basis: string;
  service_basis: string[];
  default_succession_incidents: string[];
  jurisdiction_bundle: XMapJurisdictionBundleV1;
  franchise_bundle: XMapFranchiseBundleV1;
  forest_overlay_status: string;
  vacancy_rule_family: string;
  hex_ids: string[];
  [key: string]: unknown;
}

export interface XMapHoldingRecordBaseV1 {
  holding_id: string;
  holding_type: string;
  holding_tier: string;
  county_id: string | null;
  bishopric_ids: string[];
  archbishopric_ids: string[];
  holder_actor_id: string;
  holder_actor_type: string;
  immediate_lord_actor_id: string;
  superior_lord_actor_id: string;
  church_holder_kind: string | null;
  tenure_basis: string;
  service_basis: string[];
  default_succession_incidents: string[];
  jurisdiction_bundle: XMapJurisdictionBundleV1;
  franchise_bundle: XMapFranchiseBundleV1;
  forest_overlay_status: string;
  legal_rule_version: string;
  manor_ids: string[];
  hex_ids: string[];
  [key: string]: unknown;
}

export interface XMapDirectHoldingV1 extends XMapHoldingRecordBaseV1 {}

export interface XMapBaronyHoldingV1 extends XMapHoldingRecordBaseV1 {
  anchor_label: string;
  anchor_manor_id: string;
  anchor_roles: string[];
  seat_hex_id: string;
}

export type XMapHoldingRecordV1 = XMapDirectHoldingV1 | XMapBaronyHoldingV1;

export interface XMapCountyOverlayV1 {
  county_id: string;
  name: string;
  holding_ids: string[];
  manor_ids: string[];
  controls_jurisdiction: boolean;
  controls_ownership: boolean;
  overlay_actor_id: string;
  overlay_actor_type: string;
  overlay_type: string;
  ownership_scope: string;
  forest_overlay_status: string;
  jurisdiction_bundle: XMapJurisdictionBundleV1;
  franchise_bundle: XMapFranchiseBundleV1;
  legal_rule_version: string;
  [key: string]: unknown;
}

export interface XMapBishopricOverlayV1 {
  bishopric_id: string;
  archbishopric_id: string | null;
  manor_ids: string[];
  controls_jurisdiction: boolean;
  controls_ownership: boolean;
  overlay_actor_id: string;
  overlay_actor_type: string;
  overlay_type: string;
  ownership_scope: string;
  forest_overlay_status: string;
  jurisdiction_bundle: XMapJurisdictionBundleV1;
  franchise_bundle: XMapFranchiseBundleV1;
  legal_rule_version: string;
  [key: string]: unknown;
}

export interface XMapArchbishopricOverlayV1 {
  archbishopric_id: string;
  bishopric_ids: string[];
  controls_jurisdiction: boolean;
  controls_ownership: boolean;
  overlay_actor_id: string;
  overlay_actor_type: string;
  overlay_type: string;
  ownership_scope: string;
  forest_overlay_status: string;
  jurisdiction_bundle: XMapJurisdictionBundleV1;
  franchise_bundle: XMapFranchiseBundleV1;
  legal_rule_version: string;
  [key: string]: unknown;
}

export interface XMapManorAssignmentV1 {
  manor_id: string;
  holding_id: string;
  holding_type: string;
  holding_tier: string;
  county_id: string;
  bishopric_id: string | null;
  archbishopric_id: string | null;
  holder_actor_id: string;
  holder_actor_type: string;
  immediate_lord_actor_id: string;
  superior_lord_actor_id: string;
  church_holder_kind: string | null;
  tenure_basis: string;
  service_basis: string[];
  default_succession_incidents: string[];
  jurisdiction_bundle: XMapJurisdictionBundleV1;
  franchise_bundle: XMapFranchiseBundleV1;
  forest_overlay_status: string;
  vacancy_rule_family: string;
  legal_rule_version: string;
  [key: string]: unknown;
}

export interface XMapTerritorialNeighborV1 {
  manor_id: string;
  shared_border_sides: number;
}

export interface XMapRouteNeighborV1 {
  edge_id: string;
  manor_id: string;
  travel_cost: number;
}

export interface XMapTerritorialAdjacencyRowV1 {
  manor_id: string;
  neighbors: XMapTerritorialNeighborV1[];
}

export interface XMapRouteAdjacencyRowV1 {
  manor_id: string;
  neighbors: XMapRouteNeighborV1[];
}

export interface XMapWeightedRouteEdgeV1 {
  edge_id: string;
  from_manor_id: string;
  to_manor_id: string;
  path_hex_ids: string[];
  route_tier: string;
  shared_border_sides: number;
  travel_cost: number;
}

export interface XMapDistancePreviewEntryV1 {
  to_manor_id: string;
  travel_cost_distance: number;
  route_hop_distance: number;
}

export interface XMapDistancePreviewRowV1 {
  manor_id: string;
  distances: XMapDistancePreviewEntryV1[];
}

export interface XMapDistanceMetricsV1 {
  canonical_numeric_distance: string;
  companion_metric: string;
  export_mode: string;
  far_threshold_default: number | null;
  preview_row_count: number;
}

export interface XMapManorUnitsFileV1 {
  schema_version: typeof MANOR_UNITS_SCHEMA_VERSION;
  map_schema_version: string;
  kingdom_scope: string;
  mapgen_seed: string;
  config_sha256: string;
  manors: XMapManorUnitV1[];
}

export interface XMapHoldingFabricFileV1 {
  schema_version: typeof HOLDING_FABRIC_SCHEMA_VERSION;
  map_schema_version: string;
  kingdom_scope: string;
  mapgen_seed: string;
  config_sha256: string;
  legal_rule_version: typeof HOLDING_FABRIC_LEGAL_RULE_VERSION;
  direct_holdings: XMapDirectHoldingV1[];
  baronies: XMapBaronyHoldingV1[];
  counties: XMapCountyOverlayV1[];
  bishoprics: XMapBishopricOverlayV1[];
  archbishoprics: XMapArchbishopricOverlayV1[];
  manor_assignments: XMapManorAssignmentV1[];
  ownership_metrics: Record<string, unknown>;
}

export interface XMapWorldTopologyFileV1 {
  schema_version: typeof WORLD_TOPOLOGY_SCHEMA_VERSION;
  map_schema_version: string;
  kingdom_scope: string;
  mapgen_seed: string;
  config_sha256: string;
  manor_ids: string[];
  territorial_adjacency: XMapTerritorialAdjacencyRowV1[];
  route_adjacency: XMapRouteAdjacencyRowV1[];
  weighted_route_edges: XMapWeightedRouteEdgeV1[];
  distance_preview_rows: XMapDistancePreviewRowV1[];
  distance_metrics: XMapDistanceMetricsV1;
}

export interface XMapManifestArtifactV1 {
  filename: string;
  sha256?: string;
}

export interface XMapAlphaManifestV1 {
  schema_version: typeof XMAP_ALPHA_MANIFEST_SCHEMA_VERSION;
  map_schema_version: string;
  kingdom_scope: string;
  mapgen_seed: string;
  config_sha256: string;
  distance_metrics: XMapDistanceMetricsV1;
  public_artifacts: {
    primary: {
      manor_units: XMapManifestArtifactV1;
      holding_fabric: XMapManifestArtifactV1;
      world_topology: XMapManifestArtifactV1;
      manifest: XMapManifestArtifactV1;
    };
  };
  source_artifacts: Record<string, unknown>;
  summary: {
    manor_count: number;
    county_count: number;
    bishopric_count: number;
    archbishopric_count: number;
    barony_count: number;
    [key: string]: number;
  };
}

export interface XMapImportSurfaceV1 {
  manifest: XMapAlphaManifestV1;
  manor_units: XMapManorUnitsFileV1;
  holding_fabric: XMapHoldingFabricFileV1;
  world_topology: XMapWorldTopologyFileV1;
}

export interface WorldNumericDistanceV1 {
  travel_cost_distance: number;
  route_hop_distance: number;
}

export type WorldDistanceBandV1 = "near" | "far";

export interface WorldDistanceBandOptionsV1 {
  far_threshold?: number | null;
}

export type WorldScopeCapTierKeyV1 = "king" | "count" | "baron" | "knight" | "bishop" | "abbot" | "unknown";

export type WorldScopeCapBucketV1 = "kinship" | "territorial_adjacent" | "route_adjacent" | "near" | "far";

export interface WorldScopeCapRuleV1 {
  bucket: WorldScopeCapBucketV1;
  max_total_houses: number;
}

export interface WorldScopeCapRowV1 {
  tier_key: WorldScopeCapTierKeyV1;
  tier_labels: string[];
  rules: WorldScopeCapRuleV1[];
}

export interface WorldScopeCapTableV1 {
  schema_version: typeof WORLD_SCOPE_CAP_TABLE_SCHEMA_VERSION;
  canonical_numeric_distance: typeof CANONICAL_NUMERIC_DISTANCE_METRIC;
  bucket_order: WorldScopeCapBucketV1[];
  rows: WorldScopeCapRowV1[];
}

export interface WorldScopeCapCandidateV1 {
  stable_id: string;
  bucket: WorldScopeCapBucketV1;
}

export interface WorldScopeCapDecisionV1 {
  stable_id: string;
  bucket: WorldScopeCapBucketV1;
  bucket_rank: number;
  bucket_limit: number;
  admitted: boolean;
  admitted_total: number;
}

export interface WorldScopeCapEvaluationV1 {
  schema_version: typeof WORLD_SCOPE_CAP_TABLE_SCHEMA_VERSION;
  source_tier: WorldScopeCapTierKeyV1;
  bucket_order: WorldScopeCapBucketV1[];
  rules: WorldScopeCapRuleV1[];
  admitted_ids: string[];
  rejected_ids: string[];
  decisions: WorldScopeCapDecisionV1[];
}

export interface WorldScopeCandidateOptionsV1 extends WorldDistanceBandOptionsV1 {
  candidate_manor_ids?: string[] | null;
  kinship_manor_ids?: string[] | null;
}

export interface WorldScopedManorCandidateV1 extends WorldNumericDistanceV1, WorldScopeCapCandidateV1 {
  manor_id: string;
  distance_band: WorldDistanceBandV1 | null;
  territorial_adjacent: boolean;
  route_adjacent: boolean;
}

export interface WorldScopedManorEvaluationV1 {
  anchor_manor_id: string;
  far_threshold: number | null;
  candidates: WorldScopedManorCandidateV1[];
  cap_evaluation: WorldScopeCapEvaluationV1;
}

export interface WorldTopologySnapshotDistanceSampleV1 extends WorldNumericDistanceV1 {
  to_manor_id: string;
  distance_band: WorldDistanceBandV1 | null;
}

export interface WorldTopologySnapshotV1 {
  schema_version: typeof WORLD_TOPOLOGY_SNAPSHOT_SCHEMA_VERSION;
  anchor_manor_id: string;
  anchor_holding_id: string;
  anchor_county_id: string;
  canonical_numeric_distance: typeof CANONICAL_NUMERIC_DISTANCE_METRIC;
  companion_metric: typeof ROUTE_HOP_DISTANCE_METRIC;
  far_threshold: number | null;
  distance_sample_limit: number;
  distance_sample_total: number;
  territorial_neighbors: XMapTerritorialNeighborV1[];
  route_neighbors: XMapRouteNeighborV1[];
  distance_samples: WorldTopologySnapshotDistanceSampleV1[];
}

export interface WorldDomainV1 {
  schema_version: typeof WORLD_DOMAIN_SCHEMA_VERSION;
  manifest: XMapAlphaManifestV1;
  manor_units: XMapManorUnitsFileV1;
  holding_fabric: XMapHoldingFabricFileV1;
  world_topology: XMapWorldTopologyFileV1;
  manors: readonly XMapManorUnitV1[];
  holdings: readonly XMapHoldingRecordV1[];
  counties: readonly XMapCountyOverlayV1[];
  bishoprics: readonly XMapBishopricOverlayV1[];
  archbishoprics: readonly XMapArchbishopricOverlayV1[];
  manor_assignments: readonly XMapManorAssignmentV1[];
  manors_by_id: ReadonlyMap<string, XMapManorUnitV1>;
  holdings_by_id: ReadonlyMap<string, XMapHoldingRecordV1>;
  counties_by_id: ReadonlyMap<string, XMapCountyOverlayV1>;
  bishoprics_by_id: ReadonlyMap<string, XMapBishopricOverlayV1>;
  archbishoprics_by_id: ReadonlyMap<string, XMapArchbishopricOverlayV1>;
  manor_assignments_by_manor_id: ReadonlyMap<string, XMapManorAssignmentV1>;
  territorial_adjacency_by_manor_id: ReadonlyMap<string, readonly XMapTerritorialNeighborV1[]>;
  route_adjacency_by_manor_id: ReadonlyMap<string, readonly XMapRouteNeighborV1[]>;
  route_edges_by_id: ReadonlyMap<string, XMapWeightedRouteEdgeV1>;
}
