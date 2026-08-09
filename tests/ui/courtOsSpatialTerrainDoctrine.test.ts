import { describe, expect, it } from "vitest";

import {
  COURTOS_SPATIAL_LOD_DOCTRINE,
  facilityPresentationOffset,
  projectedTerrainElevations,
  sourceFeatureSegments,
  validLodComposition,
} from "../../src/ui/spatial/spatialTerrainDoctrine";
import {
  manorFabricRoleFromSource,
  manorFabricSpritePath,
} from "../../src/ui/spatial/manorFabricAssetResolver";
import {
  buildTerrainNoisePixels,
  buildTerrainReliefPixels,
} from "../../src/ui/spatial/mapgenLandscapeRenderer";

describe("CourtOS spatial terrain doctrine", () => {
  it("locks the authored parent to 31 mid cells to 217 fine cells hierarchy", () => {
    expect(COURTOS_SPATIAL_LOD_DOCTRINE).toEqual({
      macro_cells_per_parent: 1,
      mid_cells_per_parent: 31,
      fine_cells_per_mid_cell: 7,
      fine_cells_per_parent: 217,
    });
    expect(validLodComposition(31, 217)).toBe(true);
    expect(validLodComposition(30, 210)).toBe(false);
  });

  it("softens fine-cell spikes without exceeding source-neighbor relief", () => {
    const projected = projectedTerrainElevations([
      { id: "west", q: -1, r: 0, elevation: 2 },
      { id: "center", q: 0, r: 0, elevation: 10 },
      { id: "east", q: 1, r: 0, elevation: 2 },
    ], "fine_cell");
    expect(projected.get("center")).toBeGreaterThanOrEqual(2);
    expect(projected.get("center")).toBeLessThan(10);
    expect(projected.get("west")).toBeGreaterThan(2);
    expect(projected.get("west")).toBeLessThanOrEqual(10);
  });

  it("does not alter macro elevations or synthesize missing neighbors", () => {
    const projected = projectedTerrainElevations([
      { id: "isolated", q: 20, r: -5, elevation: 7 },
    ], "macro");
    expect(projected.get("isolated")).toBe(7);
  });

  it("does not bridge disconnected clusters carrying the same source feature ID", () => {
    const topology = sourceFeatureSegments([
      { id: "a", q: 0, r: 0 },
      { id: "b", q: 1, r: 0 },
      { id: "c", q: 8, r: 8 },
      { id: "d", q: 9, r: 8 },
    ]);
    expect(topology.segments).toEqual([
      { fromId: "a", toId: "b" },
      { fromId: "c", toId: "d" },
    ]);
    expect(topology.segments).not.toContainEqual({ fromId: "b", toId: "c" });
  });

  it("uses deterministic presentation offsets without claiming exact facility coordinates", () => {
    expect(facilityPresentationOffset(0, 2)).toEqual({ x: 0, z: 0 });
    expect(facilityPresentationOffset(1, 2)).toEqual({ x: 2, z: 0 });
    expect(facilityPresentationOffset(1, 2)).toEqual(facilityPresentationOffset(1, 2));
  });
});

describe("source-bound manor fabric art", () => {
  it("selects specific art only from declared facility characteristics", () => {
    expect(manorFabricRoleFromSource("fortification-works", "manor chapel")).toBe("fortification-works");
    expect(manorFabricRoleFromSource(null, "manor chapel")).toBe("chapel");
    expect(manorFabricSpritePath(null, "great granary")).toContain("great-granary");
    expect(manorFabricSpritePath(null, "undershot watermill")).toContain("undershot-watermill");
    expect(manorFabricSpritePath("estate-core", "comital court")).toContain("comital-court");
    expect(manorFabricSpritePath("estate-core", "woodland march hall")).toContain("deepcote-woodland");
    expect(manorFabricSpritePath("chapel", "baronial tower")).toContain("baronial-chapel");
  });

  it("does not invent a building for an unknown source descriptor", () => {
    expect(manorFabricRoleFromSource(null, "unclassified improvement 17")).toBeNull();
    expect(manorFabricSpritePath(null, "unclassified improvement 17")).toBeNull();
  });
});

describe("procedural terrain texture budget", () => {
  it("generates deterministic opaque 256px material and relief maps", () => {
    const material = buildTerrainNoisePixels();
    const relief = buildTerrainReliefPixels();
    expect(material).toHaveLength(256 * 256 * 4);
    expect(relief).toHaveLength(256 * 256 * 4);
    expect([...material.filter((_, index) => index % 4 === 3)]).toEqual(
      expect.arrayContaining([255]),
    );
    expect([...relief.filter((_, index) => index % 4 === 3)]).toEqual(
      expect.arrayContaining([255]),
    );
    expect(buildTerrainNoisePixels(2)).toEqual(buildTerrainNoisePixels(2));
    expect(buildTerrainReliefPixels(2)).toEqual(buildTerrainReliefPixels(2));
  });
});
