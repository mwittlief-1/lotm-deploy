import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { buildHouseDossierSurface, listHouseDossierIds } from "../../src/ui/houseDossierView";

function makePersonCardRecord(overrides: Partial<any> = {}) {
  return {
    age: 52,
    alive: true,
    birth_house_id: "h_hartwyck",
    birth_house_name: "Hartwyck",
    court_member: false,
    court_role_labels: [],
    current_house_id: "h_hartwyck",
    current_house_name: "Hartwyck",
    family_projection: {
      children: [],
      family_person_ids: [],
      kinship_tags: [],
      married_out: false,
      parents: [],
      siblings: [],
      spouse: null
    },
    known_house_relevance_reasons: [],
    known_house_relevance_tier: null,
    lands_held_projection: {
      anchor_manor_id: null,
      holdings_band: "single_holding",
      holdings_count: 1,
      house_holdings_status: "coarse_house_only",
      house_id: "h_hartwyck",
      house_name: "Hartwyck",
      known_manor_ids: [],
      personal_holdings_status: "not_exposed_on_this_seam"
    },
    married_out: false,
    office_assignments: [],
    person_id: "p_head_default",
    person_name: "Edmund Hartwyck",
    residence_binding: {
      distance_band: "near",
      residence_manor_id: "hx_18",
      route_hop_distance: 1,
      selector_contexts: ["known_house"],
      source_kind: "known_house",
      source_ref_id: "ref:p_head_default",
      travel_cost_distance: 1
    },
    schema_version: "person_card_view_v1",
    service_timeline: {
      active_record_ids: [],
      entries: []
    },
    short_id: null,
    sex: "M",
    succession_projection: {
      adult_eligible: true,
      adult_line_position: null,
      adult_successor_id: null,
      blocked_by_current_heir: null,
      claim_window_open: false,
      claimant_adult_position: null,
      claimant_position: null,
      current_heir: false,
      current_heir_id: null,
      line_position: null,
      player_house_relevance_reasons: []
    },
    ...overrides
  };
}

