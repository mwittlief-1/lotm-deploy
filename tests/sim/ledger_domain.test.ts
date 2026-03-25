import { describe, expect, it } from "vitest";

import { SIM_VERSION } from "../../src/sim/version";
import type { Person, RunState, WarLevyDue } from "../../src/sim/types";
import {
  applyArrearsBushelsDelta,
  applyArrearsCoinDelta,
  applyBushelDelta,
  applyCoinDelta,
  applyTaxDueCoinDelta,
  applyTitheDueBushelsDelta,
  canAffordCoin,
  clearWarLevyDue,
  rollTitheDueBushelsIntoArrears,
  rollTaxDueCoinIntoArrears,
  setBushelBalance,
  setTaxDueCoin,
  setTitheDueBushels,
  setWarLevyDue,
  spendArrearsBushels,
  spendArrearsCoin,
  spendBushels,
  spendCoin,
  spendTitheDueBushels,
  spendTaxDueCoin
} from "../../src/sim/domains/economy/ledger";

function mkPerson(id: string, sex: "M" | "F", age: number): Person {
  return {
    id,
    name: id,
    sex,
    age,
    alive: true,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    married: false
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "M", 40);
  const spouse = mkPerson("p_spouse", "F", 38);
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
      head,
      spouse,
      spouse_status: "spouse",
      children: [],
      energy: { max: 3, available: 3 },
      heir_id: null
    },
    locals: { liege, clergy, nobles: [] },
    relationships: [],
    flags: {},
    log: []
  };
}

describe("economy ledger domain", () => {
  it("applies and spends coin with the same clamped semantics as the legacy direct writes", () => {
    const state = mkState();

    expect(canAffordCoin(state, 8)).toBe(true);
    expect(canAffordCoin(state, 11)).toBe(false);

    expect(applyCoinDelta(state, 4)).toBe(4);
    expect(state.manor.coin).toBe(14);

    expect(spendCoin(state, 6)).toBe(6);
    expect(state.manor.coin).toBe(8);

    expect(applyCoinDelta(state, -20)).toBe(-8);
    expect(state.manor.coin).toBe(0);
  });

  it("owns obligation coin fields and levy lifecycle", () => {
    const state = mkState();

    expect(setTaxDueCoin(state, 7)).toBe(7);
    expect(applyTaxDueCoinDelta(state, -2)).toBe(-2);
    expect(state.manor.obligations.tax_due_coin).toBe(5);
    expect(spendTaxDueCoin(state, 3)).toBe(3);
    expect(state.manor.obligations.tax_due_coin).toBe(2);

    expect(applyArrearsCoinDelta(state, 4)).toBe(4);
    expect(spendArrearsCoin(state, 1)).toBe(1);
    expect(state.manor.obligations.arrears.coin).toBe(3);

    expect(rollTaxDueCoinIntoArrears(state)).toBe(2);
    expect(state.manor.obligations.tax_due_coin).toBe(0);
    expect(state.manor.obligations.arrears.coin).toBe(5);

    const levy: WarLevyDue = { kind: "men_or_coin", men: 4, coin: 6, created_turn: state.turn_index };
    setWarLevyDue(state, levy);
    expect(state.manor.obligations.war_levy_due).toEqual(levy);

    clearWarLevyDue(state);
    expect(state.manor.obligations.war_levy_due).toBeNull();
  });

  it("owns stored bushels and bushel obligation fields", () => {
    const state = mkState();

    expect(setBushelBalance(state, 60)).toBe(60);
    expect(applyBushelDelta(state, -5)).toBe(-5);
    expect(spendBushels(state, 10)).toBe(10);
    expect(state.manor.bushels_stored).toBe(45);

    expect(setTitheDueBushels(state, 7)).toBe(7);
    expect(applyTitheDueBushelsDelta(state, -2)).toBe(-2);
    expect(spendTitheDueBushels(state, 3)).toBe(3);
    expect(state.manor.obligations.tithe_due_bushels).toBe(2);

    expect(applyArrearsBushelsDelta(state, 4)).toBe(4);
    expect(spendArrearsBushels(state, 1)).toBe(1);
    expect(state.manor.obligations.arrears.bushels).toBe(3);

    expect(rollTitheDueBushelsIntoArrears(state)).toBe(2);
    expect(state.manor.obligations.tithe_due_bushels).toBe(0);
    expect(state.manor.obligations.arrears.bushels).toBe(5);
  });
});
