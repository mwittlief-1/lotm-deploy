import { useEffect, useState } from "react";

import type { CourtOsMapLevel, CourtOsRendererKey } from "./embeddedMapContract";

export type CourtOsSpatialCoverage = {
  coverage_state: "authored_one_acre_detail" | "macro_only";
  renderer_level: "realm" | "county" | "estate";
  available_levels: Array<"realm" | "county" | "estate">;
  parent_hex_count?: number;
  authored_acre_count?: number;
  source_sha256?: string;
  renderers: Partial<Record<CourtOsMapLevel, CourtOsRendererKey>>;
};

export type CourtOsSpatialManor = {
  manor_id: string;
  protected_manor_id: string;
  display_name: string;
  county_id: string;
  county_name: string | null;
  seat_hex_id: string;
  seat_q: number;
  seat_r: number;
  hex_count: number;
  estimated_peasant_households: number | null;
  holding_type: string;
  manor_size_class: string;
  operation_state: string;
  operator_state: string;
  operator_resolution_status: string;
  principal_operator_person_ids: string[];
  source_posture: "admitted_runtime" | "admitted_read_only" | "provisional_read_only";
  source_status: string;
  ui_authority: boolean;
  runtime_authority: boolean;
  command_authority: boolean;
  detailed_coverage: CourtOsSpatialCoverage;
};

export type CourtOsSpatialPortfolio = {
  house_id: string;
  house_name: string;
  house_style: string | null;
  house_root: string | null;
  association_posture: "ui_admitted" | "provisional_operator_crosswalk";
  association_note: string;
  manors: CourtOsSpatialManor[];
};

type CourtOsSpatialProjection = {
  schema_version: "courtos_spatial_read_model_v1";
  effective_date: string;
  read_only: true;
  command_authority: false;
  portfolios: CourtOsSpatialPortfolio[];
};

export type CourtOsSpatialState =
  | { status: "loading" }
  | { status: "ready"; portfolio: CourtOsSpatialPortfolio | null; effectiveDate: string }
  | { status: "error"; message: string };

const PROJECTION_URL = "/data/ready/courtos_spatial_read_model_v1.json";

function isProjection(value: unknown): value is CourtOsSpatialProjection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CourtOsSpatialProjection>;
  return (
    candidate.schema_version === "courtos_spatial_read_model_v1" &&
    candidate.read_only === true &&
    candidate.command_authority === false &&
    Array.isArray(candidate.portfolios)
  );
}

export function useCourtOsSpatialPortfolio(houseId: string | null): CourtOsSpatialState {
  const [state, setState] = useState<CourtOsSpatialState>({ status: "loading" });

  useEffect(() => {
    if (!houseId) {
      setState({ status: "loading" });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(PROJECTION_URL, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Spatial record returned ${response.status}.`);
        const value: unknown = await response.json();
        if (!isProjection(value)) throw new Error("Spatial record failed its version or authority gate.");
        const portfolio = value.portfolios.find((item) => item.house_id === houseId) ?? null;
        setState({ status: "ready", portfolio, effectiveDate: value.effective_date });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return () => controller.abort();
  }, [houseId]);

  return state;
}
