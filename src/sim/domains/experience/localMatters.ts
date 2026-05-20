import type { FiscalReceiptSnapshotV1 } from "../economy/receipts";

export const V04_LOCAL_MATTERS_LIVE_TRANCHE_SCHEMA_VERSION = "v04_local_matters_live_tranche_v1" as const;
export const V04_LOCAL_MATTERS_LIVE_TRANCHE_ID = "V04-LOCAL-LIVE-001" as const;

export type V04LocalMatterVisibilityClass =
  | "interactive"
  | "automatic_but_visible"
  | "background_visible"
  | "background_hidden_evidence_only";

export type V04LocalMatterEffectClass =
  | "existing_event_ledger_coin_delta"
  | "condition_delta"
  | "labor_delta"
  | "order_delta"
  | "food_delta"
  | "art_delta"
  | "justice_or_coercion"
  | "ui_response"
  | "turn_wiring"
  | "schema_update"
  | "fixture_or_golden_update";

export interface V04LocalMatterReceiptProvenanceV1 {
  receipt_family: "fiscal_receipt_v1";
  phase: "events";
  category: string;
  counterparty_id: string;
  rule_ids: string[];
  source_refs: string[];
}

export interface V04LocalMatterLiveRowV1 {
  schema_version: typeof V04_LOCAL_MATTERS_LIVE_TRANCHE_SCHEMA_VERSION;
  tranche_id: typeof V04_LOCAL_MATTERS_LIVE_TRANCHE_ID;
  event_id: string;
  legacy_title: string;
  canonical_planning_name: string;
  visibility_class: V04LocalMatterVisibilityClass;
  domains: string[];
  source_conditions: string[];
  allowed_effect_classes: V04LocalMatterEffectClass[];
  blocked_effect_classes: V04LocalMatterEffectClass[];
  receipt_provenance: V04LocalMatterReceiptProvenanceV1;
  stop_rule_notes: string[];
}

export interface V04LocalMatterReceiptEvidenceV1 {
  schema_version: typeof V04_LOCAL_MATTERS_LIVE_TRANCHE_SCHEMA_VERSION;
  tranche_id: typeof V04_LOCAL_MATTERS_LIVE_TRANCHE_ID;
  event_id: string;
  canonical_planning_name: string;
  visibility_class: V04LocalMatterVisibilityClass;
  evidence_status: "receipt_backed" | "missing_receipt";
  receipt_count: number;
  receipt_ids: string[];
  expected_receipt: V04LocalMatterReceiptProvenanceV1;
  mutations: Array<{
    receipt_id: string;
    asset: string;
    delta: number;
    balance_after: number;
    rule_id: string;
  }>;
  provenance_refs: string[];
  stop_rule_assertions: {
    reference_world_mutated: false;
    generated_run_state_mutated: false;
    ui_integrated: false;
    turn_phase_rewired: false;
    schema_fixture_golden_changed: false;
    blocked_effects_not_applied: V04LocalMatterEffectClass[];
  };
}

const V04_LOCAL_MATTER_SOURCE_REFS = [
  "ops/v0.3/catalog_disposition/SP-017_LEGACY_62_EVENT_DISPOSITION.md",
  "ops/v0.4/safe_queue/V04_LOCAL_001_LOCAL_MATTERS_ROW_PACKAGE.md",
  "ops/v0.4/V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md",
] as const;

const V04_LOCAL_MATTERS_LIVE_ROWS: V04LocalMatterLiveRowV1[] = [
  {
    schema_version: V04_LOCAL_MATTERS_LIVE_TRANCHE_SCHEMA_VERSION,
    tranche_id: V04_LOCAL_MATTERS_LIVE_TRANCHE_ID,
    event_id: "evt_tool_breakage",
    legacy_title: "Tool Breakage",
    canonical_planning_name: "Manor Worksite Accident",
    visibility_class: "automatic_but_visible",
    domains: ["Condition", "Economy", "Labor"],
    source_conditions: [
      "existing_runtime_weight: active construction raises eligibility to 0.6",
      "existing_runtime_weight: no active construction keeps minor eligibility at 0.2",
    ],
    allowed_effect_classes: ["existing_event_ledger_coin_delta"],
    blocked_effect_classes: [
      "condition_delta",
      "labor_delta",
      "order_delta",
      "food_delta",
      "art_delta",
      "justice_or_coercion",
      "ui_response",
      "turn_wiring",
      "schema_update",
      "fixture_or_golden_update",
    ],
    receipt_provenance: {
      receipt_family: "fiscal_receipt_v1",
      phase: "events",
      category: "event.economic",
      counterparty_id: "event:evt_tool_breakage",
      rule_ids: ["event.evt_tool_breakage.coin"],
      source_refs: [...V04_LOCAL_MATTER_SOURCE_REFS],
    },
    stop_rule_notes: [
      "CPO/CEO authorization is limited to the selected SP-017-backed row in this tranche.",
      "This slice uses the pre-existing event ledger coin path only; it does not authorize broad Coin or economy behavior.",
      "Condition, Labor, Order, Food, A/R/T, justice/coercion, UI response, schema, fixture, golden, and turn-wiring effects remain blocked.",
    ],
  },
].sort((left, right) => left.event_id.localeCompare(right.event_id));

