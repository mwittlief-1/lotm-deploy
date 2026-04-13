#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createNewRun, proposeTurn } from "../src/sim";
import { buildCourtProvisioningSurface } from "../src/ui/courtProvisioningView";
import {
  PLAYABILITY_PRESET_PACK_RELEASE,
  PLAYABILITY_PRESET_PACK_RELPATH,
  type PlayabilityAcceptanceId,
  type PlayabilityPresetId,
  type PlayabilityPresetPackV1
} from "../src/ui/playabilityPresetPack";
import {
  buildOutboundMarriageOfferPreview,
  buildOutboundMarriageSurface,
  createOutboundMarriageOfferDraft
} from "../src/ui/outboundMarriageView";
import { PLAYTEST_OPS_PACKET_SEED_PACK_RELPATH } from "../src/ui/playtestOpsPacket";
import { MAINTENANCE_PRESSURE_SCENARIO_PACK_RELPATH } from "./maintenancePressureScenarios";
import { writeStableArtifact } from "./seed_replay/artifactWriter";
import { sha256, stableStringify } from "./seed_replay/hash";

export const LOCKED_PRESET_SCENARIOS_KIND = "locked_preset_scenarios_v1" as const;
export const LOCKED_PRESET_SCENARIOS_RELPATH =
  `qa_artifacts/playtest_ops/${PLAYABILITY_PRESET_PACK_RELEASE}/locked_preset_scenarios.json` as const;

const REGRESSION_SEED_PACK_RELPATH = "qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json" as const;
const OBLIGATIONS_UAT_PACK_RELPATH =
  `qa_artifacts/playtest_ops/${PLAYABILITY_PRESET_PACK_RELEASE}/obligations_uat_pack.json` as const;
const COURT_PROVISIONING_UAT_PACK_RELPATH =
  `qa_artifacts/playtest_ops/${PLAYABILITY_PRESET_PACK_RELEASE}/court_provisioning_uat_pack.json` as const;
const UAT_SCENARIO_PACK_RELPATH = "qa_artifacts/playtest_ops/uat_scenarios_v0.3.json" as const;
const UAT_SCENARIO_GATE_RELPATH = "qa_artifacts/playtest_ops/uat_scenario_gate.json" as const;

type SourceArtifact = {
  artifact_relpath: string;
  hash: string;
  kind: string;
  label: string;
};

type SurfaceCue = {
  cue_id: string;
  label: string;
  value: string;
};

type LiveSeedSurfaceId = "court_provisioning_sheet" | "outbound_marriage_sheet";

type ReviewSurfaceId =
  | "court_provisioning_sheet"
  | "diff_ledger_summary"
  | "hunting_proxy"
  | "obligations_modal"
  | "prospects_window"
  | "receipts_viewer_modal"
  | "run_log_screen"
  | "turn_report_summary";

type LiveSeedSurfaceExpectation = {
  cues: SurfaceCue[];
  summary: string;
  surface_id: LiveSeedSurfaceId;
};

type LockedReviewExpectation = {
  cues: SurfaceCue[];
  expectation_id: string;
  source_artifact_relpath: string;
  source_ref: string;
  summary: string;
  surface_ids: ReviewSurfaceId[];
  visibility_mode: "comparison_pack" | "fallback_proxy" | "fixture_lock" | "live_gate" | "packet_review";
};

type SharedReviewSource = {
  cues: SurfaceCue[];
  scenario_ids: string[];
  source_artifact_relpath: string;
  source_id: "maintenance_pressure_reference_pack";
  summary: string;
};

type LockedPresetScenarioRow = {
  acceptance_ids: PlayabilityAcceptanceId[];
  live_seed_surfaces: LiveSeedSurfaceExpectation[];
  policy_id: string;
  preset_id: PlayabilityPresetId;
  review_expectations: LockedReviewExpectation[];
  scenario_id: PlayabilityPresetId;
  seed: string;
  title: string;
  turns: number;
};

