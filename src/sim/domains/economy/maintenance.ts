import { IMPROVEMENTS } from "../../../content/improvements";
import type { PhaseNameV0, RunState } from "../../types";
import type { FiscalReceiptSnapshotV1 } from "./receipts";
import { readLedgerReceiptSnapshots, spendCoin } from "./ledger";
import {
  DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID,
  buildEconomyPortfolioScope,
  makeEconomyPortfolioManorKey,
  type EconomyPortfolioScopeV1
} from "./portfolioRegistry";
import { buildBoundedWorldTopologyView, getManorAssignment, loadBundledWorldDomain, type WorldDomainV1 } from "../world";

export const ECONOMY_MAINTENANCE_PROFILE_SCHEMA_VERSION = "economy_maintenance_profile_v1" as const;
export const ECONOMY_MAINTENANCE_REGISTRY_SCHEMA_VERSION = "economy_maintenance_registry_v1" as const;
export const ECONOMY_MAINTENANCE_MANOR_ROW_SCHEMA_VERSION = "economy_maintenance_manor_row_v1" as const;
export const ECONOMY_MAINTENANCE_ENTRY_SCHEMA_VERSION = "economy_maintenance_entry_v1" as const;
export const ECONOMY_MAINTENANCE_PROJECT_SCHEMA_VERSION = "economy_maintenance_project_v1" as const;
export const ECONOMY_IMPROVEMENT_PREVIEW_SCHEMA_VERSION = "economy_improvement_preview_v1" as const;
export const ECONOMY_MAINTENANCE_VIEW_SCHEMA_VERSION = "economy_maintenance_view_v1" as const;
export const ECONOMY_MAINTENANCE_MANOR_SUMMARY_SCHEMA_VERSION = "economy_maintenance_manor_summary_v1" as const;
export const ECONOMY_MAINTENANCE_SUMMARY_ENTRY_SCHEMA_VERSION = "economy_maintenance_summary_entry_v1" as const;
export const ECONOMY_MAINTENANCE_APPLY_RESULT_SCHEMA_VERSION = "economy_maintenance_apply_result_v1" as const;

export const ECONOMY_MAINTENANCE_ENTRY_KINDS = [
  "building",
  "franchise_right",
  "service_right"
] as const;

export const ECONOMY_MAINTENANCE_RECEIPT_CATEGORIES = [
  "expense.maintenance",
  "expense.project_capex",
  "expense.household_admin"
] as const;

const MAINTENANCE_PROFILE = {
  schema_version: ECONOMY_MAINTENANCE_PROFILE_SCHEMA_VERSION,
  building_coin_divisor: 5,
  building_labor_divisor: 40,
  franchise_right_coin_cost: 1,
  franchise_right_labor_required: 1,
  service_right_coin_cost: 0,
  service_right_labor_required: 1
} as const;

const FRANCHISE_RIGHT_LABELS: Record<string, string> = {
  bridge_or_crossing_revenue: "Bridge & crossing revenue",
  fair_right: "Fair right",
  market_right: "Market right",
  toll_right: "Toll right"
};

const SERVICE_RIGHT_LABELS: Record<string, string> = {
  court_attendance: "Court attendance",
  servitium_regis: "Servitium regis",
  temporal_service: "Temporal service"
};

export type EconomyMaintenanceEntryKindV1 = typeof ECONOMY_MAINTENANCE_ENTRY_KINDS[number];

export interface EconomyMaintenanceProfileV1 {
  schema_version: typeof ECONOMY_MAINTENANCE_PROFILE_SCHEMA_VERSION;
  building_coin_divisor: number;
  building_labor_divisor: number;
  franchise_right_coin_cost: number;
  franchise_right_labor_required: number;
  service_right_coin_cost: number;
  service_right_labor_required: number;
}

export interface EconomyMaintenanceTotalsV1 {
  coin_cost: number;
  labor_required: number;
  building_coin_cost: number;
  building_labor_required: number;
  franchise_right_coin_cost: number;
  franchise_right_labor_required: number;
  service_right_coin_cost: number;
  service_right_labor_required: number;
  building_count: number;
  right_count: number;
  entry_count: number;
}

