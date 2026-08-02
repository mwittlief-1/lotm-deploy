import type { CourtOsMapLevel, CourtOsRendererKey } from "./embeddedMapContract";

export type CourtOsSpatialCoverage = {
  coverage_state: "authored_one_acre_detail" | "macro_only";
  renderer_level: CourtOsMapLevel;
  available_levels: CourtOsMapLevel[];
  authored_acre_count?: number;
  renderers: Partial<Record<CourtOsMapLevel, CourtOsRendererKey>>;
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
  detailed_coverage: CourtOsSpatialCoverage;
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
        candidate.portfolio.manors.length > 0))
  );
}
