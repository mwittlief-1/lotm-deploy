import { buildEconomyMaintenanceView, type EconomyMaintenanceManorSummaryV1 } from "../sim/domains/economy/maintenance";
import {
  buildBoundedMapViewSnapshot,
  buildManorDetailView,
  getMapViewSelectorRow,
  getManorSuperiorLordActorId,
  loadBundledWorldDomain,
  type ManorDetailViewV1,
  type MapViewRowV1,
  type MapViewSnapshotV1
} from "../sim/domains/world";
import type { RunState } from "../sim/types";
import type { PortfolioMapTarget } from "./playScreenPortfolio";
import type { ExternalMapRendererSurfaceV1 } from "./worldMapRoute";

export const WORLD_MAP_SCREEN_SURFACE_SCHEMA_VERSION = "world_map_screen_surface_v1" as const;
export const MANOR_VIEW_SURFACE_SCHEMA_VERSION = "manor_view_surface_v1" as const;

type MapSnapshotRow = MapViewSnapshotV1["rows"][number];

export type WorldMapMarkerSurface = {
  countyLabel: string;
  holdingLabel: string;
  isAnchorManor: boolean;
  isLiegeSeat: boolean;
  isPlayerHolding: boolean;
  isSelected: boolean;
  leftPct: number;
  manorId: string;
  manorLabel: string;
  ownerLabel: string;
  riverExposureLabel: string;
  roadExposureLabel: string;
  seatHexId: string;
  topPct: number;
  target: PortfolioMapTarget;
};

export type WorldMapDebugRowSurface = {
  countyLabel: string;
  flags: string[];
  holdingLabel: string;
  manorId: string;
  manorLabel: string;
  ownerLabel: string;
  riverExposure: string;
  roadExposure: string;
  seatHexId: string;
  seatQ: number;
  seatR: number;
};

export type WorldMapScreenSurface = {
  anchorManorId: string;
  bundleId: string;
  debugRows: WorldMapDebugRowSurface[];
  helperText: string;
  liegeSeatLabel: string | null;
  liegeSeatManorId: string | null;
  markerCount: number;
  markers: WorldMapMarkerSurface[];
  playerHoldingManorIds: string[];
  schemaVersion: typeof WORLD_MAP_SCREEN_SURFACE_SCHEMA_VERSION;
  selectedManorId: string;
  selectedManorLabel: string;
};

export type ManorViewNearestManorSurface = ManorDetailViewV1["nearest_manors"][number] & {
  target: PortfolioMapTarget | null;
};

export type ManorViewSurface = {
  detail: ManorDetailViewV1;
  helperText: string;
  isAnchorManor: boolean;
  maintenanceSummary: EconomyMaintenanceManorSummaryV1 | null;
  maintenanceSummaryNote: string;
  nearestManors: ManorViewNearestManorSurface[];
  schemaVersion: typeof MANOR_VIEW_SURFACE_SCHEMA_VERSION;
};

type EnrichedMapRow = {
  countyLabel: string;
  holdingLabel: string;
  mapTarget: PortfolioMapTarget;
  ownerLabel: string;
  riverExposureLabel: string;
  roadExposureLabel: string;
  row: MapSnapshotRow;
  selectorRow: MapViewRowV1 | null;
};

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function axialToPixel(q: number, r: number): { x: number; y: number } {
  return {
    x: Math.sqrt(3) * (q + r / 2),
    y: 1.5 * r
  };
}

function normalizePercent(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return 50;
  }
  return 6 + ((value - min) / (max - min)) * 88;
}

function roadExposureLabel(selectorRow: MapViewRowV1 | null, row: MapSnapshotRow): string {
  if (!selectorRow) return `Road exposure unavailable for ${row.manor_id}.`;
  if (selectorRow.road_exposure.state === "none") return "No mapped road exposure.";
  return `Roads: ${selectorRow.road_exposure.route_tiers.join(", ")} (${selectorRow.road_exposure.hex_count} hexes).`;
}

function riverExposureLabel(selectorRow: MapViewRowV1 | null, row: MapSnapshotRow): string {
  if (!selectorRow) return `River exposure unavailable for ${row.manor_id}.`;
  if (selectorRow.river_exposure.state === "none") return "No mapped river exposure.";
  return `Rivers: ${selectorRow.river_exposure.river_tags.join(", ")} (${selectorRow.river_exposure.hex_count} hexes).`;
}

