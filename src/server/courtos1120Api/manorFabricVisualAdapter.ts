import { createHash } from "node:crypto";

export type ManorFabricConditionState =
  | "sound"
  | "worn"
  | "impaired"
  | "repairing"
  | "under_construction";

export type ManorFabricSurfaceSourceRow = {
  condition_observation_id: string;
  asset_surface_id: string;
  manor_id: string;
  manor_label: string;
  county_id: string;
  county_label: string;
  governing_actor_id: string;
  governing_actor_name: string;
  surface_key: string;
  surface_name: string;
  condition_kind: string;
  condition_state: ManorFabricConditionState;
  observation_cutpoint: string;
  project_ids: string[];
  source_status: string;
  confidence: string;
  uat1_display_state: string;
};

export type ManorFabricProjectSourceRow = {
  project_id: string;
  manor_id: string;
  asset_surface_id: string;
  surface_key: string;
  surface_name: string;
  project_kind: string;
  action_class: string;
  start_year: number;
  expected_completion_year: number;
  percent_complete_1120_candidate: number;
  state_1120_candidate: string;
  source_status: string;
  uat1_display_state: string;
};

export type ManorFabricFacilitySourceRow = {
  facility_id: string;
  facility_kind: string;
  facility_type: string;
  parent_manor_id: string;
  parent_asset_surface_id: string;
  parent_surface_key: string;
  operational_state: string;
  fortification_posture: string;
  condition_fact_state: string;
  source_status: string;
};

export type ManorFabricXmapSource = {
  manor_id: string;
  county_id: string;
  seat_hex_id: string;
  hex_ids: string[];
  holding_type: string;
  manor_size_class: string;
  seat_archetype: string;
  is_seat_complex: boolean;
  estimated_peasant_households: number;
  avg_buildability_score: number;
  avg_water_access_score: number;
  defensibility_score: number;
  route_access_score: number;
  total_net_productive_capacity: number;
};

export type ManorFabricVisualFamily =
  | "estate_core"
  | "storage_handling"
  | "livestock_stables"
  | "field_system"
  | "water_management"
  | "commons_woodland"
  | "institutional_service"
  | "fortification_works"
  | "administrative_court"
  | "other_recorded_surface";

export type ManorFabricRenderRole =
  | "estate-core"
  | "working-yard"
  | "storage"
  | "livestock-yard"
  | "stables"
  | "field-system"
  | "water-management"
  | "commons"
  | "pasture"
  | "woodland"
  | "institutional-service"
  | "fortification-works"
  | "administrative-court"
  | "recorded-surface";

export type CourtOsManorFabricVisualFactsV1 = {
  schema_version: "courtos_manor_fabric_visual_facts_v1";
  effective_cutpoint: "1120-01-01";
  disposition: "admitted_existence_plus_interpretive_placement";
  source_truth_boundary: {
    admitted_existence_and_status: true;
    canonical_component_counts: false;
    canonical_facility_coordinates: false;
    renderer_may_invent_facility_existence: false;
  };
  manor: ManorFabricXmapSource & {
    display_name: string;
    county_name: string;
    governing_actor_id: string;
    governing_actor_name: string;
  };
  aggregate_surfaces: Array<{
    source_kind: "aggregate_estate_surface";
    asset_surface_id: string;
    surface_key: string;
    exact_label: string;
    visual_family: ManorFabricVisualFamily;
    render_roles: ManorFabricRenderRole[];
    condition_kind: string;
    condition_state: ManorFabricConditionState;
    confidence: string;
    active_project_ids: string[];
    source_status: string;
  }>;
  discrete_facilities: Array<{
    source_kind: "discrete_facility";
    facility_id: string;
    facility_kind: string;
    exact_type: string;
    parent_asset_surface_id: string;
    parent_surface_key: string;
    operational_state: string;
    fortification_posture: string;
    condition_fact_state: string;
    source_status: string;
  }>;
  withheld_surfaces: Array<{
    asset_surface_id: string;
    surface_key: string;
    exact_label: string;
    reason: "condition_unknown_withheld";
  }>;
  active_improvements: Array<{
    project_id: string;
    asset_surface_id: string;
    surface_key: string;
    exact_label: string;
    project_kind: string;
    action_class: string;
    start_year: number;
    expected_completion_year: number;
    progress_fraction: number;
    state: string;
    source_status: string;
  }>;
  placement_hints: Array<{
    subject_kind: "aggregate_estate_surface" | "discrete_facility";
    subject_id: string;
    visual_family: ManorFabricVisualFamily;
    placement_authority: "deterministic_renderer_hint_not_canonical_coordinate";
    preferred_parent_hex_id: string;
    anchor_role: "seat_core" | "seat_infield" | "estate_land" | "estate_edge";
    stable_rotation_degrees: number;
    condition_treatment: ManorFabricConditionState | "unknown_withheld";
    construction_treatment: "active_works" | "completed_or_no_active_works";
  }>;
  provenance: {
    manor_operations_release: string;
    xmap_source: string;
  };
};