export type LockedPresetScenariosArtifact = {
  kind: typeof LOCKED_PRESET_SCENARIOS_KIND;
  qa_flow: {
    commands: string[];
    note: string;
  };
  release: typeof PLAYABILITY_PRESET_PACK_RELEASE;
  scenarios: LockedPresetScenarioRow[];
  shared_review_sources: SharedReviewSource[];
  source_artifacts: SourceArtifact[];
};

type ReceiptBundleScenario = {
  expected_end_state: {
    arrears_bushels: number;
    arrears_coin: number;
    bushels_stored: number;
    coin: number;
    unrest: number;
  };
  notes: string;
  required_surfaces: ReviewSurfaceId[];
  scenario_id: string;
};

type ReceiptBundleSeedPack = {
  hash?: string;
  kind: string;
  scenarios: ReceiptBundleScenario[];
};

type RegressionScenario = {
  ending: {
    arrears_bushels: number;
    arrears_coin: number;
    coin: number;
    food_stores: number;
    manor_count: number;
    unrest: number;
  };
  game_over_reason: string | null;
  game_over_turn: number | null;
  indicators: {
    dispossessed: boolean;
  };
  scenario_id: string;
};

type RegressionSeedPack = {
  hash?: string;
  kind: string;
  scenarios: RegressionScenario[];
};

type ObligationsUatCase = {
  expected_cues: string[];
  expected_focus: string;
  fixture_case_id: string;
  preset_ids: PlayabilityPresetId[];
  scenario_id: string;
  steps: string[];
};

type ObligationsUatPack = {
  acceptance_id: PlayabilityAcceptanceId;
  cases: ObligationsUatCase[];
  hash?: string;
  kind: string;
};

type CourtProvisioningUatCase = {
  expected_cues: string[];
  fixture_case_id: string;
  initial_tab: string;
  scenario_id: string;
  source_seed: string;
  steps: string[];
};

type CourtProvisioningUatPack = {
  cases: CourtProvisioningUatCase[];
  hash?: string;
  kind: string;
};

type UatScenarioPackRow = {
  decision_overrides?: Array<{
    labor?: {
      desired_builders: number;
      desired_farmers: number;
    };
    turn_index: number;
  }>;
  expectations: {
    arrears_enforcement_by_turn?: number;
    grant_window_by_turn?: number;
    hunting_yield_min?: number;
  };
  id: string;
  policy_id: string;
  seed: string;
  title: string;
  turns: number;
  visibility_note?: string;
  visibility_status?: "direct" | "fallback";
};

type UatScenarioPack = {
  hash?: string;
  scenarios: UatScenarioPackRow[];
  schema_version: string;
};

type UatScenarioFinding = {
  arrears_turn?: number | null;
  failures: string[];
  grant_turn?: number | null;
  hunting_yield_max: number;
  scenario_id: string;
};

type UatScenarioGate = {
  gate: string;
  hash?: string;
  scenarios: UatScenarioFinding[];
};

type MaintenancePressureScenario = {
  pressure: {
    applied_drag: number;
    effective_builders: number;
    effective_farmers: number;
    unmet_labor: number;
  };
  preview: {
    maintenance_note_lines: string[];
  };
  scenario_id: string;
  title: string;
};

type MaintenancePressureScenarioPack = {
  hash?: string;
  kind: string;
  scenarios: MaintenancePressureScenario[];
};

const liveSeedSurfaceCache = new Map<string, LiveSeedSurfaceExpectation[]>();

function readJson<T>(artifactRelpath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(artifactRelpath), "utf8")) as T;
}

function deriveArtifactHash(payload: Record<string, unknown>): string {
  return typeof payload.hash === "string" && payload.hash.trim().length > 0
    ? payload.hash
    : sha256(stableStringify(payload));
}

