#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createNewRun } from "../src/sim/state";
import { proposeTurn, applyDecisions } from "../src/sim/turn";
import { decide, canonicalizePolicyId } from "../src/sim/policies";
import { deterministicHuntingYieldForState } from "../src/sim/domains/economy/productionRegistry";
import type { RunState, TurnDecisions } from "../src/sim/types";
import { APP_VERSION } from "../src/version";
import {
  PLAYABILITY_PRESET_PACK_RELEASE,
  PLAYABILITY_PRESET_PACK_RELPATH,
  type PlayabilityPresetPackV1
} from "../src/ui/playabilityPresetPack";
import { LOCKED_PRESET_SCENARIOS_RELPATH } from "./lockedPresetScenarios";
import { writeStableArtifact } from "./seed_replay/artifactWriter";
import { sha256, stableStringify } from "./seed_replay/hash";
import { STORY_UAT_FIXTURE_PACK_RELPATH, type StoryUatFixturePackArtifact } from "./storyUatFixtures";

const DEFAULT_PACK_RELPATH = "qa_artifacts/playtest_ops/uat_scenarios_v0.3.json" as const;
const UAT_SCENARIO_GATE_RELPATH = "qa_artifacts/playtest_ops/uat_scenario_gate.json" as const;
const FILTERED_UAT_SCENARIO_GATE_DIR = `qa_artifacts/playtest_ops/${PLAYABILITY_PRESET_PACK_RELEASE}` as const;

type LaborOverride = {
  desired_farmers: number;
  desired_builders: number;
};

type DecisionOverride = {
  turn_index: number;
  labor?: LaborOverride;
};

type ScenarioExpectations = {
  hunting_yield_min?: number;
  arrears_enforcement_by_turn?: number;
  obligation_consequence_visible_by_turn?: number;
  grant_window_by_turn?: number;
};

type ScenarioDefinition = {
  id: string;
  title: string;
  seed: string;
  policy_id: string;
  turns: number;
  decision_overrides?: DecisionOverride[];
  expectations: ScenarioExpectations;
  visibility_status?: "fallback" | "direct";
  visibility_note?: string;
};

type ScenarioPack = {
  schema_version: string;
  created_at: string;
  notes?: string[];
  scenarios: ScenarioDefinition[];
};

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

type LockedPresetScenarioManifest = {
  hash?: string;
  kind: string;
  scenarios: Array<{
    acceptance_ids: string[];
    live_seed_surfaces: Array<{
      cues: SurfaceCue[];
      summary: string;
      surface_id: string;
    }>;
    preset_id: string;
    review_expectations: Array<{
      cues: SurfaceCue[];
      source_artifact_relpath: string;
      source_ref: string;
      summary: string;
      surface_ids: string[];
      visibility_mode: string;
    }>;
    seed: string;
    title: string;
    turns: number;
  }>;
};

type UatPresetMapping = {
  acceptance_ids: string[];
  policy_id: string;
  preset_id: string;
  scenario_id: string;
  seed: string;
  title: string;
  turns: number;
};

type ScenarioFinding = {
  acceptance_ids: string[];
  scenario_id: string;
  preset_id: string;
  preset_title: string;
  seed: string;
  policy_id: string;
  turns: number;
  hunting_yield_max: number;
  grant_turn?: number | null;
  arrears_turn?: number | null;
  obligation_visibility?: {
    collector_labels: string[];
    collector_states: string[];
    consequence_summaries: string[];
    turn: number | null;
  } | null;
  failures: string[];
};

