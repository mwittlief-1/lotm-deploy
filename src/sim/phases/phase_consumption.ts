import { IMPROVEMENTS, hasImprovement } from "../../content/improvements";
import { canSpendEnergy, spendEnergy } from "../domains/court/energy";
import {
  applyConstructionWork,
  clearConstructionProject,
  hasActiveConstruction,
  startConstructionProject
} from "../domains/economy/construction";
import { applyBushelDelta, applyCoinDelta, canAffordCoin, setBushelBalance, spendBushels, spendCoin } from "../domains/economy/ledger";
import { Rng } from "../rng";
import type { RunState, TurnContext, TurnDecisions } from "../types";
import { asNonNegInt, clampInt } from "../util";
import {
  BASE_FERTILITY,
  BUILD_RATE_PER_BUILDER_PER_TURN,
  BUILDER_EXTRA_BUSHELS_PER_YEAR,
  BUSHELS_PER_FARMER_PER_YEAR,
  BUSHELS_PER_PERSON_PER_YEAR,
  DRAINAGE_WEATHER_SOFTEN_BONUS,
  MARKET_PRICE_MAX,
  MARKET_PRICE_MIN,
  SELL_CAP_FACTOR_MAX,
  SELL_CAP_FACTOR_MIN,
  SELL_MULT_MILL_EFFICIENCY,
  SPOILAGE_RATE_BASE,
  SPOILAGE_RATE_GRANARY,
  TURN_YEARS,
  UNREST_SHORTAGE_PENALTY,
  VILLAGE_FEAST_UNREST_REDUCTION,
  YIELD_MULT_DRAINAGE_DITCHES,
  YIELD_MULT_FIELD_ROTATION
} from "../constants";

function modsObj(state: RunState): Record<string, number> {
  const anyFlags: any = state.flags;
  if (!anyFlags._mods || typeof anyFlags._mods !== "object") anyFlags._mods = {};
  return anyFlags._mods as Record<string, number>;
}

function consumeMod(state: RunState, key: string, defaultValue = 1): number {
  const mods = modsObj(state);
  const v = typeof mods[key] === "number" ? (mods[key] as number) : defaultValue;
  delete mods[key];
  return v;
}

function currentSpoilageRate(state: RunState): number {
  if (hasImprovement(state.manor.improvements, "granary_upgrade")) return SPOILAGE_RATE_GRANARY;
  return SPOILAGE_RATE_BASE;
}

function stewardshipMultiplier(state: RunState): number {
  const s = state.house.head.traits.stewardship;
  return 1 + (s - 3) * 0.02;
}

function yieldMultiplier(state: RunState): number {
  let m = 1.0;
  if (hasImprovement(state.manor.improvements, "field_rotation")) m *= YIELD_MULT_FIELD_ROTATION;
  if (hasImprovement(state.manor.improvements, "drainage_ditches")) m *= YIELD_MULT_DRAINAGE_DITCHES;
  return m;
}

function sellMultiplier(state: RunState): number {
  let m = 1.0;
  if (hasImprovement(state.manor.improvements, "mill_efficiency")) m *= SELL_MULT_MILL_EFFICIENCY;
  return m;
}

export function applySpoilagePhase(state: RunState): { rate: number; loss_bushels: number } {
  const rateBase = currentSpoilageRate(state);
  const mult = consumeMod(state, "spoilage_mult", 1);
  const rate = Math.max(0, Math.min(0.25, rateBase * mult));
  const before = state.manor.bushels_stored;
  const after = asNonNegInt(Math.floor(before * (1 - rate)));
  setBushelBalance(state, after);
  return { rate, loss_bushels: before - after };
}

export function computeWeatherMarketPhase(
  state: RunState
): { weather_multiplier: number; market: { price_per_bushel: number; sell_cap_bushels: number } } {
  const t = state.turn_index;
  const wRng = new Rng(state.run_seed, "weather", t, "macro");
  const mRng = new Rng(state.run_seed, "market", t, "macro");
  let weather = 0.6 + wRng.next() * (1.25 - 0.6);
  weather *= consumeMod(state, "weather_mult", 1);
  if (hasImprovement(state.manor.improvements, "drainage_ditches") && weather < 1.0) {
    weather = Math.min(1.25, weather + DRAINAGE_WEATHER_SOFTEN_BONUS);
  }
  weather = Math.max(0.6, Math.min(1.25, weather));

  let price = MARKET_PRICE_MIN + mRng.next() * (MARKET_PRICE_MAX - MARKET_PRICE_MIN);
  price *= consumeMod(state, "market_price_mult", 1);
  price *= sellMultiplier(state);
  price = Math.max(0.01, price);

  const baseCap = Math.floor(state.manor.population * BUSHELS_PER_PERSON_PER_YEAR);
  const capFactor = (SELL_CAP_FACTOR_MIN + mRng.next() * (SELL_CAP_FACTOR_MAX - SELL_CAP_FACTOR_MIN))
    * consumeMod(state, "sell_cap_mult", 1);
  const sellCap = Math.max(0, Math.floor(baseCap * capFactor));

  return { weather_multiplier: weather, market: { price_per_bushel: price, sell_cap_bushels: sellCap } };
}

