import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createCourtOs1120ReadModelService,
  repositoryCourtOs1120Sources,
} from "../../src/server/courtos1120Api/readModelService";

const exportPath = path.join(process.cwd(), "data/map/mapgen_exports/pearwick_microhex_pilot_v1.json");
const pearwickHouseId = "t0h_bcae5bd911ab10f4c7fdfea0";
const manorFabricReleaseDirectory = path.join(process.cwd(), "data/genrun/phase_five_manor_operations_uat1_admission_v1");
const manorFabricXmapManorsPath = path.join(process.cwd(), "data/map/xmap_alpha_v1/manor_units_v1.json");
const temporaryDirectories: string[] = [];

async function admittedProjection(sourceSha256: string) {
  const directory = await mkdtemp(path.join(tmpdir(), "courtos-spatial-visual-"));
  temporaryDirectories.push(directory);
  const projectionPath = path.join(directory, "spatial.json");
  await writeFile(projectionPath, JSON.stringify({
    schema_version: "courtos_spatial_read_model_v1",
    effective_date: "1120-01-01",
    read_only: true,
    command_authority: false,
    portfolios: [{
      house_id: pearwickHouseId,
      house_name: "Fixture House",
      association_posture: "ui_admitted",
      manors: [{
        manor_id: "manor_hx_38958",
        display_name: "Fixture Manor",
        county_id: "c_5",
        county_name: "Orchardmere",
        seat_hex_id: "hx_38958",
        seat_q: 180,
        seat_r: 138,
        hex_count: 6,
        estimated_peasant_households: null,
        is_principal_seat: true,
        detailed_coverage: {
          coverage_state: "authored_one_acre_detail",
          renderer_level: "estate",
          available_levels: ["realm", "county", "estate"],
          authored_acre_count: 3689,
          renderers: {},
        },
        visual_derivation: {
          disposition: "interpretive_renderer_export",
          source_status: "versioned_renderer_export",
          parent_xmap_hex_count: 17,
          parcel_cluster_count: 31,
          acre_cell_count: 3689,
          acre_cells_per_parent: 217,
          available_lods: ["xmap_hex", "parcel_cluster", "acre_cell"],
          feature_families: [],
          source_sha256: sourceSha256,
        },
      }],
    }],
  }));
  return projectionPath;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("CourtOS admitted spatial visual service", () => {
  it("routes Roadcote to its own XMAP-derived macro, middle, and fine export", async () => {
    const service = createCourtOs1120ReadModelService(repositoryCourtOs1120Sources());
    try {
      const macro = await service.spatialVisual({
        houseId: pearwickHouseId,
        manorId: "manor_hx_44835",
        lod: "macro",
      });
      const mid = await service.spatialVisual({
        houseId: pearwickHouseId,
        manorId: "manor_hx_44835",
        lod: "mid_hex",
        parentHexId: "hx_44835",
      });
      const fine = await service.spatialVisual({
        houseId: pearwickHouseId,
        manorId: "manor_hx_44835",
        lod: "fine_cell",
        parentHexId: "hx_44835",
      });
      const composition = await service.spatialVisualComposition({
        houseId: pearwickHouseId,
        manorId: "manor_hx_44835",
        lod: "mid_hex",
      });
      expect(macro).toMatchObject({
        manor_id: "manor_hx_44835",
        lod: "macro",
        macro: { parent_count: 23, fine_cell_count: 4991 },
        manor_fabric: {
          schema_version: "courtos_manor_fabric_visual_facts_v1",
          manor: {
            manor_id: "manor_hx_44835",
            governing_actor_id: pearwickHouseId,
          },
          source_truth_boundary: {
            canonical_component_counts: false,
            canonical_facility_coordinates: false,
          },
        },
      });
      expect(macro.manor_fabric.aggregate_surfaces).toHaveLength(7);
      expect(macro.manor_fabric.active_improvements).toEqual([
        expect.objectContaining({ project_id: "impproj_step5ec_ae97998be6dae2" }),
      ]);
      expect(mid).toMatchObject({ lod: "mid_hex", parent: { cluster_count: 31 } });
      expect(fine).toMatchObject({ lod: "fine_cell", parent: { fine_cell_count: 217 } });
      expect(fine.fine_cells).toHaveLength(217);
      expect(composition).toMatchObject({
        schema_version: "courtos_spatial_visual_composition_v1",
        manor_id: "manor_hx_44835",
        lod: "mid_hex",
        macro: { macro: { parent_count: 23 } },
      });
      expect((composition as { chunks: unknown[] }).chunks).toHaveLength(23);
    } finally {
      await service.close();
    }
  });

  it("releases only bounded macro, mid, and fine visual detail for an admitted House/manor", async () => {
    const service = createCourtOs1120ReadModelService(
      repositoryCourtOs1120Sources(),
    );
    try {
      const macro = await service.spatialVisual({ houseId: pearwickHouseId, manorId: "manor_hx_38958", lod: "macro" });
      const mid = await service.spatialVisual({ houseId: pearwickHouseId, manorId: "manor_hx_38958", lod: "mid_hex", parentHexId: "hx_38958" });
      const fine = await service.spatialVisual({ houseId: pearwickHouseId, manorId: "manor_hx_38958", lod: "fine_cell", parentHexId: "hx_38958" });
      expect(macro).toMatchObject({ lod: "macro", macro: { parent_count: 17 } });
      expect(mid).toMatchObject({ lod: "mid_hex", parent: { cluster_count: 31 } });
      expect(fine).toMatchObject({ lod: "fine_cell", parent: { fine_cell_count: 217 } });
    } finally {
      await service.close();
    }
  });

  it("refuses the visual export when the admitted source identity is stale", async () => {
    const service = createCourtOs1120ReadModelService({
      courtOsSqlitePath: null,
      householdSqlitePath: null,
      spatialProjectionPath: await admittedProjection("0".repeat(64)),
      spatialVisualExportPaths: { manor_hx_38958: exportPath },
      manorFabricReleaseDirectory,
      manorFabricXmapManorsPath,
    });
    try {
      await expect(service.spatialVisual({
        houseId: pearwickHouseId,
        manorId: "manor_hx_38958",
        lod: "macro",
      })).rejects.toThrow("does not match the admitted source digest");
    } finally {
      await service.close();
    }
  });
});
