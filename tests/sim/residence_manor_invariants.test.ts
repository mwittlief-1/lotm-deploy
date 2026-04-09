import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import {
  buildResidenceSelectorSummary,
  ensureResidenceManorBindings,
} from "../../src/sim/domains/people/residenceManorRegistry";

describe("residence manor invariants", () => {
  it("locks the canonical player-local manor bindings and selector ordering", () => {
    const state = createNewRun("residence_manor_invariants_v031");
    const summary = buildResidenceSelectorSummary(state);

    expect(summary.anchor_manor_id).toBe("manor_hx_26597");
    expect(summary.person_ids).toEqual([...summary.person_ids].sort());
    expect(summary.entries_by_person_id.p_head).toMatchObject({
      residence_manor_id: "manor_hx_26597",
      source_kind: "player_anchor_manor",
      source_ref_id: "h_player",
      selector_contexts: ["household"],
    });
    expect(summary.entries_by_person_id.p_clergy).toMatchObject({
      residence_manor_id: "manor_hx_26597",
      source_kind: "local_parish_anchor",
      source_ref_id: "i_parish_player_local",
      selector_contexts: expect.arrayContaining(["clergy", "household"]),
    });
    expect(summary.entries_by_person_id.p_court_steward).toMatchObject({
      residence_manor_id: "manor_hx_26597",
      source_kind: "service_target_anchor",
      source_ref_id: "h_player",
      selector_contexts: expect.arrayContaining(["household", "office", "service"]),
    });
    expect(summary.entries_by_person_id.p_ext_01_head).toMatchObject({
      residence_manor_id: null,
      source_kind: "external_house_unmapped",
      selector_contexts: ["external_house"],
    });
  });

  it("keeps manor bindings hidden from serialized run-state output", () => {
    const state = createNewRun("residence_manor_invariants_hidden_v031") as any;
    ensureResidenceManorBindings(state);
    const serialized = JSON.parse(JSON.stringify(state));

    expect(state.people.p_head.residence_manor_id).toBe("manor_hx_26597");
    expect(state.residence_selector_summary).toMatchObject({
      schema_version: "residence_selector_summary_v0",
      anchor_manor_id: "manor_hx_26597",
    });
    expect(serialized.residence_selector_summary).toBeUndefined();
    expect(serialized.residence_distance_hooks).toBeUndefined();
    expect(serialized.people.p_head.residence_manor_id).toBeUndefined();
    expect(serialized.house.head.residence_manor_id).toBeUndefined();
  });
});
