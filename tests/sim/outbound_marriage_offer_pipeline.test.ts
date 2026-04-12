import { describe, expect, it } from "vitest";

import { readRuntimeDomainEvidence } from "../../src/sim/domains/ai/evidence";
import { readLedgerReceiptSnapshots } from "../../src/sim/domains/economy/ledger";
import {
  buildOutboundMarriageScoutingRegistry,
  resolveOutboundMarriageOffer,
} from "../../src/sim/domains/people/marriage";
import {
  buildMarriageOfferRegistryFromState,
  getMarriageRejectCooldown,
  makeMarriageOfferKey,
} from "../../src/sim/domains/people/marriageOfferRegistry";
import { applyRelationshipDelta } from "../../src/sim/domains/people/relationshipEngine";
import type { MarriageOffer, Person, RunState } from "../../src/sim/types";
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
      spouse,
      spouse_status: "spouse",
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
      [spouse.id]: spouse,
      [child.id]: child,
      [liege.id]: liege,
      [clergy.id]: clergy,
      [nearHead.id]: nearHead,
      [nearCandidate.id]: nearCandidate,
    },
    houses: {
      h_player: {
        id: "h_player",
        name: "Player",
        tier: "Knight",
        head_id: head.id,
        spouse_id: spouse.id,
        child_ids: [child.id],
        member_person_ids: [head.id, spouse.id, child.id],
      },
      h_near: {
        id: "h_near",
        name: "Nearfield",
        tier: "Baron",
        head_id: nearHead.id,
        child_ids: [nearCandidate.id],
        member_person_ids: [nearHead.id, nearCandidate.id],
      },
    },
    player_house_id: "h_player",
    kinship_edges: [{ kind: "spouse_of", a_id: head.id, b_id: spouse.id }],
  } as any;
}

function mkScoutingRegistry(state: RunState) {
  return buildOutboundMarriageScoutingRegistry(state, {
    subject_person_id: "p_child_1",
    residence_selector_summary: {
      schema_version: "residence_selector_summary_v0",
      anchor_manor_id: "manor_anchor",
      person_ids: ["p_child_1", "p_cand_near"],
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
      },
    } as any,
    action_scope: {
      schema_version: "action_scope_resolution_v1",
      action_type: "marriage_scout",
      anchor_manor_id: "manor_anchor",
      scope_mode: "topology_cap",
      tier_label: "Knight",
      far_threshold: 50,
      residence_manor_ids: ["manor_anchor"],
      kinship_manor_ids: [],
      admitted_manor_ids: ["manor_anchor", "manor_near"],
      rejected_manor_ids: [],
      candidates: [
        {
          stable_id: "candidate:manor_near",
          manor_id: "manor_near",
          bucket: "near",
          travel_cost_distance: 18,
          route_hop_distance: 2,
          distance_band: "near",
          territorial_adjacent: false,
          route_adjacent: false,
        },
      ],
      cap_evaluation: null,
    } as any,
  });
}

function mkOffer(overrides?: Partial<MarriageOffer>): MarriageOffer {
  return {
    house_person_id: "p_cand_near",
    house_label: "House Nearfield",
    dowry_coin_net: -3,
    relationship_delta: { respect: 4, allegiance: 3, threat: -1 },
    liege_delta: { respect: 1, threat: -1 },
    risk_tags: ["prestige", "costly"],
    ...(overrides ?? {}),
  };
}

