import { describe, expect, it } from "vitest";

import {
  ECONOMY_FIXED_SELL_ACTION_SCHEMA_VERSION,
  ECONOMY_FIXED_SELL_CAP_BPS,
  buildFoodStoreFixedSellAction,
  buildFoodStoreFixedSellActionFromState,
  findEconomyPriceReferenceBySubject,
  fixedSellCapUnitsForPopulation,
  quoteCoinForEconomyPriceReference
} from "../../src/sim/domains/economy/pricing";
import type { Person, RunState } from "../../src/sim/types";
import { SIM_VERSION } from "../../src/sim/version";

function mkPerson(id: string, name: string, sex: "M" | "F", age: number): Person {
  return {
    id,
    name,
    sex,
    age,
    alive: true,
    traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
    married: false
  };
}

function mkState(): RunState {
  const head = mkPerson("p_head", "Lord Rowan", "M", 40);
  const spouse = mkPerson("p_spouse", "Lady Rowan", "F", 38);
  const liege = mkPerson("p_liege", "House Liege", "M", 50);
  const clergy = mkPerson("p_clergy", "Parish Church", "M", 45);

  return {
    version: SIM_VERSION,
    app_version: "test",
    run_seed: "seed",
    turn_index: 1,
    manor: {
      population: 20,
      farmers: 10,
      builders: 2,
      bushels_stored: 260,
      meat_stores: 6,
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

describe("economy pricing behavior", () => {
  it("exposes deterministic price lookup by subject", () => {
    expect(findEconomyPriceReferenceBySubject("food_stores")).toMatchObject({
      price_key: "food_stores_market_sell",
      lifecycle: "active",
      reference_id: "price_ref:food_stores_market_sell"
    });
    expect(findEconomyPriceReferenceBySubject("builder_labor_turn")).toMatchObject({
      price_key: "builder_labor_turn_placeholder",
      lifecycle: "placeholder",
      reference_id: "price_ref:builder_labor_turn_placeholder"
    });
  });

  it("quotes coin from fixed ratios without float drift", () => {
    const reference = findEconomyPriceReferenceBySubject("food_stores");
    expect(reference).not.toBeNull();
    expect(quoteCoinForEconomyPriceReference(reference!, 0)).toBe(0);
    expect(quoteCoinForEconomyPriceReference(reference!, 9)).toBe(0);
    expect(quoteCoinForEconomyPriceReference(reference!, 10)).toBe(1);
    expect(quoteCoinForEconomyPriceReference(reference!, 27)).toBe(2);
  });

  it("builds bounded food-store sell actions from fixed constants", () => {
    expect(ECONOMY_FIXED_SELL_CAP_BPS).toBe(10000);
    expect(fixedSellCapUnitsForPopulation(20)).toBe(240);

    expect(
      buildFoodStoreFixedSellAction({
        population: 20,
        food_stores_available: 260,
        requested_units: 280
      })
    ).toEqual({
      schema_version: ECONOMY_FIXED_SELL_ACTION_SCHEMA_VERSION,
      price_reference: expect.objectContaining({
        price_key: "food_stores_market_sell",
        reference_id: "price_ref:food_stores_market_sell"
      }),
      population: 20,
      food_stores_available: 260,
      requested_units: 280,
      sell_cap_units: 240,
      allowed_units: 240,
      sold_units: 240,
      quoted_coin: 24,
      trimmed_to_cap: true,
      trimmed_to_inventory: false
    });
  });

  it("clamps fixed sell actions to available stores when inventory is short", () => {
    const state = mkState();
    state.manor.bushels_stored = 65;

    expect(buildFoodStoreFixedSellActionFromState(state, 200)).toMatchObject({
      population: 20,
      food_stores_available: 65,
      requested_units: 200,
      sell_cap_units: 240,
      allowed_units: 200,
      sold_units: 65,
      quoted_coin: 6,
      trimmed_to_cap: false,
      trimmed_to_inventory: true
    });
  });
});
