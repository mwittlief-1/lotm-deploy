import type { PhaseNameV0, RunState } from "../../types";
import { spendCoin } from "../economy/ledger";
import { resolveCourtDelegationEntry, resolveDelegatedAmount } from "./delegationRegistry";

export const COURT_MAINTENANCE_SCAFFOLD_SCHEMA_VERSION = "court_maintenance_scaffold_v0" as const;

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
  return Math.max(0, Math.trunc(value));
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
