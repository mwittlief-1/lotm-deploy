import { describe, expect, it } from "vitest";

import { SIM_VERSION } from "../../src/sim/version";
import type { Person, RunState } from "../../src/sim/types";
import {
  clearReservation,
  gcExpiredReservations,
  isReserved,
  listEligibleCandidates,
  reserveCandidate,
} from "../../src/sim/marriageMarket";

function mkPerson(id: string, sex: "M" | "F", age: number, opts?: Partial<Person>): Person {
  return {
    id,
    name: id,
    sex,
    age,
    alive: true,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    married: false,
    ...(opts ?? {}),
  };
}

function mkBaseState(): RunState {
  const head = mkPerson("p_head", "M", 40);
  const spouse = mkPerson("p_spouse", "F", 38);
  const liege = mkPerson("p_liege", "M", 50);
  const clergy = mkPerson("p_clergy", "M", 45);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 1,
    manor: {
      population: 0,
      farmers: 0,
      builders: 0,
      bushels_stored: 0,
      coin: 0,
      unrest: 0,
      improvements: [],
      construction: null,
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears: { coin: 0, bushels: 0 },
        war_levy_due: null,
      },
    },
    house: {
      head,
      spouse,
      spouse_status: "spouse",
      children: [],
      energy: { max: 0, available: 0 },
      heir_id: null,
    },
    locals: {
      liege,
      clergy,
      nobles: [],
    },
    relationships: [],
    flags: {},
    log: [],
    // People-First registry fields populated in tests as needed.
    people: {
      [head.id]: head,
      [spouse.id]: spouse,
      [liege.id]: liege,
      [clergy.id]: clergy,
    },
    houses: {
      h_player: {
        id: "h_player",
        name: "Player",
        tier: "Knight",
        head_id: head.id,
        spouse_id: spouse.id,
        child_ids: [],
      },
    },
    player_house_id: "h_player",
    kinship_edges: [{ kind: "spouse_of", a_id: head.id, b_id: spouse.id }],
  };
}

