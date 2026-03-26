import type { PhaseNameV0, RunState, WarLevyDue } from "../../types";
import { asNonNegInt } from "../../util";
import {
  buildFiscalReceiptSnapshot,
  makeFiscalReceipt,
  type FiscalReceiptAssetV1,
  type FiscalReceiptCounterpartyKindV1,
  type FiscalReceiptSnapshotV1,
  type FiscalReceiptV1
} from "./receipts";

type CoinLedgerReceiptAssetV1 = Extract<FiscalReceiptAssetV1, "coin" | "tax_due_coin" | "arrears_coin">;
type StoreLedgerReceiptAssetV1 = Extract<FiscalReceiptAssetV1, "food_stores" | "tithe_due_bushels" | "arrears_bushels">;
type LedgerReceiptAssetV1 = CoinLedgerReceiptAssetV1 | StoreLedgerReceiptAssetV1;

export interface LedgerReceiptContextV1 {
  receipt_id?: string;
  phase: PhaseNameV0;
  phase_sequence: number;
  category: string;
  counterparty_kind?: FiscalReceiptCounterpartyKindV1;
  counterparty_id?: string;
  counterparty_label?: string;
  summary: string;
  rule_id: string;
  related_actor_ids?: readonly string[];
}

export interface LedgerTransferReceiptContextV1 {
  debit: LedgerReceiptContextV1;
  credit: LedgerReceiptContextV1;
}

interface LedgerReceiptJournalV1 {
  next_ordinal: number;
  receipts: FiscalReceiptV1[];
}

// Keep receipt emission lane-local until integrator wiring decides how to surface it.
const ledgerReceiptJournalByState = new WeakMap<RunState, LedgerReceiptJournalV1>();

function normalizedAmount(amount: number): number {
  return Math.max(0, Math.trunc(amount));
}

function obligations(state: RunState) {
  return state.manor.obligations;
}

function ledgerReceiptJournal(state: RunState): LedgerReceiptJournalV1 {
  const existing = ledgerReceiptJournalByState.get(state);
  if (existing) return existing;

  const created: LedgerReceiptJournalV1 = { next_ordinal: 1, receipts: [] };
  ledgerReceiptJournalByState.set(state, created);
  return created;
}

function ledgerReceiptId(state: RunState, asset: LedgerReceiptAssetV1, context: LedgerReceiptContextV1, journal: LedgerReceiptJournalV1): string {
  const ordinal = journal.next_ordinal++;
  if (context.receipt_id) return context.receipt_id;
  return ["ledger", `t${Math.trunc(state.turn_index)}`, context.phase, `p${Math.trunc(context.phase_sequence)}`, asset, String(ordinal).padStart(4, "0")].join(":");
}

function appendLedgerReceipt(
  state: RunState,
  asset: LedgerReceiptAssetV1,
  delta: number,
  balanceAfter: number,
  context?: LedgerReceiptContextV1
): void {
  if (!context || delta === 0) return;

  const journal = ledgerReceiptJournal(state);
  journal.receipts.push(
    makeFiscalReceipt({
      receipt_id: ledgerReceiptId(state, asset, context, journal),
      turn: state.turn_index,
      phase: context.phase,
      phase_sequence: context.phase_sequence,
      category: context.category,
      counterparty_kind: context.counterparty_kind ?? "unknown",
      counterparty_id: context.counterparty_id ?? "",
      counterparty_label: context.counterparty_label ?? "",
      asset,
      delta,
      balance_after: balanceAfter,
      summary: context.summary,
      rule_id: context.rule_id,
      related_actor_ids: [...(context.related_actor_ids ?? [])]
    })
  );
}

function finalizeLedgerDelta(
  state: RunState,
  asset: LedgerReceiptAssetV1,
  before: number,
  after: number,
  context?: LedgerReceiptContextV1
): number {
  const applied = after - before;
  appendLedgerReceipt(state, asset, applied, after, context);
  return applied;
}

export function readLedgerReceiptSnapshots(state: RunState): FiscalReceiptSnapshotV1[] {
  return buildFiscalReceiptSnapshot(ledgerReceiptJournalByState.get(state)?.receipts ?? []);
}

export function clearLedgerReceiptJournal(state: RunState): void {
  ledgerReceiptJournalByState.delete(state);
}

export function bushelBalance(state: RunState): number {
  return asNonNegInt(state.manor.bushels_stored);
}

export function setBushelBalance(state: RunState, amount: number): number {
  const next = normalizedAmount(amount);
  state.manor.bushels_stored = next;
  return next;
}

export function applyBushelDelta(state: RunState, delta: number, receiptContext?: LedgerReceiptContextV1): number {
  const before = bushelBalance(state);
  const after = setBushelBalance(state, before + Math.trunc(delta));
  return finalizeLedgerDelta(state, "food_stores", before, after, receiptContext);
}

export function spendBushels(state: RunState, amount: number, receiptContext?: LedgerReceiptContextV1): number {
  const pay = Math.min(bushelBalance(state), normalizedAmount(amount));
  applyBushelDelta(state, -pay, receiptContext);
  return pay;
}

export function coinBalance(state: RunState): number {
  return asNonNegInt(state.manor.coin);
}

export function setCoinBalance(state: RunState, amount: number): number {
  const next = normalizedAmount(amount);
  state.manor.coin = next;
  return next;
}

export function canAffordCoin(state: RunState, amount: number): boolean {
  return coinBalance(state) >= normalizedAmount(amount);
}

