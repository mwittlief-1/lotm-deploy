import { describe, expect, it } from "vitest";

import type { Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";
import {
  ECONOMY_PRODUCTION_REGISTRY_SCHEMA_VERSION,
  ECONOMY_PRODUCTION_SUMMARY_SCHEMA_VERSION,
  buildEconomyProductionOutputsFromState,
  buildEconomyProductionRegistry,
  buildEconomyProductionSummary,
  deterministicHuntingYieldForState,
  makeEconomyProductionSourceKey,
  serializeEconomyProductionRegistry,
  serializeEconomyProductionSummary
} from "../../src/sim/domains/economy/productionRegistry";

function mkPerson(id: string, sex: "M" | "F", age: number, martial = 3): Person {
  return {
    id,
    name: id,
    sex,
    age,
    alive: true,
    traits: { stewardship: 3, martial, diplomacy: 3, discipline: 3, fertility: 3 },
    married: false
  };
}

function mkState(): RunState {
  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 4,
    manor: {
      population: 18,
      farmers: 8,
      builders: 2,
      bushels_stored: 70,
      meat_stores: 5,
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
      head: mkPerson("p_head", "M", 42, 5),
      spouse: mkPerson("p_spouse", "F", 38),
      spouse_status: "spouse",
      children: [],
      energy: { max: 3, available: 3 },
      heir_id: null
    },
    locals: {
      liege: mkPerson("p_liege", "M", 50),
      clergy: mkPerson("p_clergy", "M", 45),
      nobles: []
    },
    relationships: [],
    flags: {},
    log: []
  };
}

describe("economy production registry contract", () => {
  it("computes deterministic hunting yield from idle workforce and martial skill", () => {
    const state = mkState();

    expect(deterministicHuntingYieldForState(state)).toBe(20);
    expect(deterministicHuntingYieldForState(state)).toBe(20);
  });

  it("builds stable food and meat production registry outputs", () => {
    const registry = buildEconomyProductionRegistry({
      turn: 4,
      food_stores_before: 70,
      meat_stores_before: 5,
      grain_production_bushels: 24,
      hunting_meat_units: 16
    });
    const summary = buildEconomyProductionSummary(registry);

    expect(registry.schema_version).toBe(ECONOMY_PRODUCTION_REGISTRY_SCHEMA_VERSION);
    expect(registry.source_keys).toEqual([
      "production:food_stores:demesne_grain",
      "production:meat_stores:hunting"
    ]);
    expect(registry.totals_by_asset).toEqual({
      food_stores: 24,
      meat_stores: 16
    });
    expect(registry.entries_by_key[makeEconomyProductionSourceKey("demesne_grain", "food_stores")]).toMatchObject({
      asset: "food_stores",
      delta: 24,
      balance_before: 70,
      balance_after: 94,
      rule_id: "production.demesne_grain"
    });
    expect(registry.entries_by_key[makeEconomyProductionSourceKey("hunting", "meat_stores")]).toMatchObject({
      asset: "meat_stores",
      delta: 16,
      balance_before: 5,
      balance_after: 21,
      rule_id: "production.hunting"
    });

    expect(summary.schema_version).toBe(ECONOMY_PRODUCTION_SUMMARY_SCHEMA_VERSION);
    expect(summary.food_stores_before).toBe(70);
    expect(summary.food_stores_after).toBe(94);
    expect(summary.meat_stores_before).toBe(5);
    expect(summary.meat_stores_after).toBe(21);
    expect(summary.summary_lines).toEqual([
      "Demesne grain +24 food stores; stores now 94.",
      "Hunting +16 meat stores; stores now 21."
    ]);
  });

  it("derives registry and summary outputs directly from state for later receipt and summary consumers", () => {
    const state = mkState();
    const outputs = buildEconomyProductionOutputsFromState(state, 24);

    expect(outputs.registry.entries_by_key[makeEconomyProductionSourceKey("demesne_grain", "food_stores")].balance_before).toBe(70);
    expect(outputs.registry.entries_by_key[makeEconomyProductionSourceKey("hunting", "meat_stores")].balance_before).toBe(5);
    expect(outputs.summary.meat_delta).toBe(20);
  });

  it("serializes the same registry and summary snapshots deterministically", () => {
    const state = mkState();
    const one = buildEconomyProductionOutputsFromState(state, 24);
    const two = buildEconomyProductionOutputsFromState(state, 24);

    expect(serializeEconomyProductionRegistry(one.registry)).toBe(serializeEconomyProductionRegistry(two.registry));
    expect(serializeEconomyProductionSummary(one.summary)).toBe(serializeEconomyProductionSummary(two.summary));
  });
});
