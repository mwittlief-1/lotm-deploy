// tests/sim/kinship_household.test.ts
import { describe, it, expect } from "vitest";

import { assertSpouseExclusivity } from "../../src/sim/kinship";
import { deriveHouseholdRoster } from "../../src/sim/householdView";

describe("kinship invariants + household view", () => {
  it("Spouse exclusivity P0: fails if a person has >1 living spouse", () => {
    const state: any = {
      people: {
        A: { person_id: "A", age: 40 },
        B: { person_id: "B", age: 39 },
        C: { person_id: "C", age: 35 },
      },
      kinship_edges: [
        { kind: "spouse", from_person_id: "A", to_person_id: "B" },
        { kind: "spouse", from_person_id: "A", to_person_id: "C" },
      ],
    };

    expect(() => assertSpouseExclusivity(state)).toThrow(/Spouse exclusivity violated/);
  });

  it("Spouse exclusivity P0: ignores dead spouses (only living spouses count)", () => {
    const state: any = {
      people: {
        A: { person_id: "A", age: 40 },
        B: { person_id: "B", age: 39, is_dead: true },
        C: { person_id: "C", age: 35 },
      },
      kinship_edges: [
        { kind: "spouse", from_person_id: "A", to_person_id: "B" }, // B dead
        { kind: "spouse", from_person_id: "A", to_person_id: "C" }, // C alive
      ],
    };

    expect(() => assertSpouseExclusivity(state)).not.toThrow();
  });

  it("Spouse exclusivity P0: ignores ended edges via end_turn_index", () => {
    const state: any = {
      people: {
        A: { person_id: "A", age: 40 },
        B: { person_id: "B", age: 39 },
        C: { person_id: "C", age: 35 },
      },
      kinship_edges: [
        { kind: "spouse", from_person_id: "A", to_person_id: "B", end_turn_index: 7 }, // ended
        { kind: "spouse", from_person_id: "A", to_person_id: "C" }, // active
      ],
    };

    expect(() => assertSpouseExclusivity(state)).not.toThrow();
  });

  it("Succession rebasing P0: when HoH changes, former child becomes sibling where applicable", () => {
    // Old HoH: A
    // Children: B, C
    // On succession: HoH becomes B, so C should become sibling (not child) relative to B.
    const baseState: any = {
      people: {
        A: { person_id: "A", age: 60 },
        B: { person_id: "B", age: 30 },
        C: { person_id: "C", age: 28 },
      },
      houses: {
        H1: { house_id: "H1", head_id: "A" },
      },
      kinship_edges: [
        { kind: "parent_of", from_person_id: "A", to_person_id: "B" },
        { kind: "parent_of", from_person_id: "A", to_person_id: "C" },
      ],
    };

    const rosterA = deriveHouseholdRoster(baseState, "H1");
    const roleOfA = (pid: string) => rosterA.find((r) => r.person_id === pid)?.role;

    expect(roleOfA("A")).toBe("head");
    expect(roleOfA("B")).toBe("child");
    expect(roleOfA("C")).toBe("child");

    // Succession: B becomes HoH
    const stateAfter: any = {
      ...baseState,
      houses: { ...baseState.houses, H1: { ...baseState.houses.H1, head_id: "B" } },
    };

    const rosterB = deriveHouseholdRoster(stateAfter, "H1");
    const roleOfB = (pid: string) => rosterB.find((r) => r.person_id === pid)?.role;

    expect(roleOfB("B")).toBe("head");
    expect(roleOfB("A")).toBe("parent");
    expect(roleOfB("C")).toBe("sibling");
  });
});