type PresetChecklistEntry = {
  acceptance_ids: string[];
  gate_findings: {
    arrears_turn: number | null;
    failures: string[];
    grant_turn: number | null;
    hunting_yield_max: number;
    obligation_visibility: {
      collector_labels: string[];
      collector_states: string[];
      consequence_summaries: string[];
      turn: number | null;
    } | null;
  };
  manual_review: {
    cue_samples: SurfaceCue[];
    expectation_summary: string;
    live_seed_surfaces: Array<{
      cue_samples: SurfaceCue[];
      summary: string;
      surface_id: string;
    }>;
    provenance_expectation: string;
    surface_ids: string[];
  };
  policy_id: string;
  preset_id: string;
  scenario_id: string;
  seed: string;
  status: "fail" | "pass";
  title: string;
  turns: number;
};

type GateReport = {
  gate: "uat_scenario_gate_v1";
  closure_checklist: PresetChecklistEntry[];
  started_at: string;
  completed_at?: string;
  failed: number;
  passed: number;
  failures: Array<{ scenario_id: string; detail: string }>;
  provenance_expectation: string;
  operator_flow: {
    commands: string[];
    note: string;
  };
  operator_notes: string[];
  report_scope: {
    canonical_artifact_relpath: string;
    mode: "canonical" | "filtered";
    preset_filter: string[];
    report_artifact_relpath: string;
    scenario_filter: string[];
  };
  story_checklist: StoryChecklistEntry[];
  release: string;
  scenarios: ScenarioFinding[];
  source_artifacts: SourceArtifact[];
  notes: string[];
};

type StoryChecklistStatus = "automated_fail" | "automated_pass" | "manual_review";

type StoryChecklistEntry = {
  fixture_case_ids: string[];
  id: string;
  scenario_ids: string[];
  source_artifact_relpath: string | null;
  status: StoryChecklistStatus;
  surfaces: string[];
  summary: string;
  title: string;
  verification: "automated" | "manual_review";
};

const STORY_CHECKLIST_DEFS = [
  {
    fixture_case_ids: ["ledger_explain_changes_story"],
    id: "food_reconciliation",
    scenario_ids: [],
    source_artifact_relpath: STORY_UAT_FIXTURE_PACK_RELPATH,
    surfaces: ["Turn Report", "Explain Changes", "Food & Stores"],
    summary: "Verify the food summary and drilldown tell one ordered story from starting stores through ending stores.",
    title: "US-01 Food ledger walkdown",
    verification: "manual_review"
  },
  {
    fixture_case_ids: ["ledger_explain_changes_story"],
    id: "coin_reconciliation",
    scenario_ids: [],
    source_artifact_relpath: STORY_UAT_FIXTURE_PACK_RELPATH,
    surfaces: ["Turn Report", "Explain Changes", "Coin & Dues"],
    summary: "Verify coin shows a readable start-to-end walkdown, including upkeep, dues, and any offsetting inflows.",
    title: "US-02 Coin ledger walkdown",
    verification: "manual_review"
  },
  {
    fixture_case_ids: ["ledger_explain_changes_story"],
    id: "unrest_causal_walkdown",
    scenario_ids: [],
    source_artifact_relpath: STORY_UAT_FIXTURE_PACK_RELPATH,
    surfaces: ["Manor State", "Explain Changes", "Unrest & Stability"],
    summary: "Verify unrest shows explicit positive and negative contributors and that the net change matches the headline surface.",
    title: "US-03 Unrest causal walkdown",
    verification: "manual_review"
  },
  {
    fixture_case_ids: ["obligations_split_payment_story"],
    id: "obligations_split_payment",
    scenario_ids: [],
    source_artifact_relpath: STORY_UAT_FIXTURE_PACK_RELPATH,
    surfaces: ["Obligations", "Turn Report", "Coin & Dues", "Council Agenda"],
    summary: "Verify current dues, arrears carried in, paid this turn, and unpaid carry all remain distinct by counterparty.",
    title: "US-06 to US-08 Obligations and arrears truth",
    verification: "manual_review"
  },
  {
    fixture_case_ids: ["obligations_split_payment_story"],
    id: "arrears_consequences",
    scenario_ids: ["uat_arrears_enforcement"],
    source_artifact_relpath: STORY_UAT_FIXTURE_PACK_RELPATH,
    surfaces: ["Council Agenda", "Obligations", "Turn Report", "Unrest & Stability"],
    summary: "Arrears enforcement must become visible within the short deterministic run and remain legible on the player-facing surfaces.",
    title: "US-09 Arrears consequences",
    verification: "automated"
  },
  {
    fixture_case_ids: [],
    id: "project_completion_effects",
    scenario_ids: [],
    source_artifact_relpath: null,
    surfaces: ["Manor State", "Explain Changes", "Construction"],
    summary: "Verify completed projects leave a visible cost and effect trail in both headline and drilldown surfaces.",
    title: "US-35 Project completion effects",
    verification: "manual_review"
  },
  {
    fixture_case_ids: [],
    id: "relationship_delta_attribution",
    scenario_ids: [],
    source_artifact_relpath: null,
    surfaces: ["Diff Ledger", "Explain Changes", "House Dossier", "Person Card"],
    summary: "Verify relationship movement is presented as a turn delta with a named cause, not as a repeated total value.",
    title: "US-38 to US-40 Relationship delta trust",
    verification: "manual_review"
  },
  {
    fixture_case_ids: [],
    id: "provenance_parity",
    scenario_ids: [],
    source_artifact_relpath: null,
    surfaces: ["New Run", "Run Log", "Run export", "Run summary", "docs/BUILD_INFO.json"],
    summary: "Verify the UI version, run export, packet metadata, and build info agree on the same release provenance.",
    title: "US-45 Provenance parity",
    verification: "manual_review"
  }
] as const;