const FAMILY_BY_SURFACE_KEY: Readonly<Record<string, ManorFabricVisualFamily>> = {
  "IE-001": "estate_core",
  "IE-002": "storage_handling",
  "IE-003": "livestock_stables",
  "IE-004": "field_system",
  "IE-005": "water_management",
  "IE-006": "commons_woodland",
  "IE-012": "institutional_service",
  "IE-013": "fortification_works",
  "IE-016": "administrative_court",
};

const RENDER_ROLES_BY_SURFACE_KEY: Readonly<Record<string, ManorFabricRenderRole[]>> = {
  "IE-001": ["estate-core", "working-yard"],
  "IE-002": ["storage"],
  "IE-003": ["livestock-yard", "stables"],
  "IE-004": ["field-system"],
  "IE-005": ["water-management"],
  "IE-006": ["commons", "pasture", "woodland"],
  "IE-012": ["institutional-service"],
  "IE-013": ["fortification-works"],
  "IE-016": ["administrative-court"],
};

function visualFamily(surfaceKey: string): ManorFabricVisualFamily {
  return FAMILY_BY_SURFACE_KEY[surfaceKey] ?? "other_recorded_surface";
}

function stableInteger(parts: readonly string[]): number {
  return Number.parseInt(createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 8), 16);
}

function anchorRole(family: ManorFabricVisualFamily): "seat_core" | "seat_infield" | "estate_land" | "estate_edge" {
  if (family === "estate_core" || family === "administrative_court") return "seat_core";
  if (family === "storage_handling" || family === "livestock_stables" || family === "institutional_service") return "seat_infield";
  if (family === "fortification_works" || family === "water_management") return "estate_edge";
  return "estate_land";
}

function preferredParentHex(
  xmap: ManorFabricXmapSource,
  family: ManorFabricVisualFamily,
  subjectId: string,
): string {
  const role = anchorRole(family);
  if (role === "seat_core" || role === "seat_infield") return xmap.seat_hex_id;
  const eligible = xmap.hex_ids.filter((hexId) => hexId !== xmap.seat_hex_id).sort();
  const candidates = eligible.length > 0 ? eligible : [xmap.seat_hex_id];
  const selected = candidates[stableInteger([xmap.manor_id, subjectId, "parent-hex"]) % candidates.length];
  if (!selected) fail("no eligible parent hex is available for placement");
  return selected;
}

function fail(message: string): never {
  throw new Error(`CourtOS manor fabric visual facts unavailable: ${message}`);
}

/**
 * Joins admitted Manor Operations facts to XMAP extent and emits a renderer
 * contract. Existence, labels, condition, and project state remain source
 * facts. Parent-hex and rotation values are explicitly noncanonical layout
 * hints; the adapter never synthesizes a building/facility count or coordinate.
 */
