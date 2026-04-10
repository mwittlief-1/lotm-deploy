import holdingFabricJson from "../../../../data/map/xmap_alpha_v1/holding_fabric_v1.json";
import mapViewSupportJson from "../../../../data/map/xmap_alpha_v1/map_view_support_v1.json";
import manorUnitsJson from "../../../../data/map/xmap_alpha_v1/manor_units_v1.json";
import manifestJson from "../../../../data/map/xmap_alpha_v1/xmap_alpha_manifest_v1.json";
import worldTopologyJson from "../../../../data/map/xmap_alpha_v1/world_topology_v1.json";

import {
  ACTION_SCOPE_RESOLUTION_SCHEMA_VERSION,
  CANONICAL_NUMERIC_DISTANCE_METRIC,
  HOLDING_FABRIC_LEGAL_RULE_VERSION,
  HOLDING_FABRIC_SCHEMA_VERSION,
  MANOR_DETAIL_VIEW_SCHEMA_VERSION,
  MANOR_UNITS_SCHEMA_VERSION,
  MAP_VIEW_SNAPSHOT_SCHEMA_VERSION,
  MAP_VIEW_SUPPORT_SCHEMA_VERSION,
  ROUTE_HOP_DISTANCE_METRIC,
  WORLD_DOMAIN_SCHEMA_VERSION,
  WORLD_SCOPE_CAP_TABLE_SCHEMA_VERSION,
  WORLD_TOPOLOGY_SNAPSHOT_SCHEMA_VERSION,
  WORLD_TOPOLOGY_SCHEMA_VERSION,
  XMAP_ALPHA_MANIFEST_SCHEMA_VERSION,
  type ManorDetailArabilitySummaryV1,
  type ManorDetailHexRowV1,
  type ManorDetailNearestManorRowV1,
  type ManorDetailTerrainMixRowV1,
  type ManorDetailViewV1,
  type MapViewCheckpointTargetV1,
  type MapViewRoadExposureV1,
  type MapViewRiverExposureV1,
  type MapViewRowV1,
  type MapViewSnapshotRowV1,
  type MapViewSnapshotV1,
  type MapViewSupportFileV1,
  type MapViewSupportHexV1,
  type WorldDistanceBandOptionsV1,
  type WorldDistanceBandV1,
  type WorldActionScopeActionV1,
  type WorldActionScopeResolutionV1,
  type WorldScopeCapBucketV1,
  type WorldScopeCapCandidateV1,
  type WorldScopeCapDecisionV1,
  type WorldScopeCapEvaluationV1,
  type WorldScopeCandidateOptionsV1,
  type WorldScopeCapRowV1,
  type WorldScopeCapRuleV1,
  type WorldScopedManorCandidateV1,
  type WorldScopedManorEvaluationV1,
  type WorldScopeCapTableV1,
  type WorldScopeCapTierKeyV1,
  type WorldDomainV1,
  type WorldNumericDistanceV1,
  type WorldTopologySnapshotDistanceSampleV1,
  type WorldTopologySnapshotV1,
  type XMapAlphaManifestV1,
  type XMapArchbishopricOverlayV1,
  type XMapBishopricOverlayV1,
  type XMapCountyOverlayV1,
  type XMapHoldingFabricFileV1,
  type XMapHoldingRecordV1,
  type XMapImportSurfaceV1,
  type XMapManorAssignmentV1,
  type XMapManorUnitV1,
  type XMapManorUnitsFileV1,
  type XMapRouteAdjacencyRowV1,
  type XMapRouteNeighborV1,
  type XMapTerritorialAdjacencyRowV1,
  type XMapTerritorialNeighborV1,
  type XMapWeightedRouteEdgeV1,
  type XMapWorldTopologyFileV1
} from "./types";

const BUNDLED_IMPORT_SURFACE = {
  manifest: manifestJson,
  manor_units: manorUnitsJson,
  holding_fabric: holdingFabricJson,
  world_topology: worldTopologyJson
} as XMapImportSurfaceV1;
const BUNDLED_MAP_VIEW_SUPPORT = mapViewSupportJson as MapViewSupportFileV1;

const EMPTY_TERRITORIAL_NEIGHBORS: readonly XMapTerritorialNeighborV1[] = [];
const EMPTY_ROUTE_NEIGHBORS: readonly XMapRouteNeighborV1[] = [];
const DISTANCE_SCALE = 1000;
const WORLD_TOPOLOGY_DISTANCE_SAMPLE_LIMIT = 8;
const MAP_VIEW_ROW_ORDERING = "anchor_first_then_manor_id" as const;
const MANOR_DETAIL_NEAREST_MANOR_LIMIT = 5;
const WORLD_SCOPE_CAP_BUCKET_ORDER = [
  "kinship",
  "territorial_adjacent",
  "route_adjacent",
  "near",
  "far"
] as const satisfies readonly WorldScopeCapBucketV1[];

const WORLD_SCOPE_CAP_ROWS: readonly WorldScopeCapRowV1[] = [
  {
    tier_key: "king",
    tier_labels: ["King"],
    rules: [
      { bucket: "kinship", max_total_houses: 48 },
      { bucket: "territorial_adjacent", max_total_houses: 96 },
      { bucket: "route_adjacent", max_total_houses: 144 },
      { bucket: "near", max_total_houses: 216 },
      { bucket: "far", max_total_houses: 320 }
    ]
  },
  {
    tier_key: "count",
    tier_labels: ["Count", "Earl"],
    rules: [
      { bucket: "kinship", max_total_houses: 40 },
      { bucket: "territorial_adjacent", max_total_houses: 80 },
      { bucket: "route_adjacent", max_total_houses: 120 },
      { bucket: "near", max_total_houses: 184 },
      { bucket: "far", max_total_houses: 256 }
    ]
  },
  {
    tier_key: "baron",
    tier_labels: ["Baron"],
    rules: [
      { bucket: "kinship", max_total_houses: 32 },
      { bucket: "territorial_adjacent", max_total_houses: 64 },
      { bucket: "route_adjacent", max_total_houses: 96 },
      { bucket: "near", max_total_houses: 144 },
      { bucket: "far", max_total_houses: 208 }
    ]
  },
  {
    tier_key: "knight",
    tier_labels: ["Knight"],
    rules: [
      { bucket: "kinship", max_total_houses: 24 },
      { bucket: "territorial_adjacent", max_total_houses: 48 },
      { bucket: "route_adjacent", max_total_houses: 72 },
      { bucket: "near", max_total_houses: 112 },
      { bucket: "far", max_total_houses: 160 }
    ]
  },
  {
    tier_key: "bishop",
    tier_labels: ["Bishop"],
    rules: [
      { bucket: "kinship", max_total_houses: 32 },
      { bucket: "territorial_adjacent", max_total_houses: 64 },
      { bucket: "route_adjacent", max_total_houses: 96 },
      { bucket: "near", max_total_houses: 144 },
      { bucket: "far", max_total_houses: 208 }
    ]
  },
  {
    tier_key: "abbot",
    tier_labels: ["Abbot"],
    rules: [
      { bucket: "kinship", max_total_houses: 28 },
      { bucket: "territorial_adjacent", max_total_houses: 56 },
      { bucket: "route_adjacent", max_total_houses: 84 },
      { bucket: "near", max_total_houses: 128 },
      { bucket: "far", max_total_houses: 192 }
    ]
  },
  {
    tier_key: "unknown",
    tier_labels: [],
    rules: [
      { bucket: "kinship", max_total_houses: 24 },
      { bucket: "territorial_adjacent", max_total_houses: 48 },
      { bucket: "route_adjacent", max_total_houses: 72 },
      { bucket: "near", max_total_houses: 112 },
      { bucket: "far", max_total_houses: 160 }
    ]
  }
] as const;

let bundledWorldDomain: WorldDomainV1 | undefined;
let worldScopeCapTable: WorldScopeCapTableV1 | undefined;

const travelDistanceCacheByDomain = new WeakMap<WorldDomainV1, Map<string, Map<string, number>>>();
const routeHopCacheByDomain = new WeakMap<WorldDomainV1, Map<string, Map<string, number>>>();

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function numericSuffix(value: string, prefix: string): number | null {
  if (!value.startsWith(prefix)) return null;
  const numeric = Number(value.slice(prefix.length));
  return Number.isFinite(numeric) ? numeric : null;
}

