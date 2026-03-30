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
    expect(serialized.portfolio).toEqual(state.portfolio);
    expect(serialized.log).toBeUndefined();
    expect(serialized.institutions).toBeUndefined();
    expect(serialized.service_records).toBeUndefined();
    expect(serialized.beliefs).toBeUndefined();
    expect((snapshot as any).beliefs).toEqual((state as any).beliefs);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "beliefs")).toBe(false);
  });
});
