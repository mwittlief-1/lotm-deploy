import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import { boundedSnapshot } from "../../src/sim/domains/experience/reporting";
import { buildBoundedRegistryManifest, RUN_STATE_SCHEMA_VERSION } from "../../src/sim/stateSchema";

describe("bounded snapshot contract", () => {
  it("serializes only bounded fields while retaining version metadata", () => {
    const state = createNewRun("bounded_snapshot_contract_v031");
    (state as any).beliefs = {
      schema_version: "belief_registry_v0",
      evidence_by_person_id: {}
    };
    const snapshot = boundedSnapshot(state);
    const serialized = JSON.parse(JSON.stringify(snapshot));

    expect(serialized.state_schema_version).toBe(RUN_STATE_SCHEMA_VERSION);
    expect(serialized.bounded_registry_manifest).toEqual(buildBoundedRegistryManifest());
    expect(serialized.economy).toEqual(state.economy);
    expect(serialized.economy_maintenance_view).toMatchObject({
      schema_version: "economy_maintenance_view_v1",
      manor_keys: ["portfolio:player_portfolio:manor:manor_hx_26597"]
    });
    expect(serialized.economy_obligations_view).toMatchObject({
      schema_version: "economy_obligations_view_v1",
      counterparty_order: ["liege", "church"],
      receipt_group_order: ["payment", "penalty", "seizure"]
    });
    expect(serialized.economy_pricing_view).toMatchObject({
      schema_version: "economy_pricing_view_v1",
      reference_order: [
        "food_stores_market_sell",
        "meat_stores_market_sell_placeholder",
        "farm_labor_turn_placeholder",
        "builder_labor_turn_placeholder"
      ]
    });
    expect(serialized.court_delegation_view).toMatchObject({
      schema_version: "court_delegation_view_v0",
      action_keys: ["gift_liege", "offering_church", "marriage_scout", "maintenance"],
      active_action_keys: []
    });
    expect(Array.isArray(serialized.known_houses)).toBe(true);
    expect(serialized.known_houses.length).toBeGreaterThan(0);
    expect(serialized.known_houses[0]).toMatchObject({
      house_id: expect.any(String),
      house_name: expect.any(String),
      relationship: {
        allegiance: expect.any(Number),
        respect: expect.any(Number),
        threat: expect.any(Number)
      }
    });
    expect(serialized.house_dossiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schema_version: "house_dossier_summary_v2",
          house_id: expect.any(String),
          kinship_summary: expect.any(String),
          knownness: expect.any(String),
          relationship_summary: expect.any(Object),
          relationship_turn_movement_count: expect.any(Number),
          relationship_turn_movement_rows: expect.any(Array),
          holdings_footprint: expect.any(Object),
          ledger_band: expect.any(String),
          ledger_trend: expect.any(String)
        })
      ])
    );
    expect(serialized.house_dossiers.length).toBeLessThanOrEqual(24);
    const dossierWithRelationship = serialized.house_dossiers.find((dossier: any) => dossier.relationship_summary);
    const dossierWithHoldings = serialized.house_dossiers.find((dossier: any) => dossier.holdings_footprint);
    expect(dossierWithRelationship?.knownness_sources).toBeUndefined();
    expect(dossierWithRelationship?.relationship_summary).toMatchObject({
      favor_score: expect.any(Number),
      allegiance: expect.any(Number),
      respect: expect.any(Number),
      threat: expect.any(Number),
      standing_band: expect.any(String)
    });
    expect(dossierWithRelationship?.relationship_band).toBeUndefined();
    expect(dossierWithHoldings?.holdings_footprint?.known_manor_ids).toBeUndefined();
    expect(dossierWithHoldings?.kinship_tags).toEqual(expect.any(Array));
    expect((snapshot as any).succession_line_summary).toMatchObject({
      schema_version: "succession_line_summary_v0",
      house_id: "h_player",
      entries: expect.arrayContaining([
        expect.objectContaining({
          person_id: expect.any(String),
          person_name: expect.any(String),
          line_position: expect.any(Number),
        }),
      ]),
    });
    expect((snapshot as any).claimant_summary).toMatchObject({
      schema_version: "claimant_summary_v0",
      house_id: "h_player",
      entries: expect.arrayContaining([
        expect.objectContaining({
          claimant_person_id: expect.any(String),
          claimant_name: expect.any(String),
        }),
      ]),
    });
    expect((snapshot as any).person_card_registry).toMatchObject({
      schema_version: "person_card_registry_v1",
      person_ids: expect.any(Array),
    });
    expect(Object.prototype.hasOwnProperty.call(snapshot, "outbound_marriage_scouting_registry")).toBe(true);
    if ((snapshot as any).outbound_marriage_scouting_registry) {
      expect((snapshot as any).outbound_marriage_scouting_registry).toMatchObject({
        schema_version: "outbound_marriage_scouting_registry_v1",
        candidate_ids: expect.any(Array),
      });
    }
    expect((snapshot as any).court_provisioning_view).toMatchObject({
      schema_version: "court_provisioning_view_v1",
      person_ids: expect.any(Array),
      fiscal_policy: {
        schema_version: "court_provisioning_fiscal_policy_v1",
        person_ids: expect.any(Array),
      },
    });
    expect((snapshot as any).court_stipend_registry).toMatchObject({
      schema_version: "court_stipend_registry_v1",
      stipend_keys: expect.any(Array),
    });
    expect((snapshot as any).people.p_head.person_card_view).toMatchObject({
      schema_version: "person_card_view_v1",
      person_id: "p_head",
    });
    expect((snapshot as any).people.p_head.court_provisioning_entry).toMatchObject({
      schema_version: "court_provisioning_entry_v1",
      person_id: "p_head",
      ration_policy: {
        schema_version: "court_provisioning_ration_policy_v1",
      },
    });
    expect(serialized.succession_line_summary).toBeUndefined();
    expect(serialized.claimant_summary).toBeUndefined();
    expect(serialized.person_card_registry).toBeUndefined();
    expect(serialized.outbound_marriage_scouting_registry).toBeUndefined();
    expect(serialized.court_provisioning_view).toBeUndefined();
    expect(serialized.court_stipend_registry).toBeUndefined();
    expect(serialized.world_topology_view).toMatchObject({
      schema_version: "world_topology_snapshot_v1",
      anchor_manor_id: "manor_hx_26597",
      far_threshold: null,
      distance_sample_limit: 8,
      distance_sample_total: 387
    });
    expect(serialized.map_view_snapshot).toMatchObject({
      schema_version: "map_view_snapshot_v1",
      anchor_manor_id: "manor_hx_26597",
      row_ordering: "anchor_first_then_manor_id"
    });
    expect(serialized.map_view_snapshot?.rows?.[0]).toMatchObject({
      manor_id: "manor_hx_26597",
      seat_q: 183,
      seat_r: 94,
      owner_actor_id: "actor_abbey_hx_28841"
    });
    expect(serialized.portfolio).toEqual(state.portfolio);
    expect(serialized.log).toBeUndefined();
    expect(serialized.institutions).toBeUndefined();
    expect(serialized.service_records).toBeUndefined();
    expect(serialized.beliefs).toBeUndefined();
    expect(serialized.ai_rail_debug_packet).toBeUndefined();
    expect(serialized.grant_eligibility).toBeUndefined();
    expect(serialized.grant_source_registry).toBeUndefined();
    expect(serialized.grant_dossier_summaries).toBeUndefined();
    expect(serialized.acquisition_prospects_window).toBeUndefined();
    expect((snapshot as any).beliefs).toEqual((state as any).beliefs);
    expect((snapshot as any).ai_rail_debug_packet).toMatchObject({
      schema_version: "ai_rail_debug_packet_v1",
      turn_index: state.turn_index,
      read_mode: "read_only",
      beliefs: {
        schema_version: "belief_payload_registry_v1",
        subject_ids: []
      },
      current_evidence: {
        schema_version: "domain_evidence_log_v1"
      },
      policy_hooks: {
        schema_version: "policy_hook_debug_v1",
        hook_order: ["marriage_offer", "prospect"]
      }
    });
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "beliefs")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "ai_rail_debug_packet")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "succession_line_summary")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "claimant_summary")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "person_card_registry")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "outbound_marriage_scouting_registry")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "court_provisioning_view")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "court_stipend_registry")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "grant_eligibility")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "grant_source_registry")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "grant_dossier_summaries")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "acquisition_prospects_window")).toBe(false);
  });
});
