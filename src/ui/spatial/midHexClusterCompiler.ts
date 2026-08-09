/**
 * The estate-level middle LOD is a renderer derivation, never an operational
 * parcel record.  A canonical XMAP hex has 217 fine estate cells.  This
 * compiler partitions that fixed lattice into 31 contiguous groups of seven
 * cells, solely to give the renderer a stable intermediate zoom layer.
 */

export const FINE_ESTATE_CELLS_PER_XMAP_HEX = 217;
export const FINE_ESTATE_CELLS_PER_MID_HEX = 7;
export const MID_HEXES_PER_XMAP_HEX = 31;

export type FineEstateCellForMidHex = {
  cell_id: string;
  q: number;
  r: number;
  neighbor_ids: readonly string[];
};

export type MidHexCluster = {
  /** Stable within a parent XMAP hex and a fixed input lattice. */
  cluster_id: string;
  parent_xmap_hex_id: string;
  /** The canonically first fine cell; useful for deterministic renderer keys. */
  anchor_cell_id: string;
  /** Canonically ordered member IDs. This is an interpretive visual grouping. */
  cell_ids: string[];
  /** Arithmetic centre for renderer placement only, not an authored map point. */
  visual_center: { q: number; r: number };
};

export type MidHexClusterCompilation = {
  schema_version: "courtos_mid_hex_cluster_compilation_v1";
  parent_xmap_hex_id: string;
  source_cell_count: typeof FINE_ESTATE_CELLS_PER_XMAP_HEX;
  cluster_count: typeof MID_HEXES_PER_XMAP_HEX;
  cells_per_cluster: typeof FINE_ESTATE_CELLS_PER_MID_HEX;
  clusters: MidHexCluster[];
};

export class MidHexClusterCompilationError extends Error {
  override name = "MidHexClusterCompilationError";
}

type Adjacency = ReadonlyMap<string, readonly string[]>;

function fail(message: string): never {
  throw new MidHexClusterCompilationError(message);
}

function compareCells(
  cellById: ReadonlyMap<string, FineEstateCellForMidHex>,
  leftId: string,
  rightId: string,
): number {
  const left = cellById.get(leftId);
  const right = cellById.get(rightId);
  if (!left || !right) fail("Cannot order a fine estate cell missing from the compilation input.");
  return left.q - right.q || left.r - right.r || left.cell_id.localeCompare(right.cell_id);
}

function sortedCellIds(
  ids: Iterable<string>,
  cellById: ReadonlyMap<string, FineEstateCellForMidHex>,
): string[] {
  return [...ids].sort((left, right) => compareCells(cellById, left, right));
}

function connectedComponents(
  available: ReadonlySet<string>,
  adjacency: Adjacency,
  cellById: ReadonlyMap<string, FineEstateCellForMidHex>,
): Array<Set<string>> {
  const unvisited = new Set(available);
  const components: Array<Set<string>> = [];
  while (unvisited.size > 0) {
    const seed = sortedCellIds(unvisited, cellById)[0];
    if (!seed) fail("Cannot find a deterministic component seed.");
    const component = new Set<string>([seed]);
    const queue = [seed];
    unvisited.delete(seed);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (!current) continue;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!unvisited.delete(neighbor)) continue;
        component.add(neighbor);
        queue.push(neighbor);
      }
    }
    components.push(component);
  }
  return components;
}

function isConnected(
  ids: ReadonlySet<string>,
  adjacency: Adjacency,
  cellById: ReadonlyMap<string, FineEstateCellForMidHex>,
): boolean {
  return connectedComponents(ids, adjacency, cellById).length === 1;
}

/**
 * Builds the compact, deterministic seven-cell group around a canonical seed.
 * At each step, prefer the frontier cell with the most already-selected
 * neighbors; axial order resolves ties.  The post-removal component check in
 * the caller makes this fail closed if a supplied lattice cannot sustain the
 * documented 31 x 7 partition.
 */
