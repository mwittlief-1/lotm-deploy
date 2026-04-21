import { allHouseMemberIds, playerHouseIdOf, registryPersonFor } from "../actors";
import {
  BIRTH_CHANCE_BY_FERTILITY,
  BIRTH_FERTILE_AGE_MAX,
  BIRTH_FERTILE_AGE_MIN,
  MORTALITY_MULT_WITH_PHYSICIAN,
  TURN_YEARS
} from "../constants";
import { getCourtExcludeIds, getCourtExtraIds, getCourtOfficerIds } from "../court";
import {
  MIN_NOBLE_BIRTH_SPACING_YEARS,
  processNobleFertility,
  processNobleMarriages,
  processNobleMortality
} from "../demography";
import { fertilityAnnualProbabilityByAge, mortalityAnnualProbabilityByAge } from "../demographyCurves";
import { syncClergyPlacementPersistence } from "../domains/people/clergyPlacementPersistence";
import { Rng } from "../rng";
import type { HouseLogEvent, Person, RunState } from "../types";
import { asNonNegInt, clampInt } from "../util";
import { hasImprovement } from "../../content/improvements";
import type { TierSets } from "../tiers";

type HouseholdDemographyDeps = {
  syncPlayerHouseSummaryFromRegistry: (state: RunState) => void;
};

type DynasticTransitionFactV1 = {
  kind: "birth" | "death" | "marriage";
  person_id: string | null;
  person_name: string;
  house_id: string | null;
  house_label: string | null;
  year: number | null;
  source: "household_demography" | "world_noble_demography";
  summary: string;
};

const DYNASTIC_TRANSITION_FACTS_FLAG = "_dynastic_transition_facts_v1";
const DYNASTIC_TRANSITION_FACT_LIMIT = 32;

function houseLabelForId(state: RunState, houseId: string | null): string | null {
  if (!houseId) return null;
  const house: any = (state as any).houses?.[houseId];
  const rawName =
    typeof house?.name === "string" && house.name.trim().length > 0
      ? house.name.trim()
      : typeof house?.house_name === "string" && house.house_name.trim().length > 0
        ? house.house_name.trim()
        : null;
  return rawName ? `House ${rawName}` : houseId;
}

