#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createNewRun } from "../src/sim/state";
import { proposeTurn, applyDecisions } from "../src/sim/turn";
import { decide, canonicalizePolicyId } from "../src/sim/policies";
import { deterministicHuntingYieldForState } from "../src/sim/domains/economy/productionRegistry";
import type { RunState, TurnDecisions } from "../src/sim/types";

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

type ScenarioFinding = {
  scenario_id: string;
  seed: string;
  policy_id: string;
  turns: number;
  hunting_yield_max: number;
  grant_turn?: number | null;
  arrears_turn?: number | null;
  failures: string[];
};

type GateReport = {
  gate: "uat_scenario_gate_v1";
  started_at: string;
  completed_at?: string;
  failed: number;
  passed: number;
  failures: Array<{ scenario_id: string; detail: string }>;
  scenarios: ScenarioFinding[];
  notes: string[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function parseArgs(args: string[]): { packPath: string; scenarioFilter: string[] } {
  let packPath = path.resolve("qa_artifacts", "playtest_ops", "uat_scenarios_v0.3.json");
  const scenarioFilter: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("--pack=")) {
      packPath = path.resolve(arg.slice("--pack=".length));
    } else if (arg.startsWith("--scenario=")) {
      scenarioFilter.push(arg.slice("--scenario=".length));
    }
  }
  return { packPath, scenarioFilter };
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

function runScenario(scenario: ScenarioDefinition): ScenarioFinding {
  const policy = canonicalizePolicyId(scenario.policy_id);
  let state = createNewRun(scenario.seed);
  let grantTurn: number | null = null;
  let arrearsTurn: number | null = null;
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

  return {
    scenario_id: scenario.id,
    seed: scenario.seed,
    policy_id: policy,
    turns: scenario.turns,
    hunting_yield_max: huntingYieldMax,
    grant_turn: grantTurn,
    arrears_turn: arrearsTurn,
    failures
  };
}

function main(): void {
  const { packPath, scenarioFilter } = parseArgs(process.argv.slice(2));
  const pack: ScenarioPack = JSON.parse(fs.readFileSync(packPath, "utf-8"));
  const scenarios = pack.scenarios.filter((scenario) => {
    if (scenarioFilter.length === 0) return true;
    return scenarioFilter.includes(scenario.id);
  });

  const report: GateReport = {
    gate: "uat_scenario_gate_v1",
    started_at: nowIso(),
    failed: 0,
    passed: 0,
    failures: [],
    scenarios: [],
    notes: []
  };

  if (scenarios.length === 0) {
    report.failed = 1;
    report.failures.push({ scenario_id: "pack", detail: "no scenarios matched filter" });
  } else {
    for (const scenario of scenarios) {
      const result = runScenario(scenario);
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

  report.completed_at = nowIso();

  const outDir = path.resolve("qa_artifacts", "playtest_ops");
  ensureDir(outDir);
  const outPath = path.join(outDir, "uat_scenario_gate.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  if (report.failed > 0) {
    console.error(`UAT scenario gate failed with ${report.failed} failure(s). See ${outPath}`);
    process.exit(1);
  }

  console.log(`UAT scenario gate passed. Wrote ${outPath}`);
}

main();