function readJson<T>(artifactRelpath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(artifactRelpath), "utf8")) as T;
}

function deriveArtifactHash(payload: Record<string, unknown>): string {
  return typeof payload.hash === "string" && payload.hash.trim().length > 0
    ? payload.hash
    : sha256(stableStringify(payload));
}

function nowIso(): string {
  return new Date().toISOString();
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function cloneCueRows(rows: readonly SurfaceCue[]): SurfaceCue[] {
  return rows.map((row) => ({ ...row }));
}

function parseArgs(args: string[]): { packPath: string; presetFilter: string[]; scenarioFilter: string[] } {
  let packPath = path.resolve(DEFAULT_PACK_RELPATH);
  const presetFilter: string[] = [];
  const scenarioFilter: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("--pack=")) {
      packPath = path.resolve(arg.slice("--pack=".length));
    } else if (arg.startsWith("--preset=")) {
      presetFilter.push(arg.slice("--preset=".length));
    } else if (arg.startsWith("--scenario=")) {
      scenarioFilter.push(arg.slice("--scenario=".length));
    }
  }
  return { packPath, presetFilter, scenarioFilter };
}

function sanitizeFilterSegment(value: string): string {
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned.length > 0 ? cleaned : "selection";
}

function buildFilteredArtifactRelpath(presetFilter: readonly string[], scenarioFilter: readonly string[]): string {
  const presetSegments = [...new Set(presetFilter)].sort().map((presetId) => `preset_${sanitizeFilterSegment(presetId)}`);
  const scenarioSegments = [...new Set(scenarioFilter)]
    .sort()
    .map((scenarioId) => `scenario_${sanitizeFilterSegment(scenarioId)}`);
  const segments = [...presetSegments, ...scenarioSegments];

  if (segments.length === 0) {
    return UAT_SCENARIO_GATE_RELPATH;
  }

  const label =
    segments.length <= 2
      ? segments.join("__")
      : `selection_${sha256(segments.join("|")).slice(0, 12)}`;

  return `${FILTERED_UAT_SCENARIO_GATE_DIR}/uat_scenario_gate__${label}.json`;
}

