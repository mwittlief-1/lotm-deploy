import { playerHouseIdOf, registryPersonFor } from "../actors";
import { TURN_YEARS } from "../constants";
import { addCourtExtraId, removeCourtExcludeId } from "../court";
import { getChildren as kinChildren, getParents as kinParents, isAlive as kinIsAlive } from "../kinship";
import { applyCloseTurnObligationsPhase } from "./phase_obligations";
import type { HouseLogEvent, Person, RunState } from "../types";
import { asNonNegInt } from "../util";

const SUCCESSION_MIN_AGE = 15;

export function spouseIdFromKinship(state: RunState, personId: string): string | null {
  const anyState: any = state as any;
  const edges = (anyState.kinship_edges ?? []) as any[];

  const matches = new Set<string>();
  for (const e of edges) {
    if (!e || e.kind !== "spouse_of") continue;
    if (e.a_id === personId && typeof e.b_id === "string") matches.add(e.b_id);
    else if (e.b_id === personId && typeof e.a_id === "string") matches.add(e.a_id);
  }

  const sorted = [...matches].sort((a, b) => a.localeCompare(b));
  return sorted[0] ?? null;
}

function fallbackHeirIdFromHouseMembers(state: RunState): string | null {
  const anyState: any = state as any;
  const playerHouseId = playerHouseIdOf(state);
  const houseRec: any = (anyState.houses && typeof anyState.houses === "object") ? anyState.houses[playerHouseId] : null;
  const reg: Record<string, any> = (anyState.people && typeof anyState.people === "object") ? anyState.people : {};
  const memberIds: string[] = Array.isArray(houseRec?.member_person_ids)
    ? houseRec.member_person_ids.filter((x: any): x is string => typeof x === "string" && x.length > 0)
    : [];
  const candidates = memberIds
    .map((id) => reg[id])
    .filter((p) => p && p.alive !== false)
    .filter((p) => typeof p.id === "string" && p.id !== state.house.head.id)
    .filter((p) => typeof p.age === "number" && p.age >= SUCCESSION_MIN_AGE)
    .sort((a, b) => Number(b.age ?? 0) - Number(a.age ?? 0) || String(a.id).localeCompare(String(b.id)));
  return candidates[0]?.id ?? null;
}

export function rebaseHeadRelationships(state: RunState, oldHeadId: string | null, newHeadId: string): void {
  if (!oldHeadId || !newHeadId || oldHeadId === newHeadId) return;
  const existing: any[] = Array.isArray(state.relationships) ? state.relationships : [];
  const kept = new Map<string, any>();

  for (const edge of existing) {
    if (!edge || typeof edge.from_id !== "string" || typeof edge.to_id !== "string") continue;
    if (edge.from_id === oldHeadId || edge.to_id === oldHeadId) continue;
    const key = `${edge.from_id}->${edge.to_id}`;
    if (!kept.has(key)) kept.set(key, { ...edge });
  }

  for (const edge of existing) {
    if (!edge || typeof edge.from_id !== "string" || typeof edge.to_id !== "string") continue;
    if (edge.from_id !== oldHeadId && edge.to_id !== oldHeadId) continue;
    const fromId = edge.from_id === oldHeadId ? newHeadId : edge.from_id;
    const toId = edge.to_id === oldHeadId ? newHeadId : edge.to_id;
    if (fromId === toId) continue;
    const key = `${fromId}->${toId}`;
    if (!kept.has(key)) kept.set(key, { ...edge, from_id: fromId, to_id: toId });
  }

  state.relationships = [...kept.values()];
}

