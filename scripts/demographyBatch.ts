import fs from "node:fs";
import crypto from "node:crypto";
import { createNewRun, applyDecisions, proposeTurn } from "../src/sim";

function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }
function stableHash(v: unknown) { return crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex"); }

export type Tuning = { fertilityScale: number; mortalityScaleChild: number; mortalityScaleAdult: number };
export type AgeBucket = { label: string; min: number; max: number };

type BucketStability = {
  mean_share: number;
  std_share: number;
  mean_age_in_bucket: number;
  std_age_in_bucket: number;
};

export type Summary = {
  mode: "cohort" | "sim";
  seeds: number;
  turns: number;
  tuning: Tuning;
  years: number;
  births_by_maternal_age_band: Record<string, number>;
  births_by_mother_residency: {
    player_house_resident: number;
    non_player_house_resident: number;
    unknown_mother_or_residency: number;
  };
  unknown_mother_residency_share: number;
  deaths_by_age_band: Record<string, number>;
  survival_to_5: number;
  survival_to_10: number;
  survival_to_16: number;
  alive_at_80: number;
  alive_at_90: number;
  alive_at_100: number;
  birth_spacing_distribution: Record<string, number>;
  spacing_lt_2_count: number;
  alive_people_start: number;
  alive_people_end: number;
  population_growth_turn_0_to_n: number;
  population_count_basis: "alive_people_registry";
  newborn_end_of_turn_age_distribution: Record<string, number>;
  life_stage_buckets: AgeBucket[];
  age_structure_stability: Record<string, BucketStability>;
  total_births: number;
  total_deaths: number;
  per_turn: Array<{ turn: number; births: number; deaths: number }>;
  seed_game_over_outcomes: Array<{
    seed: number;
    first_game_over_turn: number | null;
    alive_turns_count: number;
    game_over_reason: string | null;
    survived_past_turn_29: boolean;
  }>;
  game_over_reason_counts: Record<string, number>;
  first_game_over_turn_stats: { min: number | null; max: number | null; mean: number | null; median: number | null; count: number };
  alive_turns_count_stats: { min: number; max: number; mean: number; median: number };
  seeds_surviving_past_turn_29_count: number;
  seeds_surviving_past_turn_29_share: number;
  t0_eligible_unmarried_women_count: number;
  t1_married_from_t0_eligible_women_count: number;
  t1_married_from_t0_eligible_women_share: number;
  worldgen_t0_profile: Record<string, unknown>;
  alive_people_per_turn: number[];
  net_births_minus_deaths_per_turn: number[];
  marriages_formed_per_turn: number[];
  eligible_unmarried_women_per_turn: number[];
  eligible_unmarried_men_per_turn: number[];
  married_share_of_eligible_women_per_turn: number[];
  eligible_mothers_per_turn: number[];
  births_per_turn: number[];
  distribution_checkpoints: Record<string, {
    age_band_shares: Record<string, number>;
    sex_ratio_overall: number;
    sex_ratio_15_40: number;
    median_age: number;
  }>;
};

const MAT_BANDS: Array<[string, number, number]> = [["15-19", 15, 19], ["20-24", 20, 24], ["25-29", 25, 29], ["30-34", 30, 34], ["35-39", 35, 39], ["40-44", 40, 44], ["45+", 45, 999]];
const AGE_BANDS: Array<[string, number, number]> = [["0", 0, 0], ["1", 1, 1], ["2", 2, 2], ["3-4", 3, 4], ["5-9", 5, 9], ["10-14", 10, 14], ["15-19", 15, 19], ["20-29", 20, 29], ["30-39", 30, 39], ["40-49", 40, 49], ["50-59", 50, 59], ["60-69", 60, 69], ["70-79", 70, 79], ["80-89", 80, 89], ["90-99", 90, 99], ["100+", 100, 999]];
const DEFAULT_LIFE_STAGE_BUCKETS: AgeBucket[] = [
  { label: "0-14", min: 0, max: 14 },
  { label: "15-25", min: 15, max: 25 },
  { label: "26-40", min: 26, max: 40 },
  { label: "41-65", min: 41, max: 65 },
  { label: "66+", min: 66, max: 999 },
];

function zeroed(keys: string[]): Record<string, number> {
  return Object.fromEntries(keys.map((k) => [k, 0]));
}

function pickBand(n: number, bands: Array<[string, number, number]>): string {
  for (const [k, lo, hi] of bands) if (n >= lo && n <= hi) return k;
  return bands[bands.length - 1]![0];
}

function readBirthYear(p: any): number | null {
  const raw = p?.birth_year ?? p?.born_year ?? null;
  return typeof raw === "number" && Number.isFinite(raw) ? Math.trunc(raw) : null;
}

function readAge(p: any): number | null {
  const raw = p?.age;
  return typeof raw === "number" && Number.isFinite(raw) ? Math.trunc(raw) : null;
}

function personIsAlive(p: any): boolean {
  if (!p || typeof p !== "object") return false;
  if (p.alive === false || p.is_alive === false || p.is_dead === true) return false;
  return true;
}

function personIsVowedOrBlocked(p: any): boolean {
  if (!p || typeof p !== "object") return false;
  return Boolean(p.vowed === true || p.vow_blocked === true || p.celibate === true || p.fertility_blocked === true);
}

function hasSpouseEdge(state: any, personId: string): boolean {
  const edges: any[] = Array.isArray(state?.kinship_edges) ? state.kinship_edges : [];
  return edges.some((e) => {
    const k = String(e?.kind ?? "");
    if (k !== "spouse_of") return false;
    return e?.a_id === personId || e?.b_id === personId;
  });
}



function hasPotentialHusbandAtT0(state: any, womanId: string): boolean {
  const w = state?.people?.[womanId];
  const wAge = readAge(w);
  if (wAge === null) return false;
  return Object.entries(state?.people ?? {}).some(([id, p]: [string, any]) => {
    if (id === womanId) return false;
    if (!personIsAlive(p)) return false;
    if (p?.sex !== "M") return false;
    if (Boolean(p?.married) || hasSpouseEdge(state, id)) return false;
    const age = readAge(p);
    if (age === null) return false;
    if (age < 16 || age > 75) return false;
    if (age + 8 < wAge) return false;
    if (age - 35 > wAge) return false;
    return true;
  });
}
function resolveResidenceHouseId(state: any, personId: string): string | null {
  const p = state?.people?.[personId];
  const direct = p?.residence_house_id ?? p?.house_id ?? null;
  if (typeof direct === "string" && direct.length > 0) return direct;

  for (const [hid, house] of Object.entries((state as any)?.houses ?? {})) {
    const h: any = house;
    if (!h || typeof h !== "object") continue;
    if (h.head_id === personId || h.spouse_id === personId) return hid;
    const childIds: unknown[] = Array.isArray(h.child_ids) ? h.child_ids : [];
    if (childIds.some((x) => x === personId)) return hid;
    const members: unknown[] = Array.isArray(h.member_person_ids)
      ? h.member_person_ids
      : Array.isArray(h.members)
        ? h.members
        : Array.isArray(h.people_ids)
          ? h.people_ids
          : [];
    if (members.some((x) => x === personId)) return hid;
  }
  return null;
}
function countAlivePeople(state: any): number {
  return Object.values((state as any)?.people ?? {}).reduce((acc: number, p: any) => acc + (p?.alive === false ? 0 : 1), 0);
}

function buildDecisions(state: any): any {
  return {
    labor: { kind: "labor", desired_farmers: state.manor.farmers, desired_builders: state.manor.builders },
    sell: { kind: "sell", sell_bushels: 0 },
    obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
    construction: { kind: "construction", action: "none" },
    marriage: { kind: "marriage", action: "none" },
    prospects: { kind: "prospects", actions: [] },
  };
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  const variance = arr.reduce((a, x) => a + (x - m) * (x - m), 0) / arr.length;
  return Math.sqrt(variance);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}
function ageBandForT0(age: number): "0-14" | "15-40" | "41-65" | "66+" {
  if (age <= 14) return "0-14";
  if (age <= 40) return "15-40";
  if (age <= 65) return "41-65";
  return "66+";
}

function maritalAgeBand(age: number): "15-19" | "20-24" | "25-29" | "30-34" | "35-40" | "41+" {
  if (age <= 19) return "15-19";
  if (age <= 24) return "20-24";
  if (age <= 29) return "25-29";
  if (age <= 34) return "30-34";
  if (age <= 40) return "35-40";
  return "41+";
}

function ratio(n: number, d: number): number {
  return d > 0 ? Number((n / d).toFixed(6)) : 0;
}

function checkpointTurns(turns: number): number[] {
  const raw = [0, 5, 10, 15, 20, 25, Math.max(0, turns - 1)];
  return [...new Set(raw.filter((t) => t >= 0 && t < turns))].sort((a, b) => a - b);
}

function spouseIdsFromState(state: any): Set<string> {
  const out = new Set<string>();
  const edges: any[] = Array.isArray(state?.kinship_edges) ? state.kinship_edges : [];
  for (const e of edges) {
    if (e?.kind !== "spouse_of") continue;
    if (typeof e?.a_id === "string") out.add(e.a_id);
    if (typeof e?.b_id === "string") out.add(e.b_id);
  }
  return out;
}

function marriageEdgeKeys(state: any): Set<string> {
  const out = new Set<string>();
  const edges: any[] = Array.isArray(state?.kinship_edges) ? state.kinship_edges : [];
  for (const e of edges) {
    if (e?.kind !== "spouse_of") continue;
    const a = String(e?.a_id ?? "");
    const b = String(e?.b_id ?? "");
    if (!a || !b) continue;
    out.add(a < b ? `${a}|${b}` : `${b}|${a}`);
  }
  return out;
}

function eligibleMotherCount(state: any, worldYear: number): number {
  const spouseIds = spouseIdsFromState(state);
  return Object.values((state?.people ?? {}) as Record<string, any>).filter((p: any) => {
    if (!personIsAlive(p) || p?.sex !== "F") return false;
    const age = readAge(p);
    if (age === null || age < 16 || age > 44) return false;
    const id = typeof p?.id === "string" ? p.id : null;
    if (!id) return false;
    if (!Boolean(p?.married) && !spouseIds.has(id)) return false;
    const lastBirthYear = p?.last_birth_year;
    if (typeof lastBirthYear === "number" && Number.isFinite(lastBirthYear) && worldYear - Math.trunc(lastBirthYear) < 2) return false;
    return true;
  }).length;
}

function eligibleMarriageStats(state: any): { eligibleWomen: number; eligibleMen: number; marriedShareWomen: number } {
  const spouseIds = spouseIdsFromState(state);
  let womenTotal = 0;
  let womenUnmarried = 0;
  let menUnmarried = 0;
  let womenMarried = 0;
  for (const [id, p] of Object.entries((state?.people ?? {}) as Record<string, any>)) {
    if (!personIsAlive(p)) continue;
    const age = readAge(p);
    if (age === null) continue;
    const married = Boolean((p as any)?.married) || spouseIds.has(id);
    if ((p as any)?.sex === "F" && age >= 16 && age <= 28 && !personIsVowedOrBlocked(p)) {
      womenTotal += 1;
      if (married) womenMarried += 1;
      else womenUnmarried += 1;
    }
    if ((p as any)?.sex === "M" && age >= 18 && age <= 40) {
      if (!married) menUnmarried += 1;
    }
  }
  return { eligibleWomen: womenUnmarried, eligibleMen: menUnmarried, marriedShareWomen: ratio(womenMarried, womenTotal) };
}

function distributionCheckpointForState(state: any): { age_band_shares: Record<string, number>; sex_ratio_overall: number; sex_ratio_15_40: number; median_age: number } {
  const counts = { "0-14": 0, "15-40": 0, "41-65": 0, "66+": 0 };
  let m = 0;
  let f = 0;
  let m1540 = 0;
  let f1540 = 0;
  const ages: number[] = [];
  for (const p of Object.values((state?.people ?? {}) as Record<string, any>)) {
    if (!personIsAlive(p)) continue;
    const age = readAge(p);
    if (age === null) continue;
    ages.push(age);
    counts[ageBandForT0(age)] += 1;
    if ((p as any)?.sex === "F") f += 1;
    else m += 1;
    if (age >= 15 && age <= 40) {
      if ((p as any)?.sex === "F") f1540 += 1;
      else m1540 += 1;
    }
  }
  const total = ages.length;
  return {
    age_band_shares: {
      "0-14": ratio(counts["0-14"], total),
      "15-40": ratio(counts["15-40"], total),
      "41-65": ratio(counts["41-65"], total),
      "66+": ratio(counts["66+"], total),
    },
    sex_ratio_overall: ratio(m, Math.max(1, f)),
    sex_ratio_15_40: ratio(m1540, Math.max(1, f1540)),
    median_age: Number(median(ages).toFixed(3)),
  };
}


function matchingBucket(age: number, buckets: AgeBucket[]): AgeBucket {
  for (const b of buckets) {
    if (age >= b.min && age <= b.max) return b;
  }
  return buckets[buckets.length - 1]!;
}

function sortBuckets(buckets: AgeBucket[]): AgeBucket[] {
  return [...buckets]
    .map((b) => ({ label: String(b.label), min: Math.trunc(b.min), max: Math.trunc(b.max) }))
    .sort((a, b) => a.min - b.min || a.max - b.max || a.label.localeCompare(b.label));
}

export function parseBucketOverride(raw?: string): AgeBucket[] {
  if (!raw || !raw.trim()) return DEFAULT_LIFE_STAGE_BUCKETS;
  const parsed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const m = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        const lo = Math.trunc(Number(m[1]));
        const hi = Math.trunc(Number(m[2]));
        if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < 0 || hi < lo) throw new Error(`Invalid bucket token: ${token}`);
        return { label: `${lo}-${hi}`, min: lo, max: hi };
      }
      const p = token.match(/^(\d+)\+$/);
      if (p) {
        const lo = Math.trunc(Number(p[1]));
        if (!Number.isFinite(lo) || lo < 0) throw new Error(`Invalid bucket token: ${token}`);
        return { label: `${lo}+`, min: lo, max: 999 };
      }
      throw new Error(`Invalid bucket token: ${token}`);
    });
  if (parsed.length === 0) return DEFAULT_LIFE_STAGE_BUCKETS;
  return sortBuckets(parsed);
}

