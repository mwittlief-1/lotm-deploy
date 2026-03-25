import type { RunState, WarLevyDue } from "../../types";
import { asNonNegInt } from "../../util";

function normalizedAmount(amount: number): number {
  return Math.max(0, Math.trunc(amount));
}

function obligations(state: RunState) {
  return state.manor.obligations;
}

export function bushelBalance(state: RunState): number {
  return asNonNegInt(state.manor.bushels_stored);
}

export function setBushelBalance(state: RunState, amount: number): number {
  const next = normalizedAmount(amount);
  state.manor.bushels_stored = next;
  return next;
}

export function applyBushelDelta(state: RunState, delta: number): number {
  const before = bushelBalance(state);
  const after = setBushelBalance(state, before + Math.trunc(delta));
  return after - before;
}

export function spendBushels(state: RunState, amount: number): number {
  const pay = Math.min(bushelBalance(state), normalizedAmount(amount));
  applyBushelDelta(state, -pay);
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

export function applyCoinDelta(state: RunState, delta: number): number {
  const before = coinBalance(state);
  const after = setCoinBalance(state, before + Math.trunc(delta));
  return after - before;
}

export function spendCoin(state: RunState, amount: number): number {
  const pay = Math.min(coinBalance(state), normalizedAmount(amount));
  applyCoinDelta(state, -pay);
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

export function applyTaxDueCoinDelta(state: RunState, delta: number): number {
  const before = taxDueCoin(state);
  const after = asNonNegInt(before + Math.trunc(delta));
  obligations(state).tax_due_coin = after;
  return after - before;
}

export function applyTitheDueBushelsDelta(state: RunState, delta: number): number {
  const before = titheDueBushels(state);
  const after = setTitheDueBushels(state, before + Math.trunc(delta));
  return after - before;
}

export function spendTaxDueCoin(state: RunState, amount: number): number {
  const pay = Math.min(taxDueCoin(state), normalizedAmount(amount));
  if (pay <= 0) return 0;
  applyTaxDueCoinDelta(state, -pay);
  return pay;
}

export function spendTitheDueBushels(state: RunState, amount: number): number {
  const pay = Math.min(titheDueBushels(state), normalizedAmount(amount));
  if (pay <= 0) return 0;
  applyTitheDueBushelsDelta(state, -pay);
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

export function applyArrearsCoinDelta(state: RunState, delta: number): number {
  const before = arrearsCoin(state);
  const after = setArrearsCoin(state, before + Math.trunc(delta));
  return after - before;
}

export function applyArrearsBushelsDelta(state: RunState, delta: number): number {
  const before = arrearsBushels(state);
  const after = setArrearsBushels(state, before + Math.trunc(delta));
  return after - before;
}

export function spendArrearsCoin(state: RunState, amount: number): number {
  const pay = Math.min(arrearsCoin(state), normalizedAmount(amount));
  if (pay <= 0) return 0;
  applyArrearsCoinDelta(state, -pay);
  return pay;
}

export function spendArrearsBushels(state: RunState, amount: number): number {
  const pay = Math.min(arrearsBushels(state), normalizedAmount(amount));
  if (pay <= 0) return 0;
  applyArrearsBushelsDelta(state, -pay);
  return pay;
}

export function rollTaxDueCoinIntoArrears(state: RunState): number {
  const due = taxDueCoin(state);
  if (due > 0) applyArrearsCoinDelta(state, due);
  setTaxDueCoin(state, 0);
  return due;
}

export function rollTitheDueBushelsIntoArrears(state: RunState): number {
  const due = titheDueBushels(state);
  if (due > 0) applyArrearsBushelsDelta(state, due);
  setTitheDueBushels(state, 0);
  return due;
}

export function setWarLevyDue(state: RunState, levy: WarLevyDue): void {
  obligations(state).war_levy_due = levy;
}

export function clearWarLevyDue(state: RunState): void {
  setWarLevyDue(state, null);
}
