import { describe, expect, it } from "vitest";

import type { RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";
import {
  applyConstructionProgressDelta,
  applyConstructionWork,
  clearConstructionProject,
  constructionProgress,
  hasActiveConstruction,
  normalizeConstructionState,
  startConstructionProject
} from "../../src/sim/domains/economy/construction";

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

describe("construction domain", () => {
  it("starts, advances, and completes construction without changing event-time semantics", () => {
    const state = mkState();

    startConstructionProject(state, "granary_upgrade", 10);
    expect(hasActiveConstruction(state)).toBe(true);
    expect(constructionProgress(state)).toBe(0);

    expect(applyConstructionProgressDelta(state, 4)).toBe(4);
    expect(constructionProgress(state)).toBe(4);
    expect(state.manor.improvements).toEqual([]);

    const work = applyConstructionWork(state, 6);
    expect(work).toEqual({ progress_added: 6, completed_improvement_id: "granary_upgrade" });
    expect(hasActiveConstruction(state)).toBe(false);
    expect(state.manor.improvements).toEqual(["granary_upgrade"]);
  });

  it("normalizes and clears construction state", () => {
    const state = mkState();

    startConstructionProject(state, "field_rotation", 0);
    if (!state.manor.construction) throw new Error("expected construction project");
    state.manor.construction.progress = -3;
    state.manor.construction.required = 0;
    normalizeConstructionState(state);

    expect(state.manor.construction.progress).toBe(0);
    expect(state.manor.construction.required).toBe(1);

    clearConstructionProject(state);
    expect(hasActiveConstruction(state)).toBe(false);
    expect(constructionProgress(state)).toBe(0);
  });
});
