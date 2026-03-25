import { describe, expect, it } from "vitest";

import type { RunState, TurnContext } from "../../src/sim/types";
import { buildIntelSections } from "../../src/ui/intelModel";
import { SIM_VERSION } from "../../src/sim/version";

function mkState(): RunState {
  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 2,
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
    log: [],
    people: {
      p_head: {
        id: "p_head",
        name: "Head",
        sex: "M",
        age: 40,
        alive: true,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
        married: false
      },
      p_child: {
        id: "p_child",
        name: "Child",
        sex: "M",
        age: 18,
        alive: true,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
        married: false
      },
      p_candidate: {
        id: "p_candidate",
        name: "Candidate",
        sex: "F",
        age: 19,
        alive: true,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
        married: false
      }
    },
    beliefs: {
      schema_version: "belief_registry_v0",
      by_subject: {
        p_child: [
          {
            subject_id: "p_child",
            phase: "prospects",
            turn_index: 1,
            kind: "prospect_generated",
            detail: "Prospect generated: marriage (pr_1).",
            category: "prospects",
            confidence: "likely"
          }
        ],
        p_candidate: [
          {
            subject_id: "p_candidate",
            phase: "marriage",
            turn_index: 1,
            kind: "marriage_offer",
            detail: "House Vale (p_candidate)",
            category: "marriage",
            confidence: "known"
          }
        ]
      }
    }
  };
}

function mkCtx(state: RunState): TurnContext {
  return {
    preview_state: state,
    report: {
      turn_index: 2,
      weather_multiplier: 1,
      market: { price_per_bushel: 0.1, sell_cap_bushels: 0 },
      spoilage: { rate: 0, loss_bushels: 0 },
      production_bushels: 0,
      consumption_bushels: 0,
      peasant_consumption_bushels: 0,
      court_consumption_bushels: 0,
      total_consumption_bushels: 0,
      shortage_bushels: 0,
      construction: { progress_added: 0, completed_improvement_id: null },
      obligations: {
        tax_due_coin: 0,
        tithe_due_bushels: 0,
        arrears_coin: 0,
        arrears_bushels: 0,
        war_levy_due: null
      },
      household: { births: [], deaths: [], population_delta: 0 },
      house_log: [],
      events: [],
      top_drivers: [],
      notes: []
    },
    marriage_window: null,
    max_labor_shift: 0,
    phase_results_v0: [
      {
        phase: "prospects",
        receipts: [],
        log_events: [],
        evidence_events_v0: [
          {
            kind: "prospect_generated",
            detail: "Prospect generated: marriage (pr_2).",
            category: "prospects",
            confidence: "likely",
            subject_ids: ["p_child", "p_candidate"]
          }
        ],
        rng_keys_used: []
      },
      {
        phase: "marriage",
        receipts: [],
        log_events: [],
        evidence_events_v0: [
          {
            kind: "marriage_offer",
            detail: "House River (p_candidate)",
            category: "marriage",
            confidence: "known",
            subject_ids: ["p_candidate"]
          }
        ],
        rng_keys_used: []
      }
    ]
  };
}

describe("intel model", () => {
  it("builds deterministic current and memory sections from beliefs and phase evidence", () => {
    const state = mkState();
    const ctx = mkCtx(state);

    const intel = buildIntelSections({ state, ctx, currentLimit: 4, memoryLimit: 4 });

    expect(intel.current).toEqual([
      {
        id: "current|marriage|p_candidate|marriage_offer|House River (p_candidate)",
        subject_id: "p_candidate",
        subject_label: "Candidate",
        detail: "House River (p_candidate)",
        confidence: "known",
        category: "marriage",
        phase: "marriage",
        turn_index: 2,
        source: "current"
      },
      {
        id: "current|prospects|p_candidate|prospect_generated|Prospect generated: marriage (pr_2).",
        subject_id: "p_candidate",
        subject_label: "Candidate",
        detail: "Prospect generated: marriage (pr_2).",
        confidence: "likely",
        category: "prospects",
        phase: "prospects",
        turn_index: 2,
        source: "current"
      },
      {
        id: "current|prospects|p_child|prospect_generated|Prospect generated: marriage (pr_2).",
        subject_id: "p_child",
        subject_label: "Child",
        detail: "Prospect generated: marriage (pr_2).",
        confidence: "likely",
        category: "prospects",
        phase: "prospects",
        turn_index: 2,
        source: "current"
      }
    ]);

    expect(intel.memory).toEqual([
      {
        id: "memory|1|marriage|p_candidate|marriage_offer|House Vale (p_candidate)",
        subject_id: "p_candidate",
        subject_label: "Candidate",
        detail: "House Vale (p_candidate)",
        confidence: "known",
        category: "marriage",
        phase: "marriage",
        turn_index: 1,
        source: "memory"
      },
      {
        id: "memory|1|prospects|p_child|prospect_generated|Prospect generated: marriage (pr_1).",
        subject_id: "p_child",
        subject_label: "Child",
        detail: "Prospect generated: marriage (pr_1).",
        confidence: "likely",
        category: "prospects",
        phase: "prospects",
        turn_index: 1,
        source: "memory"
      }
    ]);
  });
});
