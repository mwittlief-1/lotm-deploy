import { describe, expect, it } from "vitest";

import { isCourtOsSpatialHouseProjection } from "../src/ui/spatial/courtosSpatialContract";

const visualDerivation = {
  disposition: "interpretive_renderer_export",
  source_status: "versioned_renderer_export",
  parent_xmap_hex_count: 17,
  parcel_cluster_count: null,
  acre_cell_count: 3689,
  acre_cells_per_parent: 217,
  available_lods: ["xmap_hex", "acre_cell"],
  feature_families: ["Open-field family", "Shared-master manor road"],
  source_sha256: "a".repeat(64),
} as const;

function projectionWith(derivation: unknown) {
  return {
    schema_version: "courtos_spatial_house_projection_v1",
    effective_date: "1120-01-01",
    read_only: true,
    command_authority: false,
    query: { house_id: "house_pearwick" },
    availability: "admitted",
    portfolio: {
      house_id: "house_pearwick",
      house_name: "House Pearwick Hall",
      association_posture: "ui_admitted",
      manors: [{
        manor_id: "manor_hx_38958",
        display_name: "Pearwick Hall",
        county_id: "c_5",
        county_name: "Orchardmere",
        seat_hex_id: "hx_38958",
        seat_q: 180,
        seat_r: 138,
        hex_count: 6,
        estimated_peasant_households: 39,
        is_principal_seat: true,
        detailed_coverage: {
          coverage_state: "authored_one_acre_detail",
          renderer_level: "estate",
          available_levels: ["realm", "county", "estate"],
          authored_acre_count: 3689,
          renderers: {},
        },
        visual_derivation: derivation,
      }],
    },
  };
}

describe("CourtOS spatial visual derivation boundary", () => {
  it("accepts an explicitly interpretive renderer export", () => {
    expect(isCourtOsSpatialHouseProjection(projectionWith(visualDerivation))).toBe(true);
  });

  it("accepts the authored 31-by-7 intermediate visual layer", () => {
    expect(isCourtOsSpatialHouseProjection(projectionWith({
      ...visualDerivation,
      parcel_cluster_count: 31,
      available_lods: ["xmap_hex", "parcel_cluster", "acre_cell"],
    }))).toBe(true);
  });

  it("fails closed when a visual derivation is presented as source truth", () => {
    expect(isCourtOsSpatialHouseProjection(projectionWith({
      ...visualDerivation,
      disposition: "source_truth",
    }))).toBe(false);
  });

  it("fails closed when a parcel layer is claimed before it is authored", () => {
    expect(isCourtOsSpatialHouseProjection(projectionWith({
      ...visualDerivation,
      available_lods: ["xmap_hex", "parcel_cluster", "acre_cell"],
      parcel_cluster_count: null,
    }))).toBe(false);
  });
});
