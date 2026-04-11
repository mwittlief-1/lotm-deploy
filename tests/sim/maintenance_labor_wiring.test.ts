import { describe, expect, it } from "vitest";

import { applyDecisions, createNewRun, proposeTurn } from "../../src/sim";
import { buildCourtDelegationRegistry } from "../../src/sim/domains/court/delegationRegistry";
import {
  buildMaintenanceLaborPressure,
  maintenanceLaborPressureSummaryLines,
} from "../../src/sim/domains/court/maintenance";
import type { TurnDecisions } from "../../src/sim/types";

function attachMaintenanceRegistry(state: any, entries: Array<Record<string, unknown>>): void {
  state.economy = {
    ...(state.economy ?? {}),
    maintenance_registry_v1: {
      schema_version: "maintenance_registry_v1",
      entries,
    },
  };
}

function baseWiringState(seed: string) {
  const state = createNewRun(seed);
  state.manor.population = 20;
  state.manor.farmers = 10;
  state.manor.builders = 2;
  state.manor.construction = {
    improvement_id: "drainage_ditches",
    progress: 0,
    required: 60,
  };
  return state;
}

function noOpDecisions(state: ReturnType<typeof createNewRun>): TurnDecisions {
  return {
    labor: { kind: "labor", desired_farmers: state.manor.farmers, desired_builders: state.manor.builders },
    sell: { kind: "sell", sell_bushels: 0 },
    obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
    construction: { kind: "construction", action: "none" },
    marriage: { kind: "marriage", action: "none" },
    prospects: { kind: "prospects", actions: [] },
  };
}

describe("maintenance labor wiring", () => {
  it("applies builder-first maintenance drag before production and construction output", () => {
    const control = baseWiringState("maintenance_labor_wiring_v1");
    const state = baseWiringState("maintenance_labor_wiring_v1");
    attachMaintenanceRegistry(state as any, [
      { maintenance_key: "watch_ward", label: "Watch & Ward", source_kind: "security", labor_required: 1 },
      { maintenance_key: "granary_upkeep", label: "Granary upkeep", source_kind: "storage", labor_required: 2 },
    ]);

    const pressure = buildMaintenanceLaborPressure(state);
    const controlCtx = proposeTurn(control);
    const ctx = proposeTurn(state);
    const consumptionPhase = ctx.report.phase_results_v0?.find((phase) => phase.phase === "consumption");

    expect(pressure).toMatchObject({
      applied_drag: 3,
      effective_farmers: 9,
      effective_builders: 0,
      ordering_rule: "builders_first",
    });
    expect(ctx.report.weather_multiplier).toBe(controlCtx.report.weather_multiplier);
    expect(ctx.report.market).toEqual(controlCtx.report.market);
    expect(ctx.report.production_bushels).toBeLessThan(controlCtx.report.production_bushels);
    expect(ctx.report.construction.progress_added).toBe(0);
    expect(ctx.report.construction.progress_added).toBeLessThan(controlCtx.report.construction.progress_added);
    expect(ctx.report.notes).toEqual(maintenanceLaborPressureSummaryLines(pressure!));
    expect(consumptionPhase?.receipts.map((receipt) => receipt.line)).toEqual(
      expect.arrayContaining(maintenanceLaborPressureSummaryLines(pressure!))
    );
  });

  it("carries delegated maintenance receipts into the resolved turn log without mutating planned labor rows", () => {
    const state = baseWiringState("maintenance_labor_wiring_v2");
    attachMaintenanceRegistry(state as any, [
      { maintenance_key: "watch_ward", label: "Watch & Ward", source_kind: "security", labor_required: 5 },
    ]);
    (state.house as any).court_delegation_registry = buildCourtDelegationRegistry([
      {
        action: "maintenance",
        delegated: true,
        effect: {
          amount_multiplier_pct: 40,
        },
      },
    ]);

    const result = applyDecisions(state, noOpDecisions(state));
    const latest = result.log.at(-1);
    const expected = maintenanceLaborPressureSummaryLines(buildMaintenanceLaborPressure(state)!);

    expect(result.manor.farmers).toBe(10);
    expect(result.manor.builders).toBe(2);
    expect(latest?.report.notes).toEqual(expect.arrayContaining(expected));
    expect(
      latest?.report.phase_results_v0
        ?.find((phase) => phase.phase === "consumption")
        ?.receipts.map((receipt) => receipt.line)
    ).toEqual(expect.arrayContaining(expected));
  });
});
