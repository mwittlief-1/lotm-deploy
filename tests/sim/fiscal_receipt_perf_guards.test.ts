import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createNewRun } from "../../src/sim";
import {
  applyCoinDelta,
  applyTaxDueCoinDelta,
  applyTitheDueBushelsDelta,
  clearLedgerReceiptJournal,
  readLedgerReceiptSnapshots,
  rollTaxDueCoinIntoArrears,
  rollTitheDueBushelsIntoArrears,
  setArrearsBushels,
  setArrearsCoin,
  setBushelBalance,
  setCoinBalance,
  setTaxDueCoin,
  setTitheDueBushels,
  spendBushels,
  spendTaxDueCoin,
  spendTitheDueBushels
} from "../../src/sim/domains/economy/ledger";

const RECEIPT_HEAVY_FLOW_SEED = "V03_R0_001_T06_HEAVY_FLOW";
const RECEIPT_HEAVY_FLOW_ITERATIONS = 32;

interface ReceiptPerfBudgetsV0_3 {
  snapshotCapBytesPerTurn: number;
  turnTimeSoftCeilingMsPerSeed: number;
}

interface ReceiptPerfRunV0_3 {
  serialized: string;
  bytes: number;
  elapsedMs: number;
  rowCount: number;
  assetCounts: Record<string, number>;
  firstReceiptId: string;
  lastReceiptId: string;
}

function readReceiptPerfBudgets(): ReceiptPerfBudgetsV0_3 {
  const runtimeContract = fs.readFileSync(path.resolve("ops/v0.3/runtime-contract.yaml"), "utf8");
  const snapshotCapMatch = runtimeContract.match(/snapshot_cap_bytes_per_turn:\s*(\d+)/);
  const turnTimeMatch = runtimeContract.match(/turn_time_soft_ceiling_ms_per_seed:\s*(\d+)/);

  if (!snapshotCapMatch || !turnTimeMatch) {
    throw new Error("Unable to read v0.3 receipt perf budgets from ops/v0.3/runtime-contract.yaml");
  }

  return {
    snapshotCapBytesPerTurn: Number(snapshotCapMatch[1]),
    turnTimeSoftCeilingMsPerSeed: Number(turnTimeMatch[1])
  };
}