function cue(cueId: string, label: string, value: string | number | boolean | null | undefined): SurfaceCue {
  return {
    cue_id: cueId,
    label,
    value: String(value ?? "n/a")
  };
}

function cloneLiveSeedSurfaces(surfaces: readonly LiveSeedSurfaceExpectation[]): LiveSeedSurfaceExpectation[] {
  return surfaces.map((surface) => ({
    ...surface,
    cues: surface.cues.map((row) => ({ ...row }))
  }));
}

function requireReceiptScenario(pack: ReceiptBundleSeedPack, scenarioId: string): ReceiptBundleScenario {
  const scenario = pack.scenarios.find((entry) => entry.scenario_id === scenarioId);
  if (!scenario) throw new Error(`Missing receipt-bundle scenario ${scenarioId}.`);
  return scenario;
}

function requireRegressionScenario(pack: RegressionSeedPack, scenarioId: string): RegressionScenario {
  const scenario = pack.scenarios.find((entry) => entry.scenario_id === scenarioId);
  if (!scenario) throw new Error(`Missing regression scenario ${scenarioId}.`);
  return scenario;
}

function requireUatScenario(pack: UatScenarioPack, scenarioId: string): UatScenarioPackRow {
  const scenario = pack.scenarios.find((entry) => entry.id === scenarioId);
  if (!scenario) throw new Error(`Missing UAT scenario ${scenarioId}.`);
  return scenario;
}

function requireUatFinding(gate: UatScenarioGate, scenarioId: string): UatScenarioFinding {
  const finding = gate.scenarios.find((entry) => entry.scenario_id === scenarioId);
  if (!finding) throw new Error(`Missing UAT gate finding ${scenarioId}.`);
  return finding;
}

function liveSeedSurfaces(seed: string): LiveSeedSurfaceExpectation[] {
  const cached = liveSeedSurfaceCache.get(seed);
  if (cached) return cloneLiveSeedSurfaces(cached);

  const state = createNewRun(seed);
  const ctx = proposeTurn(state as any);
  const provisioningSurface = buildCourtProvisioningSurface(ctx.preview_state);
  if (!provisioningSurface) {
    throw new Error(`Expected court provisioning surface for seed ${seed}.`);
  }

  const marriageSurface = buildOutboundMarriageSurface(ctx.preview_state, ctx.marriage_window);
  if (!marriageSurface) {
    throw new Error(`Expected outbound marriage surface for seed ${seed}.`);
  }

  const draft = createOutboundMarriageOfferDraft(marriageSurface);
  const rejectedPreview = buildOutboundMarriageOfferPreview(marriageSurface, draft);
  const acceptedPreview = buildOutboundMarriageOfferPreview(marriageSurface, {
    ...draft,
    dowryCoinDelta: -3,
    relationshipRespect: 4,
    relationshipAllegiance: 3,
    relationshipThreat: -1,
    riskTagsText: "prestige, costly"
  });
  if (!rejectedPreview || !acceptedPreview) {
    throw new Error(`Expected outbound marriage previews for seed ${seed}.`);
  }

  const surfaces: LiveSeedSurfaceExpectation[] = [
    {
      surface_id: "court_provisioning_sheet",
      summary:
        "Court provisioning stays directly reviewable from the live seed preview, without relying on fixture-only state or a separate init path.",
      cues: [
        cue(
          "court_members",
          "Court members",
          provisioningSurface.summaryCards.find((card) => card.id === "court_members")?.value ?? "n/a"
        ),
        cue(
          "ration_demand",
          "Ration demand",
          provisioningSurface.summaryCards.find((card) => card.id === "ration_demand")?.value ?? "n/a"
        ),
        cue(
          "allocation_result",
          "Allocation result",
          provisioningSurface.summaryCards.find((card) => card.id === "allocation_result")?.value ?? "n/a"
        ),
        cue(
          "stipend_coin",
          "Stipend coin",
          provisioningSurface.summaryCards.find((card) => card.id === "stipend_coin")?.value ?? "n/a"
        ),
        cue(
          "first_allocation_rows",
          "First allocation rows",
          provisioningSurface.allocationRows
            .slice(0, 2)
            .map((row) => `${row.personId}:${row.statusLabel}`)
            .join(" | ")
        )
      ]
    },
    {
      surface_id: "outbound_marriage_sheet",
      summary:
        "Outbound marriage stays preview-only on a cloned snapshot, with deterministic registry ordering and stable accept/reject copy from the live seed.",
      cues: [
        cue("subject_person", "Subject person", marriageSurface.subjectPersonName),
        cue("shown_count", "Shown candidates", marriageSurface.shownCount),
        cue("held_out_count", "Held-out candidates", marriageSurface.heldOutCount),
        cue("scope_summary", "Scope summary", marriageSurface.scopeSummary),
        cue("first_candidate", "First shown candidate", marriageSurface.candidateRows[0]?.candidatePersonName ?? "n/a"),
        cue("rejected_preview", "Rejected preview", rejectedPreview.summary),
        cue("accepted_preview", "Accepted preview", acceptedPreview.summary),
        cue("accepted_receipts", "Accepted receipt preview", acceptedPreview.receiptSummary)
      ]
    }
  ];

  liveSeedSurfaceCache.set(seed, surfaces);
  return cloneLiveSeedSurfaces(surfaces);
}

