#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import { applyDecisions, createNewRun, proposeTurn } from "../src/sim";
import { buildCourtDelegationRegistry } from "../src/sim/domains/court/delegationRegistry";
import {
  buildMaintenanceLaborPressure,
  maintenanceLaborPressureSummaryLines,
  MAINTENANCE_LABOR_PRESSURE_SCHEMA_VERSION,
  type MaintenanceLaborPressureV1
} from "../src/sim/domains/court/maintenance";
import {
  buildEconomyMaintenanceRegistry,
  ECONOMY_MAINTENANCE_REGISTRY_SCHEMA_VERSION,
  type EconomyMaintenanceManorRowV1,
  type EconomyMaintenanceRegistryV1
} from "../src/sim/domains/economy/maintenance";
import type { TurnDecisions } from "../src/sim/types";
import { writeStableArtifact } from "./seed_replay/artifactWriter";

export const MAINTENANCE_PRESSURE_SCENARIO_PACK_KIND = "maintenance_pressure_scenarios_v1" as const;
export const MAINTENANCE_PRESSURE_SCENARIO_PACK_RELPATH =
  "qa_artifacts/economy_balance/v0.3.5/maintenance_pressure_scenarios.json" as const;

type MaintenancePressureScenarioId =
  | "rights_only_builder_capacity"
  | "full_holdings_builder_capacity"
  | "full_holdings_delegated_relief"
  | "full_holdings_low_capacity_overflow";

type MaintenancePressureScenarioInput = {
  delegation_multiplier_pct?: number;
  id: MaintenancePressureScenarioId;
  improvements: string[];
  planned_builders: number;
  planned_farmers: number;
  planned_population: number;
  seed: string;
  title: string;
};

type MaintenancePressureScenarioPackV1 = {
  kind: typeof MAINTENANCE_PRESSURE_SCENARIO_PACK_KIND;
  qa_flow: {
    commands: string[];
    note: string;
  };
  release: "v0.3.5";
  scenarios: MaintenancePressureScenarioRowV1[];
  source_contracts: {
    maintenance_labor_pressure_schema_version: typeof MAINTENANCE_LABOR_PRESSURE_SCHEMA_VERSION;
    maintenance_registry_schema_version: typeof ECONOMY_MAINTENANCE_REGISTRY_SCHEMA_VERSION;
  };
};

type MaintenancePressureScenarioRowV1 = {
  control_preview: {
    construction_progress_added: number;
    production_bushels: number;
  };
  delegation_multiplier_pct: number;
  deltas_vs_control: {
    construction_progress_added: number;
    production_bushels: number;
  };
  planned_labor: {
    builders: number;
    farmers: number;
    population: number;
  };
  pressure: Pick<
    MaintenanceLaborPressureV1,
    | "allocatable_after"
    | "allocatable_before"
    | "applied_drag"
    | "delegated"
    | "delegated_multiplier_pct"
    | "effective_builders"
    | "effective_farmers"
    | "ordering_rule"
    | "required_labor_after_delegation"
    | "required_labor_before_delegation"
    | "schema_version"
    | "source_keys"
    | "total_sources"
    | "unmet_labor"
  >;
  preview: {
    construction_progress_added: number;
    maintenance_note_lines: string[];
    maintenance_receipt_lines: string[];
    production_bushels: number;
  };
  registry: {
    building_count: number;
    coin_cost: number;
    entry_count: number;
    entry_ids: string[];
    labor_required: number;
    manor_key: string;
    right_count: number;
  };
  resolved: {
    maintenance_note_lines: string[];
    maintenance_receipt_lines: string[];
    turn_index: number;
  };
  scenario_id: MaintenancePressureScenarioId;
  seed: string;
  state_improvements: string[];
  title: string;
};