function targetFromSelectorRow(selectorRow: MapViewRowV1): PortfolioMapTarget {
  return {
    countyId: selectorRow.map_checkpoint_target.county_id,
    holdingId: selectorRow.map_checkpoint_target.holding_id,
    manorId: selectorRow.map_checkpoint_target.manor_id,
    manorLabel: selectorRow.map_checkpoint_target.manor_label
  };
}

function targetFromSnapshotRow(row: MapSnapshotRow): PortfolioMapTarget {
  return {
    countyId: row.county_id,
    holdingId: row.holding_id,
    manorId: row.manor_id,
    manorLabel: row.manor_label
  };
}

function tryGetSelectorRow(manorId: string): MapViewRowV1 | null {
  try {
    return getMapViewSelectorRow(manorId);
  } catch {
    return null;
  }
}

function readSnapshotFromPreviewState(previewState: RunState | null | undefined): MapViewSnapshotV1 | null {
  const candidate = (previewState as any)?.map_view_snapshot;
  if (!candidate || typeof candidate !== "object") return null;
  if (candidate.schema_version !== "map_view_snapshot_v1" || !Array.isArray(candidate.rows)) return null;
  return candidate as MapViewSnapshotV1;
}

function buildEnrichedRows(snapshot: MapViewSnapshotV1): EnrichedMapRow[] {
  return snapshot.rows.map((row) => {
    const selectorRow = tryGetSelectorRow(row.manor_id);
    return {
      countyLabel: selectorRow?.county_label ?? row.county_id,
      holdingLabel: selectorRow?.holding_label ?? row.holding_id,
      mapTarget: selectorRow ? targetFromSelectorRow(selectorRow) : targetFromSnapshotRow(row),
      ownerLabel: selectorRow?.owner_label ?? row.owner_actor_id,
      riverExposureLabel: riverExposureLabel(selectorRow, row),
      roadExposureLabel: roadExposureLabel(selectorRow, row),
      row,
      selectorRow
    };
  });
}

function maintenanceSummaryForManor(previewState: RunState | null | undefined, manorId: string): EconomyMaintenanceManorSummaryV1 | null {
  if (!previewState) return null;

  const view = buildEconomyMaintenanceView(previewState);
  const summaries = Object.values(view.manor_summaries_by_key ?? {});

  return summaries.find((summary) => summary?.manor_id === manorId) ?? null;
}

export function buildMapTargetForManorId(manorId: string): PortfolioMapTarget | null {
  const selectorRow = tryGetSelectorRow(manorId);
  return selectorRow ? targetFromSelectorRow(selectorRow) : null;
}

