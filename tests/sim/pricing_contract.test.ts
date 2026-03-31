import { describe, expect, it } from "vitest";

import { FISCAL_LEDGER_RUNTIME_ASSET_PATHS } from "../../src/sim/domains/economy/schema";
import {
  ECONOMY_FIXED_PRICE_TABLE,
  ECONOMY_PRICE_KEYS,
  ECONOMY_PRICE_REFERENCE_SCHEMA_VERSION,
  ECONOMY_PRICE_TABLE_SCHEMA_VERSION,
  buildEconomyPriceReferenceSnapshot,
  buildEconomyPriceTableSnapshot,
  serializeEconomyPriceReferenceSnapshot,
  serializeEconomyPriceTableSnapshot,
  toEconomyPriceReference,
  type EconomyPriceTableContractV1
} from "../../src/sim/domains/economy/pricing";

describe("economy pricing contract", () => {
  it("locks the minimal fixed price table for goods and labor placeholders", () => {
    expect(ECONOMY_PRICE_TABLE_SCHEMA_VERSION).toBe("economy_price_table_v1");
    expect(ECONOMY_PRICE_REFERENCE_SCHEMA_VERSION).toBe("economy_price_reference_v1");
    expect(ECONOMY_PRICE_KEYS).toEqual([
      "food_stores_market_sell",
      "meat_stores_market_sell_placeholder",
      "farm_labor_turn_placeholder",
      "builder_labor_turn_placeholder"
    ]);

    expect(buildEconomyPriceTableSnapshot()).toEqual({
      schema_version: ECONOMY_PRICE_TABLE_SCHEMA_VERSION,
      entries: [
        {
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
          runtime_asset_path: FISCAL_LEDGER_RUNTIME_ASSET_PATHS.food_stores,
          notes: "Anchors the future fixed bushel sale constant near the legacy 0.10 coin-per-bushel midpoint."
        },
        {
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
          runtime_asset_path: FISCAL_LEDGER_RUNTIME_ASSET_PATHS.meat_stores,
          notes: "Reserved for future meat-sale exposure without implying an active live market action in v0.3."
        },
        {
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
      ]
    });
  });

  it("derives deterministic typed price references from the table", () => {
    expect(toEconomyPriceReference("food_stores_market_sell")).toEqual({
      schema_version: ECONOMY_PRICE_REFERENCE_SCHEMA_VERSION,
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
      runtime_asset_path: FISCAL_LEDGER_RUNTIME_ASSET_PATHS.food_stores,
      notes: "Anchors the future fixed bushel sale constant near the legacy 0.10 coin-per-bushel midpoint."
    });

    expect(toEconomyPriceReference("builder_labor_turn_placeholder")).toMatchObject({
      schema_version: ECONOMY_PRICE_REFERENCE_SCHEMA_VERSION,
      reference_id: "price_ref:builder_labor_turn_placeholder",
      price_key: "builder_labor_turn_placeholder",
      category: "labor",
      lifecycle: "placeholder",
      runtime_asset_path: null,
      quote_amount: 2,
      base_amount: 1
    });
  });

  it("serializes table and reference snapshots deterministically regardless of record insertion order", () => {
    const tableA = {
      builder_labor_turn_placeholder: ECONOMY_FIXED_PRICE_TABLE.builder_labor_turn_placeholder,
      food_stores_market_sell: ECONOMY_FIXED_PRICE_TABLE.food_stores_market_sell,
      farm_labor_turn_placeholder: ECONOMY_FIXED_PRICE_TABLE.farm_labor_turn_placeholder,
      meat_stores_market_sell_placeholder: ECONOMY_FIXED_PRICE_TABLE.meat_stores_market_sell_placeholder
    } satisfies EconomyPriceTableContractV1;

    const tableB = {
      meat_stores_market_sell_placeholder: ECONOMY_FIXED_PRICE_TABLE.meat_stores_market_sell_placeholder,
      farm_labor_turn_placeholder: ECONOMY_FIXED_PRICE_TABLE.farm_labor_turn_placeholder,
      builder_labor_turn_placeholder: ECONOMY_FIXED_PRICE_TABLE.builder_labor_turn_placeholder,
      food_stores_market_sell: ECONOMY_FIXED_PRICE_TABLE.food_stores_market_sell
    } satisfies EconomyPriceTableContractV1;

    expect(serializeEconomyPriceTableSnapshot(tableA)).toBe(serializeEconomyPriceTableSnapshot(tableB));
    expect(serializeEconomyPriceReferenceSnapshot(tableA)).toBe(serializeEconomyPriceReferenceSnapshot(tableB));
    expect(buildEconomyPriceReferenceSnapshot().map((entry) => entry.reference_id)).toEqual([
      "price_ref:food_stores_market_sell",
      "price_ref:meat_stores_market_sell_placeholder",
      "price_ref:farm_labor_turn_placeholder",
      "price_ref:builder_labor_turn_placeholder"
    ]);
  });

  it("normalizes malformed custom ratios to positive integers without changing key order", () => {
    const custom = {
      ...ECONOMY_FIXED_PRICE_TABLE,
      food_stores_market_sell: {
        ...ECONOMY_FIXED_PRICE_TABLE.food_stores_market_sell,
        quote_amount: 0.4,
        base_amount: -5
      }
    } satisfies EconomyPriceTableContractV1;

    expect(buildEconomyPriceTableSnapshot(custom).entries[0]).toMatchObject({
      price_key: "food_stores_market_sell",
      quote_amount: 1,
      base_amount: 1
    });
  });
});
