import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import { boundedSnapshot } from "../../src/sim/domains/experience/reporting";
import { buildEconomyPricingView } from "../../src/sim/domains/experience/pricingView";

describe("economy pricing view", () => {
  it("builds a stable read-only pricing reference view from the economy contract", () => {
    const state = createNewRun("economy_pricing_view_contract");
    state.turn_index = 4;
    state.manor.population = 20;
    state.manor.bushels_stored = 65;

    const view = buildEconomyPricingView(state);

    expect(view).toEqual({
      schema_version: "economy_pricing_view_v1",
      turn: 4,
      reference_order: [
        "food_stores_market_sell",
        "meat_stores_market_sell_placeholder",
        "farm_labor_turn_placeholder",
        "builder_labor_turn_placeholder"
      ],
      references: [
        {
          schema_version: "economy_price_reference_v1",
          reference_id: "price_ref:food_stores_market_sell",
          price_key: "food_stores_market_sell",
          category: "good",
          lifecycle: "active",
          subject: "food_stores",
          label: "Food stores market sell",
          pricing_model: "fixed_ratio",
          quote_asset: "coin",
          quote_amount: 1,
          base_amount: 10,
          unit: "store_unit",
          runtime_asset_path: "manor.bushels_stored",
          notes: "Anchors the future fixed bushel sale constant near the legacy 0.10 coin-per-bushel midpoint."
        },
        {
          schema_version: "economy_price_reference_v1",
          reference_id: "price_ref:meat_stores_market_sell_placeholder",
          price_key: "meat_stores_market_sell_placeholder",
          category: "good",
          lifecycle: "placeholder",
          subject: "meat_stores",
          label: "Meat stores market sell placeholder",
          pricing_model: "fixed_ratio",
          quote_asset: "coin",
          quote_amount: 1,
          base_amount: 5,
          unit: "store_unit",
          runtime_asset_path: "manor.meat_stores",
          notes: "Reserved for future meat-sale exposure without implying an active live market action in v0.3."
        },
        {
          schema_version: "economy_price_reference_v1",
          reference_id: "price_ref:farm_labor_turn_placeholder",
          price_key: "farm_labor_turn_placeholder",
          category: "labor",
          lifecycle: "placeholder",
          subject: "farm_labor_turn",
          label: "Farm labor turn placeholder",
          pricing_model: "fixed_ratio",
          quote_asset: "coin",
          quote_amount: 1,
          base_amount: 1,
          unit: "labor_turn",
          runtime_asset_path: null,
          notes: "Reserved for future fixed labor pricing hooks; not wired into runtime actions in v0.3."
        },
        {
          schema_version: "economy_price_reference_v1",
          reference_id: "price_ref:builder_labor_turn_placeholder",
          price_key: "builder_labor_turn_placeholder",
          category: "labor",
          lifecycle: "placeholder",
          subject: "builder_labor_turn",
          label: "Builder labor turn placeholder",
          pricing_model: "fixed_ratio",
          quote_asset: "coin",
          quote_amount: 2,
          base_amount: 1,
          unit: "labor_turn",
          runtime_asset_path: null,
          notes: "Reserved for future construction labor pricing hooks; not wired into runtime actions in v0.3."
        }
      ],
      food_stores_sell_action: {
        schema_version: "economy_fixed_sell_action_v1",
        price_reference: {
          schema_version: "economy_price_reference_v1",
          reference_id: "price_ref:food_stores_market_sell",
          price_key: "food_stores_market_sell",
          category: "good",
          lifecycle: "active",
          subject: "food_stores",
          label: "Food stores market sell",
          pricing_model: "fixed_ratio",
          quote_asset: "coin",
          quote_amount: 1,
          base_amount: 10,
          unit: "store_unit",
          runtime_asset_path: "manor.bushels_stored",
          notes: "Anchors the future fixed bushel sale constant near the legacy 0.10 coin-per-bushel midpoint."
        },
        population: 20,
        food_stores_available: 65,
        requested_units: 65,
        sell_cap_units: 240,
        allowed_units: 65,
        sold_units: 65,
        quoted_coin: 6,
        trimmed_to_cap: false,
        trimmed_to_inventory: false
      }
    });
  });

  it("projects the pricing view into bounded snapshots", () => {
    const state = createNewRun("economy_pricing_view_snapshot");
    state.manor.population = 20;
    state.manor.bushels_stored = 50;

    const snapshot = boundedSnapshot(state) as any;

    expect(snapshot.economy_pricing_view).toMatchObject({
      schema_version: "economy_pricing_view_v1",
      reference_order: [
        "food_stores_market_sell",
        "meat_stores_market_sell_placeholder",
        "farm_labor_turn_placeholder",
        "builder_labor_turn_placeholder"
      ],
      food_stores_sell_action: {
        schema_version: "economy_fixed_sell_action_v1",
        sell_cap_units: 240,
        sold_units: 50,
        quoted_coin: 5
      }
    });
  });
});
