import type { RunState } from "../../types";
import {
  ECONOMY_PRICE_KEYS,
  buildEconomyPriceReferenceSnapshot,
  buildFoodStoreFixedSellActionFromState,
  type EconomyFixedSellActionV1,
  type EconomyPriceKeyV1,
  type EconomyPriceReferenceV1
} from "../economy/pricing";

export const ECONOMY_PRICING_VIEW_SCHEMA_VERSION = "economy_pricing_view_v1" as const;

export interface EconomyPricingViewV1 {
  schema_version: typeof ECONOMY_PRICING_VIEW_SCHEMA_VERSION;
  turn: number;
  reference_order: EconomyPriceKeyV1[];
  references: EconomyPriceReferenceV1[];
  food_stores_sell_action: EconomyFixedSellActionV1;
}

function normalizeInteger(value: number): number {
  return Math.trunc(value);
}

export function buildEconomyPricingView(state: RunState): EconomyPricingViewV1 {
  return {
    schema_version: ECONOMY_PRICING_VIEW_SCHEMA_VERSION,
    turn: normalizeInteger(state.turn_index),
    reference_order: [...ECONOMY_PRICE_KEYS],
    references: buildEconomyPriceReferenceSnapshot(),
    food_stores_sell_action: buildFoodStoreFixedSellActionFromState(state, state.manor.bushels_stored)
  };
}

export function serializeEconomyPricingView(state: RunState): string {
  return JSON.stringify(buildEconomyPricingView(state));
}
