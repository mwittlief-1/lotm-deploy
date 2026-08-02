import { readFileSync } from "node:fs";
import path from "node:path";

import {
  JOURNEY_LOCATION_ANCHOR_SCHEMA_VERSION,
  buildJourneyFoundationResolver,
  type JourneyBackgroundTrafficEvidenceV1,
  type JourneyFoundationBundleV1,
  type JourneyFoundationResolverV1,
  type JourneyFoundationSourceEvidenceV1,
  type JourneyLocationAnchorV1,
  type JourneyRouteEdgeV1,
  type JourneyStopProviderKindV1,
  type JourneyTravelTimeCalibrationV1,
} from "./journeyFoundationResolver";

export const JOURNEY_FOUNDATION_SOURCE_ADAPTER_SCHEMA_VERSION =
  "phase_five_journey_foundation_source_adapter_v1" as const;

const SOURCE_PATHS = {
  config: "config/journey-foundation-a.v1.json",
  manorUnits: "data/map/xmap_alpha_v1/manor_units_v1.json",
  mapView: "data/map/xmap_alpha_v1/map_view_support_v1.json",
  topology: "data/map/xmap_alpha_v1/world_topology_v1.json",
  corridors: "data/map/xmap_alpha_v1/corridor_graph_v1.json",
  placeNames: "data/naming/place_name_catalog_working_authority_v1/locked_name_catalog_combined_view_v1.csv",
  financialLanes: "data/genrun/t0_trade_route_master_refresh_step6cs_v1/exact_route_trade_demand_rows_step6cs_v1.csv",
} as const;

interface ManorSourceRow {
  manor_id: string;
  seat_hex_id: string;
  hex_ids: string[];
}

interface ManorUnitsSource {
  manors: ManorSourceRow[];
}

interface MapViewSource {
  hexes: Array<{ hex_id: string; manor_id: string | null }>;
}

interface TopologyEdgeSource {
  edge_id: string;
  from_manor_id: string;
  to_manor_id: string;
  path_hex_ids: string[];
  travel_cost: number;
}

interface TopologySource {
  manor_ids: string[];
  weighted_route_edges: TopologyEdgeSource[];
}

interface CorridorEdgeSource {
  edge_id: string;
  path_hex_ids: string[];
  route_tier: "local" | "regional" | "trunk";
}

interface CrossingSource {
  crossing_id: string;
  hex_id: string;
}

interface CorridorSource {
  corridor_edges: CorridorEdgeSource[];
  crossing_nodes: CrossingSource[];
}

interface FoundationConfigSource {
  travel_time_calibration: JourneyTravelTimeCalibrationV1;
}

export interface JourneyFoundationSourceAuditV1 {
  schema_version: typeof JOURNEY_FOUNDATION_SOURCE_ADAPTER_SCHEMA_VERSION;
  source_refs: Readonly<Record<keyof typeof SOURCE_PATHS, string>>;
  place_name_rows: number;
  unique_location_anchors: number;
  duplicate_name_rows_deduplicated: number;
  route_ready_location_anchors: number;
  unresolved_missing_current_map_hex: number;
  unresolved_missing_manor_graph_link: number;
  manor_count: number;
  route_edge_count: number;
  route_graph_component_count: number;
  macro_corridor_edge_count: number;
  route_edges_with_macro_overlay: number;
  crossing_count: number;
  route_edges_with_crossing_evidence: number;
  exact_financial_lane_rows: number;
  exact_financial_lane_rows_with_route_ready_endpoints: number;
  financial_lane_rows_with_unresolved_endpoints: number;
  background_traffic_directed_pair_count: number;
  financial_lanes_create_named_person_presence: false;
  runtime_authority: false;
  source_status: "foundation_a_provisional_readiness";
}

export interface JourneyFoundationLoadedSourceV1 {
  bundle: JourneyFoundationBundleV1;
  audit: JourneyFoundationSourceAuditV1;
}

