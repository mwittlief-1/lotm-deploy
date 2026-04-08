import type { RunState } from "../../types";
import {
  type CourtServiceRecordRegistryV0,
  normalizeCourtServiceRecordRegistry,
  resolveCourtServicePlacementTarget,
} from "../court/officeRegistry";

export const OFFICE_HOLDER_SUCCESSION_HOOKS_SCHEMA_VERSION = "office_holder_succession_hooks_v0" as const;

export type OfficeHolderSuccessionHookV0 = {
  hook_id: string;
  record_id: string;
  seat_id: string;
  owner_actor_id: string;
  holder_person_id: string;
  serve_at_actor_id: string;
  institution_assignment_id: string | null;
  continuity_target_kind: "serving_actor" | "institution_assignment";
  continuity_target_id: string;
  owner_incumbent_person_id: string | null;
  owner_successor_person_id: string | null;
  current_heir_id: string | null;
  adult_successor_id: string | null;
  claim_window_open: boolean;
};

export type OfficeHolderSuccessionHooksV0 = {
  schema_version: typeof OFFICE_HOLDER_SUCCESSION_HOOKS_SCHEMA_VERSION;
  house_id: string;
  generated_at_turn_index: number;
  hook_ids: string[];
  entries: OfficeHolderSuccessionHookV0[];
};

function playerHouseIdOf(state: RunState): string {
  return typeof (state as any).player_house_id === "string" ? (state as any).player_house_id : "h_player";
}

function playerHouseActorId(state: RunState): string {
  return `house:${playerHouseIdOf(state)}`;
}

function resolveAdultSuccessorId(state: RunState, currentHeirId: string | null): string | null {
  const people = state.people ?? {};
  if (currentHeirId) {
    const heir = people[currentHeirId];
    if (heir && heir.alive !== false && heir.age >= 16) return currentHeirId;
  }

  for (const child of state.house.children ?? []) {
    if (!child || child.alive === false) continue;
    if (child.age >= 16) return child.id;
  }

  return null;
}

export function buildOfficeHolderSuccessionHooks(
  state: RunState,
  registryValue: CourtServiceRecordRegistryV0
): OfficeHolderSuccessionHooksV0 {
  const registry = normalizeCourtServiceRecordRegistry(registryValue);
  const houseActorId = playerHouseActorId(state);
  const currentHeirId = typeof state.house.heir_id === "string" ? state.house.heir_id : null;
  const adultSuccessorId = resolveAdultSuccessorId(state, currentHeirId);

  const entries = registry.active_record_ids
    .map((recordId) => registry.records_by_id[recordId]!)
    .sort((left, right) => left.record_id.localeCompare(right.record_id))
    .map((record) => {
      const continuityTarget = resolveCourtServicePlacementTarget(record);
      const ownerIncumbentPersonId = record.owner_actor_id === houseActorId ? state.house.head?.id ?? null : null;
      const ownerSuccessorPersonId =
        record.owner_actor_id === houseActorId
          ? adultSuccessorId ?? currentHeirId ?? null
          : null;

      return {
        hook_id: `${record.record_id}:owner_succession`,
        record_id: record.record_id,
        seat_id: record.seat_id,
        owner_actor_id: record.owner_actor_id,
        holder_person_id: record.holder_person_id,
        serve_at_actor_id: record.serve_at_actor_id,
        institution_assignment_id: record.institution_assignment_id,
        continuity_target_kind: continuityTarget.kind,
        continuity_target_id: continuityTarget.id,
        owner_incumbent_person_id: ownerIncumbentPersonId,
        owner_successor_person_id: ownerSuccessorPersonId,
        current_heir_id: currentHeirId,
        adult_successor_id: adultSuccessorId,
        claim_window_open: false,
      };
    });

  return {
    schema_version: OFFICE_HOLDER_SUCCESSION_HOOKS_SCHEMA_VERSION,
    house_id: playerHouseIdOf(state),
    generated_at_turn_index: state.turn_index,
    hook_ids: entries.map((entry) => entry.hook_id),
    entries,
  };
}
