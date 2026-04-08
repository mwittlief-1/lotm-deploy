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
    expect(serialized.economy_obligations_view).toMatchObject({
      schema_version: "economy_obligations_view_v1",
      counterparty_order: ["liege", "church"]
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
    expect(serialized.succession_line_summary).toMatchObject({
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
    expect(serialized.claimant_summary).toMatchObject({
      schema_version: "claimant_summary_v0",
      house_id: "h_player",
      entries: expect.arrayContaining([
        expect.objectContaining({
          claimant_person_id: expect.any(String),
          claimant_name: expect.any(String),
        }),
      ]),
    });
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
    expect((snapshot as any).beliefs).toEqual((state as any).beliefs);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "beliefs")).toBe(false);
  });
});
