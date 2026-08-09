import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  compileMidHexClusters,
  type FineEstateCellForMidHex,
} from "../../ui/spatial/midHexClusterCompiler";

export type CourtOsSpatialVisualLod = "macro" | "mid_hex" | "fine_cell";

export type CourtOsSpatialVisualProofRequest = {
  houseId: string;
  manorId: string;
  lod: CourtOsSpatialVisualLod;
  parentHexId?: string;
  expectedSourceSha256: string;
};

type PilotMacroParent = {
  hex_id: string;
  q: number;
  r: number;
  center_q: number;
  center_r: number;
  terrain: string;
  landcover_subtype: string;
  approved_elevation: number;
  county_id: string;
  county_name: string;
  manor_id: string;
  same_manor_as_target: boolean;
  is_estate: boolean;
  authored_context_role: string;
};

type PilotFineCell = FineEstateCellForMidHex & {
  parent_hex_id: string;
  local_q: number;
  local_r: number;
  elevation: number;
  land_use: string;
  evidence_class: string;
  linear_feature_ids: string[];
  site_feature_ids: string[];
};

type PilotVisualExport = {
  schema_version: "merecross_microhex_pilot_v1";
  status: "interpretive_pilot_not_source_truth";
  target: {
    manor_id: string;
    active_manor_id?: string;
    macro_parent_count: number;
    microhex_count: number;
  };
  refinement: { child_count_per_parent: number; determinant: number };
  macro_parents: PilotMacroParent[];
  microhexes: Array<{
    micro_hex_id: string;
    q: number;
    r: number;
    parent_hex_id: string;
    local_q: number;
    local_r: number;
    elevation: number;
    land_use: string;
    evidence_class: string;
    neighbor_ids: string[];
    linear_feature_ids: string[];
    site_feature_ids: string[];
  }>;
};

export type CourtOsSpatialVisualProofV1 = {
  schema_version: "courtos_spatial_visual_proof_v1";
  disposition: "interpretive_renderer_export";
  source_status: "versioned_renderer_export";
  source_sha256: string;
  house_id: string;
  manor_id: string;
  lod: CourtOsSpatialVisualLod;
  macro: {
    parent_count: number;
    fine_cell_count: number;
    parents: Array<Pick<PilotMacroParent,
      "hex_id" | "q" | "r" | "center_q" | "center_r" | "terrain" |
      "landcover_subtype" | "approved_elevation" | "county_id" | "county_name" |
      "same_manor_as_target" | "is_estate" | "authored_context_role"> & {
        /** Feature IDs summarized from source fine cells; geometry remains visual-only. */
        linear_feature_ids: string[];
        site_feature_ids: string[];
      }>;
  };
  parent?: {
    hex_id: string;
    cluster_count: 31;
    fine_cell_count: 217;
  };
  clusters?: ReturnType<typeof compileMidHexClusters>["clusters"];
  mid_cells?: Array<{
    cell_id: string;
    q: number;
    r: number;
    parent_hex_id: string;
    /** Seven-cell arithmetic mean, for interpretive terrain geometry only. */
    elevation: number;
    /** Deterministic modal land use; lexical order resolves a tied mode. */
    land_use: string;
    /** Source-authored linear features represented by this visual summary. */
    linear_feature_ids: string[];
    /** Source-authored sites represented by this visual summary. */
    site_feature_ids: string[];
  }>;
  fine_cells?: Array<Pick<PilotFineCell,
    "cell_id" | "q" | "r" | "parent_hex_id" | "local_q" | "local_r" |
    "elevation" | "land_use" | "evidence_class" | "linear_feature_ids" |
    "site_feature_ids" | "neighbor_ids">>;
};

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function asPilotFineCell(cell: PilotVisualExport["microhexes"][number]): PilotFineCell {
  return {
    cell_id: cell.micro_hex_id,
    q: cell.q,
    r: cell.r,
    parent_hex_id: cell.parent_hex_id,
    local_q: cell.local_q,
    local_r: cell.local_r,
    elevation: cell.elevation,
    land_use: cell.land_use,
    evidence_class: cell.evidence_class,
    neighbor_ids: cell.neighbor_ids,
    linear_feature_ids: cell.linear_feature_ids,
    site_feature_ids: cell.site_feature_ids,
  };
}