function applyDecisionOverrides(
  decisions: TurnDecisions,
  overrides: DecisionOverride[] | undefined,
  turnIndex: number
): void {
  if (!overrides || overrides.length === 0) return;
  const override = overrides.find((row) => row.turn_index === turnIndex);
  if (!override) return;
  if (override.labor) {
    decisions.labor = {
      kind: "labor",
      desired_farmers: override.labor.desired_farmers,
      desired_builders: override.labor.desired_builders
    };
  }
}

function findArrearsEnforcementTurn(state: RunState): number | null {
  const lastLog = state.log?.[state.log.length - 1];
  const snapshot: any = lastLog?.snapshot_after ?? null;
  const view = snapshot?.economy_obligations_view ?? null;
  const summaries = Array.isArray(view?.counterparty_summaries) ? view.counterparty_summaries : [];
  const hit = summaries.some((entry: any) => {
    const arrearsAmount = Number(entry?.arrears_amount ?? 0);
    return arrearsAmount > 0 && entry?.enforcement_state === "arrears";
  });
  if (!hit) return null;
  const turn = Number(view?.turn ?? snapshot?.turn_index ?? state.turn_index);
  return Number.isFinite(turn) ? turn : null;
}

function findObligationConsequenceVisibility(state: RunState): {
  collector_labels: string[];
  collector_states: string[];
  consequence_summaries: string[];
  turn: number | null;
} | null {
  const lastLog = state.log?.[state.log.length - 1];
  const snapshot: any = lastLog?.snapshot_after ?? null;
  const view = snapshot?.economy_obligations_view ?? null;
  const summaries = Array.isArray(view?.counterparty_summaries) ? view.counterparty_summaries : [];
  const visibleRows = summaries
    .map((entry: any) => ({
      arrears_amount: readNumber(entry?.arrears_amount) ?? 0,
      collector_label: readString(entry?.counterparty_label),
      collector_state: readString(entry?.collector_state),
      enforcement_state: readString(entry?.enforcement_state),
      enforcement_summary: readString(entry?.enforcement_summary)
    }))
    .filter((entry) => {
      return (
        entry.arrears_amount > 0 &&
        entry.enforcement_state === "arrears" &&
        entry.collector_label !== null &&
        entry.enforcement_summary !== null
      );
    });

  if (visibleRows.length === 0) return null;

  const turn = readNumber(view?.turn ?? snapshot?.turn_index ?? state.turn_index);
  return {
    collector_labels: visibleRows.map((entry) => entry.collector_label ?? "Unknown"),
    collector_states: visibleRows.map((entry) => entry.collector_state ?? "unknown"),
    consequence_summaries: visibleRows.map((entry) => entry.enforcement_summary ?? "Unavailable"),
    turn
  };
}

function listUatPresetMappings(presetPack: PlayabilityPresetPackV1): UatPresetMapping[] {
  return presetPack.presets
    .flatMap((preset) =>
      preset.source_refs
        .filter((ref) => ref.pack_id === "uat_scenario_pack")
        .map((ref) => ({
          acceptance_ids: [...preset.acceptance_ids],
          policy_id: preset.policy_id,
          preset_id: preset.preset_id,
          scenario_id: ref.scenario_id,
          seed: preset.seed,
          title: preset.title,
          turns: preset.turns
        }))
    )
    .sort((left, right) => {
      const leftIndex = presetPack.presets.findIndex((preset) => preset.preset_id === left.preset_id);
      const rightIndex = presetPack.presets.findIndex((preset) => preset.preset_id === right.preset_id);
      return leftIndex - rightIndex;
    });
}

