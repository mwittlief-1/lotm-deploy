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

  married?: boolean;
  traits?: Record<string, number>;

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

type TierSetsLike = {
  tier0_house_ids?: Iterable<string>;
  tier1_house_ids?: Iterable<string>;
  tier0_person_ids?: Iterable<string>;
  tier1_person_ids?: Iterable<string>;
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

    // Simple age bands.
    // Credibility gate (v0.2.8 P0): female fertility declines strongly after ~35 and approaches ~0 by late 40s.
    if (motherAge < 16 || motherAge > 48) continue;
    if (fatherAge < 16 || fatherAge > 70) continue;

    const p = birthChancePerTurn(motherAge);
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

function birthChancePerTurn(motherAge: number): number {
  // v0.2.8.2 hotfix: fertility curve is intentionally simple but must be credible.
  // - modest rise into 20s
  // - gradual fall through early/mid 30s
  // - sharp decline after 35; ~0 by late 40s
  // Scaled for a 3-year turn (chance per turn, not per year).

  if (motherAge < 16 || motherAge > 48) return 0;

  const peakAge = 27;
  const halfWidth = 16; // yields a broad 11..43 triangle before we apply the 35+ taper.
  const tri = 1 - Math.abs(motherAge - peakAge) / halfWidth;
  const baseShape = clamp01(tri);

  // Strong 35+ taper: exp(-k*(age-35)). Choose k so 48 is effectively ~0.
  const k = 0.4;
  const ageTaper = motherAge <= 35 ? 1 : Math.exp(-k * (motherAge - 35));

  const maxPerTurn = 0.32;
  return clamp01(baseShape * ageTaper) * maxPerTurn;
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

  addAll(tierSets.tier0_person_ids);
  addAll(tierSets.tier1_person_ids);

  if ((tierSets.tier0_house_ids || tierSets.tier1_house_ids) && state.houses) {
    const houseIds: string[] = [];
    if (tierSets.tier0_house_ids) for (const id of tierSets.tier0_house_ids) houseIds.push(String(id));
    if (tierSets.tier1_house_ids) for (const id of tierSets.tier1_house_ids) houseIds.push(String(id));

    // Stable.
    houseIds.sort();

    for (const hid of houseIds) {
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