export function applyProductionAndConstructionPhase(
  state: RunState,
  weather_multiplier: number
): { production_bushels: number; construction_progress_added: number; completed_improvement_id?: string } {
  const farmerPenalty = Math.trunc(consumeMod(state, "farmer_penalty", 0));
  const effectiveFarmers = Math.max(0, state.manor.farmers - farmerPenalty);

  const baseProduction = effectiveFarmers * BUSHELS_PER_FARMER_PER_YEAR * TURN_YEARS;
  const prodMult = weather_multiplier
    * BASE_FERTILITY
    * stewardshipMultiplier(state)
    * yieldMultiplier(state)
    * consumeMod(state, "production_mult", 1);
  const production = Math.max(0, Math.floor(baseProduction * prodMult));
  applyBushelDelta(state, production);

  let progressAdded = 0;
  let completed: string | undefined;
  if (hasActiveConstruction(state)) {
    const outcome = applyConstructionWork(state, state.manor.builders * BUILD_RATE_PER_BUILDER_PER_TURN);
    progressAdded = outcome.progress_added;
    completed = outcome.completed_improvement_id;
    if (completed === "village_feast") {
      state.manor.unrest = clampInt(state.manor.unrest - VILLAGE_FEAST_UNREST_REDUCTION, 0, 100);
    }
  }

  return { production_bushels: production, construction_progress_added: progressAdded, completed_improvement_id: completed };
}

export function applyConsumptionAndShortagePhase(state: RunState, court_consumption_bushels: number): {
  consumption_bushels: number;
  peasant_consumption_bushels: number;
  court_consumption_bushels: number;
  total_consumption_bushels: number;
  shortage_bushels: number;
  population_delta: number;
  population_deaths: number;
  population_runaways: number;
  labor_auto_clamped?: boolean;
  labor_before?: { population: number; farmers: number; builders: number };
  labor_after?: { population: number; farmers: number; builders: number };
} {
  const pop = state.manor.population;
  const farmers = state.manor.farmers;
  const builders = state.manor.builders;
  const idle = Math.max(0, pop - farmers - builders);

  const peasantConsumption = Math.floor(
    (farmers * BUSHELS_PER_PERSON_PER_YEAR +
      builders * (BUSHELS_PER_PERSON_PER_YEAR + BUILDER_EXTRA_BUSHELS_PER_YEAR) +
      idle * BUSHELS_PER_PERSON_PER_YEAR) *
      TURN_YEARS
  );
  const courtConsumption = Math.max(0, Math.trunc(court_consumption_bushels));
  const consumption = asNonNegInt(peasantConsumption + courtConsumption);
  const before = state.manor.bushels_stored;
  if (before >= consumption) {
    spendBushels(state, consumption);
    return {
      consumption_bushels: consumption,
      peasant_consumption_bushels: peasantConsumption,
      court_consumption_bushels: courtConsumption,
      total_consumption_bushels: consumption,
      shortage_bushels: 0,
      population_delta: 0,
      population_deaths: 0,
      population_runaways: 0
    };
  }

  const shortage = consumption - before;
  setBushelBalance(state, 0);
  (state.flags as any).Shortage = true;
  state.manor.unrest = clampInt(state.manor.unrest + UNREST_SHORTAGE_PENALTY_SAFE(), 0, 100);

  const hRng = new Rng(state.run_seed, "household", state.turn_index, "shortage");
  const lossFrac = 0.03 + hRng.next() * 0.08;
  const lost = Math.max(1, Math.floor(state.manor.population * lossFrac));

  const sev01 = Math.max(0, Math.min(1, (lossFrac - 0.03) / 0.08));
  const deathFrac = 0.3 + sev01 * 0.2;
  const deaths = Math.min(lost, Math.floor(lost * deathFrac));
  const runaways = Math.max(0, lost - deaths);

  state.manor.population = asNonNegInt(state.manor.population - lost);
  let labor_before: { population: number; farmers: number; builders: number } | undefined;
  let labor_after: { population: number; farmers: number; builders: number } | undefined;
  let labor_auto_clamped: boolean | undefined;
  if (state.manor.farmers + state.manor.builders > state.manor.population) {
    labor_before = {
      population: asNonNegInt(state.manor.population),
      farmers: asNonNegInt(state.manor.farmers),
      builders: asNonNegInt(state.manor.builders)
    };
    const overflow = state.manor.farmers + state.manor.builders - state.manor.population;
    const bCut = Math.min(state.manor.builders, overflow);
    state.manor.builders -= bCut;
    const rem = overflow - bCut;
    if (rem > 0) state.manor.farmers = Math.max(0, state.manor.farmers - rem);

    labor_after = {
      population: asNonNegInt(state.manor.population),
      farmers: asNonNegInt(state.manor.farmers),
      builders: asNonNegInt(state.manor.builders)
    };
    labor_auto_clamped = labor_before.farmers !== labor_after.farmers || labor_before.builders !== labor_after.builders;
  }

  const res: {
    consumption_bushels: number;
    peasant_consumption_bushels: number;
    court_consumption_bushels: number;
    total_consumption_bushels: number;
    shortage_bushels: number;
    population_delta: number;
    population_deaths: number;
    population_runaways: number;
    labor_auto_clamped?: boolean;
    labor_before?: { population: number; farmers: number; builders: number };
    labor_after?: { population: number; farmers: number; builders: number };
  } = {
    consumption_bushels: consumption,
    peasant_consumption_bushels: peasantConsumption,
    court_consumption_bushels: courtConsumption,
    total_consumption_bushels: consumption,
    shortage_bushels: shortage,
    population_delta: -lost,
    population_deaths: deaths,
    population_runaways: runaways
  };

  if (labor_before && labor_after) {
    res.labor_auto_clamped = labor_auto_clamped;
    res.labor_before = labor_before;
    res.labor_after = labor_after;
  }
  return res;
}