function selectMotherForChild(next: any, childId: string, child: any): any | null {
  const kin: any[] = Array.isArray(next?.kinship_edges) ? next.kinship_edges : [];
  const candidates = kin
    .filter((e) => e?.kind === "parent_of" && (e?.child_id === childId || e?.to_person_id === childId))
    .map((e) => next?.people?.[e.parent_id ?? e.from_person_id])
    .filter((p) => p && p.sex === "F");

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0] ?? null;

  const childBirthYear = readBirthYear(child);
  if (childBirthYear !== null) {
    const scored = candidates
      .map((mom) => {
        const by = readBirthYear(mom);
        if (by === null) return null;
        const ageAtBirth = childBirthYear - by;
        const plausible = ageAtBirth >= 12 && ageAtBirth <= 60;
        const fertileWindow = ageAtBirth >= 15 && ageAtBirth <= 44;
        return { mom, ageAtBirth, plausible, fertileWindow };
      })
      .filter((x): x is { mom: any; ageAtBirth: number; plausible: boolean; fertileWindow: boolean } => !!x)
      .sort((a, b) => {
        if (a.fertileWindow !== b.fertileWindow) return a.fertileWindow ? -1 : 1;
        if (a.plausible !== b.plausible) return a.plausible ? -1 : 1;
        if (a.ageAtBirth !== b.ageAtBirth) return a.ageAtBirth - b.ageAtBirth;
        return String(a.mom?.id ?? "").localeCompare(String(b.mom?.id ?? ""));
      });

    if (scored[0]) return scored[0].mom;
  }

  return candidates
    .slice()
    .sort((a, b) => {
      const aBy = readBirthYear(a);
      const bBy = readBirthYear(b);
      if (aBy !== null && bBy !== null && aBy !== bBy) return aBy - bBy;
      const aAge = readAge(a) ?? 0;
      const bAge = readAge(b) ?? 0;
      if (aAge !== bAge) return bAge - aAge;
      return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
    })[0] ?? null;
}

