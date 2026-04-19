import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { PlayabilityPresetPackV1 } from "../../src/ui/playabilityPresetPack";
import {
  buildObligationsFixture,
  buildObligationsFixtureCases,
  OBLIGATIONS_FIXTURE_SCENARIO_ORDER
} from "../support/obligationsFixtures";
import {
  buildObligationsVisibilityEvidencePack,
  buildObligationsVisibilityFixture,
  buildObligationsVisibilityFixtureCases,
  OBLIGATIONS_VISIBILITY_FIXTURE_SCENARIO_ORDER
} from "../support/obligationsVisibilityFixtures";

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

  it("matches the deterministic v0.3.6 obligations visibility fixture", () => {
    const expected = readFixture("obligations_visibility_snapshot_v0.3.6.json");

    expect(buildObligationsVisibilityFixture()).toBe(expected);
    expect(buildObligationsVisibilityFixture()).toBe(buildObligationsVisibilityFixture());
  });

  it("locks split-payment successor rebasing and church vacancy carry into deterministic v0.3.6 cases", () => {
    const cases = buildObligationsVisibilityFixtureCases();

    expect(Object.keys(cases)).toEqual([...OBLIGATIONS_VISIBILITY_FIXTURE_SCENARIO_ORDER]);

    expect(cases.split_payment_successor_rebase.counterpartySections[0]).toMatchObject({
      title: "Lady Regent (current liege)",
      helper: "Lady Regent now collects liege dues after House Liege died.",
      settlementStatus: "arrears_only",
      dueGroup: {
        summary: "Lady Regent (current liege): 3 coin in arrears."
      },
      penaltyGroup: {
        amount: 3,
        summary: "Lady Regent (current liege): 3 coin in arrears.",
        carriedThisTurn: true,
        settledThisTurn: true
      }
    });
    expect(cases.split_payment_successor_rebase.counterpartySections[1]).toMatchObject({
      title: "Father Aldwyn (St. Cuthbert Parish)",
      helper: "Father Aldwyn now collects church dues for St. Cuthbert Parish after Parish Church died.",
      settlementStatus: "arrears_only",
      dueGroup: {
        summary: "Father Aldwyn (St. Cuthbert Parish): 4 bushels in arrears."
      },
      penaltyGroup: {
        amount: 4,
        summary: "Father Aldwyn (St. Cuthbert Parish): 4 bushels in arrears.",
        carriedThisTurn: true,
        settledThisTurn: true
      }
    });

    expect(cases.church_vacancy_carry.counterpartySections[1]).toMatchObject({
      title: "St. Cuthbert Parish (Vacant)",
      helper: "St. Cuthbert Parish has no living priest; dues remain with the institution until a successor is placed.",
      settlementStatus: "arrears_only",
      dueGroup: {
        summary: "St. Cuthbert Parish (Vacant): 8 bushels in arrears."
      },
      penaltyGroup: {
        amount: 8,
        summary: "St. Cuthbert Parish (Vacant): 8 bushels in arrears.",
        carriedThisTurn: true
      }
    });
  });

  it("keeps the v0.3.6 obligations visibility evidence pack aligned to fixture ids and gate entry points", () => {
    const expected = buildObligationsVisibilityEvidencePack();
    const pack = JSON.parse(
      fs.readFileSync(path.resolve("qa_artifacts/playtest_ops/v0.3.6/obligations_visibility_evidence_pack.json"), "utf8")
    ) as ReturnType<typeof buildObligationsVisibilityEvidencePack>;

    expect(pack).toEqual(expected);
    expect(pack.cases.map((entry) => entry.fixture_case_id)).toEqual([...OBLIGATIONS_VISIBILITY_FIXTURE_SCENARIO_ORDER]);
    expect(pack.docs_entry_path).toBe("docs/qa/obligations_visibility_evidence_pack_v0.3.6.md");
    expect(pack.scenario_gate_artifact_path).toBe("qa_artifacts/playtest_ops/uat_scenario_gate.json");
  });
});
