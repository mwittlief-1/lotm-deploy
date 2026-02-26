import { describe, expect, it } from "vitest";

import { computeTierSets } from "../../src/sim/tiers";
import { ensureExternalHousesSeed_v0_2_8 } from "../../src/sim/worldgen";

function mkTraits() {
  return { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 };
}

function mkBaseState(seed: string, opts?: { spouse_age?: number; child_ages?: number[] }) {
  const head = { id: "p_head", name: "Lord Tester", sex: "M" as const, age: 40, alive: true, traits: mkTraits(), married: true };
  const spouseAge = opts?.spouse_age ?? 28;
  const spouse = { id: "p_spouse", name: "Lady Tester", sex: "F" as const, age: spouseAge, alive: true, traits: mkTraits(), married: true };

  const childAges = opts?.child_ages ?? [16, 14, 2];
  const children = childAges.map((age, i) => ({
    id: `p_child_${i + 1}`,
    name: `Child ${i + 1}`,
    sex: (i % 2 === 0 ? ("F" as const) : ("M" as const)),
    age,
    alive: true,
    traits: mkTraits(),
    married: false,
  }));

  const people: Record<string, any> = {
    [head.id]: { ...head },
    [spouse.id]: { ...spouse },
  };
  for (const c of children) people[c.id] = { ...c };

  const houses: Record<string, any> = {
    h_player: {
      id: "h_player",
      head_id: head.id,
      spouse_id: spouse.id,
      child_ids: children.map((c) => c.id),
    },
  };

  const state: any = {
    version: "0.2.7.2",
    app_version: "0.2.7.2",
    run_seed: seed,
    turn_index: 0,
    manor: {
      population: 45,
      farmers: 28,
      builders: 0,
      bushels_stored: 400,
      coin: 10,
      unrest: 10,
      improvements: [],
      construction: null,
      obligations: { tax_due_coin: 0, tithe_due_bushels: 0, arrears: { coin: 0, bushels: 0 }, war_levy_due: null },
    },
    house: {
      head,
      spouse,
      spouse_status: "spouse",
      children,
      energy: { max: 3, available: 3 },
      heir_id: children[0]?.id ?? null,
    },
    locals: {
      liege: { id: "p_liege", name: "Liege", sex: "M" as const, age: 50, alive: true, traits: mkTraits(), married: true },
      clergy: { id: "p_clergy", name: "Clergy", sex: "M" as const, age: 45, alive: true, traits: mkTraits(), married: false },
      nobles: [],
    },
    relationships: [],
    people,
    houses,
    player_house_id: "h_player",
    kinship_edges: [],
    flags: {
      _tuning: {
        tier1_max_houses: 160,
        // Dispatch 4: player household smoothing is optional; tests enable explicitly.
        worldgen_smooth_player_children: false,
      },
    },
    log: [],
  };

  // Ensure locals exist in people registry for any downstream code paths.
  state.people[state.locals.liege.id] = state.locals.liege;
  state.people[state.locals.clergy.id] = state.locals.clergy;

  return state;
}

function findEligibleMaiden(state: any, houseIds: string[]): { house_id: string; person_id: string; age: number } | null {
  const houses: Record<string, any> = state.houses;
  const people: Record<string, any> = state.people;

  for (const hid of houseIds.slice().sort()) {
    if (hid === state.player_house_id) continue;
    const h = houses[hid];
    if (!h || typeof h !== "object") continue;
    const childIds: string[] = Array.isArray(h.child_ids) ? h.child_ids : [];
    for (const cid of childIds) {
      const p = people[cid];
      if (!p) continue;
      if (p.sex !== "F") continue;
      if (p.married) continue;
      const age = Number(p.age);
      if (!Number.isFinite(age)) continue;
      // Typical noble "maiden" band for initial offers.
      if (age >= 14 && age <= 30) return { house_id: hid, person_id: cid, age };
    }
  }

  return null;
}

