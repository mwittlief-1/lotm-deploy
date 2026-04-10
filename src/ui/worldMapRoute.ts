import {
  getCountyById,
  getHoldingById,
  getHoldingFabricFile,
  getManifest,
  getManorById,
  getManorUnitsFile,
  getWorldTopologyFile,
  loadBundledWorldDomain
} from "../sim/domains/world";
import type { PortfolioMapTarget } from "./playScreenPortfolio";

export type AppRouteScreen = "new" | "play" | "log" | "map";

export const EXTERNAL_MAP_RENDERER_SURFACE_SCHEMA_VERSION = "external_map_renderer_surface_v1" as const;
export const EXTERNAL_MAP_RENDERER_HOST_ID = "world-map-renderer-host" as const;

export interface AppRouteStateV1 {
  screen: AppRouteScreen;
  target_manor_id: string | null;
}

export interface ExternalMapRendererSurfaceV1 {
  schema_version: typeof EXTERNAL_MAP_RENDERER_SURFACE_SCHEMA_VERSION;
  map_bundle_id: "xmap_alpha_v1";
  renderer_host_id: typeof EXTERNAL_MAP_RENDERER_HOST_ID;
  manifest_schema_version: string;
  manor_count: number;
  holding_count: number;
  route_edge_count: number;
  anchor_manor_id: string;
  target: {
    manor_id: string | null;
    manor_label: string | null;
    holding_id: string | null;
    holding_label: string | null;
    county_id: string | null;
    county_label: string | null;
  };
  helper_text: string;
}

function normalizeScreen(value: string): AppRouteScreen {
  if (value === "new" || value === "play" || value === "log" || value === "map") {
    return value;
  }
  return "new";
}

function normalizedHashPath(hash: string): string {
  const normalized = hash.trim().replace(/^#/, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function readRoutePath(hash: string): string {
  return normalizedHashPath(hash).split("?")[0] ?? "/";
}

export function readAppRouteState(hash: string): AppRouteStateV1 {
  const normalizedPath = readRoutePath(hash);
  const params = new URLSearchParams(normalizedHashPath(hash).split("?")[1] ?? "");
  const screen = normalizeScreen(normalizedPath.replace(/^\//, ""));
  const targetManorId = params.get("manor_id");

  return {
    screen,
    target_manor_id: targetManorId && targetManorId.length > 0 ? targetManorId : null
  };
}

export function buildAppRouteHash(screen: AppRouteScreen, target: PortfolioMapTarget | null | undefined): string {
  if (screen !== "map") {
    return `#/${screen}`;
  }

  const params = new URLSearchParams();
  if (target?.manorId) {
    params.set("manor_id", target.manorId);
  }

  const query = params.toString();
  return query.length > 0 ? `#/map?${query}` : "#/map";
}

export function buildExternalMapRendererSurface(target: PortfolioMapTarget | null | undefined): ExternalMapRendererSurfaceV1 {
  const domain = loadBundledWorldDomain();
  const manifest = getManifest(domain);
  const manorUnits = getManorUnitsFile(domain);
  const holdingFabric = getHoldingFabricFile(domain);
  const topology = getWorldTopologyFile(domain);
  const targetManorId = target?.manorId ?? null;
  const targetManor = targetManorId ? getManorById(domain, targetManorId) : null;
  const targetHoldingId = target?.holdingId ?? targetManor?.holding_id ?? null;
  const targetHolding = targetHoldingId ? getHoldingById(domain, targetHoldingId) : null;
  const targetCountyId = target?.countyId ?? targetManor?.county_id ?? null;
  const targetCounty = targetCountyId ? getCountyById(domain, targetCountyId) : null;
  const directHoldings = holdingFabric.direct_holdings.length;
  const baronies = holdingFabric.baronies.length;

  return {
    schema_version: EXTERNAL_MAP_RENDERER_SURFACE_SCHEMA_VERSION,
    map_bundle_id: "xmap_alpha_v1",
    renderer_host_id: EXTERNAL_MAP_RENDERER_HOST_ID,
    manifest_schema_version: manifest.schema_version,
    manor_count: manorUnits.manors.length,
    holding_count: directHoldings + baronies,
    route_edge_count: topology.weighted_route_edges.length,
    anchor_manor_id: domain.world_topology.distance_preview_rows[0]?.manor_id ?? "",
    target: {
      manor_id: targetManor?.manor_id ?? targetManorId,
      manor_label: target?.manorLabel ?? targetManor?.manor_id ?? null,
      holding_id: targetHolding?.holding_id ?? targetHoldingId,
      holding_label: targetHolding ? targetHolding.holding_id : targetHoldingId,
      county_id: targetCounty?.county_id ?? targetCountyId,
      county_label: targetCounty?.name ?? targetCountyId
    },
    helper_text:
      "External renderer seam is attached to the frozen xmap_alpha_v1 bundle. Live overlays and manor drill-in land in V03-R5-001-T04."
  };
}