const XMAP_EVIDENCE: JourneyFoundationSourceEvidenceV1 = {
  source_ref: SOURCE_PATHS.manorUnits,
  source_status: "foundation_a_provisional",
  runtime_authority: false,
};
const TOPOLOGY_EVIDENCE: JourneyFoundationSourceEvidenceV1 = {
  source_ref: SOURCE_PATHS.topology,
  source_status: "foundation_a_provisional",
  runtime_authority: false,
};
const CORRIDOR_EVIDENCE: JourneyFoundationSourceEvidenceV1 = {
  source_ref: SOURCE_PATHS.corridors,
  source_status: "foundation_a_provisional",
  runtime_authority: false,
};
const NAME_EVIDENCE: JourneyFoundationSourceEvidenceV1 = {
  source_ref: SOURCE_PATHS.placeNames,
  source_status: "foundation_a_provisional",
  runtime_authority: false,
};
const MAP_VIEW_EVIDENCE: JourneyFoundationSourceEvidenceV1 = {
  source_ref: SOURCE_PATHS.mapView,
  source_status: "foundation_a_provisional",
  runtime_authority: false,
};
const FINANCIAL_EVIDENCE: JourneyFoundationSourceEvidenceV1 = {
  source_ref: SOURCE_PATHS.financialLanes,
  source_status: "candidate_evidence_only",
  runtime_authority: false,
};

function readJson<T>(root: string, relativePath: string): T {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8")) as T;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (row.length > 0 || value.length > 0) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...body] = rows;
  if (!headers) return [];
  return body.filter((values) => values.some(Boolean)).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

function stableStrings(values: readonly (string | null | undefined)[]): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort();
}

function pairKey(left: string, right: string): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function directedPairKey(left: string, right: string): string {
  return `${left}->${right}`;
}

function stopKinds(row: Record<string, string>): JourneyStopProviderKindV1[] {
  const kinds: JourneyStopProviderKindV1[] = [];
  const entityKind = row.source_entity_kind ?? "";
  const feature = row.feature_or_form ?? "";
  if (entityKind === "manor") kinds.push("controlled_house_manor");
  if (["barony", "county_seat", "elite_seat_complex"].includes(entityKind) ||
      ["baronial_seat_or_castle", "county_seat", "county_castle_or_fortified_town", "royal_castle_or_fortified_town", "royal_county_seat", "royal_seat_complex"].includes(feature)) {
    kinds.push("accepted_house_or_court");
  }
  if (entityKind === "archbishopric" ||
      ["abbey_or_priory", "bishopric_or_cathedral_seat", "archbishopric_or_cathedral_seat", "archbishopric_province"].includes(feature)) {
    kinds.push("accepted_church_or_institution");
  }
  if (["town", "market_town", "market_village", "port_or_landing"].includes(feature)) {
    kinds.push("eligible_aggregate_commercial");
  }
  return stableStrings(kinds) as JourneyStopProviderKindV1[];
}