export function computeAgeBucketSnapshot(aliveAges: number[], bucketsInput?: AgeBucket[]): Record<string, { share_of_population: number; mean_age_in_bucket: number }> {
  const buckets = sortBuckets(bucketsInput && bucketsInput.length > 0 ? bucketsInput : DEFAULT_LIFE_STAGE_BUCKETS);
  const total = aliveAges.length || 1;
  const counts = zeroed(buckets.map((b) => b.label));
  const sums = zeroed(buckets.map((b) => b.label));

  for (const rawAge of aliveAges) {
    const age = Math.max(0, Math.trunc(rawAge));
    const b = matchingBucket(age, buckets);
    counts[b.label] += 1;
    sums[b.label] += age;
  }

  const out: Record<string, { share_of_population: number; mean_age_in_bucket: number }> = {};
  for (const b of buckets) {
    const c = counts[b.label];
    const share = c / total;
    const meanAge = c > 0 ? sums[b.label] / c : 0;
    out[b.label] = {
      share_of_population: Number(share.toFixed(6)),
      mean_age_in_bucket: Number(meanAge.toFixed(6)),
    };
  }
  return out;
}


export function evaluateLateHorizonActivity(
  perTurn: Array<{ turn: number; births: number; deaths: number }> | undefined,
  turns: number,
  turnStart: number,
  turnEnd: number,
  minBirthsPlusDeaths: number,
): { activity: number; hasWindow: boolean; valid: boolean } {
  const hasWindow = turns > turnStart && turnStart <= turnEnd;
  const activity = (perTurn ?? [])
    .filter((row) => Number(row?.turn) >= turnStart && Number(row?.turn) <= turnEnd)
    .reduce((acc, row) => acc + Number(row?.births ?? 0) + Number(row?.deaths ?? 0), 0);
  const valid = !hasWindow || activity >= minBirthsPlusDeaths;
  return { activity: Number(activity.toFixed(3)), hasWindow, valid };
}