function fail(message: string): never {
  throw new Error(`CourtOS spatial visual proof unavailable: ${message}`);
}

function summarizeMidCluster(
  cluster: ReturnType<typeof compileMidHexClusters>["clusters"][number],
  cellById: ReadonlyMap<string, PilotFineCell>,
) {
  const members = cluster.cell_ids.map((cellId) => {
    const cell = cellById.get(cellId);
    if (!cell) fail(`mid cluster ${cluster.cluster_id} references a missing fine cell`);
    return cell;
  });
  const landUseCounts = new Map<string, number>();
  for (const cell of members) {
    landUseCounts.set(cell.land_use, (landUseCounts.get(cell.land_use) ?? 0) + 1);
  }
  const landUse = [...landUseCounts]
    .sort(([left, leftCount], [right, rightCount]) => rightCount - leftCount || left.localeCompare(right))[0]?.[0];
  if (!landUse) fail(`mid cluster ${cluster.cluster_id} has no land-use summary`);
  return {
    cell_id: cluster.cluster_id,
    q: cluster.visual_center.q,
    r: cluster.visual_center.r,
    parent_hex_id: cluster.parent_xmap_hex_id,
    elevation: Number((members.reduce((sum, cell) => sum + cell.elevation, 0) / members.length).toFixed(4)),
    land_use: landUse,
    linear_feature_ids: [...new Set(members.flatMap((cell) => cell.linear_feature_ids))].sort(),
    site_feature_ids: [...new Set(members.flatMap((cell) => cell.site_feature_ids))].sort(),
  };
}

const visualExportCache = new Map<
  string,
  Promise<{ sourceSha256: string; pilot: PilotVisualExport }>
>();

function readVerifiedVisualExport(
  exportPath: string,
  expectedSourceSha256: string,
): Promise<{ sourceSha256: string; pilot: PilotVisualExport }> {
  const cacheKey = `${exportPath}\u0000${expectedSourceSha256}`;
  let pending = visualExportCache.get(cacheKey);
  if (!pending) {
    pending = readFile(exportPath).then((sourceBytes) => {
      const sourceSha256 = sha256(sourceBytes);
      if (sourceSha256 !== expectedSourceSha256) {
        fail("the renderer export does not match the admitted source digest");
      }
      return {
        sourceSha256,
        pilot: JSON.parse(sourceBytes.toString("utf8")) as PilotVisualExport,
      };
    });
    visualExportCache.set(cacheKey, pending);
    pending.catch(() => visualExportCache.delete(cacheKey));
  }
  return pending;
}

/**
 * Produces a bounded renderer payload only after its House/manor caller has
 * passed the owning read-model admission gate. This derives visual geometry;
 * it neither changes nor declares operational facts about the estate.
 */
