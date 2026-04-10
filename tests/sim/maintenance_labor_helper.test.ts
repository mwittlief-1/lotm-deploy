import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import { buildCourtDelegationRegistry } from "../../src/sim/domains/court/delegationRegistry";
import {
  buildMaintenanceLaborPressure,
  maintenanceLaborPressureSummaryLines,
  MAINTENANCE_LABOR_PRESSURE_SCHEMA_VERSION
} from "../../src/sim/domains/court/maintenance";

function attachMaintenanceRegistry(state: any, entries: Array<Record<string, unknown>>): void {
  state.economy = {
    ...(state.economy ?? {}),
    maintenance_registry_v1: {
      schema_version: "maintenance_registry_v1",
      entries,
    },
  };
}

describe("maintenance labor helper seam", () => {
  it("returns null when no maintenance registry is present", () => {
    const state = createNewRun("maintenance_labor_helper_absent");

    expect(buildMaintenanceLaborPressure(state)).toBeNull();
  });

  it("builds a deterministic, delegated pressure contract from registry entries", () => {
    const state = createNewRun("maintenance_labor_helper_delegated");
    state.manor.population = 20;
    state.manor.farmers = 10;
    state.manor.builders = 2;
    attachMaintenanceRegistry(state as any, [
      { maintenance_key: "watch_ward", label: "Watch & Ward", source_kind: "security", labor_required: 1 },
      { maintenance_key: "granary_upkeep", label: "Granary upkeep", source_kind: "storage", labor_required: 4 },
      { maintenance_key: "ignored_zero", label: "Ignored zero", source_kind: "custom", labor_required: 0 },
    ]);
    (state.house as any).court_delegation_registry = buildCourtDelegationRegistry([
      {
        action: "maintenance",
        delegated: true,
        effect: {
          amount_multiplier_pct: 60,
        },
      },
    ]);

    const pressure = buildMaintenanceLaborPressure(state);

    expect(pressure).toEqual({
      schema_version: MAINTENANCE_LABOR_PRESSURE_SCHEMA_VERSION,
      ordering_rule: "builders_first",
      delegated: true,
      delegated_multiplier_pct: 60,
      source_keys: ["watch_ward", "granary_upkeep"],
      total_sources: 2,
      planned_population: 20,
      planned_farmers: 10,
      planned_builders: 2,
      allocatable_before: 12,
      required_labor_before_delegation: 5,
      required_labor_after_delegation: 3,
      applied_drag: 3,
      unmet_labor: 0,
      allocatable_after: 9,
      effective_farmers: 9,
      effective_builders: 0,
      entries: [
        {
          maintenance_key: "watch_ward",
          label: "Watch & Ward",
          source_kind: "security",
          labor_required: 1,
        },
        {
          maintenance_key: "granary_upkeep",
          label: "Granary upkeep",
          source_kind: "storage",
          labor_required: 4,
        },
      ],
    });

    expect(maintenanceLaborPressureSummaryLines(pressure!)).toEqual([
      "Delegated maintenance scaled labor from 5 to 3 (60%).",
      "Maintenance required 3 labor across 2 sources; reserved 3 before harvest/build output.",
      "Planned farmers 10, builders 2; effective farmers 9, builders 0.",
    ]);
  });

  it("falls back from builders to farmers and reports unmet labor deterministically", () => {
    const state = createNewRun("maintenance_labor_helper_overflow");
    state.manor.population = 12;
    state.manor.farmers = 4;
    state.manor.builders = 1;
    attachMaintenanceRegistry(state as any, [
      { maintenance_key: "granary_upkeep", label: "Granary upkeep", source_kind: "storage", labor_required: 7 },
    ]);

    const pressure = buildMaintenanceLaborPressure(state);

    expect(pressure).toMatchObject({
      required_labor_before_delegation: 7,
      required_labor_after_delegation: 7,
      applied_drag: 5,
      unmet_labor: 2,
      effective_farmers: 0,
      effective_builders: 0,
    });
    expect(maintenanceLaborPressureSummaryLines(pressure!)).toEqual([
      "Maintenance required 7 labor across 1 source; reserved 5 before harvest/build output.",
      "Planned farmers 4, builders 1; effective farmers 0, builders 0.",
      "Maintenance demand exceeded allocatable labor by 2.",
    ]);
  });
});
