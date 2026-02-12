import type {
  RunState,
  TurnContext,
  TurnDecisions,
  TurnReport,
  EventResult,
  MarriageWindow,
  MarriageOffer,
  Person,
  RunSnapshot} from "./types";
import {
Rng } from "./rng";
import { deepCopy, clampInt, asNonNegInt } from "./util";
import {
  TURN_YEARS,
  BUSHELS_PER_FARMER_PER_YEAR,
  BUSHELS_PER_PERSON_PER_YEAR,
  BASE_FERTILITY,
  SPOILAGE_RATE_BASE,
  SPOILAGE_RATE_GRANARY,
  MARKET_PRICE_MIN,
  MARKET_PRICE_MAX,
  SELL_CAP_FACTOR_MIN,
  SELL_CAP_FACTOR_MAX,
  BUILD_RATE_PER_BUILDER_PER_TURN,
  BUILDER_EXTRA_BUSHELS_PER_YEAR,
  UNREST_SHORTAGE_PENALTY,
  UNREST_ARREARS_PENALTY,
  UNREST_BASELINE_DECAY_WHEN_STABLE,
  EVENTS_PER_TURN_PROBS,
  maxLaborDeltaPerTurn,
  MORTALITY_MULT_WITH_PHYSICIAN,
  BIRTH_CHANCE_BY_FERTILITY,
  BIRTH_FERTILE_AGE_MIN,
  BIRTH_FERTILE_AGE_MAX,
  MORTALITY_P_UNDER16,
  MORTALITY_P_UNDER40,
  MORTALITY_P_UNDER55,
  MORTALITY_P_UNDER65,
  MORTALITY_P_65PLUS,
  YIELD_MULT_FIELD_ROTATION,
  YIELD_MULT_DRAINAGE_DITCHES,
  SELL_MULT_MILL_EFFICIENCY,
  DRAINAGE_WEATHER_SOFTEN_BONUS,
  VILLAGE_FEAST_UNREST_REDUCTION
} from "./constants";
import { normalizeState } from "./normalize";
import { EVENT_DECK } from "../content/events";
import { IMPROVEMENTS, hasImprovement } from "../content/improvements";
import { adjustEdge, relationshipBounds } from "./relationships";

