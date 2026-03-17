import { clampInt } from "./util";

export function fertilityAnnualProbabilityByAge(ageYears: number): number {
  const age = clampInt(Math.trunc(ageYears), 0, 200);
  // v0.2.final profile target:
  // - meaningful teen fertility
  // - strongest 20-24 band
  // - 30-34 below 20-24
  // - sharp taper into 40s
  // - hard cutoff at 45+
  if (age < 16) return 0;
  if (age <= 19) return 0.16;
  if (age <= 24) return 0.27;
  if (age <= 29) return 0.24;
  if (age <= 34) return 0.18;
  if (age <= 39) return 0.09;
  if (age <= 44) return 0.015;
  return 0;
}

export function mortalityAnnualProbabilityByAge(ageYears: number): number {
  const age = clampInt(Math.trunc(ageYears), 0, 200);
  if (age === 0) return 0.18;
  if (age === 1) return 0.07;
  if (age === 2) return 0.03;
  if (age <= 4) return 0.015;
  if (age <= 9) return 0.008;
  if (age <= 14) return 0.005;
  if (age <= 19) return 0.007;
  if (age <= 29) return 0.01;
  if (age <= 39) return 0.013;
  if (age <= 49) return 0.02;
  if (age <= 59) return 0.04;
  if (age <= 69) return 0.08;
  if (age <= 79) return 0.15;
  if (age <= 89) return 0.26;
  if (age <= 99) return 0.38;
  return 0.55;
}