function computeHeirIdInternal(state: RunState, minAge: number, persist = true): string | null {
  const headId = state.house.head?.id;

  const byPrimogeniture = (a: Person, b: Person) => {
    if (b.age !== a.age) return b.age - a.age;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  };

  const alive = (id: string): boolean => {
    const p = registryPersonFor(state, id);
    if (p) return !!p.alive;
    return kinIsAlive(state as any, id);
  };

  const malesByIds = (ids: string[]): Person[] =>
    ids
      .map((id) => registryPersonFor(state, id))
      .filter((p): p is Person => !!p && p.alive && p.sex === "M" && typeof p.age === "number" && p.age >= minAge)
      .sort(byPrimogeniture);

  const childBranchOrder = (ids: string[], sex: "M" | "F"): string[] =>
    ids
      .map((id) => registryPersonFor(state, id))
      .filter((p): p is Person => !!p && p.sex === sex)
      .sort(byPrimogeniture)
      .map((p) => p.id);

  const firstEligibleInBranch = (branchRootId: string, seen: Set<string>): string | null => {
    if (seen.has(branchRootId)) return null;
    seen.add(branchRootId);

    const root = registryPersonFor(state, branchRootId);
    if (root && root.alive && typeof root.age === "number" && root.age >= minAge) return root.id;

    const childIds = kinChildren(state as any, branchRootId)
      .map((id) => registryPersonFor(state, id))
      .filter((p): p is Person => !!p)
      .sort(byPrimogeniture)
      .map((p) => p.id);
    for (const childId of childIds) {
      const found = firstEligibleInBranch(childId, seen);
      if (found) return found;
    }
    return null;
  };

  const childIds = headId ? kinChildren(state as any, headId) : [];
  const sonBranches = childBranchOrder(childIds, "M");
  const daughterBranches = childBranchOrder(childIds, "F");
  for (const branchId of [...sonBranches, ...daughterBranches]) {
    const found = firstEligibleInBranch(branchId, new Set<string>(headId ? [headId] : []));
    if (found) {
      if (persist) state.house.heir_id = found;
      return found;
    }
  }

  if (headId) {
    const seen = new Set<string>([headId]);

    let maleAncestors = kinParents(state as any, headId)
      .filter((pid) => {
        const p = registryPersonFor(state, pid);
        return !!p && p.sex === "M";
      })
      .sort((a, b) => a.localeCompare(b));

    for (let up = 1; up <= 4 && maleAncestors.length > 0; up++) {
      const nextAncestors: string[] = [];
      for (const ancId of maleAncestors) {
        seen.add(ancId);

        let layer = kinChildren(state as any, ancId)
          .filter((cid) => !seen.has(cid))
          .sort((a, b) => a.localeCompare(b));

        for (let down = 1; down <= 4 && layer.length > 0; down++) {
          const males = malesByIds(layer).filter((p) => p.id !== headId && alive(p.id));
          if (males.length > 0) {
            if (persist) state.house.heir_id = males[0].id;
            return males[0].id;
          }

          const nextLayer: string[] = [];
          for (const id of layer) {
            seen.add(id);
            const p = registryPersonFor(state, id);
            if (!p || p.sex !== "M") continue;
            for (const kid of kinChildren(state as any, id)) {
              if (!seen.has(kid)) nextLayer.push(kid);
            }
          }
          layer = nextLayer.sort((a, b) => a.localeCompare(b));
        }

        for (const pid of kinParents(state as any, ancId)) {
          const pp = registryPersonFor(state, pid);
          if (pp && pp.sex === "M") nextAncestors.push(pid);
        }
      }
      maleAncestors = Array.from(new Set(nextAncestors)).sort((a, b) => a.localeCompare(b));
    }
  }

  if (persist) state.house.heir_id = null;
  return null;
}

export function computeHeirId(state: RunState): string | null {
  return computeHeirIdInternal(state, 0, true);
}

export function computeAdultSuccessorId(state: RunState): string | null {
  return computeHeirIdInternal(state, SUCCESSION_MIN_AGE, false);
}

type SuccessionDeps = {
  computeAdultSuccessorId: (state: RunState) => string | null;
  computeHeirId: (state: RunState) => string | null;
  rebaseHeadRelationships: (state: RunState, oldHeadId: string | null, newHeadId: string) => void;
  syncPlayerHouseSummaryFromRegistry: (state: RunState) => void;
};