export function runDemographyBatch(
  seeds: number[],
  turns: number,
  tuning: Tuning,
  mode: "cohort" | "sim",
  options?: { lifeStageBuckets?: AgeBucket[] }
): Summary {
  const lifeStageBuckets = sortBuckets(options?.lifeStageBuckets && options.lifeStageBuckets.length > 0 ? options.lifeStageBuckets : DEFAULT_LIFE_STAGE_BUCKETS);
  const birthsByBand = zeroed(MAT_BANDS.map(([k]) => k));
  const birthsByMotherResidency = {
    player_house_resident: 0,
    non_player_house_resident: 0,
    unknown_mother_or_residency: 0,
  };
  const deathsByBand = zeroed(AGE_BANDS.map(([k]) => k));
  const newbornAges = { "0": 0, "1": 0, "2": 0 };
  const perTurn = Array.from({ length: turns }, (_, t) => ({ turn: t, births: 0, deaths: 0 }));
  let totalBirths = 0;
  let totalDeaths = 0;

  let aliveTotal = 0;
  let alive5 = 0;
  let alive10 = 0;
  let alive16 = 0;
  let alive80 = 0;
  let alive90 = 0;
  let alive100 = 0;

  const spacingBins = { "2": 0, "3": 0, "4": 0, "5": 0, "6-8": 0 };
  const motherBirthYears = new Map<string, number[]>();
  let spacingLt2Count = 0;

  const turnSharesByBucket = new Map<string, number[]>();
  const turnMeanAgesByBucket = new Map<string, number[]>();
  for (const b of lifeStageBuckets) {
    turnSharesByBucket.set(b.label, []);
    turnMeanAgesByBucket.set(b.label, []);
  }

  let popStart = 0;
  let popEnd = 0;
  let t0EligibleWomen = 0;
  let t1MarriedFromT0EligibleWomen = 0;
  const alivePeoplePerTurn = Array.from({ length: turns }, () => 0);
  const netBirthsMinusDeathsPerTurn = Array.from({ length: turns }, () => 0);
  const marriagesFormedPerTurn = Array.from({ length: turns }, () => 0);
  const eligibleUnmarriedWomenPerTurn = Array.from({ length: turns }, () => 0);
  const eligibleUnmarriedMenPerTurn = Array.from({ length: turns }, () => 0);
  const marriedShareOfEligibleWomenPerTurn = Array.from({ length: turns }, () => 0);
  const eligibleMothersPerTurn = Array.from({ length: turns }, () => 0);
  const distributionCheckpoints: Record<string, { age_band_shares: Record<string, number>; sex_ratio_overall: number; sex_ratio_15_40: number; median_age: number }> = {};
  const checkpointSet = new Set(checkpointTurns(turns));

  const t0AgeCounts = { "0-14": 0, "15-40": 0, "41-65": 0, "66+": 0 };
  const t0SexCounts = { M: 0, F: 0 };
  const t0Sex1540Counts = { M: 0, F: 0 };
  const t0MaritalBySexAge: Record<string, { married: number; unmarried: number; widowed: number; total: number }> = {};
  for (const sex of ["M", "F"]) {
    for (const band of ["15-19", "20-24", "25-29", "30-34", "35-40", "41+"]) {
      t0MaritalBySexAge[`${sex}:${band}`] = { married: 0, unmarried: 0, widowed: 0, total: 0 };
    }
  }
  const t0SpouseAges: number[] = [];
  const t0ChildrenPerHouse: number[] = [];
  let t0Couples = 0;
  let t0YoungCoresidentCouples = 0;
  let t0PeopleCount = 0;
  const seedOutcomes: Array<{
    seed: number;
    first_game_over_turn: number | null;
    alive_turns_count: number;
    game_over_reason: string | null;
    survived_past_turn_29: boolean;
  }> = [];

  for (let t = 0; t < turns; t++) {
    for (const b of lifeStageBuckets) {
      turnSharesByBucket.get(b.label)!.push(0);
      turnMeanAgesByBucket.get(b.label)!.push(0);
    }
  }

  for (const seed of seeds) {
    let state: any = createNewRun(`batch_${seed}`);
    state.flags = {
      ...(state.flags ?? {}),
      _tuning: {
        ...(state.flags?._tuning ?? {}),
        ...tuning,
        world_marriage_t01_force_share: 0.65,
      },
    };

    const seedPeople = (state as any).people ?? {};
    for (const [pid, p] of Object.entries(seedPeople as Record<string, any>)) {
      if (!personIsAlive(p)) continue;
      const age = readAge(p);
      if (age === null) continue;
      t0PeopleCount += 1;
      t0AgeCounts[ageBandForT0(age)] += 1;
      const sex = p?.sex === "F" ? "F" : "M";
      t0SexCounts[sex] += 1;
      if (age >= 15 && age <= 40) t0Sex1540Counts[sex] += 1;
      if (age >= 15) {
        const band = maritalAgeBand(age);
        const row = t0MaritalBySexAge[`${sex}:${band}`];
        row.total += 1;
        const married = Boolean(p?.married) || hasSpouseEdge(state, pid);
        if (married) row.married += 1;
        else if (Boolean(p?.married) && !hasSpouseEdge(state, pid)) row.widowed += 1;
        else row.unmarried += 1;
      }
    }

    const kinEdges: any[] = Array.isArray((state as any).kinship_edges) ? (state as any).kinship_edges : [];
    const seenCouples = new Set<string>();
    for (const e of kinEdges) {
      if (e?.kind !== "spouse_of") continue;
      const a = String(e?.a_id ?? "");
      const b = String(e?.b_id ?? "");
      if (!a || !b) continue;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seenCouples.has(key)) continue;
      seenCouples.add(key);
      t0Couples += 1;
      const pa: any = seedPeople[a];
      const pb: any = seedPeople[b];
      const ageA = readAge(pa);
      const ageB = readAge(pb);
      const female = pa?.sex === "F" ? pa : pb?.sex === "F" ? pb : null;
      const femaleAge = readAge(female);
      if (femaleAge !== null) t0SpouseAges.push(femaleAge);
      else if (ageA !== null && ageB !== null) t0SpouseAges.push((ageA + ageB) / 2);

      const male = pa?.sex === "M" ? pa : pb?.sex === "M" ? pb : null;
      const maleAge = readAge(male);
      const femaleAge2 = readAge(female);
      const maleRes = male?.residence_house_id ?? male?.house_id ?? null;
      const femaleRes = female?.residence_house_id ?? female?.house_id ?? null;
      if (maleAge !== null && femaleAge2 !== null && maleAge >= 18 && maleAge <= 26 && femaleAge2 >= 16 && femaleAge2 <= 24 && maleRes && femaleRes && maleRes === femaleRes) {
        t0YoungCoresidentCouples += 1;
      }
    }

    for (const h of Object.values(((state as any).houses ?? {}) as Record<string, any>)) {
      if (!h || typeof h !== "object") continue;
      if (typeof h.head_id !== "string") continue;
      const cids: unknown[] = Array.isArray(h.child_ids) ? h.child_ids : [];
      t0ChildrenPerHouse.push(cids.length);
    }

    const eligibleWomenIds = Object.entries((state as any).people ?? {})
      .filter(([_, p]) => personIsAlive(p))
      .filter(([_, p]) => p?.sex === "F")
      .filter(([_, p]) => {
        const age = readAge(p);
        return age !== null && age >= 16 && age <= 28;
      })
      .filter(([id, p]) => !Boolean(p?.married) && !hasSpouseEdge(state, id))
      .filter(([_, p]) => !personIsVowedOrBlocked(p))
      .filter(([id]) => hasPotentialHusbandAtT0(state, id))
      .map(([id]) => id)
      .sort((a, b) => a.localeCompare(b));
    t0EligibleWomen += eligibleWomenIds.length;

    popStart += countAlivePeople(state);
    let firstGameOverTurn: number | null = null;
    let aliveTurnsCount = 0;
    let gameOverReason: string | null = null;
    let marriedByEndTurn1ForSeed: number | null = null;

    for (let t = 0; t < turns; t++) {
      if (state?.game_over) {
        state.game_over = null;
      }
      if (!state?.game_over) aliveTurnsCount += 1;
      const beforePeople = new Map<string, any>(Object.entries((state as any).people ?? {}).map(([id, p]) => [id, { ...(p as any) }]));
      const beforeAlive = new Map<string, boolean>(Object.entries((state as any).people ?? {}).map(([id, p]) => [id, Boolean((p as any)?.alive !== false)]));
      const marriageEdgesBefore = marriageEdgeKeys(state);

      const ctx = proposeTurn(state as any);
      const next = ctx.preview_state as any;
      if (firstGameOverTurn === null && next?.game_over) {
        firstGameOverTurn = t;
        gameOverReason = String(next.game_over?.reason ?? "Unknown");
      }

      // births: ids newly present in people map
      for (const [pid, p] of Object.entries(next.people ?? {})) {
        if (beforePeople.has(pid)) continue;
        totalBirths += 1;
        perTurn[t]!.births += 1;
        const child: any = p;
        const childAge = readAge(child);
        if (childAge !== null && childAge >= 0 && childAge <= 2) {
          const k = String(childAge) as "0" | "1" | "2";
          if (k in newbornAges) newbornAges[k] += 1;
        }

        const mom = selectMotherForChild(next, pid, child) as any;
        if (mom) {
          const motherId = typeof mom?.id === "string" ? mom.id : null;
          let motherHouseId: string | null = null;
          if (motherId) {
            motherHouseId = resolveResidenceHouseId(next, motherId);
          }
          const playerHouseId = typeof (next as any).player_house_id === "string" ? String((next as any).player_house_id) : "h_player";
          if (motherHouseId === null) birthsByMotherResidency.unknown_mother_or_residency += 1;
          else if (motherHouseId === playerHouseId) birthsByMotherResidency.player_house_resident += 1;
          else birthsByMotherResidency.non_player_house_resident += 1;

          const motherBirthYear = readBirthYear(mom);
          const childBirthYear = readBirthYear(child);
          const motherAge = readAge(mom);
          const childAge = readAge(child);

          let maternalAgeAtBirth: number | null = null;
          if (motherBirthYear !== null && childBirthYear !== null) {
            maternalAgeAtBirth = Math.max(0, childBirthYear - motherBirthYear);
          } else if (motherAge !== null) {
            maternalAgeAtBirth = Math.max(0, motherAge - Math.max(0, childAge ?? 0));
          }
          const boundedMaternalAge = Math.max(0, Math.min(44, Math.trunc(maternalAgeAtBirth ?? 20)));
          birthsByBand[pickBand(boundedMaternalAge, MAT_BANDS)] += 1;

          // Spacing integrity gate uses explicit birth years only to avoid false positives from inferred values.
          if (childBirthYear !== null) {
            const arr = motherBirthYears.get(String(mom.id)) ?? [];
            arr.push(childBirthYear);
            motherBirthYears.set(String(mom.id), arr);
          }
        } else {
          birthsByMotherResidency.unknown_mother_or_residency += 1;
        }
      }

      // deaths: alive->dead transitions
      for (const [pid, wasAlive] of beforeAlive.entries()) {
        if (!wasAlive) continue;
        const now = next.people?.[pid];
        if (!now || now.alive === false) {
          totalDeaths += 1;
          perTurn[t]!.deaths += 1;
          const ageAtDeath = Math.max(0, Math.trunc(Number(now?.age ?? beforePeople.get(pid)?.age ?? 0)));
          deathsByBand[pickBand(ageAtDeath, AGE_BANDS)] += 1;
        }
      }

      state = applyDecisions(next, buildDecisions(next));
      if (t === 1 && marriedByEndTurn1ForSeed === null) {
        marriedByEndTurn1ForSeed = eligibleWomenIds.filter((id) => {
          const p = (state as any)?.people?.[id];
          if (!p || typeof p !== "object") return false;
          return Boolean(p?.married) || hasSpouseEdge(state, id);
        }).length;
      }
      if (firstGameOverTurn === null && state?.game_over) {
        firstGameOverTurn = t;
        gameOverReason = String(state.game_over?.reason ?? "Unknown");
      }

      const marriageEdgesAfter = marriageEdgeKeys(state);
      let formedThisTurn = 0;
      for (const key of marriageEdgesAfter) if (!marriageEdgesBefore.has(key)) formedThisTurn += 1;
      marriagesFormedPerTurn[t] += formedThisTurn;
      alivePeoplePerTurn[t] += countAlivePeople(state);
      netBirthsMinusDeathsPerTurn[t] += perTurn[t]!.births - perTurn[t]!.deaths;
      const marriageStats = eligibleMarriageStats(state);
      eligibleUnmarriedWomenPerTurn[t] += marriageStats.eligibleWomen;
      eligibleUnmarriedMenPerTurn[t] += marriageStats.eligibleMen;
      marriedShareOfEligibleWomenPerTurn[t] += marriageStats.marriedShareWomen;
      eligibleMothersPerTurn[t] += eligibleMotherCount(state, state.turn_index * 3);
      if (checkpointSet.has(t)) {
        const key = String(t);
        const snap = distributionCheckpointForState(state);
        const prev = distributionCheckpoints[key];
        if (!prev) distributionCheckpoints[key] = snap;
        else {
          for (const band of Object.keys(prev.age_band_shares)) prev.age_band_shares[band] += snap.age_band_shares[band] ?? 0;
          prev.sex_ratio_overall += snap.sex_ratio_overall;
          prev.sex_ratio_15_40 += snap.sex_ratio_15_40;
          prev.median_age += snap.median_age;
        }
      }

      const aliveAges: number[] = [];
      for (const p of Object.values((state as any).people ?? {})) {
        const pp: any = p;
        if (pp?.alive === false) continue;
        const age = Math.max(0, Math.trunc(Number(pp?.age ?? 0)));
        aliveAges.push(age);
      }
      const snapshot = computeAgeBucketSnapshot(aliveAges, lifeStageBuckets);
      for (const b of lifeStageBuckets) {
        turnSharesByBucket.get(b.label)![t] += snapshot[b.label].share_of_population;
        turnMeanAgesByBucket.get(b.label)![t] += snapshot[b.label].mean_age_in_bucket;
      }
    }

    const marriedByT1 = marriedByEndTurn1ForSeed ?? eligibleWomenIds.filter((id) => {
      const p = (state as any)?.people?.[id];
      if (!p || typeof p !== "object") return false;
      return Boolean(p?.married) || hasSpouseEdge(state, id);
    }).length;
    t1MarriedFromT0EligibleWomen += marriedByT1;

    popEnd += countAlivePeople(state);
    seedOutcomes.push({
      seed,
      first_game_over_turn: firstGameOverTurn,
      alive_turns_count: aliveTurnsCount,
      game_over_reason: gameOverReason,
      survived_past_turn_29: firstGameOverTurn === null || firstGameOverTurn > 29,
    });

    for (const p of Object.values((state as any).people ?? {})) {
      const pp: any = p;
      if (pp?.alive === false) continue;
      const age = Math.max(0, Math.trunc(Number(pp?.age ?? 0)));
      aliveTotal += 1;
      if (age >= 5) alive5 += 1;
      if (age >= 10) alive10 += 1;
      if (age >= 16) alive16 += 1;
      if (age >= 80) alive80 += 1;
      if (age >= 90) alive90 += 1;
      if (age >= 100) alive100 += 1;
    }
  }

  for (const years of motherBirthYears.values()) {
    // KPI bookkeeping hardening: dedupe same-year entries before spacing intervals.
    // Same-year duplicates are attribution/bookkeeping artifacts for KPI purposes and
    // should not be interpreted as true spacing violations of canonical sim rules.
    const uniqueYears = [...new Set(years)].sort((a, b) => a - b);
    for (let i = 1; i < uniqueYears.length; i++) {
      const d = uniqueYears[i]! - uniqueYears[i - 1]!;
      if (d < 2) spacingLt2Count += 1;
      if (d <= 2) spacingBins["2"] += 1;
      else if (d === 3) spacingBins["3"] += 1;
      else if (d === 4) spacingBins["4"] += 1;
      else if (d === 5) spacingBins["5"] += 1;
      else spacingBins["6-8"] += 1;
    }
  }

  const spacingTotal = Object.values(spacingBins).reduce((a, b) => a + b, 0) || 1;
  const birthSpacingDistribution = Object.fromEntries(Object.entries(spacingBins).map(([k, v]) => [k, Number((v / spacingTotal).toFixed(4))]));

  const turnCount = Math.max(1, turns);
  const seedCount = Math.max(1, seeds.length);
  const ageStructureStability: Record<string, BucketStability> = {};

  for (const b of lifeStageBuckets) {
    const shares = (turnSharesByBucket.get(b.label) ?? []).map((x) => x / seedCount);
    const ages = (turnMeanAgesByBucket.get(b.label) ?? []).map((x) => x / seedCount);
    const paddedShares = shares.length === turnCount ? shares : [...shares, ...Array.from({ length: turnCount - shares.length }, () => 0)];
    const paddedAges = ages.length === turnCount ? ages : [...ages, ...Array.from({ length: turnCount - ages.length }, () => 0)];
    ageStructureStability[b.label] = {
      mean_share: Number(mean(paddedShares).toFixed(6)),
      std_share: Number(stddev(paddedShares).toFixed(6)),
      mean_age_in_bucket: Number(mean(paddedAges).toFixed(6)),
      std_age_in_bucket: Number(stddev(paddedAges).toFixed(6)),
    };
  }

  const years = Math.max(1, turns * 3);
  const populationGrowthTurn0ToN = popStart > 0 ? (popEnd - popStart) / popStart : 0;
  const alivePeoplePerTurnAvg = alivePeoplePerTurn.map((x) => Number((x / Math.max(1, seeds.length)).toFixed(3)));
  const netBirthsMinusDeathsPerTurnAvg = netBirthsMinusDeathsPerTurn.map((x) => Number((x / Math.max(1, seeds.length)).toFixed(3)));
  const marriagesFormedPerTurnAvg = marriagesFormedPerTurn.map((x) => Number((x / Math.max(1, seeds.length)).toFixed(3)));
  const eligibleUnmarriedWomenPerTurnAvg = eligibleUnmarriedWomenPerTurn.map((x) => Number((x / Math.max(1, seeds.length)).toFixed(3)));
  const eligibleUnmarriedMenPerTurnAvg = eligibleUnmarriedMenPerTurn.map((x) => Number((x / Math.max(1, seeds.length)).toFixed(3)));
  const marriedShareOfEligibleWomenPerTurnAvg = marriedShareOfEligibleWomenPerTurn.map((x) => Number((x / Math.max(1, seeds.length)).toFixed(6)));
  const eligibleMothersPerTurnAvg = eligibleMothersPerTurn.map((x) => Number((x / Math.max(1, seeds.length)).toFixed(3)));
  const distributionCheckpointsAvg = Object.fromEntries(Object.entries(distributionCheckpoints).map(([k, v]) => [k, {
    age_band_shares: Object.fromEntries(Object.entries(v.age_band_shares).map(([band, val]) => [band, Number((val / Math.max(1, seeds.length)).toFixed(6))])),
    sex_ratio_overall: Number((v.sex_ratio_overall / Math.max(1, seeds.length)).toFixed(6)),
    sex_ratio_15_40: Number((v.sex_ratio_15_40 / Math.max(1, seeds.length)).toFixed(6)),
    median_age: Number((v.median_age / Math.max(1, seeds.length)).toFixed(3)),
  }]));

  const gameOverReasonCounts: Record<string, number> = {};
  for (const row of seedOutcomes) {
    const key = row.game_over_reason ?? "None";
    gameOverReasonCounts[key] = (gameOverReasonCounts[key] ?? 0) + 1;
  }

  const firstTurns = seedOutcomes
    .map((row) => row.first_game_over_turn)
    .filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  const aliveTurns = seedOutcomes.map((row) => row.alive_turns_count);
  const survivePast29Count = seedOutcomes.filter((row) => row.survived_past_turn_29).length;
  const unknownMotherResidencyShare = totalBirths > 0 ? birthsByMotherResidency.unknown_mother_or_residency / totalBirths : 0;

  return {
    mode,
    seeds: seeds.length,
    turns,
    tuning,
    years,
    total_births: totalBirths,
    total_deaths: totalDeaths,
    per_turn: perTurn,
    births_by_maternal_age_band: birthsByBand,
    births_by_mother_residency: birthsByMotherResidency,
    unknown_mother_residency_share: Number(unknownMotherResidencyShare.toFixed(6)),
    deaths_by_age_band: deathsByBand,
    survival_to_5: aliveTotal ? Number((alive5 / aliveTotal).toFixed(4)) : 0,
    survival_to_10: aliveTotal ? Number((alive10 / aliveTotal).toFixed(4)) : 0,
    survival_to_16: aliveTotal ? Number((alive16 / aliveTotal).toFixed(4)) : 0,
    alive_at_80: aliveTotal ? Number((alive80 / aliveTotal).toFixed(4)) : 0,
    alive_at_90: aliveTotal ? Number((alive90 / aliveTotal).toFixed(4)) : 0,
    alive_at_100: aliveTotal ? Number((alive100 / aliveTotal).toFixed(4)) : 0,
    birth_spacing_distribution: birthSpacingDistribution,
    spacing_lt_2_count: spacingLt2Count,
    alive_people_start: Number(popStart.toFixed(3)),
    alive_people_end: Number(popEnd.toFixed(3)),
    population_growth_turn_0_to_n: Number(populationGrowthTurn0ToN.toFixed(12)),
    population_count_basis: "alive_people_registry",
    newborn_end_of_turn_age_distribution: newbornAges,
    life_stage_buckets: lifeStageBuckets,
    age_structure_stability: ageStructureStability,
    seed_game_over_outcomes: seedOutcomes,
    game_over_reason_counts: gameOverReasonCounts,
    first_game_over_turn_stats: {
      min: firstTurns.length > 0 ? Math.min(...firstTurns) : null,
      max: firstTurns.length > 0 ? Math.max(...firstTurns) : null,
      mean: firstTurns.length > 0 ? Number(mean(firstTurns).toFixed(3)) : null,
      median: firstTurns.length > 0 ? Number(median(firstTurns).toFixed(3)) : null,
      count: firstTurns.length,
    },
    alive_turns_count_stats: {
      min: aliveTurns.length > 0 ? Math.min(...aliveTurns) : 0,
      max: aliveTurns.length > 0 ? Math.max(...aliveTurns) : 0,
      mean: aliveTurns.length > 0 ? Number(mean(aliveTurns).toFixed(3)) : 0,
      median: aliveTurns.length > 0 ? Number(median(aliveTurns).toFixed(3)) : 0,
    },
    seeds_surviving_past_turn_29_count: survivePast29Count,
    seeds_surviving_past_turn_29_share: seedOutcomes.length > 0 ? Number((survivePast29Count / seedOutcomes.length).toFixed(6)) : 0,
    t0_eligible_unmarried_women_count: t0EligibleWomen,
    t1_married_from_t0_eligible_women_count: t1MarriedFromT0EligibleWomen,
    t1_married_from_t0_eligible_women_share: t0EligibleWomen > 0 ? Number((t1MarriedFromT0EligibleWomen / t0EligibleWomen).toFixed(6)) : 1,
    alive_people_per_turn: alivePeoplePerTurnAvg,
    net_births_minus_deaths_per_turn: netBirthsMinusDeathsPerTurnAvg,
    marriages_formed_per_turn: marriagesFormedPerTurnAvg,
    eligible_unmarried_women_per_turn: eligibleUnmarriedWomenPerTurnAvg,
    eligible_unmarried_men_per_turn: eligibleUnmarriedMenPerTurnAvg,
    married_share_of_eligible_women_per_turn: marriedShareOfEligibleWomenPerTurnAvg,
    eligible_mothers_per_turn: eligibleMothersPerTurnAvg,
    births_per_turn: perTurn.map((row) => row.births),
    distribution_checkpoints: distributionCheckpointsAvg,
    worldgen_t0_profile: {
      age_band_counts: t0AgeCounts,
      age_band_shares: {
        "0-14": ratio(t0AgeCounts["0-14"], t0PeopleCount),
        "15-40": ratio(t0AgeCounts["15-40"], t0PeopleCount),
        "41-65": ratio(t0AgeCounts["41-65"], t0PeopleCount),
        "66+": ratio(t0AgeCounts["66+"], t0PeopleCount),
      },
      sex_ratio_overall_m_to_f: ratio(t0SexCounts.M, Math.max(1, t0SexCounts.F)),
      sex_ratio_15_40_m_to_f: ratio(t0Sex1540Counts.M, Math.max(1, t0Sex1540Counts.F)),
      marital_status_rates_by_age_sex: Object.fromEntries(Object.entries(t0MaritalBySexAge).map(([k, v]) => [k, {
        married_share: ratio(v.married, v.total),
        unmarried_share: ratio(v.unmarried, v.total),
        widowed_share: ratio(v.widowed, v.total),
        count: v.total,
      }])),
      spouse_age_stats_t0: {
        median: Number(median(t0SpouseAges).toFixed(3)),
        pct_ge_35: ratio(t0SpouseAges.filter((x) => x >= 35).length, t0SpouseAges.length),
        pct_ge_40: ratio(t0SpouseAges.filter((x) => x >= 40).length, t0SpouseAges.length),
      },
      children_per_house_distribution: {
        "0": t0ChildrenPerHouse.filter((x) => x === 0).length,
        "1": t0ChildrenPerHouse.filter((x) => x === 1).length,
        "2": t0ChildrenPerHouse.filter((x) => x === 2).length,
        "3": t0ChildrenPerHouse.filter((x) => x === 3).length,
        "4+": t0ChildrenPerHouse.filter((x) => x >= 4).length,
      },
      co_resident_young_couple_share: ratio(t0YoungCoresidentCouples, t0Couples),
    },
  };
}

