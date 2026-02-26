import type { RunState } from "./types";
import { deriveCourtMemberIds } from "./court";

/**
 * Tiering defaults (v0.2.8)
 *
 * Tiering is defined in terms of **actors**: people, houses, and institutions.
 * Tier sets are intended to be used by derived views (marriage market, intel lists, etc.)
 * to decide which actors should be pre-instantiated (Tier0/Tier1) vs left as stubs (Tier2).
 */
export const TIER1_MAX_HOUSES_DEFAULT = 160;

export type TierActorSet = {
  people: Set<string>;
  houses: Set<string>;
  institutions: Set<string>;
};

export type TierSets = {
  tier0: TierActorSet;
  tier1: TierActorSet;
  tier2: TierActorSet;
};

function mkTierActorSet(): TierActorSet {
  return {
    people: new Set<string>(),
    houses: new Set<string>(),
    institutions: new Set<string>(),
  };
}

function getTuningNumber(state: RunState, key: string): number | null {
  const anyFlags: any = (state as any)?.flags;
  const v = anyFlags?._tuning?.[key];
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  return null;
}

function getRegistries(state: RunState): {
  houses: Record<string, any>;
  people: Record<string, any>;
  institutions: Record<string, any>;
  playerHouseId: string;
} {
  const s: any = state as any;
  const houses = s?.houses && typeof s.houses === "object" ? (s.houses as Record<string, any>) : {};
  const people = s?.people && typeof s.people === "object" ? (s.people as Record<string, any>) : {};
  const institutions = s?.institutions && typeof s.institutions === "object" ? (s.institutions as Record<string, any>) : {};
  const playerHouseId = typeof s?.player_house_id === "string" && s.player_house_id.length > 0 ? s.player_house_id : "h_player";
  return { houses, people, institutions, playerHouseId };
}

function indexPersonToHouseId(houses: Record<string, any>): Map<string, string> {
  const out = new Map<string, string>();
  for (const hid of Object.keys(houses).sort()) {
    const h: any = houses[hid];
    if (!h || typeof h !== "object") continue;

    const candidates: string[] = [];
    if (typeof h.head_id === "string" && h.head_id) candidates.push(h.head_id);
    if (typeof h.spouse_id === "string" && h.spouse_id) candidates.push(h.spouse_id);
    if (Array.isArray(h.child_ids)) {
      for (const x of h.child_ids) if (typeof x === "string" && x) candidates.push(x);
    }

    for (const pid of candidates) {
      // Deterministic tie-break: prefer lexicographically-smallest house id.
      const cur = out.get(pid);
      if (!cur || hid.localeCompare(cur) < 0) out.set(pid, hid);
    }
  }
  return out;
}

function addPerson(set: TierActorSet, personId: unknown): void {
  if (typeof personId === "string" && personId.length > 0) set.people.add(personId);
}

function addHouse(set: TierActorSet, houseId: unknown): void {
  if (typeof houseId === "string" && houseId.length > 0) set.houses.add(houseId);
}

function addInstitution(set: TierActorSet, instId: unknown): void {
  if (typeof instId === "string" && instId.length > 0) set.institutions.add(instId);
}

function addHouseForPerson(set: TierActorSet, personToHouse: Map<string, string>, personId: unknown): void {
  if (typeof personId !== "string" || personId.length === 0) return;
  const hid = personToHouse.get(personId);
  if (hid) set.houses.add(hid);
}

function readIdList(maybe: any): string[] {
  if (!maybe) return [];
  if (!Array.isArray(maybe)) return [];
  const out: string[] = [];
  for (const x of maybe) {
    if (typeof x === "string" && x.length > 0) out.push(x);
    else if (x && typeof x === "object" && typeof x.id === "string" && x.id.length > 0) out.push(x.id);
  }
  return out;
}

function selectInstitutionsByType(institutions: Record<string, any>, types: string[], cap: number): string[] {
  const typeSet = new Set(types);
  return Object.keys(institutions)
    .filter((id) => {
      const inst = institutions[id];
      const t = inst?.type;
      return typeof t === "string" && typeSet.has(t);
    })
    .sort()
    .slice(0, Math.max(0, cap));
}

/**
 * Deterministic tier selector.
 *
 * v0.2.8 Tier0 is broader than "player court".
 * It includes (when present in state):
 * - player house + player court roster (incl. non-family advisors)
 * - liege-chain court snapshots (liege/count/king)
 * - diocese bishop court snapshot
 * - player-local parish institution
 *
 * Fallback behavior is deterministic: if deeper liege-chain / bishopric structures are
 * not yet instantiated, Tier0 will include the actors that *are* present (typically persons),
 * plus any houses resolvable from the People-First registries.
 */