describe("houseDossierView", () => {
  it("lists canonical dossier ids and resolves routed dossier surfaces from preview state only", () => {
    const state = createNewRun("house_dossier_surface");
    const ctx = proposeTurn(state);
    const dossierIds = listHouseDossierIds(ctx.preview_state);
    const prospectId =
      (ctx.preview_state.house_dossiers ?? []).find((dossier) => dossier.knownness !== "known_house")?.house_id ?? dossierIds[0];

    expect(dossierIds.length).toBeGreaterThan(10);
    expect(dossierIds).toEqual([...dossierIds].sort());

    const surface = buildHouseDossierSurface(ctx.preview_state, prospectId);
    expect(surface).not.toBeNull();
    expect(surface?.houseId).toBe(prospectId);
    expect(surface?.debugRows.map((row) => row.key)).toEqual([
      "schema_version",
      "house_id",
      "house_name",
      "tier",
      "relevance_tier",
      "relevance_reasons",
      "knownness",
      "knownness_sources",
      "kinship_summary",
      "kinship_tags",
      "relationship_summary",
      "relationship_turn_movement_count",
      "relationship_turn_movement_rows",
      "household_scope",
      "household_member_count",
      "living_member_count",
      "child_count",
      "has_male_heir",
      "heiress_possible",
      "holdings_count",
      "holdings_band",
      "anchor_manor_id",
      "known_manor_ids",
      "source_kind",
      "ledger_band",
      "ledger_trend"
    ]);
    expect(surface?.relationshipPostureLabel).toBe(surface?.relationshipSummary?.standingBandLabel ?? "Unknown");
    expect(surface?.helperText).toContain("Standing posture comes from the current relationship summary");
    expect(surface?.knownnessHelperText.length ?? 0).toBeGreaterThan(0);
    expect(surface?.holdingsFootprintHelperText.length ?? 0).toBeGreaterThan(0);
  });

  it("reuses consistent house and head identifiers when nearby house names repeat", () => {
    const previewState = {
      house_dossiers: [
        {
          child_count: 0,
          has_male_heir: true,
          heiress_possible: false,
          holdings_footprint: {
            anchor_manor_id: "hx_18",
            holdings_band: "single_holding",
            holdings_count: 1,
            known_manor_ids: ["hx_18"],
            source_kind: "house_seed"
          },
          household_member_count: 1,
          household_scope: "head_only",
          house_id: "h_hartwyck_count",
          house_name: "Hartwyck",
          kinship_summary: "none",
          kinship_tags: [],
          knownness: "known_house",
          knownness_sources: ["nearby_house"],
          ledger_band: "stable",
          ledger_trend: "flat",
          living_member_count: 1,
          relevance_reasons: ["nearby_house"],
          relevance_tier: "tier1",
          relationship_summary: null,
          relationship_turn_movement_count: 0,
          relationship_turn_movement_rows: [],
          schema_version: "house_dossier_summary_v2",
          tier: "Count"
        },
        {
          child_count: 0,
          has_male_heir: true,
          heiress_possible: false,
          holdings_footprint: {
            anchor_manor_id: "hx_25",
            holdings_band: "single_holding",
            holdings_count: 1,
            known_manor_ids: ["hx_25"],
            source_kind: "house_seed"
          },
          household_member_count: 1,
          household_scope: "head_only",
          house_id: "h_hartwyck_baron",
          house_name: "Hartwyck",
          kinship_summary: "none",
          kinship_tags: [],
          knownness: "known_house",
          knownness_sources: ["nearby_house"],
          ledger_band: "stable",
          ledger_trend: "flat",
          living_member_count: 1,
          relevance_reasons: ["nearby_house"],
          relevance_tier: "tier1",
          relationship_summary: null,
          relationship_turn_movement_count: 0,
          relationship_turn_movement_rows: [],
          schema_version: "house_dossier_summary_v2",
          tier: "Baron"
        }
      ],
      known_houses: [
        {
          has_male_heir: true,
          head_age: 54,
          head_id: "p_edmund_count",
          head_name: "Edmund Hartwyck",
          head_short_id: null,
          head_status: "Alive",
          heiress_possible: false,
          heir_indicator: "has_male_heir",
          house_id: "h_hartwyck_count",
          house_name: "Hartwyck",
          relationship: null,
          relevance_reasons: ["nearby_house"],
          relevance_tier: "tier1",
          tier: "Count"
        },
        {
          has_male_heir: true,
          head_age: 38,
          head_id: "p_edmund_baron",
          head_name: "Edmund Hartwyck",
          head_short_id: null,
          head_status: "Alive",
          heiress_possible: false,
          heir_indicator: "has_male_heir",
          house_id: "h_hartwyck_baron",
          house_name: "Hartwyck",
          relationship: null,
          relevance_reasons: ["nearby_house"],
          relevance_tier: "tier1",
          tier: "Baron"
        }
      ],
      person_card_registry: {
        entries_by_person_id: {
          p_edmund_baron: makePersonCardRecord({
            age: 38,
            current_house_id: "h_hartwyck_baron",
            current_house_name: "Hartwyck",
            person_id: "p_edmund_baron",
            residence_binding: {
              distance_band: "near",
              residence_manor_id: "hx_25",
              route_hop_distance: 2,
              selector_contexts: ["known_house"],
              source_kind: "known_house",
              source_ref_id: "ref:p_edmund_baron",
              travel_cost_distance: 2
            }
          }),
          p_edmund_count: makePersonCardRecord({
            age: 54,
            current_house_id: "h_hartwyck_count",
            current_house_name: "Hartwyck",
            person_id: "p_edmund_count",
            residence_binding: {
              distance_band: "near",
              residence_manor_id: "hx_18",
              route_hop_distance: 1,
              selector_contexts: ["known_house"],
              source_kind: "known_house",
              source_ref_id: "ref:p_edmund_count",
              travel_cost_distance: 1
            }
          })
        },
        person_ids: ["p_edmund_count", "p_edmund_baron"],
        schema_version: "person_card_registry_v1"
      }
    } as any;

    const countSurface = buildHouseDossierSurface(previewState, "h_hartwyck_count");
    const baronSurface = buildHouseDossierSurface(previewState, "h_hartwyck_baron");

    expect(countSurface?.subtitle).toBe("Count · Head Edmund Hartwyck · Anchor Hx 18");
    expect(baronSurface?.subtitle).toBe("Baron · Head Edmund Hartwyck · Anchor Hx 25");
    expect(countSurface?.relatedPeople[0]?.detail).toContain("Age 54 · House Hartwyck · Resides Hx 18");
    expect(baronSurface?.relatedPeople[0]?.detail).toContain("Age 38 · House Hartwyck · Resides Hx 25");
  });
});
