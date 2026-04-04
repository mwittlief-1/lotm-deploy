import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import {
  ECONOMY_PRICE_KEYS,
  buildEconomyPriceReferenceSnapshot,
  buildEconomyPriceTableSnapshot,
  buildFoodStoreFixedSellAction
} from "../../src/sim/domains/economy/pricing";
import { boundedSnapshot } from "../../src/sim/domains/experience/reporting";

describe("v0.3.3 pricing regression", () => {
  it("keeps the contract, reference view, and bounded snapshot aligned to one canonical order", () => {
    const state = createNewRun("pricing_regression_alignment");
    state.turn_index = 5;
    state.manor.population = 20;
    state.manor.bushels_stored = 260;

    const tableSnapshot = buildEconomyPriceTableSnapshot();
    const referenceSnapshot = buildEconomyPriceReferenceSnapshot();
    const snapshot = boundedSnapshot(state) as any;

    expect(tableSnapshot.entries.map((entry) => entry.price_key)).toEqual([...ECONOMY_PRICE_KEYS]);
    expect(referenceSnapshot.map((entry) => entry.reference_id)).toEqual([
      "price_ref:food_stores_market_sell",
      "price_ref:meat_stores_market_sell_placeholder",
      "price_ref:farm_labor_turn_placeholder",
      "price_ref:builder_labor_turn_placeholder"
    ]);
    expect(snapshot.economy_pricing_view).toMatchObject({
      schema_version: "economy_pricing_view_v1",
      turn: 5,
      reference_order: [...ECONOMY_PRICE_KEYS],
      references: [
        { reference_id: "price_ref:food_stores_market_sell", lifecycle: "active" },
        { reference_id: "price_ref:meat_stores_market_sell_placeholder", lifecycle: "placeholder" },
        { reference_id: "price_ref:farm_labor_turn_placeholder", lifecycle: "placeholder" },
        { reference_id: "price_ref:builder_labor_turn_placeholder", lifecycle: "placeholder" }
      ],
      food_stores_sell_action: {
        requested_units: 260,
        sell_cap_units: 240,
        allowed_units: 240,
        sold_units: 240,
        quoted_coin: 24,
        trimmed_to_cap: true,
        trimmed_to_inventory: false
      }
    });
  });

  it("holds the fixed sell rules across zero, inventory-bound, and cap-bound scenarios", () => {
    expect(
      buildFoodStoreFixedSellAction({
        population: 0,
        food_stores_available: 0,
        requested_units: 99
      })
    ).toMatchObject({
      sell_cap_units: 0,
      allowed_units: 0,
      sold_units: 0,
      quoted_coin: 0,
      trimmed_to_cap: true,
      trimmed_to_inventory: false
    });

    expect(
      buildFoodStoreFixedSellAction({
        population: 20,
        food_stores_available: 65,
        requested_units: 200
      })
    ).toMatchObject({
      sell_cap_units: 240,
      allowed_units: 200,
      sold_units: 65,
      quoted_coin: 6,
      trimmed_to_cap: false,
      trimmed_to_inventory: true
    });

    expect(
      buildFoodStoreFixedSellAction({
        population: 20,
        food_stores_available: 260,
        requested_units: 280
      })
    ).toMatchObject({
      sell_cap_units: 240,
      allowed_units: 240,
      sold_units: 240,
      quoted_coin: 24,
      trimmed_to_cap: true,
      trimmed_to_inventory: false
    });
  });
});