function compareHexIds(left: string, right: string): number {
  const leftNumeric = numericSuffix(left, "hx_");
  const rightNumeric = numericSuffix(right, "hx_");
  if (leftNumeric !== null && rightNumeric !== null && leftNumeric !== rightNumeric) {
    return leftNumeric - rightNumeric;
  }
  return compareStrings(left, right);
}

function titleCaseTokens(value: string): string {
  return value
    .split(/[\s_]+/)
    .filter((token) => token.length > 0)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

function hexLabelFromId(hexId: string): string {
  const numeric = numericSuffix(hexId, "hx_");
  return numeric === null ? titleCaseTokens(hexId) : `Hx ${numeric}`;
}

function roundToFour(value: number): number {
  return Number(value.toFixed(4));
}

function assertWorld(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`XMAP import surface invalid: ${message}`);
  }
}

function buildUniqueIndex<T>(rows: readonly T[], getId: (row: T) => string, label: string): Map<string, T> {
  const index = new Map<string, T>();
  for (const row of rows) {
    const id = getId(row);
    assertWorld(id.length > 0, `${label} row missing id`);
    assertWorld(!index.has(id), `duplicate ${label} id ${id}`);
    index.set(id, row);
  }
  return index;
}

function buildAdjacencyIndex<T extends XMapTerritorialAdjacencyRowV1 | XMapRouteAdjacencyRowV1>(
  rows: readonly T[],
  label: string
): Map<string, readonly T["neighbors"]> {
  const index = new Map<string, readonly T["neighbors"]>();
  for (const row of rows) {
    assertWorld(!index.has(row.manor_id), `duplicate ${label} row for ${row.manor_id}`);
    index.set(row.manor_id, row.neighbors);
  }
  return index;
}

function toDistanceMilli(value: number): number {
  assertWorld(Number.isFinite(value), `route travel cost must be finite, got ${String(value)}`);
  return Math.round(value * DISTANCE_SCALE);
}

function fromDistanceMilli(value: number): number {
  return value / DISTANCE_SCALE;
}

function compareDistanceSamples(
  left: WorldTopologySnapshotDistanceSampleV1,
  right: WorldTopologySnapshotDistanceSampleV1
): number {
  if (left.travel_cost_distance !== right.travel_cost_distance) {
    return left.travel_cost_distance - right.travel_cost_distance;
  }
  if (left.route_hop_distance !== right.route_hop_distance) {
    return left.route_hop_distance - right.route_hop_distance;
  }
  return compareStrings(left.to_manor_id, right.to_manor_id);
}

function normalizeFarThreshold(value: number | null | undefined, label: string): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  assertWorld(Number.isFinite(value) && value >= 0, `${label} must be a non-negative finite number`);
  return value;
}

function normalizeScopeCapCount(value: number, label: string): number {
  assertWorld(Number.isInteger(value) && value >= 0, `${label} must be a non-negative integer`);
  return value;
}

function normalizeScopeCapBucket(bucket: string): WorldScopeCapBucketV1 {
  assertWorld(
    WORLD_SCOPE_CAP_BUCKET_ORDER.includes(bucket as WorldScopeCapBucketV1),
    `unknown scope cap bucket ${bucket}`
  );
  return bucket as WorldScopeCapBucketV1;
}

function compareScopeBucket(left: WorldScopeCapBucketV1, right: WorldScopeCapBucketV1): number {
  return WORLD_SCOPE_CAP_BUCKET_ORDER.indexOf(left) - WORLD_SCOPE_CAP_BUCKET_ORDER.indexOf(right);
}

function cloneScopeCapRules(rules: readonly WorldScopeCapRuleV1[]): WorldScopeCapRuleV1[] {
  return rules.map((rule) => ({
    bucket: rule.bucket,
    max_total_houses: rule.max_total_houses
  }));
}

function validateScopeCapRows(rows: readonly WorldScopeCapRowV1[]): void {
  for (const row of rows) {
    assertWorld(row.rules.length === WORLD_SCOPE_CAP_BUCKET_ORDER.length, `scope cap row ${row.tier_key} must define every bucket`);
    let previous = -1;

    for (let index = 0; index < row.rules.length; index += 1) {
      const rule = row.rules[index];
      assertWorld(rule !== undefined, `scope cap row ${row.tier_key} has a missing rule`);
      const expectedBucket = WORLD_SCOPE_CAP_BUCKET_ORDER[index];
      assertWorld(
        rule.bucket === expectedBucket,
        `scope cap row ${row.tier_key} must follow canonical bucket order; expected ${expectedBucket}`
      );
      const maxTotal = normalizeScopeCapCount(rule.max_total_houses, `scope cap row ${row.tier_key} bucket ${rule.bucket}`);
      assertWorld(
        maxTotal >= previous,
        `scope cap row ${row.tier_key} bucket ${rule.bucket} must not reduce the cumulative cap`
      );
      previous = maxTotal;
    }
  }
}

function normalizedScopeTierLabel(label: string | null | undefined): string {
  return String(label ?? "")
    .trim()
    .toLowerCase();
}

function bucketLimitFromRules(rules: readonly WorldScopeCapRuleV1[], bucket: WorldScopeCapBucketV1): number {
  const rule = rules.find((entry) => entry.bucket === bucket);
  assertWorld(rule, `scope cap bucket ${bucket} is missing from the cap table`);
  return normalizeScopeCapCount(rule.max_total_houses, `scope cap bucket ${bucket}`);
}

function normalizeManorIdList(manorIds: readonly string[] | null | undefined): string[] {
  const deduped = new Set<string>();
  for (const manorId of manorIds ?? []) {
    if (typeof manorId !== "string") continue;
    const trimmed = manorId.trim();
    if (!trimmed) continue;
    deduped.add(trimmed);
  }
  return [...deduped].sort(compareStrings);
}

function hasNeighborManorId<T extends XMapTerritorialNeighborV1 | XMapRouteNeighborV1>(
  rows: readonly T[] | null,
  manorId: string
): boolean {
  return (rows ?? []).some((neighbor) => neighbor.manor_id === manorId);
}

function resolveScopeCandidateManorIds(
  domain: WorldDomainV1,
  anchorManorId: string,
  options?: WorldScopeCandidateOptionsV1
): string[] {
  if (!domain.manors_by_id.has(anchorManorId)) return [];

  const configured = normalizeManorIdList(options?.candidate_manor_ids);
  if (configured.length > 0) {
    return configured.filter((manorId) => manorId !== anchorManorId && domain.manors_by_id.has(manorId));
  }

  return [...domain.world_topology.manor_ids].filter((manorId) => manorId !== anchorManorId);
}

function validateSchemas(surface: XMapImportSurfaceV1): void {
  const manifestFarThreshold = normalizeFarThreshold(
    surface.manifest.distance_metrics.far_threshold_default,
    "manifest far_threshold_default"
  );
  const topologyFarThreshold = normalizeFarThreshold(
    surface.world_topology.distance_metrics.far_threshold_default,
    "world_topology far_threshold_default"
  );

  assertWorld(surface.manifest.schema_version === XMAP_ALPHA_MANIFEST_SCHEMA_VERSION, "unexpected manifest schema_version");
  assertWorld(surface.manor_units.schema_version === MANOR_UNITS_SCHEMA_VERSION, "unexpected manor_units schema_version");
  assertWorld(surface.holding_fabric.schema_version === HOLDING_FABRIC_SCHEMA_VERSION, "unexpected holding_fabric schema_version");
  assertWorld(surface.world_topology.schema_version === WORLD_TOPOLOGY_SCHEMA_VERSION, "unexpected world_topology schema_version");
  assertWorld(
    surface.holding_fabric.legal_rule_version === HOLDING_FABRIC_LEGAL_RULE_VERSION,
    "unexpected holding_fabric legal_rule_version"
  );
  assertWorld(
    surface.manifest.distance_metrics.canonical_numeric_distance === CANONICAL_NUMERIC_DISTANCE_METRIC,
    "manifest canonical distance metric drifted"
  );
  assertWorld(
    surface.world_topology.distance_metrics.canonical_numeric_distance === CANONICAL_NUMERIC_DISTANCE_METRIC,
    "topology canonical distance metric drifted"
  );
  assertWorld(
    surface.manifest.distance_metrics.companion_metric === ROUTE_HOP_DISTANCE_METRIC,
    "manifest companion distance metric drifted"
  );
  assertWorld(
    surface.world_topology.distance_metrics.companion_metric === ROUTE_HOP_DISTANCE_METRIC,
    "topology companion distance metric drifted"
  );
  assertWorld(manifestFarThreshold === topologyFarThreshold, "far_threshold_default drifted between manifest and topology");
  assertWorld(
    surface.manor_units.config_sha256 === surface.manifest.config_sha256 &&
      surface.holding_fabric.config_sha256 === surface.manifest.config_sha256 &&
      surface.world_topology.config_sha256 === surface.manifest.config_sha256,
    "primary files disagree on config_sha256"
  );
}

