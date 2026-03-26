import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import {
  clearLedgerReceiptJournal,
  meatStoreBalance,
  readLedgerReceiptSnapshots,
  setBushelBalance,
  setMeatStoreBalance
} from "../../src/sim/domains/economy/ledger";
import {
  ECONOMY_CONSUMPTION_SCHEMA_VERSION,
  ECONOMY_EQUILIBRIUM_FIXTURE_SCHEMA_VERSION,
  ECONOMY_MEAT_TARGET_BPS,
  applyEconomyConsumptionPlan,
  buildEconomyConsumptionPlan,
  buildEconomyConsumptionPlanFromState,
  buildEconomyEquilibriumFixtureEntryFromState,
  buildEconomyEquilibriumFixtureSnapshot,
  peasantConsumptionBushelsForState,
  serializeEconomyEquilibriumFixtureSnapshot
} from "../../src/sim/domains/economy/consumption";
import type { Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

function fixturePath(name: string): string {
  return path.resolve("qa_artifacts/economy_equilibrium", name);
}

function readFixture(name: string): string {
  return fs.readFileSync(fixturePath(name), "utf8");
}

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
      bushels_stored: 80,
      meat_stores: 18,
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
    } as any,
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

function buildEquilibriumSeedPackFixture(): string {
  const balanced = createNewRun("V03_R0_006_T05_EQ_BALANCED");
  balanced.turn_index = 4;
  balanced.manor.population = 45;
  balanced.manor.farmers = 34;
  balanced.manor.builders = 4;
  balanced.manor.bushels_stored = 900;
  balanced.house.head.traits.martial = 4;
  setMeatStoreBalance(balanced as any, 18);

  const huntingReserve = createNewRun("V03_R0_006_T05_EQ_HUNTING_RESERVE");
  huntingReserve.turn_index = 4;
  huntingReserve.manor.population = 38;
  huntingReserve.manor.farmers = 20;
  huntingReserve.manor.builders = 4;
  huntingReserve.manor.bushels_stored = 720;
  huntingReserve.house.head.traits.martial = 5;
  setMeatStoreBalance(huntingReserve as any, 24);

  const scarcityFallback = createNewRun("V03_R0_006_T05_EQ_SCARCITY_FALLBACK");
  scarcityFallback.turn_index = 4;
  scarcityFallback.manor.population = 42;
  scarcityFallback.manor.farmers = 24;
  scarcityFallback.manor.builders = 6;
  scarcityFallback.manor.bushels_stored = 180;
  scarcityFallback.house.head.traits.martial = 5;
  setMeatStoreBalance(scarcityFallback as any, 68);

  return serializeEconomyEquilibriumFixtureSnapshot([
    buildEconomyEquilibriumFixtureEntryFromState(balanced as any, "balanced_turn", 1840),
    buildEconomyEquilibriumFixtureEntryFromState(huntingReserve as any, "hunting_reserve", 1010),
    buildEconomyEquilibriumFixtureEntryFromState(scarcityFallback as any, "scarcity_fallback", 420)
  ]);
}

