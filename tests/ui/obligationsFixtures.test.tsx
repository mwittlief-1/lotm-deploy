import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { PlayabilityPresetPackV1 } from "../../src/ui/playabilityPresetPack";
import {
  buildObligationsFixture,
  buildObligationsFixtureCases,
  OBLIGATIONS_FIXTURE_SCENARIO_ORDER
} from "../support/obligationsFixtures";

function fixturePath(name: string): string {
  return path.resolve("tests/fixtures", name);
}

function readFixture(name: string): string {
  return fs.readFileSync(fixturePath(name), "utf8");
}

describe("obligations fixtures", () => {
  it("matches the deterministic obligations transparency fixture", () => {
    const expected = readFixture("obligations_detail_snapshot_v0.3.5.json");

    expect(buildObligationsFixture()).toBe(expected);
    expect(buildObligationsFixture()).toBe(buildObligationsFixture());
  });

  it("locks the four transparency cases the tooling lane needs for UAT and replay-safe review", () => {
    const cases = buildObligationsFixtureCases();

    expect(Object.keys(cases)).toEqual([...OBLIGATIONS_FIXTURE_SCENARIO_ORDER]);

    expect(cases.arrears_carry.counterpartySections[0]?.penaltyGroup).toMatchObject({
      carriedThisTurn: true,
      enforcementState: "arrears",
      stageLabel: "Stage 1 active"
    });
    expect(cases.arrears_carry.counterpartySections[0]?.stageRows.map((row) => row.statusLabel)).toEqual([
      "Current",
      "Armed",
      "Armed"
    ]);

    expect(cases.forced_payment.counterpartySections[1]?.receiptGroups.find((group) => group.id === "seizure")).toMatchObject({
      receiptCount: 2
    });
    expect(
      cases.forced_payment.counterpartySections[1]?.receiptGroups
        .find((group) => group.id === "seizure")
        ?.rows.map((row) => row.category)
    ).toEqual(["enforcement.forced_payment_stores", "enforcement.forced_payment_stores"]);

    expect(cases.seizure_preview.counterpartySections[0]?.tangibleBitePreview).toMatchObject({
      categoryLabel: "Enforcement Seizure",
      paymentModeLabel: "Coin",
      previewAmountLabel: "4"
    });
    expect(cases.seizure_preview.counterpartySections[0]?.stageRows[1]?.statusLabel).toBe("Armed");

    expect(cases.terminal_stage_visibility.counterpartySections[0]?.terminalRisk).toMatchObject({
      statusLabel: "Active"
    });
    expect(cases.terminal_stage_visibility.counterpartySections[0]?.stageRows[2]?.statusLabel).toBe("Active");
  });

  it("keeps the checked-in obligations UAT pack aligned to the preset-pack acceptance contract", () => {
    const pack = JSON.parse(
      fs.readFileSync(path.resolve("qa_artifacts/playtest_ops/v0.3.5/obligations_uat_pack.json"), "utf8")
    ) as {
      acceptance_id: string;
      cases: Array<{ expected_focus: string; fixture_case_id: string; scenario_id: string }>;
      kind: string;
      source_artifacts: Array<{ artifact_relpath: string }>;
    };
    const presetPack = JSON.parse(
      fs.readFileSync(path.resolve("qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json"), "utf8")
    ) as PlayabilityPresetPackV1;

    expect(pack.kind).toBe("obligations_uat_pack_v1");
    expect(pack.acceptance_id).toBe("obligations_visibility");
    expect(pack.cases.map((entry) => entry.fixture_case_id)).toEqual([...OBLIGATIONS_FIXTURE_SCENARIO_ORDER]);
    expect(pack.cases.map((entry) => entry.expected_focus)).toEqual(["overview", "church", "liege", "liege"]);
    expect(
      presetPack.presets.find((preset) => preset.preset_id === "arrears_pressure_builder")?.acceptance_ids
    ).toContain("obligations_visibility");
    expect(
      presetPack.presets.find((preset) => preset.preset_id === "uat_arrears_enforcement")?.acceptance_ids
    ).toContain("obligations_visibility");
    expect(pack.source_artifacts.map((artifact) => artifact.artifact_relpath)).toEqual([
      "tests/fixtures/obligations_detail_snapshot_v0.3.5.json",
      "qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json"
    ]);
  });
});
