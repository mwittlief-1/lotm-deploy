import holdingFabricJson from "../../../../data/map/xmap_alpha_v1/holding_fabric_v1.json";
import manorUnitsJson from "../../../../data/map/xmap_alpha_v1/manor_units_v1.json";
import manifestJson from "../../../../data/map/xmap_alpha_v1/xmap_alpha_manifest_v1.json";
import worldTopologyJson from "../../../../data/map/xmap_alpha_v1/world_topology_v1.json";

import {
  CANONICAL_NUMERIC_DISTANCE_METRIC,
  HOLDING_FABRIC_LEGAL_RULE_VERSION,
  HOLDING_FABRIC_SCHEMA_VERSION,
  MANOR_UNITS_SCHEMA_VERSION,
  ROUTE_HOP_DISTANCE_METRIC,
  WORLD_DOMAIN_SCHEMA_VERSION,
  WORLD_TOPOLOGY_SCHEMA_VERSION,
  XMAP_ALPHA_MANIFEST_SCHEMA_VERSION,
  type WorldDomainV1,
  type WorldNumericDistanceV1,
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

const EMPTY_TERRITORIAL_NEIGHBORS: readonly XMapTerritorialNeighborV1[] = [];
const EMPTY_ROUTE_NEIGHBORS: readonly XMapRouteNeighborV1[] = [];
const DISTANCE_SCALE = 1000;

let bundledWorldDomain: WorldDomainV1 | undefined;

const travelDistanceCacheByDomain = new WeakMap<WorldDomainV1, Map<string, Map<string, number>>>();
const routeHopCacheByDomain = new WeakMap<WorldDomainV1, Map<string, Map<string, number>>>();

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
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

function validateSchemas(surface: XMapImportSurfaceV1): void {
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
    territorial_adjacency_by_manor_id: buildAdjacencyIndex(surface.world_topology.territorial_adjacency, "territorial adjacency"),
    route_adjacency_by_manor_id: buildAdjacencyIndex(surface.world_topology.route_adjacency, "route adjacency"),
    route_edges_by_id: buildUniqueIndex(surface.world_topology.weighted_route_edges, (row) => row.edge_id, "route edge")
  };
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