describe("economy consumption domain", () => {
  it("keeps the meat share explicit, bounded, and fallback-capable", () => {
    const plan = buildEconomyConsumptionPlan({
      turn: 4,
      food_stores_available: 100,
      meat_stores_available: 60,
      peasant_consumption_bushels: 420,
      court_consumption_bushels: 80
    });

    expect(plan.schema_version).toBe(ECONOMY_CONSUMPTION_SCHEMA_VERSION);
    expect(ECONOMY_MEAT_TARGET_BPS).toEqual({ peasant: 100, court: 500 });
    expect(plan.total_consumption_bushels).toBe(500);
    expect(plan.target_meat_consumption_units).toBe(8);
    expect(plan.target_food_consumption_bushels).toBe(492);
    expect(plan.fallback_food_consumption_bushels).toBe(0);
    expect(plan.fallback_meat_consumption_units).toBe(52);
    expect(plan.food_consumed_bushels).toBe(100);
    expect(plan.meat_consumed_units).toBe(60);
    expect(plan.shortage_bushels).toBe(340);
    expect(plan.summary_lines).toEqual([
      "Demand peasant 420, court 80, total 500.",
      "Target food 492, target meat 8; fallback food 0, fallback meat 52.",
      "Consumed food 100, meat 60; shortage 340."
    ]);
  });

  it("applies the explicit food and meat split through canonical receipt-backed store writers", () => {
    const state = mkState();
    clearLedgerReceiptJournal(state);
    const plan = buildEconomyConsumptionPlan({
      turn: state.turn_index,
      food_stores_available: 80,
      meat_stores_available: 18,
      peasant_consumption_bushels: 72,
      court_consumption_bushels: 20
    });

    expect(applyEconomyConsumptionPlan(state, plan, { phase: "consumption", phase_sequence: 3, related_actor_ids: ["p_head", "p_spouse"] })).toEqual({
      food_consumed_bushels: 80,
      meat_consumed_units: 12,
      shortage_bushels: 0
    });
    expect(state.manor.bushels_stored).toBe(0);
    expect(meatStoreBalance(state)).toBe(6);
    expect(readLedgerReceiptSnapshots(state)).toEqual([
      expect.objectContaining({
        receipt_id: "ledger:t1:consumption:p3:food_stores:0001",
        asset: "food_stores",
        delta: -80,
        balance_after: 0,
        category: "consumption.household_rations",
        rule_id: "consumption.food_stores",
        summary: "Consumption drained food stores for Household rations.",
        related_actor_ids: ["p_head", "p_spouse"]
      }),
      expect.objectContaining({
        receipt_id: "ledger:t1:consumption:p3:meat_stores:0002",
        asset: "meat_stores",
        delta: -12,
        balance_after: 6,
        category: "consumption.household_rations",
        rule_id: "consumption.meat_stores",
        summary: "Consumption drained meat stores for Household rations.",
        related_actor_ids: ["p_head", "p_spouse"]
      })
    ]);
  });

  it("matches the deterministic food and meat equilibrium fixture pack", () => {
    const expected = readFixture("v0.3.0_food_meat_equilibrium_fixture.json");
    const actual = buildEquilibriumSeedPackFixture();

    expect(actual).toBe(expected);

    const snapshot = buildEconomyEquilibriumFixtureSnapshot(JSON.parse(actual).entries);
    expect(snapshot.schema_version).toBe(ECONOMY_EQUILIBRIUM_FIXTURE_SCHEMA_VERSION);
    expect(snapshot.entries.map((entry) => entry.scenario_id)).toEqual([
      "balanced_turn",
      "hunting_reserve",
      "scarcity_fallback"
    ]);
    expect(snapshot.entries[0]?.food_net_delta).toBeGreaterThan(0);
    expect(snapshot.entries[1]?.meat_net_delta).toBeGreaterThan(0);
    expect(snapshot.entries[2]?.shortage_bushels).toBeGreaterThan(0);
  });

  it("derives state-based demand deterministically from the existing grain baseline", () => {
    const state = createNewRun("V03_R0_006_T05_STATE_PLAN");
    state.turn_index = 4;
    state.manor.population = 45;
    state.manor.farmers = 34;
    state.manor.builders = 4;
    setBushelBalance(state as any, 900);
    setMeatStoreBalance(state as any, 18);

    const one = buildEconomyConsumptionPlanFromState(state as any);
    const two = buildEconomyConsumptionPlanFromState(state as any);

    expect(peasantConsumptionBushelsForState(state as any)).toBe(1632);
    expect(one).toEqual(two);
    expect(one.target_meat_consumption_units).toBeGreaterThan(0);
    expect(one.food_stores_after).toBeGreaterThanOrEqual(0);
    expect(one.meat_stores_after).toBeGreaterThanOrEqual(0);
  });
});
