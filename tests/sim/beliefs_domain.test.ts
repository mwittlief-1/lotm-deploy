import { describe, expect, it } from "vitest";

import type { Person, RunState } from "../../src/sim/types";
import {
  BELIEF_PAYLOAD_SCHEMA_VERSION,
  buildBeliefPayloadForSubject,
  buildBeliefPayloadRegistry,
  ensureBeliefRegistry,
  getBeliefObservations,
  knownBeliefSubjects,
  recordBeliefEvidence
} from "../../src/sim/domains/ai/beliefs";
import { applyDecisions, createDefaultDecisions } from "../../src/sim/turn";
import { SIM_VERSION } from "../../src/sim/version";

function mkState(): RunState {
  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 1,
    manor: {
      population: 20,
      farmers: 10,
      builders: 2,
      bushels_stored: 50,
      coin: 10,
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
      head: {
        id: "p_head",
        name: "Head",
        sex: "M",
        age: 40,
        alive: true,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
        married: false
      },
      children: [],
      energy: { max: 3, available: 3 }
    },
    locals: {
      liege: {
        id: "p_liege",
        name: "Liege",
        sex: "M",
        age: 50,
        alive: true,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
        married: false
      },
      clergy: {
        id: "p_clergy",
        name: "Clergy",
        sex: "M",
        age: 45,
        alive: true,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
        married: false
      },
      nobles: []
    },
    relationships: [],
    flags: {},
    log: []
  };
}

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

function mkHotBeliefState(): RunState {
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
    kinship_edges: [{ kind: "spouse_of", a_id: head.id, b_id: spouse.id }]
  };
}

describe("belief registry scaffold", () => {
  it("creates a deterministic registry shape on demand", () => {
    const state = mkState();

    expect(ensureBeliefRegistry(state)).toEqual({
      schema_version: "belief_registry_v0",
      by_subject: {}
    });
  });

  it("records subject-scoped evidence without duplicates and keeps sorted subject keys", () => {
    const state = mkState();

    recordBeliefEvidence(state, "prospects", 2, [
      {
        kind: "prospect_generated",
        detail: "Prospect generated: marriage (pr_1).",
        category: "prospects",
        confidence: "likely",
        subject_ids: ["p_child", "p_candidate"]
      },
      {
        kind: "prospect_generated",
        detail: "Prospect generated: marriage (pr_1).",
        category: "prospects",
        confidence: "likely",
        subject_ids: ["p_child", "p_candidate"]
      },
      {
        kind: "marriage_offer",
        detail: "House Vale (p_suitor)",
        category: "marriage",
        confidence: "known",
        subject_ids: ["p_suitor"]
      }
    ]);

    expect(knownBeliefSubjects(state)).toEqual(["p_candidate", "p_child", "p_suitor"]);
    expect(getBeliefObservations(state, "p_child")).toEqual([
      {
        subject_id: "p_child",
        phase: "prospects",
        turn_index: 2,
        kind: "prospect_generated",
        detail: "Prospect generated: marriage (pr_1).",
        category: "prospects",
        confidence: "likely"
      }
    ]);
    expect(getBeliefObservations(state, "p_candidate")).toEqual([
      {
        subject_id: "p_candidate",
        phase: "prospects",
        turn_index: 2,
        kind: "prospect_generated",
        detail: "Prospect generated: marriage (pr_1).",
        category: "prospects",
        confidence: "likely"
      }
    ]);
    expect(getBeliefObservations(state, "p_suitor")).toEqual([
      {
        subject_id: "p_suitor",
        phase: "prospects",
        turn_index: 2,
        kind: "marriage_offer",
        detail: "House Vale (p_suitor)",
        category: "marriage",
        confidence: "known"
      }
    ]);
  });

  it("builds deterministic belief payloads partitioned by known, likely, and possible states", () => {
    const state = mkState();

    recordBeliefEvidence(state, "prospects", 2, [
      {
        kind: "prospect_generated",
        detail: "Prospect generated: marriage (pr_1).",
        category: "prospects",
        confidence: "likely",
        subject_ids: ["p_child", "p_candidate"]
      }
    ]);
    recordBeliefEvidence(state, "marriage", 3, [
      {
        kind: "marriage_offer",
        detail: "House Vale (p_child)",
        category: "marriage",
        confidence: "known",
        subject_ids: ["p_child"]
      }
    ]);
    recordBeliefEvidence(state, "events", 4, [
      {
        kind: "event_applied",
        detail: "Rumor from the fair.",
        category: "events",
        confidence: "possible",
        subject_ids: ["p_child"]
      }
    ]);

    expect(buildBeliefPayloadForSubject(state, "p_child")).toEqual({
      schema_version: BELIEF_PAYLOAD_SCHEMA_VERSION,
      subject_id: "p_child",
      latest_turn_index: 4,
      dominant_confidence: "known",
      states: {
        known: {
          confidence: "known",
          observation_count: 1,
          latest_turn_index: 3,
          categories: ["marriage"],
          kinds: ["marriage_offer"],
          observations: [
            {
              subject_id: "p_child",
              phase: "marriage",
              turn_index: 3,
              kind: "marriage_offer",
              detail: "House Vale (p_child)",
              category: "marriage",
              confidence: "known"
            }
          ]
        },
        likely: {
          confidence: "likely",
          observation_count: 1,
          latest_turn_index: 2,
          categories: ["prospects"],
          kinds: ["prospect_generated"],
          observations: [
            {
              subject_id: "p_child",
              phase: "prospects",
              turn_index: 2,
              kind: "prospect_generated",
              detail: "Prospect generated: marriage (pr_1).",
              category: "prospects",
              confidence: "likely"
            }
          ]
        },
        possible: {
          confidence: "possible",
          observation_count: 1,
          latest_turn_index: 4,
          categories: ["events"],
          kinds: ["event_applied"],
          observations: [
            {
              subject_id: "p_child",
              phase: "events",
              turn_index: 4,
              kind: "event_applied",
              detail: "Rumor from the fair.",
              category: "events",
              confidence: "possible"
            }
          ]
        }
      }
    });

    expect(Object.keys(buildBeliefPayloadRegistry(state))).toEqual(["p_candidate", "p_child"]);
  });

  it("records preview and resolution evidence into beliefs during turn resolution", () => {
    const state = mkHotBeliefState();
    const next = applyDecisions(state, createDefaultDecisions(state));

    expect(knownBeliefSubjects(next)).toEqual(expect.arrayContaining(["p_cand", "p_child_1"]));
    expect(getBeliefObservations(next, "p_cand").map((entry) => entry.kind)).toContain("marriage_offer");
    expect(getBeliefObservations(next, "p_child_1").map((entry) => entry.kind)).toContain("prospect_generated");
    expect(next.log.at(-1)?.snapshot_after.beliefs?.schema_version).toBe("belief_registry_v0");
  });
});
