import { playerHouseIdOf } from "../../actors";
import type { RunState } from "../../types";
import {
  type CourtServiceRecordRegistryV0,
  normalizeCourtServiceRecordRegistry,
  resolveCourtServicePlacementTarget,
} from "../court/officeRegistry";
import { buildClaimantRegistry } from "./successionRegistry";

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

function playerHouseActorId(state: RunState): string {
  return `house:${playerHouseIdOf(state)}`;
}

export function buildOfficeHolderSuccessionHooks(
  state: RunState,
  registryValue: CourtServiceRecordRegistryV0
): OfficeHolderSuccessionHooksV0 {
  const registry = normalizeCourtServiceRecordRegistry(registryValue);
  const claimantRegistry = buildClaimantRegistry(state);
  const houseActorId = playerHouseActorId(state);

  const entries = registry.active_record_ids
    .map((recordId) => registry.records_by_id[recordId]!)
    .sort((left, right) => left.record_id.localeCompare(right.record_id))
    .map((record) => {
      const continuityTarget = resolveCourtServicePlacementTarget(record);
      const ownerIncumbentPersonId = record.owner_actor_id === houseActorId ? state.house.head?.id ?? null : null;
      const ownerSuccessorPersonId =
        record.owner_actor_id === houseActorId
          ? claimantRegistry.adult_successor_id ?? claimantRegistry.current_heir_id ?? null
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
        current_heir_id: claimantRegistry.current_heir_id,
        adult_successor_id: claimantRegistry.adult_successor_id,
        claim_window_open: claimantRegistry.claim_window_open,
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
