import { describe, expect, it } from "vitest";

import { EVENT_DECK } from "../../src/content/events";
import { readLedgerReceiptSnapshots } from "../../src/sim/domains/economy/ledger";
import {
  V04_LOCAL_MATTERS_LIVE_TRANCHE_ID,
  V04_LOCAL_MATTERS_LIVE_TRANCHE_SCHEMA_VERSION,
  assertV04LocalMatterLiveMutationAllowed,
  buildV04LocalMatterReceiptEvidence,
  listV04LocalMatterLiveRows,
  v04LocalMatterLiveRowForEvent,
} from "../../src/sim/domains/experience/localMatters";
import { applyEventsPhase } from "../../src/sim/phases/phase_events";
import { Rng } from "../../src/sim/rng";
import { createNewRun } from "../../src/sim/state";

const TOOL_BREAKAGE_EVENT_ID = "evt_tool_breakage";

function toolBreakageEvent() {
  const eventDef = EVENT_DECK.find((event) => event.id === TOOL_BREAKAGE_EVENT_ID);
  if (!eventDef) throw new Error("Expected evt_tool_breakage in EVENT_DECK");
  return eventDef;
}

function applyEventDirect(eventId: string, seed: string) {
  const eventDef = EVENT_DECK.find((event) => event.id === eventId);
  if (!eventDef) throw new Error(`Expected ${eventId} in EVENT_DECK`);
  const state = createNewRun(seed);
  state.turn_index = 3;
  state.manor.coin = 20;

  (state.flags as any)._active_event_receipt_context_v1 = {
    id: eventDef.id,
    title: eventDef.title,
    category: eventDef.category,
    phase_sequence: 1,
  };
  const effects = eventDef.apply(state, new Rng(seed, "events", state.turn_index, `apply:${eventId}`));
  delete (state.flags as any)._active_event_receipt_context_v1;

  return {
    effects,
    receipts: readLedgerReceiptSnapshots(state),
    state,
  };
}

function applyToolBreakage(seed: string) {
  const eventDef = toolBreakageEvent();
  const state = createNewRun(seed);
  state.turn_index = 3;
  state.manor.coin = 20;
  state.manor.bushels_stored = 1200;
  state.manor.unrest = 14;
  state.manor.population = 45;
  state.manor.construction = { improvement_id: "granary_upgrade", progress: 12, required: 30 };

  const before = {
    coin: state.manor.coin,
    bushels_stored: state.manor.bushels_stored,
    unrest: state.manor.unrest,
    population: state.manor.population,
    construction_progress: state.manor.construction.progress,
    relationships: JSON.stringify(state.relationships),
  };

  (state.flags as any)._active_event_receipt_context_v1 = {
    id: eventDef.id,
    title: eventDef.title,
    category: eventDef.category,
    phase_sequence: 1,
  };
  const effects = eventDef.apply(state, new Rng(seed, "events", state.turn_index, "apply:evt_tool_breakage"));
  delete (state.flags as any)._active_event_receipt_context_v1;

  return {
    before,
    effects,
    receipts: readLedgerReceiptSnapshots(state),
    state,
  };
}

function applyToolBreakageThroughEventsPhase(seed: string) {
  const state = createNewRun(seed);
  state.turn_index = 3;
  state.manor.coin = 20;
  state.manor.bushels_stored = 1200;
  state.manor.unrest = 14;
  state.manor.population = 45;
  state.manor.construction = { improvement_id: "granary_upgrade", progress: 12, required: 30 };
  (state.flags as any)._cooldowns = Object.fromEntries(
    EVENT_DECK.filter((event) => event.id !== TOOL_BREAKAGE_EVENT_ID).map((event) => [event.id, 99])
  );

  const before = {
    coin: state.manor.coin,
    bushels_stored: state.manor.bushels_stored,
    unrest: state.manor.unrest,
    population: state.manor.population,
    construction_progress: state.manor.construction.progress,
    relationships: JSON.stringify(state.relationships),
  };

  const events = applyEventsPhase(state);

  return {
    before,
    events,
    receipts: readLedgerReceiptSnapshots(state),
    state,
  };
}

