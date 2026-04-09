import { registryPersonFor } from "../actors";
import { TURN_YEARS } from "../constants";
import { addCourtExtraId, removeCourtExcludeId } from "../court";
import { syncClergyPlacementPersistence } from "../domains/people/clergyPlacementPersistence";
import { buildCanonicalSuccessionSelection } from "../domains/people/successionRegistry";
import { getLivingSpouse } from "../kinship";
import { applyCloseTurnObligationsPhase } from "./phase_obligations";
import type { HouseLogEvent, Person, RunState } from "../types";

export function spouseIdFromKinship(state: RunState, personId: string): string | null {
  return getLivingSpouse(state as any, personId);
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

export function computeHeirId(state: RunState): string | null {
  const heirId = buildCanonicalSuccessionSelection(state).current_heir_id;
  state.house.heir_id = heirId;
  return heirId;
}

export function computeAdultSuccessorId(state: RunState): string | null {
  return buildCanonicalSuccessionSelection(state).adult_successor_id;
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
  // The people-domain seam owns claimant ordering and household fallback now.
  let heirId = deps.computeAdultSuccessorId(state);
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
  syncClergyPlacementPersistence(state);
}
