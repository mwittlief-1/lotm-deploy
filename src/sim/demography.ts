/**
 * v0.2.8 — Demography (Tier0/1 noble fertility only)
 *
 * Lane owner: DevB-E (Sim/Data correctness)
 *
 * Notes:
 * - This module is intentionally self-contained. BE will wire it into the turn loop.
 * - Determinism: no Math.random; stable ordering; pseudo-random draws keyed by (turn,couple).
 * - Schema tolerance: accept canonical field names (id / a_id,b_id / parent_id,child_id)
 *   AND legacy lane-test shapes (person_id / from_person_id,to_person_id).
 * - Write behavior: emit births in the **same style as the existing state**
 *   (canonical-in → canonical-out; legacy-in → legacy-out), so lane tests remain intact.
 */

import { BIRTH_CHANCE_BY_FERTILITY, BIRTH_FERTILE_AGE_MAX, BIRTH_FERTILE_AGE_MIN, TURN_YEARS } from "./constants";

export type BirthEvent = {
  child_person_id: string;
  mother_person_id: string;
  father_person_id: string;
  house_id: string | null;
  year: number;
};

type SexLike = 'M' | 'F' | 'male' | 'female' | 'm' | 'f' | string;

type PersonLike = {
  // tolerant id
  id?: string;
  person_id?: string;

  name?: string;
  sex?: SexLike;
  gender?: SexLike;
  birth_year?: number;
  age?: number;

  death_year?: number | null;
  is_alive?: boolean;
  is_dead?: boolean;
  alive?: boolean;

  // v0.2.8+ traits (canonical sim schema)
  traits?: any;

  married?: boolean;

  // optional loose membership hints
  house_id?: string | null;
};

type HouseLike = {
  // tolerant id
  id?: string;
  house_id?: string;

  head_person_id?: string;
  head_id?: string;
  spouse_id?: string;

  // Any one of these may exist depending on the codebase version.
  member_person_ids?: string[];
  members?: string[];
  people_ids?: string[];
  child_ids?: string[];
};

type KinshipEdgeLike = {
  kind?: string;
  type?: string;

  // spouse endpoints (tolerant)
  a_id?: string;
  b_id?: string;
  from_person_id?: string;
  to_person_id?: string;
  from?: string;
  to?: string;
  a?: string;
  b?: string;

  // parent endpoints (tolerant)
  parent_id?: string;
  child_id?: string;

  // misc legacy variants
  person_id?: string;
  related_person_id?: string;
};

type RunStateLike = {
  people: Record<string, PersonLike>;
  houses?: Record<string, HouseLike>;
  kinship_edges?: KinshipEdgeLike[];
  flags?: Record<string, unknown>;
};

// Tier sets evolved across versions.
// - Legacy: flat iterables (tier0_house_ids, tier1_house_ids, ...)
// - v0.2.8+: nested sets (tier0.houses, tier1.houses, ...)
// This module stays tolerant so it can run against both runtime and unit tests.
type TierSetsLike = {
  // Legacy shape
  tier0_house_ids?: Iterable<string>;
  tier1_house_ids?: Iterable<string>;
  tier0_person_ids?: Iterable<string>;
  tier1_person_ids?: Iterable<string>;

  // v0.2.8+ shape
  tier0?: { houses?: Iterable<string>; people?: Iterable<string> };
  tier1?: { houses?: Iterable<string>; people?: Iterable<string> };
};

type RngLike = {
  // Different repos have used slightly different RNG facades; accept structurally.
  f32?: (label: string) => number;
  float01?: (label: string) => number;
  u32?: (label: string) => number;
  nextU32?: (label: string) => number;
};

type TurnLike = number | { year?: number; current_year?: number; absolute_year?: number };

type Couple = { a: string; b: string };

const FLAG_SEQ = 'demography_next_person_seq';
const FLAG_PREFIX = 'demography_person_id_prefix';
const FLAG_JOINER = 'demography_person_id_joiner';

// Be tolerant to minor schema drift in kinship edge kinds.
const SPOUSE_EDGE_KINDS = new Set<string>([
  'spouse_of',
  'spouse',
  'married_to',
  'married',
  'husband_of',
  'wife_of',
  'partner_of',
]);

