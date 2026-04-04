import { UNREST_BASELINE_DECAY_WHEN_STABLE } from "../../constants";
import type { PhaseNameV0, RunState } from "../../types";
import { clampInt } from "../../util";
import { applyRelationshipDelta } from "../people/relationshipEngine";
import {
  buildEconomyObligationRegistryFromState,
  carryEconomyObligationCounterpartyIntoArrears,
  type EconomyObligationArrearsAssetV1,
  type EconomyObligationCarryResultV1,
  type EconomyObligationCounterpartyKindV1,
  type EconomyObligationRegistryV1
} from "./obligationRegistry";

export const ECONOMY_OBLIGATION_PENALTY_STAGE_SCHEMA_VERSION = "economy_obligation_penalty_stage_v1" as const;
export const ECONOMY_OBLIGATION_PENALTY_STAGE_CATEGORY = "enforcement.penalty" as const;
export const ECONOMY_OBLIGATION_PENALTY_STAGE = 1 as const;

export interface EconomyObligationPenaltyStageEntryV1 {
  schema_version: typeof ECONOMY_OBLIGATION_PENALTY_STAGE_SCHEMA_VERSION;
  stage: typeof ECONOMY_OBLIGATION_PENALTY_STAGE;
  category: typeof ECONOMY_OBLIGATION_PENALTY_STAGE_CATEGORY;
  counterparty_kind: EconomyObligationCounterpartyKindV1;
  counterparty_id: string;
  counterparty_label: string;
  arrears_asset: EconomyObligationArrearsAssetV1;
  arrears_amount: number;
  relationship_delta: {
    respect: number;
    threat: number;
  };
  rule_id: string;
  summary: string;
}

export interface EconomyObligationPenaltyStageInputV1 {
  shortage?: boolean;
}

export interface EconomyObligationPenaltyStageResultV1 {
  schema_version: typeof ECONOMY_OBLIGATION_PENALTY_STAGE_SCHEMA_VERSION;
  stage: typeof ECONOMY_OBLIGATION_PENALTY_STAGE;
  entries: EconomyObligationPenaltyStageEntryV1[];
  stable_unrest_delta: number;
  stable_unrest_rule_id: string | null;
  stable_unrest_summary: string | null;
  shortage_active: boolean;
  registry: EconomyObligationRegistryV1;
}

export interface EconomyObligationCloseTurnInputV1 {
  phase: PhaseNameV0;
  phase_sequence: number;
  related_actor_ids?: readonly string[];
  shortage?: boolean;
  rule_prefix?: string;
}

export interface EconomyObligationCloseTurnResultV1 {
  carry_results_by_counterparty: Record<EconomyObligationCounterpartyKindV1, EconomyObligationCarryResultV1>;
  penalty_stage: EconomyObligationPenaltyStageResultV1;
  registry: EconomyObligationRegistryV1;
}

function normalizeInteger(value: number): number {
  return Math.trunc(value);
}

function shortageActive(state: RunState, input: EconomyObligationPenaltyStageInputV1): boolean {
  return input.shortage ?? Boolean((state.flags as Record<string, unknown>).Shortage);
}

function penaltyRelationshipDelta(
  counterpartyKind: EconomyObligationCounterpartyKindV1,
  arrearsAmount: number
): { respect: number; threat: number } {
  if (arrearsAmount > 0) {
    return { respect: -1, threat: +1 };
  }

  if (counterpartyKind === "liege") {
    return { respect: +1, threat: -1 };
  }

  return { respect: +1, threat: 0 };
}

function penaltyRuleId(
  counterpartyKind: EconomyObligationCounterpartyKindV1,
  arrearsAmount: number
): string {
  return `enforcement.penalty.stage_one.${counterpartyKind}_${arrearsAmount > 0 ? "arrears" : "clear"}`;
}

function penaltySummary(
  counterpartyLabel: string,
  arrearsAmount: number
): string {
  if (arrearsAmount > 0) {
    return `Stage-one enforcement pressure rose for ${counterpartyLabel} because arrears remain open after carry.`;
  }

  return `Stage-one enforcement stayed favorable for ${counterpartyLabel} because arrears are clear after carry.`;
}

