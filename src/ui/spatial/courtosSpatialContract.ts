import type { CourtOsMapLevel, CourtOsRendererKey } from "./embeddedMapContract";

export type CourtOsSpatialCoverage = {
  coverage_state: "authored_one_acre_detail" | "macro_only";
  renderer_level: CourtOsMapLevel;
  available_levels: CourtOsMapLevel[];
  authored_acre_count?: number;
  renderers: Partial<Record<CourtOsMapLevel, CourtOsRendererKey>>;
};

/**
 * A renderer-owned visual interpretation.  It is deliberately separate from
 * the manor's current operational record: the map may derive parcels and
 * feature placement from XMAP constraints, but it must never present those
 * derivations as adjudicated condition, custody, or completed works.
 */
export type CourtOsSpatialVisualDerivation = {
  disposition: "interpretive_renderer_export";
  source_status: "versioned_renderer_export";
  parent_xmap_hex_count: number;
  parcel_cluster_count: number | null;
  acre_cell_count: number;
  acre_cells_per_parent: number;
  available_lods: Array<"xmap_hex" | "parcel_cluster" | "acre_cell">;
  feature_families: string[];
  source_sha256: string;
};

export type CourtOsSpatialManor = {
  manor_id: string;
  display_name: string;
  county_id: string;
  county_name: string | null;
  seat_hex_id: string;
  seat_q: number;
  seat_r: number;
  hex_count: number;
  estimated_peasant_households: number | null;
  is_principal_seat: boolean;
  detailed_coverage: CourtOsSpatialCoverage;
  visual_derivation?: CourtOsSpatialVisualDerivation;
};

export type CourtOsSpatialPortfolio = {
  house_id: string;
  house_name: string;
  association_posture: "ui_admitted";
  manors: CourtOsSpatialManor[];
};

export type CourtOsSpatialHouseProjectionV1 = {
  schema_version: "courtos_spatial_house_projection_v1";
  effective_date: string;
  read_only: true;
  command_authority: false;
  query: { house_id: string };
  availability: "admitted" | "not_admitted";
  portfolio: CourtOsSpatialPortfolio | null;
};

function isVisualDerivation(value: unknown): value is CourtOsSpatialVisualDerivation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CourtOsSpatialVisualDerivation>;
  return (
    candidate.disposition === "interpretive_renderer_export" &&
    candidate.source_status === "versioned_renderer_export" &&
    Number.isInteger(candidate.parent_xmap_hex_count) &&
    (candidate.parent_xmap_hex_count ?? -1) > 0 &&
    (candidate.parcel_cluster_count === null ||
      (Number.isInteger(candidate.parcel_cluster_count) && (candidate.parcel_cluster_count ?? -1) > 0)) &&
    Number.isInteger(candidate.acre_cell_count) &&
    (candidate.acre_cell_count ?? -1) > 0 &&
    Number.isInteger(candidate.acre_cells_per_parent) &&
    (candidate.acre_cells_per_parent ?? -1) > 0 &&
    Array.isArray(candidate.available_lods) &&
    candidate.available_lods.every((lod) => lod === "xmap_hex" || lod === "parcel_cluster" || lod === "acre_cell") &&
    candidate.available_lods.includes("xmap_hex") &&
    (candidate.available_lods.includes("parcel_cluster") === (candidate.parcel_cluster_count !== null)) &&
    Array.isArray(candidate.feature_families) &&
    candidate.feature_families.every((family) => typeof family === "string" && family.length > 0) &&
    typeof candidate.source_sha256 === "string" &&
    /^[a-f0-9]{64}$/.test(candidate.source_sha256)
  );
}

function isManor(value: unknown): value is CourtOsSpatialManor {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CourtOsSpatialManor>;
  return (
    typeof candidate.manor_id === "string" &&
    typeof candidate.display_name === "string" &&
    typeof candidate.county_id === "string" &&
    (typeof candidate.county_name === "string" || candidate.county_name === null) &&
    typeof candidate.seat_hex_id === "string" &&
    Number.isInteger(candidate.seat_q) &&
    Number.isInteger(candidate.seat_r) &&
    Number.isInteger(candidate.hex_count) &&
    (candidate.hex_count ?? 0) > 0 &&
    (candidate.estimated_peasant_households === null || Number.isInteger(candidate.estimated_peasant_households)) &&
    typeof candidate.is_principal_seat === "boolean" &&
    Boolean(candidate.detailed_coverage) &&
    (candidate.visual_derivation === undefined || isVisualDerivation(candidate.visual_derivation))
  );
}

export function isCourtOsSpatialHouseProjection(
  value: unknown,
): value is CourtOsSpatialHouseProjectionV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CourtOsSpatialHouseProjectionV1>;
  return (
    candidate.schema_version === "courtos_spatial_house_projection_v1" &&
    candidate.read_only === true &&
    candidate.command_authority === false &&
    typeof candidate.query?.house_id === "string" &&
    (candidate.availability === "admitted" ||
      candidate.availability === "not_admitted") &&
    ((candidate.availability === "not_admitted" &&
      candidate.portfolio === null) ||
      candidate.availability === "admitted") &&
    (candidate.portfolio === null ||
      (candidate.portfolio?.house_id === candidate.query.house_id &&
        candidate.portfolio?.association_posture === "ui_admitted" &&
        Array.isArray(candidate.portfolio?.manors) &&
        candidate.portfolio.manors.length > 0 &&
        candidate.portfolio.manors.every(isManor)))
  );
}
