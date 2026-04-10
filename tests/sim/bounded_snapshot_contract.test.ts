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
          schema_version: "house_dossier_summary_v1",
          house_id: expect.any(String),
          relationship_band: expect.any(String),
          kinship_summary: expect.any(String)
        })
      ])
    );
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
    expect(serialized.succession_line_summary).toBeUndefined();
    expect(serialized.claimant_summary).toBeUndefined();
    expect(serialized.world_topology_view).toMatchObject({
      schema_version: "world_topology_snapshot_v1",
      anchor_manor_id: "manor_hx_26597",
      far_threshold: null,
      distance_sample_limit: 8,
      distance_sample_total: 387
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
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "grant_eligibility")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "grant_source_registry")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "grant_dossier_summaries")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "acquisition_prospects_window")).toBe(false);
  });
});