export function buildEconomyObligationPenaltyStageFromState(
  state: RunState,
  input: EconomyObligationPenaltyStageInputV1 = {}
): EconomyObligationPenaltyStageResultV1 {
  const registry = buildEconomyObligationRegistryFromState(state);
  const entries = registry.counterparty_keys.map((counterpartyKind) => {
    const entry = registry.counterparties_by_key[counterpartyKind];
    const delta = penaltyRelationshipDelta(counterpartyKind, entry.arrears_amount);

    return {
      schema_version: ECONOMY_OBLIGATION_PENALTY_STAGE_SCHEMA_VERSION,
      stage: ECONOMY_OBLIGATION_PENALTY_STAGE,
      category: ECONOMY_OBLIGATION_PENALTY_STAGE_CATEGORY,
      counterparty_kind: counterpartyKind,
      counterparty_id: entry.counterparty_id,
      counterparty_label: entry.counterparty_label,
      arrears_asset: entry.arrears_asset,
      arrears_amount: entry.arrears_amount,
      relationship_delta: delta,
      rule_id: penaltyRuleId(counterpartyKind, entry.arrears_amount),
      summary: penaltySummary(entry.counterparty_label, entry.arrears_amount)
    };
  });

  const shortage = shortageActive(state, input);
  const allClear = entries.every((entry) => entry.arrears_amount === 0);
  const stableUnrestDelta = !shortage && allClear ? -UNREST_BASELINE_DECAY_WHEN_STABLE : 0;

  return {
    schema_version: ECONOMY_OBLIGATION_PENALTY_STAGE_SCHEMA_VERSION,
    stage: ECONOMY_OBLIGATION_PENALTY_STAGE,
    entries,
    stable_unrest_delta: stableUnrestDelta,
    stable_unrest_rule_id: stableUnrestDelta !== 0 ? "enforcement.penalty.stage_one.stable_relief" : null,
    stable_unrest_summary:
      stableUnrestDelta !== 0
        ? "No shortage and no arrears remain after carry; unrest eases at turn close."
        : null,
    shortage_active: shortage,
    registry
  };
}

export function applyEconomyObligationStageOnePenalties(
  state: RunState,
  input: EconomyObligationPenaltyStageInputV1 = {}
): EconomyObligationPenaltyStageResultV1 {
  const result = buildEconomyObligationPenaltyStageFromState(state, input);
  const entryByKind = Object.fromEntries(
    result.entries.map((entry) => [entry.counterparty_kind, entry])
  ) as Record<EconomyObligationCounterpartyKindV1, EconomyObligationPenaltyStageEntryV1>;

  for (const counterpartyKind of ["liege", "church"] as const) {
    const entry = entryByKind[counterpartyKind];
    applyRelationshipDelta(
      state,
      entry.counterparty_id,
      state.house.head.id,
      entry.relationship_delta,
      entry.rule_id
    );
  }

  if (result.stable_unrest_delta !== 0) {
    state.manor.unrest = clampInt(state.manor.unrest + normalizeInteger(result.stable_unrest_delta), 0, 100);
  }

  return result;
}

export function applyEconomyObligationCloseTurnStage(
  state: RunState,
  input: EconomyObligationCloseTurnInputV1
): EconomyObligationCloseTurnResultV1 {
  const rulePrefix = input.rule_prefix ?? "obligations.close_turn";
  const carryResults: Record<EconomyObligationCounterpartyKindV1, EconomyObligationCarryResultV1> = {
    church: carryEconomyObligationCounterpartyIntoArrears(state, {
      phase: input.phase,
      phase_sequence: input.phase_sequence,
      counterparty_kind: "church",
      rule_id: `${rulePrefix}.church_arrears_carry`,
      related_actor_ids: input.related_actor_ids
    }),
    liege: carryEconomyObligationCounterpartyIntoArrears(state, {
      phase: input.phase,
      phase_sequence: input.phase_sequence,
      counterparty_kind: "liege",
      rule_id: `${rulePrefix}.liege_arrears_carry`,
      related_actor_ids: input.related_actor_ids
    })
  };
  const penaltyStage = applyEconomyObligationStageOnePenalties(state, {
    shortage: input.shortage
  });

  return {
    carry_results_by_counterparty: carryResults,
    penalty_stage: penaltyStage,
    registry: buildEconomyObligationRegistryFromState(state)
  };
}
