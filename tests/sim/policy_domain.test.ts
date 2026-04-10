import { describe, expect, it } from "vitest";

import { proposeTurn } from "../../src/sim";
import { createBeliefRegistry } from "../../src/sim/domains/ai/beliefs";
import {
  POLICY_HOOK_DEBUG_SCHEMA_VERSION,
  buildPolicyHookDebugView,
  buildPolicyIntelMap,
  npcPolicyScore,
  summarizeBeliefsForSubject
} from "../../src/sim/domains/ai/policy";
import { bestMarriageOfferIndexPolicy } from "../../src/sim/domains/people/marriage";
import { decide } from "../../src/sim/policies";
import { SIM_VERSION } from "../../src/sim/version";
import type { Person, RunState } from "../../src/sim/types";

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

function mkPolicyState(): RunState {
  const head = mkPerson("p_head", "M", 40, { married: true });
  const spouse = mkPerson("p_spouse", "F", 38, { married: true });
  const child = mkPerson("p_child_1", "M", 18);
  const candidate = mkPerson("p_cand", "F", 19);
  const extHead = mkPerson("p_ext_head", "M", 45);
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
      heir_id: null
    },
    locals: {
      liege,
      clergy,
      nobles: []
    },
    relationships: [],
    flags: {},
    log: [],
    people: {
      [head.id]: head,
      [spouse.id]: spouse,
      [child.id]: child,
      [candidate.id]: candidate,
      [extHead.id]: extHead,
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
        child_ids: [child.id],
      },
      h_ext_01: {
        id: "h_ext_01",
        name: "Ashford",
        tier: "Knight",
        head_id: extHead.id,
        spouse_id: null,
        child_ids: [candidate.id],
      }
    },
    player_house_id: "h_player",
    kinship_edges: [{ kind: "spouse_of", a_id: head.id, b_id: spouse.id }],
    beliefs: {
      schema_version: "belief_registry_v0",
      by_subject: {
        p_cand: [
          {
            subject_id: "p_cand",
            phase: "prospects",
            turn_index: 1,
            kind: "prospect_generated",
            detail: "Prospect generated: marriage (pr_1).",
            category: "prospects",
            confidence: "likely"
          },
          {
            subject_id: "p_cand",
            phase: "marriage",
            turn_index: 2,
            kind: "marriage_offer",
            detail: "House Ashford (p_cand)",
            category: "marriage",
            confidence: "known"
          }
        ]
      }
    }
  };
}