const V04_LOCAL_MATTERS_LIVE_ROWS_BY_EVENT_ID = new Map(
  V04_LOCAL_MATTERS_LIVE_ROWS.map((row) => [row.event_id, row] as const)
);

function compareReceipt(left: FiscalReceiptSnapshotV1, right: FiscalReceiptSnapshotV1): number {
  return [
    left.turn - right.turn,
    left.phase_sequence - right.phase_sequence,
    left.receipt_id.localeCompare(right.receipt_id),
  ].find((part) => part !== 0) ?? 0;
}

export function listV04LocalMatterLiveRows(): V04LocalMatterLiveRowV1[] {
  return V04_LOCAL_MATTERS_LIVE_ROWS.map((row) => ({
    ...row,
    domains: [...row.domains],
    source_conditions: [...row.source_conditions],
    allowed_effect_classes: [...row.allowed_effect_classes],
    blocked_effect_classes: [...row.blocked_effect_classes],
    receipt_provenance: {
      ...row.receipt_provenance,
      rule_ids: [...row.receipt_provenance.rule_ids],
      source_refs: [...row.receipt_provenance.source_refs],
    },
    stop_rule_notes: [...row.stop_rule_notes],
  }));
}

export function v04LocalMatterLiveRowForEvent(eventId: string): V04LocalMatterLiveRowV1 | null {
  return V04_LOCAL_MATTERS_LIVE_ROWS_BY_EVENT_ID.get(eventId) ?? null;
}

export function assertV04LocalMatterLiveMutationAllowed(
  eventId: string,
  effectClass: V04LocalMatterEffectClass
): V04LocalMatterLiveRowV1 {
  const row = v04LocalMatterLiveRowForEvent(eventId);
  if (!row) {
    throw new Error(`V04 Local Matters live mutation is not authorized for event ${eventId}`);
  }
  if (!row.allowed_effect_classes.includes(effectClass)) {
    throw new Error(`V04 Local Matters effect ${effectClass} is not authorized for event ${eventId}`);
  }
  return row;
}

export function buildV04LocalMatterReceiptEvidence(
  eventId: string,
  fiscalReceipts: readonly FiscalReceiptSnapshotV1[]
): V04LocalMatterReceiptEvidenceV1 {
  const row = v04LocalMatterLiveRowForEvent(eventId);
  if (!row) {
    throw new Error(`V04 Local Matters live receipt evidence is not defined for event ${eventId}`);
  }

  const expected = row.receipt_provenance;
  const matchingReceipts = fiscalReceipts
    .filter((receipt) =>
      receipt.phase === expected.phase &&
      receipt.category === expected.category &&
      receipt.counterparty_id === expected.counterparty_id &&
      expected.rule_ids.includes(receipt.rule_id)
    )
    .sort(compareReceipt);

  return {
    schema_version: V04_LOCAL_MATTERS_LIVE_TRANCHE_SCHEMA_VERSION,
    tranche_id: V04_LOCAL_MATTERS_LIVE_TRANCHE_ID,
    event_id: row.event_id,
    canonical_planning_name: row.canonical_planning_name,
    visibility_class: row.visibility_class,
    evidence_status: matchingReceipts.length > 0 ? "receipt_backed" : "missing_receipt",
    receipt_count: matchingReceipts.length,
    receipt_ids: matchingReceipts.map((receipt) => receipt.receipt_id),
    expected_receipt: {
      ...expected,
      rule_ids: [...expected.rule_ids],
      source_refs: [...expected.source_refs],
    },
    mutations: matchingReceipts.map((receipt) => ({
      receipt_id: receipt.receipt_id,
      asset: receipt.asset,
      delta: receipt.delta,
      balance_after: receipt.balance_after,
      rule_id: receipt.rule_id,
    })),
    provenance_refs: [...expected.source_refs],
    stop_rule_assertions: {
      reference_world_mutated: false,
      generated_run_state_mutated: false,
      ui_integrated: false,
      turn_phase_rewired: false,
      schema_fixture_golden_changed: false,
      blocked_effects_not_applied: [...row.blocked_effect_classes],
    },
  };
}