describe("outbound marriage offer pipeline", () => {
  it("accepts an outbound offer through settlement, registry, and runtime evidence seams", () => {
    const state = mkState();
    const scoutingRegistry = mkScoutingRegistry(state);
    applyRelationshipDelta(state, "p_cand_near", "p_head", { allegiance: 14, respect: 12, threat: -6 }, "seed");

    const result = resolveOutboundMarriageOffer(state, {
      subject_person_id: "p_child_1",
      scouting_registry: scoutingRegistry,
      offer: mkOffer(),
      phase_sequence: 4,
      dower_requested_delta_by_asset: {
        food_stores: -2,
      },
    });

    expect(result.outcome).toBe("accepted");
    expect(result.acceptance_debug?.acceptance_score).toBeGreaterThanOrEqual(
      result.acceptance_debug!.acceptance_threshold
    );
    expect(result.receipt_snapshots.map((receipt) => ({
      category: receipt.category,
      asset: receipt.asset,
      delta: receipt.delta,
    }))).toEqual([
      {
        category: "marriage.dowry_settlement",
        asset: "coin",
        delta: -3,
      },
      {
        category: "marriage.dower_settlement",
        asset: "food_stores",
        delta: -2,
      },
    ]);
    expect(readLedgerReceiptSnapshots(state)).toEqual(result.receipt_snapshots);
    expect(state.manor.coin).toBe(9);
    expect(state.manor.bushels_stored).toBe(78);
    expect(state.house.children[0]?.married).toBe(true);
    expect((state as any).people?.p_cand_near?.married).toBe(true);
    expect((state as any).people?.p_cand_near?.house_id).toBe("h_player");

    const offerKey = makeMarriageOfferKey({
      direction: "outbound",
      subject_person_id: "p_child_1",
      candidate_person_id: "p_cand_near",
    });
    expect(buildMarriageOfferRegistryFromState(state).offers_by_key[offerKey]?.state).toBe("accepted");
    expect(
      readRuntimeDomainEvidence(state).entries.flatMap((entry) => entry.events).map((event) => event.kind)
    ).toContain("outbound_marriage_offer_accepted");
  });

  it("rejects a weak outbound offer and records a cooldown in the canonical registry", () => {
    const state = mkState();
    const scoutingRegistry = mkScoutingRegistry(state);
    applyRelationshipDelta(state, "p_cand_near", "p_head", { allegiance: -10, respect: -12, threat: 8 }, "seed");

    const result = resolveOutboundMarriageOffer(state, {
      subject_person_id: "p_child_1",
      scouting_registry: scoutingRegistry,
      offer: mkOffer({
        dowry_coin_net: 4,
        relationship_delta: { respect: 1, allegiance: 0, threat: 1 },
        liege_delta: null,
        risk_tags: ["shady", "profitable"],
      }),
      phase_sequence: 5,
    });

    expect(result.outcome).toBe("rejected");
    expect(result.acceptance_debug?.acceptance_score).toBeLessThan(result.acceptance_debug!.acceptance_threshold);
    expect(state.manor.coin).toBe(12);
    expect(state.house.children[0]?.married).toBe(false);
    expect(getMarriageRejectCooldown(state, "p_child_1", "p_cand_near")).toMatchObject({
      subject_person_id: "p_child_1",
      candidate_person_id: "p_cand_near",
    });

    const offerKey = makeMarriageOfferKey({
      direction: "outbound",
      subject_person_id: "p_child_1",
      candidate_person_id: "p_cand_near",
    });
    expect(buildMarriageOfferRegistryFromState(state).offers_by_key[offerKey]?.state).toBe("rejected");
    expect(
      readRuntimeDomainEvidence(state).entries.flatMap((entry) => entry.events).map((event) => event.kind)
    ).toContain("outbound_marriage_offer_rejected");
  });

  it("blocks repeat offers while the rejected pairing cooldown is active", () => {
    const state = mkState();
    const scoutingRegistry = mkScoutingRegistry(state);
    applyRelationshipDelta(state, "p_cand_near", "p_head", { allegiance: -10, respect: -12, threat: 8 }, "seed");

    resolveOutboundMarriageOffer(state, {
      subject_person_id: "p_child_1",
      scouting_registry: scoutingRegistry,
      offer: mkOffer({
        dowry_coin_net: 4,
        relationship_delta: { respect: 1, allegiance: 0, threat: 1 },
        liege_delta: null,
        risk_tags: ["shady", "profitable"],
      }),
      phase_sequence: 6,
    });

    const blocked = resolveOutboundMarriageOffer(state, {
      subject_person_id: "p_child_1",
      scouting_registry: scoutingRegistry,
      offer: mkOffer(),
      phase_sequence: 7,
    });

    expect(blocked.outcome).toBe("blocked");
    expect(blocked.blocked_reason).toBe("reject_cooldown_active");
    expect(blocked.receipt_snapshots).toEqual([]);
    expect(state.manor.coin).toBe(12);
  });

  it("blocks offers that request more settlement assets than the manor can pay", () => {
    const state = mkState();
    const scoutingRegistry = mkScoutingRegistry(state);
    applyRelationshipDelta(state, "p_cand_near", "p_head", { allegiance: 14, respect: 12, threat: -6 }, "seed");

    const blocked = resolveOutboundMarriageOffer(state, {
      subject_person_id: "p_child_1",
      scouting_registry: scoutingRegistry,
      offer: mkOffer(),
      phase_sequence: 8,
      dowry_requested_delta_by_asset: {
        coin: -30,
      },
    });

    expect(blocked.outcome).toBe("blocked");
    expect(blocked.blocked_reason).toBe("insufficient_settlement_assets");
    expect(blocked.receipt_snapshots).toEqual([]);
    expect(readLedgerReceiptSnapshots(state)).toEqual([]);
    expect(buildMarriageOfferRegistryFromState(state).offer_keys).toEqual([]);
  });
});