function UNREST_SHORTAGE_PENALTY_SAFE(): number {
  return UNREST_SHORTAGE_PENALTY;
}

export function applyConstructionDecisionPhase(state: RunState, decisions: TurnDecisions, reportNotes: string[]): void {
  const d = decisions.construction;
  if (d.action === "none") return;

  if (d.action === "abandon") {
    if (!hasActiveConstruction(state)) return;
    if (!d.confirm) {
      reportNotes.push("Abandon project canceled.");
      return;
    }
    clearConstructionProject(state);
    reportNotes.push("Project abandoned; progress lost and coin not refunded.");
    return;
  }

  if (d.action === "start") {
    if (hasActiveConstruction(state)) {
      reportNotes.push("Cannot start a new project while construction is active. Abandon first.");
      return;
    }
    const def = IMPROVEMENTS[d.improvement_id];
    if (!def) {
      reportNotes.push("Invalid improvement selection.");
      return;
    }
    if (state.manor.improvements.includes(def.id)) {
      reportNotes.push("Improvement already completed.");
      return;
    }
    if (!canAffordCoin(state, def.coin_cost)) {
      reportNotes.push("Insufficient coin to start project.");
      return;
    }
    if (!canSpendEnergy(state, def.energy_cost)) {
      reportNotes.push("Insufficient energy to start project.");
      return;
    }
    spendCoin(state, def.coin_cost);
    spendEnergy(state, def.energy_cost);
    startConstructionProject(state, def.id, def.required);
    reportNotes.push(`Started construction: ${def.name} (cost ${def.coin_cost} coin).`);
  }
}

export function applyLaborDecisionPhase(state: RunState, decisions: TurnDecisions, maxShift: number, reportNotes: string[]): void {
  const desiredFarmers = Math.max(0, Math.trunc(decisions.labor.desired_farmers));
  const desiredBuilders = Math.max(0, Math.trunc(decisions.labor.desired_builders));

  if (desiredFarmers + desiredBuilders > state.manor.population) {
    reportNotes.push("Labor plan invalid (exceeds population); no change applied.");
    return;
  }

  const curF = state.manor.farmers;
  const curB = state.manor.builders;

  const dF = Math.abs(desiredFarmers - curF);
  const dB = Math.abs(desiredBuilders - curB);
  const totalShift = dF + dB;

  const oversubscribedNow = curF + curB > state.manor.population;

  if (!oversubscribedNow && totalShift > maxShift) {
    reportNotes.push(`Labor change exceeds cap (max ${maxShift}); no change applied.`);
    return;
  }

  if (totalShift > 0) {
    if (!canSpendEnergy(state, 1)) {
      reportNotes.push("No energy for labor plan; no change applied.");
      return;
    }
    spendEnergy(state, 1);
  }

  state.manor.farmers = clampInt(desiredFarmers, 0, state.manor.population);
  state.manor.builders = clampInt(desiredBuilders, 0, state.manor.population);
  reportNotes.push(`Labor plan set (takes effect next turn's production): farmers ${state.manor.farmers}, builders ${state.manor.builders}.`);
}

export function applySellDecisionPhase(state: RunState, ctx: TurnContext, decisions: TurnDecisions, reportNotes: string[]): void {
  const sell = Math.max(0, Math.trunc(decisions.sell.sell_bushels));
  if (sell <= 0) return;
  if (!canSpendEnergy(state, 1)) {
    reportNotes.push("No energy to sell.");
    return;
  }
  const cap = ctx.report.market.sell_cap_bushels;
  const allowed = Math.min(cap, sell);
  const sold = Math.min(state.manor.bushels_stored, allowed);
  spendBushels(state, sold);
  const earned = Math.floor(sold * ctx.report.market.price_per_bushel);
  applyCoinDelta(state, earned);
  spendEnergy(state, 1);

  reportNotes.push(`Sold ${sold} bushels (cap ${cap}) for +${earned} coin at ${ctx.report.market.price_per_bushel.toFixed(2)}/bushel.`);
  if (sell > allowed) reportNotes.push("Sell amount trimmed to market cap.");
}