function modsObj(state: RunState): Record<string, number> {
  const anyFlags: any = state.flags;
  if (!anyFlags._mods || typeof anyFlags._mods !== "object") anyFlags._mods = {};
  return anyFlags._mods as Record<string, number>;
}
function cooldownsObj(state: RunState): Record<string, number> {
  const anyFlags: any = state.flags;
  if (!anyFlags._cooldowns || typeof anyFlags._cooldowns !== "object") anyFlags._cooldowns = {};
  return anyFlags._cooldowns as Record<string, number>;
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
  // small, legible
  return 1 + (s - 3) * 0.02; // L1=-0.04 ... L5=+0.04
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

function decrementCooldowns(state: RunState): void {
  const cd = cooldownsObj(state);
  for (const k of Object.keys(cd)) {
    cd[k] = Math.max(0, Math.trunc((cd[k] ?? 0) - 1));
    if (cd[k] === 0) delete cd[k];
  }
}

function chooseEventCount(rng: Rng): 0 | 1 | 2 {
  const r = rng.next();
  let acc = 0;
  for (const { k, p } of EVENTS_PER_TURN_PROBS) {
    acc += p;
    if (r < acc) return k;
  }
  return 1;
}

function weightedPick<T>(rng: Rng, items: Array<{ item: T; weight: number }>): { picked: T; roll: number; total: number } {
  const total = items.reduce((s, it) => s + it.weight, 0);
  if (total <= 0) throw new Error("weightedPick: total weight <= 0");
  const x = rng.next() * total;
  let acc = 0;
  for (const it of items) {
    acc += it.weight;
    if (x <= acc) return { picked: it.item, roll: x / total, total };
  }
  return { picked: items[items.length - 1]!.item, roll: x / total, total };
}

function computeHeirId(state: RunState): string | null {
  // male-preference primogeniture among children
  const kids = state.house.children.filter((c) => c.alive);
  const males = kids.filter((c) => c.sex === "M").sort((a, b) => b.age - a.age);
  const females = kids.filter((c) => c.sex === "F").sort((a, b) => b.age - a.age);
  const heir = (males[0] ?? females[0]) ?? null;
  state.house.heir_id = heir ? heir.id : null;
  return state.house.heir_id ?? null;
}


function boundedSnapshot(state: RunState): RunSnapshot {
  // LOCKED (v0.0.5 QA blocker fix): snapshots must never contain `log` (or nested history).
  // Keep only the minimal state needed for debugging.
  return deepCopy({
    turn_index: state.turn_index,
    manor: state.manor,
    house: state.house,
    relationships: state.relationships,
    flags: state.flags,
    game_over: state.game_over ?? null
  });
}


function applySpoilage(state: RunState): { rate: number; loss_bushels: number } {
  const rateBase = currentSpoilageRate(state);
  const mult = consumeMod(state, "spoilage_mult", 1);
  const rate = Math.max(0, Math.min(0.25, rateBase * mult));
  const before = state.manor.bushels_stored;
  const after = asNonNegInt(Math.floor(before * (1 - rate)));
  state.manor.bushels_stored = after;
  return { rate, loss_bushels: before - after };
}

function computeWeatherMarket(state: RunState): { weather_multiplier: number; market: { price_per_bushel: number; sell_cap_bushels: number } } {
  const t = state.turn_index;
  const wRng = new Rng(state.run_seed, "weather", t, "macro");
  const mRng = new Rng(state.run_seed, "market", t, "macro");
  let weather = 0.6 + wRng.next() * (1.25 - 0.6);
  // Apply one-turn mod
  weather *= consumeMod(state, "weather_mult", 1);
  if (hasImprovement(state.manor.improvements, "drainage_ditches") && weather < 1.0) {
    weather = Math.min(1.25, weather + DRAINAGE_WEATHER_SOFTEN_BONUS);
  }
  weather = Math.max(0.6, Math.min(1.25, weather));

  let price = MARKET_PRICE_MIN + mRng.next() * (MARKET_PRICE_MAX - MARKET_PRICE_MIN);
  price *= consumeMod(state, "market_price_mult", 1);
  price *= sellMultiplier(state);
  price = Math.max(0.01, price);

  const baseCap = Math.floor(state.manor.population * BUSHELS_PER_PERSON_PER_YEAR); // one year of local demand
  const capFactor = (SELL_CAP_FACTOR_MIN + mRng.next() * (SELL_CAP_FACTOR_MAX - SELL_CAP_FACTOR_MIN)) * consumeMod(state, "sell_cap_mult", 1);
  const sellCap = Math.max(0, Math.floor(baseCap * capFactor));

  return { weather_multiplier: weather, market: { price_per_bushel: price, sell_cap_bushels: sellCap } };
}

function applyProductionAndConstruction(state: RunState, weather_multiplier: number): { production_bushels: number; construction_progress_added: number; completed_improvement_id?: string } {
  // production uses current farmers (set last turn)
  const farmerPenalty = Math.trunc(consumeMod(state, "farmer_penalty", 0));
  const effectiveFarmers = Math.max(0, state.manor.farmers - farmerPenalty);

  const baseProduction = effectiveFarmers * BUSHELS_PER_FARMER_PER_YEAR * TURN_YEARS;
  const prodMult = weather_multiplier * BASE_FERTILITY * stewardshipMultiplier(state) * yieldMultiplier(state) * consumeMod(state, "production_mult", 1);
  const production = Math.max(0, Math.floor(baseProduction * prodMult));
  state.manor.bushels_stored = asNonNegInt(state.manor.bushels_stored + production);

  // Construction progress uses current builders.
  let progressAdded = 0;
  let completed: string | undefined = undefined;
  if (state.manor.construction) {
    progressAdded = state.manor.builders * BUILD_RATE_PER_BUILDER_PER_TURN;
    state.manor.construction.progress = asNonNegInt(state.manor.construction.progress + progressAdded);
    if (state.manor.construction.progress >= state.manor.construction.required) {
      completed = state.manor.construction.improvement_id;
      state.manor.improvements.push(completed);
      state.manor.construction = null;

      // Completion effects (existing mechanics; numeric only)
      if (completed === "village_feast") {
        state.manor.unrest = clampInt(state.manor.unrest - VILLAGE_FEAST_UNREST_REDUCTION, 0, 100);
      }
    }
  }

  return { production_bushels: production, construction_progress_added: progressAdded, completed_improvement_id: completed };
}

function applyConsumptionAndShortage(state: RunState): { consumption_bushels: number; shortage_bushels: number; population_delta: number } {
  const pop = state.manor.population;
  const farmers = state.manor.farmers;
  const builders = state.manor.builders;
  const idle = Math.max(0, pop - farmers - builders);

  const consumption = Math.floor((farmers * BUSHELS_PER_PERSON_PER_YEAR + builders * (BUSHELS_PER_PERSON_PER_YEAR + BUILDER_EXTRA_BUSHELS_PER_YEAR) + idle * BUSHELS_PER_PERSON_PER_YEAR) * TURN_YEARS);
  const before = state.manor.bushels_stored;
  if (before >= consumption) {
    state.manor.bushels_stored = asNonNegInt(before - consumption);
    return { consumption_bushels: consumption, shortage_bushels: 0, population_delta: 0 };
  }

  const shortage = consumption - before;
  state.manor.bushels_stored = 0;

  // shortage consequences
  (state.flags as any).Shortage = true;
  state.manor.unrest = clampInt(state.manor.unrest + UNREST_SHORTAGE_PENALALTY_SAFE(), 0, 100);

  const hRng = new Rng(state.run_seed, "household", state.turn_index, "shortage");
  const lossFrac = 0.03 + hRng.next() * 0.08; // 3%..11%
  const lost = Math.max(1, Math.floor(state.manor.population * lossFrac));
  state.manor.population = asNonNegInt(state.manor.population - lost);
  if (state.manor.farmers + state.manor.builders > state.manor.population) {
    // remove from builders first (construction labor tends to flee first)
    const overflow = state.manor.farmers + state.manor.builders - state.manor.population;
    const bCut = Math.min(state.manor.builders, overflow);
    state.manor.builders -= bCut;
    const rem = overflow - bCut;
    if (rem > 0) state.manor.farmers = Math.max(0, state.manor.farmers - rem);
  }

  return { consumption_bushels: consumption, shortage_bushels: shortage, population_delta: -lost };
}

// small helper to keep constant name typo-proof in this file
function UNREST_SHORTAGE_PENALALTY_SAFE(): number {
  return UNREST_SHORTAGE_PENALTY;
}

function applyObligationsAndArrearsPenalty(state: RunState, production_bushels: number): void {
  const ob = state.manor.obligations;

  // penalties only on existing arrears (WP-02 lock)
  if (ob.arrears.coin > 0 || ob.arrears.bushels > 0) {
    state.manor.unrest = clampInt(state.manor.unrest + UNREST_ARREARS_PENALTY, 0, 100);
    // liege reacts to arrears
    adjustEdge(state, state.locals.liege.id, state.house.head.id, { respect: -2, threat: +2 });
  }

  // compute current dues (player can pay during decisions)
  ob.tax_due_coin = Math.max(1, Math.floor(state.manor.population / 25));
  ob.tithe_due_bushels = Math.floor(production_bushels * 0.05);
}

function relationshipDrift(state: RunState): void {
  for (const e of state.relationships) {
    // drift 1 point toward baseline
    const baseA = 50, baseR = 50, baseT = 20;
    e.allegiance += e.allegiance < baseA ? 1 : e.allegiance > baseA ? -1 : 0;
    e.respect += e.respect < baseR ? 1 : e.respect > baseR ? -1 : 0;
    e.threat += e.threat < baseT ? 1 : e.threat > baseT ? -1 : 0;
    e.allegiance = clampInt(e.allegiance, 0, 100);
    e.respect = clampInt(e.respect, 0, 100);
    e.threat = clampInt(e.threat, 0, 100);
  }
}

function householdPhase(state: RunState): { births: string[]; deaths: string[]; population_delta: number } {
  const births: string[] = [];
  const deaths: string[] = [];
  let popDelta = 0;

  // age key people + children by 3 years (turn)
  const people: Person[] = [state.house.head];
  if (state.house.spouse) people.push(state.house.spouse);
  for (const c of state.house.children) people.push(c);
  for (const p of people) p.age += 3;

  // deaths (simple): older increases risk; physician reduces risk.
  const hasPhysician = hasImprovement(state.manor.improvements, "physician");
  const mult = hasPhysician ? MORTALITY_MULT_WITH_PHYSICIAN : 1.0;
  const r = new Rng(state.run_seed, "household", state.turn_index, "mortality");

  function deathRoll(p: Person): boolean {
    if (!p.alive) return false;
    let base = 0.0;
    if (p.age < 16) base = MORTALITY_P_UNDER16;
    else if (p.age < 40) base = MORTALITY_P_UNDER40;
    else if (p.age < 55) base = MORTALITY_P_UNDER55;
    else if (p.age < 65) base = MORTALITY_P_UNDER65;
    else base = MORTALITY_P_65PLUS;
    // discipline reduces risk slightly
    base *= 1 - (p.traits.discipline - 3) * 0.01;
    base *= mult;
    return r.fork(`d:${p.id}`).bool(base);
  }

  for (const p of people) {
    if (deathRoll(p)) {
      p.alive = false;
      deaths.push(`${p.name} (${p.id})`);
      if (p.id === state.house.head.id) {
        // handled in end-of-turn succession
      }
    }
  }

  // births: only if spouse exists + spouse_status is spouse
  if (state.house.spouse && state.house.spouse.alive && state.house.spouse_status === "spouse" && state.house.head.alive) {
    const spouse = state.house.spouse;
    const fertileAge = spouse.age >= BIRTH_FERTILE_AGE_MIN && spouse.age <= BIRTH_FERTILE_AGE_MAX;
    if (fertileAge) {
      const fert = clampInt(spouse.traits.fertility, 1, 5);
      const base = BIRTH_CHANCE_BY_FERTILITY[fert] ?? 0.24;
      const mods = (state.flags as any)._mods ?? {};
      const bonus = typeof mods.birth_bonus === "number" ? mods.birth_bonus : 1;
      const chance = Math.min(0.95, Math.max(0, base * bonus));
      const bRng = new Rng(state.run_seed, "household", state.turn_index, "birth");
      if (bRng.bool(chance)) {
        const childId = `p_child_${state.turn_index}_${state.house.children.length + 1}`;
        const sex = bRng.bool(0.52) ? "M" : "F";
        const baby: Person = {
          id: childId,
          name: sex === "M" ? "Thomas" : "Anne",
          sex,
          age: 0,
          alive: true,
          traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
          married: false
        };
        state.house.children.push(baby);
        births.push(`${baby.name} (${baby.id})`);
        // population increases too (abstract)
        state.manor.population = asNonNegInt(state.manor.population + 1);
        popDelta += 1;
      }
    }
  }

  return { births, deaths, population_delta: popDelta };
}

function buildMarriageWindow(state: RunState): MarriageWindow | null {
  // Trigger when any child >=15 and unmarried OR an offer flag exists.
  const anyFlags: any = state.flags;
  const forced = Boolean(anyFlags.MarriageOffer);
  const eligible = state.house.children.filter((c) => c.alive && !c.married && c.age >= 15);
  if (!forced && eligible.length === 0) return null;

  const rng = new Rng(state.run_seed, "marriage", state.turn_index, "offers");
  const offers: MarriageOffer[] = [];
  const offerCount = 2 + (rng.bool(0.4) ? 1 : 0);

  for (let i = 0; i < offerCount; i++) {
    const noble = rng.pick(state.locals.nobles);
    const quality = rng.next(); // 0..1
    const dowry = Math.trunc(-4 + quality * 12) - (rng.bool(0.2) ? rng.int(0, 3) : 0); // -4..+8-ish
    offers.push({
      house_person_id: noble.id,
      house_label: noble.name,
      dowry_coin_net: dowry,
      relationship_delta: { respect: Math.trunc(2 + quality * 6), allegiance: Math.trunc(1 + quality * 4), threat: Math.trunc(-1 - quality * 2) },
      liege_delta: rng.bool(0.35) ? { respect: 1, threat: -1 } : null,
      risk_tags: [
        quality > 0.75 ? "prestige" : quality < 0.25 ? "shady" : "plain",
        dowry < 0 ? "costly" : "profitable"
      ]
    });
  }

  return { eligible_child_ids: eligible.map((c) => c.id), offers };
}

function applyEvents(state: RunState): EventResult[] {
  const t = state.turn_index;
  const rng = new Rng(state.run_seed, "events", t, "select");
  const cd = cooldownsObj(state);

  const k = chooseEventCount(rng.fork("count"));
  if (k === 0) return [];

  const eligible: Array<{ def: typeof EVENT_DECK[number]; weight: number; notes: string[] }> = [];
  for (const def of EVENT_DECK) {
    if (cd[def.id]) continue;
    const { weight, notes } = def.getWeight(state);
    if (weight > 0) eligible.push({ def, weight, notes });
  }
  if (eligible.length === 0) return [];

  const picked: typeof eligible = [];
  const local = eligible.slice();
  const results: EventResult[] = [];

  for (let i = 0; i < k && local.length > 0; i++) {
    const items = local.map((x) => ({ item: x, weight: x.weight }));
    const pick = weightedPick(rng.fork(`pick${i}`), items);
    const idx = local.findIndex((x) => x === pick.picked);
    const chosen = local.splice(idx, 1)[0]!;
    picked.push(chosen);

    // Apply and log deltas
    const before = {
      bushels: state.manor.bushels_stored,
      coin: state.manor.coin,
      unrest: state.manor.unrest,
      population: state.manor.population,
      tax_due_coin: state.manor.obligations.tax_due_coin,
      tithe_due_bushels: state.manor.obligations.tithe_due_bushels,
      arrears_coin: state.manor.obligations.arrears.coin,
      arrears_bushels: state.manor.obligations.arrears.bushels,
      construction_progress: state.manor.construction ? state.manor.construction.progress : 0
    };

    const effects = chosen.def.apply(state, rng.fork(`apply:${chosen.def.id}`));

    const after = {
      bushels: state.manor.bushels_stored,
      coin: state.manor.coin,
      unrest: state.manor.unrest,
      population: state.manor.population,
      tax_due_coin: state.manor.obligations.tax_due_coin,
      tithe_due_bushels: state.manor.obligations.tithe_due_bushels,
      arrears_coin: state.manor.obligations.arrears.coin,
      arrears_bushels: state.manor.obligations.arrears.bushels,
      construction_progress: state.manor.construction ? state.manor.construction.progress : 0
    };

    const deltas = (Object.keys(before) as Array<keyof typeof before>).map((k2) => ({
      key: k2 as any,
      before: before[k2],
      after: after[k2],
      diff: after[k2] - before[k2]
    })).filter((d) => d.diff !== 0);

    // set cooldown
    cd[chosen.def.id] = chosen.def.cooldown;

    results.push({
      id: chosen.def.id,
      title: chosen.def.title,
      category: chosen.def.category,
      why: {
        weight: chosen.weight,
        roll: pick.roll,
        notes: [
          `Selected from ${eligible.length} eligible events (cap=2).`,
          `Weight≈${chosen.weight.toFixed(2)} (relative p≈${(chosen.weight / pick.total).toFixed(2)}).`,
          `State@trigger: bushels=${before.bushels}, coin=${before.coin}, unrest=${before.unrest}, pop=${before.population}, arrears_coin=${before.arrears_coin}, arrears_bushels=${before.arrears_bushels}.`,
          `Cooldown: ${chosen.def.cooldown} turns.`,
          ...chosen.notes
        ]
      },
      effects,
      deltas
    });
  }

  return results;
}

function computeTopDrivers(report: TurnReport, before: RunState, after: RunState): string[] {
  const drivers: Array<{ label: string; score: number; text: string }> = [];

  const bushelDiff = after.manor.bushels_stored - before.manor.bushels_stored;
  const unrestDiff = after.manor.unrest - before.manor.unrest;
  const coinDiff = after.manor.coin - before.manor.coin;
  const arrearsCoinDiff = after.manor.obligations.arrears.coin - before.manor.obligations.arrears.coin;
  const arrearsBushelDiff = after.manor.obligations.arrears.bushels - before.manor.obligations.arrears.bushels;

  drivers.push({
    label: "Food",
    score: Math.abs(bushelDiff),
    text: `Food: prod +${report.production_bushels}, cons -${report.consumption_bushels}, spoil -${report.spoilage.loss_bushels}, net ${bushelDiff >= 0 ? "+" : ""}${bushelDiff}.`
  });
  drivers.push({
    label: "Unrest",
    score: Math.abs(unrestDiff),
    text: `Unrest: net ${unrestDiff >= 0 ? "+" : ""}${unrestDiff} (threshold dispossession at 100).`
  });
  drivers.push({
    label: "Obligations",
    score: Math.abs(arrearsCoinDiff) * 20 + Math.abs(arrearsBushelDiff),
    text: `Obligations: tax due ${report.obligations.tax_due_coin}, tithe due ${report.obligations.tithe_due_bushels}, arrears Δ coin ${arrearsCoinDiff >= 0 ? "+" : ""}${arrearsCoinDiff}, bushels ${arrearsBushelDiff >= 0 ? "+" : ""}${arrearsBushelDiff}.`
  });
  drivers.push({
    label: "Coin",
    score: Math.abs(coinDiff),
    text: `Coin: net ${coinDiff >= 0 ? "+" : ""}${coinDiff}.`
  });
  drivers.sort((a, b) => b.score - a.score);
  return drivers.slice(0, 3).map((d) => d.text);
}

export function proposeTurn(state: RunState): TurnContext {
  if (state.game_over) {
    return {
      preview_state: deepCopy(state),
      report: {
        turn_index: state.turn_index,
        weather_multiplier: 1,
        market: { price_per_bushel: 0.1, sell_cap_bushels: 0 },
        spoilage: { rate: 0, loss_bushels: 0 },
        production_bushels: 0,
        consumption_bushels: 0,
        shortage_bushels: 0,
        construction: { progress_added: 0, completed_improvement_id: null },
        obligations: {
          tax_due_coin: state.manor.obligations.tax_due_coin,
          tithe_due_bushels: state.manor.obligations.tithe_due_bushels,
          arrears_coin: state.manor.obligations.arrears.coin,
          arrears_bushels: state.manor.obligations.arrears.bushels,
          war_levy_due: state.manor.obligations.war_levy_due
        },
        household: { births: [], deaths: [], population_delta: 0 },
        events: [],
        top_drivers: ["Game over."],
        notes: []
      },
      marriage_window: null,
      max_labor_shift: 0
    };
  }

  const working = deepCopy(state);

  // 1) restore energy; compute heir
  working.house.energy.available = working.house.energy.max;
  computeHeirId(working);

  // 2) macro env shift
  decrementCooldowns(working);
  const spoil = applySpoilage(working);
  const macro = computeWeatherMarket(working);

  // 3) production (+ construction progress)
  const prod = applyProductionAndConstruction(working, macro.weather_multiplier);

  // 4) consumption
  const cons = applyConsumptionAndShortage(working);

  // 5) obligations
  applyObligationsAndArrearsPenalty(working, prod.production_bushels);

  // 6) relationship drift
  relationshipDrift(working);

  // 7) household (births/deaths)
  const hh = householdPhase(working);

  // 8) event engine (independent)
  const events = applyEvents(working);

  normalizeState(working);

  const report: TurnReport = {
    turn_index: state.turn_index,
    weather_multiplier: macro.weather_multiplier,
    market: macro.market,
    spoilage: spoil,
    production_bushels: prod.production_bushels,
    consumption_bushels: cons.consumption_bushels,
    shortage_bushels: cons.shortage_bushels,
    construction: { progress_added: prod.construction_progress_added, completed_improvement_id: prod.completed_improvement_id ?? null },
    obligations: {
      tax_due_coin: working.manor.obligations.tax_due_coin,
      tithe_due_bushels: working.manor.obligations.tithe_due_bushels,
      arrears_coin: working.manor.obligations.arrears.coin,
      arrears_bushels: working.manor.obligations.arrears.bushels,
      war_levy_due: working.manor.obligations.war_levy_due
    },
    household: { births: hh.births, deaths: hh.deaths, population_delta: cons.population_delta + hh.population_delta },
    events,
    top_drivers: [],
    notes: []
  };

  report.top_drivers = computeTopDrivers(report, state, working);

  const marriageWindow = buildMarriageWindow(working);

  const maxShift = maxLaborDeltaPerTurn(working.manor.population);

  return { preview_state: working, report, marriage_window: marriageWindow, max_labor_shift: maxShift };
}

function payCoin(state: RunState, amount: number): number {
  const pay = Math.min(state.manor.coin, Math.max(0, Math.trunc(amount)));
  state.manor.coin = asNonNegInt(state.manor.coin - pay);
  return pay;
}
function payBushels(state: RunState, amount: number): number {
  const pay = Math.min(state.manor.bushels_stored, Math.max(0, Math.trunc(amount)));
  state.manor.bushels_stored = asNonNegInt(state.manor.bushels_stored - pay);
  return pay;
}

function applyObligationPaymentsAndPenalties(state: RunState, decisions: TurnDecisions, reportNotes: string[]): void {
  const ob = state.manor.obligations;

  // Pay arrears first
  let coinPay = payCoin(state, decisions.obligations.pay_coin);
  let bushelPay = payBushels(state, decisions.obligations.pay_bushels);

  // Apply to arrears
  const arrearsCoinBefore = ob.arrears.coin;
  const arrearsBushelsBefore = ob.arrears.bushels;
  const toArrearsCoin = Math.min(ob.arrears.coin, coinPay);
  ob.arrears.coin = asNonNegInt(ob.arrears.coin - toArrearsCoin);
  coinPay = asNonNegInt(coinPay - toArrearsCoin);

  const toArrearsBushels = Math.min(ob.arrears.bushels, bushelPay);
  ob.arrears.bushels = asNonNegInt(ob.arrears.bushels - toArrearsBushels);
  bushelPay = asNonNegInt(bushelPay - toArrearsBushels);

  // Then apply to current dues (any remaining pay after arrears)
  const toTax = Math.min(ob.tax_due_coin, coinPay);
  ob.tax_due_coin = asNonNegInt(ob.tax_due_coin - toTax);
  coinPay = asNonNegInt(coinPay - toTax);

  const toTithe = Math.min(ob.tithe_due_bushels, bushelPay);
  ob.tithe_due_bushels = asNonNegInt(ob.tithe_due_bushels - toTithe);
  bushelPay = asNonNegInt(bushelPay - toTithe);

  if (arrearsCoinBefore > 0 || arrearsBushelsBefore > 0) {
    reportNotes.push(`Paid arrears: coin -${toArrearsCoin}, bushels -${toArrearsBushels}.`);
  }
  if (toTax > 0 || toTithe > 0) {
    reportNotes.push(`Paid current dues: tax -${toTax} coin, tithe -${toTithe} bushels.`);
  }

  // War levy handling (WP-07 auto fallback)
  if (ob.war_levy_due && ob.war_levy_due.kind === "men_or_coin") {
    const levy = ob.war_levy_due;
    const choice = decisions.obligations.war_levy_choice ?? "ignore";
    if (choice === "men") {
      // men reduces farmers next turn
      const mods = modsObj(state);
      mods["farmer_penalty"] = (mods["farmer_penalty"] ?? 0) + levy.men;
      ob.war_levy_due = null;
      adjustEdge(state, state.locals.liege.id, state.house.head.id, { respect: +2, threat: -2 });
      reportNotes.push(`War levy answered with men: -${levy.men} effective farmers next turn.`);
    } else if (choice === "coin") {
      const paid = payCoin(state, levy.coin);
      const remaining = levy.coin - paid;
      if (remaining <= 0) {
        ob.war_levy_due = null;
        adjustEdge(state, state.locals.liege.id, state.house.head.id, { respect: +2, threat: -2 });
        reportNotes.push(`War levy paid in coin: -${levy.coin} coin.`);
      } else {
        // fallback to men proportional to remaining coin
        const menNeeded = Math.ceil(levy.men * (remaining / levy.coin));
        const availableMen = Math.max(0, state.manor.farmers); // simplistic availability
        if (availableMen >= menNeeded) {
          const mods = modsObj(state);
          mods["farmer_penalty"] = (mods["farmer_penalty"] ?? 0) + menNeeded;
          ob.war_levy_due = null;
          adjustEdge(state, state.locals.liege.id, state.house.head.id, { respect: +1, threat: -1 });
          reportNotes.push(`War levy coin shortfall: paid ${paid}/${levy.coin} coin; covered remainder with men (-${menNeeded} effective farmers next turn).`);
        } else {
          // refusal
          adjustEdge(state, state.locals.liege.id, state.house.head.id, { respect: -4, threat: +6 });
          reportNotes.push(`War levy NOT met: paid ${paid}/${levy.coin} coin; insufficient men. Liege anger rises.`);
        }
      }
    } else {
      // ignore => refusal
      adjustEdge(state, state.locals.liege.id, state.house.head.id, { respect: -3, threat: +5 });
      reportNotes.push("War levy ignored; liege displeased.");
    }
  }
}

function applyConstructionDecision(state: RunState, decisions: TurnDecisions, reportNotes: string[]): void {
  const d = decisions.construction;
  if (d.action === "none") return;

  if (d.action === "abandon") {
    if (!state.manor.construction) return;
    if (!d.confirm) {
      reportNotes.push("Abandon project canceled.");
      return;
    }
    // WP-06: abandon is lossy; progress lost; coin not refunded.
    state.manor.construction = null;
    reportNotes.push("Project abandoned; progress lost and coin not refunded.");
    return;
  }

  if (d.action === "start") {
    // disallow selecting a new project if one is active (WP-06)
    if (state.manor.construction) {
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
    if (state.manor.coin < def.coin_cost) {
      reportNotes.push("Insufficient coin to start project.");
      return;
    }
    if (state.house.energy.available < def.energy_cost) {
      reportNotes.push("Insufficient energy to start project.");
      return;
    }
    state.manor.coin = asNonNegInt(state.manor.coin - def.coin_cost);
    state.house.energy.available = clampInt(state.house.energy.available - def.energy_cost, 0, state.house.energy.max);
    state.manor.construction = { improvement_id: def.id, progress: 0, required: def.required };
    reportNotes.push(`Started construction: ${def.name} (cost ${def.coin_cost} coin).`);
  }
}

function applyMarriageDecision(state: RunState, ctx: TurnContext, decisions: TurnDecisions, reportNotes: string[]): void {
  const mw = ctx.marriage_window;
  const d = decisions.marriage;
  if (!mw) return;
  if (d.action === "none") return;

  // energy cost (simple)
  if (state.house.energy.available <= 0) {
    reportNotes.push("No energy for marriage action.");
    return;
  }

  if (d.action === "scout") {
    state.house.energy.available = clampInt(state.house.energy.available - 1, 0, state.house.energy.max);
    // small coin cost for scouting
    if (state.manor.coin > 0) state.manor.coin -= 1;
    // set a flag to slightly improve next offer quality (implemented as mod)
    const mods = modsObj(state);
    mods["marriage_quality"] = (mods["marriage_quality"] ?? 1) * 1.05;
    reportNotes.push("Scouted prospects; next marriage window slightly improved.");
    return;
  }

  if (d.action === "reject_all") {
    state.house.energy.available = clampInt(state.house.energy.available - 1, 0, state.house.energy.max);
    // small social penalty: unrest +1
    state.manor.unrest = clampInt(state.manor.unrest + 1, 0, 100);
    reportNotes.push("Rejected all offers; slight social friction (+1 unrest).");
    return;
  }

  if (d.action === "accept") {
    const child = state.house.children.find((c) => c.id === d.child_id);
    const offer = mw.offers[d.offer_index];
    if (!child || !offer) {
      reportNotes.push("Invalid marriage selection.");
      return;
    }

    const dowry = offer.dowry_coin_net;

    // Must-fix: negative dowry requires sufficient coin; do not silently proceed.
    if (dowry < 0 && state.manor.coin < Math.abs(dowry)) {
      reportNotes.push("Cannot accept: insufficient coin for negative dowry.");
      return;
    }

    state.house.energy.available = clampInt(state.house.energy.available - 1, 0, state.house.energy.max);

    // Apply dowry
    if (dowry >= 0) state.manor.coin = asNonNegInt(state.manor.coin + dowry);
    else state.manor.coin = asNonNegInt(state.manor.coin - Math.abs(dowry));

    // Mark married
    child.married = true;

    // Relationship deltas (to offering house + sometimes liege)
    adjustEdge(state, state.house.head.id, offer.house_person_id, offer.relationship_delta);
    if (offer.liege_delta) {
      adjustEdge(state, state.house.head.id, state.locals.liege.id, { respect: offer.liege_delta.respect, threat: offer.liege_delta.threat });
    }

    // Set flag increasing birth chance slightly
    const mods = modsObj(state);
    mods["birth_bonus"] = (mods["birth_bonus"] ?? 1) * 1.03;

    reportNotes.push(`Marriage accepted for ${child.name}: dowry ${dowry >= 0 ? "+" : ""}${dowry} coin.`);
  }
}

function applyLaborDecision(state: RunState, decisions: TurnDecisions, maxShift: number, reportNotes: string[]): void {
  const desiredFarmers = Math.trunc(decisions.labor.desired_farmers);
  const desiredBuilders = Math.trunc(decisions.labor.desired_builders);

  const curF = state.manor.farmers;
  const curB = state.manor.builders;

  const dF = Math.abs(desiredFarmers - curF);
  const dB = Math.abs(desiredBuilders - curB);
  const totalShift = dF + dB;

  if (totalShift > maxShift) {
    reportNotes.push(`Labor change exceeds cap (max ${maxShift}); no change applied.`);
    return;
  }

  if (desiredFarmers + desiredBuilders > state.manor.population) {
    reportNotes.push("Labor plan invalid (exceeds population); no change applied.");
    return;
  }

  // energy cost if any change
  if (totalShift > 0) {
    if (state.house.energy.available <= 0) {
      reportNotes.push("No energy for labor plan; no change applied.");
      return;
    }
    state.house.energy.available = clampInt(state.house.energy.available - 1, 0, state.house.energy.max);
  }

  state.manor.farmers = clampInt(desiredFarmers, 0, state.manor.population);
  state.manor.builders = clampInt(desiredBuilders, 0, state.manor.population);
  reportNotes.push(`Labor plan set (takes effect next turn's production): farmers ${state.manor.farmers}, builders ${state.manor.builders}.`);
}

function applySellDecision(state: RunState, ctx: TurnContext, decisions: TurnDecisions, reportNotes: string[]): void {
  const sell = Math.max(0, Math.trunc(decisions.sell.sell_bushels));
  if (sell <= 0) return;
  if (state.house.energy.available <= 0) {
    reportNotes.push("No energy to sell.");
    return;
  }
  const cap = ctx.report.market.sell_cap_bushels;
  const allowed = Math.min(cap, sell);
  const sold = Math.min(state.manor.bushels_stored, allowed);
  state.manor.bushels_stored = asNonNegInt(state.manor.bushels_stored - sold);
  const earned = Math.floor(sold * ctx.report.market.price_per_bushel);
  state.manor.coin = asNonNegInt(state.manor.coin + earned);
  state.house.energy.available = clampInt(state.house.energy.available - 1, 0, state.house.energy.max);

  reportNotes.push(`Sold ${sold} bushels (cap ${cap}) for +${earned} coin at ${ctx.report.market.price_per_bushel.toFixed(2)}/bushel.`);
  if (sell > allowed) reportNotes.push("Sell amount trimmed to market cap.");
}

function closeTurn(state: RunState, reportNotes: string[]): void {
  const ob = state.manor.obligations;

  // move any unpaid due into arrears (end-of-turn)
  if (ob.tax_due_coin > 0) ob.arrears.coin = asNonNegInt(ob.arrears.coin + ob.tax_due_coin);
  if (ob.tithe_due_bushels > 0) ob.arrears.bushels = asNonNegInt(ob.arrears.bushels + ob.tithe_due_bushels);
  ob.tax_due_coin = 0;
  ob.tithe_due_bushels = 0;

  // relationship reaction to compliance
  if (ob.arrears.coin === 0) {
    adjustEdge(state, state.locals.liege.id, state.house.head.id, { respect: +1, threat: -1 });
  } else {
    adjustEdge(state, state.locals.liege.id, state.house.head.id, { respect: -1, threat: +1 });
  }
  if (ob.arrears.bushels === 0) {
    adjustEdge(state, state.locals.clergy.id, state.house.head.id, { respect: +1 });
  } else {
    adjustEdge(state, state.locals.clergy.id, state.house.head.id, { respect: -1, threat: +1 });
  }

  // mild unrest decay when stable
  const shortage = Boolean((state.flags as any).Shortage);
  if (!shortage && ob.arrears.coin === 0 && ob.arrears.bushels === 0) {
    state.manor.unrest = clampInt(state.manor.unrest - UNREST_BASELINE_DECAY_WHEN_STABLE, 0, 100);
  }

  // clear transient flags
  delete (state.flags as any).Shortage;
  delete (state.flags as any).MarriageOffer;

  // succession (minimal)
  if (!state.house.head.alive) {
    const heirId = computeHeirId(state);
    if (!heirId) {
      state.game_over = { reason: "DeathNoHeir", turn_index: state.turn_index };
      return;
    }
    const idx = state.house.children.findIndex((c) => c.id === heirId);
    const heir = state.house.children.splice(idx, 1)[0]!;
    heir.married = true; // assume household continuity
    state.house.head = heir;

    if (state.house.spouse) {
      state.house.spouse_status = "widow";
      (state.flags as any).widowed = true;
    }

    reportNotes.push(`Succession: ${heir.name} becomes head of house.`);
  }

  // game-over: dispossession rule
  if (state.manor.unrest >= 100) {
    state.game_over = { reason: "Dispossessed", turn_index: state.turn_index, details: { unrest: state.manor.unrest } };
    return;
  }

  // advance turn
  state.turn_index += 1;
}

export function applyDecisions(state: RunState, decisions: TurnDecisions): RunState {
  if (state.game_over) return state;

  const snapshotBefore = boundedSnapshot(state);

  // Defensive migration: if an older save/log entry ever contained full RunState snapshots (including nested `log`),
  // strip them down to bounded snapshots so the run can't balloon in memory.
  const cleanedPriorLog = (state.log ?? []).map((e: any) => {
    const sb: any = e.snapshot_before;
    const sa: any = e.snapshot_after;
    const cleanBefore = sb && typeof sb === "object" && "log" in sb ? boundedSnapshot(sb as any) : sb;
    const cleanAfter = sa && typeof sa === "object" && "log" in sa ? boundedSnapshot(sa as any) : sa;
    return { ...e, snapshot_before: cleanBefore, snapshot_after: cleanAfter };
  });

  const ctx = proposeTurn(state);
  let working = deepCopy(ctx.preview_state);

  const notes: string[] = [];
  const maxShift = ctx.max_labor_shift;

  // 10) apply decisions
  applyLaborDecision(working, decisions, maxShift, notes);
  applySellDecision(working, ctx, decisions, notes);
  applyConstructionDecision(working, decisions, notes);
  applyMarriageDecision(working, ctx, decisions, notes);
  applyObligationPaymentsAndPenalties(working, decisions, notes);

  // 11) minimal AI/world reactions handled via relationship adjustments above.

  // 12) end-of-turn checks + log
  closeTurn(working, notes);

  normalizeState(working);

  const snapshotAfter = boundedSnapshot(working);

  // deltas for quick debug
  const deltas: Record<string, number> = {
    bushels: snapshotAfter.manor.bushels_stored - snapshotBefore.manor.bushels_stored,
    coin: snapshotAfter.manor.coin - snapshotBefore.manor.coin,
    unrest: snapshotAfter.manor.unrest - snapshotBefore.manor.unrest,
    pop: snapshotAfter.manor.population - snapshotBefore.manor.population,
    arrears_coin: snapshotAfter.manor.obligations.arrears.coin - snapshotBefore.manor.obligations.arrears.coin,
    arrears_bushels: snapshotAfter.manor.obligations.arrears.bushels - snapshotBefore.manor.obligations.arrears.bushels
  };

  const summary = `Turn ${ctx.report.turn_index} resolved. ${notes.slice(0, 2).join(" ")}`.trim();

  working.log = [...cleanedPriorLog, {
    processed_turn_index: ctx.report.turn_index,
    summary,
    report: { ...ctx.report, notes: [...ctx.report.notes, ...notes] },
    decisions,
    snapshot_before: snapshotBefore,
    snapshot_after: snapshotAfter,
    deltas
  }];

  return working;
}