function packetReviewExpectation(receiptScenario: ReceiptBundleScenario): LockedReviewExpectation {
  return {
    expectation_id: `packet_review:${receiptScenario.scenario_id}`,
    source_artifact_relpath: PLAYTEST_OPS_PACKET_SEED_PACK_RELPATH,
    source_ref: receiptScenario.scenario_id,
    summary: receiptScenario.notes,
    surface_ids: [...receiptScenario.required_surfaces],
    visibility_mode: "packet_review",
    cues: [
      cue("ending_bushels_stored", "Ending bushels stored", receiptScenario.expected_end_state.bushels_stored),
      cue("ending_coin", "Ending coin", receiptScenario.expected_end_state.coin),
      cue("ending_unrest", "Ending unrest", receiptScenario.expected_end_state.unrest),
      cue("ending_arrears_bushels", "Ending arrears bushels", receiptScenario.expected_end_state.arrears_bushels),
      cue("ending_arrears_coin", "Ending arrears coin", receiptScenario.expected_end_state.arrears_coin)
    ]
  };
}

function regressionComparisonExpectation(regressionScenario: RegressionScenario): LockedReviewExpectation {
  return {
    expectation_id: `comparison:${regressionScenario.scenario_id}`,
    source_artifact_relpath: REGRESSION_SEED_PACK_RELPATH,
    source_ref: regressionScenario.scenario_id,
    summary:
      regressionScenario.game_over_turn == null
        ? "Use the report and run log as the stable comparison rail for this preset's accepted ending state."
        : `Use the report and run log as the terminal comparison rail; this reference still ends on turn ${regressionScenario.game_over_turn}.`,
    surface_ids:
      regressionScenario.game_over_turn == null
        ? ["turn_report_summary", "run_log_screen"]
        : ["turn_report_summary", "run_log_screen", "diff_ledger_summary"],
    visibility_mode: "comparison_pack",
    cues: [
      cue("ending_food_stores", "Ending food stores", regressionScenario.ending.food_stores),
      cue("ending_coin", "Ending coin", regressionScenario.ending.coin),
      cue("ending_unrest", "Ending unrest", regressionScenario.ending.unrest),
      cue("ending_manor_count", "Ending manor count", regressionScenario.ending.manor_count),
      cue("game_over_turn", "Game-over turn", regressionScenario.game_over_turn ?? "none"),
      cue("game_over_reason", "Game-over reason", regressionScenario.game_over_reason ?? "none"),
      cue("dispossessed", "Dispossessed", regressionScenario.indicators.dispossessed)
    ]
  };
}

