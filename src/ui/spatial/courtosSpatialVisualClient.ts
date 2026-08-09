import { useEffect, useState } from "react";

import {
  courtOsTimeoutError,
  createCourtOsRequestDeadline,
} from "../courtosRequestDeadline";

export type CourtOsSpatialVisualLod = "macro" | "mid_hex" | "fine_cell";

export type CourtOsManorFabricVisualFactsV1 = {
  manor: {
    manor_id: string;
    display_name: string;
    seat_hex_id: string;
    hex_ids: string[];
    holding_type: string;
    manor_size_class: string;
    seat_archetype: string;
  };
  aggregate_surfaces: Array<{
    asset_surface_id: string;
    surface_key: string;
    exact_label: string;
    condition_state: string;
    render_roles: string[];
    active_project_ids: string[];
  }>;
  active_improvements: Array<{
    project_id: string;
    state: string;
    progress_fraction: number | null;
  }>;
  discrete_facilities: Array<{
    facility_id: string;
    facility_kind: string;
    exact_type: string;
    parent_surface_key: string;
    operational_state: string;
  }>;
  placement_hints: Array<{
    subject_kind: "aggregate_estate_surface" | "discrete_facility";
    subject_id: string;
    preferred_parent_hex_id: string;
    visual_family: string;
    anchor_role: string;
    stable_rotation_degrees: number;
    condition_treatment: string;
    construction_treatment: "active_works" | "completed_or_no_active_works";
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
  manor_fabric?: CourtOsManorFabricVisualFactsV1;
  macro: {
    parent_count: number;
    fine_cell_count: number;
    parents: Array<{
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
      same_manor_as_target: boolean;
      is_estate: boolean;
      authored_context_role: string;
      linear_feature_ids: string[];
      site_feature_ids: string[];
    }>;
  };
  parent?: { hex_id: string; cluster_count: 31; fine_cell_count: 217 };
  clusters?: Array<{ cluster_id: string; cell_ids: string[] }>;
  mid_cells?: Array<{
    cell_id: string;
    q: number;
    r: number;
    parent_hex_id: string;
    elevation: number;
    land_use: string;
    linear_feature_ids: string[];
    site_feature_ids: string[];
  }>;
  fine_cells?: Array<{
    cell_id: string;
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

export type CourtOsSpatialVisualState =
  | { status: "loading" }
  | { status: "ready"; value: CourtOsSpatialVisualProofV1 }
  | { status: "error"; message: string };

type CourtOsSpatialVisualCompositionV1 = {
  schema_version: "courtos_spatial_visual_composition_v1";
  source_sha256: string;
  house_id: string;
  manor_id: string;
  lod: Exclude<CourtOsSpatialVisualLod, "macro">;
  macro: CourtOsSpatialVisualProofV1;
  chunks: CourtOsSpatialVisualProofV1[];
};

function isVisualProof(value: unknown): value is CourtOsSpatialVisualProofV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CourtOsSpatialVisualProofV1>;
  return (
    candidate.schema_version === "courtos_spatial_visual_proof_v1" &&
    candidate.disposition === "interpretive_renderer_export" &&
    candidate.source_status === "versioned_renderer_export" &&
    (candidate.lod === "macro" || candidate.lod === "mid_hex" || candidate.lod === "fine_cell") &&
    Boolean(candidate.macro && Array.isArray(candidate.macro.parents)) &&
    typeof candidate.source_sha256 === "string" && /^[a-f0-9]{64}$/.test(candidate.source_sha256)
  );
}

function isVisualComposition(value: unknown): value is CourtOsSpatialVisualCompositionV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CourtOsSpatialVisualCompositionV1>;
  return (
    candidate.schema_version === "courtos_spatial_visual_composition_v1" &&
    (candidate.lod === "mid_hex" || candidate.lod === "fine_cell") &&
    typeof candidate.source_sha256 === "string" && /^[a-f0-9]{64}$/.test(candidate.source_sha256) &&
    isVisualProof(candidate.macro) &&
    Array.isArray(candidate.chunks) && candidate.chunks.every(isVisualProof)
  );
}

/** Fetches a single bounded LOD only after the House/manor spatial projection has admitted it. */
export function useCourtOsSpatialVisualProof({
  houseId,
  manorId,
  lod,
  parentHexId,
  enabled,
}: {
  houseId: string | null;
  manorId: string | null;
  lod: CourtOsSpatialVisualLod;
  parentHexId?: string | null;
  enabled: boolean;
}): CourtOsSpatialVisualState {
  const [state, setState] = useState<CourtOsSpatialVisualState>({ status: "loading" });

  useEffect(() => {
    if (!enabled || !houseId || !manorId || (lod !== "macro" && !parentHexId)) {
      setState({ status: "loading" });
      return;
    }
    const deadline = createCourtOsRequestDeadline();
    const parameters = new URLSearchParams({ houseId, manorId, lod });
    if (parentHexId) parameters.set("parentHexId", parentHexId);
    setState({ status: "loading" });
    fetch(`/api/spatial/1120/visual?${parameters.toString()}`, { signal: deadline.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Spatial visual proof returned ${response.status}.`);
        const envelope: unknown = await response.json();
        const data = envelope && typeof envelope === "object" && "data" in envelope
          ? (envelope as { data?: unknown }).data
          : null;
        if (!isVisualProof(data)) throw new Error("Spatial visual proof failed its source or schema gate.");
        if (data.house_id !== houseId || data.manor_id !== manorId || data.lod !== lod) {
          throw new Error("Spatial visual proof does not match the selected House, manor, or level.");
        }
        setState({ status: "ready", value: data });
      })
      .catch((error: unknown) => {
        if (deadline.signal.aborted && !deadline.didTimeOut()) return;
        setState({
          status: "error",
          message: deadline.didTimeOut()
            ? courtOsTimeoutError("SPATIAL_VISUAL_REQUEST_TIMEOUT", "The ground survey").message
            : error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => deadline.clear());
    return () => deadline.cancel();
  }, [houseId, manorId, lod, parentHexId, enabled]);

  return state;
}

/**
 * Composes the parent-bounded API into continuous County and Manor scenes.
 * County retains every authored context parent; Manor requests every admitted
 * estate parent, never only the currently inspected 217-cell seat chunk.
 */
export function useCourtOsSpatialVisualComposition({
  houseId,
  manorId,
  lod,
  enabled,
  reloadKey = 0,
}: {
  houseId: string | null;
  manorId: string | null;
  lod: CourtOsSpatialVisualLod;
  enabled: boolean;
  reloadKey?: number;
}): CourtOsSpatialVisualState {
  const [state, setState] = useState<CourtOsSpatialVisualState>({ status: "loading" });

  useEffect(() => {
    if (!enabled || !houseId || !manorId) {
      setState({ status: "loading" });
      return;
    }
    const deadline = createCourtOsRequestDeadline();
    const fetchProof = async (requestedLod: CourtOsSpatialVisualLod, parentHexId?: string) => {
      const parameters = new URLSearchParams({ houseId, manorId, lod: requestedLod });
      if (parentHexId) parameters.set("parentHexId", parentHexId);
      const response = await fetch(`/api/spatial/1120/visual?${parameters.toString()}`, { signal: deadline.signal });
      if (!response.ok) throw new Error(`Spatial visual proof returned ${response.status}.`);
      const envelope: unknown = await response.json();
      const data = envelope && typeof envelope === "object" && "data" in envelope
        ? (envelope as { data?: unknown }).data
        : null;
      if (!isVisualProof(data) || data.house_id !== houseId || data.manor_id !== manorId || data.lod !== requestedLod) {
        throw new Error("Spatial visual proof failed its source, scope, or schema gate.");
      }
      return data;
    };

    setState({ status: "loading" });
    const request = lod === "macro"
      ? fetchProof("macro")
      : fetch(`/api/spatial/1120/visual-composition?${new URLSearchParams({
        houseId,
        manorId,
        lod,
      }).toString()}`, { signal: deadline.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Spatial visual composition returned ${response.status}.`);
          const envelope: unknown = await response.json();
          const data = envelope && typeof envelope === "object" && "data" in envelope
            ? (envelope as { data?: unknown }).data
            : null;
          if (!isVisualComposition(data) || data.house_id !== houseId || data.manor_id !== manorId || data.lod !== lod) {
            throw new Error("Spatial visual composition failed its source, scope, or schema gate.");
          }
          if (data.chunks.some((chunk) => chunk.source_sha256 !== data.source_sha256)) {
            throw new Error("Spatial visual composition contains mixed source identities.");
          }
          const fabric = data.macro.manor_fabric;
          return {
            ...data.macro,
            lod,
            parent: data.chunks.find((chunk) => chunk.parent)?.parent,
            manor_fabric: fabric,
            clusters: lod === "mid_hex" ? data.chunks.flatMap((chunk) => chunk.clusters ?? []) : undefined,
            mid_cells: lod === "mid_hex" ? data.chunks.flatMap((chunk) => chunk.mid_cells ?? []) : undefined,
            fine_cells: lod === "fine_cell" ? data.chunks.flatMap((chunk) => chunk.fine_cells ?? []) : undefined,
          } as CourtOsSpatialVisualProofV1;
        });
    request
      .then((value) => setState({ status: "ready", value }))
      .catch((error: unknown) => {
        if (deadline.signal.aborted && !deadline.didTimeOut()) return;
        setState({
          status: "error",
          message: deadline.didTimeOut()
            ? courtOsTimeoutError("SPATIAL_VISUAL_REQUEST_TIMEOUT", "The ground survey").message
            : error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => deadline.clear());
    return () => deadline.cancel();
  }, [houseId, manorId, lod, enabled, reloadKey]);

  return state;
}
