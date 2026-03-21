import { clampInt } from "./util";

export function fertilityAnnualProbabilityByAge(ageYears: number): number {
  const age = clampInt(Math.trunc(ageYears), 0, 200);
  // v0.2.final profile target:
  // - meaningful teen fertility
  // - strongest 20-24 band
  // - 30-34 below 20-24
  // - sharp taper into 40s
  // - hard cutoff at 45+
  if (age < 14) return 0;
  if (age <= 17) return 0.16;
  if (age <= 22) return 0.25;
  if (age <= 27) return 0.26;
  if (age <= 32) return 0.2;
  if (age <= 37) return 0.12;
  if (age <= 42) return 0.02;
  return 0;
}

export function mortalityAnnualProbabilityByAge(ageYears: number): number {
  const age = clampInt(Math.trunc(ageYears), 0, 200);
  if (age === 0) return 0.21;
  if (age === 1) return 0.08;
  if (age === 2) return 0.03;
  if (age <= 4) return 0.015;
  if (age <= 9) return 0.008;
  if (age <= 14) return 0.005;
  if (age <= 19) return 0.007;
  if (age <= 29) return 0.01;
  if (age <= 39) return 0.013;
  if (age <= 49) return 0.02;
  if (age <= 59) return 0.044;
  if (age <= 69) return 0.09;
  if (age <= 79) return 0.18;
  if (age <= 89) return 0.3;
  if (age <= 99) return 0.42;
  return 0.75;
}
