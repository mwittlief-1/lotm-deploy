import { describe, expect, it } from "vitest";

import { applyDecisions, createNewRun, proposeTurn } from "../../src/sim";
import { buildPersonCardSurface, createPersonCardRoute, listPersonCardIds } from "../../src/ui/personCardView";
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

function makePersonCardRecord(overrides: Partial<any> = {}) {
  return {
    age: 18,
    alive: true,
    birth_house_id: "h_birth",
    birth_house_name: "Birthmere",
    court_member: false,
    court_role_labels: [],
    current_house_id: "h_current",
    current_house_name: "Hartwyck",
    family_projection: {
      children: [],
      family_person_ids: [],
      kinship_tags: [],
      married_out: false,
      parents: [],
      siblings: [],
      spouse: null
    },
    known_house_relevance_reasons: [],
    known_house_relevance_tier: null,
    lands_held_projection: {
      anchor_manor_id: null,
      holdings_band: "single_holding",
      holdings_count: 0,
      house_holdings_status: "coarse_house_only",
      house_id: "h_current",
      house_name: "Hartwyck",
      known_manor_ids: [],
      personal_holdings_status: "not_exposed_on_this_seam"
    },
    married_out: false,
    office_assignments: [],
    person_id: "p_default",
    person_name: "Cecily Hartwyck",
    residence_binding: {
      distance_band: "near",
      residence_manor_id: "hx_18",
      route_hop_distance: 1,
      selector_contexts: ["known_house"],
      source_kind: "known_house",
      source_ref_id: "ref:p_default",
      travel_cost_distance: 1
    },
    schema_version: "person_card_view_v1",
    service_timeline: {
      active_record_ids: [],
      entries: []
    },
    short_id: null,
    sex: "F",
    succession_projection: {
      adult_eligible: true,
      adult_line_position: null,
      adult_successor_id: null,
      blocked_by_current_heir: null,
      claim_window_open: false,
      claimant_adult_position: null,
      claimant_position: null,
      current_heir: false,
      current_heir_id: null,
      line_position: null,
      player_house_relevance_reasons: []
    },
    ...overrides
  };
}

