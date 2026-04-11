import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildMaintenancePressureScenarioPack,
  MAINTENANCE_PRESSURE_SCENARIO_PACK_RELPATH
} from "../../scripts/maintenancePressureScenarios";
import { sha256, stableStringify } from "../../scripts/seed_replay/hash";

describe("maintenance pressure scenarios", () => {
  it("matches the checked-in deterministic comparison artifact", () => {
    const pack = buildMaintenancePressureScenarioPack();
    const expectedArtifact = {
      ...pack,
      hash: sha256(stableStringify(pack))
    };
    const artifact = JSON.parse(
      fs.readFileSync(path.resolve(MAINTENANCE_PRESSURE_SCENARIO_PACK_RELPATH), "utf8")
    );

    expect(artifact).toEqual(expectedArtifact);
  });

  it("keeps delegation relief and overflow relationships explicit across the scenario set", () => {
    const pack = buildMaintenancePressureScenarioPack();
    const rightsOnly = pack.scenarios.find((scenario) => scenario.scenario_id === "rights_only_builder_capacity");
    const full = pack.scenarios.find((scenario) => scenario.scenario_id === "full_holdings_builder_capacity");
    const delegated = pack.scenarios.find((scenario) => scenario.scenario_id === "full_holdings_delegated_relief");
    const overflow = pack.scenarios.find((scenario) => scenario.scenario_id === "full_holdings_low_capacity_overflow");

    expect(rightsOnly?.registry.labor_required).toBeLessThan(full?.registry.labor_required ?? 0);
    expect(full?.registry.entry_ids).toEqual(delegated?.registry.entry_ids);
    expect(delegated?.pressure.required_labor_after_delegation).toBeLessThan(
      full?.pressure.required_labor_after_delegation ?? 0
    );
    expect(delegated?.pressure.applied_drag).toBeLessThan(full?.pressure.applied_drag ?? 0);
    expect(delegated?.pressure.effective_builders).toBeGreaterThan(full?.pressure.effective_builders ?? 0);
    expect(delegated?.deltas_vs_control.construction_progress_added).toBeGreaterThan(
      full?.deltas_vs_control.construction_progress_added ?? 0
    );
    expect(overflow?.pressure.unmet_labor).toBeGreaterThan(0);
    expect(overflow?.pressure.effective_farmers).toBe(0);
    expect(overflow?.pressure.effective_builders).toBe(0);
  });

  it("keeps preview and resolved maintenance note lines aligned for every scenario", () => {
    const pack = buildMaintenancePressureScenarioPack();

    for (const scenario of pack.scenarios) {
      expect(scenario.preview.maintenance_note_lines).toEqual(scenario.preview.maintenance_receipt_lines);
      expect(scenario.resolved.maintenance_note_lines).toEqual(scenario.resolved.maintenance_receipt_lines);
      expect(scenario.deltas_vs_control.production_bushels).toBeLessThanOrEqual(0);
      expect(scenario.deltas_vs_control.construction_progress_added).toBeLessThanOrEqual(0);
    }
  });
});