export function computeTierSets(state: RunState): TierSets {
  const anyState: any = state as any;
  const { houses, institutions, playerHouseId } = getRegistries(state);
  const personToHouse = indexPersonToHouseId(houses);

  const tier0 = mkTierActorSet();
  const tier1 = mkTierActorSet();
  const tier2 = mkTierActorSet();

  // --- Tier0 (always instantiated/updated) ---
  addHouse(tier0, playerHouseId);

  // Player court roster persons (explicit rule: court roster drives relevance).
  for (const pid of deriveCourtMemberIds(state)) addPerson(tier0, pid);
  addPerson(tier0, state.house?.head?.id);
  addPerson(tier0, state.house?.spouse?.id ?? null);

  // Liege-chain snapshot (if fields exist; otherwise the liege person is still included).
  addPerson(tier0, state.locals?.liege?.id);
  addPerson(tier0, anyState.locals?.count?.id);
  addPerson(tier0, anyState.locals?.king?.id);
  for (const id of readIdList(anyState.locals?.liege_chain)) addPerson(tier0, id);

  // Diocese bishop snapshot (fallback behavior).
  addPerson(tier0, state.locals?.clergy?.id);
  addPerson(tier0, anyState.locals?.diocese_bishop?.id);
  addInstitution(tier0, anyState.locals?.diocese_bishopric_id);
  addInstitution(tier0, anyState.locals?.bishopric_institution_id);

  // Player-local parish institution (if instantiated).
  const parishId: string | null =
    (typeof anyState.locals?.parish_institution_id === "string" && anyState.locals.parish_institution_id) ||
    (typeof anyState.manor?.parish_institution_id === "string" && anyState.manor.parish_institution_id) ||
    null;
  if (parishId && institutions[parishId]) addInstitution(tier0, parishId);

  // Deterministic parish fallback: include the lexicographically-first parish whose patron is the player house.
  if (!parishId) {
    const parishCandidates = Object.keys(institutions)
      .filter((id) => {
        const inst: any = institutions[id];
        if (!inst || typeof inst !== "object" || inst.type !== "parish") return false;
        const patron: any = inst.patron_actor_id;
        if (patron && typeof patron === "object" && patron.kind === "house" && patron.id === playerHouseId) return true;
        return inst.patron_house_id === playerHouseId;
      })
      .sort();
    if (parishCandidates.length > 0) addInstitution(tier0, parishCandidates[0]!);
  }

  // Map Tier0 persons to their houses (when known in the registry).
  for (const pid of tier0.people) addHouseForPerson(tier0, personToHouse, pid);

  // --- Tier1 (bounded snapshots) ---
  const capRaw = getTuningNumber(state, "tier1_max_houses");
  const cap = Math.max(0, capRaw ?? TIER1_MAX_HOUSES_DEFAULT);

  // Priority houses: any houses already in Tier0 (except the player), plus houses containing local nobles.
  const priorityHouses = new Set<string>();
  for (const pid of tier0.people) {
    const hid = personToHouse.get(pid);
    if (hid && hid !== playerHouseId) priorityHouses.add(hid);
  }
  for (const n of state.locals?.nobles ?? []) {
    const nid = (n as any)?.id;
    const hid = typeof nid === "string" ? personToHouse.get(nid) : null;
    if (hid && hid !== playerHouseId) priorityHouses.add(hid);
  }

  const addTier1House = (hid: string) => {
    if (!hid) return;
    if (tier0.houses.has(hid)) return;
    if (tier1.houses.has(hid)) return;
    if (tier1.houses.size >= cap) return;
    tier1.houses.add(hid);
  };

  for (const hid of [...priorityHouses].sort()) addTier1House(hid);
  for (const hid of Object.keys(houses).sort()) addTier1House(hid);

  // Tier1 institutions: local important institutions (bishopric + abbeys/monasteries) if present.
  const instCap = Math.min(24, Math.max(0, getTuningNumber(state, "tier1_max_institutions") ?? 18));
  for (const iid of selectInstitutionsByType(institutions, ["bishopric", "abbey"], instCap)) addInstitution(tier1, iid);

  // --- Tier2 (stubs) ---
  for (const hid of Object.keys(houses).sort()) {
    if (tier0.houses.has(hid)) continue;
    if (tier1.houses.has(hid)) continue;
    tier2.houses.add(hid);
  }
  for (const iid of Object.keys(institutions).sort()) {
    if (tier0.institutions.has(iid)) continue;
    if (tier1.institutions.has(iid)) continue;
    tier2.institutions.add(iid);
  }

  return { tier0, tier1, tier2 };
}