describe("marriageMarket reservations", () => {
  it("excludes a reserved candidate until cleared/expired", () => {
    const state = mkBaseState();

    const subject = mkPerson("p_child_1", "M", 18);
    const candidate = mkPerson("p_cand", "F", 18);

    state.house.children = [subject];
    state.people![subject.id] = subject;
    state.people![candidate.id] = candidate;

    state.houses!['h_player'].child_ids = [subject.id];
    state.houses!["h_ext_01"] = {
      id: "h_ext_01",
      name: "Ashford",
      tier: "Knight",
      head_id: "p_ext_head",
      spouse_id: null,
      child_ids: [candidate.id],
    };
    state.people!["p_ext_head"] = mkPerson("p_ext_head", "M", 45, { married: false });

    // Candidate is available initially.
    expect(listEligibleCandidates(state, { subject_person_id: subject.id })).toEqual([candidate.id]);

    // Reserve candidate for a prospect.
    reserveCandidate(state, candidate.id, "prospect_1", 2);
    expect(isReserved(state, candidate.id, state.turn_index)).toBe(true);

    // Candidate should be excluded while reserved.
    expect(listEligibleCandidates(state, { subject_person_id: subject.id })).toEqual([]);

    // Once the turn advances beyond expires_turn, GC should clear.
    state.turn_index = 3;
    gcExpiredReservations(state, state.turn_index);
    expect(isReserved(state, candidate.id, state.turn_index)).toBe(false);
    expect(listEligibleCandidates(state, { subject_person_id: subject.id })).toEqual([candidate.id]);

    // Manual clear also works.
    reserveCandidate(state, candidate.id, "prospect_2", 99);
    clearReservation(state, candidate.id);
    expect(listEligibleCandidates(state, { subject_person_id: subject.id })).toEqual([candidate.id]);
  });

  it("prevents one candidate from appearing in two simultaneously-generated prospect sets", () => {
    const state = mkBaseState();

    const subject1 = mkPerson("p_child_1", "M", 18);
    const subject2 = mkPerson("p_child_2", "M", 16);

    const candA = mkPerson("p_cand_a", "F", 19);
    const candB = mkPerson("p_cand_b", "F", 20);

    const candMarried = mkPerson("p_cand_married", "F", 20, { married: false });
    const spouseOfMarried = mkPerson("p_spouse_of_married", "M", 21, { married: false });

    state.house.children = [subject1, subject2];
    state.people![subject1.id] = subject1;
    state.people![subject2.id] = subject2;

    state.people![candA.id] = candA;
    state.people![candB.id] = candB;
    state.people![candMarried.id] = candMarried;
    state.people![spouseOfMarried.id] = spouseOfMarried;

    state.houses!['h_player'].child_ids = [subject1.id, subject2.id];

    state.houses!["h_ext_01"] = {
      id: "h_ext_01",
      name: "Ashford",
      tier: "Knight",
      head_id: "p_ext_head_01",
      spouse_id: null,
      child_ids: [candA.id, candMarried.id],
    };
    state.people!["p_ext_head_01"] = mkPerson("p_ext_head_01", "M", 40);

    state.houses!["h_ext_02"] = {
      id: "h_ext_02",
      name: "Bramwell",
      tier: "Baron",
      head_id: "p_ext_head_02",
      spouse_id: null,
      child_ids: [candB.id, spouseOfMarried.id],
    };
    state.people!["p_ext_head_02"] = mkPerson("p_ext_head_02", "M", 50);

    // Mark candMarried as married via kinship edge to a living spouse.
    state.kinship_edges = [
      ...state.kinship_edges,
      { kind: "spouse_of", a_id: candMarried.id, b_id: spouseOfMarried.id },
    ];

    // Subject1 sees candA + candB (candMarried is excluded).
    expect(listEligibleCandidates(state, { subject_person_id: subject1.id })).toEqual([candB.id, candA.id]);

    // Reserve candA for subject1's generated marriage prospect.
    reserveCandidate(state, candA.id, "prospect_marriage_1", state.turn_index + 2);

    // Subject2 should not see the reserved candA, but candB remains.
    expect(listEligibleCandidates(state, { subject_person_id: subject2.id })).toEqual([candB.id]);
  });

  it("detects living spouses across alternate spouse_of endpoint field names", () => {
    const state = mkBaseState();

    const subject = mkPerson("p_child_1", "M", 18);
    const candidate = mkPerson("p_cand_alt", "F", 19);
    const candidateSpouse = mkPerson("p_cand_alt_spouse", "M", 22);

    state.house.children = [subject];
    state.people![subject.id] = subject;
    state.people![candidate.id] = candidate;
    state.people![candidateSpouse.id] = candidateSpouse;

    state.houses!["h_player"].child_ids = [subject.id];
    state.houses!["h_ext_01"] = {
      id: "h_ext_01",
      name: "Ashford",
      tier: "Knight",
      head_id: "p_ext_head",
      spouse_id: null,
      child_ids: [candidate.id, candidateSpouse.id],
    };
    state.people!["p_ext_head"] = mkPerson("p_ext_head", "M", 45);

    // spouse_of edge uses from/to field names (not a_id/b_id)
    state.kinship_edges = [
      ...state.kinship_edges,
      { kind: "spouse_of", from_person_id: candidate.id, to_person_id: candidateSpouse.id } as any,
    ];

    // Candidate must be excluded because spouse is alive.
    expect(listEligibleCandidates(state, { subject_person_id: subject.id })).toEqual([]);
  });

  it("allows widows if spouse is dead even when married flag is stale", () => {
    const state = mkBaseState();

    const subject = mkPerson("p_child_1", "M", 18);
    const widow = mkPerson("p_widow", "F", 30, { married: true });
    const deadSpouse = mkPerson("p_dead_spouse", "M", 32, { alive: false, married: true });

    state.house.children = [subject];
    state.people![subject.id] = subject;
    state.people![widow.id] = widow;
    state.people![deadSpouse.id] = deadSpouse;

    state.houses!["h_player"].child_ids = [subject.id];
    state.houses!["h_ext_01"] = {
      id: "h_ext_01",
      name: "Ashford",
      tier: "Knight",
      head_id: "p_ext_head",
      spouse_id: null,
      child_ids: [widow.id, deadSpouse.id],
    };
    state.people!["p_ext_head"] = mkPerson("p_ext_head", "M", 45);

    // spouse_of edge exists, but spouse is dead.
    state.kinship_edges = [...state.kinship_edges, { kind: "spouse_of", a_id: widow.id, b_id: deadSpouse.id } as any];

    // Widow is eligible (no living spouse).
    expect(listEligibleCandidates(state, { subject_person_id: subject.id })).toEqual([widow.id]);
  });
});
