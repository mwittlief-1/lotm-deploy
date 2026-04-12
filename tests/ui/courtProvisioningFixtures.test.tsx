import fs from "node:fs";
import path from "node:path";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CourtProvisioningPanel } from "../../src/ui/panels/CourtProvisioningPanel";
import {
  COURT_PROVISIONING_FIXTURE_SCENARIO_ORDER,
  buildCourtProvisioningFixture,
  buildCourtProvisioningFixtureCases
} from "../support/courtProvisioningFixtures";

function fixturePath(name: string): string {
  return path.resolve("tests/fixtures", name);
}

function readFixture(name: string): string {
  return fs.readFileSync(fixturePath(name), "utf8");
}

describe("court provisioning fixtures", () => {
  it("matches the deterministic provisioning fixture snapshot", () => {
    const expected = readFixture("court_provisioning_snapshot_v0.3.5.json");

    expect(buildCourtProvisioningFixture()).toBe(expected);
    expect(buildCourtProvisioningFixture()).toBe(buildCourtProvisioningFixture());
  });

  it("locks baseline, carry-forward, stipend-receipt, and debug-order scenarios", () => {
    const cases = buildCourtProvisioningFixtureCases();

    expect(Object.keys(cases)).toEqual([...COURT_PROVISIONING_FIXTURE_SCENARIO_ORDER]);

    const baseline = cases.baseline_shortfall;
    expect(baseline.initialTab).toBe("player");
    expect(baseline.surface.summaryCards.map((card) => card.id)).toEqual([
      "court_members",
      "ration_demand",
      "allocation_result",
      "stipend_coin"
    ]);
    expect(baseline.surface.allocationRows.slice(0, 2).map((row) => row.personId)).toEqual(["p_head", "p_spouse"]);
    expect(baseline.surface.allocationRows.slice(0, 2).map((row) => row.statusLabel)).toEqual(["Shortfall", "Shortfall"]);
    expect(baseline.surface.stipendRows.every((row) => row.appliesReceiptLabel === "Placeholder only")).toBe(true);
    const baselineHtml = renderToStaticMarkup(
      <CourtProvisioningPanel initialTab={baseline.initialTab} surface={baseline.surface} />
    );
    expect(baselineHtml).toContain("Ration policy");
    expect(baselineHtml).toContain("Placeholder only");
    expect(baselineHtml).toContain("undernourishment_risk");

    const carryForward = cases.carry_forward_overrides;
    const stewardOverride = carryForward.surface.overrideRows.find((row) => row.personId === "p_court_steward");
    const stewardDebugEntry = carryForward.surface.debugEntryRows.find((row) => row.personId === "p_court_steward");
    expect(stewardOverride).toMatchObject({
      carryForwardLabel: "Carried from prior turn",
      lodgingLevelLabel: "Institution",
      rationLevelLabel: "Light",
      statusLabel: "Reduced"
    });
    expect(stewardDebugEntry).toMatchObject({
      carryForwardLabel: "Carried from prior turn",
      lodgingLevelLabel: "Institution",
      rationLevelLabel: "Light"
    });

    const stipendReceipts = cases.stipend_receipt_modes;
    expect(stipendReceipts.surface.summaryCards.find((card) => card.id === "stipend_coin")?.value).toBe("3 coin");
    expect(
      stipendReceipts.surface.stipendRows
        .filter((row) => row.appliesReceiptLabel === "Receipt applies")
        .map((row) => row.stipendKey)
    ).toEqual(["stipend:p_child1", "stipend:p_court_steward"]);
    expect(stipendReceipts.stipendApplyResult).toMatchObject({
      applied_stipend_keys: ["stipend:p_child1", "stipend:p_court_steward"],
      total_requested_coin: 3,
      total_paid_coin: 2,
      total_shortfall_coin: 1
    });
    expect(
      stipendReceipts.stipendApplyResult?.receipt_snapshots.map((receipt) => ({
        category: receipt.category,
        counterparty_id: receipt.counterparty_id,
        delta: receipt.delta
      }))
    ).toEqual([
      {
        category: "expense.household_admin",
        counterparty_id: "stipend:p_child1",
        delta: -2
      }
    ]);

    const debugOrder = cases.debug_registry_order;
    expect(debugOrder.initialTab).toBe("debug");
    expect(debugOrder.surface.debugRows.map((row) => row.key)).toEqual([
      "provisioning_schema_version",
      "stipend_registry_schema_version",
      "generated_at_turn_index",
      "person_ids",
      "allocation_order",
      "stipend_keys",
      "total_requested_food_units",
      "total_requested_meat_units",
      "total_allocated_food_units",
      "total_allocated_meat_units",
      "total_requested_stipend_coin",
      "at_risk_person_ids"
    ]);
    const debugHtml = renderToStaticMarkup(
      <CourtProvisioningPanel initialTab={debugOrder.initialTab} surface={debugOrder.surface} />
    );
    expect(debugHtml).toContain("Debug summary");
    expect(debugHtml).toContain("Stipend registry");
    expect(debugHtml.indexOf("provisioning_schema_version")).toBeLessThan(debugHtml.indexOf("allocation_order"));
  });

  it("keeps the checked-in provisioning UAT pack aligned to fixture cases and control-surface cues", () => {
    const pack = JSON.parse(
      fs.readFileSync(path.resolve("qa_artifacts/playtest_ops/v0.3.5/court_provisioning_uat_pack.json"), "utf8")
    ) as {
      cases: Array<{
        expected_cues: string[];
        fixture_case_id: string;
        initial_tab: string;
        scenario_id: string;
        source_seed: string;
      }>;
      kind: string;
      release: string;
      source_artifacts: Array<{ artifact_relpath: string }>;
    };
    const cases = buildCourtProvisioningFixtureCases();

    expect(pack.kind).toBe("court_provisioning_uat_pack_v1");
    expect(pack.release).toBe("v0.3.5");
    expect(pack.cases.map((entry) => entry.fixture_case_id)).toEqual([...COURT_PROVISIONING_FIXTURE_SCENARIO_ORDER]);
    expect(pack.cases.map((entry) => entry.initial_tab)).toEqual(["player", "player", "player", "debug"]);
    expect(pack.cases.map((entry) => entry.source_seed)).toEqual(
      COURT_PROVISIONING_FIXTURE_SCENARIO_ORDER.map((scenarioId) => cases[scenarioId].sourceSeed)
    );
    expect(pack.cases.find((entry) => entry.fixture_case_id === "baseline_shortfall")?.expected_cues).toEqual([
      "undernourishment_risk",
      "Shortfall",
      "Placeholder only"
    ]);
    expect(pack.cases.find((entry) => entry.fixture_case_id === "carry_forward_overrides")?.expected_cues).toEqual([
      "Carried from prior turn",
      "Light / Institution",
      "p_court_steward"
    ]);
    expect(pack.cases.find((entry) => entry.fixture_case_id === "stipend_receipt_modes")?.expected_cues).toEqual([
      "Receipt applies",
      "Realm Stipend",
      "3 coin"
    ]);
    expect(pack.cases.find((entry) => entry.fixture_case_id === "debug_registry_order")?.expected_cues).toEqual([
      "provisioning_schema_version",
      "allocation_order",
      "stipend_keys"
    ]);
    expect(pack.source_artifacts.map((artifact) => artifact.artifact_relpath)).toEqual([
      "tests/fixtures/court_provisioning_snapshot_v0.3.5.json",
      "qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json"
    ]);
  });
});
