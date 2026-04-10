import { describe, expect, it } from "vitest";

import { applyMarriageDecision, buildMarriageWindow } from "../../src/sim/domains/people/marriage";
import { buildHouseholdRoster } from "../../src/sim/domains/people/playerHousehold";
import type { MarriageWindow, Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

function mkPerson(id: string, sex: "M" | "F", age: number, opts?: Partial<Person>): Person {
  return {
    id,
    name: id,
    sex,
    age,
    alive: true,
    married: false,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    ...(opts ?? {}),
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "M", 40, { married: true });
  const deadSpouse = mkPerson("p_dead_spouse", "F", 38, { alive: false, married: true });
  const child = mkPerson("p_child_1", "M", 18);
  const candidate = mkPerson("p_cand_a", "F", 22);
  const extHead = mkPerson("p_ext_head", "M", 46);
  const liege = mkPerson("p_liege", "M", 50);
  const clergy = mkPerson("p_clergy", "M", 45);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 9,
    manor: {
      population: 24,
      farmers: 12,
      builders: 0,
      bushels_stored: 80,
      meat_stores: 6,
      coin: 12,
      unrest: 0,
      improvements: [],
      construction: null,
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears: { coin: 0, bushels: 0 },
        war_levy_due: null,
      },
    } as any,
    house: {
      head,
      spouse: deadSpouse,
      spouse_status: "widow",
      children: [child],
      energy: { max: 3, available: 3 },
      heir_id: child.id,
    },
    locals: { liege, clergy, nobles: [] },
    relationships: [],
    flags: {},
    log: [],
    people: {
      [head.id]: head,
      [deadSpouse.id]: deadSpouse,
      [child.id]: child,
      [candidate.id]: candidate,
      [extHead.id]: extHead,
      [liege.id]: liege,
      [clergy.id]: clergy,
    },
    houses: {
      h_player: {
        id: "h_player",
        name: "Player",
        tier: "Knight",
        head_id: head.id,
        spouse_id: deadSpouse.id,
        child_ids: [child.id],
        member_person_ids: [head.id, deadSpouse.id, child.id],
      },
      h_ext_01: {
        id: "h_ext_01",
        name: "Ashford",
        tier: "Baron",
        head_id: extHead.id,
        spouse_id: null,
        child_ids: [candidate.id],
        member_person_ids: [extHead.id, candidate.id],
      },
    },
    player_house_id: "h_player",
    kinship_edges: [{ kind: "spouse_of", a_id: head.id, b_id: deadSpouse.id }],
  } as any;
}

function activeSpouseEdgesFor(state: RunState, personId: string): any[] {
  return ((state as any).kinship_edges ?? []).filter((edge: any) => {
    if (edge?.kind !== "spouse_of") return false;
    if (edge?.end_turn_index != null || edge?.ended_turn_index != null) return false;
    return edge?.a_id === personId || edge?.b_id === personId;
  });
}

function mkHeadMarriageWindow(): MarriageWindow {
  return {
    eligible_child_ids: ["p_head"],
    offers: [
      {
        house_person_id: "p_cand_a",
        house_label: "House Ashford",
        dowry_coin_net: 3,
        relationship_delta: { respect: 6, allegiance: 4, threat: -2 },
        liege_delta: { respect: 1, threat: -1 },
        risk_tags: ["prestige", "profitable"],
      },
    ],
  };
}

describe("marriage edge handling", () => {
  it("allows a widowed head to re-enter the marriage window despite stale married state", () => {
    const state = mkState();

    const window = buildMarriageWindow(state);

    expect(window).toBeTruthy();
    expect(window?.eligible_child_ids).toEqual(["p_head"]);
    expect(window?.offers[0]?.house_person_id).toBe("p_cand_a");
  });

  it("does not reopen the head's marriage path when a living spouse edge still exists but the household pointer was cleared", () => {
    const state = mkState();
    const livingSpouse = mkPerson("p_live_spouse", "F", 36, { married: true });
    state.house.spouse = undefined;
    state.house.spouse_status = undefined;
    state.house.head.married = false;
    (state as any).people.p_live_spouse = livingSpouse;
    (state as any).kinship_edges = [{ kind: "spouse_of", a_id: "p_head", b_id: "p_live_spouse" }];

    const window = buildMarriageWindow(state);

    expect(window).toBeTruthy();
    expect(window?.eligible_child_ids).toEqual(["p_child_1"]);
  });

  it("retires obsolete spouse edges when a widowed head remarries", () => {
    const state = mkState();
    const notes: string[] = [];

    applyMarriageDecision(
      state,
      { marriage_window: mkHeadMarriageWindow() } as any,
      { marriage: { kind: "marriage", action: "accept", child_id: "p_head", offer_index: 0 } } as any,
      notes
    );

    const oldEdge = ((state as any).kinship_edges ?? []).find((edge: any) => edge?.kind === "spouse_of" && edge?.b_id === "p_dead_spouse");
    expect(oldEdge?.end_turn_index).toBe(state.turn_index);

    const activeEdges = activeSpouseEdgesFor(state, "p_head");
    expect(activeEdges).toHaveLength(1);
    expect(activeEdges[0]).toMatchObject({ a_id: "p_head", b_id: "p_cand_a" });

    expect(state.house.spouse?.id).toBe("p_cand_a");
    expect(state.house.spouse_status).toBe("spouse");
    expect(state.house.head.married).toBe(true);
    expect((state as any).people?.p_cand_a?.married).toBe(true);
    expect(notes).toEqual(["Marriage accepted for p_head: dowry +3 coin."]);
  });

  it("keeps the widow badge when the household only carries widow status without a live spouse pointer", () => {
    const state = mkState();
    state.house.spouse = undefined;

    const roster = buildHouseholdRoster(state);
    const headRow = roster.rows.find((row) => row.person_id === "p_head");

    expect(headRow?.badges).toContain("widower");
  });
});