export interface EconomyMaintenanceEntryV1 {
  schema_version: typeof ECONOMY_MAINTENANCE_ENTRY_SCHEMA_VERSION;
  entry_id: string;
  manor_id: string;
  manor_key: string;
  entry_kind: EconomyMaintenanceEntryKindV1;
  source_id: string;
  source_label: string;
  source_state: string;
  category: "expense.maintenance";
  coin_cost: number;
  labor_required: number;
  counterparty_id: string;
  counterparty_label: string;
  rule_id: string;
  runtime_source_paths: string[];
  tuning_refs: string[];
}

export interface EconomyMaintenanceProjectV1 {
  schema_version: typeof ECONOMY_MAINTENANCE_PROJECT_SCHEMA_VERSION;
  improvement_id: string;
  improvement_label: string;
  progress: number;
  required: number;
  remaining: number;
}

export interface EconomyImprovementPreviewV1 {
  schema_version: typeof ECONOMY_IMPROVEMENT_PREVIEW_SCHEMA_VERSION;
  improvement_id: string;
  improvement_label: string;
  upfront_coin_cost: number;
  upfront_energy_cost: number;
  required_builder_progress: number;
  expected_benefit_summary: string;
  recurring_maintenance_coin_cost: number;
  recurring_maintenance_labor_required: number;
  upfront_summary: string;
  recurring_maintenance_summary: string;
}

export interface EconomyMaintenanceManorRowV1 {
  schema_version: typeof ECONOMY_MAINTENANCE_MANOR_ROW_SCHEMA_VERSION;
  manor_id: string;
  manor_key: string;
  entry_order: string[];
  entries_by_id: Record<string, EconomyMaintenanceEntryV1>;
  totals: EconomyMaintenanceTotalsV1;
  active_project: EconomyMaintenanceProjectV1 | null;
}

export interface EconomyMaintenanceRegistryV1 {
  schema_version: typeof ECONOMY_MAINTENANCE_REGISTRY_SCHEMA_VERSION;
  scope: EconomyPortfolioScopeV1;
  profile: EconomyMaintenanceProfileV1;
  receipt_categories: string[];
  manor_keys: string[];
  manor_rows_by_key: Record<string, EconomyMaintenanceManorRowV1>;
}

export interface EconomyMaintenanceSummaryEntryV1 {
  schema_version: typeof ECONOMY_MAINTENANCE_SUMMARY_ENTRY_SCHEMA_VERSION;
  entry_id: string;
  entry_kind: EconomyMaintenanceEntryKindV1;
  source_id: string;
  source_label: string;
  source_state: string;
  coin_cost: number;
  labor_required: number;
  category: "expense.maintenance";
  counterparty_id: string;
  counterparty_label: string;
  rule_id: string;
}

export interface EconomyMaintenanceManorSummaryV1 {
  schema_version: typeof ECONOMY_MAINTENANCE_MANOR_SUMMARY_SCHEMA_VERSION;
  manor_id: string;
  manor_key: string;
  building_entries: EconomyMaintenanceSummaryEntryV1[];
  right_entries: EconomyMaintenanceSummaryEntryV1[];
  active_project: EconomyMaintenanceProjectV1 | null;
  totals: EconomyMaintenanceTotalsV1;
}

export interface EconomyMaintenanceViewV1 {
  schema_version: typeof ECONOMY_MAINTENANCE_VIEW_SCHEMA_VERSION;
  scope: EconomyPortfolioScopeV1;
  manor_keys: string[];
  manor_summaries_by_key: Record<string, EconomyMaintenanceManorSummaryV1>;
}

export interface EconomyMaintenanceApplyInputV1 {
  phase: PhaseNameV0;
  phase_sequence: number;
  registry?: EconomyMaintenanceRegistryV1;
  manor_key?: string;
  related_actor_ids?: readonly string[];
}

export interface EconomyMaintenanceApplyEntryResultV1 {
  entry_id: string;
  requested_coin_cost: number;
  paid_coin_cost: number;
  shortfall_coin_cost: number;
  counterparty_id: string;
  counterparty_label: string;
  rule_id: string;
}