function courtProvisioningFixtureExpectation(row: CourtProvisioningUatCase): LockedReviewExpectation {
  return {
    expectation_id: `court_provisioning:${row.scenario_id}`,
    source_artifact_relpath: COURT_PROVISIONING_UAT_PACK_RELPATH,
    source_ref: row.fixture_case_id,
    summary: row.steps[0] ?? `Fixture case ${row.fixture_case_id} keeps the court provisioning sheet reviewable.`,
    surface_ids: ["court_provisioning_sheet"],
    visibility_mode: "fixture_lock",
    cues: [
      cue("fixture_case_id", "Fixture case", row.fixture_case_id),
      cue("initial_tab", "Initial tab", row.initial_tab),
      ...row.expected_cues.map((value, index) => cue(`expected_cue_${index + 1}`, `Expected cue ${index + 1}`, value))
    ]
  };
}

function obligationsFixtureExpectation(row: ObligationsUatCase): LockedReviewExpectation {
  return {
    expectation_id: `obligations:${row.scenario_id}`,
    source_artifact_relpath: OBLIGATIONS_UAT_PACK_RELPATH,
    source_ref: row.fixture_case_id,
    summary:
      row.steps[0] ??
      `${row.fixture_case_id} keeps the obligations modal focused on ${row.expected_focus} with stable ladder cues.`,
    surface_ids: ["obligations_modal"],
    visibility_mode: "fixture_lock",
    cues: [
      cue("fixture_case_id", "Fixture case", row.fixture_case_id),
      cue("expected_focus", "Expected focus", row.expected_focus),
      ...row.expected_cues.map((value, index) => cue(`expected_cue_${index + 1}`, `Expected cue ${index + 1}`, value))
    ]
  };
}

function uatGateExpectation(scenario: UatScenarioPackRow, finding: UatScenarioFinding): LockedReviewExpectation {
  switch (scenario.id) {
    case "uat_arrears_enforcement":
      return {
        expectation_id: `uat_gate:${scenario.id}`,
        source_artifact_relpath: UAT_SCENARIO_GATE_RELPATH,
        source_ref: scenario.id,
        summary: "The obligations closure scenario still surfaces arrears enforcement on schedule in the accepted short run.",
        surface_ids: ["obligations_modal"],
        visibility_mode: "live_gate",
        cues: [
          cue("required_turn", "Required arrears turn", scenario.expectations.arrears_enforcement_by_turn ?? "n/a"),
          cue("observed_turn", "Observed arrears turn", finding.arrears_turn ?? "none"),
          cue("failures", "Failures", finding.failures.length === 0 ? "none" : finding.failures.join(" | "))
        ]
      };
    case "uat_grant_visibility":
      return {
        expectation_id: `uat_gate:${scenario.id}`,
        source_artifact_relpath: UAT_SCENARIO_GATE_RELPATH,
        source_ref: scenario.id,
        summary: "Grant prospects remain visible within the locked short-run window, so reviewers do not have to seed-hunt.",
        surface_ids: ["prospects_window"],
        visibility_mode: "live_gate",
        cues: [
          cue("required_turn", "Required grant turn", scenario.expectations.grant_window_by_turn ?? "n/a"),
          cue("observed_turn", "Observed grant turn", finding.grant_turn ?? "none"),
          cue("failures", "Failures", finding.failures.length === 0 ? "none" : finding.failures.join(" | "))
        ]
      };
    case "uat_meat_hunting_proxy":
      return {
        expectation_id: `uat_gate:${scenario.id}`,
        source_artifact_relpath: UAT_SCENARIO_GATE_RELPATH,
        source_ref: scenario.id,
        summary:
          scenario.visibility_note ??
          "Hunting remains locked through the deterministic proxy until direct surfaced runtime visibility lands.",
        surface_ids: ["hunting_proxy"],
        visibility_mode: "fallback_proxy",
        cues: [
          cue("required_yield_min", "Required hunting yield min", scenario.expectations.hunting_yield_min ?? "n/a"),
          cue("observed_yield_max", "Observed hunting yield max", finding.hunting_yield_max),
          cue("visibility_status", "Visibility status", scenario.visibility_status ?? "direct"),
          cue(
            "labor_override",
            "Turn-0 labor override",
            scenario.decision_overrides?.[0]?.labor
              ? `${scenario.decision_overrides[0].labor.desired_farmers} farmers / ${scenario.decision_overrides[0].labor.desired_builders} builders`
              : "none"
          ),
          cue("failures", "Failures", finding.failures.length === 0 ? "none" : finding.failures.join(" | "))
        ]
      };
  }
}

