import { describe, expect, it } from "vitest";

import { SIM_VERSION } from "../../src/sim/version";
import type { MarriageOffer, Person, RunState } from "../../src/sim/types";
import {
  MARRIAGE_OFFER_NON_TERMINAL_STATES,
  MARRIAGE_OFFER_REGISTRY_SCHEMA_VERSION,
  MARRIAGE_OFFER_TERMINAL_STATES,
  assertMarriageOfferStateTransition,
  buildMarriageOfferRegistryFromOffers,
  canTransitionMarriageOfferState,
  createMarriageOfferRegistryEntry,
  makeMarriageOfferCandidateKey,
  makeMarriageOfferKey,
  makeMarriageOfferSubjectKey,
} from "../../src/sim/domains/people/marriageOfferRegistry";

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
  const child = mkPerson("p_child_1", "M", 18);
  const liege = mkPerson("p_liege", "M", 50);
  const clergy = mkPerson("p_clergy", "M", 45);
  const extHeadA = mkPerson("p_ext_head_a", "M", 44);
  const extHeadB = mkPerson("p_ext_head_b", "M", 46);
  const candA = mkPerson("p_cand_a", "F", 18);
  const candB = mkPerson("p_cand_b", "F", 19);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 7,
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
      children: [child],
      energy: { max: 0, available: 0 },
      heir_id: child.id,
    },
    locals: {
      liege,
      clergy,
      nobles: [],
    },
    relationships: [],
    flags: {},
    log: [],
    people: {
      [head.id]: head,
      [spouse.id]: spouse,
      [child.id]: child,
      [liege.id]: liege,
      [clergy.id]: clergy,
      [extHeadA.id]: extHeadA,
      [extHeadB.id]: extHeadB,
      [candA.id]: candA,
      [candB.id]: candB,
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
        head_id: extHeadA.id,
        spouse_id: null,
        child_ids: [candA.id],
      },
      h_ext_02: {
        id: "h_ext_02",
        name: "Bramwell",
        tier: "Baron",
        head_id: extHeadB.id,
        spouse_id: null,
        child_ids: [candB.id],
      },
    },
    player_house_id: "h_player",
    kinship_edges: [
      { kind: "spouse_of", a_id: head.id, b_id: spouse.id },
      { kind: "parent_of", parent_id: head.id, child_id: child.id },
      { kind: "parent_of", parent_id: spouse.id, child_id: child.id },
    ],
  };
}

