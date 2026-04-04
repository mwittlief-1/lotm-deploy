import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import { buildEconomyPricingSurface } from "../../src/ui/playViewModel";

describe("buildEconomyPricingSurface", () => {
  it("normalizes the economy pricing view into a UI-ready read-only pricing surface", () => {
    const state = createNewRun("ui_pricing_surface");
    state.manor.population = 20;
    state.manor.bushels_stored = 65;

    const surface = buildEconomyPricingSurface(state);

    expect(surface).toEqual({
      schemaVersion: "economy_pricing_view_v1",
      referenceId: "price_ref:food_stores_market_sell",
      referenceLabel: "Food stores market sell",
      ratioLabel: "1 coin / 10 bushels",
      fixedSellCapUnits: 240,
      maxSellableUnits: 65,
      maxQuotedCoin: 6,
      catalogLines: [
        "Food stores market sell: 1 coin / 10 bushels (active)",
        "Meat stores market sell placeholder: 1 coin / 5 bushels (placeholder)",
        "Farm labor turn placeholder: 1 coin / 1 labor turn (placeholder)",
        "Builder labor turn placeholder: 2 coin / 1 labor turn (placeholder)"
      ]
    });
  });
});