function validateManifestSurface(surface: XMapImportSurfaceV1): void {
  const primary = surface.manifest.public_artifacts.primary;

  assertWorld(primary.manor_units.filename === "manor_units_v1.json", "manifest manor_units filename drifted");
  assertWorld(primary.holding_fabric.filename === "holding_fabric_v1.json", "manifest holding_fabric filename drifted");
  assertWorld(primary.world_topology.filename === "world_topology_v1.json", "manifest world_topology filename drifted");
  assertWorld(primary.manifest.filename === "xmap_alpha_manifest_v1.json", "manifest filename drifted");

  assertWorld(surface.manifest.summary.manor_count === surface.manor_units.manors.length, "manifest manor_count mismatch");
  assertWorld(
    surface.manifest.summary.barony_count === surface.holding_fabric.baronies.length,
    "manifest barony_count mismatch"
  );
  assertWorld(surface.manifest.summary.county_count === surface.holding_fabric.counties.length, "manifest county_count mismatch");
  assertWorld(
    surface.manifest.summary.bishopric_count === surface.holding_fabric.bishoprics.length,
    "manifest bishopric_count mismatch"
  );
  assertWorld(
    surface.manifest.summary.archbishopric_count === surface.holding_fabric.archbishoprics.length,
    "manifest archbishopric_count mismatch"
  );
}

function validateMapViewSupportSurface(surface: XMapImportSurfaceV1, support: MapViewSupportFileV1): void {
  assertWorld(support.schema_version === MAP_VIEW_SUPPORT_SCHEMA_VERSION, "unexpected map_view_support schema_version");
  assertWorld(support.map_schema_version === surface.manor_units.map_schema_version, "map view support map schema drifted");
  assertWorld(support.mapgen_seed === surface.manor_units.mapgen_seed, "map view support mapgen_seed drifted");
  assertWorld(support.hex_count === support.hexes.length, "map view support hex_count drifted");

  const hexIndex = buildUniqueIndex(support.hexes, (row) => row.hex_id, "map view support hex");

  for (const manor of surface.manor_units.manors) {
    assertWorld(hexIndex.has(manor.seat_hex_id), `map view support missing seat hex ${manor.seat_hex_id}`);
    for (const hexId of manor.hex_ids) {
      assertWorld(hexIndex.has(hexId), `map view support missing manor hex ${hexId}`);
    }
  }
}

function validateCrossReferences(surface: XMapImportSurfaceV1): void {
  const manorIndex = buildUniqueIndex(surface.manor_units.manors, (row) => row.manor_id, "manor");
  const holdingIndex = buildUniqueIndex(
    [...surface.holding_fabric.direct_holdings, ...surface.holding_fabric.baronies],
    (row) => row.holding_id,
    "holding"
  );
  const countyIndex = buildUniqueIndex(surface.holding_fabric.counties, (row) => row.county_id, "county");
  const bishopricIndex = buildUniqueIndex(surface.holding_fabric.bishoprics, (row) => row.bishopric_id, "bishopric");
  const archbishopricIndex = buildUniqueIndex(surface.holding_fabric.archbishoprics, (row) => row.archbishopric_id, "archbishopric");
  const assignmentIndex = buildUniqueIndex(surface.holding_fabric.manor_assignments, (row) => row.manor_id, "manor assignment");
  const routeEdgeIndex = buildUniqueIndex(surface.world_topology.weighted_route_edges, (row) => row.edge_id, "route edge");
  const topologyManorIds = new Set(surface.world_topology.manor_ids);

  assertWorld(topologyManorIds.size === surface.world_topology.manor_ids.length, "duplicate world_topology manor_ids");
  assertWorld(
    surface.world_topology.territorial_adjacency.length === surface.world_topology.manor_ids.length,
    "territorial adjacency rows do not cover every manor"
  );
  assertWorld(
    surface.world_topology.route_adjacency.length === surface.world_topology.manor_ids.length,
    "route adjacency rows do not cover every manor"
  );
  assertWorld(
    surface.world_topology.distance_preview_rows.length === surface.world_topology.distance_metrics.preview_row_count,
    "distance preview row count drifted"
  );

  for (const manor of surface.manor_units.manors) {
    assertWorld(topologyManorIds.has(manor.manor_id), `topology missing manor ${manor.manor_id}`);
    assertWorld(holdingIndex.has(manor.holding_id), `manor ${manor.manor_id} references unknown holding ${manor.holding_id}`);
    assertWorld(countyIndex.has(manor.county_id), `manor ${manor.manor_id} references unknown county ${manor.county_id}`);
    assertWorld(assignmentIndex.has(manor.manor_id), `manor ${manor.manor_id} missing manor_assignment`);
    if (manor.bishopric_id) {
      assertWorld(
        bishopricIndex.has(manor.bishopric_id),
        `manor ${manor.manor_id} references unknown bishopric ${manor.bishopric_id}`
      );
    }
    if (manor.archbishopric_id) {
      assertWorld(
        archbishopricIndex.has(manor.archbishopric_id),
        `manor ${manor.manor_id} references unknown archbishopric ${manor.archbishopric_id}`
      );
    }
  }

  for (const holding of holdingIndex.values()) {
    for (const manorId of holding.manor_ids) {
      assertWorld(manorIndex.has(manorId), `holding ${holding.holding_id} references unknown manor ${manorId}`);
    }
  }

  for (const county of surface.holding_fabric.counties) {
    for (const manorId of county.manor_ids) {
      assertWorld(manorIndex.has(manorId), `county ${county.county_id} references unknown manor ${manorId}`);
    }
  }

  for (const bishopric of surface.holding_fabric.bishoprics) {
    for (const manorId of bishopric.manor_ids) {
      assertWorld(manorIndex.has(manorId), `bishopric ${bishopric.bishopric_id} references unknown manor ${manorId}`);
    }
    if (bishopric.archbishopric_id) {
      assertWorld(
        archbishopricIndex.has(bishopric.archbishopric_id),
        `bishopric ${bishopric.bishopric_id} references unknown archbishopric ${bishopric.archbishopric_id}`
      );
    }
  }

  for (const archbishopric of surface.holding_fabric.archbishoprics) {
    for (const bishopricId of archbishopric.bishopric_ids) {
      assertWorld(
        bishopricIndex.has(bishopricId),
        `archbishopric ${archbishopric.archbishopric_id} references unknown bishopric ${bishopricId}`
      );
    }
  }

  for (const row of surface.world_topology.territorial_adjacency) {
    assertWorld(manorIndex.has(row.manor_id), `territorial adjacency references unknown manor ${row.manor_id}`);
    for (const neighbor of row.neighbors) {
      assertWorld(
        manorIndex.has(neighbor.manor_id),
        `territorial adjacency from ${row.manor_id} references unknown manor ${neighbor.manor_id}`
      );
    }
  }

  for (const row of surface.world_topology.route_adjacency) {
    assertWorld(manorIndex.has(row.manor_id), `route adjacency references unknown manor ${row.manor_id}`);
    for (const neighbor of row.neighbors) {
      assertWorld(manorIndex.has(neighbor.manor_id), `route adjacency from ${row.manor_id} references unknown manor ${neighbor.manor_id}`);
      assertWorld(routeEdgeIndex.has(neighbor.edge_id), `route adjacency from ${row.manor_id} references unknown edge ${neighbor.edge_id}`);
    }
  }

  for (const previewRow of surface.world_topology.distance_preview_rows) {
    assertWorld(manorIndex.has(previewRow.manor_id), `distance preview references unknown manor ${previewRow.manor_id}`);
    for (const preview of previewRow.distances) {
      assertWorld(
        manorIndex.has(preview.to_manor_id),
        `distance preview from ${previewRow.manor_id} references unknown manor ${preview.to_manor_id}`
      );
    }
  }
}