function compactSevenCellGroup(
  seed: string,
  available: ReadonlySet<string>,
  adjacency: Adjacency,
  cellById: ReadonlyMap<string, FineEstateCellForMidHex>,
): Set<string> {
  const selected = new Set<string>([seed]);
  const frontier = new Set(
    (adjacency.get(seed) ?? []).filter((neighbor) => available.has(neighbor)),
  );
  while (selected.size < FINE_ESTATE_CELLS_PER_MID_HEX) {
    const candidates = sortedCellIds(frontier, cellById).sort((left, right) => {
      const score = (id: string) =>
        (adjacency.get(id) ?? []).filter((neighbor) => selected.has(neighbor)).length;
      return score(right) - score(left) || compareCells(cellById, left, right);
    });
    const candidate = candidates[0];
    if (!candidate) fail("A required seven-cell mid hex could not be grown from its canonical seed.");
    selected.add(candidate);
    frontier.delete(candidate);
    for (const neighbor of adjacency.get(candidate) ?? []) {
      if (available.has(neighbor) && !selected.has(neighbor)) frontier.add(neighbor);
    }
  }
  return selected;
}

function buildAdjacency(cells: readonly FineEstateCellForMidHex[]): {
  cellById: Map<string, FineEstateCellForMidHex>;
  adjacency: Map<string, readonly string[]>;
} {
  const cellById = new Map<string, FineEstateCellForMidHex>();
  for (const cell of cells) {
    if (!cell || typeof cell.cell_id !== "string" || !cell.cell_id) fail("Every fine estate cell needs a non-empty cell_id.");
    if (!Number.isFinite(cell.q) || !Number.isFinite(cell.r)) fail(`Fine cell ${cell.cell_id} has invalid axial coordinates.`);
    if (!Array.isArray(cell.neighbor_ids)) fail(`Fine cell ${cell.cell_id} has no neighbor list.`);
    if (cellById.has(cell.cell_id)) fail(`Duplicate fine estate cell ID: ${cell.cell_id}.`);
    cellById.set(cell.cell_id, cell);
  }

  const adjacency = new Map<string, readonly string[]>();
  for (const cell of cells) {
    const localNeighbors = cell.neighbor_ids.filter((neighbor) => cellById.has(neighbor));
    if (new Set(localNeighbors).size !== localNeighbors.length) {
      fail(`Fine cell ${cell.cell_id} has duplicate local neighbor IDs.`);
    }
    for (const neighborId of localNeighbors) {
      const neighbor = cellById.get(neighborId);
      if (!neighbor?.neighbor_ids.includes(cell.cell_id)) {
        fail(`Fine-cell adjacency is not reciprocal between ${cell.cell_id} and ${neighborId}.`);
      }
    }
    adjacency.set(cell.cell_id, sortedCellIds(localNeighbors, cellById));
  }
  return { cellById, adjacency };
}

/**
 * Creates the deterministic visual-only middle LOD for one complete XMAP hex.
 * It fails closed if the supplied lattice is not the exact documented 217-cell
 * parent; callers must never substitute incomplete fetched/detail data.
 */
export function compileMidHexClusters({
  parentXmapHexId,
  cells,
}: {
  parentXmapHexId: string;
  cells: readonly FineEstateCellForMidHex[];
}): MidHexClusterCompilation {
  if (!parentXmapHexId.trim()) fail("A parent XMAP hex ID is required for mid-hex compilation.");
  if (cells.length !== FINE_ESTATE_CELLS_PER_XMAP_HEX) {
    fail(`Mid-hex compilation requires exactly ${FINE_ESTATE_CELLS_PER_XMAP_HEX} fine estate cells; received ${cells.length}.`);
  }
  const { cellById, adjacency } = buildAdjacency(cells);
  const all = new Set(cellById.keys());
  if (!isConnected(all, adjacency, cellById)) fail("The supplied 217-cell XMAP parent is not contiguous.");

  const groups: Array<Set<string>> = [];
  const remaining = new Set(all);
  while (remaining.size > 0) {
    const seed = sortedCellIds(remaining, cellById)[0];
    if (!seed) fail("Cannot find a deterministic mid-hex seed.");
    const group = compactSevenCellGroup(seed, remaining, adjacency, cellById);
    for (const id of group) remaining.delete(id);
    const components = connectedComponents(remaining, adjacency, cellById);
    if (components.some((component) => component.size % FINE_ESTATE_CELLS_PER_MID_HEX !== 0)) {
      fail("The supplied fine-cell lattice cannot sustain the required 31 contiguous seven-cell mid hexes.");
    }
    groups.push(group);
  }
  if (groups.length !== MID_HEXES_PER_XMAP_HEX) {
    fail("The supplied fine-cell lattice cannot be partitioned into the required 31 contiguous seven-cell mid hexes.");
  }

  const clusters = groups.map((group, index) => {
    const cellIds = sortedCellIds(group, cellById);
    const anchorCellId = cellIds[0];
    if (!anchorCellId) fail("A compiled mid-hex cluster has no anchor cell.");
    const visualCenter = cellIds.reduce(
      (center, cellId) => {
        const cell = cellById.get(cellId);
        if (!cell) fail(`Compiled mid-hex member ${cellId} is missing.`);
        return { q: center.q + cell.q, r: center.r + cell.r };
      },
      { q: 0, r: 0 },
    );
    return {
      cluster_id: `mid_${parentXmapHexId}_${String(index + 1).padStart(2, "0")}`,
      parent_xmap_hex_id: parentXmapHexId,
      anchor_cell_id: anchorCellId,
      cell_ids: cellIds,
      visual_center: {
        q: visualCenter.q / FINE_ESTATE_CELLS_PER_MID_HEX,
        r: visualCenter.r / FINE_ESTATE_CELLS_PER_MID_HEX,
      },
    } satisfies MidHexCluster;
  });

  return {
    schema_version: "courtos_mid_hex_cluster_compilation_v1",
    parent_xmap_hex_id: parentXmapHexId,
    source_cell_count: FINE_ESTATE_CELLS_PER_XMAP_HEX,
    cluster_count: MID_HEXES_PER_XMAP_HEX,
    cells_per_cluster: FINE_ESTATE_CELLS_PER_MID_HEX,
    clusters,
  };
}