const SCENARIOS: readonly MaintenancePressureScenarioInput[] = [
  {
    id: "rights_only_builder_capacity",
    title: "Rights-only maintenance pressure",
    seed: "v035_maintenance_rights_only",
    improvements: [],
    planned_population: 20,
    planned_farmers: 14,
    planned_builders: 6
  },
  {
    id: "full_holdings_builder_capacity",
    title: "Full holdings maintenance pressure",
    seed: "v035_maintenance_full_holdings",
    improvements: ["granary_upgrade", "watch_ward"],
    planned_population: 20,
    planned_farmers: 14,
    planned_builders: 6
  },
  {
    id: "full_holdings_delegated_relief",
    title: "Delegated maintenance relief",
    seed: "v035_maintenance_full_holdings_delegated",
    improvements: ["granary_upgrade", "watch_ward"],
    planned_population: 20,
    planned_farmers: 14,
    planned_builders: 6,
    delegation_multiplier_pct: 40
  },
  {
    id: "full_holdings_low_capacity_overflow",
    title: "Low-capacity maintenance overflow",
    seed: "v035_maintenance_low_capacity",
    improvements: ["granary_upgrade", "watch_ward"],
    planned_population: 12,
    planned_farmers: 4,
    planned_builders: 1
  }
] as const;

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeInteger(value: unknown): number {
  const numeric = Math.trunc(Number(value ?? 0));
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function noOpDecisions(state: ReturnType<typeof createNewRun>): TurnDecisions {
  return {
    labor: { kind: "labor", desired_farmers: state.manor.farmers, desired_builders: state.manor.builders },
    sell: { kind: "sell", sell_bushels: 0 },
    obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
    construction: { kind: "construction", action: "none" },
    marriage: { kind: "marriage", action: "none" },
    prospects: { kind: "prospects", actions: [] }
  };
}

function baseScenarioState(input: MaintenancePressureScenarioInput) {
  const state = createNewRun(input.seed);
  state.manor.population = input.planned_population;
  state.manor.farmers = input.planned_farmers;
  state.manor.builders = input.planned_builders;
  state.manor.improvements = [...input.improvements].sort(compareText);
  state.manor.construction = {
    improvement_id: "drainage_ditches",
    progress: 20,
    required: 60
  };
  return state;
}

function manorRowOrThrow(registry: EconomyMaintenanceRegistryV1): EconomyMaintenanceManorRowV1 {
  const manorKey = registry.manor_keys[0];
  if (!manorKey) throw new Error("Maintenance registry did not produce a manor key.");
  const row = registry.manor_rows_by_key[manorKey];
  if (!row) throw new Error(`Maintenance registry did not produce row ${manorKey}.`);
  return row;
}

function attachHelperRegistryFromMaintenanceRow(state: any, row: EconomyMaintenanceManorRowV1): void {
  state.economy = {
    ...(state.economy ?? {}),
    maintenance_registry_v1: {
      schema_version: "maintenance_registry_v1",
      entries: row.entry_order.map((entryId) => {
        const entry = row.entries_by_id[entryId]!;
        return {
          maintenance_key: entry.entry_id,
          label: entry.source_label,
          source_kind: entry.entry_kind,
          labor_required: entry.labor_required
        };
      })
    }
  };
}

function attachDelegationIfNeeded(state: any, multiplierPct: number | undefined): void {
  if (multiplierPct == null) return;
  state.house = {
    ...state.house,
    court_delegation_registry: buildCourtDelegationRegistry([
      {
        action: "maintenance",
        delegated: true,
        effect: {
          amount_multiplier_pct: multiplierPct
        }
      }
    ])
  };
}

function maintenanceReceiptLinesFromNotes(noteLines: readonly string[], receiptLines: readonly string[]): string[] {
  return receiptLines.filter((line) => noteLines.includes(line));
}

function maintenanceNotesOnly(allNotes: readonly string[], maintenanceLines: readonly string[]): string[] {
  return allNotes.filter((line) => maintenanceLines.includes(line));
}

function evaluateScenario(input: MaintenancePressureScenarioInput): MaintenancePressureScenarioRowV1 {
  const controlState = baseScenarioState(input);
  const scenarioState = baseScenarioState(input);
  const registry = buildEconomyMaintenanceRegistry(scenarioState);
  const row = manorRowOrThrow(registry);
  attachHelperRegistryFromMaintenanceRow(scenarioState as any, row);
  attachDelegationIfNeeded(scenarioState as any, input.delegation_multiplier_pct);

  const pressure = buildMaintenanceLaborPressure(scenarioState);
  if (!pressure) throw new Error(`Scenario ${input.id} did not produce maintenance labor pressure.`);

  const controlPreview = proposeTurn(controlState);
  const preview = proposeTurn(scenarioState);
  const previewConsumptionLines =
    preview.report.phase_results_v0?.find((phase) => phase.phase === "consumption")?.receipts.map((receipt) => receipt.line) ?? [];
  const previewMaintenanceLines = maintenanceLaborPressureSummaryLines(pressure);
  const resolved = applyDecisions(scenarioState, noOpDecisions(scenarioState));
  const latest = resolved.log.at(-1);
  const resolvedConsumptionLines =
    latest?.report.phase_results_v0?.find((phase) => phase.phase === "consumption")?.receipts.map((receipt) => receipt.line) ?? [];

  return {
    scenario_id: input.id,
    title: input.title,
    seed: input.seed,
    delegation_multiplier_pct: input.delegation_multiplier_pct ?? 100,
    state_improvements: [...scenarioState.manor.improvements],
    planned_labor: {
      population: input.planned_population,
      farmers: input.planned_farmers,
      builders: input.planned_builders
    },
    registry: {
      manor_key: row.manor_key,
      entry_ids: [...row.entry_order],
      entry_count: normalizeInteger(row.totals.entry_count),
      building_count: normalizeInteger(row.totals.building_count),
      right_count: normalizeInteger(row.totals.right_count),
      coin_cost: normalizeInteger(row.totals.coin_cost),
      labor_required: normalizeInteger(row.totals.labor_required)
    },
    pressure: {
      schema_version: pressure.schema_version,
      ordering_rule: pressure.ordering_rule,
      delegated: pressure.delegated,
      delegated_multiplier_pct: pressure.delegated_multiplier_pct,
      source_keys: [...pressure.source_keys],
      total_sources: pressure.total_sources,
      allocatable_before: pressure.allocatable_before,
      required_labor_before_delegation: pressure.required_labor_before_delegation,
      required_labor_after_delegation: pressure.required_labor_after_delegation,
      applied_drag: pressure.applied_drag,
      unmet_labor: pressure.unmet_labor,
      allocatable_after: pressure.allocatable_after,
      effective_farmers: pressure.effective_farmers,
      effective_builders: pressure.effective_builders
    },
    control_preview: {
      production_bushels: normalizeInteger(controlPreview.report.production_bushels),
      construction_progress_added: normalizeInteger(controlPreview.report.construction.progress_added)
    },
    preview: {
      production_bushels: normalizeInteger(preview.report.production_bushels),
      construction_progress_added: normalizeInteger(preview.report.construction.progress_added),
      maintenance_note_lines: maintenanceNotesOnly(preview.report.notes, previewMaintenanceLines),
      maintenance_receipt_lines: maintenanceReceiptLinesFromNotes(previewMaintenanceLines, previewConsumptionLines)
    },
    deltas_vs_control: {
      production_bushels: normalizeInteger(preview.report.production_bushels) - normalizeInteger(controlPreview.report.production_bushels),
      construction_progress_added:
        normalizeInteger(preview.report.construction.progress_added) -
        normalizeInteger(controlPreview.report.construction.progress_added)
    },
    resolved: {
      turn_index: normalizeInteger(resolved.turn_index),
      maintenance_note_lines: maintenanceNotesOnly(latest?.report.notes ?? [], previewMaintenanceLines),
      maintenance_receipt_lines: maintenanceReceiptLinesFromNotes(
        previewMaintenanceLines,
        resolvedConsumptionLines
      )
    }
  };
}

export function buildMaintenancePressureScenarioPack(): MaintenancePressureScenarioPackV1 {
  return {
    kind: MAINTENANCE_PRESSURE_SCENARIO_PACK_KIND,
    release: "v0.3.5",
    source_contracts: {
      maintenance_labor_pressure_schema_version: MAINTENANCE_LABOR_PRESSURE_SCHEMA_VERSION,
      maintenance_registry_schema_version: ECONOMY_MAINTENANCE_REGISTRY_SCHEMA_VERSION
    },
    qa_flow: {
      commands: [
        "node node_modules/tsx/dist/cli.mjs scripts/maintenancePressureScenarios.ts",
        "npx vitest run tests/sim/maintenance_pressure_scenarios.test.ts tests/sim/maintenance_labor_helper.test.ts tests/sim/maintenance_labor_wiring.test.ts"
      ],
      note:
        "Use this pack as the deterministic maintenance-pressure comparison surface until later KPI bands and runaway detectors attach numeric thresholds."
    },
    scenarios: SCENARIOS.map((scenario) => evaluateScenario(scenario))
  };
}

export function writeMaintenancePressureScenarioPack() {
  return writeStableArtifact(path.resolve(MAINTENANCE_PRESSURE_SCENARIO_PACK_RELPATH), buildMaintenancePressureScenarioPack());
}

async function main() {
  const artifact = writeMaintenancePressureScenarioPack();
  console.log("maintenance pressure scenarios: PASS");
  console.log(`artifact=${MAINTENANCE_PRESSURE_SCENARIO_PACK_RELPATH}`);
  console.log(`kind=${MAINTENANCE_PRESSURE_SCENARIO_PACK_KIND}`);
  console.log(`hash=${artifact.hash}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