function maintenanceSharedSource(pack: MaintenancePressureScenarioPack): SharedReviewSource {
  return {
    source_id: "maintenance_pressure_reference_pack",
    source_artifact_relpath: MAINTENANCE_PRESSURE_SCENARIO_PACK_RELPATH,
    summary:
      "Maintenance pressure remains a shared closure reference pack until a later preset-driven upkeep packet lands on live preset application.",
    scenario_ids: pack.scenarios.map((row) => row.scenario_id),
    cues: pack.scenarios.map((row) =>
      cue(
        row.scenario_id,
        row.title,
        `drag=${row.pressure.applied_drag}; builders=${row.pressure.effective_builders}; farmers=${row.pressure.effective_farmers}; unmet=${row.pressure.unmet_labor}; ${row.preview.maintenance_note_lines[0] ?? "no preview note"}`
      )
    )
  };
}

export function buildLockedPresetScenariosArtifact(): LockedPresetScenariosArtifact {
  const presetPack = readJson<PlayabilityPresetPackV1>(PLAYABILITY_PRESET_PACK_RELPATH);
  const receiptPack = readJson<ReceiptBundleSeedPack>(PLAYTEST_OPS_PACKET_SEED_PACK_RELPATH);
  const regressionPack = readJson<RegressionSeedPack>(REGRESSION_SEED_PACK_RELPATH);
  const obligationsPack = readJson<ObligationsUatPack>(OBLIGATIONS_UAT_PACK_RELPATH);
  const courtProvisioningPack = readJson<CourtProvisioningUatPack>(COURT_PROVISIONING_UAT_PACK_RELPATH);
  const uatScenarioPack = readJson<UatScenarioPack>(UAT_SCENARIO_PACK_RELPATH);
  const uatScenarioGate = readJson<UatScenarioGate>(UAT_SCENARIO_GATE_RELPATH);
  const maintenancePack = readJson<MaintenancePressureScenarioPack>(MAINTENANCE_PRESSURE_SCENARIO_PACK_RELPATH);

  const source_artifacts: SourceArtifact[] = [
    {
      artifact_relpath: PLAYABILITY_PRESET_PACK_RELPATH,
      hash: deriveArtifactHash(presetPack as Record<string, unknown>),
      kind: presetPack.kind,
      label: "playability preset pack"
    },
    {
      artifact_relpath: PLAYTEST_OPS_PACKET_SEED_PACK_RELPATH,
      hash: deriveArtifactHash(receiptPack as Record<string, unknown>),
      kind: receiptPack.kind,
      label: "receipt-bundle seed pack"
    },
    {
      artifact_relpath: REGRESSION_SEED_PACK_RELPATH,
      hash: deriveArtifactHash(regressionPack as Record<string, unknown>),
      kind: regressionPack.kind,
      label: "regression seed pack"
    },
    {
      artifact_relpath: OBLIGATIONS_UAT_PACK_RELPATH,
      hash: deriveArtifactHash(obligationsPack as Record<string, unknown>),
      kind: obligationsPack.kind,
      label: "obligations UAT pack"
    },
    {
      artifact_relpath: COURT_PROVISIONING_UAT_PACK_RELPATH,
      hash: deriveArtifactHash(courtProvisioningPack as Record<string, unknown>),
      kind: courtProvisioningPack.kind,
      label: "court provisioning UAT pack"
    },
    {
      artifact_relpath: UAT_SCENARIO_PACK_RELPATH,
      hash: deriveArtifactHash(uatScenarioPack as Record<string, unknown>),
      kind: uatScenarioPack.schema_version,
      label: "UAT scenario pack"
    },
    {
      artifact_relpath: UAT_SCENARIO_GATE_RELPATH,
      hash: deriveArtifactHash(uatScenarioGate as Record<string, unknown>),
      kind: uatScenarioGate.gate,
      label: "UAT scenario gate"
    },
    {
      artifact_relpath: MAINTENANCE_PRESSURE_SCENARIO_PACK_RELPATH,
      hash: deriveArtifactHash(maintenancePack as Record<string, unknown>),
      kind: maintenancePack.kind,
      label: "maintenance pressure scenarios"
    }
  ];

  const scenarios: LockedPresetScenarioRow[] = presetPack.presets.map((preset) => {
    const review_expectations: LockedReviewExpectation[] = [];

    for (const ref of preset.source_refs) {
      if (ref.pack_id === "playtest_ops_receipt_bundle_seed_pack") {
        review_expectations.push(packetReviewExpectation(requireReceiptScenario(receiptPack, ref.scenario_id)));
      }
      if (ref.pack_id === "economy_fiscal_regression_seed_pack") {
        review_expectations.push(regressionComparisonExpectation(requireRegressionScenario(regressionPack, ref.scenario_id)));
      }
      if (ref.pack_id === "uat_scenario_pack") {
        review_expectations.push(
          uatGateExpectation(
            requireUatScenario(uatScenarioPack, ref.scenario_id),
            requireUatFinding(uatScenarioGate, ref.scenario_id)
          )
        );
      }
    }

    for (const row of courtProvisioningPack.cases.filter((entry) => entry.source_seed === preset.seed)) {
      review_expectations.push(courtProvisioningFixtureExpectation(row));
    }

    for (const row of obligationsPack.cases.filter((entry) => entry.preset_ids.includes(preset.preset_id))) {
      review_expectations.push(obligationsFixtureExpectation(row));
    }

    return {
      scenario_id: preset.preset_id,
      preset_id: preset.preset_id,
      title: preset.title,
      seed: preset.seed,
      policy_id: preset.policy_id,
      turns: preset.turns,
      acceptance_ids: [...preset.acceptance_ids],
      live_seed_surfaces: liveSeedSurfaces(preset.seed),
      review_expectations
    };
  });

  return {
    kind: LOCKED_PRESET_SCENARIOS_KIND,
    release: PLAYABILITY_PRESET_PACK_RELEASE,
    source_artifacts,
    shared_review_sources: [maintenanceSharedSource(maintenancePack)],
    scenarios,
    qa_flow: {
      commands: [
        "npm run qa",
        "npm run preflight",
        "npm run seed:replay:batch",
        "node node_modules/tsx/dist/cli.mjs scripts/maintenancePressureScenarios.ts",
        "node node_modules/tsx/dist/cli.mjs scripts/uatScenarioGate.ts",
        "node node_modules/tsx/dist/cli.mjs scripts/lockedPresetScenarios.ts"
      ],
      note:
        "Refresh the upstream preset, maintenance, and UAT seams first, then rebuild this manifest so direct seed-derived surfaces and checked-in review packets stay aligned without creating a second init path."
    }
  };
}

function main(): void {
  const artifact = buildLockedPresetScenariosArtifact();
  writeStableArtifact(path.resolve(LOCKED_PRESET_SCENARIOS_RELPATH), artifact);
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  main();
}