function resolveScenarios(
  pack: ScenarioPack,
  mappings: readonly UatPresetMapping[],
  scenarioFilter: readonly string[],
  presetFilter: readonly string[]
): ScenarioDefinition[] {
  const mappingByPreset = new Map(mappings.map((mapping) => [mapping.preset_id, mapping]));
  const requestedIds = new Set<string>();

  for (const scenarioId of scenarioFilter) {
    requestedIds.add(scenarioId);
  }

  for (const presetId of presetFilter) {
    const mapping = mappingByPreset.get(presetId);
    if (!mapping) {
      throw new Error(`Unknown or non-UAT preset filter ${presetId}.`);
    }
    requestedIds.add(mapping.scenario_id);
  }

  if (requestedIds.size === 0) {
    return [...pack.scenarios];
  }

  const scenarios = pack.scenarios.filter((scenario) => requestedIds.has(scenario.id));
  const foundIds = new Set(scenarios.map((scenario) => scenario.id));
  const missing = [...requestedIds].filter((scenarioId) => !foundIds.has(scenarioId)).sort();
  if (missing.length > 0) {
    throw new Error(`No scenarios matched: ${missing.join(", ")}.`);
  }
  return scenarios;
}

function runScenario(scenario: ScenarioDefinition, mapping: UatPresetMapping): ScenarioFinding {
  const policy = canonicalizePolicyId(scenario.policy_id);
  let state = createNewRun(scenario.seed);
  let grantTurn: number | null = null;
  let arrearsTurn: number | null = null;
  let obligationVisibility: {
    collector_labels: string[];
    collector_states: string[];
    consequence_summaries: string[];
    turn: number | null;
  } | null = null;
  let huntingYieldMax = 0;

  for (let i = 0; i < scenario.turns; i++) {
    if (state.game_over) break;
    const ctx = proposeTurn(state);
    const turnNumber = i + 1;

    if (grantTurn === null) {
      const hasGrant = (ctx.prospects_window?.prospects ?? []).some((prospect) => prospect.type === "grant");
      if (hasGrant) grantTurn = turnNumber;
    }

    const decisions: TurnDecisions = decide(policy, state, ctx);
    applyDecisionOverrides(decisions, scenario.decision_overrides, i);
    decisions.prospects = { kind: "prospects", actions: [] };
    state = applyDecisions(state, decisions);

    const huntingYield = deterministicHuntingYieldForState(state);
    huntingYieldMax = Math.max(huntingYieldMax, huntingYield);

    if (arrearsTurn === null) {
      const hit = findArrearsEnforcementTurn(state);
      if (hit !== null) arrearsTurn = hit;
    }
    if (obligationVisibility === null) {
      const hit = findObligationConsequenceVisibility(state);
      if (hit !== null) obligationVisibility = hit;
    }
  }

  const failures: string[] = [];
  const expectations = scenario.expectations ?? {};

  if (expectations.hunting_yield_min !== undefined && huntingYieldMax < expectations.hunting_yield_min) {
    failures.push(`expected hunting_yield_min >= ${expectations.hunting_yield_min}, saw ${huntingYieldMax}`);
  }
  if (expectations.grant_window_by_turn !== undefined) {
    if (grantTurn === null) {
      failures.push(`expected grant offer by turn ${expectations.grant_window_by_turn}, saw none`);
    } else if (grantTurn > expectations.grant_window_by_turn) {
      failures.push(`expected grant offer by turn ${expectations.grant_window_by_turn}, saw turn ${grantTurn}`);
    }
  }
  if (expectations.arrears_enforcement_by_turn !== undefined) {
    if (arrearsTurn === null) {
      failures.push(`expected arrears enforcement by turn ${expectations.arrears_enforcement_by_turn}, saw none`);
    } else if (arrearsTurn > expectations.arrears_enforcement_by_turn) {
      failures.push(`expected arrears enforcement by turn ${expectations.arrears_enforcement_by_turn}, saw turn ${arrearsTurn}`);
    }
  }
  if (expectations.obligation_consequence_visible_by_turn !== undefined) {
    const visibleTurn = obligationVisibility?.turn ?? null;
    if (visibleTurn === null) {
      failures.push(
        `expected obligation consequence visibility by turn ${expectations.obligation_consequence_visible_by_turn}, saw none`
      );
    } else if (visibleTurn > expectations.obligation_consequence_visible_by_turn) {
      failures.push(
        `expected obligation consequence visibility by turn ${expectations.obligation_consequence_visible_by_turn}, saw turn ${visibleTurn}`
      );
    }
  }

  return {
    acceptance_ids: [...mapping.acceptance_ids],
    scenario_id: scenario.id,
    preset_id: mapping.preset_id,
    preset_title: mapping.title,
    seed: scenario.seed,
    policy_id: policy,
    turns: scenario.turns,
    hunting_yield_max: huntingYieldMax,
    grant_turn: grantTurn,
    arrears_turn: arrearsTurn,
    obligation_visibility: obligationVisibility,
    failures
  };
}