function writeBatchOutputs(mode: "cohort" | "sim", summary: any) {
  const dir = "qa_artifacts/demography_batch";
  ensureDir(dir);

  const out = { ...summary, hash: stableHash(summary) };
  const file = mode === "cohort" ? "cohort_summary.json" : "sim_summary.json";
  fs.writeFileSync(`${dir}/${file}`, JSON.stringify(out, null, 2));

  const subDir = `${dir}/${mode}`;
  ensureDir(subDir);
  fs.writeFileSync(`${subDir}/summary.json`, JSON.stringify(out, null, 2));

  console.log(`wrote ${dir}/${file}`);
}

function validateCohort(summary: any) {
  // These gates are intentionally strict; failures should still leave artifacts behind.
  const t0: any = summary.worldgen_t0_profile ?? {};
  const kidsShare = Number(t0?.age_band_shares?.["0-14"] ?? 0);
  const eldersShare = Number(t0?.age_band_shares?.["66+"] ?? 0);

  const band15to19 = Number(summary.births_by_maternal_age_band?.["15-19"] ?? 0);
  const band20to24 = Number(summary.births_by_maternal_age_band?.["20-24"] ?? 0);
  const band30to34 = Number(summary.births_by_maternal_age_band?.["30-34"] ?? 0);
  const band45 = Number(summary.births_by_maternal_age_band?.["45+"] ?? 0);
  const teenShare = summary.total_births > 0 ? band15to19 / summary.total_births : 0;

  const checks: string[] = [];
  if (kidsShare < 0.25) checks.push(`T0 kids share too low: ${kidsShare.toFixed(4)} (< 0.25)`);
  if (eldersShare > 0.10) checks.push(`T0 66+ share too high: ${eldersShare.toFixed(4)} (> 0.10)`);
  if (band45 > 0) checks.push(`45+ births must be zero, got ${band45}`);
  if (band20to24 < band30to34) checks.push(`20-24 births must be >= 30-34, got ${band20to24} < ${band30to34}`);
  if (teenShare < 0.06) checks.push(`15-19 birth share too low: ${teenShare.toFixed(4)} (< 0.06)`);

  if (checks.length > 0) {
    // Print enough context to debug without opening JSON.
    const bands = summary.births_by_maternal_age_band ?? {};
    const shares = t0?.age_band_shares ?? {};
    throw new Error(
      `cohort demography validation failed: ${checks.join("; ")}\n` +
      `births_by_maternal_age_band=${JSON.stringify(bands)}\n` +
      `worldgen_t0_profile.age_band_shares=${JSON.stringify(shares)}`
    );
  }
}

