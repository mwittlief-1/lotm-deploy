import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearCourtOsSpatialVisualCacheForTests,
  loadCourtOsSpatialVisualComposition,
} from "../../src/ui/spatial/courtosSpatialVisualCompositionCache";

const sha = "a".repeat(64);
const houseId = "house-1";
const manorId = "manor-1";

function proof(lod: "macro" | "mid_hex" | "fine_cell") {
  return {
    schema_version: "courtos_spatial_visual_proof_v1",
    disposition: "interpretive_renderer_export",
    source_status: "versioned_renderer_export",
    source_sha256: sha,
    house_id: houseId,
    manor_id: manorId,
    lod,
    macro: {
      parent_count: 1,
      fine_cell_count: 217,
      parents: [{ hex_id: "hx-1", same_manor_as_target: true }],
    },
    ...(lod === "mid_hex" ? { mid_cells: [{ cell_id: "mid-1" }] } : {}),
    ...(lod === "fine_cell" ? { fine_cells: [{ cell_id: "fine-1" }] } : {}),
  };
}

afterEach(() => {
  clearCourtOsSpatialVisualCacheForTests();
  vi.unstubAllGlobals();
});

describe("CourtOS spatial composition cache", () => {
  it("deduplicates realm and batch-composition requests across scale revisits", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const data = url.includes("visual-composition")
        ? {
          schema_version: "courtos_spatial_visual_composition_v1",
          source_sha256: sha,
          house_id: houseId,
          manor_id: manorId,
          lod: "mid_hex",
          macro: proof("macro"),
          chunks: [proof("mid_hex")],
        }
        : proof("macro");
      return { ok: true, json: async () => ({ data }) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const firstRealm = loadCourtOsSpatialVisualComposition(houseId, manorId, "macro");
    const secondRealm = loadCourtOsSpatialVisualComposition(houseId, manorId, "macro");
    expect(firstRealm).toBe(secondRealm);
    await firstRealm;

    const firstCounty = loadCourtOsSpatialVisualComposition(houseId, manorId, "mid_hex");
    const secondCounty = loadCourtOsSpatialVisualComposition(houseId, manorId, "mid_hex");
    expect(firstCounty).toBe(secondCounty);
    const county = await firstCounty;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("visual-composition"))).toHaveLength(1);
    expect(county.mid_cells).toEqual([{ cell_id: "mid-1" }]);
  });

  it("fails closed when a batch mixes renderer export identities", async () => {
    const mixed = { ...proof("fine_cell"), source_sha256: "b".repeat(64) };
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          schema_version: "courtos_spatial_visual_composition_v1",
          source_sha256: sha,
          house_id: houseId,
          manor_id: manorId,
          lod: "fine_cell",
          macro: proof("macro"),
          chunks: [mixed],
        },
      }),
    }) as Response));

    await expect(loadCourtOsSpatialVisualComposition(houseId, manorId, "fine_cell"))
      .rejects.toThrow("mixed source identities");
  });

  it("fails closed when a source-matching child belongs to another House or level", async () => {
    const mixedScope = {
      ...proof("mid_hex"),
      house_id: "house-2",
      lod: "fine_cell",
    };
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          schema_version: "courtos_spatial_visual_composition_v1",
          source_sha256: sha,
          house_id: houseId,
          manor_id: manorId,
          lod: "mid_hex",
          macro: proof("macro"),
          chunks: [mixedScope],
        },
      }),
    }) as Response));

    await expect(loadCourtOsSpatialVisualComposition(houseId, manorId, "mid_hex"))
      .rejects.toThrow("mixed House, manor, or level scope");
  });
});
