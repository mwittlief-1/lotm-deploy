import type { PhaseNameV0, RunState } from "../../types";
import { asNonNegInt } from "../../util";
import { spendCoin } from "../economy/ledger";
import { resolveCourtDelegationEntry, resolveDelegatedAmount } from "./delegationRegistry";

export const COURT_MAINTENANCE_SCAFFOLD_SCHEMA_VERSION = "court_maintenance_scaffold_v0" as const;
export const MAINTENANCE_LABOR_PRESSURE_SCHEMA_VERSION = "maintenance_labor_pressure_v1" as const;

export interface MaintenanceLaborPressureEntryV1 {
  maintenance_key: string;
  label: string;
  source_kind: string;
  labor_required: number;
}

export interface MaintenanceLaborPressureV1 {
  schema_version: typeof MAINTENANCE_LABOR_PRESSURE_SCHEMA_VERSION;
  ordering_rule: "builders_first";
  delegated: boolean;
  delegated_multiplier_pct: number;
  source_keys: string[];
  total_sources: number;
  planned_population: number;
  planned_farmers: number;
  planned_builders: number;
  allocatable_before: number;
  required_labor_before_delegation: number;
  required_labor_after_delegation: number;
  applied_drag: number;
  unmet_labor: number;
  allocatable_after: number;
  effective_farmers: number;
  effective_builders: number;
  entries: MaintenanceLaborPressureEntryV1[];
}

export interface CourtMaintenanceScaffoldV0 {
  schema_version: typeof COURT_MAINTENANCE_SCAFFOLD_SCHEMA_VERSION;
  scaffold_id: string;
  phase: PhaseNameV0;
  phase_sequence: number;
  category: "expense.maintenance";
  counterparty_kind: "self";
  counterparty_id: string;
  counterparty_label: string;
  summary_label: string;
  amount: number;
  delegated: boolean;
  rule_id: string;
  related_actor_ids: string[];
}