function parsePositiveInt(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function getArgMode(argv: string[]): "cohort" | "sim" {
  const a = argv.slice(2);
  const idx = a.indexOf("--mode");
  if (idx >= 0 && a[idx + 1] && (a[idx + 1] === "cohort" || a[idx + 1] === "sim")) return a[idx + 1] as any;
  if (a.includes("cohort")) return "cohort";
  if (a.includes("sim")) return "sim";
  return "sim";
}

function buildSeeds(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}

function runCli() {
  const mode = getArgMode(process.argv);

  // IMPORTANT: allow DOE_SEEDS / DOE_TURNS to drive cohort+sim runs
  const envSeeds = parsePositiveInt(process.env.DOE_SEEDS);
  const envTurns = parsePositiveInt(process.env.DOE_TURNS);

  const defaultSeeds = mode === "cohort" ? 128 : 64;
  const defaultTurns = mode === "cohort" ? 10 : 18;

  const seedsCount = envSeeds ?? defaultSeeds;
  const turns = envTurns ?? defaultTurns;

  const seeds = buildSeeds(seedsCount);

  // Keep tuning fixed for batch mode; DOE grid handles tuning separately.
  const tuning: Tuning = { fertilityScale: 1.0, mortalityScaleChild: 1.0, mortalityScaleAdult: 1.0 };

  const summary = runDemographyBatch(seeds, turns, tuning, mode);

  // Always write artifacts first (even if validation fails)
  writeBatchOutputs(mode, summary);

  // Cohort-only validations
  if (mode === "cohort") validateCohort(summary);
}

if (import.meta.url === `file://${process.argv[1]}`) runCli();