export function resolveSuccessionPhase(
  state: RunState,
  houseLog: HouseLogEvent[],
  reportNotes: string[] | undefined,
  deps: SuccessionDeps
): void {
  if (state.house.head.alive) return;

  const priorHeadId = state.house.head?.id ?? null;
  let heirId = deps.computeAdultSuccessorId(state) ?? fallbackHeirIdFromHouseMembers(state);
  if (!heirId) {
    const anyState: any = state as any;
    const reg: Record<string, any> = (anyState.people && typeof anyState.people === "object") ? anyState.people : {};
    const dynId = `p_dyn_heir_${state.turn_index}`;
    if (!reg[dynId]) {
      const spouse = state.house.spouse;
      const sex: "M" | "F" = spouse?.sex === "F" ? "M" : "F";
      reg[dynId] = {
        id: dynId,
        name: sex === "M" ? "Edmund" : "Matilda",
        sex,
        age: 16,
        birth_year: state.turn_index * TURN_YEARS - 16,
        alive: true,
        married: false,
        traits: { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 },
        house_id: anyState.player_house_id ?? "h_player",
        residence_house_id: anyState.player_house_id ?? "h_player",
      };
      state.house.children.push(reg[dynId]);
      const houseRec: any = anyState.houses?.[anyState.player_house_id ?? "h_player"];
      if (houseRec && Array.isArray(houseRec.child_ids) && !houseRec.child_ids.includes(dynId)) houseRec.child_ids.push(dynId);
      if (houseRec && Array.isArray(houseRec.member_person_ids) && !houseRec.member_person_ids.includes(dynId)) houseRec.member_person_ids.push(dynId);
    }
    heirId = dynId;
    reportNotes?.push("Emergency succession: a cadet heir was elevated to prevent line extinction.");
  }

  const priorSpouseId = state.house.spouse?.id ?? null;

  const idx = state.house.children.findIndex((c) => c.id === heirId);
  let heir: Person | null = idx >= 0 ? (state.house.children.splice(idx, 1)[0] ?? null) : null;
  if (!heir) {
    const anyState: any = state as any;
    const reg: Record<string, Person> | undefined = anyState.people as any;
    heir = reg?.[heirId] ?? null;
  }
  if (!heir) {
    state.game_over = { reason: "DeathNoHeir", turn_index: state.turn_index };
    return;
  }

  removeCourtExcludeId(state, heir.id);

  const anyState: any = state as any;
  const reg: Record<string, Person> | undefined = anyState.people as any;
  if (reg && heirId && reg[heirId]) heir = reg[heirId] ?? heir;
  else if (reg && heirId) reg[heirId] = heir;

  const heirSpouseId = spouseIdFromKinship(state, heir.id);
  heir.married = Boolean(heirSpouseId && reg?.[heirSpouseId] && reg[heirSpouseId]!.alive);
  state.house.head = heir;
  if (heirSpouseId && reg?.[heirSpouseId]) {
    state.house.spouse = reg[heirSpouseId];
    state.house.spouse_status = "spouse";
    state.house.spouse.married = true;
  } else {
    state.house.spouse = undefined;
    state.house.spouse_status = undefined;
  }

  if (priorSpouseId && priorSpouseId !== state.house.spouse?.id) {
    addCourtExtraId(state, priorSpouseId);
  }

  deps.rebaseHeadRelationships(state, priorHeadId, heir.id);
  deps.syncPlayerHouseSummaryFromRegistry(state);

  houseLog.push({ kind: "succession", turn_index: state.turn_index, new_ruler_name: heir.name });

  const prev = state.house.heir_id ?? null;
  const next = deps.computeHeirId(state);
  if (next && next !== prev) {
    const nm = registryPersonFor(state, next)?.name;
    if (nm) houseLog.push({ kind: "heir_selected", turn_index: state.turn_index, heir_name: nm });
  }
  deps.syncPlayerHouseSummaryFromRegistry(state);

  reportNotes?.push("Succession resolved.");
}

export function closeTurnPhase(
  state: RunState,
  reportNotes: string[],
  houseLog: HouseLogEvent[],
  deps: SuccessionDeps
): void {
  applyCloseTurnObligationsPhase(state, reportNotes);

  delete (state.flags as any).Shortage;
  delete (state.flags as any).MarriageOffer;

  resolveSuccessionPhase(state, houseLog, reportNotes, deps);
  if (state.game_over) return;
  deps.syncPlayerHouseSummaryFromRegistry(state);

  if (state.manor.unrest >= 100) {
    state.game_over = { reason: "Dispossessed", turn_index: state.turn_index, details: { unrest: state.manor.unrest } };
    return;
  }

  state.turn_index += 1;
}