function validateImportSurface(surface: XMapImportSurfaceV1): void {
  validateSchemas(surface);
  validateManifestSurface(surface);
  validateMapViewSupportSurface(surface, BUNDLED_MAP_VIEW_SUPPORT);
  validateCrossReferences(surface);
}

function buildWorldDomain(surface: XMapImportSurfaceV1): WorldDomainV1 {
  const holdings = [...surface.holding_fabric.direct_holdings, ...surface.holding_fabric.baronies];

  return {
    schema_version: WORLD_DOMAIN_SCHEMA_VERSION,
    manifest: surface.manifest,
    manor_units: surface.manor_units,
    holding_fabric: surface.holding_fabric,
    world_topology: surface.world_topology,
    map_view_support: BUNDLED_MAP_VIEW_SUPPORT,
    manors: surface.manor_units.manors,
    holdings,
    counties: surface.holding_fabric.counties,
    bishoprics: surface.holding_fabric.bishoprics,
    archbishoprics: surface.holding_fabric.archbishoprics,
    manor_assignments: surface.holding_fabric.manor_assignments,
    manors_by_id: buildUniqueIndex(surface.manor_units.manors, (row) => row.manor_id, "manor"),
    holdings_by_id: buildUniqueIndex(holdings, (row) => row.holding_id, "holding"),
    counties_by_id: buildUniqueIndex(surface.holding_fabric.counties, (row) => row.county_id, "county"),
    bishoprics_by_id: buildUniqueIndex(surface.holding_fabric.bishoprics, (row) => row.bishopric_id, "bishopric"),
    archbishoprics_by_id: buildUniqueIndex(
      surface.holding_fabric.archbishoprics,
      (row) => row.archbishopric_id,
      "archbishopric"
    ),
    manor_assignments_by_manor_id: buildUniqueIndex(
      surface.holding_fabric.manor_assignments,
      (row) => row.manor_id,
      "manor assignment"
    ),
    map_hexes_by_id: buildUniqueIndex(BUNDLED_MAP_VIEW_SUPPORT.hexes, (row) => row.hex_id, "map view support hex"),
    territorial_adjacency_by_manor_id: buildAdjacencyIndex(surface.world_topology.territorial_adjacency, "territorial adjacency"),
    route_adjacency_by_manor_id: buildAdjacencyIndex(surface.world_topology.route_adjacency, "route adjacency"),
    route_edges_by_id: buildUniqueIndex(surface.world_topology.weighted_route_edges, (row) => row.edge_id, "route edge")
  };
}

function getDefaultAnchorManorId(domain: WorldDomainV1): string {
  const anchorRow = domain.world_topology.distance_preview_rows[0];
  assertWorld(anchorRow, "distance preview rows missing anchor manor");
  return anchorRow.manor_id;
}

function getMapHexById(domain: WorldDomainV1, hexId: string): MapViewSupportHexV1 {
  const row = domain.map_hexes_by_id.get(hexId);
  assertWorld(row, `map view support missing hex ${hexId}`);
  return row;
}

function manorLabelForId(manorId: string, domain: WorldDomainV1): string {
  const manor = getManorById(domain, manorId);
  return manor ? hexLabelFromId(manor.seat_hex_id) : titleCaseTokens(manorId);
}

function holdingSeatHexId(holding: XMapHoldingRecordV1): string {
  return "seat_hex_id" in holding && typeof holding.seat_hex_id === "string" ? holding.seat_hex_id : holding.hex_ids[0] ?? holding.holding_id;
}

function humanizeHoldingType(holdingType: string): string {
  return titleCaseTokens(holdingType);
}

function holdingLabelForRecord(holding: XMapHoldingRecordV1): string {
  const seatLabel = hexLabelFromId(holdingSeatHexId(holding));
  return `${humanizeHoldingType(holding.holding_type)} · ${seatLabel}`;
}

function ownerLabelForRecord(args: {
  countyLabel: string;
  holderActorId: string;
  holderActorType: string;
  seatHexId: string;
}): string {
  const { countyLabel, holderActorId, holderActorType, seatHexId } = args;
  const seatLabel = hexLabelFromId(seatHexId);

  if (holderActorId === "actor_crown") return "Crown";
  if (holderActorType === "count") return `Count of ${countyLabel}`;
  if (holderActorType === "baron") return `Baron of ${seatLabel}`;
  if (holderActorType === "abbey") return `Abbey of ${seatLabel}`;
  if (holderActorType === "bishop") return `Bishop of ${seatLabel}`;
  if (holderActorType === "archbishop") return `Archbishop of ${seatLabel}`;
  return `${titleCaseTokens(holderActorType)} · ${seatLabel}`;
}

function compareTerrainMix(left: ManorDetailTerrainMixRowV1, right: ManorDetailTerrainMixRowV1): number {
  if (left.hex_count !== right.hex_count) {
    return right.hex_count - left.hex_count;
  }
  return compareStrings(left.terrain, right.terrain);
}

function compareNearestManors(left: ManorDetailNearestManorRowV1, right: ManorDetailNearestManorRowV1): number {
  if (left.travel_cost_distance !== right.travel_cost_distance) {
    return left.travel_cost_distance - right.travel_cost_distance;
  }
  if (left.route_hop_distance !== right.route_hop_distance) {
    return left.route_hop_distance - right.route_hop_distance;
  }
  return compareStrings(left.manor_id, right.manor_id);
}

function buildRoadExposure(hexRows: readonly MapViewSupportHexV1[]): MapViewRoadExposureV1 {
  const routeTiers = new Set<string>();
  let hexCount = 0;

  for (const hex of hexRows) {
    if (hex.road_route_tiers.length === 0) continue;
    hexCount += 1;
    for (const routeTier of hex.road_route_tiers) {
      routeTiers.add(routeTier);
    }
  }

  return {
    state: hexCount > 0 ? "present" : "none",
    hex_count: hexCount,
    route_tiers: [...routeTiers].sort(compareStrings)
  };
}

function buildRiverExposure(hexRows: readonly MapViewSupportHexV1[]): MapViewRiverExposureV1 {
  const riverTags = new Set<string>();
  let hexCount = 0;

  for (const hex of hexRows) {
    if (hex.river_tags.length === 0) continue;
    hexCount += 1;
    for (const riverTag of hex.river_tags) {
      riverTags.add(riverTag);
    }
  }

  return {
    state: hexCount > 0 ? "present" : "none",
    hex_count: hexCount,
    river_tags: [...riverTags].sort(compareStrings)
  };
}

type ResidenceSelectorSummaryLike = {
  person_ids: string[];
  entries_by_person_id: Record<string, { residence_manor_id?: string | null; selector_contexts?: string[] | null }>;
};

function readResidenceSelectorSummaryLike(state: unknown): ResidenceSelectorSummaryLike | null {
  if (!state || typeof state !== "object") return null;
  const anyState = state as Record<string, unknown>;
  const summaryCandidate = anyState.residence_selector_summary ?? (anyState.house as Record<string, unknown> | undefined)?.residence_selector_summary;
  if (!summaryCandidate || typeof summaryCandidate !== "object") return null;

  const summary = summaryCandidate as ResidenceSelectorSummaryLike;
  return Array.isArray(summary.person_ids) && summary.entries_by_person_id && typeof summary.entries_by_person_id === "object"
    ? summary
    : null;
}

function collectResidenceManorIds(summary: ResidenceSelectorSummaryLike | null): string[] {
  if (!summary) return [];
  const manorIds = new Set<string>();

  for (const personId of summary.person_ids) {
    const entry = summary.entries_by_person_id[personId];
    const manorId = typeof entry?.residence_manor_id === "string" ? entry.residence_manor_id.trim() : "";
    if (manorId) manorIds.add(manorId);
  }

  return [...manorIds].sort(compareStrings);
}

function collectKinshipResidenceManorIds(summary: ResidenceSelectorSummaryLike | null, anchorManorId: string): string[] {
  if (!summary) return [];
  const manorIds = new Set<string>();

  for (const personId of summary.person_ids) {
    const entry = summary.entries_by_person_id[personId];
    const manorId = typeof entry?.residence_manor_id === "string" ? entry.residence_manor_id.trim() : "";
    if (!manorId || manorId === anchorManorId) continue;

    const contexts = Array.isArray(entry?.selector_contexts) ? entry.selector_contexts : [];
    if (contexts.includes("household")) {
      manorIds.add(manorId);
    }
  }

  return [...manorIds].sort(compareStrings);
}

