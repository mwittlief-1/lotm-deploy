import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PLAYABILITY_PRESET_ORDER } from "../../src/ui/playabilityPresetPack";
import {
  buildLockedPresetScenariosArtifact,
  LOCKED_PRESET_SCENARIOS_RELPATH
} from "../../scripts/lockedPresetScenarios";
import { sha256, stableStringify } from "../../scripts/seed_replay/hash";

function readArtifact() {
  return JSON.parse(fs.readFileSync(path.resolve(LOCKED_PRESET_SCENARIOS_RELPATH), "utf8")) as Record<string, any>;
}

describe("locked preset scenarios", () => {
  it("matches the checked-in deterministic locked-preset manifest", () => {
    const artifact = readArtifact();
    const built = buildLockedPresetScenariosArtifact();

    expect(artifact).toEqual({
      ...built,
      hash: sha256(stableStringify(built))
    });
  });

  it("keeps one scenario row per stable preset and derives the live court and marriage surfaces from the real seed", () => {
    const artifact = buildLockedPresetScenariosArtifact();

    expect(artifact.scenarios.map((scenario) => scenario.scenario_id)).toEqual([...PLAYABILITY_PRESET_ORDER]);

    const baseline = artifact.scenarios.find((scenario) => scenario.scenario_id === "baseline_low_pressure_prudent");
    expect(baseline?.live_seed_surfaces).toEqual([
      {
        surface_id: "court_provisioning_sheet",
        summary:
          "Court provisioning stays directly reviewable from the live seed preview, without relying on fixture-only state or a separate init path.",
        cues: [
          { cue_id: "court_members", label: "Court members", value: "8 court members" },
          { cue_id: "ration_demand", label: "Ration demand", value: "14 food / 2 meat" },
          { cue_id: "allocation_result", label: "Allocation result", value: "14 food / 0 meat" },
          { cue_id: "stipend_coin", label: "Stipend coin", value: "0 coin" },
          { cue_id: "first_allocation_rows", label: "First allocation rows", value: "p_head:Shortfall | p_spouse:Shortfall" }
        ]
      },
      {
        surface_id: "outbound_marriage_sheet",
        summary:
          "Outbound marriage stays preview-only on a cloned snapshot, with deterministic registry ordering and stable accept/reject copy from the live seed.",
        cues: [
          { cue_id: "subject_person", label: "Subject person", value: "Edmund" },
          { cue_id: "shown_count", label: "Shown candidates", value: "12" },
          { cue_id: "held_out_count", label: "Held-out candidates", value: "12" },
          { cue_id: "scope_summary", label: "Scope summary", value: "Topology Cap · 6 admitted · 0 rejected" },
          { cue_id: "first_candidate", label: "First shown candidate", value: "Beatrice Glenholt" },
          {
            cue_id: "rejected_preview",
            label: "Rejected preview",
            value: "Outbound marriage offer rejected by House Glenholt for Edmund."
          },
          {
            cue_id: "accepted_preview",
            label: "Accepted preview",
            value: "Outbound marriage offer accepted by House Glenholt for Edmund."
          },
          {
            cue_id: "accepted_receipts",
            label: "Accepted receipt preview",
            value: "1 receipt-backed settlement row would be written."
          }
        ]
      }
    ]);

    for (const scenario of artifact.scenarios) {
      expect(scenario.live_seed_surfaces.map((surface) => surface.surface_id)).toEqual([
        "court_provisioning_sheet",
        "outbound_marriage_sheet"
      ]);
    }
  });

  it("anchors packet, obligations, UAT, and maintenance review expectations to the landed seams", () => {
    const artifact = buildLockedPresetScenariosArtifact();

    const arrears = artifact.scenarios.find((scenario) => scenario.scenario_id === "arrears_pressure_builder");
    const stableClear = artifact.scenarios.find((scenario) => scenario.scenario_id === "stable_clear_prudent");
    const weather = artifact.scenarios.find((scenario) => scenario.scenario_id === "weather_shortage_builder");
    const grant = artifact.scenarios.find((scenario) => scenario.scenario_id === "uat_grant_visibility");
    const hunting = artifact.scenarios.find((scenario) => scenario.scenario_id === "uat_hunting_proxy");

    expect(arrears?.review_expectations.find((entry) => entry.expectation_id === "packet_review:arrears_pressure_builder"))
      .toMatchObject({
        source_artifact_relpath: "qa_artifacts/playtest_ops/v0.3.4/receipt_bundle_seed_pack.json",
        surface_ids: ["gameplay_decisions_exports", "turn_report_summary", "receipts_viewer_modal", "diff_ledger_summary"],
        cues: expect.arrayContaining([
          { cue_id: "ending_bushels_stored", label: "Ending bushels stored", value: "402" },
          { cue_id: "ending_unrest", label: "Ending unrest", value: "52" }
        ])
      });

    expect(
      arrears?.review_expectations.filter((entry) => entry.visibility_mode === "fixture_lock" && entry.surface_ids[0] === "obligations_modal")
        .length
    ).toBe(4);

    expect(stableClear?.review_expectations[0]).toMatchObject({
      expectation_id: "comparison:stable_clear_prudent_turns_15",
      source_artifact_relpath: "qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json",
      surface_ids: ["turn_report_summary", "run_log_screen"]
    });

    expect(
      weather?.review_expectations.find(
        (entry) => entry.expectation_id === "outbound_marriage:outbound_marriage_weather_shortage_shortlist"
      )
    ).toMatchObject({
      source_artifact_relpath: "qa_artifacts/playtest_ops/v0.3.5/outbound_marriage_preset_coverage.json",
      surface_ids: ["outbound_marriage_sheet"],
      cues: expect.arrayContaining([
        { cue_id: "shown_count", label: "Shown candidates", value: "7" },
        { cue_id: "first_held_out_candidate", label: "First held-out candidate", value: "Edith Evershaw" }
      ])
    });

    expect(grant?.review_expectations[0]).toMatchObject({
      expectation_id: "uat_gate:uat_grant_visibility",
      source_artifact_relpath: "qa_artifacts/playtest_ops/uat_scenario_gate.json",
      surface_ids: ["prospects_window"],
      cues: expect.arrayContaining([
        { cue_id: "required_turn", label: "Required grant turn", value: "4" },
        { cue_id: "observed_turn", label: "Observed grant turn", value: "4" }
      ])
    });

    expect(hunting?.review_expectations[0]).toMatchObject({
      expectation_id: "uat_gate:uat_meat_hunting_proxy",
      visibility_mode: "fallback_proxy",
      surface_ids: ["hunting_proxy"],
      cues: expect.arrayContaining([
        { cue_id: "required_yield_min", label: "Required hunting yield min", value: "1" },
        { cue_id: "observed_yield_max", label: "Observed hunting yield max", value: "7" }
      ])
    });

    expect(artifact.shared_review_sources).toEqual([
      {
        source_id: "maintenance_pressure_reference_pack",
        source_artifact_relpath: "qa_artifacts/economy_balance/v0.3.5/maintenance_pressure_scenarios.json",
        summary:
          "Maintenance pressure remains a shared closure reference pack until a later preset-driven upkeep packet lands on live preset application.",
        scenario_ids: [
          "rights_only_builder_capacity",
          "full_holdings_builder_capacity",
          "full_holdings_delegated_relief",
          "full_holdings_low_capacity_overflow"
        ],
        cues: expect.arrayContaining([
          expect.objectContaining({
            cue_id: "rights_only_builder_capacity",
            label: "Rights-only maintenance pressure"
          }),
          expect.objectContaining({
            cue_id: "full_holdings_low_capacity_overflow",
            label: "Low-capacity maintenance overflow"
          })
        ])
      }
    ]);
  });
});