export async function buildCourtOsSpatialVisualProof({
  exportPath,
  request,
}: {
  exportPath: string;
  request: CourtOsSpatialVisualProofRequest;
}): Promise<CourtOsSpatialVisualProofV1> {
  // A county/manor composition requests one bounded chunk per parent. Parse
  // and digest the immutable export once per admitted SHA rather than reading
  // the same multi-megabyte file 23 times during a single scale transition.
  const { sourceSha256, pilot } = await readVerifiedVisualExport(
    exportPath,
    request.expectedSourceSha256,
  );
  if (
    pilot.schema_version !== "merecross_microhex_pilot_v1" ||
    pilot.status !== "interpretive_pilot_not_source_truth" ||
    pilot.target?.manor_id !== request.manorId ||
    pilot.refinement?.child_count_per_parent !== 217 ||
    pilot.refinement?.determinant !== 217 ||
    !Array.isArray(pilot.macro_parents) ||
    !Array.isArray(pilot.microhexes)
  ) {
    fail("the visual export does not satisfy the admitted interpretive pilot contract");
  }

  const featuresByParent = new Map<string, { linear: Set<string>; sites: Set<string> }>();
  for (const cell of pilot.microhexes) {
    const entry = featuresByParent.get(cell.parent_hex_id) ?? { linear: new Set<string>(), sites: new Set<string>() };
    for (const featureId of cell.linear_feature_ids) entry.linear.add(featureId);
    for (const featureId of cell.site_feature_ids) entry.sites.add(featureId);
    featuresByParent.set(cell.parent_hex_id, entry);
  }
  const macro = {
    parent_count: pilot.macro_parents.length,
    fine_cell_count: pilot.microhexes.length,
    parents: pilot.macro_parents.map((parent) => {
      const features = featuresByParent.get(parent.hex_id);
      return {
        hex_id: parent.hex_id,
        q: parent.q,
        r: parent.r,
        center_q: parent.center_q,
        center_r: parent.center_r,
        terrain: parent.terrain,
        landcover_subtype: parent.landcover_subtype,
        approved_elevation: parent.approved_elevation,
        county_id: parent.county_id,
        county_name: parent.county_name,
        same_manor_as_target: parent.same_manor_as_target,
        is_estate: parent.is_estate,
        authored_context_role: parent.authored_context_role,
        linear_feature_ids: [...(features?.linear ?? [])].sort(),
        site_feature_ids: [...(features?.sites ?? [])].sort(),
      };
    }),
  };
  const base: Omit<CourtOsSpatialVisualProofV1, "parent" | "clusters" | "mid_cells" | "fine_cells"> = {
    schema_version: "courtos_spatial_visual_proof_v1",
    disposition: "interpretive_renderer_export",
    source_status: "versioned_renderer_export",
    source_sha256: sourceSha256,
    house_id: request.houseId,
    manor_id: request.manorId,
    lod: request.lod,
    macro,
  };
  if (request.lod === "macro") return base;
  if (!request.parentHexId) fail("a parent XMAP hex is required for mid and fine detail");
  const parent = pilot.macro_parents.find((item) => item.hex_id === request.parentHexId);
  if (!parent) fail("requested parent XMAP hex is outside the admitted visual proof");
  const cells = pilot.microhexes
    .filter((cell) => cell.parent_hex_id === request.parentHexId)
    .map(asPilotFineCell);
  if (cells.length !== 217) fail("the requested parent does not contain exactly 217 fine estate cells");
  const detailBase = {
    ...base,
    parent: { hex_id: parent.hex_id, cluster_count: 31 as const, fine_cell_count: 217 as const },
  };
  if (request.lod === "mid_hex") {
    const compilation = compileMidHexClusters({ parentXmapHexId: parent.hex_id, cells });
    const cellById = new Map(cells.map((cell) => [cell.cell_id, cell]));
    return {
      ...detailBase,
      clusters: compilation.clusters,
      mid_cells: compilation.clusters.map((cluster) => summarizeMidCluster(cluster, cellById)),
    };
  }
  return {
    ...detailBase,
    fine_cells: cells.map((cell) => ({
      cell_id: cell.cell_id,
      q: cell.q,
      r: cell.r,
      parent_hex_id: cell.parent_hex_id,
      local_q: cell.local_q,
      local_r: cell.local_r,
      elevation: cell.elevation,
      land_use: cell.land_use,
      evidence_class: cell.evidence_class,
      neighbor_ids: [...cell.neighbor_ids],
      linear_feature_ids: cell.linear_feature_ids,
      site_feature_ids: cell.site_feature_ids,
    })),
  };
}