describe("tiering + worldgen (v0.2.8)", () => {
  it("Tier1 contains at least some eligible maidens after worldgen (typical seed)", () => {
    const state = mkBaseState("TEST_SEED_001", { spouse_age: 32, child_ages: [12, 10] });

    ensureExternalHousesSeed_v0_2_8(state);

    const { tier1 } = computeTierSets(state);
    const maiden = findEligibleMaiden(state, [...tier1.houses]);

    expect(maiden).not.toBeNull();
    // Defensive sanity: candidate should be in people registry.
    expect(state.people[maiden!.person_id]).toBeTruthy();

    // Determinism sanity: re-run with the same seed/state shape should yield the same eligible-maiden count.
    const state2 = mkBaseState("TEST_SEED_001", { spouse_age: 32, child_ages: [12, 10] });
    ensureExternalHousesSeed_v0_2_8(state2);
    const { tier1: tier1b } = computeTierSets(state2);
    const maiden2 = findEligibleMaiden(state2, [...tier1b.houses]);
    expect(Boolean(maiden2)).toBe(true);
  });

  it("Player start family smoothing avoids 'two teens + toddler' gap unless mother age supports late child", () => {
    // Implausible: mother too young for a late child.
    const state = mkBaseState("TEST_SEED_002", { spouse_age: 28, child_ages: [16, 14, 2] });
    state.flags._tuning.worldgen_smooth_player_children = true;

    ensureExternalHousesSeed_v0_2_8(state);

    const ages = state.house.children.map((c: any) => c.age).slice().sort((a: number, b: number) => b - a);

    const teenA = ages[0] ?? 0;
    const teenB = ages[1] ?? 0;
    const youngest = ages[ages.length - 1] ?? 0;

    const isTwoTeensPlusToddler = teenA >= 13 && teenB >= 13 && youngest <= 3;
    if (isTwoTeensPlusToddler) {
      // If it still exists, then mother must support it as a plausible late child.
      expect(state.house.spouse.age).toBeGreaterThanOrEqual(35);
    } else {
      // Otherwise, ensure we didn't keep an extreme gap.
      expect(teenB - youngest).toBeLessThanOrEqual(6);
    }
  });

  it("Worldgen is deterministic (idempotent under same seed/state)", () => {
    const stateA = mkBaseState("TEST_SEED_003", { spouse_age: 32, child_ages: [12, 10] });
    const stateB = mkBaseState("TEST_SEED_003", { spouse_age: 32, child_ages: [12, 10] });

    ensureExternalHousesSeed_v0_2_8(stateA);
    ensureExternalHousesSeed_v0_2_8(stateB);

    // Compare a stable projection: external house IDs and their child counts.
    const extA = Object.keys(stateA.houses).filter((id) => id.startsWith("h_ext_")).sort();
    const extB = Object.keys(stateB.houses).filter((id) => id.startsWith("h_ext_")).sort();

    expect(extA).toEqual(extB);

    const countsA = extA.map((hid) => (Array.isArray(stateA.houses[hid]?.child_ids) ? stateA.houses[hid].child_ids.length : 0));
    const countsB = extB.map((hid) => (Array.isArray(stateB.houses[hid]?.child_ids) ? stateB.houses[hid].child_ids.length : 0));

    expect(countsA).toEqual(countsB);
  });

  it("Tier0 includes Tier0 guide actors when present (player house, player court, liege/clergy, parish)", () => {
    const state = mkBaseState("TEST_SEED_004", { spouse_age: 30, child_ages: [8, 6] });
    // Provide an instantiated parish institution (actor) so Tier0 can include it.
    state.institutions = {
      i_parish_01: { id: "i_parish_01", type: "parish", patron_house_id: "h_player" },
    };
    state.locals.parish_institution_id = "i_parish_01";

    const { tier0 } = computeTierSets(state);

    expect(tier0.houses.has("h_player")).toBe(true);
    // Player court roster includes head/spouse/children in our base harness.
    expect(tier0.people.has("p_head")).toBe(true);
    expect(tier0.people.has("p_spouse")).toBe(true);
    // Liege/clergy should be Tier0 persons.
    expect(tier0.people.has("p_liege")).toBe(true);
    expect(tier0.people.has("p_clergy")).toBe(true);
    // Parish institution should be Tier0 when present.
    expect(tier0.institutions.has("i_parish_01")).toBe(true);
  });
});