function buildChecklistEntry(
  mapping: UatPresetMapping,
  finding: ScenarioFinding,
  manifest: LockedPresetScenarioManifest
): PresetChecklistEntry {
  const manifestRow = manifest.scenarios.find((scenario) => scenario.preset_id === mapping.preset_id);
  if (!manifestRow) {
    throw new Error(`Locked preset manifest is missing preset ${mapping.preset_id}.`);
  }
  const gateExpectation =
    manifestRow.review_expectations.find(
      (entry) =>
        entry.source_artifact_relpath === UAT_SCENARIO_GATE_RELPATH &&
        entry.source_ref === mapping.scenario_id
    ) ?? null;
  const obligationCueSamples =
    finding.obligation_visibility === null
      ? []
      : [
          {
            cue_id: "consequence_turn",
            label: "Consequence turn",
            value: String(finding.obligation_visibility.turn ?? "none")
          },
          {
            cue_id: "visible_collectors",
            label: "Visible collectors",
            value: finding.obligation_visibility.collector_labels.join(" | ")
          },
          {
            cue_id: "collector_states",
            label: "Collector states",
            value: finding.obligation_visibility.collector_states.join(" | ")
          },
          {
            cue_id: "sample_consequence",
            label: "Sample consequence",
            value: finding.obligation_visibility.consequence_summaries[0] ?? "Unavailable"
          }
        ];

  return {
    acceptance_ids: [...mapping.acceptance_ids],
    gate_findings: {
      arrears_turn: finding.arrears_turn ?? null,
      failures: [...finding.failures],
      grant_turn: finding.grant_turn ?? null,
      hunting_yield_max: finding.hunting_yield_max,
      obligation_visibility: finding.obligation_visibility
    },
    manual_review: {
      cue_samples: [...cloneCueRows(gateExpectation?.cues ?? []), ...cloneCueRows(obligationCueSamples)],
      expectation_summary:
        gateExpectation?.summary ??
        "Use the locked preset manifest to review the expected visible surface for this preset-driven UAT case.",
      live_seed_surfaces: manifestRow.live_seed_surfaces.map((surface) => ({
        cue_samples: cloneCueRows(surface.cues.slice(0, 3)),
        summary: surface.summary,
        surface_id: surface.surface_id
      })),
      provenance_expectation: `Launch preset ${mapping.preset_id} from New Run and verify run provenance shows preset ${mapping.preset_id}, seed ${mapping.seed}, and policy ${mapping.policy_id}.`,
      surface_ids: [...(gateExpectation?.surface_ids ?? [])]
    },
    policy_id: mapping.policy_id,
    preset_id: mapping.preset_id,
    scenario_id: mapping.scenario_id,
    seed: mapping.seed,
    status: finding.failures.length > 0 ? "fail" : "pass",
    title: mapping.title,
    turns: mapping.turns
  };
}

