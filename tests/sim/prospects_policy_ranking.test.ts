import { describe, expect, it } from "vitest";

import { buildProspectsWindowPhase } from "../../src/sim/phases/phase_prospects";
import { SIM_VERSION } from "../../src/sim/version";
import type { Person, Prospect, RunState } from "../../src/sim/types";

function mkPerson(id: string, sex: "M" | "F", age: number, opts?: Partial<Person>): Person {
  return {
    id,
    name: id,
    sex,
    age,
    alive: true,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    married: false,
    ...(opts ?? {})
  };
}

function mkProspectsState(): RunState {
  const head = mkPerson("p_head", "M", 40, { married: true });
  const spouse = mkPerson("p_spouse", "F", 38, { married: true });
  const child = mkPerson("p_child_1", "M", 18);
  const candA = mkPerson("p_cand_a", "F", 19);
  const candB = mkPerson("p_cand_b", "F", 20);
  const extHeadA = mkPerson("p_ext_head_a", "M", 45);
  const extHeadB = mkPerson("p_ext_head_b", "M", 44);
  const liege = mkPerson("p_liege", "M", 50);
  const clergy = mkPerson("p_clergy", "M", 45);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 1,
    manor: {
      population: 20,
      farmers: 10,
      builders: 0,
      bushels_stored: 80,
      coin: 12,
      unrest: 0,
      improvements: [],
      construction: null,
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears: { coin: 0, bushels: 0 },
        war_levy_due: null
      }
    },
    house: {
      head,
      spouse,
      spouse_status: "spouse",
      children: [child],
      energy: { max: 3, available: 3 },
      heir_id: child.id
    },
    locals: {
      liege,
      clergy,
      nobles: []
    },
    relationships: [],
    flags: {
      _prospects_active_v1: [
        { id: "pr_marriage_a", expires_turn: 3 },
        { id: "pr_marriage_b", expires_turn: 3 }
      ]
    },
    log: [],
    people: {
      [head.id]: head,
      [spouse.id]: spouse,
      [child.id]: child,
      [candA.id]: candA,
      [candB.id]: candB,
      [extHeadA.id]: extHeadA,
      [extHeadB.id]: extHeadB,
      [liege.id]: liege,
      [clergy.id]: clergy
    },
    houses: {
      h_player: {
        id: "h_player",
        name: "Player",
        tier: "Knight",
        head_id: head.id,
        spouse_id: spouse.id,
        child_ids: [child.id]
      },
      h_ext_01: {
        id: "h_ext_01",
        name: "Ashford",
        tier: "Knight",
        head_id: extHeadA.id,
        spouse_id: null,
        child_ids: [candA.id]
      },
      h_ext_02: {
        id: "h_ext_02",
        name: "Bramwell",
        tier: "Knight",
        head_id: extHeadB.id,
        spouse_id: null,
        child_ids: [candB.id]
      }
    },
    player_house_id: "h_player",
    kinship_edges: [{ kind: "spouse_of", a_id: head.id, b_id: spouse.id }],
    beliefs: {
      schema_version: "belief_registry_v0",
      by_subject: {
        p_cand_b: [
          {
            subject_id: "p_cand_b",
            phase: "marriage",
            turn_index: 1,
            kind: "marriage_offer",
            detail: "House Bramwell (p_cand_b)",
            category: "marriage",
            confidence: "known"
          }
        ]
      }
    }
  };
}

function appendProspectHistory(state: RunState, prospects: Prospect[]): void {
  state.log.push({
    turn_index: 1,
    report: {
      notes: [],
      key_flags: [],
      prospects_log: prospects.map((prospect) => ({
        kind: "prospect_generated" as const,
        turn_index: 1,
        type: prospect.type,
        from_house_id: prospect.from_house_id,
        to_house_id: prospect.to_house_id,
        subject_person_id: prospect.subject_person_id,
        prospect_id: prospect.id,
        prospect
      }))
    }
  } as any);
}

describe("prospects policy ranking", () => {
  it("reorders same-type active prospects by the relevant intel subject", () => {
    const state = mkProspectsState();
    appendProspectHistory(state, [
      {
        id: "pr_marriage_a",
        type: "marriage",
        from_house_id: "h_ext_01",
        to_house_id: "h_player",
        subject_person_id: "p_child_1",
        spouse_person_id: "p_cand_a",
        summary: "Marriage proposal A",
        requirements: [],
        costs: {},
        predicted_effects: {},
        uncertainty: "known",
        expires_turn: 3,
        actions: ["accept", "reject"]
      },
      {
        id: "pr_marriage_b",
        type: "marriage",
        from_house_id: "h_ext_02",
        to_house_id: "h_player",
        subject_person_id: "p_child_1",
        spouse_person_id: "p_cand_b",
        summary: "Marriage proposal B",
        requirements: [],
        costs: {},
        predicted_effects: {},
        uncertainty: "known",
        expires_turn: 3,
        actions: ["accept", "reject"]
      }
    ]);

    const ranked = buildProspectsWindowPhase(state, null, [], {
      computeHeirId: () => "p_child_1"
    });
    expect(ranked.prospects.map((prospect) => prospect.id)).toEqual(["pr_marriage_b", "pr_marriage_a"]);

    (state.flags as any)._tuning = {
      ai_prospect_intel_bonus_scale: 0,
      ai_marriage_intel_bonus_scale: 1
    };
    const neutral = buildProspectsWindowPhase(state, null, [], {
      computeHeirId: () => "p_child_1"
    });
    expect(neutral.prospects.map((prospect) => prospect.id)).toEqual(["pr_marriage_a", "pr_marriage_b"]);
  });
});
