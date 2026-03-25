import type { Person, RunState } from "./types";
import { getLivingSpouse } from "./kinship";

const SUCCESSION_MIN_AGE = 15;

type AnyHouse = Record<string, any>;

function peopleMap(state: RunState): Record<string, Person> {
  const anyState: any = state as any;
  return anyState.people && typeof anyState.people === "object" ? (anyState.people as Record<string, Person>) : {};
}

function housesMap(state: RunState): Record<string, AnyHouse> {
  const anyState: any = state as any;
  return anyState.houses && typeof anyState.houses === "object" ? (anyState.houses as Record<string, AnyHouse>) : {};
}

export function playerHouseIdOf(state: RunState): string {
  const anyState: any = state as any;
  return typeof anyState.player_house_id === "string" ? anyState.player_house_id : "h_player";
}

export function registryPersonFor(state: RunState, personId: string | null | undefined): Person | null {
  if (!personId) return null;
  const p = peopleMap(state)[personId];
  if (p && typeof p === "object") return p;
  if (state.house.head?.id === personId) return state.house.head;
  if (state.house.spouse?.id === personId) return state.house.spouse;
  return state.house.children.find((c) => c.id === personId) ?? null;
}

export function allHouseMemberIds(state: RunState, houseId: string): string[] {
  if (!houseId) return [];
  const people = peopleMap(state);
  const house = housesMap(state)[houseId];
  const ids = new Set<string>();
  const add = (pid: unknown) => {
    if (typeof pid === "string" && pid.length > 0) ids.add(pid);
  };

  if (house && typeof house === "object") {
    add(house.head_id);
    add(house.spouse_id);
    if (Array.isArray(house.child_ids)) {
      for (const id of house.child_ids) add(id);
    }
    if (Array.isArray(house.member_person_ids)) {
      for (const id of house.member_person_ids) add(id);
    }
  }

  for (const [pid, person] of Object.entries(people)) {
    if (!person || typeof person !== "object") continue;
    if (person.house_id === houseId || person.residence_house_id === houseId) ids.add(pid);
  }

  return [...ids]
    .filter((pid) => {
      const person = people[pid];
      if (!person || typeof person !== "object") return true;
      const residenceHouseId = typeof person.residence_house_id === "string" && person.residence_house_id.length > 0
        ? person.residence_house_id
        : null;
      const currentHouseId = typeof person.house_id === "string" && person.house_id.length > 0 ? person.house_id : null;
      if (residenceHouseId) return residenceHouseId === houseId;
      if (currentHouseId) return currentHouseId === houseId;
      return true;
    })
    .sort((a, b) => a.localeCompare(b));
}

export function houseIdForPerson(state: RunState, personId: string): string | null {
  if (!personId) return null;
  const houses = housesMap(state);
  for (const hid of Object.keys(houses).sort((a, b) => a.localeCompare(b))) {
    if (allHouseMemberIds(state, hid).includes(personId)) return hid;
  }
  return null;
}

export function structuredHouseIdForPerson(state: RunState, personId: string): string | null {
  if (!personId) return null;
  const houses = housesMap(state);
  for (const hid of Object.keys(houses).sort((a, b) => a.localeCompare(b))) {
    const house = houses[hid];
    if (!house || typeof house !== "object") continue;
    if (house.head_id === personId) return hid;
    if (house.spouse_id === personId) return hid;
    if (Array.isArray(house.child_ids) && house.child_ids.includes(personId)) return hid;
    if (Array.isArray(house.member_person_ids) && house.member_person_ids.includes(personId)) return hid;
  }
  return null;
}

function byHeadPriority(state: RunState, aId: string, bId: string): number {
  const a = registryPersonFor(state, aId);
  const b = registryPersonFor(state, bId);
  const aAdult = a && a.alive && a.age >= SUCCESSION_MIN_AGE ? 1 : 0;
  const bAdult = b && b.alive && b.age >= SUCCESSION_MIN_AGE ? 1 : 0;
  if (aAdult !== bAdult) return bAdult - aAdult;
  const aAge = a && typeof a.age === "number" ? a.age : -1;
  const bAge = b && typeof b.age === "number" ? b.age : -1;
  if (aAge !== bAge) return bAge - aAge;
  return aId.localeCompare(bId);
}

export function resolveCurrentHouseHeadId(state: RunState, houseId: string): string | null {
  const house = housesMap(state)[houseId];
  if (!house || typeof house !== "object") return null;

  const headId = typeof house.head_id === "string" ? house.head_id : null;
  const head = registryPersonFor(state, headId);
  if (head && head.alive) return head.id;

  const spouseId = typeof house.spouse_id === "string" ? house.spouse_id : null;
  const spouse = registryPersonFor(state, spouseId);
  if (spouse && spouse.alive) return spouse.id;

  const members = allHouseMemberIds(state, houseId)
    .filter((pid) => {
      const p = registryPersonFor(state, pid);
      return !!p && p.alive;
    })
    .sort((a, b) => byHeadPriority(state, a, b));

  return members[0] ?? null;
}

export function resolveCurrentHouseSpouseId(state: RunState, houseId: string): string | null {
  const headId = resolveCurrentHouseHeadId(state, houseId);
  if (!headId) return null;
  return getLivingSpouse(state as any, headId);
}

export function syncHouseRegistryCurrentHeads(state: RunState): void {
  const houses = housesMap(state);
  for (const hid of Object.keys(houses).sort((a, b) => a.localeCompare(b))) {
    const house = houses[hid];
    if (!house || typeof house !== "object") continue;
    const nextHeadId = resolveCurrentHouseHeadId(state, hid);
    if (nextHeadId) house.head_id = nextHeadId;
    const nextSpouseId = resolveCurrentHouseSpouseId(state, hid);
    house.spouse_id = nextSpouseId ?? null;
    house.member_person_ids = allHouseMemberIds(state, hid);
  }
}