describe("marriage offer registry contract", () => {
  it("builds explicit stable offer records with deterministic subject/candidate keys", () => {
    const state = mkBaseState();
    const offers: MarriageOffer[] = [
      {
        house_person_id: "p_cand_b",
        house_label: "House Bramwell",
        dowry_coin_net: 2,
        relationship_delta: { respect: 5, allegiance: 3, threat: -2 },
        liege_delta: null,
        risk_tags: ["plain", "plain", "profitable"],
      },
      {
        house_person_id: "p_cand_a",
        house_label: "House Ashford",
        dowry_coin_net: -1,
        relationship_delta: { respect: 6, allegiance: 4, threat: -2 },
        liege_delta: { respect: 1, threat: -1 },
        risk_tags: ["costly", "prestige"],
      },
    ];

    const registry = buildMarriageOfferRegistryFromOffers(state, {
      subject_person_id: "p_child_1",
      offers,
    });

    expect(registry.schema_version).toBe(MARRIAGE_OFFER_REGISTRY_SCHEMA_VERSION);
    expect(registry.subject_keys).toEqual(["subject:p_child_1"]);
    expect(registry.candidate_keys).toEqual(["candidate:p_cand_a", "candidate:p_cand_b"]);
    expect(registry.offer_keys).toEqual([
      "marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a",
      "marriage_offer:inbound:subject:p_child_1:candidate:p_cand_b",
    ]);
    expect(registry.subject_offer_keys["subject:p_child_1"]).toEqual(registry.offer_keys);
    expect(registry.candidate_offer_keys["candidate:p_cand_a"]).toEqual([
      "marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a",
    ]);

    const ashford =
      registry.offers_by_key["marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a"];
    expect(ashford).toMatchObject({
      schema_version: "marriage_offer_registry_v0",
      direction: "inbound",
      state: "generated",
      subject_key: "subject:p_child_1",
      subject_person_id: "p_child_1",
      subject_house_id: "h_player",
      candidate_key: "candidate:p_cand_a",
      candidate_person_id: "p_cand_a",
      candidate_house_id: "h_ext_01",
      candidate_house_label: "House Ashford",
      created_turn: 7,
      last_state_change_turn: 7,
      offer_rank: 1,
      dowry_coin_net: -1,
      relationship_delta: { respect: 6, allegiance: 4, threat: -2 },
      liege_delta: { respect: 1, threat: -1 },
      risk_tags: ["costly", "prestige"],
    });

    const bramwell =
      registry.offers_by_key["marriage_offer:inbound:subject:p_child_1:candidate:p_cand_b"];
    expect(bramwell.offer_rank).toBe(0);
    expect(bramwell.risk_tags).toEqual(["plain", "profitable"]);
  });

  it("derives deterministic keys independent of labels and supports outbound direction", () => {
    expect(makeMarriageOfferSubjectKey("p_child_1")).toBe("subject:p_child_1");
    expect(makeMarriageOfferCandidateKey("p_cand_a")).toBe("candidate:p_cand_a");
    expect(
      makeMarriageOfferKey({
        subject_person_id: "p_child_1",
        candidate_person_id: "p_cand_a",
      })
    ).toBe("marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a");
    expect(
      makeMarriageOfferKey({
        direction: "outbound",
        subject_person_id: "p_child_1",
        candidate_person_id: "p_cand_a",
      })
    ).toBe("marriage_offer:outbound:subject:p_child_1:candidate:p_cand_a");
  });

  it("treats generated and pending as non-terminal and terminal outcomes as final", () => {
    expect(MARRIAGE_OFFER_NON_TERMINAL_STATES).toEqual(["generated", "pending"]);
    expect(MARRIAGE_OFFER_TERMINAL_STATES).toEqual(["accepted", "rejected", "expired", "withdrawn"]);

    expect(canTransitionMarriageOfferState("generated", "pending")).toBe(true);
    expect(canTransitionMarriageOfferState("generated", "accepted")).toBe(true);
    expect(canTransitionMarriageOfferState("pending", "accepted")).toBe(true);
    expect(canTransitionMarriageOfferState("pending", "rejected")).toBe(true);
    expect(canTransitionMarriageOfferState("accepted", "pending")).toBe(false);
    expect(canTransitionMarriageOfferState("rejected", "pending")).toBe(false);

    expect(() => assertMarriageOfferStateTransition("pending", "expired")).not.toThrow();
    expect(() => assertMarriageOfferStateTransition("accepted", "pending")).toThrow(
      "Invalid marriage offer state transition: accepted -> pending"
    );
  });

  it("allows explicit pending/terminal records without changing canonical keys", () => {
    const pending = createMarriageOfferRegistryEntry({
      state: "pending",
      subject_person_id: "p_child_1",
      subject_house_id: "h_player",
      candidate_person_id: "p_cand_a",
      candidate_house_id: "h_ext_01",
      candidate_house_label: "House Ashford",
      created_turn: 7,
      last_state_change_turn: 8,
      offer_rank: 0,
      dowry_coin_net: 3,
      relationship_delta: { respect: 4, allegiance: 2, threat: -1 },
      liege_delta: null,
      risk_tags: ["profitable"],
    });

    const terminal = createMarriageOfferRegistryEntry({
      state: "accepted",
      subject_person_id: "p_child_1",
      subject_house_id: "h_player",
      candidate_person_id: "p_cand_a",
      candidate_house_id: "h_ext_01",
      candidate_house_label: "House Ashford",
      created_turn: 7,
      last_state_change_turn: 9,
      offer_rank: 0,
      dowry_coin_net: 3,
      relationship_delta: { respect: 4, allegiance: 2, threat: -1 },
      liege_delta: null,
      risk_tags: ["profitable"],
    });

    expect(pending.offer_key).toBe(terminal.offer_key);
    expect(pending.state).toBe("pending");
    expect(terminal.state).toBe("accepted");
    expect(terminal.last_state_change_turn).toBe(9);
  });
});