function graphComponentCount(manorIds: readonly string[], edges: readonly JourneyRouteEdgeV1[]): number {
  const adjacency = new Map<string, string[]>();
  for (const id of manorIds) adjacency.set(id, []);
  for (const edge of edges) {
    adjacency.get(edge.from_manor_id)?.push(edge.to_manor_id);
    adjacency.get(edge.to_manor_id)?.push(edge.from_manor_id);
  }
  const seen = new Set<string>();
  let components = 0;
  for (const id of [...manorIds].sort()) {
    if (seen.has(id)) continue;
    components += 1;
    const queue = [id];
    seen.add(id);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (seen.has(neighbor)) continue;
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return components;
}

export function loadFoundationAJourneySources(root = process.cwd()): JourneyFoundationLoadedSourceV1 {
  const config = readJson<FoundationConfigSource>(root, SOURCE_PATHS.config);
  const manorUnits = readJson<ManorUnitsSource>(root, SOURCE_PATHS.manorUnits);
  const mapView = readJson<MapViewSource>(root, SOURCE_PATHS.mapView);
  const topology = readJson<TopologySource>(root, SOURCE_PATHS.topology);
  const corridors = readJson<CorridorSource>(root, SOURCE_PATHS.corridors);
  const placeRows = parseCsv(readFileSync(path.join(root, SOURCE_PATHS.placeNames), "utf8"));
  const financialRows = parseCsv(readFileSync(path.join(root, SOURCE_PATHS.financialLanes), "utf8"));

  const hexToManor = new Map<string, string>();
  for (const manor of manorUnits.manors) {
    for (const hexId of manor.hex_ids) {
      const existing = hexToManor.get(hexId);
      if (existing && existing !== manor.manor_id) throw new Error(`${hexId} belongs to multiple manors`);
      hexToManor.set(hexId, manor.manor_id);
    }
  }
  const currentMapHexes = new Set(mapView.hexes.map((row) => row.hex_id));
  const routeManorIds = new Set(topology.manor_ids);

  const placeByEntity = new Map<string, Record<string, string>>();
  for (const row of placeRows.sort((left, right) =>
    (left.entity_id ?? "").localeCompare(right.entity_id ?? "") ||
    (left.combined_row_id ?? "").localeCompare(right.combined_row_id ?? ""),
  )) {
    const entityId = row.entity_id?.trim();
    if (!entityId) continue;
    const existing = placeByEntity.get(entityId);
    if (existing) {
      const comparable = ["anchor_hex_id", "locked_public_name", "source_entity_kind", "feature_or_form"];
      if (comparable.some((key) => existing[key] !== row[key])) {
        throw new Error(`conflicting locked place-name rows for ${entityId}`);
      }
      continue;
    }
    placeByEntity.set(entityId, row);
  }

  const anchors: JourneyLocationAnchorV1[] = [...placeByEntity.entries()].map(([entityId, row]) => {
    const hexId = row.anchor_hex_id!.trim();
    const routingManorId = hexToManor.get(hexId) ?? null;
    const anchorStatus = !currentMapHexes.has(hexId)
      ? "unresolved_missing_current_map_hex" as const
      : !routingManorId || !routeManorIds.has(routingManorId)
        ? "unresolved_missing_manor_graph_link" as const
        : "resolved_to_manor_graph" as const;
    return {
      schema_version: JOURNEY_LOCATION_ANCHOR_SCHEMA_VERSION,
      anchor_id: entityId,
      label: row.locked_public_name?.trim() || entityId,
      location_kind: row.source_entity_kind?.trim() || "unknown",
      feature_or_form: row.feature_or_form?.trim() || null,
      county_id: row.county_id?.trim() || null,
      county_name: row.county_name?.trim() || null,
      map_hex_id: hexId,
      routing_manor_id: routingManorId,
      anchor_status: anchorStatus,
      potential_stop_provider_kinds: stopKinds(row),
      source_evidence: [NAME_EVIDENCE, XMAP_EVIDENCE, MAP_VIEW_EVIDENCE],
    };
  }).sort((left, right) => left.anchor_id.localeCompare(right.anchor_id));

  const crossingByHex = new Map(corridors.crossing_nodes.map((row) => [row.hex_id, row.crossing_id]));
  const macroByManorPair = new Map<string, {
    edgeIds: Set<string>;
    tiers: Set<"local" | "regional" | "trunk">;
    crossings: Set<string>;
  }>();
  for (const corridor of corridors.corridor_edges) {
    const manorSequence: string[] = [];
    for (const hexId of corridor.path_hex_ids) {
      const manorId = hexToManor.get(hexId);
      if (manorId && manorSequence[manorSequence.length - 1] !== manorId) manorSequence.push(manorId);
    }
    const crossingIds = stableStrings(corridor.path_hex_ids.map((hexId) => crossingByHex.get(hexId)));
    for (let index = 0; index < manorSequence.length - 1; index += 1) {
      const left = manorSequence[index]!;
      const right = manorSequence[index + 1]!;
      const key = pairKey(left, right);
      const overlay = macroByManorPair.get(key) ?? {
        edgeIds: new Set<string>(),
        tiers: new Set<"local" | "regional" | "trunk">(),
        crossings: new Set<string>(),
      };
      overlay.edgeIds.add(corridor.edge_id);
      overlay.tiers.add(corridor.route_tier);
      for (const crossingId of crossingIds) {
        const crossing = corridors.crossing_nodes.find((row) => row.crossing_id === crossingId);
        const crossingManor = crossing ? hexToManor.get(crossing.hex_id) : null;
        if (crossingManor === left || crossingManor === right) overlay.crossings.add(crossingId);
      }
      macroByManorPair.set(key, overlay);
    }
  }

  const routeEdges: JourneyRouteEdgeV1[] = topology.weighted_route_edges.map((row) => {
    const overlay = macroByManorPair.get(pairKey(row.from_manor_id, row.to_manor_id));
    return {
      edge_id: row.edge_id,
      from_manor_id: row.from_manor_id,
      to_manor_id: row.to_manor_id,
      travel_cost_distance: row.travel_cost,
      path_hex_ids: [...row.path_hex_ids],
      macro_corridor_edge_ids: overlay ? [...overlay.edgeIds].sort() : [],
      macro_route_tiers: overlay ? [...overlay.tiers].sort() : [],
      crossing_ids: overlay ? [...overlay.crossings].sort() : [],
      source_evidence: overlay ? [TOPOLOGY_EVIDENCE, CORRIDOR_EVIDENCE] : [TOPOLOGY_EVIDENCE],
    };
  }).sort((left, right) => left.edge_id.localeCompare(right.edge_id));

  const anchorToManor = new Map(anchors.flatMap((anchor) =>
    anchor.routing_manor_id ? [[anchor.anchor_id, anchor.routing_manor_id] as const] : [],
  ));
  for (const manorId of topology.manor_ids) anchorToManor.set(manorId, manorId);
  const trafficAggregate = new Map<string, {
    from: string;
    to: string;
    count: number;
    load: number;
    modes: Set<string>;
  }>();
  let financialRowsReady = 0;
  for (const row of financialRows) {
    const from = anchorToManor.get(row.supplier_anchor_id ?? "");
    const to = anchorToManor.get(row.receiver_or_buyer_anchor_id ?? "");
    if (!from || !to) continue;
    financialRowsReady += 1;
    if (from === to) continue;
    const key = directedPairKey(from, to);
    const aggregate = trafficAggregate.get(key) ?? { from, to, count: 0, load: 0, modes: new Set<string>() };
    aggregate.count += 1;
    aggregate.load += Number(row.transport_load_score_year || 0);
    if (row.likely_mode?.trim()) aggregate.modes.add(row.likely_mode.trim());
    trafficAggregate.set(key, aggregate);
  }
  const backgroundTraffic: JourneyBackgroundTrafficEvidenceV1[] = [...trafficAggregate.values()].map((row) => ({
    from_manor_id: row.from,
    to_manor_id: row.to,
    exact_financial_lane_count: row.count,
    annualized_transport_load: Number(row.load.toFixed(4)),
    likely_modes: [...row.modes].sort(),
    source_evidence: [FINANCIAL_EVIDENCE],
    proves_named_person_presence: false as const,
  })).sort((left, right) =>
    left.from_manor_id.localeCompare(right.from_manor_id) || left.to_manor_id.localeCompare(right.to_manor_id),
  );

  const bundle: JourneyFoundationBundleV1 = {
    anchors,
    route_edges: routeEdges,
    background_traffic_evidence: backgroundTraffic,
    travel_time_calibration: config.travel_time_calibration,
  };
  const audit: JourneyFoundationSourceAuditV1 = {
    schema_version: JOURNEY_FOUNDATION_SOURCE_ADAPTER_SCHEMA_VERSION,
    source_refs: { ...SOURCE_PATHS },
    place_name_rows: placeRows.length,
    unique_location_anchors: anchors.length,
    duplicate_name_rows_deduplicated: placeRows.length - anchors.length,
    route_ready_location_anchors: anchors.filter((row) => row.anchor_status === "resolved_to_manor_graph").length,
    unresolved_missing_current_map_hex: anchors.filter((row) => row.anchor_status === "unresolved_missing_current_map_hex").length,
    unresolved_missing_manor_graph_link: anchors.filter((row) => row.anchor_status === "unresolved_missing_manor_graph_link").length,
    manor_count: topology.manor_ids.length,
    route_edge_count: routeEdges.length,
    route_graph_component_count: graphComponentCount(topology.manor_ids, routeEdges),
    macro_corridor_edge_count: corridors.corridor_edges.length,
    route_edges_with_macro_overlay: routeEdges.filter((row) => row.macro_corridor_edge_ids.length > 0).length,
    crossing_count: corridors.crossing_nodes.length,
    route_edges_with_crossing_evidence: routeEdges.filter((row) => row.crossing_ids.length > 0).length,
    exact_financial_lane_rows: financialRows.length,
    exact_financial_lane_rows_with_route_ready_endpoints: financialRowsReady,
    financial_lane_rows_with_unresolved_endpoints: financialRows.length - financialRowsReady,
    background_traffic_directed_pair_count: backgroundTraffic.length,
    financial_lanes_create_named_person_presence: false,
    runtime_authority: false,
    source_status: "foundation_a_provisional_readiness",
  };
  return { bundle, audit };
}

export function buildFoundationAJourneyResolver(root = process.cwd()): Readonly<{
  resolver: JourneyFoundationResolverV1;
  audit: JourneyFoundationSourceAuditV1;
}> {
  const loaded = loadFoundationAJourneySources(root);
  return {
    resolver: buildJourneyFoundationResolver(loaded.bundle),
    audit: loaded.audit,
  };
}
