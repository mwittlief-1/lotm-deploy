import { setAvailableEnergy, setEnergyMax } from "./domains/court/energy";
import { normalizeConstructionState } from "./domains/economy/construction";
import { setArrearsBushels, setArrearsCoin, setBushelBalance, setCoinBalance, setTaxDueCoin, setTitheDueBushels } from "./domains/economy/ledger";
import { ensureStateSchemaScaffold } from "./stateSchema";
import type { RunState } from "./types";
import { asNonNegInt, clampInt } from "./util";

export function normalizeState(state: RunState): void {
  ensureStateSchemaScaffold(state);

  const m = state.manor;

  m.population = asNonNegInt(m.population);
  m.farmers = clampInt(asNonNegInt(m.farmers), 0, m.population);
  m.builders = clampInt(asNonNegInt(m.builders), 0, m.population);
  if (m.farmers + m.builders > m.population) {
    m.builders = Math.max(0, m.population - m.farmers);
  }

  setBushelBalance(state, m.bushels_stored);
  setCoinBalance(state, m.coin);
  m.unrest = clampInt(asNonNegInt(m.unrest), 0, 100);

  const ob = m.obligations;
  setTaxDueCoin(state, ob.tax_due_coin);
  setTitheDueBushels(state, ob.tithe_due_bushels);
  setArrearsCoin(state, ob.arrears.coin);
  setArrearsBushels(state, ob.arrears.bushels);

  normalizeConstructionState(state);

  const h = state.house;
  setEnergyMax(state, h.energy.max);
  setAvailableEnergy(state, h.energy.available);

  // relationship clamp
  for (const e of state.relationships) {
    e.allegiance = clampInt(asNonNegInt(e.allegiance), 0, 100);
    e.respect = clampInt(asNonNegInt(e.respect), 0, 100);
    e.threat = clampInt(asNonNegInt(e.threat), 0, 100);
  }

  // v0.2.6.2 RELEASE (LOCK): ensure runtime tuning defaults exist when absent.
  // This is configuration only (no RNG), so applying on load is deterministic.
  const anyFlags: any = state.flags as any;
  if (!anyFlags._tuning || typeof anyFlags._tuning !== "object") anyFlags._tuning = {};
  const t: any = anyFlags._tuning;
  const cv = t.court_variant;
  if (cv !== "A" && cv !== "B" && cv !== "C") t.court_variant = "B";
  if (!(typeof t.fertility_mult === "number" && Number.isFinite(t.fertility_mult))) t.fertility_mult = 2.0;
  if (!(typeof t.mortality_mult === "number" && Number.isFinite(t.mortality_mult))) t.mortality_mult = 0.8;
  if (!(typeof t.ai_marriage_intel_bonus_scale === "number" && Number.isFinite(t.ai_marriage_intel_bonus_scale) && t.ai_marriage_intel_bonus_scale >= 0)) {
    t.ai_marriage_intel_bonus_scale = 1.0;
  }
  if (!(typeof t.ai_prospect_intel_bonus_scale === "number" && Number.isFinite(t.ai_prospect_intel_bonus_scale) && t.ai_prospect_intel_bonus_scale >= 0)) {
    t.ai_prospect_intel_bonus_scale = 1.0;
  }
}