export interface CourtMaintenanceScaffoldInputV0 {
  scaffold_id?: string;
  phase: PhaseNameV0;
  phase_sequence: number;
  amount: number;
  rule_id: string;
  related_actor_ids?: readonly string[];
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function canonicalRelatedActorIds(ids: readonly string[]): string[] {
  return [...ids].sort(compareText);
}

function normalizeInteger(value: number): number {
  return Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMaintenanceSourceKind(value: unknown): string {
  return normalizeText(value) || "custom";
}

function normalizedMaintenanceScaffoldId(input: CourtMaintenanceScaffoldInputV0): string {
  if (input.scaffold_id) return input.scaffold_id;
  return ["maintenance", input.phase, `p${normalizeInteger(input.phase_sequence)}`, input.rule_id].join(":");
}

export function makeCourtMaintenanceScaffold(
  state: RunState,
  input: CourtMaintenanceScaffoldInputV0
): CourtMaintenanceScaffoldV0 {
  const entry = resolveCourtDelegationEntry(state, "maintenance");
  const baseAmount = normalizeInteger(input.amount);

  return {
    schema_version: COURT_MAINTENANCE_SCAFFOLD_SCHEMA_VERSION,
    scaffold_id: normalizedMaintenanceScaffoldId(input),
    phase: input.phase,
    phase_sequence: normalizeInteger(input.phase_sequence),
    category: "expense.maintenance",
    counterparty_kind: "self",
    counterparty_id: "manor:maintenance",
    counterparty_label: entry.summary_label,
    summary_label: entry.summary_label,
    amount: entry.delegated ? resolveDelegatedAmount(baseAmount, entry) : baseAmount,
    delegated: entry.delegated,
    rule_id: input.rule_id,
    related_actor_ids: canonicalRelatedActorIds(input.related_actor_ids ?? []),
  };
}

export function applyCourtMaintenanceScaffold(
  state: RunState,
  scaffold: CourtMaintenanceScaffoldV0
): number {
  if (scaffold.amount <= 0) return 0;

  return spendCoin(state, scaffold.amount, {
    phase: scaffold.phase,
    phase_sequence: scaffold.phase_sequence,
    category: scaffold.category,
    counterparty_kind: scaffold.counterparty_kind,
    counterparty_id: scaffold.counterparty_id,
    counterparty_label: scaffold.counterparty_label,
    summary: `${scaffold.summary_label} paid ${scaffold.amount} coin for manor upkeep.`,
    rule_id: scaffold.rule_id,
    related_actor_ids: scaffold.related_actor_ids,
  });
}

type MaintenanceRegistryLike = {
  schema_version?: unknown;
  entries?: unknown;
};

function isMaintenanceRegistryLike(value: unknown): value is MaintenanceRegistryLike {
  if (!value || typeof value !== "object") return false;
  const candidate = value as MaintenanceRegistryLike;
  if (!Array.isArray(candidate.entries)) return false;
  return candidate.schema_version == null || candidate.schema_version === "maintenance_registry_v1";
}

function normalizeMaintenanceLaborEntry(raw: unknown, index: number): MaintenanceLaborPressureEntryV1 | null {
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as Record<string, unknown>;
  const laborRequired = normalizeInteger(
    Number(candidate.labor_required ?? candidate.required_labor ?? candidate.labor_drag ?? 0)
  );
  const active = candidate.active !== false && candidate.enabled !== false && candidate.status !== "inactive";
  if (!active || laborRequired <= 0) return null;

  const maintenanceKey =
    normalizeText(candidate.maintenance_key ?? candidate.key ?? candidate.entry_key) || `maintenance_entry_${index + 1}`;
  const label =
    normalizeText(candidate.label ?? candidate.summary_label ?? candidate.name ?? candidate.title) || maintenanceKey;

  return {
    maintenance_key: maintenanceKey,
    label,
    source_kind: normalizeMaintenanceSourceKind(candidate.source_kind ?? candidate.kind),
    labor_required: laborRequired,
  };
}

function compareMaintenanceLaborEntries(
  left: MaintenanceLaborPressureEntryV1,
  right: MaintenanceLaborPressureEntryV1
): number {
  const kindCmp = compareText(left.source_kind, right.source_kind);
  if (kindCmp !== 0) return kindCmp;
  const keyCmp = compareText(left.maintenance_key, right.maintenance_key);
  if (keyCmp !== 0) return keyCmp;
  const labelCmp = compareText(left.label, right.label);
  if (labelCmp !== 0) return labelCmp;
  return left.labor_required - right.labor_required;
}

function maintenanceRegistryEntries(state: RunState): MaintenanceLaborPressureEntryV1[] {
  const candidates: unknown[] = [
    (state as any)?.economy?.maintenance_registry_v1,
    (state.manor as any)?.maintenance_registry_v1,
    (state as any)?.maintenance_registry_v1,
  ];

  for (const candidate of candidates) {
    if (!isMaintenanceRegistryLike(candidate)) continue;
    const entries = candidate.entries
      .map((entry, index) => normalizeMaintenanceLaborEntry(entry, index))
      .filter((entry): entry is MaintenanceLaborPressureEntryV1 => entry !== null)
      .sort(compareMaintenanceLaborEntries);
    if (entries.length > 0) return entries;
  }

  return [];
}

export function buildMaintenanceLaborPressure(state: RunState): MaintenanceLaborPressureV1 | null {
  const entries = maintenanceRegistryEntries(state);
  if (entries.length === 0) return null;

  const plannedPopulation = asNonNegInt(state.manor.population);
  const plannedFarmers = asNonNegInt(state.manor.farmers);
  const plannedBuilders = asNonNegInt(state.manor.builders);
  const allocatableBefore = plannedFarmers + plannedBuilders;
  const requiredLaborBeforeDelegation = entries.reduce((sum, entry) => sum + entry.labor_required, 0);
  const delegationEntry = resolveCourtDelegationEntry(state, "maintenance");
  const delegated = delegationEntry.delegated;
  const delegatedMultiplierPct = delegated ? asNonNegInt(delegationEntry.effect.amount_multiplier_pct) : 100;
  const requiredLaborAfterDelegation = delegated
    ? resolveDelegatedAmount(requiredLaborBeforeDelegation, delegationEntry)
    : requiredLaborBeforeDelegation;
  const appliedDrag = Math.min(allocatableBefore, requiredLaborAfterDelegation);
  const builderDrag = Math.min(plannedBuilders, appliedDrag);
  const farmerDrag = Math.min(plannedFarmers, Math.max(0, appliedDrag - builderDrag));
  const effectiveBuilders = Math.max(0, plannedBuilders - builderDrag);
  const effectiveFarmers = Math.max(0, plannedFarmers - farmerDrag);

  return {
    schema_version: MAINTENANCE_LABOR_PRESSURE_SCHEMA_VERSION,
    ordering_rule: "builders_first",
    delegated,
    delegated_multiplier_pct: delegatedMultiplierPct,
    source_keys: entries.map((entry) => entry.maintenance_key),
    total_sources: entries.length,
    planned_population: plannedPopulation,
    planned_farmers: plannedFarmers,
    planned_builders: plannedBuilders,
    allocatable_before: allocatableBefore,
    required_labor_before_delegation: requiredLaborBeforeDelegation,
    required_labor_after_delegation: requiredLaborAfterDelegation,
    applied_drag: appliedDrag,
    unmet_labor: Math.max(0, requiredLaborAfterDelegation - appliedDrag),
    allocatable_after: effectiveFarmers + effectiveBuilders,
    effective_farmers: effectiveFarmers,
    effective_builders: effectiveBuilders,
    entries,
  };
}

export function maintenanceLaborPressureSummaryLines(pressure: MaintenanceLaborPressureV1): string[] {
  const sourceLabel = `${pressure.total_sources} source${pressure.total_sources === 1 ? "" : "s"}`;
  const lines = [
    `Maintenance required ${pressure.required_labor_after_delegation} labor across ${sourceLabel}; reserved ${pressure.applied_drag} before harvest/build output.`,
    `Planned farmers ${pressure.planned_farmers}, builders ${pressure.planned_builders}; effective farmers ${pressure.effective_farmers}, builders ${pressure.effective_builders}.`,
  ];

  if (pressure.required_labor_before_delegation !== pressure.required_labor_after_delegation) {
    lines.unshift(
      `Delegated maintenance scaled labor from ${pressure.required_labor_before_delegation} to ${pressure.required_labor_after_delegation} (${pressure.delegated_multiplier_pct}%).`
    );
  }
  if (pressure.unmet_labor > 0) {
    lines.push(`Maintenance demand exceeded allocatable labor by ${pressure.unmet_labor}.`);
  }

  return lines;
}