function personHouseId(person: any): string | null {
  const raw = person?.house_id ?? person?.residence_house_id ?? null;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function personLabel(person: any, fallbackId: string | null): string {
  return typeof person?.name === "string" && person.name.trim().length > 0 ? person.name.trim() : fallbackId ?? "Unknown person";
}

function appendDynasticTransitionFact(state: RunState, fact: DynasticTransitionFactV1): void {
  const flags: any = state.flags as any;
  const existing = flags[DYNASTIC_TRANSITION_FACTS_FLAG];
  const current =
    existing &&
    typeof existing === "object" &&
    existing.schema_version === "dynastic_transition_facts_v1" &&
    existing.turn_index === state.turn_index &&
    Array.isArray(existing.facts)
      ? existing
      : {
          schema_version: "dynastic_transition_facts_v1",
          turn_index: state.turn_index,
          facts: [],
          omitted_count: 0
        };

  if (current.facts.length < DYNASTIC_TRANSITION_FACT_LIMIT) {
    current.facts.push(fact);
  } else if (fact.source === "household_demography") {
    const replaceIndex = current.facts
      .map((existingFact: DynasticTransitionFactV1) => existingFact.source)
      .lastIndexOf("world_noble_demography");
    if (replaceIndex >= 0) {
      current.facts.splice(replaceIndex, 1);
      current.facts.push(fact);
      current.omitted_count = Math.max(0, Math.trunc(Number(current.omitted_count) || 0)) + 1;
    } else {
      current.omitted_count = Math.max(0, Math.trunc(Number(current.omitted_count) || 0)) + 1;
    }
  } else {
    current.omitted_count = Math.max(0, Math.trunc(Number(current.omitted_count) || 0)) + 1;
  }

  flags[DYNASTIC_TRANSITION_FACTS_FLAG] = current;
}

function appendBirthFact(state: RunState, person: any, year: number | null, source: DynasticTransitionFactV1["source"]): void {
  const personId = typeof person?.id === "string" ? person.id : typeof person?.person_id === "string" ? person.person_id : null;
  const houseId = personHouseId(person);
  const houseLabel = houseLabelForId(state, houseId);
  const name = personLabel(person, personId);
  appendDynasticTransitionFact(state, {
    kind: "birth",
    person_id: personId,
    person_name: name,
    house_id: houseId,
    house_label: houseLabel,
    year,
    source,
    summary: `${name} was born${houseLabel ? ` into ${houseLabel}` : ""}.`
  });
}

function appendDeathFact(state: RunState, person: any, year: number | null, source: DynasticTransitionFactV1["source"]): void {
  const personId = typeof person?.id === "string" ? person.id : typeof person?.person_id === "string" ? person.person_id : null;
  const houseId = personHouseId(person);
  const houseLabel = houseLabelForId(state, houseId);
  const name = personLabel(person, personId);
  const age = typeof person?.age === "number" && Number.isFinite(person.age) ? Math.trunc(person.age) : null;
  appendDynasticTransitionFact(state, {
    kind: "death",
    person_id: personId,
    person_name: name,
    house_id: houseId,
    house_label: houseLabel,
    year,
    source,
    summary: `${name} died${age !== null ? ` at age ${age}` : ""}${houseLabel ? ` of ${houseLabel}` : ""}.`
  });
}

function tuningObj(state: RunState): Record<string, unknown> {
  const anyFlags: any = state.flags as any;
  if (!anyFlags._tuning || typeof anyFlags._tuning !== "object") anyFlags._tuning = {};
  return anyFlags._tuning as Record<string, unknown>;
}

function tuningNumber(state: RunState, key: string, defaultValue = 1.0): number {
  const t: any = tuningObj(state);
  const v = t?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : defaultValue;
}

function annualProbabilityToTurnProbability(pAnnual: number): number {
  const bounded = Math.max(0, Math.min(0.999, pAnnual));
  return 1 - Math.pow(1 - bounded, TURN_YEARS);
}

function sampledBirthTiming(rng: Rng, turnStartYear: number): { ageAtTurnEnd: number; birthYear: number } {
  const ageAtTurnEnd = rng.int(0, Math.max(0, TURN_YEARS - 1));
  const birthYear = turnStartYear + TURN_YEARS - ageAtTurnEnd;
  return { ageAtTurnEnd, birthYear };
}

export function applyHouseholdDemographyPhase(
  state: RunState,
  houseLog: HouseLogEvent[],
  deps: HouseholdDemographyDeps
): { births: string[]; deaths: string[]; population_delta: number } {
  const births: string[] = [];
  const deaths: string[] = [];
  let popDelta = 0;

  const people: Person[] = [];
  const seenIds = new Set<string>();
  const push = (p: Person | null | undefined) => {
    if (!p || typeof p !== "object") return;
    if (typeof p.id !== "string" || !p.id) return;
    const canonical = registryPersonFor(state, p.id) ?? p;
    if (seenIds.has(canonical.id)) return;
    seenIds.add(canonical.id);
    people.push(canonical);
  };

  push(state.house.head);
  if (state.house.spouse) push(state.house.spouse);
  for (const c of state.house.children) push(c);

  {
    const anyState: any = state as any;
    const reg: Record<string, Person> | undefined = anyState.people as any;
    if (reg) {
      const playerHouseId = playerHouseIdOf(state);
      const houseRec: any = (anyState.houses && typeof anyState.houses === "object") ? anyState.houses[playerHouseId] : null;
      const residentIds = houseRec ? allHouseMemberIds(state, playerHouseId) : [];
      for (const id of residentIds) {
        const resident = reg[id];
        if (resident) push(resident);
      }

      for (const { person_id } of getCourtOfficerIds(state)) {
        const op = reg[person_id];
        if (op) push(op);
      }
    }
  }

  for (const p of people) {
    if (!p.alive) continue;
    p.age += TURN_YEARS;
  }
  deps.syncPlayerHouseSummaryFromRegistry(state);

  const hasPhysician = hasImprovement(state.manor.improvements, "physician");
  const mult = hasPhysician ? MORTALITY_MULT_WITH_PHYSICIAN : 1.0;
  const mortMult = tuningNumber(state, "mortality_mult", 1.0);
  const r = new Rng(state.run_seed, "household", state.turn_index, "mortality");

  const headWasAlive = state.house.head.alive;
  const spouseWasAlive = state.house.spouse?.alive ?? false;

  function deathRoll(p: Person): boolean {
    if (!p.alive) return false;

    const age = typeof p.age === "number" && Number.isFinite(p.age) ? Math.trunc(p.age) : 0;
    if (age >= 99) return true;
    if (state.turn_index === 0 && (p.id === state.house.head.id || p.id === state.house.spouse?.id)) return false;
    const annualBase = mortalityAnnualProbabilityByAge(age);

    const childScale = tuningNumber(state, "mortalityScaleChild", mortMult);
    const adultScale = tuningNumber(state, "mortalityScaleAdult", mortMult);
    const ageScale = age <= 14 ? childScale : adultScale;

    let pTurn = 1 - Math.pow(1 - Math.max(0, Math.min(0.999, annualBase * ageScale)), TURN_YEARS);
    pTurn *= 1 - (p.traits.discipline - 3) * 0.01;
    pTurn *= mult;
    pTurn = Math.max(0, Math.min(0.95, pTurn));
    return r.fork(`d:${p.id}`).bool(pTurn);
  }

  for (const p of people) {
    if (deathRoll(p)) {
      p.alive = false;
      deaths.push(`${p.name} (${p.id})`);
      appendDeathFact(state, p, state.turn_index * TURN_YEARS, "household_demography");
    }
  }

  const headDiedThisTurn = headWasAlive && !state.house.head.alive;
  const spouseDiedThisTurn = spouseWasAlive && Boolean(state.house.spouse) && state.house.spouse!.alive === false;

  if ((headDiedThisTurn || spouseDiedThisTurn) && state.house.spouse) {
    state.house.spouse_status = "widow";

    let survivor: Person | null = null;
    let deceased: Person | null = null;
    if (headDiedThisTurn && state.house.spouse.alive) {
      survivor = state.house.spouse;
      deceased = state.house.head;
    } else if (spouseDiedThisTurn && state.house.head.alive) {
      survivor = state.house.head;
      deceased = state.house.spouse;
    }

    if (survivor && deceased) {
      if (deceased.id === state.house.head.id) state.house.head.alive = false;
      if (state.house.spouse && deceased.id === state.house.spouse.id) state.house.spouse.alive = false;
      houseLog.push({
        kind: "widowed",
        turn_index: state.turn_index,
        spouse_name: deceased.name,
        survivor_name: survivor.name,
        survivor_id: survivor.id,
        survivor_sex: survivor.sex,
        deceased_name: deceased.name,
        deceased_id: deceased.id,
        deceased_age: deceased.age
      });
    }
  }

  const worldYear = state.turn_index * TURN_YEARS;
  const anyState: any = state as any;
  const playerHouseId: string = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
  const peopleRegHouse: Record<string, any> = (anyState.people && typeof anyState.people === "object") ? anyState.people : {};
  const playerHouseRec: any = (anyState.houses && typeof anyState.houses === "object") ? anyState.houses[playerHouseId] : null;
  const memberIdsHouse: string[] = playerHouseRec && Array.isArray(playerHouseRec.member_person_ids) ? playerHouseRec.member_person_ids : [];

  if (state.house.spouse && state.house.spouse.alive && state.house.spouse_status === "spouse" && state.house.head.alive) {
    const spouse = state.house.spouse;
    const fertileAge = spouse.age >= BIRTH_FERTILE_AGE_MIN && spouse.age <= BIRTH_FERTILE_AGE_MAX;
    const lastBirthYear = (spouse as any).last_birth_year;
    const spacingOk = !(
      typeof lastBirthYear === "number" &&
      Number.isFinite(lastBirthYear) &&
      worldYear - Math.trunc(lastBirthYear) < MIN_NOBLE_BIRTH_SPACING_YEARS
    );
    if (fertileAge && spacingOk) {
      const fert = clampInt(spouse.traits.fertility, 1, 5);
      const traitAdj = (BIRTH_CHANCE_BY_FERTILITY[fert] ?? 0.24) / (BIRTH_CHANCE_BY_FERTILITY[3] ?? 0.24);
      const tableBase = fertilityAnnualProbabilityByAge(spouse.age);
      const mods = (state.flags as any)._mods ?? {};
      const bonus = typeof mods.birth_bonus === "number" ? mods.birth_bonus : 1;
      const fertScale = tuningNumber(state, "fertilityScale", tuningNumber(state, "fertility_mult", 1.0));
      const chanceAnnual = Math.max(0, tableBase * traitAdj * bonus * fertScale);
      const chance = Math.min(0.95, Math.max(0, annualProbabilityToTurnProbability(chanceAnnual)));
      const bRng = new Rng(state.run_seed, "household", state.turn_index, "birth");
      if (bRng.bool(chance)) {
        const childId = `p_child_${state.turn_index}_${state.house.children.length + 1}`;
        const sex = bRng.bool(0.52) ? "M" : "F";
        const timing = sampledBirthTiming(bRng.fork(`timing:${childId}`), worldYear);
        const baby: Person = {
          id: childId,
          name: sex === "M" ? "Thomas" : "Anne",
          sex,
          age: timing.ageAtTurnEnd,
          birth_year: timing.birthYear,
          alive: true,
          traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
          married: false,
          house_id: playerHouseId,
          residence_house_id: playerHouseId,
        };
        state.house.children.push(baby);
        peopleRegHouse[childId] = baby;
        if (playerHouseRec && Array.isArray(playerHouseRec.child_ids) && !playerHouseRec.child_ids.includes(childId)) playerHouseRec.child_ids.push(childId);
        if (memberIdsHouse && !memberIdsHouse.includes(childId)) memberIdsHouse.push(childId);
        if (!Array.isArray(anyState.kinship_edges)) anyState.kinship_edges = [];
        anyState.kinship_edges.push({ kind: "parent_of", parent_id: spouse.id, child_id: childId });
        anyState.kinship_edges.push({ kind: "parent_of", parent_id: state.house.head.id, child_id: childId });
        (spouse as any).last_birth_year = timing.birthYear;
        births.push(`${baby.name} (${baby.id})`);
        appendBirthFact(state, baby, timing.birthYear, "household_demography");
        state.manor.population = asNonNegInt(state.manor.population + 1);
        popDelta += 1;
      }
    }
  }

  {
    const peopleReg: Record<string, any> = peopleRegHouse;
    const kinEdges: any[] = Array.isArray(anyState.kinship_edges) ? anyState.kinship_edges : [];

    const spouseOf = new Map<string, string>();
    for (const e of kinEdges) {
      if (!e || typeof e !== "object") continue;
      if (e.kind !== "spouse_of") continue;
      const a = e.a_id;
      const b = e.b_id;
      if (typeof a !== "string" || typeof b !== "string" || !a || !b || a === b) continue;
      if (!spouseOf.has(a)) spouseOf.set(a, b);
      if (!spouseOf.has(b)) spouseOf.set(b, a);
    }

    const extras = new Set<string>(getCourtExtraIds(state));

    const ageFactor = (age: number): number => {
      if (age < 16) return 0;
      if (age <= 30) return 1.0;
      if (age <= 34) return 0.75;
      if (age <= 37) return 0.45;
      if (age <= 40) return 0.20;
      if (age <= 43) return 0.06;
      if (age <= BIRTH_FERTILE_AGE_MAX) return 0.02;
      return 0.0;
    };

    const bRng = new Rng(state.run_seed, "household", state.turn_index, "birth_family");

    const allocId = (): string => {
      if (!state.flags || typeof state.flags !== "object") (state as any).flags = {};
      const f: any = state.flags;
      const pref = typeof f.demography_person_id_prefix === "string" ? f.demography_person_id_prefix : "p";
      const joiner = typeof f.demography_person_id_joiner === "string" ? f.demography_person_id_joiner : "";
      let seq = typeof f.demography_next_person_seq === "number" ? Math.trunc(f.demography_next_person_seq) : 1;
      let id = `${pref}${joiner}${seq}`;
      while (peopleReg[id]) {
        seq += 1;
        id = `${pref}${joiner}${seq}`;
      }
      f.demography_person_id_prefix = pref;
      f.demography_person_id_joiner = joiner;
      f.demography_next_person_seq = seq + 1;
      return id;
    };

    const ensureMemberList = (): string[] => {
      const houses: any = (anyState.houses && typeof anyState.houses === "object") ? anyState.houses : null;
      const h: any = houses ? houses[playerHouseId] : null;
      if (!h || typeof h !== "object") return [];
      if (!Array.isArray(h.member_person_ids)) h.member_person_ids = [];
      return h.member_person_ids as string[];
    };

    const memberIds = ensureMemberList();

    for (const child of state.house.children) {
      if (!child || !child.alive) continue;
      if (!child.married) continue;

      const spouseId = spouseOf.get(child.id);
      if (!spouseId) continue;

      const spouse = peopleReg[spouseId];
      if (!spouse || typeof spouse !== "object") continue;
      if (!spouse.alive) continue;

      const spouseHouse = typeof spouse.house_id === "string" ? spouse.house_id : null;
      if (spouseHouse !== playerHouseId && !extras.has(spouseId)) continue;

      const childSex = child.sex;
      const spouseSex = spouse.sex;
      if (!((childSex === "M" && spouseSex === "F") || (childSex === "F" && spouseSex === "M"))) continue;
      const mother = childSex === "F" ? child : spouse;
      const father = childSex === "M" ? child : spouse;

      const a = Number(mother.age);
      if (!Number.isFinite(a)) continue;
      const fertileAge = a >= BIRTH_FERTILE_AGE_MIN && a <= BIRTH_FERTILE_AGE_MAX;
      if (!fertileAge) continue;

      const lastBirthYear = (mother as any)?.last_birth_year;
      if (
        typeof lastBirthYear === "number" &&
        Number.isFinite(lastBirthYear) &&
        worldYear - Math.trunc(lastBirthYear) < MIN_NOBLE_BIRTH_SPACING_YEARS
      ) continue;

      const fert = clampInt((mother.traits?.fertility ?? 3) as any, 1, 5);
      const traitAdj = (BIRTH_CHANCE_BY_FERTILITY[fert] ?? 0.24) / (BIRTH_CHANCE_BY_FERTILITY[3] ?? 0.24);
      const tableBase = fertilityAnnualProbabilityByAge(a);
      const fertScale = tuningNumber(state, "fertilityScale", tuningNumber(state, "fertility_mult", 1.0));
      const chanceAnnual = Math.max(0, tableBase * ageFactor(a) * traitAdj * fertScale);
      const chance = Math.min(0.95, Math.max(0, annualProbabilityToTurnProbability(chanceAnnual)));
      if (chance <= 0) continue;

      if (bRng.fork(`b:${father.id}:${mother.id}`).bool(chance)) {
        const childId = allocId();
        const sex = bRng.fork(`s:${childId}`).bool(0.52) ? "M" : "F";
        const timing = sampledBirthTiming(bRng.fork(`t:${childId}`), worldYear);
        const baby: any = {
          id: childId,
          name: sex === "M" ? "Thomas" : "Anne",
          sex,
          age: timing.ageAtTurnEnd,
          birth_year: timing.birthYear,
          alive: true,
          married: false,
          traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
          house_id: playerHouseId,
          residence_house_id: playerHouseId,
        };

        peopleReg[childId] = baby;
        (mother as any).last_birth_year = timing.birthYear;

        if (!Array.isArray(anyState.kinship_edges)) anyState.kinship_edges = [];
        anyState.kinship_edges.push({ kind: "parent_of", parent_id: mother.id, child_id: childId });
        anyState.kinship_edges.push({ kind: "parent_of", parent_id: father.id, child_id: childId });

        if (!memberIds.includes(childId)) memberIds.push(childId);

        births.push(`${baby.name} (${baby.id})`);
        appendBirthFact(state, baby, timing.birthYear, "household_demography");
        state.manor.population = asNonNegInt(state.manor.population + 1);
        popDelta += 1;
      }
    }
  }

  syncClergyPlacementPersistence(state);

  return { births, deaths, population_delta: popDelta };
}

export function applyNobleDemographyPhase(state: RunState, tierSets: TierSets): void {
  const anyState: any = state as any;
  const playerHouseId = typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";

  const tier0HouseIds = [...tierSets.tier0.houses].filter((hid) => hid !== playerHouseId).sort((a, b) => a.localeCompare(b));
  const tier1HouseIds = [...tierSets.tier1.houses].filter((hid) => hid !== playerHouseId).sort((a, b) => a.localeCompare(b));

  const playerMemberIds = new Set<string>(allHouseMemberIds(state, playerHouseId));
  const courtExcluded = new Set<string>(getCourtExcludeIds(state));
  const playerPersonIds = new Set<string>([...playerMemberIds].filter((pid) => !courtExcluded.has(pid)));
  if (state.house?.head?.id) playerPersonIds.add(state.house.head.id);
  if (state.house?.spouse?.id) playerPersonIds.add(state.house.spouse.id);

  const tier0PersonIds = [...tierSets.tier0.people]
    .filter((pid) => !playerPersonIds.has(pid))
    .sort((a, b) => a.localeCompare(b));
  const tier1PersonIds = [...tierSets.tier1.people]
    .filter((pid) => !playerPersonIds.has(pid))
    .sort((a, b) => a.localeCompare(b));

  const tierArg = {
    tier0_house_ids: tier0HouseIds,
    tier1_house_ids: tier1HouseIds,
    tier0_person_ids: tier0PersonIds,
    tier1_person_ids: tier1PersonIds,
  };

  const baseYear = state.turn_index * TURN_YEARS;

  {
    const marriageRng = new Rng(state.run_seed, "demography", state.turn_index, "marriage");
    processNobleMarriages(state as any,
      tierArg,
      { float01: (label: string) => marriageRng.fork(label).next() },
      { year: baseYear }
    );
  }

  let birthsThisTurn = 0;
  const shouldAge = (pid: string): boolean => !playerPersonIds.has(pid);
  const ageOneYear = () => {
    const reg: Record<string, any> = ((state as any).people ?? {}) as any;
    const aged = new Set<string>();
    const bump = (pid: string) => {
      if (!shouldAge(pid)) return;
      if (aged.has(pid)) return;
      const p = reg?.[pid];
      if (!p || typeof p !== "object") return;
      if (p.alive === false || p.is_alive === false || p.is_dead === true) return;
      if (typeof p.age === "number" && Number.isFinite(p.age)) p.age += 1;
      aged.add(pid);
    };

    for (const pid of tier0PersonIds) bump(pid);
    for (const pid of tier1PersonIds) bump(pid);
    for (const hid of tier0HouseIds) {
      const h: any = (state as any).houses?.[hid];
      if (!h || typeof h !== "object") continue;
      const ids = allHouseMemberIds(state, hid);
      for (const pid of ids) bump(pid);
    }
    for (const hid of tier1HouseIds) {
      const ids = allHouseMemberIds(state, hid);
      for (const pid of ids) bump(pid);
    }
  };

  for (let yi = 0; yi < TURN_YEARS; yi++) {
    const year = baseYear + yi;
    const mortalityRng = new Rng(state.run_seed, "demography", state.turn_index, `mortality:y${yi}`);
    const fertilityRng = new Rng(state.run_seed, "demography", state.turn_index, `fertility:y${yi}`);

    const mortality = processNobleMortality(state as any,
      tierArg,
      { float01: (label: string) => mortalityRng.fork(label).next() },
      { year }
    );
    for (const death of mortality.deaths) {
      appendDeathFact(state, ((state as any).people ?? {})[death.person_id], death.year, "world_noble_demography");
    }

    const demog = processNobleFertility(state as any,
      tierArg,
      { float01: (label: string) => fertilityRng.fork(label).next() },
      { year }
    );

    if (demog && Array.isArray((demog as any).births)) {
      birthsThisTurn += (demog as any).births.length;
      for (const birth of (demog as any).births) {
        appendBirthFact(state, ((state as any).people ?? {})[birth.child_person_id], birth.year, "world_noble_demography");
      }
    }
    ageOneYear();
  }

  (state.flags as any)._demography_births_last_turn = birthsThisTurn;
}
