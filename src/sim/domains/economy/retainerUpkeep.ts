import type { PhaseNameV0, RunState } from "../../types";
import {
  type HouseCourtVariant,
  planHouseCourtSeatFillDecisions,
  planLegacyHouseCourtAssignments,
} from "../court/officeRegistry";
import { spendCoin } from "./ledger";

export const COURT_RETAINER_UPKEEP_SCAFFOLD_SCHEMA_VERSION = "court_retainer_upkeep_scaffold_v0" as const;
export const COURT_RETAINER_UPKEEP_AMOUNT = 1 as const;

export interface CourtRetainerUpkeepScaffoldV0 {
  schema_version: typeof COURT_RETAINER_UPKEEP_SCAFFOLD_SCHEMA_VERSION;
  scaffold_id: string;
  phase: PhaseNameV0;
  phase_sequence: number;
  seat_id: string;
  seat_key: string;
  holder_person_id: string;
  amount: number;
  category: "expense.household_admin";
  counterparty_kind: "household";
  counterparty_id: string;
  counterparty_label: string;
  summary_label: string;
  rule_id: string;
  related_actor_ids: string[];
}

export interface CourtRetainerUpkeepScaffoldInputV0 {
  phase: PhaseNameV0;
  phase_sequence: number;
  seat_id: string;
  seat_key: string;
  holder_person_id: string;
  amount?: number;
  rule_id?: string;
  related_actor_ids?: readonly string[];
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeInteger(value: number): number {
  return Math.max(0, Math.trunc(value));
}

function canonicalRelatedActorIds(ids: readonly string[]): string[] {
  return [...ids].sort(compareText);
}

function summaryLabelForSeatKey(seatKey: string): string {
  return seatKey
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeVariant(value: unknown): HouseCourtVariant | null {
  return value === "A" || value === "B" || value === "C" ? value : null;
}

function normalizedScaffoldId(input: CourtRetainerUpkeepScaffoldInputV0): string {
  return ["retainer_upkeep", input.phase, `p${normalizeInteger(input.phase_sequence)}`, input.seat_key, input.holder_person_id].join(":");
}

export function makeCourtRetainerUpkeepScaffold(
  input: CourtRetainerUpkeepScaffoldInputV0
): CourtRetainerUpkeepScaffoldV0 {
  const summaryLabel = summaryLabelForSeatKey(input.seat_key);
  return {
    schema_version: COURT_RETAINER_UPKEEP_SCAFFOLD_SCHEMA_VERSION,
    scaffold_id: normalizedScaffoldId(input),
    phase: input.phase,
    phase_sequence: normalizeInteger(input.phase_sequence),
    seat_id: input.seat_id,
    seat_key: input.seat_key,
    holder_person_id: input.holder_person_id,
    amount: Math.max(0, normalizeInteger(input.amount ?? COURT_RETAINER_UPKEEP_AMOUNT)),
    category: "expense.household_admin",
    counterparty_kind: "household",
    counterparty_id: `retainer:${input.holder_person_id}`,
    counterparty_label: summaryLabel,
    summary_label: summaryLabel,
    rule_id: input.rule_id ?? `court.retainer_upkeep.${input.seat_key}`,
    related_actor_ids: canonicalRelatedActorIds(input.related_actor_ids ?? [input.holder_person_id]),
  };
}

export function listCourtRetainerUpkeepScaffolds(
  state: RunState,
  phase: PhaseNameV0,
  phase_sequence: number
): CourtRetainerUpkeepScaffoldV0[] {
  const anyState: any = state as any;
  const playerHouseId = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
  const houseRegistry = anyState.houses?.[playerHouseId];
  const assignments = planLegacyHouseCourtAssignments(
    houseRegistry?.court_officers,
    anyState.people && typeof anyState.people === "object" ? anyState.people : null,
    normalizeVariant(anyState.flags?._tuning?.court_variant)
  );

  return planHouseCourtSeatFillDecisions(state, assignments)
    .filter((decision) => decision.payment_basis === "retainer_upkeep")
    .map((decision) =>
      makeCourtRetainerUpkeepScaffold({
        phase,
        phase_sequence,
        seat_id: decision.seat_id,
        seat_key: decision.seat_key,
        holder_person_id: decision.person_id,
        related_actor_ids: [decision.person_id],
      })
    );
}

export function applyCourtRetainerUpkeepScaffold(
  state: RunState,
  scaffold: CourtRetainerUpkeepScaffoldV0
): number {
  if (scaffold.amount <= 0) return 0;

  return spendCoin(state, scaffold.amount, {
    phase: scaffold.phase,
    phase_sequence: scaffold.phase_sequence,
    category: scaffold.category,
    counterparty_kind: scaffold.counterparty_kind,
    counterparty_id: scaffold.counterparty_id,
    counterparty_label: scaffold.counterparty_label,
    summary: `${scaffold.summary_label} retainer upkeep paid ${scaffold.amount} coin.`,
    rule_id: scaffold.rule_id,
    related_actor_ids: scaffold.related_actor_ids,
  });
}
