import { describe, expect, it } from "vitest";

import type { RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";
import {
  availableEnergy,
  canSpendEnergy,
  refreshEnergy,
  setAvailableEnergy,
  setEnergyMax,
  spendEnergy
} from "../../src/sim/domains/court/energy";

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
      energy: { max: 3, available: 2 }
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

describe("court energy domain", () => {
  it("spends and refreshes energy with clamped semantics", () => {
    const state = mkState();

    expect(availableEnergy(state)).toBe(2);
    expect(canSpendEnergy(state, 2)).toBe(true);
    expect(canSpendEnergy(state, 3)).toBe(false);

    expect(spendEnergy(state, 1)).toBe(1);
    expect(availableEnergy(state)).toBe(1);

    expect(spendEnergy(state, 9)).toBe(1);
    expect(availableEnergy(state)).toBe(0);

    expect(refreshEnergy(state)).toBe(3);
    expect(availableEnergy(state)).toBe(3);
  });

  it("clamps available energy when max changes", () => {
    const state = mkState();

    expect(setAvailableEnergy(state, 99)).toBe(3);
    expect(setEnergyMax(state, 1)).toBe(1);
    expect(availableEnergy(state)).toBe(1);
  });
});
