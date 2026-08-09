import { describe, expect, it } from "vitest";

import { compileCourtOsManorFabricVisualFactsV1 } from "../../src/server/courtos1120Api/manorFabricVisualAdapter";
import { loadFoundationAManorFabricVisualFactsV1 } from "../../src/server/courtos1120Api/manorFabricVisualSource.node";

describe("CourtOS Manor Fabric visual adapter", () => {
  it("emits Roadcote's admitted fabric and active fortification work without inventing counts or coordinates", async () => {
    const result = await loadFoundationAManorFabricVisualFactsV1({ manorId: "manor_hx_44835" });

    expect(result.manor).toMatchObject({
      manor_id: "manor_hx_44835",
      display_name: "Manor of Roadcote Court",
      county_name: "Glastonmere",
      governing_actor_id: "t0h_bcae5bd911ab10f4c7fdfea0",
      governing_actor_name: "House Pearwick Hall",
      seat_hex_id: "hx_44835",
    });
    expect(result.manor.hex_ids).toHaveLength(9);
    expect(result.aggregate_surfaces.map(({ surface_key, condition_state, render_roles }) => ({
      surface_key,
      condition_state,
      render_roles,
    }))).toEqual([
      { surface_key: "IE-001", condition_state: "sound", render_roles: ["estate-core", "working-yard"] },
      { surface_key: "IE-002", condition_state: "sound", render_roles: ["storage"] },
      { surface_key: "IE-003", condition_state: "repairing", render_roles: ["livestock-yard", "stables"] },
      { surface_key: "IE-004", condition_state: "worn", render_roles: ["field-system"] },
      { surface_key: "IE-006", condition_state: "sound", render_roles: ["commons", "pasture", "woodland"] },
      { surface_key: "IE-013", condition_state: "under_construction", render_roles: ["fortification-works"] },
      { surface_key: "IE-016", condition_state: "sound", render_roles: ["administrative-court"] },
    ]);
    expect(result.active_improvements).toEqual([
      expect.objectContaining({
        project_id: "impproj_step5ec_ae97998be6dae2",
        exact_label: "Castle, Fortification & Garrison Works",
        start_year: 1118,
        expected_completion_year: 1121,
        progress_fraction: 0.6667,
        state: "under_construction_at_1120",
      }),
    ]);
    expect(result.discrete_facilities).toEqual([
      expect.objectContaining({
        source_kind: "discrete_facility",
        facility_id: "impproj_step5ec_ae97998be6dae2",
        exact_type: "fortification_or_garrison_work",
        operational_state: "future_not_operational",
      }),
    ]);
    expect(result.source_truth_boundary).toEqual({
      admitted_existence_and_status: true,
      canonical_component_counts: false,
      canonical_facility_coordinates: false,
      renderer_may_invent_facility_existence: false,
    });
    expect(JSON.stringify({
      aggregate_surfaces: result.aggregate_surfaces,
      discrete_facilities: result.discrete_facilities,
      active_improvements: result.active_improvements,
      placement_hints: result.placement_hints,
    })).not.toMatch(/component_count|canonical_[qxy]|latitude|longitude/);
  });

  it("keeps deterministic placement hints inside the XMAP estate and marks them as noncanonical", async () => {
    const first = await loadFoundationAManorFabricVisualFactsV1({ manorId: "manor_hx_44835" });
    const second = await loadFoundationAManorFabricVisualFactsV1({ manorId: "manor_hx_44835" });

    expect(second.placement_hints).toEqual(first.placement_hints);
    expect(first.placement_hints).toHaveLength(first.aggregate_surfaces.length + first.discrete_facilities.length);
    expect(first.placement_hints.every((hint) => (
      hint.placement_authority === "deterministic_renderer_hint_not_canonical_coordinate" &&
      first.manor.hex_ids.includes(hint.preferred_parent_hex_id)
    ))).toBe(true);
    expect(first.placement_hints.find((hint) => hint.subject_id === "estate_surface_d05eb591005ee871dbe5")).toMatchObject({
      anchor_role: "seat_core",
      preferred_parent_hex_id: "hx_44835",
      condition_treatment: "sound",
    });
    expect(first.placement_hints.find((hint) => hint.subject_id === "estate_surface_47dfbcb2abad2900906f")).toMatchObject({
      visual_family: "fortification_works",
      condition_treatment: "under_construction",
      construction_treatment: "active_works",
    });
  });

  it("fails closed when an improvement has no admitted parent surface", () => {
    expect(() => compileCourtOsManorFabricVisualFactsV1({
      xmap: {
        manor_id: "manor_test",
        county_id: "c_test",
        seat_hex_id: "hx_1",
        hex_ids: ["hx_1"],
        holding_type: "minor_lordship",
        manor_size_class: "small",
        seat_archetype: "ordinary",
        is_seat_complex: false,
        estimated_peasant_households: 10,
        avg_buildability_score: 0.5,
        avg_water_access_score: 0.5,
        defensibility_score: 0.5,
        route_access_score: 0.5,
        total_net_productive_capacity: 1,
      },
      surfaces: [{
        condition_observation_id: "condition_1",
        asset_surface_id: "surface_1",
        manor_id: "manor_test",
        manor_label: "Test Manor",
        county_id: "c_test",
        county_label: "Test County",
        governing_actor_id: "house_test",
        governing_actor_name: "House Test",
        surface_key: "IE-001",
        surface_name: "Estate Core & Working Yard",
        condition_kind: "physical_condition",
        condition_state: "sound",
        observation_cutpoint: "1120-01-01",
        project_ids: ["project_missing_parent"],
        source_status: "admitted",
        confidence: "candidate_medium",
        uat1_display_state: "admitted",
      }],
      projects: [{
        project_id: "project_missing_parent",
        manor_id: "manor_test",
        asset_surface_id: "surface_other",
        surface_key: "IE-013",
        surface_name: "Fortification Works",
        project_kind: "special_program",
        action_class: "build",
        start_year: 1118,
        expected_completion_year: 1121,
        percent_complete_1120_candidate: 0.5,
        state_1120_candidate: "under_construction_at_1120",
        source_status: "admitted",
        uat1_display_state: "admitted",
      }],
      facilities: [],
      manorOperationsRelease: "release",
      xmapSource: "xmap",
    })).toThrow(/no admitted parent surface/);
  });
});