export function applyCoinDelta(state: RunState, delta: number, receiptContext?: LedgerReceiptContextV1): number {
  const before = coinBalance(state);
  const after = setCoinBalance(state, before + Math.trunc(delta));
  return finalizeLedgerDelta(state, "coin", before, after, receiptContext);
}

export function spendCoin(state: RunState, amount: number, receiptContext?: LedgerReceiptContextV1): number {
  const pay = Math.min(coinBalance(state), normalizedAmount(amount));
  applyCoinDelta(state, -pay, receiptContext);
  return pay;
}

export function taxDueCoin(state: RunState): number {
  return asNonNegInt(obligations(state).tax_due_coin);
}

export function titheDueBushels(state: RunState): number {
  return asNonNegInt(obligations(state).tithe_due_bushels);
}

export function setTaxDueCoin(state: RunState, amount: number): number {
  const next = normalizedAmount(amount);
  obligations(state).tax_due_coin = next;
  return next;
}

export function setTitheDueBushels(state: RunState, amount: number): number {
  const next = normalizedAmount(amount);
  obligations(state).tithe_due_bushels = next;
  return next;
}

export function applyTaxDueCoinDelta(state: RunState, delta: number, receiptContext?: LedgerReceiptContextV1): number {
  const before = taxDueCoin(state);
  const after = setTaxDueCoin(state, before + Math.trunc(delta));
  return finalizeLedgerDelta(state, "tax_due_coin", before, after, receiptContext);
}

export function applyTitheDueBushelsDelta(state: RunState, delta: number, receiptContext?: LedgerReceiptContextV1): number {
  const before = titheDueBushels(state);
  const after = setTitheDueBushels(state, before + Math.trunc(delta));
  return finalizeLedgerDelta(state, "tithe_due_bushels", before, after, receiptContext);
}

export function spendTaxDueCoin(state: RunState, amount: number, receiptContext?: LedgerReceiptContextV1): number {
  const pay = Math.min(taxDueCoin(state), normalizedAmount(amount));
  if (pay <= 0) return 0;
  applyTaxDueCoinDelta(state, -pay, receiptContext);
  return pay;
}

export function spendTitheDueBushels(state: RunState, amount: number, receiptContext?: LedgerReceiptContextV1): number {
  const pay = Math.min(titheDueBushels(state), normalizedAmount(amount));
  if (pay <= 0) return 0;
  applyTitheDueBushelsDelta(state, -pay, receiptContext);
  return pay;
}

export function arrearsCoin(state: RunState): number {
  return asNonNegInt(obligations(state).arrears.coin);
}

export function arrearsBushels(state: RunState): number {
  return asNonNegInt(obligations(state).arrears.bushels);
}

export function setArrearsCoin(state: RunState, amount: number): number {
  const next = normalizedAmount(amount);
  obligations(state).arrears.coin = next;
  return next;
}

export function setArrearsBushels(state: RunState, amount: number): number {
  const next = normalizedAmount(amount);
  obligations(state).arrears.bushels = next;
  return next;
}

export function applyArrearsCoinDelta(state: RunState, delta: number, receiptContext?: LedgerReceiptContextV1): number {
  const before = arrearsCoin(state);
  const after = setArrearsCoin(state, before + Math.trunc(delta));
  return finalizeLedgerDelta(state, "arrears_coin", before, after, receiptContext);
}

export function applyArrearsBushelsDelta(state: RunState, delta: number, receiptContext?: LedgerReceiptContextV1): number {
  const before = arrearsBushels(state);
  const after = setArrearsBushels(state, before + Math.trunc(delta));
  return finalizeLedgerDelta(state, "arrears_bushels", before, after, receiptContext);
}

export function spendArrearsCoin(state: RunState, amount: number, receiptContext?: LedgerReceiptContextV1): number {
  const pay = Math.min(arrearsCoin(state), normalizedAmount(amount));
  if (pay <= 0) return 0;
  applyArrearsCoinDelta(state, -pay, receiptContext);
  return pay;
}

export function spendArrearsBushels(state: RunState, amount: number, receiptContext?: LedgerReceiptContextV1): number {
  const pay = Math.min(arrearsBushels(state), normalizedAmount(amount));
  if (pay <= 0) return 0;
  applyArrearsBushelsDelta(state, -pay, receiptContext);
  return pay;
}

export function rollTaxDueCoinIntoArrears(state: RunState, receiptContext?: LedgerTransferReceiptContextV1): number {
  const due = taxDueCoin(state);
  if (due > 0) {
    applyArrearsCoinDelta(state, due, receiptContext?.credit);
    spendTaxDueCoin(state, due, receiptContext?.debit);
  } else {
    setTaxDueCoin(state, 0);
  }
  return due;
}

export function rollTitheDueBushelsIntoArrears(state: RunState, receiptContext?: LedgerTransferReceiptContextV1): number {
  const due = titheDueBushels(state);
  if (due > 0) {
    applyArrearsBushelsDelta(state, due, receiptContext?.credit);
    spendTitheDueBushels(state, due, receiptContext?.debit);
  } else {
    setTitheDueBushels(state, 0);
  }
  return due;
}

export function setWarLevyDue(state: RunState, levy: WarLevyDue): void {
  obligations(state).war_levy_due = levy;
}

export function clearWarLevyDue(state: RunState): void {
  setWarLevyDue(state, null);
}
