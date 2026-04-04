import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import { TurnReportPanel } from "../../src/ui/panels/TurnReportPanel";
import { buildEconomyPricingSurface } from "../../src/ui/playViewModel";

describe("pricing panels", () => {
  it("renders the read-only pricing reference catalog in the turn report", () => {
    const state = createNewRun("pricing_panel_report");
    state.manor.population = 20;
    state.manor.bushels_stored = 65;

    const pricingSurface = buildEconomyPricingSurface(state);

    const html = renderToStaticMarkup(
      <TurnReportPanel
        accruedThisTurn={null}
        anchorFood="food"
        anchorHousehold="household"
        arrearsCarried={{ coin: 0, bushels: 0 }}
        baselineConsPerTurn={36}
        builderExtraPerTurn={9}
        consBuilders={18}
        consFarmers={180}
        consIdle={18}
        copy={{
          turnReportTimingHelper: "These figures explain what already resolved over the last turn before you set new orders below.",
          turnSummary_last3Years: "Last three years",
          peasantConsumptionLabel: "Peasants",
          peasantConsumptionHelper: "Peasant share.",
          courtConsumptionLabel: "Court",
          courtConsumptionHelper: "Court share.",
          courtEatsSameStores: "Court and peasants draw from the same stores.",
          consumptionReconcileNote: "Totals reconcile after the split.",
          obligationsHelper: "Obligations resolve after stores and market results.",
          obligationsTotal: "Total obligations",
          obligationsDueEntering: "Due entering",
          obligationsAccrued: "Accrued this turn",
          obligationsArrears: "Arrears carried"
        }}
        courtConsumptionBushels={0}
        courtRosterEntries={[]}
        courtSize={0}
        currentHouseLog={[]}
        dueEntering={{ coin: 0, bushels: 0 }}
        fmtObAmount={({ coin, bushels }) => `${coin} coin / ${bushels} bushels`}
        hasConsumptionSplit={false}
        idle={1}
        manor={state.manor}
        peasantConsumptionBushels={0}
        pricingSurface={pricingSurface}
        previewState={state}
        report={{
          top_drivers: [],
          weather_multiplier: 1,
          production_bushels: 0,
          consumption_bushels: 0,
          spoilage: { loss_bushels: 0, rate: 0 },
          market: { price_per_bushel: 0.1, sell_cap_bushels: 240 },
          obligations: { tax_due_coin: 0, tithe_due_bushels: 0 }
        }}
        showHouseholdDetails={false}
        state={state}
        toggleHouseholdDetails={() => undefined}
        totalConsumptionBushels={0}
        totalObligations={{ coin: 0, bushels: 0 }}
        turnYears={3}
      />
    );

    expect(html).toContain("Reference: Food stores market sell (price_ref:food_stores_market_sell) at 1 coin / 10 bushels");
    expect(html).toContain("Fixed reference cap: 240 bushels; current stores allow up to 65 for 6 coin");
    expect(html).toContain("Pricing reference catalog");
    expect(html).toContain("Meat stores market sell placeholder: 1 coin / 5 bushels (placeholder)");
    expect(html).toContain("Builder labor turn placeholder: 2 coin / 1 labor turn (placeholder)");
  });
});
