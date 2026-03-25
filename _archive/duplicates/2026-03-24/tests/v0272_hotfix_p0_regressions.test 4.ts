import { describe, it, expect } from "vitest";

import { createNewRun, proposeTurn } from "../src/sim";

function findHouseIdForPerson(state: any, personId: string): string | null {
  const houses = state?.houses ?? {};
  const ids = Object.keys(houses).sort();
  for (const hid of ids) {
    const h: any = houses[hid];
    if (!h || typeof h !== "object") continue;
    if (h.head_id === personId) return hid;
    if (h.spouse_id === personId) return hid;
    const childIds: any = h.child_ids;
    if (Array.isArray(childIds) && childIds.some((cid) => cid === personId)) return hid;
  }
  return null;
}

describe("v0.2.7.2 DevB P0 regressions", () => {
  it("marriage prospect spouse id is a People-First registry person and belongs to a house", () => {
    const s0: any = createNewRun("TEST_v0272_marriage_prospect_peoplefirst");

    // Force a single eligible child
    const child = s0.house.children[0];
    child.age = 16;
    child.sex = "M";
    child.alive = true;
    child.married = false;

    // Ensure affordability so the best-offer policy doesn't filter everything.
    s0.manor.coin = 250;

    // Deterministically inject an external house with an unmarried opposite-sex candidate.
    s0.people = s0.people ?? {};
    s0.houses = s0.houses ?? {};

    const extHeadId = "p_ext_test_head";
    const extBrideId = "p_ext_test_bride";
    const extHouseId = "h_ext_test_99";

    s0.people[extHeadId] = {
      id: extHeadId,
      name: "Edmund Testford",
      sex: "M",
      age: 40,
      alive: true,
      married: false,
      traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 }
    };

    s0.people[extBrideId] = {
      id: extBrideId,
      name: "Alice Testford",
      sex: "F",
      age: 18,
      alive: true,
      married: false,
      traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 }
    };

    s0.houses[extHouseId] = {
      id: extHouseId,
      name: "Testford",
      tier: "Knight",
      holdings_count: 1,
      head_id: extHeadId,
      spouse_id: null,
      child_ids: [extBrideId]
    };

    const ctx: any = proposeTurn(s0);
    const pw: any = ctx.prospects_window;

    expect(pw).toBeTruthy();
    const marriage = (pw.prospects ?? []).find((p: any) => p?.type === "marriage");
    expect(marriage).toBeTruthy();

    const spouseId = String(marriage.spouse_person_id ?? "");
    expect(spouseId.length).toBeGreaterThan(0);

    // spouse must be a People-First registry person
    expect(ctx.preview_state.people?.[spouseId]).toBeTruthy();

    // spouse must belong to a house; marriage.from_house_id must be that house
    const hid = findHouseIdForPerson(ctx.preview_state, spouseId);
    expect(hid).toBeTruthy();
    expect(marriage.from_house_id).toBe(hid);
  });

  it("succession spouse swap uses the stable spouse (no phantom local noble)", () => {
    const s0: any = createNewRun("TEST_v0272_succession_spouse_swap");

    // Make heir eligible + ensure head is dead entering the turn.
    s0.house.head.alive = false;

    const heir = s0.house.children[0];
    heir.sex = "M";
    heir.age = 18;
    heir.alive = true;

    // Two spouse_of matches: one "local noble" (no house membership) and one external spouse.
    // We push the local match first to mimic the old non-deterministic behavior.
    // The new behavior must choose lexicographically smallest spouse id.
    const localNobleId = "p_zzz_local_spouse";
    const extSpouseId = "p_000_ext_spouse";

    s0.people = s0.people ?? {};
    s0.houses = s0.houses ?? {};

    // Local noble exists as a Person but belongs to no House.
    s0.people[localNobleId] = {
      id: localNobleId,
      name: "Randulf Local",
      sex: "F",
      age: 19,
      alive: true,
      married: false,
      traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 }
    };

    // External spouse belongs to an external House.
    const extHeadId = "p_000_ext_head";
    const extHouseId = "h_ext_test_succ";

    s0.people[extHeadId] = {
      id: extHeadId,
      name: "Ulric Testford",
      sex: "M",
      age: 42,
      alive: true,
      married: false,
      traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 }
    };
    s0.people[extSpouseId] = {
      id: extSpouseId,
      name: "Agnes Testford",
      sex: "F",
      age: 18,
      alive: true,
      married: false,
      traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 }
    };
    s0.houses[extHouseId] = {
      id: extHouseId,
      name: "Testford",
      tier: "Knight",
      holdings_count: 1,
      head_id: extHeadId,
      spouse_id: null,
      child_ids: [extSpouseId]
    };

    s0.kinship_edges = s0.kinship_edges ?? [];
    s0.kinship_edges.push({ kind: "spouse_of", a_id: heir.id, b_id: localNobleId });
    s0.kinship_edges.push({ kind: "spouse_of", a_id: heir.id, b_id: extSpouseId });

    const ctx: any = proposeTurn(s0);
    const s1: any = ctx.preview_state;

    expect(s1.house.head.id).toBe(heir.id);
    expect(s1.house.spouse).toBeTruthy();

    // Lexicographic tie-break should prefer p_000_* over p_zzz_*
    expect(s1.house.spouse.id).toBe(extSpouseId);

    // Ensure we did NOT select the local noble
    expect(s1.house.spouse.id).not.toBe(localNobleId);

    // Ensure selected spouse belongs to a house (not just a local noble without house membership)
    const hid = findHouseIdForPerson(s1, extSpouseId);
    expect(hid).toBeTruthy();
  });
});
