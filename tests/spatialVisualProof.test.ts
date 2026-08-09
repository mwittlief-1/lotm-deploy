import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildCourtOsSpatialVisualProof } from "../src/server/courtos1120Api/spatialVisualProof";

const exportPath = path.join(process.cwd(), "data/map/mapgen_exports/pearwick_microhex_pilot_v1.json");
const sourceSha256 = createHash("sha256").update(readFileSync(exportPath)).digest("hex");

function request(lod: "macro" | "mid_hex" | "fine_cell", parentHexId?: string) {
  return {
    houseId: "house_test",
    manorId: "manor_hx_38958",
    lod,
    parentHexId,
    expectedSourceSha256: sourceSha256,
  };
}

describe("CourtOS spatial visual proof", () => {
  it("serves macro, 31-cluster, and fine-cell levels from one pinned interpretive export", async () => {
    const macro = await buildCourtOsSpatialVisualProof({ exportPath, request: request("macro") });
    const mid = await buildCourtOsSpatialVisualProof({ exportPath, request: request("mid_hex", "hx_38958") });
    const fine = await buildCourtOsSpatialVisualProof({ exportPath, request: request("fine_cell", "hx_38958") });

    expect(macro.disposition).toBe("interpretive_renderer_export");
    expect(macro.macro.parents).toHaveLength(17);
    expect(mid.parent).toEqual({ hex_id: "hx_38958", cluster_count: 31, fine_cell_count: 217 });
    expect(mid.clusters).toHaveLength(31);
    expect(mid.clusters?.every((cluster) => cluster.cell_ids.length === 7)).toBe(true);
    expect(mid.mid_cells).toHaveLength(31);
    const firstCluster = mid.clusters?.[0];
    const firstSummary = mid.mid_cells?.[0];
    const firstMembers = fine.fine_cells?.filter((cell) => firstCluster?.cell_ids.includes(cell.cell_id)) ?? [];
    expect(firstSummary).toMatchObject({
      cell_id: firstCluster?.cluster_id,
      parent_hex_id: "hx_38958",
      q: firstCluster?.visual_center.q,
      r: firstCluster?.visual_center.r,
    });
    expect(firstSummary?.elevation).toBe(Number((
      firstMembers.reduce((sum, cell) => sum + cell.elevation, 0) / 7
    ).toFixed(4)));
    expect(firstSummary?.land_use).not.toBe("recorded parcel");
    expect(firstSummary?.linear_feature_ids).toEqual(expect.any(Array));
    expect(firstSummary?.site_feature_ids).toEqual(expect.any(Array));
    expect(fine.fine_cells).toHaveLength(217);
    expect(fine.fine_cells?.every((cell) => cell.parent_hex_id === "hx_38958")).toBe(true);
    expect(fine.fine_cells?.every((cell) => Array.isArray(cell.neighbor_ids))).toBe(true);
  });

  it("fails closed on a mixed or stale visual-source digest", async () => {
    await expect(buildCourtOsSpatialVisualProof({
      exportPath,
      request: { ...request("macro"), expectedSourceSha256: "0".repeat(64) },
    })).rejects.toThrow("does not match the admitted source digest");
  });
});