describe("v0.4 Local Matters live mutation tranche", () => {
  it("authorizes only the SP-017-backed Manor Worksite Accident row for this first slice", () => {
    expect(listV04LocalMatterLiveRows().map((row) => row.event_id)).toEqual([TOOL_BREAKAGE_EVENT_ID]);

    const row = v04LocalMatterLiveRowForEvent(TOOL_BREAKAGE_EVENT_ID);
    expect(row).toMatchObject({
      schema_version: V04_LOCAL_MATTERS_LIVE_TRANCHE_SCHEMA_VERSION,
      tranche_id: V04_LOCAL_MATTERS_LIVE_TRANCHE_ID,
      canonical_planning_name: "Manor Worksite Accident",
      visibility_class: "automatic_but_visible",
      allowed_effect_classes: ["existing_event_ledger_coin_delta"],
    });
    expect(row?.receipt_provenance).toMatchObject({
      receipt_family: "fiscal_receipt_v1",
      phase: "events",
      category: "event.economic",
      counterparty_id: "event:evt_tool_breakage",
      rule_ids: ["event.evt_tool_breakage.coin"],
    });
    expect(row?.blocked_effect_classes).toEqual(
      expect.arrayContaining([
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
      ])
    );

    expect(v04LocalMatterLiveRowForEvent("evt_boundary_dispute")).toBeNull();
    expect(() => assertV04LocalMatterLiveMutationAllowed("evt_boundary_dispute", "existing_event_ledger_coin_delta")).toThrow(
      /not authorized/
    );
    expect(() => assertV04LocalMatterLiveMutationAllowed(TOOL_BREAKAGE_EVENT_ID, "condition_delta")).toThrow(
      /not authorized/
    );
  });

  it("routes the selected row through the existing event ledger receipt without blocked side effects", () => {
    const { before, effects, receipts, state } = applyToolBreakage("v04_local_matters_tool_breakage_receipt");
    const coinDelta = state.manor.coin - before.coin;

    expect(effects).toEqual([`Repairs and replacements: ${coinDelta} coin.`]);
    expect(coinDelta).toBeLessThan(0);
    expect(state.manor.bushels_stored).toBe(before.bushels_stored);
    expect(state.manor.unrest).toBe(before.unrest);
    expect(state.manor.population).toBe(before.population);
    expect(state.manor.construction?.progress).toBe(before.construction_progress);
    expect(JSON.stringify(state.relationships)).toBe(before.relationships);

    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      phase: "events",
      phase_sequence: 1,
      category: "event.economic",
      counterparty_kind: "event",
      counterparty_id: "event:evt_tool_breakage",
      counterparty_label: "Tool Breakage",
      asset: "coin",
      delta: coinDelta,
      balance_after: state.manor.coin,
      summary: `Tool Breakage: coin changed by ${coinDelta}.`,
      rule_id: "event.evt_tool_breakage.coin",
    });
  });

  it("routes the selected row through applyEventsPhase receipt context", () => {
    const { before, events, receipts, state } = applyToolBreakageThroughEventsPhase("v04_phase_tool_breakage_4");

    expect(events.map((event) => event.id)).toEqual([TOOL_BREAKAGE_EVENT_ID]);
    const coinDelta = state.manor.coin - before.coin;
    expect(events[0]).toMatchObject({
      id: TOOL_BREAKAGE_EVENT_ID,
      title: "Tool Breakage",
      category: "economic",
      effects: [`Repairs and replacements: ${coinDelta} coin.`],
      deltas: [{ key: "coin", before: before.coin, after: state.manor.coin, diff: coinDelta }],
    });
    expect(coinDelta).toBeLessThan(0);
    expect(state.manor.bushels_stored).toBe(before.bushels_stored);
    expect(state.manor.unrest).toBe(before.unrest);
    expect(state.manor.population).toBe(before.population);
    expect(state.manor.construction?.progress).toBe(before.construction_progress);
    expect(JSON.stringify(state.relationships)).toBe(before.relationships);
    expect((state.flags as any)._active_event_receipt_context_v1).toBeUndefined();

    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      phase: "events",
      phase_sequence: 1,
      category: "event.economic",
      counterparty_kind: "event",
      counterparty_id: "event:evt_tool_breakage",
      counterparty_label: "Tool Breakage",
      asset: "coin",
      delta: coinDelta,
      balance_after: state.manor.coin,
      summary: `Tool Breakage: coin changed by ${coinDelta}.`,
      rule_id: "event.evt_tool_breakage.coin",
    });

    expect(buildV04LocalMatterReceiptEvidence(TOOL_BREAKAGE_EVENT_ID, receipts)).toMatchObject({
      event_id: TOOL_BREAKAGE_EVENT_ID,
      evidence_status: "receipt_backed",
      receipt_count: 1,
    });
  });

  it("does not emit v0.4 event receipts for unselected legacy event rows", () => {
    const { receipts, state } = applyEventDirect("evt_traveling_merchant", "v04_local_matters_unselected_event");

    expect(state.manor.coin).toBeGreaterThan(20);
    expect(receipts).toEqual([]);
    expect(v04LocalMatterLiveRowForEvent("evt_traveling_merchant")).toBeNull();
    expect(() => buildV04LocalMatterReceiptEvidence("evt_traveling_merchant", receipts)).toThrow(/not defined/);
  });

  it("builds deterministic receipt and provenance evidence for PTL review", () => {
    const first = applyToolBreakage("v04_local_matters_tool_breakage_deterministic");
    const second = applyToolBreakage("v04_local_matters_tool_breakage_deterministic");

    const firstEvidence = buildV04LocalMatterReceiptEvidence(TOOL_BREAKAGE_EVENT_ID, first.receipts);
    const secondEvidence = buildV04LocalMatterReceiptEvidence(TOOL_BREAKAGE_EVENT_ID, second.receipts);

    expect(first.receipts).toEqual(second.receipts);
    expect(firstEvidence).toEqual(secondEvidence);
    expect(firstEvidence).toMatchObject({
      schema_version: V04_LOCAL_MATTERS_LIVE_TRANCHE_SCHEMA_VERSION,
      tranche_id: V04_LOCAL_MATTERS_LIVE_TRANCHE_ID,
      event_id: TOOL_BREAKAGE_EVENT_ID,
      canonical_planning_name: "Manor Worksite Accident",
      visibility_class: "automatic_but_visible",
      evidence_status: "receipt_backed",
      receipt_count: 1,
      provenance_refs: expect.arrayContaining([
        "ops/v0.3/catalog_disposition/SP-017_LEGACY_62_EVENT_DISPOSITION.md",
        "ops/v0.4/safe_queue/V04_LOCAL_001_LOCAL_MATTERS_ROW_PACKAGE.md",
        "ops/v0.4/V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md",
      ]),
      stop_rule_assertions: {
        reference_world_mutated: false,
        generated_run_state_mutated: false,
        ui_integrated: false,
        turn_phase_rewired: false,
        schema_fixture_golden_changed: false,
        blocked_effects_not_applied: expect.arrayContaining(["condition_delta", "labor_delta", "art_delta"]),
      },
    });
    expect(firstEvidence.receipt_ids).toEqual(first.receipts.map((receipt) => receipt.receipt_id));
    expect(firstEvidence.mutations).toEqual([
      {
        receipt_id: first.receipts[0]!.receipt_id,
        asset: "coin",
        delta: first.receipts[0]!.delta,
        balance_after: first.receipts[0]!.balance_after,
        rule_id: "event.evt_tool_breakage.coin",
      },
    ]);
  });
});