function readTierLabelFromState(state: unknown): string | null {
  if (!state || typeof state !== "object") return null;
  const anyState = state as Record<string, unknown>;
  const playerHouseId = typeof anyState.player_house_id === "string" ? anyState.player_house_id : null;
  const houses = anyState.houses && typeof anyState.houses === "object" ? (anyState.houses as Record<string, unknown>) : null;
  const playerHouse = playerHouseId && houses ? (houses[playerHouseId] as Record<string, unknown> | undefined) : null;
  return typeof playerHouse?.tier === "string" && playerHouse.tier.trim().length > 0 ? playerHouse.tier.trim() : null;
}

function getTravelDistanceCache(domain: WorldDomainV1): Map<string, Map<string, number>> {
  let cache = travelDistanceCacheByDomain.get(domain);
  if (!cache) {
    cache = new Map<string, Map<string, number>>();
    travelDistanceCacheByDomain.set(domain, cache);
  }
  return cache;
}

function getRouteHopCache(domain: WorldDomainV1): Map<string, Map<string, number>> {
  let cache = routeHopCacheByDomain.get(domain);
  if (!cache) {
    cache = new Map<string, Map<string, number>>();
    routeHopCacheByDomain.set(domain, cache);
  }
  return cache;
}

function computeTravelCostDistancesFrom(domain: WorldDomainV1, originManorId: string): Map<string, number> {
  const distanceCache = getTravelDistanceCache(domain);
  const cached = distanceCache.get(originManorId);
  if (cached) return cached;

  const knownOrigin = domain.manors_by_id.has(originManorId);
  assertWorld(knownOrigin, `distance query origin ${originManorId} is not a known manor`);

  const visited = new Set<string>();
  const bestByManorId = new Map<string, number>();
  bestByManorId.set(originManorId, 0);

  while (true) {
    let currentManorId: string | undefined;
    let currentDistanceMilli = Number.POSITIVE_INFINITY;

    for (const manorId of domain.world_topology.manor_ids) {
      if (visited.has(manorId)) continue;
      const candidateDistanceMilli = bestByManorId.get(manorId);
      if (candidateDistanceMilli === undefined) continue;

      if (
        candidateDistanceMilli < currentDistanceMilli ||
        (candidateDistanceMilli === currentDistanceMilli &&
          currentManorId &&
          compareStrings(manorId, currentManorId) < 0)
      ) {
        currentManorId = manorId;
        currentDistanceMilli = candidateDistanceMilli;
      }
    }

    if (!currentManorId) break;

    visited.add(currentManorId);
    const current = bestByManorId.get(currentManorId);
    if (current === undefined) continue;

    const neighbors = domain.route_adjacency_by_manor_id.get(currentManorId) ?? EMPTY_ROUTE_NEIGHBORS;
    for (const neighbor of neighbors) {
      const candidateDistanceMilli = current + toDistanceMilli(neighbor.travel_cost);
      const existing = bestByManorId.get(neighbor.manor_id);
      if (existing === undefined || candidateDistanceMilli < existing) {
        bestByManorId.set(neighbor.manor_id, candidateDistanceMilli);
      }
    }
  }

  const resolved = new Map<string, number>();
  for (const [manorId, distanceMilli] of bestByManorId.entries()) {
    resolved.set(manorId, fromDistanceMilli(distanceMilli));
  }

  distanceCache.set(originManorId, resolved);
  return resolved;
}

function computeRouteHopDistancesFrom(domain: WorldDomainV1, originManorId: string): Map<string, number> {
  const hopCache = getRouteHopCache(domain);
  const cached = hopCache.get(originManorId);
  if (cached) return cached;

  const knownOrigin = domain.manors_by_id.has(originManorId);
  assertWorld(knownOrigin, `route hop query origin ${originManorId} is not a known manor`);

  const hopsByManorId = new Map<string, number>();
  const queue: string[] = [originManorId];

  hopsByManorId.set(originManorId, 0);

  for (let index = 0; index < queue.length; index += 1) {
    const currentManorId = queue[index];
    if (!currentManorId) continue;

    const currentHops = hopsByManorId.get(currentManorId);
    if (currentHops === undefined) continue;

    const neighbors = domain.route_adjacency_by_manor_id.get(currentManorId) ?? EMPTY_ROUTE_NEIGHBORS;
    for (const neighbor of neighbors) {
      if (hopsByManorId.has(neighbor.manor_id)) continue;
      hopsByManorId.set(neighbor.manor_id, currentHops + 1);
      queue.push(neighbor.manor_id);
    }
  }

  hopCache.set(originManorId, hopsByManorId);
  return hopsByManorId;
}

export function createWorldDomain(surface: XMapImportSurfaceV1): WorldDomainV1 {
  validateImportSurface(surface);
  return buildWorldDomain(surface);
}

export function loadBundledWorldDomain(): WorldDomainV1 {
  bundledWorldDomain ??= createWorldDomain(BUNDLED_IMPORT_SURFACE);
  return bundledWorldDomain;
}

export function getBundledWorldImportSurface(): XMapImportSurfaceV1 {
  return BUNDLED_IMPORT_SURFACE;
}

export function getManorById(domain: WorldDomainV1, manorId: string): XMapManorUnitV1 | null {
  return domain.manors_by_id.get(manorId) ?? null;
}

export function getHoldingById(domain: WorldDomainV1, holdingId: string): XMapHoldingRecordV1 | null {
  return domain.holdings_by_id.get(holdingId) ?? null;
}

export function getManorAssignment(domain: WorldDomainV1, manorId: string): XMapManorAssignmentV1 | null {
  return domain.manor_assignments_by_manor_id.get(manorId) ?? null;
}

export function getManorImmediateLordActorId(domain: WorldDomainV1, manorId: string): string | null {
  return getManorById(domain, manorId)?.immediate_lord_actor_id ?? null;
}

export function getManorSuperiorLordActorId(domain: WorldDomainV1, manorId: string): string | null {
  return getManorById(domain, manorId)?.superior_lord_actor_id ?? null;
}

export function getHoldingImmediateLordActorId(domain: WorldDomainV1, holdingId: string): string | null {
  return getHoldingById(domain, holdingId)?.immediate_lord_actor_id ?? null;
}

export function getHoldingSuperiorLordActorId(domain: WorldDomainV1, holdingId: string): string | null {
  return getHoldingById(domain, holdingId)?.superior_lord_actor_id ?? null;
}

export function getCountyById(domain: WorldDomainV1, countyId: string): XMapCountyOverlayV1 | null {
  return domain.counties_by_id.get(countyId) ?? null;
}

export function getBishopricById(domain: WorldDomainV1, bishopricId: string): XMapBishopricOverlayV1 | null {
  return domain.bishoprics_by_id.get(bishopricId) ?? null;
}

export function getArchbishopricById(domain: WorldDomainV1, archbishopricId: string): XMapArchbishopricOverlayV1 | null {
  return domain.archbishoprics_by_id.get(archbishopricId) ?? null;
}

export function getCountyForManor(domain: WorldDomainV1, manorId: string): XMapCountyOverlayV1 | null {
  const manor = getManorById(domain, manorId);
  return manor ? getCountyById(domain, manor.county_id) : null;
}

export function getBishopricForManor(domain: WorldDomainV1, manorId: string): XMapBishopricOverlayV1 | null {
  const manor = getManorById(domain, manorId);
  return manor?.bishopric_id ? getBishopricById(domain, manor.bishopric_id) : null;
}

export function getArchbishopricForManor(domain: WorldDomainV1, manorId: string): XMapArchbishopricOverlayV1 | null {
  const manor = getManorById(domain, manorId);
  return manor?.archbishopric_id ? getArchbishopricById(domain, manor.archbishopric_id) : null;
}

export function getTerritorialAdjacency(
  domain: WorldDomainV1,
  manorId: string
): readonly XMapTerritorialNeighborV1[] | null {
  return domain.manors_by_id.has(manorId)
    ? (domain.territorial_adjacency_by_manor_id.get(manorId) ?? EMPTY_TERRITORIAL_NEIGHBORS)
    : null;
}

