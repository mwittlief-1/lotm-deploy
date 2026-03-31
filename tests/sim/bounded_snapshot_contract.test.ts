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
