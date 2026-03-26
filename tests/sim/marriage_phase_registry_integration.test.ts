import { describe, expect, it } from "vitest";

import {
  buildMarriageOfferRegistryFromState,
  getMarriageRejectCooldown,
  makeMarriageOfferKey,
} from "../../src/sim/domains/people/marriageOfferRegistry";
import {
  applyProspectsDecisionPhase,
  buildProspectsWindowPhase,
} from "../../src/sim/phases/phase_prospects";
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
  const spouse = mkPerson("p_spouse", "F", 38, { married: true });
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
    turn_index: 9,
    manor: {
      population: 24,
      farmers: 12,
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
        war_levy_due: null,
      },
    },
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
        tier: "Baron",
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
    kinship_edges: [{ kind: "spouse_of", a_id: head.id, b_id: spouse.id }],
  };
}

function mkMarriageWindow(): MarriageWindow {
  return {
    eligible_child_ids: ["p_child_1"],
    offers: [
      {
        house_person_id: "p_cand_b",
        house_label: "House Bramwell",
        dowry_coin_net: -1,
        relationship_delta: { respect: 4, allegiance: 2, threat: 0 },
        liege_delta: null,
        risk_tags: ["plain", "costly"],
      },
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

function appendProspectsLog(state: RunState, prospectsLog: unknown[]): void {
  state.log.push({
    turn_index: state.turn_index,
    report: {
      notes: [],
      key_flags: [],
      prospects_log: prospectsLog,
    },
  } as any);
}

describe("marriage phase wrapper registry integration", () => {
  it("writes a pending bounded-offer entry from the generated marriage prospect", () => {
    const state = mkState();
    const prospectsLog: any[] = [];
    const marriageWindow = mkMarriageWindow();

    const window = buildProspectsWindowPhase(state, marriageWindow, prospectsLog, {
      computeHeirId: () => "p_child_1",
    });
    const marriageProspect = window.prospects.find((prospect) => prospect.type === "marriage");

    expect(marriageProspect?.spouse_person_id).toBe("p_cand_a");
    appendProspectsLog(state, prospectsLog);

    const registry = buildMarriageOfferRegistryFromState(state);
    const offerKey = makeMarriageOfferKey({
      direction: "inbound",
      subject_person_id: "p_child_1",
      candidate_person_id: "p_cand_a",
    });

    expect(registry.offer_keys).toEqual([offerKey]);
    expect(registry.offers_by_key[offerKey]?.state).toBe("pending");
  });

  it("propagates reject cooldowns through the prospects phase wrapper flow", () => {
    const state = mkState();
    const generationLog: any[] = [];
    const marriageWindow = mkMarriageWindow();

    const window = buildProspectsWindowPhase(state, marriageWindow, generationLog, {
      computeHeirId: () => "p_child_1",
    });
    const marriageProspect = window.prospects.find((prospect) => prospect.type === "marriage");

    expect(marriageProspect).toBeTruthy();
    appendProspectsLog(state, generationLog);

    const resolutionLog: any[] = [];
    applyProspectsDecisionPhase(
      state,
      { prospects_window: window } as any,
      {
        prospects: {
          kind: "prospects",
          actions: [{ prospect_id: marriageProspect!.id, action: "reject" }],
        },
      } as any,
      resolutionLog
    );
    appendProspectsLog(state, resolutionLog);

    const registry = buildMarriageOfferRegistryFromState(state);
    const offerKey = makeMarriageOfferKey({
      direction: "inbound",
      subject_person_id: "p_child_1",
      candidate_person_id: "p_cand_a",
    });

    expect(registry.offers_by_key[offerKey]?.state).toBe("rejected");
    expect(getMarriageRejectCooldown(state, "p_child_1", "p_cand_a")).toMatchObject({
      offer_key: offerKey,
      subject_person_id: "p_child_1",
      candidate_person_id: "p_cand_a",
    });
  });
});