export function getRouteAdjacency(domain: WorldDomainV1, manorId: string): readonly XMapRouteNeighborV1[] | null {
  return domain.manors_by_id.has(manorId) ? (domain.route_adjacency_by_manor_id.get(manorId) ?? EMPTY_ROUTE_NEIGHBORS) : null;
}

export function getNumericDistanceMetrics(
  domain: WorldDomainV1,
  fromManorId: string,
  toManorId: string
): WorldNumericDistanceV1 | null {
  if (!domain.manors_by_id.has(fromManorId) || !domain.manors_by_id.has(toManorId)) {
    return null;
  }
  const travelCostDistance = computeTravelCostDistancesFrom(domain, fromManorId).get(toManorId);
  const routeHopDistance = computeRouteHopDistancesFrom(domain, fromManorId).get(toManorId);
  if (travelCostDistance === undefined || routeHopDistance === undefined) {
    return null;
  }
  return {
    travel_cost_distance: travelCostDistance,
    route_hop_distance: routeHopDistance
  };
}

export function getTravelCostDistance(domain: WorldDomainV1, fromManorId: string, toManorId: string): number | null {
  return getNumericDistanceMetrics(domain, fromManorId, toManorId)?.travel_cost_distance ?? null;
}

export function getRouteHopDistance(domain: WorldDomainV1, fromManorId: string, toManorId: string): number | null {
  return getNumericDistanceMetrics(domain, fromManorId, toManorId)?.route_hop_distance ?? null;
}

export function normalizeWorldScopeCapTierKey(tierLabel: string | null | undefined): WorldScopeCapTierKeyV1 {
  const normalized = normalizedScopeTierLabel(tierLabel);

  if (normalized === "king") return "king";
  if (normalized === "count" || normalized === "earl") return "count";
  if (normalized === "baron") return "baron";
  if (normalized === "knight") return "knight";
  if (normalized === "bishop") return "bishop";
  if (normalized === "abbot") return "abbot";
  return "unknown";
}

export function getWorldScopeCapBucketOrder(): readonly WorldScopeCapBucketV1[] {
  return [...WORLD_SCOPE_CAP_BUCKET_ORDER];
}

export function getWorldScopeCapTable(): WorldScopeCapTableV1 {
  validateScopeCapRows(WORLD_SCOPE_CAP_ROWS);

  worldScopeCapTable ??= {
    schema_version: WORLD_SCOPE_CAP_TABLE_SCHEMA_VERSION,
    canonical_numeric_distance: CANONICAL_NUMERIC_DISTANCE_METRIC,
    bucket_order: [...WORLD_SCOPE_CAP_BUCKET_ORDER],
    rows: WORLD_SCOPE_CAP_ROWS.map((row) => ({
      tier_key: row.tier_key,
      tier_labels: [...row.tier_labels],
      rules: cloneScopeCapRules(row.rules)
    }))
  };

  return {
    schema_version: worldScopeCapTable.schema_version,
    canonical_numeric_distance: worldScopeCapTable.canonical_numeric_distance,
    bucket_order: [...worldScopeCapTable.bucket_order],
    rows: worldScopeCapTable.rows.map((row) => ({
      tier_key: row.tier_key,
      tier_labels: [...row.tier_labels],
      rules: cloneScopeCapRules(row.rules)
    }))
  };
}

export function getWorldScopeCapRowForTier(tierLabel: string | null | undefined): WorldScopeCapRowV1 {
  const tierKey = normalizeWorldScopeCapTierKey(tierLabel);
  const table = getWorldScopeCapTable();
  const row = table.rows.find((entry) => entry.tier_key === tierKey);
  assertWorld(row, `scope cap row missing for tier ${tierKey}`);
  return {
    tier_key: row.tier_key,
    tier_labels: [...row.tier_labels],
    rules: cloneScopeCapRules(row.rules)
  };
}

export function getWorldScopeCapLimit(
  tierLabel: string | null | undefined,
  bucket: WorldScopeCapBucketV1
): number {
  return bucketLimitFromRules(getWorldScopeCapRowForTier(tierLabel).rules, normalizeScopeCapBucket(bucket));
}

export function evaluateWorldScopeCaps(
  tierLabel: string | null | undefined,
  candidates: Iterable<WorldScopeCapCandidateV1>
): WorldScopeCapEvaluationV1 {
  const row = getWorldScopeCapRowForTier(tierLabel);
  const deduped = new Map<string, WorldScopeCapCandidateV1>();

  for (const candidate of candidates) {
    const stableId = typeof candidate?.stable_id === "string" ? candidate.stable_id.trim() : "";
    if (!stableId) continue;
    const bucket = normalizeScopeCapBucket(candidate.bucket);
    const existing = deduped.get(stableId);
    if (!existing || compareScopeBucket(bucket, existing.bucket) < 0) {
      deduped.set(stableId, { stable_id: stableId, bucket });
    }
  }

  const normalizedCandidates = [...deduped.values()].sort((left, right) => {
    const bucketDelta = compareScopeBucket(left.bucket, right.bucket);
    if (bucketDelta !== 0) return bucketDelta;
    return compareStrings(left.stable_id, right.stable_id);
  });

  const admittedIds: string[] = [];
  const rejectedIds: string[] = [];
  const decisions: WorldScopeCapDecisionV1[] = [];

  for (const candidate of normalizedCandidates) {
    const bucketRank = WORLD_SCOPE_CAP_BUCKET_ORDER.indexOf(candidate.bucket);
    const bucketLimit = bucketLimitFromRules(row.rules, candidate.bucket);
    const admitted = admittedIds.length < bucketLimit;

    if (admitted) admittedIds.push(candidate.stable_id);
    else rejectedIds.push(candidate.stable_id);

    decisions.push({
      stable_id: candidate.stable_id,
      bucket: candidate.bucket,
      bucket_rank: bucketRank,
      bucket_limit: bucketLimit,
      admitted,
      admitted_total: admittedIds.length
    });
  }

  return {
    schema_version: WORLD_SCOPE_CAP_TABLE_SCHEMA_VERSION,
    source_tier: row.tier_key,
    bucket_order: [...WORLD_SCOPE_CAP_BUCKET_ORDER],
    rules: cloneScopeCapRules(row.rules),
    admitted_ids: admittedIds,
    rejected_ids: rejectedIds,
    decisions
  };
}

export function getFarThresholdDefault(domain: WorldDomainV1): number | null {
  return normalizeFarThreshold(domain.world_topology.distance_metrics.far_threshold_default, "world far_threshold_default");
}

export function getFarThreshold(domain: WorldDomainV1, options?: WorldDistanceBandOptionsV1): number | null {
  if (options?.far_threshold !== undefined) {
    return normalizeFarThreshold(options.far_threshold, "world far_threshold override");
  }
  return getFarThresholdDefault(domain);
}

export function classifyTravelDistance(
  domain: WorldDomainV1,
  fromManorId: string,
  toManorId: string,
  options?: WorldDistanceBandOptionsV1
): WorldDistanceBandV1 | null {
  const travelCostDistance = getTravelCostDistance(domain, fromManorId, toManorId);
  if (travelCostDistance === null) {
    return null;
  }

  const farThreshold = getFarThreshold(domain, options);
  if (farThreshold === null) {
    return null;
  }

  return travelCostDistance >= farThreshold ? "far" : "near";
}

export function classifyWorldScopeBucket(
  domain: WorldDomainV1,
  anchorManorId: string,
  candidateManorId: string,
  options?: WorldScopeCandidateOptionsV1
): WorldScopeCapBucketV1 | null {
  if (!domain.manors_by_id.has(anchorManorId) || !domain.manors_by_id.has(candidateManorId) || anchorManorId === candidateManorId) {
    return null;
  }

  const kinshipManorIds = new Set(normalizeManorIdList(options?.kinship_manor_ids));
  if (kinshipManorIds.has(candidateManorId)) {
    return "kinship";
  }

  if (hasNeighborManorId(getTerritorialAdjacency(domain, anchorManorId), candidateManorId)) {
    return "territorial_adjacent";
  }

  if (hasNeighborManorId(getRouteAdjacency(domain, anchorManorId), candidateManorId)) {
    return "route_adjacent";
  }

  return classifyTravelDistance(domain, anchorManorId, candidateManorId, options);
}

