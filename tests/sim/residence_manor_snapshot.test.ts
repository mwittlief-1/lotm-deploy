import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import { boundedSnapshot } from "../../src/sim/domains/experience/reporting";

describe("residence manor snapshot surfaces", () => {
  it("attaches hidden residence manor fields to preview state without changing bounded top-level keys", () => {
    const state = createNewRun("residence_manor_preview_v031");
    const ctx = proposeTurn(state);
    const previewState: any = ctx.preview_state;

    expect(previewState.people.p_head.residence_manor_id).toBe("manor_hx_26597");
    expect(previewState.house.head.residence_manor_id).toBe("manor_hx_26597");
    expect(previewState.people.p_head.residence_distance_hook).toMatchObject({
      person_id: "p_head",
      residence_manor_id: "manor_hx_26597",
      travel_cost_distance: 0,
      route_hop_distance: 0,
    });
    expect(previewState.residence_selector_summary).toMatchObject({
      schema_version: "residence_selector_summary_v0",
      anchor_manor_id: "manor_hx_26597",
    });
    expect(previewState.house.residence_distance_hooks).toEqual(previewState.residence_distance_hooks);
    expect(Object.prototype.propertyIsEnumerable.call(previewState.people.p_head, "residence_manor_id")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(previewState, "residence_selector_summary")).toBe(false);
  });

  it("attaches hidden residence selectors and distance hooks to bounded snapshots without serializing them", () => {
    const state = createNewRun("residence_manor_snapshot_v031");
    const snapshot: any = boundedSnapshot(state);
    const serialized = JSON.parse(JSON.stringify(snapshot));

    expect(snapshot.people.p_head.residence_manor_id).toBe("manor_hx_26597");
    expect(snapshot.house.head.residence_manor_id).toBe("manor_hx_26597");
    expect(snapshot.people.p_head.residence_distance_hook).toMatchObject({
      travel_cost_distance: 0,
      route_hop_distance: 0,
    });
    expect(snapshot.residence_selector_summary).toMatchObject({
      schema_version: "residence_selector_summary_v0",
      anchor_manor_id: "manor_hx_26597",
    });
    expect(snapshot.residence_distance_hooks).toMatchObject({
      schema_version: "residence_distance_hooks_v0",
      anchor_manor_id: "manor_hx_26597",
    });
    expect(serialized.residence_selector_summary).toBeUndefined();
    expect(serialized.residence_distance_hooks).toBeUndefined();
    expect(serialized.people.p_head.residence_manor_id).toBeUndefined();
    expect(serialized.house.head.residence_manor_id).toBeUndefined();
    expect(Object.prototype.propertyIsEnumerable.call(snapshot.people.p_head, "residence_manor_id")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(snapshot, "residence_selector_summary")).toBe(false);
  });
});