const PARENT_EDGE_KINDS = new Set<string>(['parent_of', 'parent', 'child_of']);

function listKinshipEdges(state: RunStateLike): any[] {
  const edges: any = (state as any)?.kinship_edges ?? (state as any)?.kinship ?? [];
  return Array.isArray(edges) ? edges : [];
}

function coerceHouseId(p: PersonLike): string | null {
  const raw = (p as any)?.house_id ?? (p as any)?.houseId ?? (p as any)?.house ?? null;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

function buildSpouseIndex(state: RunStateLike): Map<string, Set<string>> {
  const idx = new Map<string, Set<string>>();
  for (const e of listKinshipEdges(state)) {
    const kind = String((e as any)?.kind ?? (e as any)?.type ?? (e as any)?.relation ?? '');
    if (!SPOUSE_EDGE_KINDS.has(kind)) continue;
    const a = String((e as any)?.a_id ?? (e as any)?.spouse_a ?? (e as any)?.from_person_id ?? (e as any)?.person_a_id ?? '');
    const b = String((e as any)?.b_id ?? (e as any)?.spouse_b ?? (e as any)?.to_person_id ?? (e as any)?.person_b_id ?? '');
    if (!a || !b) continue;
    if (!idx.has(a)) idx.set(a, new Set());
    if (!idx.has(b)) idx.set(b, new Set());
    idx.get(a)!.add(b);
    idx.get(b)!.add(a);
  }
  return idx;
}

function buildParentsIndex(state: RunStateLike): Map<string, Set<string>> {
  const idx = new Map<string, Set<string>>();
  for (const e of listKinshipEdges(state)) {
    const kind = String((e as any)?.kind ?? (e as any)?.type ?? (e as any)?.relation ?? '');
    if (!PARENT_EDGE_KINDS.has(kind)) continue;
    const parent = String((e as any)?.parent_id ?? (e as any)?.from_person_id ?? (e as any)?.parent ?? '');
    const child = String((e as any)?.child_id ?? (e as any)?.to_person_id ?? (e as any)?.child ?? '');
    if (!parent || !child) continue;
    if (!idx.has(child)) idx.set(child, new Set());
    idx.get(child)!.add(parent);
  }
  return idx;
}

const MALE_NAMES = ["Edmund", "Hugh", "Robert", "Walter", "Geoffrey", "Aldric", "Oswin", "Giles", "Roger", "Simon"];
const FEMALE_NAMES = ["Matilda", "Alice", "Joan", "Agnes", "Isolde", "Edith", "Beatrice", "Margery", "Cecily", "Elinor"];

export function processNobleFertility(
  state: RunStateLike,
  tierSets: TierSetsLike,
  rng: RngLike,
  turn: TurnLike
): { births: BirthEvent[] } {
  const births: BirthEvent[] = [];
  const year = coerceYear(turn);

  const eligible = collectTier01PersonIds(state, tierSets);
  if (eligible.size === 0) return { births };

  const couples = findEligibleCouples(state, eligible);
  if (couples.length === 0) return { births };

  // Stable ordering of couples.
  couples.sort((x, y) => (x.a === y.a ? (x.b < y.b ? -1 : x.b > y.b ? 1 : 0) : x.a < y.a ? -1 : 1));

  const writeCanonical = detectCanonicalWriteMode(state);

  for (const { a, b } of couples) {
    const pA = state.people[a];
    const pB = state.people[b];
    if (!pA || !pB) continue;
    if (!isAlive(pA) || !isAlive(pB)) continue;

    const { mother, father } = pickMotherFather(pA, pB);
    const motherId = getPersonId(mother);
    const fatherId = getPersonId(father);
    if (!motherId || !fatherId) continue;

    const motherAge = coerceAge(mother, year);
    const fatherAge = coerceAge(father, year);
    if (motherAge == null || fatherAge == null) continue;

    // Fertility age bounds.
    if (motherAge < BIRTH_FERTILE_AGE_MIN || motherAge > BIRTH_FERTILE_AGE_MAX) continue;
    if (fatherAge < 16 || fatherAge > 70) continue;

    const p = birthChancePerTurn(state, mother, motherAge);
    if (p <= 0) continue;

    const draw = rngFloat01(rng, `demography.birth.${year}.${motherId}.${fatherId}`);
    if (draw >= p) continue;

    const childId = allocPersonId(state);
    const childSex: SexLike = rngFloat01(rng, `demography.birth.sex.${childId}`) < 0.5 ? 'M' : 'F';

    const houseId = inferChildHouseId(state, motherId, fatherId, mother, father);

    // Minimal newborn record; downstream code can enrich.
    if (writeCanonical) {
      const name = pickNameDeterministic(rng, childId, childSex);
      const newborn: PersonLike = {
        id: childId,
        name,
        sex: childSex,
        age: 0,
        alive: true,
        married: false,
        traits: {
          stewardship: 3,
          martial: 3,
          diplomacy: 3,
          discipline: 3,
          fertility: 3,
        },
        house_id: houseId,
      };
      state.people[childId] = newborn;

      if (!state.kinship_edges) state.kinship_edges = [];
      // parent_of edges (both parents). Stable ordering: mother then father.
      state.kinship_edges.push({ kind: 'parent_of', parent_id: motherId, child_id: childId });
      state.kinship_edges.push({ kind: 'parent_of', parent_id: fatherId, child_id: childId });

      // House membership (best-effort; depends on house schema).
      if (houseId && state.houses && state.houses[houseId]) {
        const h = state.houses[houseId];
        if (Array.isArray((h as any).child_ids)) (h as any).child_ids.push(childId);
        else if (Array.isArray((h as any).member_person_ids)) (h as any).member_person_ids.push(childId);
        else if (Array.isArray((h as any).members)) (h as any).members.push(childId);
        else if (Array.isArray((h as any).people_ids)) (h as any).people_ids.push(childId);
      }

      births.push({
        child_person_id: childId,
        mother_person_id: motherId,
        father_person_id: fatherId,
        house_id: houseId,
        year,
      });
    } else {
      const newborn: PersonLike = {
        person_id: childId,
        sex: childSex,
        birth_year: year,
        alive: true,
        house_id: houseId,
        death_year: null,
      };

      state.people[childId] = newborn;

      // Ensure arrays exist.
      if (!state.kinship_edges) state.kinship_edges = [];

      // parent_of edges (both parents). Stable ordering: mother then father.
      state.kinship_edges.push({ kind: 'parent_of', from_person_id: motherId, to_person_id: childId });
      state.kinship_edges.push({ kind: 'parent_of', from_person_id: fatherId, to_person_id: childId });

      // House membership (best-effort; depends on house schema).
      if (houseId && state.houses && state.houses[houseId]) {
        const h = state.houses[houseId];
        if (Array.isArray((h as any).member_person_ids)) (h as any).member_person_ids.push(childId);
        else if (Array.isArray((h as any).members)) (h as any).members.push(childId);
        else if (Array.isArray((h as any).people_ids)) (h as any).people_ids.push(childId);
      }

      births.push({
        child_person_id: childId,
        mother_person_id: motherId,
        father_person_id: fatherId,
        house_id: houseId,
        year,
      });
    }
  }

  return { births };
}

export type MarriageEvent = {
  spouse_a_person_id: string;
  spouse_b_person_id: string;
  year: number;
};

// Option B (v0.2.8+): world noble marriage formation so Gen2 births are possible.
// Deterministic + scalable: greedy matching with bounded candidate scans, keyed RNG.
export function processNobleMarriages(
  state: RunStateLike,
  tierSets: TierSetsLike,
  rng: RngLike,
  turn: TurnLike
): { marriages: MarriageEvent[] } {
  const marriages: MarriageEvent[] = [];
  const year = coerceYear(turn);

  const eligible = collectTier01PersonIds(state, tierSets);
  if (eligible.size === 0) return { marriages };

  const spouseIndex = buildSpouseIndex(state);
  const parentsIndex = buildParentsIndex(state);
  const currentTurnIndex = (state as any)?.turn_index ?? Math.round(year / TURN_YEARS);

  const isReserved = (personId: string): boolean => {
    const raw: any = (state as any)?.flags?.marriage_reservations;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const e = raw[personId];
    const ex = e?.expires_turn;
    if (typeof ex !== "number" || !Number.isFinite(ex)) return false;
    return Math.trunc(currentTurnIndex) <= Math.trunc(ex);
  };

  // Candidate lists (stable ordering).
  const males: { id: string; age: number; house_id: string | null }[] = [];
  const females: { id: string; age: number; house_id: string | null }[] = [];

  for (const id of Array.from(eligible).sort((a, b) => a.localeCompare(b))) {
    const p = state.people?.[id];
    if (!p || typeof p !== "object") continue;
    if (!isAlive(p)) continue;
    if (isReserved(id)) continue;

    // Skip anyone with a spouse edge already (no remarriage in v0.2.8).
    if (spouseIndex.has(id)) continue;

    const sex = sexNorm((p as any).sex);
    if (!sex) continue;
    const age = coerceAge(p, year);
    if (typeof age !== "number" || !Number.isFinite(age)) continue;
    if (age < 16) continue;
    if (age > 75) continue;

    const hid = coerceHouseId(p);
    if (sex === "M") males.push({ id, age, house_id: hid });
    else females.push({ id, age, house_id: hid });
  }

  // Sort older-first so we don't strand older singles.
  males.sort((a, b) => (b.age - a.age) || a.id.localeCompare(b.id));
  females.sort((a, b) => (b.age - a.age) || a.id.localeCompare(b.id));

  const maxPairs = Math.min(males.length, females.length);
  if (maxPairs <= 0) return { marriages };

  // Scalable defaults: we want marriages to continue in small worlds/early turns,
  // and also not bottleneck in larger worlds.
  const houseCount = [...readTier0HouseIds(tierSets), ...readTier1HouseIds(tierSets)].length;
  const rate = readTuningNumber(state, "world_marriage_rate", 0.25);
  const defaultCap = Math.max(50, Math.ceil(houseCount * 0.5));
  const cap = Math.max(0, Math.trunc(readTuningNumber(state, "world_marriage_cap", defaultCap)));
  const defaultMin = Math.max(1, Math.floor(houseCount * 0.05));
  const minPerTurn = Math.max(0, Math.trunc(readTuningNumber(state, "world_marriage_min", defaultMin)));

  let target = Math.trunc(maxPairs * rate);
  target = Math.max(target, minPerTurn);
  target = Math.min(target, cap, maxPairs);
  if (target <= 0) return { marriages };

  const usedFemales = new Set<string>();
  const usedMales = new Set<string>();

  const ageCompatible = (mAge: number, fAge: number): boolean => {
    // Simple plausibility constraints; tune later.
    if (fAge < 15 || fAge > 50) return false;
    if (mAge < 15 || mAge > 80) return false;
    // Prefer older male, but allow close ages.
    if (mAge + 5 < fAge) return false;
    if (mAge - 25 > fAge) return false;
    return true;
  };

  const areCloseKin = (aId: string, bId: string): boolean => {
    if (aId === bId) return true;
    // parent/child
    const aParents = parentsIndex.get(aId);
    const bParents = parentsIndex.get(bId);
    if (aParents?.has(bId) || bParents?.has(aId)) return true;
    // siblings: share any parent
    if (aParents && bParents) {
      for (const p of aParents) if (bParents.has(p)) return true;
    }
    return false;
  };

  const ensureKinshipEdgesArray = () => {
    if (!Array.isArray((state as any).kinship_edges)) (state as any).kinship_edges = [];
    return (state as any).kinship_edges as any[];
  };

  for (const m of males) {
    if (marriages.length >= target) break;
    if (usedMales.has(m.id)) continue;

    // Build a bounded pool of viable females in stable order.
    const pool: string[] = [];
    for (const f of females) {
      if (pool.length >= 24) break;
      if (usedFemales.has(f.id)) continue;
      if (!ageCompatible(m.age, f.age)) continue;
      // Avoid intra-house marriages when possible.
      if (m.house_id && f.house_id && m.house_id === f.house_id) continue;
      if (areCloseKin(m.id, f.id)) continue;
      pool.push(f.id);
    }
    if (pool.length === 0) continue;

    const r = rngFloat01(rng, `demography.marriage.pick.${year}.${m.id}`);
    const pick = pool[Math.min(pool.length - 1, Math.max(0, Math.trunc(r * pool.length)))]!;
    if (!pick) continue;

    usedMales.add(m.id);
    usedFemales.add(pick);

    // Apply.
    const edges = ensureKinshipEdgesArray();
    edges.push({ kind: "spouse_of", a_id: m.id, b_id: pick });
    const mp: any = state.people?.[m.id];
    const fp: any = state.people?.[pick];
    if (mp && typeof mp === "object") mp.married = true;
    if (fp && typeof fp === "object") fp.married = true;

    marriages.push({ spouse_a_person_id: m.id, spouse_b_person_id: pick, year });
  }

  return { marriages };
}

export type DeathEvent = {
  person_id: string;
  year: number;
  age: number;
};

// Option B (v0.2.8+): world noble mortality (Tier0/1 houses), Gompertz-like adult hazard.
export function processNobleMortality(
  state: RunStateLike,
  tierSets: TierSetsLike,
  rng: RngLike,
  turn: TurnLike
): { deaths: DeathEvent[] } {
  const deaths: DeathEvent[] = [];
  const year = coerceYear(turn);

  const eligible = collectTier01PersonIds(state, tierSets);
  if (eligible.size === 0) return { deaths };

  const mortalityMult = readTuningNumber(state, "mortality_mult", 1.0);

  const hazardPerTurn = (ageYears: number): number => {
    if (ageYears < 16) return 0;
    // Gompertz-like: hazard rises ~exponentially with age.
    // per-year baseline at age 30, then exp growth.
    const base30 = 0.0010; // ~0.1% per year at 30
    const scale = 12; // smaller => faster rise
    const perYear = base30 * Math.exp((ageYears - 30) / scale);
    // Convert to per-turn probability over TURN_YEARS years.
    const perTurn = 1 - Math.pow(1 - Math.min(perYear, 0.95), TURN_YEARS);
    return Math.min(Math.max(perTurn * mortalityMult, 0), 0.95);
  };

  for (const id of Array.from(eligible).sort((a, b) => a.localeCompare(b))) {
    const p: any = state.people?.[id];
    if (!p || typeof p !== "object") continue;
    if (!isAlive(p)) continue;
    const age = coerceAge(p, year);
    if (typeof age !== "number" || !Number.isFinite(age)) continue;

    const h = hazardPerTurn(age);
    if (h <= 0) continue;
    const r = rngFloat01(rng, `demography.mortality.roll.${year}.${id}`);
    if (r < h) {
      p.alive = false;
      deaths.push({ person_id: id, year, age });
    }
  }

  return { deaths };
}

function detectCanonicalWriteMode(state: RunStateLike): boolean {
  // If any existing person record has `id`, prefer canonical output.
  for (const p of Object.values(state.people ?? {})) {
    if (p && typeof p === 'object' && typeof (p as any).id === 'string' && (p as any).id.length > 0) return true;
  }
  // If any existing kinship edge uses canonical endpoints.
  for (const e of state.kinship_edges ?? []) {
    if (!e || typeof e !== 'object') continue;
    if ((e as any).parent_id != null || (e as any).child_id != null || (e as any).a_id != null || (e as any).b_id != null) return true;
  }
  return false;
}

function pickNameDeterministic(rng: RngLike, childId: string, sex: SexLike): string {
  const s = sexNorm(sex);
  const pool = s === 'F' ? FEMALE_NAMES : MALE_NAMES;
  const r = rngFloat01(rng, `demography.birth.name.${childId}`);
  const idx = Math.min(pool.length - 1, Math.max(0, Math.trunc(r * pool.length)));
  return pool[idx] ?? (s === 'F' ? 'Matilda' : 'Edmund');
}

function coerceYear(turn: TurnLike): number {
  if (typeof turn === 'number') return turn;
  return (turn.year ?? turn.current_year ?? turn.absolute_year ?? 0) | 0;
}

function getPersonId(p: PersonLike): string {
  const v = (p as any)?.id ?? (p as any)?.person_id ?? '';
  return typeof v === 'string' ? v : '';
}

function isAlive(p: PersonLike): boolean {
  if ((p as any).is_alive === false || (p as any).alive === false) return false;
  if ((p as any).is_dead === true) return false;
  if (typeof (p as any).death_year === 'number') return false;
  return true;
}

function coerceAge(p: PersonLike, year: number): number | null {
  if (typeof p.age === 'number') return p.age;
  if (typeof p.birth_year === 'number' && year > 0) return year - p.birth_year;
  return null;
}

function sexNorm(s: SexLike | undefined): 'M' | 'F' | null {
  if (!s) return null;
  const v = String(s).toLowerCase();
  if (v === 'm' || v === 'male') return 'M';
  if (v === 'f' || v === 'female') return 'F';
  if (v === 'M') return 'M';
  if (v === 'F') return 'F';
  // Some codebases may use other encodings; treat as unknown.
  return null;
}

function pickMotherFather(pA: PersonLike, pB: PersonLike): { mother: PersonLike; father: PersonLike } {
  const sA = sexNorm(pA.sex ?? pA.gender);
  const sB = sexNorm(pB.sex ?? pB.gender);
  if (sA === 'F' && sB === 'M') return { mother: pA, father: pB };
  if (sA === 'M' && sB === 'F') return { mother: pB, father: pA };

  // Fallback deterministic choice if sex is missing/unknown.
  const aId = getPersonId(pA);
  const bId = getPersonId(pB);
  return aId < bId ? { mother: pA, father: pB } : { mother: pB, father: pA };
}

function readTuningNumber(state: RunStateLike, key: string, fallback: number): number {
  const anyFlags: any = (state as any)?.flags;
  const v = anyFlags?._tuning?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function readTrait01to5(p: PersonLike, key: string, fallback: number): number {
  const t: any = (p as any)?.traits;
  const raw = t && typeof t === "object" ? (t as any)[key] : undefined;
  const n = typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
  // Clamp to [1..5] with default 3.
  if (n <= 1) return 1;
  if (n >= 5) return 5;
  return Math.round(n);
}

function fertilityAgeFactor(motherAge: number): number {
  // Credibility gate: strong decline after 35 and ~0 by late 40s.
  // Return [0..1] multiplier.
  if (motherAge < BIRTH_FERTILE_AGE_MIN) return 0;
  if (motherAge > BIRTH_FERTILE_AGE_MAX) return 0;

  // Piecewise-linear, tuned for 3-year turns.
  if (motherAge <= 30) return 1.0;
  if (motherAge <= 35) {
    // 30..35: 1.0 -> 0.75
    return 1.0 - (motherAge - 30) * (0.25 / 5);
  }
  if (motherAge <= 40) {
    // 35..40: 0.75 -> 0.25
    return 0.75 - (motherAge - 35) * (0.50 / 5);
  }
  if (motherAge <= 45) {
    // 40..45: 0.25 -> 0.07
    return 0.25 - (motherAge - 40) * (0.18 / 5);
  }
  // 45..48: 0.07 -> 0.01
  return 0.07 - (motherAge - 45) * (0.06 / 3);
}

function birthChancePerTurn(state: RunStateLike, mother: PersonLike, motherAge: number): number {
  const fertilityTrait = readTrait01to5(mother, "fertility", 3);
  const base = (BIRTH_CHANCE_BY_FERTILITY as any)[fertilityTrait] ?? (BIRTH_CHANCE_BY_FERTILITY as any)[3] ?? 0.26;

  const ageFactor = fertilityAgeFactor(motherAge);
  if (ageFactor <= 0) return 0;

  // Respect global tuning multipliers (defaults aligned with createNewRun).
  const fertilityMult = readTuningNumber(state, "fertility_mult", 1.0);

  // Clamp to avoid runaway population explosions under aggressive tuning.
  const p = base * ageFactor * fertilityMult;
  return Math.min(Math.max(p, 0), 0.65);
}

function clamp01(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function rngFloat01(rng: RngLike, label: string): number {
  // Prefer direct float calls when present.
  if (typeof rng.float01 === 'function') {
    const v = rng.float01(label);
    return clamp01(Number(v));
  }
  if (typeof rng.f32 === 'function') {
    const v = rng.f32(label);
    return clamp01(Number(v));
  }

  // Fallback: convert a u32 into [0,1).
  const u32 =
    typeof rng.u32 === 'function' ? rng.u32(label) : typeof rng.nextU32 === 'function' ? rng.nextU32(label) : null;

  if (u32 == null) {
    // We intentionally do NOT fall back to a local hash here:
    // production wiring must pass the sim RNG facade to preserve isolated RNG streams.
    throw new Error(`Demography RNG requires float01/f32 or u32/nextU32 (missing for label: ${label})`);
  }

  return (u32 >>> 0) / 0x1_0000_0000;
}

function collectTier01PersonIds(state: RunStateLike, tierSets: TierSetsLike): Set<string> {
  const out = new Set<string>();

  const addAll = (it: Iterable<string> | undefined) => {
    if (!it) return;
    for (const id of it) out.add(String(id));
  };

  // Legacy tier set shape
  addAll(tierSets.tier0_person_ids);
  addAll(tierSets.tier1_person_ids);

  // v0.2.8+ tier set shape
  addAll(tierSets.tier0?.people);
  addAll(tierSets.tier1?.people);

  if (state.houses) {
    const houseIds: string[] = [];
    if (tierSets.tier0_house_ids) for (const id of tierSets.tier0_house_ids) houseIds.push(String(id));
    if (tierSets.tier1_house_ids) for (const id of tierSets.tier1_house_ids) houseIds.push(String(id));
    if (tierSets.tier0?.houses) for (const id of tierSets.tier0.houses) houseIds.push(String(id));
    if (tierSets.tier1?.houses) for (const id of tierSets.tier1.houses) houseIds.push(String(id));

    // Stable + de-dupe.
    houseIds.sort();
    const uniqHouseIds = houseIds.filter((v, i) => (i === 0 ? true : v !== houseIds[i - 1]));

    for (const hid of uniqHouseIds) {
      const h = state.houses[hid];
      if (!h) continue;

      const members: string[] =
        (Array.isArray((h as any).member_person_ids) && (h as any).member_person_ids) ||
        (Array.isArray((h as any).members) && (h as any).members) ||
        (Array.isArray((h as any).people_ids) && (h as any).people_ids) ||
        (Array.isArray((h as any).child_ids) && (h as any).child_ids) ||
        [];

      for (const pid of members) out.add(String(pid));

      const head = (h as any).head_person_id ?? (h as any).head_id;
      const spouse = (h as any).spouse_id;
      if (typeof head === 'string') out.add(head);
      if (typeof spouse === 'string') out.add(spouse);
    }
  }

  // If tiers are missing, be conservative: return empty set.
  return out;
}

function findEligibleCouples(state: RunStateLike, eligible: Set<string>): Couple[] {
  const edges = state.kinship_edges ?? [];
  const couples: Couple[] = [];
  const seen = new Set<string>();

  for (const e of edges) {
    const kRaw = e.kind ?? e.type;
    const k = String(kRaw ?? '').toLowerCase();
    if (!SPOUSE_EDGE_KINDS.has(k)) continue;

    const from = edgeFrom(e);
    const to = edgeTo(e);
    if (!from || !to) continue;
    if (!eligible.has(from) || !eligible.has(to)) continue;

    const a = from < to ? from : to;
    const b = from < to ? to : from;
    const key = `${a}|${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    couples.push({ a, b });
  }

  return couples;
}

function edgeFrom(e: KinshipEdgeLike): string | null {
  const v = (e as any).from_person_id ?? (e as any).from ?? (e as any).a_id ?? (e as any).a ?? (e as any).person_id ?? null;
  return typeof v === 'string' ? v : null;
}

function edgeTo(e: KinshipEdgeLike): string | null {
  const v = (e as any).to_person_id ?? (e as any).to ?? (e as any).b_id ?? (e as any).b ?? (e as any).related_person_id ?? null;
  return typeof v === 'string' ? v : null;
}

function inferChildHouseId(state: RunStateLike, motherId: string, fatherId: string, mother: PersonLike, father: PersonLike): string | null {
  // Policy: child belongs to HoH’s house. Best-effort inference:
  // 1) if either parent is the head of a house, choose that house.
  // 2) else prefer father's house_id, else mother's house_id.
  if (state.houses) {
    const houseIds = Object.keys(state.houses).sort();
    for (const hid of houseIds) {
      const h = state.houses[hid];
      if (!h) continue;
      const head = (h as any).head_person_id ?? (h as any).head_id;
      if (head === fatherId) return hid;
      if (head === motherId) return hid;
    }
  }

  if (father.house_id) return father.house_id;
  if (mother.house_id) return mother.house_id;

  // If house_id missing, attempt membership scan.
  if (state.houses) {
    const houseIds = Object.keys(state.houses).sort();
    for (const hid of houseIds) {
      const h = state.houses[hid];
      const members: string[] =
        (Array.isArray((h as any).member_person_ids) && (h as any).member_person_ids) ||
        (Array.isArray((h as any).members) && (h as any).members) ||
        (Array.isArray((h as any).people_ids) && (h as any).people_ids) ||
        (Array.isArray((h as any).child_ids) && (h as any).child_ids) ||
        [];

      if (members.includes(fatherId)) return hid;
      if (members.includes(motherId)) return hid;

      const spouse = (h as any).spouse_id;
      const head = (h as any).head_person_id ?? (h as any).head_id;
      if (spouse === fatherId || spouse === motherId) return hid;
      if (head === fatherId || head === motherId) return hid;
    }
  }

  return null;
}

function allocPersonId(state: RunStateLike): string {
  if (!state.flags) state.flags = {};

  // Establish prefix/joiner + next seq exactly once.
  let next = state.flags[FLAG_SEQ];
  let prefix = state.flags[FLAG_PREFIX];
  let joiner = state.flags[FLAG_JOINER];

  if (typeof next !== 'number' || typeof prefix !== 'string' || typeof joiner !== 'string') {
    const { inferredPrefix, inferredJoiner, startSeq } = inferIdAllocStrategy(state);
    if (typeof next !== 'number') next = startSeq;
    if (typeof prefix !== 'string') prefix = inferredPrefix;
    if (typeof joiner !== 'string') joiner = inferredJoiner;

    state.flags[FLAG_SEQ] = next;
    state.flags[FLAG_PREFIX] = prefix;
    state.flags[FLAG_JOINER] = joiner;
  }

  const prefixStr = state.flags[FLAG_PREFIX] as string;
  const joinerStr = state.flags[FLAG_JOINER] as string;

  let seq = state.flags[FLAG_SEQ] as number;
  let id = `${prefixStr}${joinerStr}${seq}`;

  // Defensive collision check: advance until free.
  while (Object.prototype.hasOwnProperty.call(state.people, id)) {
    seq += 1;
    id = `${prefixStr}${joinerStr}${seq}`;
  }

  state.flags[FLAG_SEQ] = seq + 1;
  return id;
}

function inferIdAllocStrategy(state: RunStateLike): { inferredPrefix: string; inferredJoiner: string; startSeq: number } {
  const ids = Object.keys(state.people);
  ids.sort();

  // Find first matching pattern to preserve style.
  let inferredPrefix = 'p';
  let inferredJoiner = '';

  for (const id of ids) {
    const m1 = /^([a-zA-Z]+)(\d+)$/.exec(id);
    if (m1) {
      inferredPrefix = m1[1];
      inferredJoiner = '';
      break;
    }
    const m2 = /^([a-zA-Z]+)_(\d+)$/.exec(id);
    if (m2) {
      inferredPrefix = m2[1];
      inferredJoiner = '_';
      break;
    }
  }

  // Start seq = max numeric suffix + 1 (fallback 1).
  let maxN = 0;
  for (const id of ids) {
    const m = /(\d+)$/.exec(id);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > maxN) maxN = n;
  }

  return { inferredPrefix, inferredJoiner, startSeq: maxN + 1 };
}