export function listWorldScopeCandidatesForAnchor(
  domain: WorldDomainV1,
  anchorManorId: string,
  options?: WorldScopeCandidateOptionsV1
): WorldScopedManorCandidateV1[] {
  if (!domain.manors_by_id.has(anchorManorId)) {
    return [];
  }

  const candidates: WorldScopedManorCandidateV1[] = [];
  const candidateManorIds = resolveScopeCandidateManorIds(domain, anchorManorId, options);

  for (const manorId of candidateManorIds) {
    const metrics = getNumericDistanceMetrics(domain, anchorManorId, manorId);
    if (!metrics) continue;

    const territorialAdjacent = hasNeighborManorId(getTerritorialAdjacency(domain, anchorManorId), manorId);
    const routeAdjacent = hasNeighborManorId(getRouteAdjacency(domain, anchorManorId), manorId);
    const distanceBand = classifyTravelDistance(domain, anchorManorId, manorId, options);
    const bucket = classifyWorldScopeBucket(domain, anchorManorId, manorId, options);
    if (!bucket) continue;

    candidates.push({
      manor_id: manorId,
      stable_id: manorId,
      bucket,
      travel_cost_distance: metrics.travel_cost_distance,
      route_hop_distance: metrics.route_hop_distance,
      distance_band: distanceBand,
      territorial_adjacent: territorialAdjacent,
      route_adjacent: routeAdjacent
    });
  }

  candidates.sort((left, right) => {
    const bucketDelta = compareScopeBucket(left.bucket, right.bucket);
    if (bucketDelta !== 0) return bucketDelta;
    return compareStrings(left.manor_id, right.manor_id);
  });

  return candidates;
}

export function evaluateWorldScopeCapsForAnchor(
  domain: WorldDomainV1,
  anchorManorId: string,
  tierLabel: string | null | undefined,
  options?: WorldScopeCandidateOptionsV1
): WorldScopedManorEvaluationV1 {
  const candidates = listWorldScopeCandidatesForAnchor(domain, anchorManorId, options);
  return {
    anchor_manor_id: anchorManorId,
    far_threshold: getFarThreshold(domain, options),
    candidates,
    cap_evaluation: evaluateWorldScopeCaps(tierLabel, candidates)
  };
}

function buildMapCheckpointTarget(manor: XMapManorUnitV1, isAnchorManor: boolean): MapViewCheckpointTargetV1 {
  return {
    county_id: manor.county_id,
    holding_id: manor.holding_id,
    manor_id: manor.manor_id,
    manor_label: isAnchorManor ? "Current manor" : hexLabelFromId(manor.seat_hex_id)
  };
}

function buildMapViewRow(domain: WorldDomainV1, anchorManorId: string, manor: XMapManorUnitV1): MapViewRowV1 {
  const holding = getHoldingById(domain, manor.holding_id);
  const county = getCountyForManor(domain, manor.manor_id);
  assertWorld(holding, `holding ${manor.holding_id} missing for map row ${manor.manor_id}`);
  assertWorld(county, `county ${manor.county_id} missing for map row ${manor.manor_id}`);

  const isAnchorManor = manor.manor_id === anchorManorId;
  const seatHex = getMapHexById(domain, manor.seat_hex_id);
  const manorHexRows = manor.hex_ids.map((hexId) => getMapHexById(domain, hexId));

  return {
    manor_id: manor.manor_id,
    manor_label: hexLabelFromId(manor.seat_hex_id),
    is_anchor_manor: isAnchorManor,
    seat_hex_id: manor.seat_hex_id,
    seat_q: seatHex.q,
    seat_r: seatHex.r,
    owner_actor_id: manor.holder_actor_id,
    owner_label: ownerLabelForRecord({
      countyLabel: county.name,
      holderActorId: manor.holder_actor_id,
      holderActorType: manor.holder_actor_type,
      seatHexId: holdingSeatHexId(holding)
    }),
    holding_id: manor.holding_id,
    holding_label: holdingLabelForRecord(holding),
    county_id: county.county_id,
    county_label: county.name,
    map_checkpoint_target: buildMapCheckpointTarget(manor, isAnchorManor),
    road_exposure: buildRoadExposure(manorHexRows),
    river_exposure: buildRiverExposure(manorHexRows)
  };
}

function compactMapViewRow(row: MapViewRowV1): MapViewSnapshotRowV1 {
  return {
    manor_id: row.manor_id,
    manor_label: row.manor_label,
    is_anchor_manor: row.is_anchor_manor,
    seat_hex_id: row.seat_hex_id,
    seat_q: row.seat_q,
    seat_r: row.seat_r,
    owner_actor_id: row.owner_actor_id,
    holding_id: row.holding_id,
    county_id: row.county_id
  };
}

export function getMapViewSelectorRow(
  manorId: string,
  domain: WorldDomainV1 = loadBundledWorldDomain()
): MapViewRowV1 {
  const anchorManorId = getDefaultAnchorManorId(domain);
  const manor = getManorById(domain, manorId);
  assertWorld(manor, `manor ${manorId} missing from world domain`);
  return buildMapViewRow(domain, anchorManorId, manor);
}

export function buildBoundedMapViewSnapshot(domain: WorldDomainV1 = loadBundledWorldDomain()): MapViewSnapshotV1 {
  const anchorManorId = getDefaultAnchorManorId(domain);
  const anchorManor = getManorById(domain, anchorManorId);
  assertWorld(anchorManor, `anchor manor ${anchorManorId} missing from world domain`);

  const rows = domain.manors
    .map((manor) => compactMapViewRow(buildMapViewRow(domain, anchorManorId, manor)))
    .sort((left, right) => {
      if (left.is_anchor_manor !== right.is_anchor_manor) {
        return left.is_anchor_manor ? -1 : 1;
      }
      return compareStrings(left.manor_id, right.manor_id);
    });

  return {
    schema_version: MAP_VIEW_SNAPSHOT_SCHEMA_VERSION,
    anchor_manor_id: anchorManorId,
    anchor_holding_id: anchorManor.holding_id,
    anchor_county_id: anchorManor.county_id,
    row_ordering: MAP_VIEW_ROW_ORDERING,
    rows
  };
}

