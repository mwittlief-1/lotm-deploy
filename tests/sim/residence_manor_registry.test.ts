import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import { syncLegacyHouseCourtServiceRecords } from "../../src/sim/domains/court/officeRegistry";
import { assignInstitutionHolder } from "../../src/sim/domains/people/institutionHolderRegistry";
import {
  buildResidenceDistanceHooks,
  buildResidenceSelectorSummary,
  ensureResidenceManorBindings,
} from "../../src/sim/domains/people/residenceManorRegistry";

describe("residence manor registry", () => {
  it("assigns the player household and local seeded roles to the anchor manor deterministically", () => {
    const state = createNewRun("residence_manor_registry_v031");

    const one = buildResidenceSelectorSummary(state);
    const two = buildResidenceSelectorSummary(state);

    expect(one).toEqual(two);
    expect(one.anchor_manor_id).toBe("manor_hx_26597");
    expect(one.entries_by_person_id.p_head).toMatchObject({
      residence_manor_id: "manor_hx_26597",
      source_kind: "player_anchor_manor",
      source_ref_id: "h_player",
      selector_contexts: ["household"],
    });
    expect(one.entries_by_person_id.p_clergy).toMatchObject({
      residence_manor_id: "manor_hx_26597",
      source_kind: "local_parish_anchor",
      source_ref_id: "i_parish_player_local",
      selector_contexts: expect.arrayContaining(["clergy", "household"]),
    });
    expect(one.entries_by_person_id.p_court_steward).toMatchObject({
      residence_manor_id: "manor_hx_26597",
      source_kind: "service_target_anchor",
      source_ref_id: "h_player",
      selector_contexts: expect.arrayContaining(["household", "office", "service"]),
    });
  });

  it("keeps external marriage candidates explicitly unmapped until a player-side transition occurs", () => {
    const state = createNewRun("residence_manor_registry_prospect_v031");
    const candidateId = "p_ext_01_head";

    const summary = buildResidenceSelectorSummary(state);

    expect(summary.entries_by_person_id[candidateId]).toMatchObject({
      residence_manor_id: null,
      source_kind: "external_house_unmapped",
      selector_contexts: ["external_house"],
    });
  });

  it("hydrates hidden residence fields and distance hooks without making them enumerable", () => {
    const state = createNewRun("residence_manor_registry_hidden_v031");
    const surfaces = ensureResidenceManorBindings(state);
    const hooks = buildResidenceDistanceHooks(state, { selector_summary: surfaces.selector_summary });

    expect((state as any).people.p_head.residence_manor_id).toBe("manor_hx_26597");
    expect((state as any).people.p_head.residence_distance_hook).toMatchObject({
      person_id: "p_head",
      residence_manor_id: "manor_hx_26597",
      travel_cost_distance: 0,
      route_hop_distance: 0,
    });
    expect((state.house.head as any).residence_manor_id).toBe("manor_hx_26597");
    expect((state as any).residence_selector_summary).toEqual(surfaces.selector_summary);
    expect((state.house as any).residence_distance_hooks).toEqual(hooks);
    expect(Object.prototype.propertyIsEnumerable.call((state as any).people.p_head, "residence_manor_id")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(state as any, "residence_selector_summary")).toBe(false);
  });

  it("updates marriage, clergy, and office-derived bindings coherently after transitions", () => {
    const state = createNewRun("residence_manor_registry_transitions_v031") as any;
    const candidateId = "p_ext_01_head";
    state.people.p_child2.age = 16;
    state.people.p_child2.sex = "M";
    const childTwo = state.house.children.find((child: any) => child.id === "p_child2");
    if (childTwo) {
      childTwo.age = 16;
      childTwo.sex = "M";
    }

    if (state.people[candidateId!]) {
      state.people[candidateId!].house_id = "h_player";
      state.people[candidateId!].residence_house_id = "h_player";
    }

    assignInstitutionHolder(state, {
      institution_id: "i_parish_player_local",
      person_id: "p_child2",
      track_kind: "holy_orders",
      turn_index: 2,
    });

    state.house.court_officers = { steward: candidateId };
    syncLegacyHouseCourtServiceRecords(state, state.house.court_officers);
    const surfaces = ensureResidenceManorBindings(state);

    expect(surfaces.selector_summary.entries_by_person_id[String(candidateId)]).toMatchObject({
      residence_manor_id: "manor_hx_26597",
      source_kind: "service_target_anchor",
      selector_contexts: expect.arrayContaining(["household", "office", "service"]),
    });
    expect(surfaces.selector_summary.entries_by_person_id.p_child2).toMatchObject({
      residence_manor_id: "manor_hx_26597",
      source_kind: "local_parish_anchor",
      selector_contexts: expect.arrayContaining(["clergy", "household"]),
    });
  });
});
