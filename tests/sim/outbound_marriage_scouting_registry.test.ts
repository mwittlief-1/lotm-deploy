import { describe, expect, it } from "vitest";

import { reserveCandidate } from "../../src/sim/marriageMarket";
import {
  OUTBOUND_MARRIAGE_SCOUTING_REGISTRY_SCHEMA_VERSION,
  buildOutboundMarriageScoutingRegistry,
} from "../../src/sim/domains/people/marriage";
import type { Person, RunState } from "../../src/sim/types";
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
  const spouse = mkPerson("p_spouse", "F", 38, { married: true });
  const child = mkPerson("p_child_1", "M", 18);
  const liege = mkPerson("p_liege", "M", 50);
  const clergy = mkPerson("p_clergy", "M", 45);
  const nearHead = mkPerson("p_near_head", "M", 44);
  const nearCandidate = mkPerson("p_cand_near", "F", 19);
  const farHead = mkPerson("p_far_head", "M", 47);
  const farCandidate = mkPerson("p_cand_far", "F", 20);
  const unmappedHead = mkPerson("p_unmapped_head", "M", 41);
  const unmappedCandidate = mkPerson("p_cand_unmapped", "F", 21);
  const oldCandidate = mkPerson("p_cand_old", "F", 52);

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
        war_levy_due: null
      }
    } as any,
    house: {
      head,
      spouse,
      spouse_status: "spouse",
      children: [child],
      energy: { max: 3, available: 3 },
      heir_id: child.id
    },
    locals: { liege, clergy, nobles: [] },
    relationships: [],
    flags: {},
    log: [],
    people: {
      [head.id]: head,
      [spouse.id]: spouse,
      [child.id]: child,
      [liege.id]: liege,
      [clergy.id]: clergy,
      [nearHead.id]: nearHead,
      [nearCandidate.id]: nearCandidate,
      [farHead.id]: farHead,
      [farCandidate.id]: farCandidate,
      [unmappedHead.id]: unmappedHead,
      [unmappedCandidate.id]: unmappedCandidate,
      [oldCandidate.id]: oldCandidate,
    },
    houses: {
      h_player: {
        id: "h_player",
        name: "Player",
        tier: "Knight",
        head_id: head.id,
        spouse_id: spouse.id,
        child_ids: [child.id],
        member_person_ids: [head.id, spouse.id, child.id]
      },
      h_near: {
        id: "h_near",
        name: "Nearfield",
        tier: "Baron",
        head_id: nearHead.id,
        child_ids: [nearCandidate.id],
        member_person_ids: [nearHead.id, nearCandidate.id]
      },
      h_far: {
        id: "h_far",
        name: "Farwatch",
        tier: "Baron",
        head_id: farHead.id,
        child_ids: [farCandidate.id],
        member_person_ids: [farHead.id, farCandidate.id]
      },
      h_unmapped: {
        id: "h_unmapped",
        name: "Woodsmere",
        tier: "Knight",
        head_id: unmappedHead.id,
        child_ids: [unmappedCandidate.id, oldCandidate.id],
        member_person_ids: [unmappedHead.id, unmappedCandidate.id, oldCandidate.id]
      }
    },
    player_house_id: "h_player",
    kinship_edges: [{ kind: "spouse_of", a_id: head.id, b_id: spouse.id }]
  } as any;
}

describe("outbound marriage scouting registry", () => {
  it("builds a bounded deterministic shortlist with include and exclude reasons", () => {
    const state = mkState();
    reserveCandidate(state, "p_cand_unmapped", "marriage_probe", state.turn_index + 1);

    const residenceSummary = {
      schema_version: "residence_selector_summary_v0",
      anchor_manor_id: "manor_anchor",
      person_ids: ["p_child_1", "p_cand_near", "p_cand_far", "p_cand_unmapped", "p_cand_old"],
      entries_by_person_id: {
        p_child_1: {
          residence_manor_id: "manor_anchor",
          selector_contexts: ["household"],
        },
        p_cand_near: {
          residence_manor_id: "manor_near",
          selector_contexts: ["external_house"],
          travel_cost_distance: 18,
          route_hop_distance: 2,
          distance_band: "near",
        },
        p_cand_far: {
          residence_manor_id: "manor_far",
          selector_contexts: ["external_house"],
          travel_cost_distance: 83,
          route_hop_distance: 8,
          distance_band: "far",
        },
        p_cand_unmapped: {
          residence_manor_id: null,
          selector_contexts: ["external_house"],
          travel_cost_distance: null,
          route_hop_distance: null,
          distance_band: null,
        },
        p_cand_old: {
          residence_manor_id: "manor_near",
          selector_contexts: ["external_house"],
          travel_cost_distance: 18,
          route_hop_distance: 2,
          distance_band: "near",
        },
      }
    } as any;

    const actionScope = {
      schema_version: "action_scope_resolution_v1",
      action_type: "marriage_scout",
      anchor_manor_id: "manor_anchor",
      scope_mode: "topology_cap",
      tier_label: "Knight",
      far_threshold: 50,
      residence_manor_ids: ["manor_anchor"],
      kinship_manor_ids: [],
      admitted_manor_ids: ["manor_anchor", "manor_near"],
      rejected_manor_ids: ["manor_far"],
      candidates: [
        {
          stable_id: "candidate:manor_near",
          manor_id: "manor_near",
          bucket: "near",
          travel_cost_distance: 18,
          route_hop_distance: 2,
          distance_band: "near",
          territorial_adjacent: false,
          route_adjacent: false
        },
        {
          stable_id: "candidate:manor_far",
          manor_id: "manor_far",
          bucket: "far",
          travel_cost_distance: 83,
          route_hop_distance: 8,
          distance_band: "far",
          territorial_adjacent: false,
          route_adjacent: false
        }
      ],
      cap_evaluation: null
    } as any;

    const registry = buildOutboundMarriageScoutingRegistry(state, {
      subject_person_id: "p_child_1",
      action_scope: actionScope,
      residence_selector_summary: residenceSummary,
    });

    expect(registry).toMatchObject({
      schema_version: OUTBOUND_MARRIAGE_SCOUTING_REGISTRY_SCHEMA_VERSION,
      subject_person_id: "p_child_1",
      anchor_manor_id: "manor_anchor",
      shown_candidate_ids: ["p_cand_near"],
    });
    expect(registry?.entries_by_candidate_id.p_cand_near).toMatchObject({
      scope_status: "admitted",
      scope_bucket: "near",
      rank_group: "shown",
      include_reasons: expect.arrayContaining(["scope_near", "age_band_match"]),
      exclude_reasons: [],
    });
    expect(registry?.entries_by_candidate_id.p_cand_far).toMatchObject({
      scope_status: "rejected",
      rank_group: "held_out",
      exclude_reasons: expect.arrayContaining(["scope_rejected"]),
    });
    expect(registry?.entries_by_candidate_id.p_cand_unmapped).toMatchObject({
      scope_status: "unmapped",
      rank_group: "held_out",
      include_reasons: expect.arrayContaining(["scope_unmapped_fallback"]),
      exclude_reasons: expect.arrayContaining(["candidate_reserved"]),
    });
    expect(registry?.entries_by_candidate_id.p_cand_old).toMatchObject({
      exclude_reasons: expect.arrayContaining(["outside_age_band"]),
    });
    expect(registry?.candidate_ids[0]).toBe("p_cand_near");
    expect(registry?.candidate_ids).toEqual(
      expect.arrayContaining(["p_cand_near", "p_cand_far", "p_cand_unmapped", "p_cand_old"])
    );
  });
});