export function buildManorDetailView(
  manorId?: string,
  domain: WorldDomainV1 = loadBundledWorldDomain()
): ManorDetailViewV1 {
  const resolvedManorId = manorId ?? getDefaultAnchorManorId(domain);
  const manor = getManorById(domain, resolvedManorId);
  assertWorld(manor, `manor ${resolvedManorId} missing from world domain`);

  const holding = getHoldingById(domain, manor.holding_id);
  const county = getCountyForManor(domain, resolvedManorId);
  assertWorld(holding, `holding ${manor.holding_id} missing for manor detail ${resolvedManorId}`);
  assertWorld(county, `county ${manor.county_id} missing for manor detail ${resolvedManorId}`);

  const seatHex = getMapHexById(domain, manor.seat_hex_id);
  const hexRows = [...manor.hex_ids]
    .sort(compareHexIds)
    .map<ManorDetailHexRowV1>((hexId) => {
      const hex = getMapHexById(domain, hexId);
      return {
        hex_id: hex.hex_id,
        q: hex.q,
        r: hex.r,
        terrain: hex.terrain,
        tile_kind: hex.tile_kind,
        elevation: hex.elevation,
        river_tags: [...hex.river_tags],
        road_route_tiers: [...hex.road_route_tiers],
        base_arable_capacity: hex.base_arable_capacity,
        base_pasture_capacity: hex.base_pasture_capacity,
        net_productive_capacity: hex.net_productive_capacity,
        water_access_score: hex.water_access_score,
        buildability_score: hex.buildability_score
      };
    });

  const totalBaseArableCapacity = roundToFour(
    hexRows.reduce((total, row) => total + (row.base_arable_capacity ?? 0), 0)
  );
  const totalBasePastureCapacity = roundToFour(
    hexRows.reduce((total, row) => total + (row.base_pasture_capacity ?? 0), 0)
  );
  const averageBaseArableCapacity = roundToFour(totalBaseArableCapacity / Math.max(1, hexRows.length));
  const averageNetProductiveCapacity = roundToFour(
    hexRows.reduce((total, row) => total + (row.net_productive_capacity ?? 0), 0) / Math.max(1, hexRows.length)
  );

  const arabilitySummary: ManorDetailArabilitySummaryV1 = {
    arable_hex_count: hexRows.filter((row) => (row.base_arable_capacity ?? 0) > 0).length,
    total_base_arable_capacity: totalBaseArableCapacity,
    average_base_arable_capacity: averageBaseArableCapacity,
    total_base_pasture_capacity: totalBasePastureCapacity,
    average_net_productive_capacity: averageNetProductiveCapacity
  };

  const terrainMix = [...hexRows.reduce<Map<string, number>>((counts, row) => {
    counts.set(row.terrain, (counts.get(row.terrain) ?? 0) + 1);
    return counts;
  }, new Map<string, number>()).entries()]
    .map<ManorDetailTerrainMixRowV1>(([terrain, hexCount]) => ({
      terrain,
      hex_count: hexCount,
      share_of_hexes: roundToFour(hexCount / Math.max(1, hexRows.length))
    }))
    .sort(compareTerrainMix);

  const nearestManors = domain.world_topology.manor_ids
    .filter((candidateManorId) => candidateManorId !== resolvedManorId)
    .map<ManorDetailNearestManorRowV1 | null>((candidateManorId) => {
      const metrics = getNumericDistanceMetrics(domain, resolvedManorId, candidateManorId);
      const candidateManor = getManorById(domain, candidateManorId);
      if (!metrics || !candidateManor) return null;

      const candidateHolding = getHoldingById(domain, candidateManor.holding_id);
      const candidateCounty = getCountyForManor(domain, candidateManorId);
      if (!candidateHolding || !candidateCounty) return null;

      return {
        manor_id: candidateManorId,
        manor_label: hexLabelFromId(candidateManor.seat_hex_id),
        holding_label: holdingLabelForRecord(candidateHolding),
        county_label: candidateCounty.name,
        travel_cost_distance: metrics.travel_cost_distance,
        route_hop_distance: metrics.route_hop_distance,
        distance_band: classifyTravelDistance(domain, resolvedManorId, candidateManorId)
      };
    })
    .filter((row): row is ManorDetailNearestManorRowV1 => row !== null)
    .sort(compareNearestManors)
    .slice(0, MANOR_DETAIL_NEAREST_MANOR_LIMIT);

  return {
    schema_version: MANOR_DETAIL_VIEW_SCHEMA_VERSION,
    manor_id: resolvedManorId,
    manor_label: hexLabelFromId(manor.seat_hex_id),
    seat_hex_id: manor.seat_hex_id,
    seat_q: seatHex.q,
    seat_r: seatHex.r,
    owner_actor_id: manor.holder_actor_id,
    owner_label: ownerLabelForRecord({
      countyLabel: county.name,
      holderActorId: manor.holder_actor_id,
      holderActorType: manor.holder_actor_type,
      seatHexId: holdingSeatHexId(holding)
    }),
    holding_id: manor.holding_id,
    holding_label: holdingLabelForRecord(holding),
    county_id: county.county_id,
    county_label: county.name,
    hex_count: hexRows.length,
    nearest_manor_limit: MANOR_DETAIL_NEAREST_MANOR_LIMIT,
    arability_summary: arabilitySummary,
    terrain_mix: terrainMix,
    nearest_manors: nearestManors,
    hex_rows: hexRows
  };
}

export function resolveActionScope(
  manorId: string,
  actionType: WorldActionScopeActionV1,
  options?: {
    domain?: WorldDomainV1;
    far_threshold?: number | null;
    state?: unknown;
    tier_label?: string | null;
  }
): WorldActionScopeResolutionV1 {
  const domain = options?.domain ?? loadBundledWorldDomain();
  const residenceSummary = readResidenceSelectorSummaryLike(options?.state);
  const residenceManorIds = collectResidenceManorIds(residenceSummary);
  const kinshipManorIds = collectKinshipResidenceManorIds(residenceSummary, manorId);
  const tierLabel = options?.tier_label ?? readTierLabelFromState(options?.state);

  if (actionType !== "marriage_scout" || !domain.manors_by_id.has(manorId)) {
    return {
      schema_version: ACTION_SCOPE_RESOLUTION_SCHEMA_VERSION,
      action_type: actionType,
      anchor_manor_id: manorId,
      scope_mode: "anchor_only",
      tier_label: tierLabel,
      far_threshold: null,
      residence_manor_ids: residenceManorIds,
      kinship_manor_ids: kinshipManorIds,
      admitted_manor_ids: domain.manors_by_id.has(manorId) ? [manorId] : [],
      rejected_manor_ids: [],
      candidates: [],
      cap_evaluation: null
    };
  }

  const evaluation = evaluateWorldScopeCapsForAnchor(domain, manorId, tierLabel, {
    far_threshold: options?.far_threshold,
    kinship_manor_ids: kinshipManorIds
  });

  return {
    schema_version: ACTION_SCOPE_RESOLUTION_SCHEMA_VERSION,
    action_type: actionType,
    anchor_manor_id: manorId,
    scope_mode: "topology_cap",
    tier_label: tierLabel,
    far_threshold: evaluation.far_threshold,
    residence_manor_ids: residenceManorIds,
    kinship_manor_ids: kinshipManorIds,
    admitted_manor_ids: [...evaluation.cap_evaluation.admitted_ids],
    rejected_manor_ids: [...evaluation.cap_evaluation.rejected_ids],
    candidates: evaluation.candidates.map((candidate) => ({ ...candidate })),
    cap_evaluation: {
      ...evaluation.cap_evaluation,
      bucket_order: [...evaluation.cap_evaluation.bucket_order],
      rules: cloneScopeCapRules(evaluation.cap_evaluation.rules),
      admitted_ids: [...evaluation.cap_evaluation.admitted_ids],
      rejected_ids: [...evaluation.cap_evaluation.rejected_ids],
      decisions: evaluation.cap_evaluation.decisions.map((decision) => ({ ...decision }))
    }
  };
}

export function buildBoundedWorldTopologyView(domain: WorldDomainV1 = loadBundledWorldDomain()): WorldTopologySnapshotV1 {
  const anchorRow = domain.world_topology.distance_preview_rows[0];
  assertWorld(anchorRow, "distance preview rows missing anchor manor");

  const anchorManor = getManorById(domain, anchorRow.manor_id);
  assertWorld(anchorManor, `anchor manor ${anchorRow.manor_id} missing from world domain`);

  const distanceSamples = anchorRow.distances
    .map<WorldTopologySnapshotDistanceSampleV1>((entry) => ({
      to_manor_id: entry.to_manor_id,
      travel_cost_distance: entry.travel_cost_distance,
      route_hop_distance: entry.route_hop_distance,
      distance_band: classifyTravelDistance(domain, anchorRow.manor_id, entry.to_manor_id)
    }))
    .sort(compareDistanceSamples)
    .slice(0, WORLD_TOPOLOGY_DISTANCE_SAMPLE_LIMIT);

  return {
    schema_version: WORLD_TOPOLOGY_SNAPSHOT_SCHEMA_VERSION,
    anchor_manor_id: anchorRow.manor_id,
    anchor_holding_id: anchorManor.holding_id,
    anchor_county_id: anchorManor.county_id,
    canonical_numeric_distance: domain.world_topology.distance_metrics.canonical_numeric_distance,
    companion_metric: domain.world_topology.distance_metrics.companion_metric,
    far_threshold: getFarThresholdDefault(domain),
    distance_sample_limit: WORLD_TOPOLOGY_DISTANCE_SAMPLE_LIMIT,
    distance_sample_total: anchorRow.distances.length,
    territorial_neighbors: [...(getTerritorialAdjacency(domain, anchorRow.manor_id) ?? EMPTY_TERRITORIAL_NEIGHBORS)],
    route_neighbors: [...(getRouteAdjacency(domain, anchorRow.manor_id) ?? EMPTY_ROUTE_NEIGHBORS)],
    distance_samples: distanceSamples
  };
}

export function getRouteEdgeById(domain: WorldDomainV1, edgeId: string): XMapWeightedRouteEdgeV1 | null {
  return domain.route_edges_by_id.get(edgeId) ?? null;
}

export function getManifest(domain: WorldDomainV1): XMapAlphaManifestV1 {
  return domain.manifest;
}

export function getManorUnitsFile(domain: WorldDomainV1): XMapManorUnitsFileV1 {
  return domain.manor_units;
}

export function getHoldingFabricFile(domain: WorldDomainV1): XMapHoldingFabricFileV1 {
  return domain.holding_fabric;
}

export function getWorldTopologyFile(domain: WorldDomainV1): XMapWorldTopologyFileV1 {
  return domain.world_topology;
}