function runReceiptHeavyFlow(seed: string): ReceiptPerfRunV0_3 {
  const state: any = createNewRun(seed);
  clearLedgerReceiptJournal(state);
  state.turn_index = 11;
  setCoinBalance(state, 5000);
  setBushelBalance(state, 5000);
  setTaxDueCoin(state, 0);
  setTitheDueBushels(state, 0);
  setArrearsCoin(state, 0);
  setArrearsBushels(state, 0);

  const head = state.house.head;
  const liege = state.locals.liege;
  const clergy = state.locals.clergy;

  const startedAt = process.hrtime.bigint();

  for (let index = 1; index <= RECEIPT_HEAVY_FLOW_ITERATIONS; index += 1) {
    applyCoinDelta(state, 2, {
      phase: "events",
      phase_sequence: index,
      category: "events.receipt_stress_coin",
      counterparty_kind: "event",
      counterparty_id: `event:stress:${String(index).padStart(2, "0")}`,
      counterparty_label: "Stress Event",
      summary: "Stress-flow event coin delta.",
      rule_id: "events.receipt_stress_coin",
      related_actor_ids: [head.id, liege.id]
    });
    spendBushels(state, 1, {
      phase: "consumption",
      phase_sequence: index,
      category: "consumption.receipt_stress_food",
      counterparty_kind: "household",
      counterparty_id: head.id,
      counterparty_label: head.name,
      summary: "Stress-flow household ration spend.",
      rule_id: "consumption.receipt_stress_food",
      related_actor_ids: [head.id]
    });
    applyTaxDueCoinDelta(state, 2, {
      phase: "obligations",
      phase_sequence: index,
      category: "obligations.receipt_stress_tax",
      counterparty_kind: "liege",
      counterparty_id: liege.id,
      counterparty_label: liege.name,
      summary: "Stress-flow liege tax assessment.",
      rule_id: "obligations.receipt_stress_tax",
      related_actor_ids: [head.id, liege.id]
    });
    applyTitheDueBushelsDelta(state, 3, {
      phase: "obligations",
      phase_sequence: 100 + index,
      category: "obligations.receipt_stress_tithe",
      counterparty_kind: "church",
      counterparty_id: clergy.id,
      counterparty_label: clergy.name,
      summary: "Stress-flow church tithe assessment.",
      rule_id: "obligations.receipt_stress_tithe",
      related_actor_ids: [clergy.id, head.id]
    });
  }

  spendTaxDueCoin(state, 10, {
    phase: "obligations",
    phase_sequence: 250,
    category: "obligations.receipt_stress_tax",
    counterparty_kind: "liege",
    counterparty_id: liege.id,
    counterparty_label: liege.name,
    summary: "Stress-flow partial liege tax payment.",
    rule_id: "obligations.receipt_stress_tax_pay",
    related_actor_ids: [head.id, liege.id]
  });
  spendTitheDueBushels(state, 12, {
    phase: "obligations",
    phase_sequence: 251,
    category: "obligations.receipt_stress_tithe",
    counterparty_kind: "church",
    counterparty_id: clergy.id,
    counterparty_label: clergy.name,
    summary: "Stress-flow partial church tithe payment.",
    rule_id: "obligations.receipt_stress_tithe_pay",
    related_actor_ids: [clergy.id, head.id]
  });
  rollTaxDueCoinIntoArrears(state, {
    debit: {
      phase: "succession",
      phase_sequence: 300,
      category: "obligations.receipt_stress_tax_carry",
      counterparty_kind: "system",
      counterparty_id: "turn-close",
      counterparty_label: "Turn Close",
      summary: "Stress-flow tax carry debit.",
      rule_id: "obligations.receipt_stress_tax_carry.debit",
      related_actor_ids: [head.id, liege.id]
    },
    credit: {
      phase: "succession",
      phase_sequence: 300,
      category: "obligations.receipt_stress_tax_carry",
      counterparty_kind: "system",
      counterparty_id: "turn-close",
      counterparty_label: "Turn Close",
      summary: "Stress-flow tax carry credit.",
      rule_id: "obligations.receipt_stress_tax_carry.credit",
      related_actor_ids: [head.id, liege.id]
    }
  });
  rollTitheDueBushelsIntoArrears(state, {
    debit: {
      phase: "succession",
      phase_sequence: 301,
      category: "obligations.receipt_stress_tithe_carry",
      counterparty_kind: "system",
      counterparty_id: "turn-close",
      counterparty_label: "Turn Close",
      summary: "Stress-flow tithe carry debit.",
      rule_id: "obligations.receipt_stress_tithe_carry.debit",
      related_actor_ids: [clergy.id, head.id]
    },
    credit: {
      phase: "succession",
      phase_sequence: 301,
      category: "obligations.receipt_stress_tithe_carry",
      counterparty_kind: "system",
      counterparty_id: "turn-close",
      counterparty_label: "Turn Close",
      summary: "Stress-flow tithe carry credit.",
      rule_id: "obligations.receipt_stress_tithe_carry.credit",
      related_actor_ids: [clergy.id, head.id]
    }
  });

  const snapshots = readLedgerReceiptSnapshots(state);
  const serialized = JSON.stringify(snapshots);
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const assetCounts = snapshots.reduce<Record<string, number>>((counts, receipt) => {
    counts[receipt.asset] = (counts[receipt.asset] ?? 0) + 1;
    return counts;
  }, {});

  return {
    serialized,
    bytes: Buffer.byteLength(serialized, "utf8"),
    elapsedMs,
    rowCount: snapshots.length,
    assetCounts,
    firstReceiptId: snapshots[0]?.receipt_id ?? "",
    lastReceiptId: snapshots.at(-1)?.receipt_id ?? ""
  };
}

describe("fiscal receipt perf guards", () => {
  it("keeps the seeded heavy receipt flow deterministic and bounded against duplicate growth", () => {
    const first = runReceiptHeavyFlow(RECEIPT_HEAVY_FLOW_SEED);
    const second = runReceiptHeavyFlow(RECEIPT_HEAVY_FLOW_SEED);

    expect(first.serialized).toBe(second.serialized);
    expect(first.rowCount).toBe(134);
    expect(first.assetCounts).toEqual({
      arrears_bushels: 1,
      arrears_coin: 1,
      coin: 32,
      food_stores: 32,
      tax_due_coin: 34,
      tithe_due_bushels: 34
    });
    expect(first.firstReceiptId).toBe("ledger:t11:consumption:p1:food_stores:0002");
    expect(first.lastReceiptId).toBe("ledger:t11:succession:p301:tithe_due_bushels:0134");
  });

  it("keeps the heavy receipt flow within the v0.3 snapshot and soft-time budgets", () => {
    const budgets = readReceiptPerfBudgets();
    const result = runReceiptHeavyFlow(RECEIPT_HEAVY_FLOW_SEED);

    expect(result.bytes).toBeLessThanOrEqual(budgets.snapshotCapBytesPerTurn);
    expect(result.elapsedMs).toBeLessThanOrEqual(budgets.turnTimeSoftCeilingMsPerSeed);
  });
});