function buildStoryChecklist(results: readonly ScenarioFinding[]): StoryChecklistEntry[] {
  return STORY_CHECKLIST_DEFS.map((entry) => {
    if (entry.verification === "manual_review") {
      return {
        ...entry,
        fixture_case_ids: [...entry.fixture_case_ids],
        scenario_ids: [...entry.scenario_ids],
        status: "manual_review"
      };
    }

    const matchedResults = results.filter((result) => entry.scenario_ids.includes(result.scenario_id));
    const status: StoryChecklistStatus =
      matchedResults.length > 0 && matchedResults.every((result) => result.failures.length === 0)
        ? "automated_pass"
        : "automated_fail";

    return {
      ...entry,
      fixture_case_ids: [...entry.fixture_case_ids],
      scenario_ids: [...entry.scenario_ids],
      status
    };
  });
}

function main(): void {
  const { packPath, presetFilter, scenarioFilter } = parseArgs(process.argv.slice(2));
  const pack = readJson<ScenarioPack>(path.relative(process.cwd(), packPath));
  const presetPack = readJson<PlayabilityPresetPackV1>(PLAYABILITY_PRESET_PACK_RELPATH);
  const lockedPresetManifest = readJson<LockedPresetScenarioManifest>(LOCKED_PRESET_SCENARIOS_RELPATH);
  const obligationsEvidencePack = readJson<Record<string, unknown>>(
    "qa_artifacts/playtest_ops/v0.3.6/obligations_visibility_evidence_pack.json"
  );
  const storyFixturePack = readJson<StoryUatFixturePackArtifact>(STORY_UAT_FIXTURE_PACK_RELPATH);
  const reportArtifactRelpath = buildFilteredArtifactRelpath(presetFilter, scenarioFilter);
  const presetMappings = listUatPresetMappings(presetPack);
  const mappingByScenarioId = new Map(presetMappings.map((mapping) => [mapping.scenario_id, mapping]));
  const scenarios = resolveScenarios(pack, presetMappings, scenarioFilter, presetFilter);

  const source_artifacts: SourceArtifact[] = [
    {
      artifact_relpath: PLAYABILITY_PRESET_PACK_RELPATH,
      hash: deriveArtifactHash(presetPack as Record<string, unknown>),
      kind: presetPack.kind,
      label: "playability preset pack"
    },
    {
      artifact_relpath: LOCKED_PRESET_SCENARIOS_RELPATH,
      hash: deriveArtifactHash(lockedPresetManifest as Record<string, unknown>),
      kind: lockedPresetManifest.kind,
      label: "locked preset manifest"
    },
    {
      artifact_relpath: DEFAULT_PACK_RELPATH,
      hash: deriveArtifactHash(pack as Record<string, unknown>),
      kind: pack.schema_version,
      label: "uat scenario pack"
    },
    {
      artifact_relpath: "qa_artifacts/playtest_ops/v0.3.6/obligations_visibility_evidence_pack.json",
      hash: deriveArtifactHash(obligationsEvidencePack),
      kind: String(obligationsEvidencePack.kind ?? "obligations_visibility_evidence_pack_v1"),
      label: "obligations visibility evidence pack"
    },
    {
      artifact_relpath: STORY_UAT_FIXTURE_PACK_RELPATH,
      hash: deriveArtifactHash(storyFixturePack as Record<string, unknown>),
      kind: storyFixturePack.kind,
      label: "story fixture pack"
    }
  ];

  const report: GateReport = {
    gate: "uat_scenario_gate_v1",
    release: APP_VERSION,
    provenance_expectation:
      `Review against release ${APP_VERSION}. Manual provenance checks should confirm that New Run, Run Log, ` +
      "run summary export, packet metadata, and BUILD_INFO all agree on the same app version.",
    source_artifacts,
    closure_checklist: [],
    started_at: nowIso(),
    failed: 0,
    passed: 0,
    failures: [],
    scenarios: [],
    notes: [],
    report_scope: {
      canonical_artifact_relpath: UAT_SCENARIO_GATE_RELPATH,
      mode: presetFilter.length === 0 && scenarioFilter.length === 0 ? "canonical" : "filtered",
      preset_filter: [...presetFilter],
      report_artifact_relpath: reportArtifactRelpath,
      scenario_filter: [...scenarioFilter]
    },
    operator_flow: {
      commands: [
        "node node_modules/tsx/dist/cli.mjs scripts/uatScenarioGate.ts",
        "node node_modules/tsx/dist/cli.mjs scripts/uatScenarioGate.ts --preset=uat_arrears_enforcement",
        "node node_modules/tsx/dist/cli.mjs scripts/uatScenarioGate.ts --preset=uat_grant_visibility",
        "node node_modules/tsx/dist/cli.mjs scripts/uatScenarioGate.ts --preset=uat_hunting_proxy"
      ],
      note:
        "Use preset ids as the operator-facing checklist handle. Raw scenario ids remain execution details for the deterministic UAT pack and should not replace the locked preset names in review notes."
    },
    operator_notes: [
      "Select the locked preset in the New Run UI first, then confirm the provenance banner shows the matching preset id and seed before reviewing gameplay surfaces.",
      "Treat qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json as the canonical preset list and qa_artifacts/playtest_ops/v0.3.5/locked_preset_scenarios.json as the visible-cue checklist.",
      "Use docs/qa/obligations_visibility_evidence_pack_v0.3.6.md plus qa_artifacts/playtest_ops/v0.3.6/obligations_visibility_evidence_pack.json as the canonical obligation evidence bundle for successor, vacancy, and carry review.",
      `Use ${STORY_UAT_FIXTURE_PACK_RELPATH} when the v0.3.6 story checklist needs deterministic cue text for Explain Changes or Obligations review.`,
      "Use --preset=<preset_id> for targeted reruns when a single closure lane needs confirmation; scenario ids remain source-pack detail rather than operator-facing checklist names.",
      "Filtered reruns write a release-scoped gate artifact and preserve qa_artifacts/playtest_ops/uat_scenario_gate.json as the full closure checklist for downstream preset manifests."
    ],
    story_checklist: []
  };

  if (scenarios.length === 0) {
    report.failed = 1;
    report.failures.push({ scenario_id: "pack", detail: "no scenarios matched filter" });
  } else {
    for (const scenario of scenarios) {
      const mapping = mappingByScenarioId.get(scenario.id);
      if (!mapping) {
        throw new Error(`Scenario ${scenario.id} is not mapped to a locked UAT preset.`);
      }
      const result = runScenario(scenario, mapping);
      report.scenarios.push(result);
      if (result.failures.length > 0) {
        report.failed += 1;
        for (const detail of result.failures) {
          report.failures.push({ scenario_id: scenario.id, detail });
        }
      } else {
        report.passed += 1;
      }
      if (scenario.visibility_status === "fallback") {
        report.notes.push(`scenario ${scenario.id} uses fallback visibility: ${scenario.visibility_note ?? "unspecified"}`);
      }
    }
  }

  report.closure_checklist = presetMappings
    .filter((mapping) => {
      if (presetFilter.length === 0 && scenarioFilter.length === 0) return true;
      return report.scenarios.some((scenario) => scenario.preset_id === mapping.preset_id);
    })
    .map((mapping) => {
      const finding = report.scenarios.find((scenario) => scenario.preset_id === mapping.preset_id);
      if (!finding) {
        throw new Error(`Missing gate finding for preset ${mapping.preset_id}.`);
      }
      return buildChecklistEntry(mapping, finding, lockedPresetManifest);
    });
  report.story_checklist = buildStoryChecklist(report.scenarios);

  report.completed_at = nowIso();

  const outPath = path.resolve(reportArtifactRelpath);
  writeStableArtifact(outPath, report);

  if (report.failed > 0) {
    console.error(`UAT scenario gate failed with ${report.failed} failure(s). See ${outPath}`);
    process.exit(1);
  }

  console.log(`UAT scenario gate passed. Wrote ${outPath}`);
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  main();
}