export function buildWorldMapScreenSurface(
  previewState: RunState | null | undefined,
  routeSurface: ExternalMapRendererSurfaceV1
): WorldMapScreenSurface {
  const domain = loadBundledWorldDomain();
  const snapshot = readSnapshotFromPreviewState(previewState) ?? buildBoundedMapViewSnapshot(domain);
  const rows = buildEnrichedRows(snapshot);
  const anchorRow = rows.find((entry) => entry.row.manor_id === snapshot.anchor_manor_id) ?? rows[0];
  const selectedManorIdCandidate = routeSurface.target.manor_id ?? snapshot.anchor_manor_id;
  const selectedRow = rows.find((entry) => entry.row.manor_id === selectedManorIdCandidate) ?? anchorRow;
  const playerOwnerActorId = anchorRow?.row.owner_actor_id ?? null;
  const playerHoldingRows = playerOwnerActorId
    ? rows.filter((entry) => entry.row.owner_actor_id === playerOwnerActorId)
    : [];
  const playerHoldingManorIds = playerHoldingRows.map((entry) => entry.row.manor_id).sort(compareText);
  const liegeOwnerActorId = anchorRow ? getManorSuperiorLordActorId(domain, anchorRow.row.manor_id) : null;
  const liegeSeatRow =
    liegeOwnerActorId == null
      ? null
      : [...rows]
          .filter((entry) => entry.row.owner_actor_id === liegeOwnerActorId)
          .sort((left, right) => compareText(left.row.manor_id, right.row.manor_id))[0] ?? null;

  const projected = rows.map((entry) => {
    const pixel = axialToPixel(entry.row.seat_q, entry.row.seat_r);
    return {
      entry,
      pixel
    };
  });
  const minX = Math.min(...projected.map((item) => item.pixel.x));
  const maxX = Math.max(...projected.map((item) => item.pixel.x));
  const minY = Math.min(...projected.map((item) => item.pixel.y));
  const maxY = Math.max(...projected.map((item) => item.pixel.y));

  const markers = projected.map(({ entry, pixel }) => {
    const isSelected = entry.row.manor_id === selectedRow.row.manor_id;
    const isPlayerHolding = playerHoldingManorIds.includes(entry.row.manor_id);
    const isLiegeSeat = liegeSeatRow?.row.manor_id === entry.row.manor_id;

    return {
      countyLabel: entry.countyLabel,
      holdingLabel: entry.holdingLabel,
      isAnchorManor: entry.row.is_anchor_manor,
      isLiegeSeat,
      isPlayerHolding,
      isSelected,
      leftPct: normalizePercent(pixel.x, minX, maxX),
      manorId: entry.row.manor_id,
      manorLabel: entry.row.manor_label,
      ownerLabel: entry.ownerLabel,
      riverExposureLabel: entry.riverExposureLabel,
      roadExposureLabel: entry.roadExposureLabel,
      seatHexId: entry.row.seat_hex_id,
      topPct: normalizePercent(pixel.y, minY, maxY),
      target: entry.mapTarget
    };
  });

  const debugRows = [...rows]
    .sort((left, right) => compareText(left.row.manor_id, right.row.manor_id))
    .map((entry) => {
      const flags: string[] = [];
      if (entry.row.is_anchor_manor) flags.push("Current manor");
      if (playerHoldingManorIds.includes(entry.row.manor_id)) flags.push("Player holding");
      if (liegeSeatRow?.row.manor_id === entry.row.manor_id) flags.push("Liege seat");
      if (selectedRow.row.manor_id === entry.row.manor_id) flags.push("Selected");

      return {
        countyLabel: entry.countyLabel,
        flags,
        holdingLabel: entry.holdingLabel,
        manorId: entry.row.manor_id,
        manorLabel: entry.row.manor_label,
        ownerLabel: entry.ownerLabel,
        riverExposure: entry.riverExposureLabel,
        roadExposure: entry.roadExposureLabel,
        seatHexId: entry.row.seat_hex_id,
        seatQ: entry.row.seat_q,
        seatR: entry.row.seat_r
      };
    });

  const selectedTargetLabel = routeSurface.target.manor_label ?? selectedRow.row.manor_label;
  const liegeSeatLabel = liegeSeatRow ? `${liegeSeatRow.row.manor_label} (${liegeSeatRow.ownerLabel})` : null;

  return {
    anchorManorId: snapshot.anchor_manor_id,
    bundleId: routeSurface.map_bundle_id,
    debugRows,
    helperText:
      "Frozen xmap data drives this view end-to-end. Click a manor seat to move the read-only Manor View without mutating the gameplay shell.",
    liegeSeatLabel,
    liegeSeatManorId: liegeSeatRow?.row.manor_id ?? null,
    markerCount: markers.length,
    markers,
    playerHoldingManorIds,
    schemaVersion: WORLD_MAP_SCREEN_SURFACE_SCHEMA_VERSION,
    selectedManorId: selectedRow.row.manor_id,
    selectedManorLabel: selectedTargetLabel
  };
}

export function buildManorViewSurface(
  previewState: RunState | null | undefined,
  selectedManorId: string | null | undefined
): ManorViewSurface {
  const domain = loadBundledWorldDomain();
  const snapshot = readSnapshotFromPreviewState(previewState) ?? buildBoundedMapViewSnapshot(domain);
  const resolvedManorId =
    selectedManorId && tryGetSelectorRow(selectedManorId) ? selectedManorId : snapshot.anchor_manor_id;
  const detail = buildManorDetailView(resolvedManorId, domain);
  const maintenanceSummary = maintenanceSummaryForManor(previewState, resolvedManorId);
  const isAnchorManor = detail.manor_id === snapshot.anchor_manor_id;

  return {
    detail,
    helperText: isAnchorManor
      ? "Player tab keeps the current manor's rights and upkeep honest while the debug tab exposes the frozen world rows directly."
      : "World detail is available for every routed manor here. Economy maintenance remains anchored to the current manor chronicle unless a later seam widens it.",
    isAnchorManor,
    maintenanceSummary,
    maintenanceSummaryNote: maintenanceSummary
      ? "Maintenance, building, and rights summaries are sourced from the accepted economy maintenance read model."
      : "Maintenance, building, and rights summaries are only available for the current manor chronicle in this read model.",
    nearestManors: detail.nearest_manors.map((row) => ({
      ...row,
      target: buildMapTargetForManorId(row.manor_id)
    })),
    schemaVersion: MANOR_VIEW_SURFACE_SCHEMA_VERSION
  };
}
