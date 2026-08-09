import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const projectionUrl = new URL(
  "../.courtos-generated/courtos_spatial_read_model_v1.json",
  import.meta.url,
);

describe("CourtOS spatial read model", () => {
  it("projects only the founder-authorized, source-pinned Pearwick manor admission", async () => {
    const projection = JSON.parse(await readFile(projectionUrl, "utf8"));
    expect(projection.schema_version).toBe("courtos_spatial_read_model_v1");
    expect(projection.read_only).toBe(true);
    expect(projection.command_authority).toBe(false);

    expect(projection.portfolio_count).toBe(1);
    expect(projection.manor_count).toBe(2);
    expect(projection.portfolios).toHaveLength(1);
    expect(projection.portfolios[0]).toMatchObject({
      house_id: "t0h_bcae5bd911ab10f4c7fdfea0",
      house_name: "House Pearwick Hall",
      association_posture: "ui_admitted",
    });
    expect(projection.portfolios[0].manors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        manor_id: "manor_hx_44835",
        display_name: "Roadcote Court",
        is_principal_seat: true,
        detailed_coverage: expect.objectContaining({
          coverage_state: "authored_one_acre_detail",
          available_levels: ["realm", "county", "estate"],
          authored_acre_count: 4991,
        }),
        visual_derivation: expect.objectContaining({
          parent_xmap_hex_count: 23,
          parcel_cluster_count: 31,
          acre_cell_count: 4991,
          available_lods: ["xmap_hex", "parcel_cluster", "acre_cell"],
          feature_families: expect.arrayContaining([
            "Roadcote Court compound",
            "Glastonmere open-field family",
          ]),
        }),
      }),
      expect.objectContaining({
        manor_id: "manor_hx_38958",
        display_name: "Pearwick Hall",
        is_principal_seat: false,
        visual_derivation: expect.objectContaining({
          parcel_cluster_count: 31,
          available_lods: ["xmap_hex", "parcel_cluster", "acre_cell"],
          feature_families: expect.arrayContaining([
            "Pearwick Hall compound",
            "Shared-master manor road",
          ]),
        }),
      }),
    ]));
    expect(JSON.stringify(projection)).not.toContain("provisional_operator_crosswalk");
    expect(JSON.stringify(projection)).not.toContain("principal_operator_person_ids");
  });

  it("keeps each admitted manor on its truthful county renderer", async () => {
    const projection = JSON.parse(await readFile(projectionUrl, "utf8"));
    const manors = projection.portfolios[0].manors;
    expect(manors.find((manor) => manor.display_name === "Pearwick Hall")?.detailed_coverage.renderers.county)
      .toBe("orchardmere_county_v1");
    expect(manors.find((manor) => manor.display_name === "Roadcote Court")?.detailed_coverage.renderers.county)
      .toBe("glastonmere_county_v1");
  });
});
