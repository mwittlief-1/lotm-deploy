// src/sim/demographyCurves.ts
// Deterministic demographic curves used by both household and world simulation.
//
// Design goals (v0.2.x credibility gate):
// - Adult mortality rises with age (Gompertz-like).
// - Female fertility declines strongly after ~35 and approaches ~0 by late 40s.
//
// IMPORTANT: Keep these as pure functions (no RNG), so they are stable and testable.

import { clampInt } from "./util";

// --- Fertility ---

/**
 * Age-based fertility multiplier for female conception probability.
 * Returns a factor in [0, 1].
 *
 * Shape:
 * - <16: 0
 * - 16..30: ramps up to peak
 * - 30..35: gentle decline
 * - 35+: exponential decay; ~near-zero by ~48
 */
export function femaleFertilityAgeFactor(ageYears: number): number {
  if (!Number.isFinite(ageYears)) return 0;
  const age = clampInt(Math.trunc(ageYears), 0, 200);
  if (age < 16) return 0;
  if (age > 48) return 0;

  // Mirrors the piecewise curve used in v0.2.x demography:
  // 16..20: 0.25 -> 0.6
  if (age <= 20) {
    return 0.25 + (age - 16) * (0.35 / 4);
  }

  // 20..35: 0.6 -> 1.0 (peak)
  if (age <= 35) {
    return 0.6 + (age - 20) * (0.4 / 15);
  }

  // 35..40: 1.0 -> 0.25
  if (age <= 40) {
    return 1.0 - (age - 35) * (0.75 / 5);
  }

  // 40..45: 0.25 -> 0.07
  if (age <= 45) {
    return 0.25 - (age - 40) * (0.18 / 5);
  }

  // 45..48: 0.07 -> 0.01
  return 0.07 - (age - 45) * (0.06 / 3);
}

// --- Mortality ---

/**
 * Annual mortality hazard for adults (>= 15) using a Gompertz-like curve.
 * Returned value is a hazard rate per year (not a probability).
 */
export function adultMortalityHazardPerYear(ageYears: number): number {
  if (!Number.isFinite(ageYears)) return 0;
  const age = clampInt(Math.trunc(ageYears), 0, 200);
  // Anchor roughly at age 20.
  const a = 0.001; // hazard at ~20
  const b = Math.log(10) / 30; // ~0.0767; 10x hazard every 30y
  const x = age - 20;
  return a * Math.exp(b * x);
}

/**
 * Converts a per-year hazard into a per-turn probability over `turnYears`.
 * p = 1 - exp(-hazard * years)
 */
export function hazardToTurnProbability(hazardPerYear: number, turnYears: number): number {
  if (!Number.isFinite(hazardPerYear) || hazardPerYear <= 0) return 0;
  if (!Number.isFinite(turnYears) || turnYears <= 0) return 0;
  const p = 1 - Math.exp(-hazardPerYear * turnYears);
  return Math.max(0, Math.min(1, p));
}

/**
 * Mortality probability per turn (spans children + adults).
 * This is a gameplay-friendly approximation, not a full demographic model.
 */
export function mortalityProbabilityPerTurn(ageYears: number, turnYears: number): number {
  if (!Number.isFinite(ageYears)) return 0;
  const age = clampInt(Math.trunc(ageYears), 0, 200);

  // Child hazards (per year). These are intentionally higher than modern,
  // but still conservative vs medieval reality.
  let hazardPerYear = 0;
  if (age < 1) hazardPerYear = 0.12; // infant
  else if (age < 5) hazardPerYear = 0.02;
  else if (age < 15) hazardPerYear = 0.005;
  else hazardPerYear = adultMortalityHazardPerYear(age);

  return hazardToTurnProbability(hazardPerYear, turnYears);
}