/** Verifies a serialized compilation before a renderer accepts it. */
export function hasValidMidHexClusterInvariants(
  value: unknown,
  cells: readonly FineEstateCellForMidHex[],
): value is MidHexClusterCompilation {
  if (!value || typeof value !== "object") return false;
  const compilation = value as Partial<MidHexClusterCompilation>;
  if (
    compilation.schema_version !== "courtos_mid_hex_cluster_compilation_v1" ||
    typeof compilation.parent_xmap_hex_id !== "string" ||
    compilation.source_cell_count !== FINE_ESTATE_CELLS_PER_XMAP_HEX ||
    compilation.cluster_count !== MID_HEXES_PER_XMAP_HEX ||
    compilation.cells_per_cluster !== FINE_ESTATE_CELLS_PER_MID_HEX ||
    !Array.isArray(compilation.clusters) ||
    compilation.clusters.length !== MID_HEXES_PER_XMAP_HEX ||
    cells.length !== FINE_ESTATE_CELLS_PER_XMAP_HEX
  ) return false;

  let cellById: Map<string, FineEstateCellForMidHex>;
  let adjacency: Map<string, readonly string[]>;
  try {
    ({ cellById, adjacency } = buildAdjacency(cells));
  } catch {
    return false;
  }
  const seenClusterIds = new Set<string>();
  const covered = new Set<string>();
  for (const [index, cluster] of compilation.clusters.entries()) {
    if (
      !cluster ||
      cluster.cluster_id !== `mid_${compilation.parent_xmap_hex_id}_${String(index + 1).padStart(2, "0")}` ||
      seenClusterIds.has(cluster.cluster_id) ||
      cluster.parent_xmap_hex_id !== compilation.parent_xmap_hex_id ||
      !Array.isArray(cluster.cell_ids) ||
      cluster.cell_ids.length !== FINE_ESTATE_CELLS_PER_MID_HEX ||
      new Set(cluster.cell_ids).size !== FINE_ESTATE_CELLS_PER_MID_HEX ||
      cluster.anchor_cell_id !== cluster.cell_ids[0] ||
      !cluster.visual_center ||
      !Number.isFinite(cluster.visual_center.q) ||
      !Number.isFinite(cluster.visual_center.r)
    ) return false;
    seenClusterIds.add(cluster.cluster_id);
    const group = new Set(cluster.cell_ids);
    if ([...group].some((cellId) => !cellById.has(cellId) || covered.has(cellId))) return false;
    if (cluster.cell_ids.some((cellId, cellIndex) => cellId !== sortedCellIds(group, cellById)[cellIndex])) return false;
    if (!isConnected(group, adjacency, cellById)) return false;
    for (const cellId of group) covered.add(cellId);
  }
  if (covered.size !== FINE_ESTATE_CELLS_PER_XMAP_HEX) return false;

  // The middle LOD is a derivation, so accepting a geometrically plausible
  // but differently partitioned payload would make IDs drift between builds.
  // Validate this at load/build time, never per animation frame.
  try {
    const expected = compileMidHexClusters({
      parentXmapHexId: compilation.parent_xmap_hex_id,
      cells,
    });
    return JSON.stringify(compilation) === JSON.stringify(expected);
  } catch {
    return false;
  }
}
