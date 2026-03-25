import { EVENT_DECK } from "../../content/events";
import { EVENTS_PER_TURN_PROBS } from "../constants";
import { playerHouseIdOf, registryPersonFor, resolveCurrentHouseHeadId } from "../actors";
import { driftRelationshipsTowardBaseline } from "../domains/people/relationshipEngine";
import { Rng } from "../rng";
import type { EventResult, Person, RunState } from "../types";

function cooldownsObj(state: RunState): Record<string, number> {
  const anyFlags: any = state.flags;
  if (!anyFlags._cooldowns || typeof anyFlags._cooldowns !== "object") anyFlags._cooldowns = {};
  return anyFlags._cooldowns as Record<string, number>;
}

export function decrementEventCooldowns(state: RunState): void {
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

export function applyEventsPhase(state: RunState): EventResult[] {
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

  const local = eligible.slice();
  const results: EventResult[] = [];

  for (let i = 0; i < k && local.length > 0; i++) {
    const items = local.map((x) => ({ item: x, weight: x.weight }));
    const pick = weightedPick(rng.fork(`pick${i}`), items);
    const idx = local.findIndex((x) => x === pick.picked);
    const chosen = local.splice(idx, 1)[0]!;

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

export function applyRelationshipDriftPhase(state: RunState): void {
  driftRelationshipsTowardBaseline(state);
}

export function syncLocalsFromRegistryPhase(state: RunState): void {
  const anyState: any = state as any;
  const people: Record<string, Person> = (anyState.people ?? {}) as any;
  if (!people || typeof people !== "object") return;
  const playerHouseId = playerHouseIdOf(state);

  const pickReplacementLocal = (excludeIds: Set<string>): Person | null => {
    const houses: Record<string, any> = anyState.houses && typeof anyState.houses === "object"
      ? (anyState.houses as Record<string, any>)
      : {};
    const candidates = Object.keys(houses)
      .filter((hid) => hid !== playerHouseId)
      .map((hid) => resolveCurrentHouseHeadId(state, hid))
      .filter((pid): pid is string => typeof pid === "string" && pid.length > 0)
      .filter((pid) => !excludeIds.has(pid))
      .map((pid) => registryPersonFor(state, pid))
      .filter((p): p is Person => !!p && p.alive)
      .sort((a, b) => {
        if (a.age !== b.age) return b.age - a.age;
        return a.id.localeCompare(b.id);
      });
    return candidates[0] ?? null;
  };

  const syncOne = (p: any, vacantLabel: string): any => {
    const id = typeof p?.id === "string" ? p.id : null;
    if (!id) {
      return {
        id: `${vacantLabel.toLowerCase()}_vacant`,
        name: `${vacantLabel} (Vacant)`,
        sex: "M",
        age: 0,
        alive: false,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 }
      } as Person;
    }
    const reg = people[id];
    if (!reg || typeof (reg as any).alive !== "boolean") {
      return { ...p, alive: false, name: `${p?.name ?? id} (Vacant)` };
    }
    if ((reg as any).alive === false) {
      const replacement = pickReplacementLocal(new Set<string>([
        id,
        state.locals?.liege?.id ?? "",
        state.locals?.clergy?.id ?? "",
        ...(Array.isArray(state.locals?.nobles) ? state.locals.nobles.map((n) => n?.id ?? "") : []),
      ].filter((x): x is string => typeof x === "string" && x.length > 0)));
      if (replacement && replacement.alive) return { ...replacement };
      const nm = typeof (reg as any).name === "string" ? (reg as any).name : (p?.name ?? id);
      return { ...p, ...reg, name: String(nm).includes("(Deceased)") ? String(nm) : `${nm} (Deceased)` };
    }
    return { ...p, ...reg };
  };

  state.locals.liege = syncOne(state.locals.liege as any, "Liege");
  state.locals.clergy = syncOne(state.locals.clergy as any, "Clergy");
  state.locals.nobles = Array.isArray(state.locals.nobles)
    ? state.locals.nobles.map((n: any, i: number) => syncOne(n, `Local ${i + 1}`))
    : [];
}