describe("personCardView", () => {
  it("builds a deterministic routed surface from the canonical registry", () => {
    const state = createNewRun("person_card_surface");
    const ctx = proposeTurn(state);
    const personCardIds = listPersonCardIds(ctx.preview_state);
    const surface = buildPersonCardSurface(ctx.preview_state, "p_head");

    expect(personCardIds.length).toBeGreaterThan(100);
    expect(personCardIds).toContain("p_head");
    expect(surface).not.toBeNull();
    expect(surface?.familySections.map((section) => section.id)).toEqual(["parents", "spouse", "siblings", "children"]);
    expect(surface?.debugRows.map((row) => row.key)).toEqual([
      "schema_version",
      "person_id",
      "person_name",
      "short_id",
      "alive",
      "sex",
      "age",
      "current_house",
      "birth_house",
      "court_member",
      "court_roles",
      "known_house_relevance",
      "married_out",
      "residence_manor_id",
      "selector_contexts",
      "source_kind",
      "source_ref_id",
      "distance",
      "family_person_ids",
      "succession_projection",
      "office_assignments",
      "service_entries",
      "lands_held_projection",
      "relationship_rows"
    ]);
    expect(surface?.relationshipRows).toHaveLength(12);
    expect(surface?.relationshipCount ?? 0).toBeGreaterThan(surface?.relationshipRows.length ?? 0);
    expect(surface?.relationshipRows[0]?.totalScore ?? 0).toBeGreaterThanOrEqual(surface?.relationshipRows[1]?.totalScore ?? 0);
    expect(surface?.helperText).toContain("what the player actually knows");
    expect(surface?.overviewCards.find((card) => card.id === "lands")).toMatchObject({
      value: "Known footprint",
    });
    expect(surface?.overviewCards.find((card) => card.id === "lands")?.detail).toContain("Personal holdings not exposed");
  });

  it("creates stable origin routes for the shared tap-any-name modal flow", () => {
    expect(
      (["household", "roster", "prospects", "known_houses", "house_dossier", "person_card"] as const).map((origin) =>
        createPersonCardRoute("p_head", origin)
      )
    ).toEqual([
      { origin: "household", personId: "p_head" },
      { origin: "roster", personId: "p_head" },
      { origin: "prospects", personId: "p_head" },
      { origin: "known_houses", personId: "p_head" },
      { origin: "house_dossier", personId: "p_head" },
      { origin: "person_card", personId: "p_head" }
    ]);
  });

  it("labels married-out children as kin who left the birth house through marriage", () => {
    const state = createNewRun("person_card_married_out_surface") as any;
    const child = state.house.children[0];
    if (!child) throw new Error("Expected a household child for married-out coverage.");

    const externalHouseId = Object.keys(state.houses ?? {}).find((houseId) => houseId !== (state.player_house_id ?? "h_player"));
    if (!externalHouseId) throw new Error("Expected an external house for married-out coverage.");

    child.age = 19;
    child.sex = "F";
    child.married = true;
    child.house_id = externalHouseId;
    child.residence_house_id = externalHouseId;
    if (state.people?.[child.id]) {
      state.people[child.id].age = 19;
      state.people[child.id].sex = "F";
      state.people[child.id].married = true;
      state.people[child.id].house_id = externalHouseId;
      state.people[child.id].residence_house_id = externalHouseId;
    }
    const playerHouseId = state.player_house_id ?? "h_player";
    if (Array.isArray(state.houses?.[playerHouseId]?.child_ids)) {
      state.houses[playerHouseId].child_ids = state.houses[playerHouseId].child_ids.filter((personId: string) => personId !== child.id);
    }
    if (Array.isArray(state.houses?.[playerHouseId]?.member_person_ids)) {
      state.houses[playerHouseId].member_person_ids = state.houses[playerHouseId].member_person_ids.filter((personId: string) => personId !== child.id);
    }
    if (state.houses?.[externalHouseId]) {
      const externalMembers = Array.isArray(state.houses[externalHouseId].member_person_ids)
        ? state.houses[externalHouseId].member_person_ids
        : [];
      state.houses[externalHouseId].member_person_ids = Array.from(new Set([...externalMembers, child.id]));
    }

    const ctx = proposeTurn(state);
    const surface = buildPersonCardSurface(ctx.preview_state, "p_head");
    const childEntry = surface?.familySections.find((section) => section.id === "children")?.entries.find((entry) => entry.personId === child.id);

    expect(childEntry?.detail).toContain("Birth-house kin now in");
    expect(childEntry?.detail).toContain("through marriage");
  });

  it("labels married-in spouses as household family and humanizes succession guidance", () => {
    const { previewState, spouseId } = buildAcceptedMarriagePreview("person_card_married_in_surface");
    const spouseSurface = buildPersonCardSurface(previewState, spouseId);
    const headSurface = buildPersonCardSurface(previewState, "p_head");

    expect(spouseSurface?.overviewCards.find((card) => card.id === "roles")).toMatchObject({
      value: "Household by marriage"
    });
    expect(spouseSurface?.overviewCards.find((card) => card.id === "roles")?.detail).toContain("treated as household family");
    expect(headSurface?.overviewCards.find((card) => card.id === "succession")?.detail).toContain("Current heir:");
    expect(headSurface?.overviewCards.find((card) => card.id === "succession")?.detail).not.toContain("current_heir_id");
  });

  it("uses player-facing secondary identifiers to disambiguate repeated nearby names", () => {
    const previewState = {
      houses: {
        h_hartwyck: { house_name: "Hartwyck" }
      },
      person_card_registry: {
        entries_by_person_id: {
          p_cedric_count: makePersonCardRecord({
            age: 19,
            current_house_id: "h_hartwyck",
            current_house_name: "Hartwyck",
            person_id: "p_cedric_count",
            person_name: "Cedric Hartwyck",
            residence_binding: {
              distance_band: "near",
              residence_manor_id: "hx_18",
              route_hop_distance: 1,
              selector_contexts: ["known_house"],
              source_kind: "known_house",
              source_ref_id: "ref:p_cedric_count",
              travel_cost_distance: 1
            },
            sex: "M"
          }),
          p_cedric_baron: makePersonCardRecord({
            age: 42,
            current_house_id: "h_hartwyck",
            current_house_name: "Hartwyck",
            person_id: "p_cedric_baron",
            person_name: "Cedric Hartwyck",
            residence_binding: {
              distance_band: "near",
              residence_manor_id: "hx_25",
              route_hop_distance: 2,
              selector_contexts: ["known_house"],
              source_kind: "known_house",
              source_ref_id: "ref:p_cedric_baron",
              travel_cost_distance: 2
            },
            sex: "M"
          })
        },
        person_ids: ["p_cedric_count", "p_cedric_baron"],
        schema_version: "person_card_registry_v1"
      }
    } as any;

    const countSurface = buildPersonCardSurface(previewState, "p_cedric_count");
    const baronSurface = buildPersonCardSurface(previewState, "p_cedric_baron");

    expect(countSurface?.subtitle).toBe("Age 19 · House Hartwyck · Resides Hx 18");
    expect(baronSurface?.subtitle).toBe("Age 42 · House Hartwyck · Resides Hx 25");
    expect(countSurface?.subtitle).not.toBe(baronSurface?.subtitle);
  });
});
