import { describe, expect, it } from "vitest";

import { createNewRun, proposeTurn } from "../../src/sim";
import {
  PERSON_CARD_REGISTRY_SCHEMA_VERSION,
  PERSON_CARD_VIEW_SCHEMA_VERSION,
  buildPersonCardRegistry,
} from "../../src/sim/domains/people/personCardRegistry";

describe("person card registry", () => {
  it("builds deterministic person-card views from the canonical people, kinship, succession, and service seams", () => {
    const one = buildPersonCardRegistry(createNewRun("person_card_registry_v035"));
    const two = buildPersonCardRegistry(createNewRun("person_card_registry_v035"));

    expect(one).toEqual(two);
    expect(one.schema_version).toBe(PERSON_CARD_REGISTRY_SCHEMA_VERSION);
    expect(one.person_ids.length).toBeGreaterThan(0);
    expect(one.entries_by_person_id.p_head).toMatchObject({
      schema_version: PERSON_CARD_VIEW_SCHEMA_VERSION,
      person_id: "p_head",
      court_member: true,
      court_role_labels: expect.arrayContaining(["Head of House"]),
      residence_binding: expect.objectContaining({
        residence_manor_id: "manor_hx_26597",
      }),
      lands_held_projection: expect.objectContaining({
        house_id: "h_player",
        holdings_count: expect.any(Number),
      }),
    });
    expect(one.entries_by_person_id.p_court_steward).toMatchObject({
      court_member: true,
      office_assignments: expect.arrayContaining([
        expect.objectContaining({
          title: "Steward",
        }),
      ]),
      service_timeline: expect.objectContaining({
        active_record_ids: expect.any(Array),
        entries: expect.arrayContaining([
          expect.objectContaining({
            title: "Steward",
          }),
        ]),
      }),
    });
  });

  it("marks married-out branches when kinship still points home but current house membership moved", () => {
    const state = createNewRun("person_card_married_out_v035") as any;
    const childId = "p_child1";
    const externalHouseId = "h_ext_01";

    state.people[childId].married = true;
    state.people[childId].house_id = externalHouseId;
    state.people[childId].residence_house_id = externalHouseId;
    state.houses[externalHouseId].member_person_ids = [
      ...(state.houses[externalHouseId].member_person_ids ?? []),
      childId,
    ].sort();

    const registry = buildPersonCardRegistry(state);
    expect(registry.entries_by_person_id[childId]).toMatchObject({
      current_house_id: externalHouseId,
      birth_house_id: "h_player",
      married_out: true,
      family_projection: expect.objectContaining({
        married_out: true,
      }),
    });
  });

  it("attaches hidden person-card surfaces to preview state and mirrored household members", () => {
    const ctx = proposeTurn(createNewRun("person_card_preview_v035"));
    const previewState: any = ctx.preview_state;

    expect(previewState.person_card_registry.schema_version).toBe(PERSON_CARD_REGISTRY_SCHEMA_VERSION);
    expect(previewState.people.p_head.person_card_view).toEqual(previewState.person_card_registry.entries_by_person_id.p_head);
    expect(previewState.house.head.person_card_view).toEqual(previewState.person_card_registry.entries_by_person_id.p_head);
    expect(Object.prototype.propertyIsEnumerable.call(previewState, "person_card_registry")).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(previewState.people.p_head, "person_card_view")).toBe(false);
  });
});