describe("ai policy hook", () => {
  it("summarizes beliefs by confidence and latest turn", () => {
    const state = mkPolicyState();

    expect(summarizeBeliefsForSubject(state, "p_cand")).toEqual({
      subject_id: "p_cand",
      known_count: 1,
      likely_count: 1,
      possible_count: 0,
      latest_turn_index: 2,
      categories: ["marriage", "prospects"]
    });
  });

  it("builds deterministic intel maps and applies tuning-scaled hook scores", () => {
    const state = mkPolicyState();
    const intelMap = buildPolicyIntelMap(state, ["p_cand", "p_cand", null, "p_head"]);

    expect(Object.keys(intelMap)).toEqual(["p_cand", "p_head"]);
    expect(intelMap.p_head).toEqual({
      subject_id: "p_head",
      known_count: 0,
      likely_count: 0,
      possible_count: 0,
      latest_turn_index: null,
      categories: []
    });
    expect(npcPolicyScore({
      hook: "marriage_offer",
      base_score: 27,
      intel: intelMap.p_cand
    })).toBeCloseTo(27.55, 6);
    expect(npcPolicyScore({
      hook: "prospect",
      base_score: 5,
      intel: intelMap.p_cand
    })).toBeCloseTo(5.34, 6);

    (state.flags as any)._tuning = {
      ai_marriage_intel_bonus_scale: 0.5,
      ai_prospect_intel_bonus_scale: 0
    };
    expect(npcPolicyScore({
      hook: "marriage_offer",
      base_score: 27,
      intel: intelMap.p_cand,
      state
    })).toBeCloseTo(27.275, 6);
    expect(npcPolicyScore({
      hook: "prospect",
      base_score: 5,
      intel: intelMap.p_cand,
      state
    })).toBeCloseTo(5, 6);
  });

  it("lets belief-backed intel break close marriage-offer ties", () => {
    const base = mkPolicyState();
    base.beliefs = createBeliefRegistry();
    const withBeliefs = mkPolicyState();

    const mkCtx = (state: RunState) => ({
      preview_state: state,
      report: {
        consumption_bushels: 0
      },
      marriage_window: {
        eligible_child_ids: ["p_child_1"],
        offers: [
          {
            house_person_id: "p_cand",
            house_label: "Ashford",
            dowry_coin_net: 2,
            relationship_delta: { respect: 1, allegiance: 2, threat: 0 },
            liege_delta: null,
            risk_tags: []
          },
          {
            house_person_id: "p_cand_alt",
            house_label: "Bramwell",
            dowry_coin_net: 2,
            relationship_delta: { respect: 1, allegiance: 2, threat: 0 },
            liege_delta: null,
            risk_tags: []
          }
        ]
      },
      max_labor_shift: 0
    }) as any;

    const altCandidate = mkPerson("p_cand_alt", "F", 20);
    (base.people as any).p_cand_alt = altCandidate;
    (withBeliefs.people as any).p_cand_alt = altCandidate;

    (withBeliefs.beliefs as any).by_subject.p_cand = [];
    (withBeliefs.beliefs as any).by_subject.p_cand_alt = [
      {
        subject_id: "p_cand_alt",
        phase: "marriage",
        turn_index: 2,
        kind: "marriage_offer",
        detail: "House Bramwell (p_cand_alt)",
        category: "marriage",
        confidence: "known"
      }
    ];

    const baseDecision = decide("prudent-builder", base, mkCtx(base));
    const activatedDecision = decide("prudent-builder", withBeliefs, mkCtx(withBeliefs));

    expect(baseDecision.marriage).toEqual({
      kind: "marriage",
      action: "accept",
      child_id: "p_child_1",
      offer_index: 0
    });
    expect(activatedDecision.marriage).toEqual({
      kind: "marriage",
      action: "accept",
      child_id: "p_child_1",
      offer_index: 1
    });
  });

  it("lets tuning gate the same belief bonus used for marriage prospects", () => {
    const state = mkPolicyState();
    const marriageWindow = {
      eligible_child_ids: ["p_child_1"],
      offers: [
        {
          house_person_id: "p_cand",
          house_label: "Ashford",
          dowry_coin_net: 2,
          relationship_delta: { respect: 1, allegiance: 2, threat: 0 },
          liege_delta: null,
          risk_tags: []
        },
        {
          house_person_id: "p_cand_alt",
          house_label: "Bramwell",
          dowry_coin_net: 2,
          relationship_delta: { respect: 1, allegiance: 2, threat: 0 },
          liege_delta: null,
          risk_tags: []
        }
      ]
    };

    const altCandidate = mkPerson("p_cand_alt", "F", 20);
    (state.people as any).p_cand_alt = altCandidate;
    (state.beliefs as any).by_subject.p_cand = [];
    (state.beliefs as any).by_subject.p_cand_alt = [
      {
        subject_id: "p_cand_alt",
        phase: "marriage",
        turn_index: 2,
        kind: "marriage_offer",
        detail: "House Bramwell (p_cand_alt)",
        category: "marriage",
        confidence: "known"
      }
    ];

    expect(bestMarriageOfferIndexPolicy(state, marriageWindow as any)).toBe(1);

    (state.flags as any)._tuning = {
      ai_marriage_intel_bonus_scale: 0,
      ai_prospect_intel_bonus_scale: 1
    };
    expect(bestMarriageOfferIndexPolicy(state, marriageWindow as any)).toBe(0);
  });

  it("keeps policy hooks neutral without belief intel and exposes their read-only debug contract", () => {
    const state = mkPolicyState();
    delete (state.beliefs as any).by_subject.p_cand;
    (state.flags as any)._tuning = {
      ai_marriage_intel_bonus_scale: 0.5,
      ai_prospect_intel_bonus_scale: 0
    };

    expect(npcPolicyScore({
      hook: "marriage_offer",
      base_score: 17,
      state,
      subject_id: "p_cand"
    })).toBe(17);
    expect(npcPolicyScore({
      hook: "prospect",
      base_score: 9,
      state,
      subject_id: "p_cand"
    })).toBe(9);
    expect(buildPolicyHookDebugView(state)).toEqual({
      schema_version: POLICY_HOOK_DEBUG_SCHEMA_VERSION,
      hook_order: ["marriage_offer", "prospect"],
      entries_by_hook: {
        marriage_offer: {
          hook: "marriage_offer",
          activation_mode: "belief_backed_bonus_only",
          neutral_without_intel: true,
          subject_scope: "explicit_subject_only",
          current_scale: 0.5,
          min_bonus: -0.25,
          max_bonus: 0.75
        },
        prospect: {
          hook: "prospect",
          activation_mode: "belief_backed_bonus_only",
          neutral_without_intel: true,
          subject_scope: "explicit_subject_only",
          current_scale: 0,
          min_bonus: -0.15,
          max_bonus: 0.4
        }
      }
    });
  });
});