export function compileCourtOsManorFabricVisualFactsV1({
  xmap,
  surfaces,
  projects,
  facilities,
  withheldSurfaces = [],
  manorOperationsRelease,
  xmapSource,
}: {
  xmap: ManorFabricXmapSource;
  surfaces: ManorFabricSurfaceSourceRow[];
  projects: ManorFabricProjectSourceRow[];
  facilities: ManorFabricFacilitySourceRow[];
  withheldSurfaces?: Array<{ asset_surface_id: string; surface_key: string; surface_name: string }>;
  manorOperationsRelease: string;
  xmapSource: string;
}): CourtOsManorFabricVisualFactsV1 {
  if (!xmap.manor_id || !xmap.seat_hex_id || xmap.hex_ids.length === 0 || !xmap.hex_ids.includes(xmap.seat_hex_id)) {
    fail("XMAP manor extent or seat identity is invalid");
  }
  if (surfaces.length === 0) fail("the selected manor has no admitted aggregate surface facts");
  if (surfaces.some((row) => row.manor_id !== xmap.manor_id)) fail("surface rows cross the selected manor boundary");
  if (new Set(surfaces.map((row) => row.asset_surface_id)).size !== surfaces.length) fail("aggregate surface identities are not unique");
  if (projects.some((row) => row.manor_id !== xmap.manor_id)) fail("project rows cross the selected manor boundary");
  if (facilities.some((row) => row.parent_manor_id !== xmap.manor_id)) fail("facility rows cross the selected manor boundary");

  const surfaceById = new Map(surfaces.map((row) => [row.asset_surface_id, row] as const));
  for (const project of projects) {
    if (!surfaceById.has(project.asset_surface_id)) fail(`project ${project.project_id} has no admitted parent surface`);
  }
  const projectById = new Map(projects.map((row) => [row.project_id, row] as const));
  for (const surface of surfaces) {
    if (surface.project_ids.some((projectId) => !projectById.has(projectId))) {
      fail(`surface ${surface.asset_surface_id} references a project outside the selected admitted projection`);
    }
  }

  const aggregateSurfaces = surfaces
    .map((row) => ({
      source_kind: "aggregate_estate_surface" as const,
      asset_surface_id: row.asset_surface_id,
      surface_key: row.surface_key,
      exact_label: row.surface_name,
      visual_family: visualFamily(row.surface_key),
      render_roles: [...(RENDER_ROLES_BY_SURFACE_KEY[row.surface_key] ?? ["recorded-surface" as const])],
      condition_kind: row.condition_kind,
      condition_state: row.condition_state,
      confidence: row.confidence,
      active_project_ids: [...row.project_ids].sort(),
      source_status: row.source_status,
    }))
    .sort((left, right) => left.surface_key.localeCompare(right.surface_key));

  const discreteFacilities = facilities
    .map((row) => ({
      source_kind: "discrete_facility" as const,
      facility_id: row.facility_id,
      facility_kind: row.facility_kind,
      exact_type: row.facility_type,
      parent_asset_surface_id: row.parent_asset_surface_id,
      parent_surface_key: row.parent_surface_key,
      operational_state: row.operational_state,
      fortification_posture: row.fortification_posture,
      condition_fact_state: row.condition_fact_state,
      source_status: row.source_status,
    }))
    .sort((left, right) => left.facility_id.localeCompare(right.facility_id));

  const activeImprovements = projects
    .filter((row) => !/^completed/.test(row.state_1120_candidate))
    .map((row) => ({
      project_id: row.project_id,
      asset_surface_id: row.asset_surface_id,
      surface_key: row.surface_key,
      exact_label: row.surface_name,
      project_kind: row.project_kind,
      action_class: row.action_class,
      start_year: row.start_year,
      expected_completion_year: row.expected_completion_year,
      progress_fraction: row.percent_complete_1120_candidate,
      state: row.state_1120_candidate,
      source_status: row.source_status,
    }))
    .sort((left, right) => left.project_id.localeCompare(right.project_id));

  const placementHints: CourtOsManorFabricVisualFactsV1["placement_hints"] = [
    ...aggregateSurfaces.map((surface) => {
      const active = surface.active_project_ids.some((projectId) => activeImprovements.some((project) => project.project_id === projectId));
      return {
        subject_kind: surface.source_kind,
        subject_id: surface.asset_surface_id,
        visual_family: surface.visual_family,
        placement_authority: "deterministic_renderer_hint_not_canonical_coordinate" as const,
        preferred_parent_hex_id: preferredParentHex(xmap, surface.visual_family, surface.asset_surface_id),
        anchor_role: anchorRole(surface.visual_family),
        stable_rotation_degrees: stableInteger([xmap.manor_id, surface.asset_surface_id, "rotation"]) % 360,
        condition_treatment: surface.condition_state,
        construction_treatment: active ? "active_works" as const : "completed_or_no_active_works" as const,
      };
    }),
    ...discreteFacilities.map((facility) => {
      const family = visualFamily(facility.parent_surface_key);
      const parentCondition: ManorFabricConditionState | "unknown_withheld" =
        surfaceById.get(facility.parent_asset_surface_id)?.condition_state ?? "unknown_withheld";
      const active = activeImprovements.some((project) => project.asset_surface_id === facility.parent_asset_surface_id);
      return {
        subject_kind: facility.source_kind,
        subject_id: facility.facility_id,
        visual_family: family,
        placement_authority: "deterministic_renderer_hint_not_canonical_coordinate" as const,
        preferred_parent_hex_id: preferredParentHex(xmap, family, facility.facility_id),
        anchor_role: anchorRole(family),
        stable_rotation_degrees: stableInteger([xmap.manor_id, facility.facility_id, "rotation"]) % 360,
        condition_treatment: parentCondition,
        construction_treatment: active ? "active_works" as const : "completed_or_no_active_works" as const,
      };
    }),
  ].sort((left, right) => left.subject_id.localeCompare(right.subject_id));

  const exemplar = surfaces[0];
  if (!exemplar) fail("the selected manor has no aggregate surface exemplar");
  return {
    schema_version: "courtos_manor_fabric_visual_facts_v1",
    effective_cutpoint: "1120-01-01",
    disposition: "admitted_existence_plus_interpretive_placement",
    source_truth_boundary: {
      admitted_existence_and_status: true,
      canonical_component_counts: false,
      canonical_facility_coordinates: false,
      renderer_may_invent_facility_existence: false,
    },
    manor: {
      ...xmap,
      display_name: exemplar.manor_label,
      county_name: exemplar.county_label,
      governing_actor_id: exemplar.governing_actor_id,
      governing_actor_name: exemplar.governing_actor_name,
    },
    aggregate_surfaces: aggregateSurfaces,
    discrete_facilities: discreteFacilities,
    withheld_surfaces: withheldSurfaces
      .map((surface) => ({
        asset_surface_id: surface.asset_surface_id,
        surface_key: surface.surface_key,
        exact_label: surface.surface_name,
        reason: "condition_unknown_withheld" as const,
      }))
      .sort((left, right) => left.surface_key.localeCompare(right.surface_key)),
    active_improvements: activeImprovements,
    placement_hints: placementHints,
    provenance: { manor_operations_release: manorOperationsRelease, xmap_source: xmapSource },
  };
}
