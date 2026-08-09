export type SpatialTerrainLod = "macro" | "mid_hex" | "fine_cell";

export const COURTOS_SPATIAL_LOD_DOCTRINE = Object.freeze({
  macro_cells_per_parent: 1,
  mid_cells_per_parent: 31,
  fine_cells_per_mid_cell: 7,
  fine_cells_per_parent: 217,
} as const);

export interface SpatialElevationCell {
  id: string;
  q: number;
  r: number;
  elevation: number;
}

export interface SpatialFeatureCell {
  id: string;
  q: number;
  r: number;
  neighborIds?: readonly string[];
}

export interface SpatialFeatureSegment {
  fromId: string;
  toId: string;
}

const AXIAL_NEIGHBORS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
] as const;

function finiteElevation(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Produces the display elevation used by the welded terrain mesh. The source
 * elevation is never rewritten: smoothing happens only in this presentation
 * projection and only between true axial neighbors supplied by XMAP.
 *
 * Macro terrain keeps its full recorded relief. County and manor terrain use
 * one conservative Laplacian pass so a single noisy cell cannot become the
 * conspicuous cylindrical "hump" seen in the early CourtOS proof.
 */
export function projectedTerrainElevations(
  cells: readonly SpatialElevationCell[],
  lod: SpatialTerrainLod,
): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  const sourceByCoordinate = new Map(
    cells.map((cell) => [`${cell.q}:${cell.r}`, finiteElevation(cell.elevation)]),
  );
  const neighborWeight = lod === "macro" ? 0 : lod === "mid_hex" ? 0.28 : 0.38;

  for (const cell of cells) {
    const source = finiteElevation(cell.elevation);
    if (!neighborWeight) {
      result.set(cell.id, source);
      continue;
    }
    const neighbors = AXIAL_NEIGHBORS
      .map(([dq, dr]) => sourceByCoordinate.get(`${cell.q + dq}:${cell.r + dr}`))
      .filter((value): value is number => value !== undefined);
    if (!neighbors.length) {
      result.set(cell.id, source);
      continue;
    }
    const neighborMean = neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length;
    const blended = source * (1 - neighborWeight) + neighborMean * neighborWeight;
    // Keep local relief source-faithful. The presentation pass may soften a
    // discontinuity, but it can never move a cell beyond its own and its true
    // neighbors' recorded elevation range.
    const localMin = Math.min(source, ...neighbors);
    const localMax = Math.max(source, ...neighbors);
    result.set(cell.id, Math.max(localMin, Math.min(localMax, blended)));
  }
  return result;
}

export function withProjectedTerrainElevations<T extends SpatialElevationCell>(
  cells: readonly T[],
  lod: SpatialTerrainLod,
): T[] {
  const elevations = projectedTerrainElevations(cells, lod);
  return cells.map((cell) => ({ ...cell, elevation: elevations.get(cell.id) ?? cell.elevation }));
}

export function validLodComposition(midCellCount: number, fineCellCount: number): boolean {
  return midCellCount === COURTOS_SPATIAL_LOD_DOCTRINE.mid_cells_per_parent
    && fineCellCount === COURTOS_SPATIAL_LOD_DOCTRINE.fine_cells_per_parent
    && fineCellCount === midCellCount * COURTOS_SPATIAL_LOD_DOCTRINE.fine_cells_per_mid_cell;
}

/**
 * Returns only source-neighbor or exact axial-neighbor segments. It never
 * closes gaps between disconnected cells that happen to share a feature ID.
 */
export function sourceFeatureSegments(cells: readonly SpatialFeatureCell[]): {
  segments: SpatialFeatureSegment[];
  isolatedCellIds: string[];
} {
  const byId = new Map(cells.map((cell) => [cell.id, cell]));
  const byCoordinate = new Map(cells.map((cell) => [`${cell.q}:${cell.r}`, cell]));
  const seen = new Set<string>();
  const touched = new Set<string>();
  const segments: SpatialFeatureSegment[] = [];

  for (const cell of cells) {
    const explicitNeighbors = (cell.neighborIds ?? [])
      .map((id) => byId.get(id))
      .filter((value): value is SpatialFeatureCell => value !== undefined);
    const neighbors = explicitNeighbors.length
      ? explicitNeighbors
      : AXIAL_NEIGHBORS
        .map(([dq, dr]) => byCoordinate.get(`${cell.q + dq}:${cell.r + dr}`))
        .filter((value): value is SpatialFeatureCell => value !== undefined);
    for (const neighbor of neighbors) {
      const edgeKey = [cell.id, neighbor.id].sort().join("\u0000");
      if (seen.has(edgeKey)) continue;
      seen.add(edgeKey);
      touched.add(cell.id);
      touched.add(neighbor.id);
      segments.push({ fromId: cell.id, toId: neighbor.id });
    }
  }
  return {
    segments,
    isolatedCellIds: cells.filter((cell) => !touched.has(cell.id)).map((cell) => cell.id),
  };
}

export function facilityPresentationOffset(index: number, spacing: number): { x: number; z: number } {
  if (index <= 0) return { x: 0, z: 0 };
  const ringIndex = index - 1;
  const angle = (ringIndex % 6) * Math.PI / 3;
  const ring = 1 + Math.floor(ringIndex / 6);
  return { x: Math.cos(angle) * spacing * ring, z: Math.sin(angle) * spacing * ring };
}
