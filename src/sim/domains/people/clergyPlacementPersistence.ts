import type { RunState } from "../../types";
import { ensureClergyTrackRegistry, type ClergyTrackRegistry } from "./clergyTrackRegistry";
import { ensureInstitutionHolderRegistry, type InstitutionHolderRegistry } from "./institutionHolderRegistry";

function hasEntries(raw: unknown, idKey: string, mapKey: string): boolean {
  if (!raw || typeof raw !== "object") return false;
  const value = raw as Record<string, unknown>;
  if (Array.isArray(value[idKey])) return value[idKey].length > 0;
  const entries = value[mapKey];
  return Boolean(entries && typeof entries === "object" && Object.keys(entries as Record<string, unknown>).length > 0);
}

function hasSeededParishHolder(state: RunState): boolean {
  const institutions = ((state as any).institutions ?? {}) as Record<string, unknown>;
  for (const institutionId of Object.keys(institutions).sort((a, b) => a.localeCompare(b))) {
    const institution = institutions[institutionId] as Record<string, unknown> | undefined;
    if (!institution || institution.type !== "parish") continue;
    if (typeof institution.priest_person_id === "string" && institution.priest_person_id.trim().length > 0) return true;
  }
  return false;
}

export function hasClergyPlacementPersistence(state: RunState): boolean {
  const stateAny: any = state as any;
  return (
    hasEntries(stateAny.clergy_track_registry, "entry_ids", "entries_by_id") ||
    hasEntries(stateAny.institution_holder_registry, "institution_ids", "entries_by_institution_id") ||
    hasSeededParishHolder(state)
  );
}

export function syncClergyPlacementPersistence(
  state: RunState
): { clergy_track_registry: ClergyTrackRegistry; institution_holder_registry: InstitutionHolderRegistry } | null {
  if (!hasClergyPlacementPersistence(state)) return null;
  const clergyTrackRegistry = ensureClergyTrackRegistry(state);
  const institutionHolderRegistry = ensureInstitutionHolderRegistry(state, { clergy_track_registry: clergyTrackRegistry });
  return {
    clergy_track_registry: clergyTrackRegistry,
    institution_holder_registry: institutionHolderRegistry,
  };
}
