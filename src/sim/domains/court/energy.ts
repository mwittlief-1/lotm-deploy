import type { RunState } from "../../types";
import { asNonNegInt, clampInt } from "../../util";

function normalizedCost(amount: number): number {
  return Math.max(0, Math.trunc(amount));
}

export function energyMax(state: RunState): number {
  return asNonNegInt(state.house.energy.max);
}

export function setEnergyMax(state: RunState, amount: number): number {
  const next = asNonNegInt(amount);
  state.house.energy.max = next;
  setAvailableEnergy(state, state.house.energy.available);
  return next;
}

export function availableEnergy(state: RunState): number {
  return clampInt(asNonNegInt(state.house.energy.available), 0, energyMax(state));
}

export function setAvailableEnergy(state: RunState, amount: number): number {
  const next = clampInt(asNonNegInt(amount), 0, energyMax(state));
  state.house.energy.available = next;
  return next;
}

export function refreshEnergy(state: RunState): number {
  return setAvailableEnergy(state, energyMax(state));
}

export function canSpendEnergy(state: RunState, amount: number): boolean {
  return availableEnergy(state) >= normalizedCost(amount);
}

export function spendEnergy(state: RunState, amount: number): number {
  const spend = Math.min(availableEnergy(state), normalizedCost(amount));
  setAvailableEnergy(state, availableEnergy(state) - spend);
  return spend;
}
