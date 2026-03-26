import { describe, expect, it } from "vitest";

import { SIM_VERSION } from "../../src/sim/version";
import type { MarriageOffer, Person, RunState } from "../../src/sim/types";
import { buildMarriageWindow } from "../../src/sim/domains/people/marriage";
import {
  MARRIAGE_REJECT_COOLDOWN_TURNS,
  MARRIAGE_OFFER_NON_TERMINAL_STATES,
  MARRIAGE_OFFER_REGISTRY_SCHEMA_VERSION,
  MARRIAGE_OFFER_TERMINAL_STATES,
  assertMarriageOfferStateTransition,
  buildMarriageOfferOwnershipIndex,
  buildMarriageOfferOwnershipIndexFromState,
  buildMarriageRejectCooldownsFromState,
  buildMarriageOfferRegistryFromState,
  buildMarriageOfferRegistryFromOffers,
  buildMarriageOfferRegistryFromSubjectOffers,
  canTransitionMarriageOfferState,
  createMarriageOfferRegistryEntry,
  getMarriageRejectCooldown,
  isMarriagePairCoolingDown,
  makeMarriageOfferCandidateKey,
  makeMarriageOfferKey,
  makeMarriageOfferPairingKey,
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

function appendProspectGenerated(state: RunState, opts: {
  turn_index: number;
  prospect_id: string;
  subject_person_id: string;
  spouse_person_id: string;
  from_house_id: string;
  coin_delta?: number;
}): void {
  const prospect = {
    id: opts.prospect_id,
    type: "marriage" as const,
    from_house_id: opts.from_house_id,
    to_house_id: "h_player",
    subject_person_id: opts.subject_person_id,
    spouse_person_id: opts.spouse_person_id,
    summary: "Marriage proposal",
    requirements: [],
    costs: {},
    predicted_effects: {
      coin_delta: opts.coin_delta ?? 0,
      relationship_deltas: [
        {
          scope: "person",
          from_id: "p_head",
          to_id: opts.spouse_person_id,
          allegiance_delta: 3,
          respect_delta: 5,
          threat_delta: -2,
        },
      ],
      flags_set: [],
    },
    uncertainty: "known" as const,
    expires_turn: opts.turn_index + 2,
    actions: ["accept", "reject"] as const,
  };

  state.log.push({
    turn_index: opts.turn_index,
    report: {
      notes: [],
      key_flags: [],
      prospects_log: [
        {
          kind: "prospect_generated" as const,
          turn_index: opts.turn_index,
          type: "marriage" as const,
          from_house_id: opts.from_house_id,
          to_house_id: "h_player",
          subject_person_id: opts.subject_person_id,
          prospect_id: opts.prospect_id,
          prospect,
        },
      ],
    },
  } as any);
}

function appendProspectResolution(state: RunState, opts: {
  turn_index: number;
  kind: "prospect_accepted" | "prospect_rejected" | "prospect_expired";
  prospect_id: string;
  subject_person_id: string;
  from_house_id: string;
}): void {
  state.log.push({
    turn_index: opts.turn_index,
    report: {
      notes: [],
      key_flags: [],
      prospects_log: [
        {
          kind: opts.kind,
          turn_index: opts.turn_index,
          type: "marriage" as const,
          from_house_id: opts.from_house_id,
          to_house_id: "h_player",
          subject_person_id: opts.subject_person_id,
          prospect_id: opts.prospect_id,
          effects_applied: {},
        },
      ],
    },
  } as any);
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

  it("builds member-level ownership for multiple household subjects before phase integration", () => {
    const state = mkBaseState();

    const secondChild = mkPerson("p_child_2", "M", 17);
    state.house.children.push(secondChild);
    state.people![secondChild.id] = secondChild;
    (state.houses!.h_player as any).child_ids.push(secondChild.id);

    const registry = buildMarriageOfferRegistryFromSubjectOffers(state, [
      {
        subject_person_id: "p_child_1",
        offers: [
          {
            house_person_id: "p_cand_a",
            house_label: "House Ashford",
            dowry_coin_net: 3,
            relationship_delta: { respect: 5, allegiance: 2, threat: -1 },
            liege_delta: null,
            risk_tags: ["plain", "profitable"],
          },
        ],
        state: "pending",
        created_turn: 6,
      },
      {
        subject_person_id: "p_child_2",
        offers: [
          {
            house_person_id: "p_cand_b",
            house_label: "House Bramwell",
            dowry_coin_net: 1,
            relationship_delta: { respect: 4, allegiance: 3, threat: -1 },
            liege_delta: null,
            risk_tags: ["plain", "profitable"],
          },
        ],
        state: "pending",
        created_turn: 6,
      },
    ]);

    const ownership = buildMarriageOfferOwnershipIndex(registry);

    expect(registry.subject_keys).toEqual(["subject:p_child_1", "subject:p_child_2"]);
    expect(ownership.active_subject_keys).toEqual(["subject:p_child_1", "subject:p_child_2"]);
    expect(ownership.subjects_by_key["subject:p_child_1"]).toMatchObject({
      subject_person_id: "p_child_1",
      offer_keys: ["marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a"],
      active_offer_keys: ["marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a"],
      candidate_keys: ["candidate:p_cand_a"],
    });
    expect(ownership.subjects_by_key["subject:p_child_2"]).toMatchObject({
      subject_person_id: "p_child_2",
      offer_keys: ["marriage_offer:inbound:subject:p_child_2:candidate:p_cand_b"],
      active_offer_keys: ["marriage_offer:inbound:subject:p_child_2:candidate:p_cand_b"],
      candidate_keys: ["candidate:p_cand_b"],
    });
  });

  it("reconstructs pending offer state from generated history plus active prospect refs", () => {
    const state = mkBaseState();
    appendProspectGenerated(state, {
      turn_index: 4,
      prospect_id: "pros_marriage_pending",
      subject_person_id: "p_child_1",
      spouse_person_id: "p_cand_a",
      from_house_id: "h_ext_01",
      coin_delta: 3,
    });
    (state.flags as any)._prospects_active_v1 = [{ id: "pros_marriage_pending", expires_turn: 6 }];

    const registry = buildMarriageOfferRegistryFromState(state);
    const key = "marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a";
    const entry = registry.offers_by_key[key];

    expect(entry).toBeTruthy();
    expect(entry.state).toBe("pending");
    expect(entry.created_turn).toBe(4);
    expect(entry.subject_house_id).toBe("h_player");
    expect(entry.candidate_house_id).toBe("h_ext_01");
  });

  it("keeps at most one pending offer per candidate and deterministically withdraws duplicates", () => {
    const state = mkBaseState();

    const secondChild = mkPerson("p_child_2", "M", 17);
    state.house.children.push(secondChild);
    state.people![secondChild.id] = secondChild;
    (state.houses!.h_player as any).child_ids.push(secondChild.id);

    appendProspectGenerated(state, {
      turn_index: 4,
      prospect_id: "pros_marriage_a",
      subject_person_id: "p_child_1",
      spouse_person_id: "p_cand_a",
      from_house_id: "h_ext_01",
      coin_delta: 3,
    });
    appendProspectGenerated(state, {
      turn_index: 5,
      prospect_id: "pros_marriage_b",
      subject_person_id: "p_child_2",
      spouse_person_id: "p_cand_a",
      from_house_id: "h_ext_01",
      coin_delta: 2,
    });

    (state.flags as any)._prospects_active_v1 = [
      { id: "pros_marriage_a", expires_turn: 6 },
      { id: "pros_marriage_b", expires_turn: 7 },
    ];
    state.turn_index = 7;

    const registry = buildMarriageOfferRegistryFromState(state);
    const candidateKeys = registry.candidate_offer_keys["candidate:p_cand_a"];

    expect(candidateKeys).toEqual([
      "marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a",
      "marriage_offer:inbound:subject:p_child_2:candidate:p_cand_a",
    ]);
    expect(
      registry.offers_by_key["marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a"].state
    ).toBe("pending");
    expect(
      registry.offers_by_key["marriage_offer:inbound:subject:p_child_2:candidate:p_cand_a"].state
    ).toBe("withdrawn");
    expect(
      registry.offers_by_key["marriage_offer:inbound:subject:p_child_2:candidate:p_cand_a"].last_state_change_turn
    ).toBe(7);
  });

  it("finalizes pending offers on accept and reject even if stale active refs remain", () => {
    const state = mkBaseState();

    appendProspectGenerated(state, {
      turn_index: 4,
      prospect_id: "pros_marriage_accept",
      subject_person_id: "p_child_1",
      spouse_person_id: "p_cand_a",
      from_house_id: "h_ext_01",
    });
    appendProspectGenerated(state, {
      turn_index: 5,
      prospect_id: "pros_marriage_reject",
      subject_person_id: "p_child_1",
      spouse_person_id: "p_cand_b",
      from_house_id: "h_ext_02",
    });
    appendProspectResolution(state, {
      turn_index: 6,
      kind: "prospect_accepted",
      prospect_id: "pros_marriage_accept",
      subject_person_id: "p_child_1",
      from_house_id: "h_ext_01",
    });
    appendProspectResolution(state, {
      turn_index: 7,
      kind: "prospect_rejected",
      prospect_id: "pros_marriage_reject",
      subject_person_id: "p_child_1",
      from_house_id: "h_ext_02",
    });

    // Leave stale active refs to prove terminal outcomes still win in the canonical registry view.
    (state.flags as any)._prospects_active_v1 = [
      { id: "pros_marriage_accept", expires_turn: 8 },
      { id: "pros_marriage_reject", expires_turn: 8 },
    ];
    state.turn_index = 8;

    const registry = buildMarriageOfferRegistryFromState(state);

    expect(
      registry.offers_by_key["marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a"].state
    ).toBe("accepted");
    expect(
      registry.offers_by_key["marriage_offer:inbound:subject:p_child_1:candidate:p_cand_b"].state
    ).toBe("rejected");

    const pendingStates = registry.offer_keys
      .map((key) => registry.offers_by_key[key])
      .filter((entry) => entry.state === "pending");
    expect(pendingStates).toHaveLength(0);
  });

  it("reconstructs concurrent pending ownership from state history for two household members", () => {
    const state = mkBaseState();

    const secondChild = mkPerson("p_child_2", "M", 17);
    state.house.children.push(secondChild);
    state.people![secondChild.id] = secondChild;
    (state.houses!.h_player as any).child_ids.push(secondChild.id);

    appendProspectGenerated(state, {
      turn_index: 4,
      prospect_id: "pros_marriage_child_1",
      subject_person_id: "p_child_1",
      spouse_person_id: "p_cand_a",
      from_house_id: "h_ext_01",
      coin_delta: 3,
    });
    appendProspectGenerated(state, {
      turn_index: 4,
      prospect_id: "pros_marriage_child_2",
      subject_person_id: "p_child_2",
      spouse_person_id: "p_cand_b",
      from_house_id: "h_ext_02",
      coin_delta: 2,
    });

    (state.flags as any)._prospects_active_v1 = [
      { id: "pros_marriage_child_1", expires_turn: 6 },
      { id: "pros_marriage_child_2", expires_turn: 6 },
    ];
    state.turn_index = 5;

    const registry = buildMarriageOfferRegistryFromState(state);
    const ownership = buildMarriageOfferOwnershipIndexFromState(state);

    expect(registry.subject_keys).toEqual(["subject:p_child_1", "subject:p_child_2"]);
    expect(
      registry.offers_by_key["marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a"].state
    ).toBe("pending");
    expect(
      registry.offers_by_key["marriage_offer:inbound:subject:p_child_2:candidate:p_cand_b"].state
    ).toBe("pending");
    expect(ownership.active_subject_keys).toEqual(["subject:p_child_1", "subject:p_child_2"]);
    expect(ownership.subjects_by_key["subject:p_child_1"].active_offer_keys).toEqual([
      "marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a",
    ]);
    expect(ownership.subjects_by_key["subject:p_child_2"].active_offer_keys).toEqual([
      "marriage_offer:inbound:subject:p_child_2:candidate:p_cand_b",
    ]);
  });

  it("tracks rejected pairings with a deterministic three-turn cooldown", () => {
    const state = mkBaseState();

    appendProspectGenerated(state, {
      turn_index: 4,
      prospect_id: "pros_marriage_reject",
      subject_person_id: "p_child_1",
      spouse_person_id: "p_cand_a",
      from_house_id: "h_ext_01",
    });
    appendProspectResolution(state, {
      turn_index: 7,
      kind: "prospect_rejected",
      prospect_id: "pros_marriage_reject",
      subject_person_id: "p_child_1",
      from_house_id: "h_ext_01",
    });

    state.turn_index = 8;

    const pairingKey = makeMarriageOfferPairingKey({
      subject_person_id: "p_child_1",
      candidate_person_id: "p_cand_a",
    });
    const cooldowns = buildMarriageRejectCooldownsFromState(state);

    expect(MARRIAGE_REJECT_COOLDOWN_TURNS).toBe(3);
    expect(cooldowns[pairingKey]).toMatchObject({
      pairing_key: pairingKey,
      offer_key: "marriage_offer:inbound:subject:p_child_1:candidate:p_cand_a",
      rejected_turn: 7,
      expires_turn: 10,
      remaining_turns: 3,
    });
    expect(getMarriageRejectCooldown(state, "p_child_1", "p_cand_a")?.remaining_turns).toBe(3);
    expect(isMarriagePairCoolingDown(state, "p_child_1", "p_cand_a")).toBe(true);

    state.turn_index = 10;
    expect(getMarriageRejectCooldown(state, "p_child_1", "p_cand_a")?.remaining_turns).toBe(1);
    expect(isMarriagePairCoolingDown(state, "p_child_1", "p_cand_a")).toBe(true);

    state.turn_index = 11;
    expect(getMarriageRejectCooldown(state, "p_child_1", "p_cand_a")).toBeNull();
    expect(isMarriagePairCoolingDown(state, "p_child_1", "p_cand_a")).toBe(false);
  });

  it("excludes cooling-down pairings from marriage offers and restores them after three turns", () => {
    const state = mkBaseState();

    appendProspectGenerated(state, {
      turn_index: 4,
      prospect_id: "pros_marriage_reject",
      subject_person_id: "p_child_1",
      spouse_person_id: "p_cand_a",
      from_house_id: "h_ext_01",
    });
    appendProspectResolution(state, {
      turn_index: 7,
      kind: "prospect_rejected",
      prospect_id: "pros_marriage_reject",
      subject_person_id: "p_child_1",
      from_house_id: "h_ext_01",
    });

    state.turn_index = 8;

    const coolingDownWindow = buildMarriageWindow(state);
    expect(coolingDownWindow?.eligible_child_ids).toEqual(["p_child_1"]);
    expect(coolingDownWindow?.offers.map((offer) => offer.house_person_id)).toEqual(["p_cand_b"]);

    state.turn_index = 11;

    const restoredWindow = buildMarriageWindow(state);
    expect(restoredWindow?.eligible_child_ids).toEqual(["p_child_1"]);
    expect(restoredWindow?.offers.map((offer) => offer.house_person_id).sort((a, b) => a.localeCompare(b))).toEqual([
      "p_cand_a",
      "p_cand_b",
    ]);
  });
});
