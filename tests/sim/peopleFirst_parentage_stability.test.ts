import { describe, it, expect } from "vitest";

import { ensurePeopleFirst } from "../../src/sim/peopleFirst";

// P0 regression: People-First sync must NEVER rewrite parent_of edges when HoH changes.
// It may add missing parent edges for newborns, but must preserve existing lineage.

describe("People-First P0: parentage stability", () => {
  it("does not re-parent existing children after succession", () => {
    const state: any = {
      run_seed: 123,
      turn_index: 10,
      manor: { bushels_stored: 0, coin: 0, unrest: 0, population: 10, farmers: 0, builders: 0, obligations: { tax_due_coin: 0, tithe_due_bushels: 0, arrears: { coin: 0, bushels: 0 }, war_levy_due: 0 }, improvements: [], construction: null },
      house: {
        head: { id: "A", name: "OldHead", sex: "M", age: 60, alive: true, married: true, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } },
        spouse: { id: "S", name: "OldSpouse", sex: "F", age: 55, alive: true, married: true, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } },
        spouse_status: "spouse",
        children: [
          { id: "B", name: "Heir", sex: "M", age: 30, alive: true, married: false, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } },
          { id: "C", name: "Sister", sex: "F", age: 28, alive: true, married: false, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } },
        ],
        heir_id: "B",
        energy: { available: 1, max: 1 },
      },
      locals: { liege: { id: "L", name: "Liege", sex: "M", age: 50, alive: true, married: false, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } }, clergy: { id: "P", name: "Priest", sex: "M", age: 50, alive: true, married: false, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } }, nobles: [] },
      relationships: [],
      flags: {},
      log: [],
      game_over: null,
    };

    // First sync: creates baseline parent edges A/S -> B,C
    ensurePeopleFirst(state);

    const kin0 = (state.kinship_edges ?? []).filter((e: any) => e.kind === "parent_of");
    expect(kin0).toEqual(
      expect.arrayContaining([
        { kind: "parent_of", parent_id: "A", child_id: "B" },
        { kind: "parent_of", parent_id: "S", child_id: "B" },
        { kind: "parent_of", parent_id: "A", child_id: "C" },
        { kind: "parent_of", parent_id: "S", child_id: "C" },
      ])
    );

    // Succession in legacy layer: HoH becomes B.
    // BUG we are guarding against: sync re-parents C to B.
    state.house.head = state.house.children[0];
    state.house.spouse = { id: "SB", name: "HeirSpouse", sex: "F", age: 27, alive: true, married: true, traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 } };
    state.house.spouse_status = "spouse";

    // Second sync must preserve C's parents as A/S.
    ensurePeopleFirst(state);

    const kin1 = (state.kinship_edges ?? []).filter((e: any) => e.kind === "parent_of");

    // Still contains original parentage.
    expect(kin1).toEqual(
      expect.arrayContaining([
        { kind: "parent_of", parent_id: "A", child_id: "C" },
        { kind: "parent_of", parent_id: "S", child_id: "C" },
      ])
    );

    // Must NOT contain re-parenting edge B -> C.
    expect(kin1.some((e: any) => e.parent_id === "B" && e.child_id === "C")).toBe(false);
  });
});
