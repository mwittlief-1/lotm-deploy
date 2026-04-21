import { describe, expect, it } from "vitest";

import { applyDecisions, createNewRun, proposeTurn } from "../../src/sim";
import {
  COURT_PROVISIONING_VIEW_SCHEMA_VERSION,
  COURT_STIPEND_REGISTRY_SCHEMA_VERSION,
  buildCourtProvisioningView,
  buildCourtStipendRegistry,
} from "../../src/sim/domains/people/courtProvisioningRegistry";
import { buildPersonCardRegistry } from "../../src/sim/domains/people/personCardRegistry";
import { createDefaultDecisions } from "../../src/sim/turn";

function buildAcceptedMarriagePreview(seed: string) {
  const state = createNewRun(seed) as any;
  const child = state.house.children[0];
  if (!child) throw new Error("Expected a child eligible for marriage setup.");

  child.age = 18;
  child.married = false;
  child.sex = "M";
  if (state.people?.[child.id]) {
    state.people[child.id].age = 18;
    state.people[child.id].married = false;
    state.people[child.id].sex = "M";
  }
  if (state.locals?.nobles?.[0]) {
    state.locals.nobles[0].sex = "F";
    if (state.people?.[state.locals.nobles[0].id]) {
      state.people[state.locals.nobles[0].id].sex = "F";
    }
  }

  const preview = proposeTurn(state);
  const marriage = preview.prospects_window?.prospects.find((prospect) => prospect.type === "marriage");
  const spouseId = typeof (marriage as any)?.spouse_person_id === "string" ? String((marriage as any).spouse_person_id) : null;
  if (!marriage || !spouseId) {
    throw new Error("Expected a generated marriage prospect with a spouse person id.");
  }

  const decisions: any = createDefaultDecisions(state);
  decisions.prospects = {
    kind: "prospects",
    actions: [{ prospect_id: marriage.id, action: "accept", prospect_i: 0 }]
  };

  const next = applyDecisions(state, decisions);
  return {
    previewState: proposeTurn(next).preview_state,
    spouseId
  };
}

describe("court provisioning registry", () => {
  it("builds deterministic per-court-member provisioning rows and stable stipend keys", () => {
    const state = createNewRun("court_provisioning_registry_v035");
    const personCards = buildPersonCardRegistry(state);
    const one = buildCourtProvisioningView(state, personCards);
    const replay = createNewRun("court_provisioning_registry_v035");
    const two = buildCourtProvisioningView(replay, buildPersonCardRegistry(replay));
    const stipendRegistry = buildCourtStipendRegistry(state, one);

    expect(one).toEqual(two);
    expect(one.schema_version).toBe(COURT_PROVISIONING_VIEW_SCHEMA_VERSION);
    expect(one.entries_by_person_id.p_head).toMatchObject({
      person_id: "p_head",
      provisioning_class: "head_of_house",
      ration_level: "full",
      lodging_level: "manor_house",
      stipend_basis: "family_service",
      stipend_key: "stipend:p_head",
    });
    expect(one.entries_by_person_id.p_court_steward).toMatchObject({
      provisioning_class: "retainer",
      stipend_basis: "family_service",
      active_seat_ids: expect.arrayContaining(["house:house:h_player:steward"]),
      stipend_key: "stipend:p_court_steward",
    });
    expect(stipendRegistry).toMatchObject({
      schema_version: COURT_STIPEND_REGISTRY_SCHEMA_VERSION,
      stipend_key_by_person_id: expect.objectContaining({
        p_head: "stipend:p_head",
        p_court_steward: "stipend:p_court_steward",
      }),
    });
    expect(stipendRegistry.entries_by_key["stipend:p_court_steward"]).toMatchObject({
      payment_basis: "family_service",
      provisioning_class: "retainer",
    });
  });

  it("carries forward prior-turn provisioning defaults by stable person id", () => {
    const state = createNewRun("court_provisioning_prior_defaults_v035") as any;
    const firstView = buildCourtProvisioningView(state, buildPersonCardRegistry(state));
    const firstRegistry = buildCourtStipendRegistry(state, firstView);
    firstView.entries_by_person_id.p_court_steward.ration_level = "light";
    firstView.entries_by_person_id.p_court_steward.lodging_level = "institution";
    state.court_provisioning_view = firstView;
    state.court_stipend_registry = firstRegistry;

    const secondView = buildCourtProvisioningView(state, buildPersonCardRegistry(state));
    const stipendRegistry = buildCourtStipendRegistry(state, secondView);

    expect(secondView.entries_by_person_id.p_court_steward).toMatchObject({
      ration_level: "light",
      lodging_level: "institution",
      carried_forward_from_prior: true,
    });
    expect(stipendRegistry.entries_by_key["stipend:p_court_steward"]).toMatchObject({
      carry_forward_from_prior: true,
      payment_basis: "family_service",
    });
  });

  it("treats married-in spouses as household family instead of external guests", () => {
    const { previewState, spouseId } = buildAcceptedMarriagePreview("court_provisioning_married_in_v036");
    const personCards = buildPersonCardRegistry(previewState);
    const view = buildCourtProvisioningView(previewState, personCards);

    expect(personCards.entries_by_person_id[spouseId]?.court_role_labels).toContain("Married-in Spouse");
    expect(view.entries_by_person_id[spouseId]).toMatchObject({
      person_id: spouseId,
      provisioning_class: "household_family",
      ration_level: "full",
      lodging_level: "manor_house",
      stipend_basis: "family_service"
    });
  });
});