export interface EconomyMaintenanceApplyResultV1 {
  schema_version: typeof ECONOMY_MAINTENANCE_APPLY_RESULT_SCHEMA_VERSION;
  manor_id: string;
  manor_key: string;
  applied_entry_order: string[];
  applied_entries_by_id: Record<string, EconomyMaintenanceApplyEntryResultV1>;
  total_requested_coin_cost: number;
  total_paid_coin_cost: number;
  total_shortfall_coin_cost: number;
  receipt_snapshots: FiscalReceiptSnapshotV1[];
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeInteger(value: number): number {
  return Math.max(0, Math.trunc(value));
}

function ceilDiv(value: number, divisor: number): number {
  if (divisor <= 0) return normalizeInteger(value);
  const normalized = normalizeInteger(value);
  if (normalized <= 0) return 0;
  return Math.ceil(normalized / divisor);
}

function buildOrderedRecord<K extends string, V>(keys: readonly K[], valueFor: (key: K) => V): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, valueFor(key)])) as Record<K, V>;
}

function titleFromToken(value: string): string {
  return value
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function anchorManorId(domain: WorldDomainV1): string {
  return buildBoundedWorldTopologyView(domain).anchor_manor_id;
}

function maintenanceManorKey(manorId: string): string {
  return makeEconomyPortfolioManorKey(buildEconomyPortfolioScope(DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID).scope_key, manorId);
}

function maintenanceProfileSnapshot(): EconomyMaintenanceProfileV1 {
  return {
    schema_version: MAINTENANCE_PROFILE.schema_version,
    building_coin_divisor: MAINTENANCE_PROFILE.building_coin_divisor,
    building_labor_divisor: MAINTENANCE_PROFILE.building_labor_divisor,
    franchise_right_coin_cost: MAINTENANCE_PROFILE.franchise_right_coin_cost,
    franchise_right_labor_required: MAINTENANCE_PROFILE.franchise_right_labor_required,
    service_right_coin_cost: MAINTENANCE_PROFILE.service_right_coin_cost,
    service_right_labor_required: MAINTENANCE_PROFILE.service_right_labor_required
  };
}

function emptyTotals(): EconomyMaintenanceTotalsV1 {
  return {
    coin_cost: 0,
    labor_required: 0,
    building_coin_cost: 0,
    building_labor_required: 0,
    franchise_right_coin_cost: 0,
    franchise_right_labor_required: 0,
    service_right_coin_cost: 0,
    service_right_labor_required: 0,
    building_count: 0,
    right_count: 0,
    entry_count: 0
  };
}

function cloneTotals(totals: EconomyMaintenanceTotalsV1): EconomyMaintenanceTotalsV1 {
  return {
    coin_cost: normalizeInteger(totals.coin_cost),
    labor_required: normalizeInteger(totals.labor_required),
    building_coin_cost: normalizeInteger(totals.building_coin_cost),
    building_labor_required: normalizeInteger(totals.building_labor_required),
    franchise_right_coin_cost: normalizeInteger(totals.franchise_right_coin_cost),
    franchise_right_labor_required: normalizeInteger(totals.franchise_right_labor_required),
    service_right_coin_cost: normalizeInteger(totals.service_right_coin_cost),
    service_right_labor_required: normalizeInteger(totals.service_right_labor_required),
    building_count: normalizeInteger(totals.building_count),
    right_count: normalizeInteger(totals.right_count),
    entry_count: normalizeInteger(totals.entry_count)
  };
}

function summarizeEntry(entry: EconomyMaintenanceEntryV1): EconomyMaintenanceSummaryEntryV1 {
  return {
    schema_version: ECONOMY_MAINTENANCE_SUMMARY_ENTRY_SCHEMA_VERSION,
    entry_id: entry.entry_id,
    entry_kind: entry.entry_kind,
    source_id: entry.source_id,
    source_label: entry.source_label,
    source_state: entry.source_state,
    coin_cost: normalizeInteger(entry.coin_cost),
    labor_required: normalizeInteger(entry.labor_required),
    category: entry.category,
    counterparty_id: entry.counterparty_id,
    counterparty_label: entry.counterparty_label,
    rule_id: entry.rule_id
  };
}

function activeProjectSnapshot(state: RunState): EconomyMaintenanceProjectV1 | null {
  const project = state.manor.construction;
  if (!project) return null;

  const improvementId = typeof project.improvement_id === "string" && project.improvement_id.length > 0
    ? project.improvement_id
    : "unknown_project";
  const label = IMPROVEMENTS[improvementId]?.name ?? titleFromToken(improvementId);
  const progress = normalizeInteger(project.progress);
  const required = Math.max(1, normalizeInteger(project.required));

  return {
    schema_version: ECONOMY_MAINTENANCE_PROJECT_SCHEMA_VERSION,
    improvement_id: improvementId,
    improvement_label: label,
    progress,
    required,
    remaining: Math.max(0, required - progress)
  };
}

function buildingEntry(manorId: string, manorKey: string, improvementId: string): EconomyMaintenanceEntryV1 {
  const definition = IMPROVEMENTS[improvementId];
  const label = definition?.name ?? titleFromToken(improvementId);

  return {
    schema_version: ECONOMY_MAINTENANCE_ENTRY_SCHEMA_VERSION,
    entry_id: `maintenance:building:${improvementId}`,
    manor_id: manorId,
    manor_key: manorKey,
    entry_kind: "building",
    source_id: improvementId,
    source_label: label,
    source_state: "built",
    category: "expense.maintenance",
    coin_cost: definition ? ceilDiv(definition.coin_cost, MAINTENANCE_PROFILE.building_coin_divisor) : 1,
    labor_required: definition ? ceilDiv(definition.required, MAINTENANCE_PROFILE.building_labor_divisor) : 1,
    counterparty_id: `maintenance:building:${improvementId}`,
    counterparty_label: label,
    rule_id: `maintenance.building.${improvementId}`,
    runtime_source_paths: ["manor.improvements"],
    tuning_refs: definition
      ? [
          `content.improvements.${improvementId}.coin_cost`,
          `content.improvements.${improvementId}.required`,
          "maintenance_profile.building_coin_divisor",
          "maintenance_profile.building_labor_divisor"
        ]
      : ["manor.improvements", "maintenance_profile.fallback_building"]
  };
}

export function buildEconomyImprovementPreview(
  improvementId: string
): EconomyImprovementPreviewV1 | null {
  const definition = IMPROVEMENTS[improvementId];
  if (!definition) return null;

  const recurringCoinCost = ceilDiv(definition.coin_cost, MAINTENANCE_PROFILE.building_coin_divisor);
  const recurringLaborRequired = ceilDiv(definition.required, MAINTENANCE_PROFILE.building_labor_divisor);
  const benefitSummary = definition.description.trim().length > 0
    ? definition.description.trim()
    : `${definition.name} changes manor conditions when completed.`;

  return {
    schema_version: ECONOMY_IMPROVEMENT_PREVIEW_SCHEMA_VERSION,
    improvement_id: definition.id,
    improvement_label: definition.name,
    upfront_coin_cost: normalizeInteger(definition.coin_cost),
    upfront_energy_cost: normalizeInteger(definition.energy_cost),
    required_builder_progress: Math.max(1, normalizeInteger(definition.required)),
    expected_benefit_summary: benefitSummary,
    recurring_maintenance_coin_cost: recurringCoinCost,
    recurring_maintenance_labor_required: recurringLaborRequired,
    upfront_summary: `Upfront cost ${normalizeInteger(definition.coin_cost)} coin and ${normalizeInteger(definition.energy_cost)} energy. Build effort ${Math.max(1, normalizeInteger(definition.required))} progress.`,
    recurring_maintenance_summary: `Recurring upkeep after completion: ${recurringCoinCost} coin and ${recurringLaborRequired} labor.`
  };
}

export function buildEconomyImprovementPreviewCatalog(
  improvementIds: readonly string[]
): EconomyImprovementPreviewV1[] {
  return improvementIds
    .map((improvementId) => buildEconomyImprovementPreview(improvementId))
    .filter((preview): preview is EconomyImprovementPreviewV1 => preview !== null);
}

function franchiseRightEntry(
  manorId: string,
  manorKey: string,
  sourceId: string,
  sourceState: string
): EconomyMaintenanceEntryV1 {
  const label = FRANCHISE_RIGHT_LABELS[sourceId] ?? titleFromToken(sourceId);

  return {
    schema_version: ECONOMY_MAINTENANCE_ENTRY_SCHEMA_VERSION,
    entry_id: `maintenance:right:franchise:${sourceId}`,
    manor_id: manorId,
    manor_key: manorKey,
    entry_kind: "franchise_right",
    source_id: sourceId,
    source_label: label,
    source_state: sourceState,
    category: "expense.maintenance",
    coin_cost: MAINTENANCE_PROFILE.franchise_right_coin_cost,
    labor_required: MAINTENANCE_PROFILE.franchise_right_labor_required,
    counterparty_id: `maintenance:right:franchise:${sourceId}`,
    counterparty_label: label,
    rule_id: `maintenance.right.franchise.${sourceId}`,
    runtime_source_paths: ["world.manor_assignment.franchise_bundle"],
    tuning_refs: [
      `world.franchise_bundle.${sourceId}`,
      "maintenance_profile.franchise_right_coin_cost",
      "maintenance_profile.franchise_right_labor_required"
    ]
  };
}

function serviceRightEntry(
  manorId: string,
  manorKey: string,
  sourceId: string
): EconomyMaintenanceEntryV1 {
  const label = SERVICE_RIGHT_LABELS[sourceId] ?? titleFromToken(sourceId);

  return {
    schema_version: ECONOMY_MAINTENANCE_ENTRY_SCHEMA_VERSION,
    entry_id: `maintenance:right:service:${sourceId}`,
    manor_id: manorId,
    manor_key: manorKey,
    entry_kind: "service_right",
    source_id: sourceId,
    source_label: label,
    source_state: "active",
    category: "expense.maintenance",
    coin_cost: MAINTENANCE_PROFILE.service_right_coin_cost,
    labor_required: MAINTENANCE_PROFILE.service_right_labor_required,
    counterparty_id: `maintenance:right:service:${sourceId}`,
    counterparty_label: label,
    rule_id: `maintenance.right.service.${sourceId}`,
    runtime_source_paths: ["world.manor_assignment.service_basis"],
    tuning_refs: [
      `world.service_basis.${sourceId}`,
      "maintenance_profile.service_right_coin_cost",
      "maintenance_profile.service_right_labor_required"
    ]
  };
}

function sortEntries(entries: readonly EconomyMaintenanceEntryV1[]): EconomyMaintenanceEntryV1[] {
  const rank = {
    building: 0,
    franchise_right: 1,
    service_right: 2
  } as const satisfies Record<EconomyMaintenanceEntryKindV1, number>;

  return [...entries].sort((left, right) => {
    const rankDiff = rank[left.entry_kind] - rank[right.entry_kind];
    if (rankDiff !== 0) return rankDiff;
    if (left.source_label !== right.source_label) return compareText(left.source_label, right.source_label);
    return compareText(left.entry_id, right.entry_id);
  });
}

function accumulateTotals(totals: EconomyMaintenanceTotalsV1, entry: EconomyMaintenanceEntryV1): void {
  totals.coin_cost += entry.coin_cost;
  totals.labor_required += entry.labor_required;
  totals.entry_count += 1;

  if (entry.entry_kind === "building") {
    totals.building_coin_cost += entry.coin_cost;
    totals.building_labor_required += entry.labor_required;
    totals.building_count += 1;
    return;
  }

  totals.right_count += 1;
  if (entry.entry_kind === "franchise_right") {
    totals.franchise_right_coin_cost += entry.coin_cost;
    totals.franchise_right_labor_required += entry.labor_required;
    return;
  }

  totals.service_right_coin_cost += entry.coin_cost;
  totals.service_right_labor_required += entry.labor_required;
}

function entrySummary(entry: EconomyMaintenanceEntryV1): string {
  return `${entry.source_label} recurring upkeep charged.`;
}

function relatedActorIds(state: RunState, input: readonly string[]): string[] {
  const deduped = new Set<string>();
  deduped.add(state.house.head.id);
  for (const actorId of input) {
    if (typeof actorId !== "string" || actorId.length === 0) continue;
    deduped.add(actorId);
  }
  return [...deduped].sort(compareText);
}

export function buildEconomyMaintenanceRegistry(
  state: RunState,
  domain: WorldDomainV1 = loadBundledWorldDomain()
): EconomyMaintenanceRegistryV1 {
  const manorId = anchorManorId(domain);
  const manorKey = maintenanceManorKey(manorId);
  const assignment = getManorAssignment(domain, manorId);
  const entries: EconomyMaintenanceEntryV1[] = [];

  for (const improvementId of [...(state.manor.improvements ?? [])].sort(compareText)) {
    entries.push(buildingEntry(manorId, manorKey, improvementId));
  }

  if (assignment) {
    for (const sourceId of Object.keys(assignment.franchise_bundle ?? {}).sort(compareText)) {
      const rawState = assignment.franchise_bundle[sourceId];
      const sourceState = typeof rawState === "string" && rawState.trim().length > 0 ? rawState.trim() : "inactive";
      entries.push(franchiseRightEntry(manorId, manorKey, sourceId, sourceState));
    }

    for (const serviceBasisId of [...(assignment.service_basis ?? [])].sort(compareText)) {
      entries.push(serviceRightEntry(manorId, manorKey, serviceBasisId));
    }
  }

  const sortedEntries = sortEntries(entries);
  const totals = emptyTotals();
  for (const entry of sortedEntries) {
    accumulateTotals(totals, entry);
  }

  const manorRow: EconomyMaintenanceManorRowV1 = {
    schema_version: ECONOMY_MAINTENANCE_MANOR_ROW_SCHEMA_VERSION,
    manor_id: manorId,
    manor_key: manorKey,
    entry_order: sortedEntries.map((entry) => entry.entry_id),
    entries_by_id: Object.fromEntries(sortedEntries.map((entry) => [entry.entry_id, entry])),
    totals: cloneTotals(totals),
    active_project: activeProjectSnapshot(state)
  };

  const scope = buildEconomyPortfolioScope(DEFAULT_ECONOMY_PORTFOLIO_SCOPE_ID);

  return {
    schema_version: ECONOMY_MAINTENANCE_REGISTRY_SCHEMA_VERSION,
    scope,
    profile: maintenanceProfileSnapshot(),
    receipt_categories: [...ECONOMY_MAINTENANCE_RECEIPT_CATEGORIES],
    manor_keys: [manorKey],
    manor_rows_by_key: {
      [manorKey]: manorRow
    }
  };
}

export function buildEconomyMaintenanceView(
  state: RunState,
  domain: WorldDomainV1 = loadBundledWorldDomain()
): EconomyMaintenanceViewV1 {
  const registry = buildEconomyMaintenanceRegistry(state, domain);

  return {
    schema_version: ECONOMY_MAINTENANCE_VIEW_SCHEMA_VERSION,
    scope: registry.scope,
    manor_keys: [...registry.manor_keys],
    manor_summaries_by_key: Object.fromEntries(
      registry.manor_keys.map((manorKey) => {
        const row = registry.manor_rows_by_key[manorKey]!;
        const buildingEntries = row.entry_order
          .map((entryId) => row.entries_by_id[entryId])
          .filter((entry): entry is EconomyMaintenanceEntryV1 => entry?.entry_kind === "building")
          .map((entry) => summarizeEntry(entry));
        const rightEntries = row.entry_order
          .map((entryId) => row.entries_by_id[entryId])
          .filter((entry): entry is EconomyMaintenanceEntryV1 => entry?.entry_kind !== "building")
          .map((entry) => summarizeEntry(entry));

        return [
          manorKey,
          {
            schema_version: ECONOMY_MAINTENANCE_MANOR_SUMMARY_SCHEMA_VERSION,
            manor_id: row.manor_id,
            manor_key: row.manor_key,
            building_entries: buildingEntries,
            right_entries: rightEntries,
            active_project: row.active_project,
            totals: cloneTotals(row.totals)
          }
        ];
      })
    ) as Record<string, EconomyMaintenanceManorSummaryV1>
  };
}

export function applyEconomyMaintenanceCoinCosts(
  state: RunState,
  input: EconomyMaintenanceApplyInputV1,
  domain: WorldDomainV1 = loadBundledWorldDomain()
): EconomyMaintenanceApplyResultV1 {
  const registry = input.registry ?? buildEconomyMaintenanceRegistry(state, domain);
  const manorKey = input.manor_key ?? registry.manor_keys[0] ?? maintenanceManorKey(anchorManorId(domain));
  const row = registry.manor_rows_by_key[manorKey];
  const beforeLength = readLedgerReceiptSnapshots(state).length;

  if (!row) {
    return {
      schema_version: ECONOMY_MAINTENANCE_APPLY_RESULT_SCHEMA_VERSION,
      manor_id: anchorManorId(domain),
      manor_key: manorKey,
      applied_entry_order: [],
      applied_entries_by_id: {},
      total_requested_coin_cost: 0,
      total_paid_coin_cost: 0,
      total_shortfall_coin_cost: 0,
      receipt_snapshots: []
    };
  }

  const actorIds = relatedActorIds(state, input.related_actor_ids ?? []);
  const appliedEntries = row.entry_order
    .map((entryId) => row.entries_by_id[entryId])
    .filter((entry): entry is EconomyMaintenanceEntryV1 => entry != null && entry.coin_cost > 0);

  const appliedEntriesById: Record<string, EconomyMaintenanceApplyEntryResultV1> = {};
  let totalRequestedCoinCost = 0;
  let totalPaidCoinCost = 0;
  let totalShortfallCoinCost = 0;

  for (const entry of appliedEntries) {
    totalRequestedCoinCost += entry.coin_cost;
    const paidCoinCost = spendCoin(state, entry.coin_cost, {
      phase: input.phase,
      phase_sequence: normalizeInteger(input.phase_sequence),
      category: entry.category,
      counterparty_kind: "self",
      counterparty_id: entry.counterparty_id,
      counterparty_label: entry.counterparty_label,
      summary: entrySummary(entry),
      rule_id: entry.rule_id,
      related_actor_ids: actorIds
    });
    const shortfallCoinCost = Math.max(0, entry.coin_cost - paidCoinCost);
    totalPaidCoinCost += paidCoinCost;
    totalShortfallCoinCost += shortfallCoinCost;
    appliedEntriesById[entry.entry_id] = {
      entry_id: entry.entry_id,
      requested_coin_cost: entry.coin_cost,
      paid_coin_cost: paidCoinCost,
      shortfall_coin_cost: shortfallCoinCost,
      counterparty_id: entry.counterparty_id,
      counterparty_label: entry.counterparty_label,
      rule_id: entry.rule_id
    };
  }

  return {
    schema_version: ECONOMY_MAINTENANCE_APPLY_RESULT_SCHEMA_VERSION,
    manor_id: row.manor_id,
    manor_key: row.manor_key,
    applied_entry_order: appliedEntries.map((entry) => entry.entry_id),
    applied_entries_by_id: appliedEntriesById,
    total_requested_coin_cost: totalRequestedCoinCost,
    total_paid_coin_cost: totalPaidCoinCost,
    total_shortfall_coin_cost: totalShortfallCoinCost,
    receipt_snapshots: readLedgerReceiptSnapshots(state).slice(beforeLength)
  };
}

export function serializeEconomyMaintenanceRegistry(
  registry: EconomyMaintenanceRegistryV1
): string {
  return JSON.stringify({
    schema_version: registry.schema_version,
    scope: registry.scope,
    profile: registry.profile,
    receipt_categories: [...registry.receipt_categories],
    manor_keys: [...registry.manor_keys],
    manor_rows_by_key: Object.fromEntries(
      registry.manor_keys.map((manorKey) => {
        const row = registry.manor_rows_by_key[manorKey]!;
        return [
          manorKey,
          {
            schema_version: row.schema_version,
            manor_id: row.manor_id,
            manor_key: row.manor_key,
            entry_order: [...row.entry_order],
            entries_by_id: Object.fromEntries(
              row.entry_order.map((entryId) => {
                const entry = row.entries_by_id[entryId]!;
                return [
                  entryId,
                  {
                    schema_version: entry.schema_version,
                    entry_id: entry.entry_id,
                    manor_id: entry.manor_id,
                    manor_key: entry.manor_key,
                    entry_kind: entry.entry_kind,
                    source_id: entry.source_id,
                    source_label: entry.source_label,
                    source_state: entry.source_state,
                    category: entry.category,
                    coin_cost: entry.coin_cost,
                    labor_required: entry.labor_required,
                    counterparty_id: entry.counterparty_id,
                    counterparty_label: entry.counterparty_label,
                    rule_id: entry.rule_id,
                    runtime_source_paths: [...entry.runtime_source_paths],
                    tuning_refs: [...entry.tuning_refs]
                  }
                ];
              })
            ),
            totals: cloneTotals(row.totals),
            active_project: row.active_project
          }
        ];
      })
    )
  });
}

export function serializeEconomyMaintenanceView(
  view: EconomyMaintenanceViewV1
): string {
  return JSON.stringify({
    schema_version: view.schema_version,
    scope: view.scope,
    manor_keys: [...view.manor_keys],
    manor_summaries_by_key: buildOrderedRecord(view.manor_keys, (manorKey) => view.manor_summaries_by_key[manorKey]!)
  });
}
