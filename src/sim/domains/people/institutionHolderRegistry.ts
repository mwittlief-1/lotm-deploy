import type { ActorId, InstitutionType, RunState, Sex } from "../../types";
import {
  buildClergyTrackRegistryFromState,
  ensureClergyTrackRegistry,
  makeClergyTrackEntryId,
  normalizeClergyTrackRegistry,
  placePersonOnClergyTrack,
  type ClergyTrackKind,
  type ClergyTrackRegistry,
} from "./clergyTrackRegistry";

export const INSTITUTION_HOLDER_REGISTRY_SCHEMA_VERSION = "institution_holder_registry_v0" as const;
export const INSTITUTION_HOLDER_ENTRY_SCHEMA_VERSION = "institution_holder_entry_v0" as const;

export const INSTITUTION_HOLDER_ROLES = [
  "parish_priest",
  "bishop",
  "abbot",
  "abbess",
] as const;
export type InstitutionHolderRole = (typeof INSTITUTION_HOLDER_ROLES)[number];

export type InstitutionHolderEntry = {
  schema_version: typeof INSTITUTION_HOLDER_ENTRY_SCHEMA_VERSION;
  institution_id: string;
  institution_type: InstitutionType;
  holder_person_id: string | null;
  holder_actor_id: ActorId | null;
  holder_role: InstitutionHolderRole | null;
  clergy_track_entry_id: string | null;
  clergy_track_kind: ClergyTrackKind | null;
  start_turn_index: number | null;
  last_confirmed_turn_index: number;
  occupied: boolean;
};

export type InstitutionHolderRegistry = {
  schema_version: typeof INSTITUTION_HOLDER_REGISTRY_SCHEMA_VERSION;
  institution_ids: string[];
  holder_person_ids: string[];
  entries_by_institution_id: Record<string, InstitutionHolderEntry>;
};

export type AssignInstitutionHolderInput = {
  institution_id: string;
  person_id: string;
  track_kind: ClergyTrackKind;
  turn_index?: number;
};

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function sortStrings(values: Iterable<string>): string[] {
  return [...values].sort(compareText);
}

function sortUniqueStrings(values: Iterable<string>): string[] {
  return sortStrings(new Set([...values].filter((value) => value.length > 0)));
}

function normalizeTurnIndex(value: unknown, fallback = 0): number {
  return Number.isFinite(value) ? Math.trunc(Number(value)) : fallback;
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeInstitutionType(value: unknown): InstitutionType | null {
  return value === "bishopric" || value === "abbey" || value === "parish" || value === "town_corporation" ? value : null;
}

function normalizeClergyTrackKind(value: unknown): ClergyTrackKind | null {
  return value === "holy_orders" || value === "convent" ? value : null;
}

function normalizeInstitutionHolderRole(value: unknown): InstitutionHolderRole | null {
  return value === "parish_priest" || value === "bishop" || value === "abbot" || value === "abbess" ? value : null;
}

function normalizeActorId(value: unknown): ActorId | null {
  if (!value || typeof value !== "object") return null;
  const actor = value as Partial<ActorId>;
  if ((actor.kind === "person" || actor.kind === "house" || actor.kind === "institution") && typeof actor.id === "string" && actor.id.length > 0) {
    return { kind: actor.kind, id: actor.id };
  }
  return null;
}

function normalizeInstitutionHolderEntry(value: unknown): InstitutionHolderEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<InstitutionHolderEntry>;
  const institutionType = normalizeInstitutionType(entry.institution_type);
  if (typeof entry.institution_id !== "string" || entry.institution_id.length === 0 || !institutionType) return null;
  return {
    schema_version: INSTITUTION_HOLDER_ENTRY_SCHEMA_VERSION,
    institution_id: entry.institution_id,
    institution_type: institutionType,
    holder_person_id: normalizeOptionalId(entry.holder_person_id),
    holder_actor_id: normalizeActorId(entry.holder_actor_id),
    holder_role: normalizeInstitutionHolderRole(entry.holder_role),
    clergy_track_entry_id: normalizeOptionalId(entry.clergy_track_entry_id),
    clergy_track_kind: normalizeClergyTrackKind(entry.clergy_track_kind),
    start_turn_index: entry.start_turn_index == null ? null : normalizeTurnIndex(entry.start_turn_index),
    last_confirmed_turn_index: normalizeTurnIndex(entry.last_confirmed_turn_index),
    occupied: entry.occupied === true,
  };
}

export function normalizeInstitutionHolderRegistry(value: unknown): InstitutionHolderRegistry {
  if (!value || typeof value !== "object") {
    return {
      schema_version: INSTITUTION_HOLDER_REGISTRY_SCHEMA_VERSION,
      institution_ids: [],
      holder_person_ids: [],
      entries_by_institution_id: {},
    };
  }

  const rawEntries = Array.isArray((value as any).institution_ids)
    ? (value as any).institution_ids
        .map((institutionId: unknown) =>
          typeof institutionId === "string"
            ? normalizeInstitutionHolderEntry((value as any).entries_by_institution_id?.[institutionId])
            : null
        )
        .filter((entry: InstitutionHolderEntry | null): entry is InstitutionHolderEntry => Boolean(entry))
    : Object.values((value as any).entries_by_institution_id ?? {})
        .map((entry) => normalizeInstitutionHolderEntry(entry))
        .filter((entry: InstitutionHolderEntry | null): entry is InstitutionHolderEntry => Boolean(entry));

  const institutionIds = sortStrings(rawEntries.map((entry) => entry.institution_id));
  const holderPersonIds = sortUniqueStrings(rawEntries.map((entry) => entry.holder_person_id ?? ""));
  return {
    schema_version: INSTITUTION_HOLDER_REGISTRY_SCHEMA_VERSION,
    institution_ids: institutionIds,
    holder_person_ids: holderPersonIds,
    entries_by_institution_id: Object.fromEntries(rawEntries.map((entry) => [entry.institution_id, entry])),
  };
}

function institutionMap(state: RunState): Record<string, any> {
  const stateAny: any = state as any;
  return stateAny.institutions && typeof stateAny.institutions === "object" ? (stateAny.institutions as Record<string, any>) : {};
}

function readHolderSex(state: RunState, holderPersonId: string | null): Sex | null {
  if (!holderPersonId) return null;
  const people = ((state as any).people ?? {}) as Record<string, any>;
  const person = people[holderPersonId];
  return person?.sex === "M" || person?.sex === "F" ? person.sex : null;
}

function roleForInstitution(
  institutionType: InstitutionType,
  holderSex: Sex | null,
  clergyTrackKind: ClergyTrackKind | null
): InstitutionHolderRole | null {
  if (institutionType === "parish") return "parish_priest";
  if (institutionType === "bishopric") return "bishop";
  if (institutionType === "abbey") {
    if (clergyTrackKind === "convent" || holderSex === "F") return "abbess";
    return "abbot";
  }
  return null;
}

function activePlacementByInstitution(
  registry: ClergyTrackRegistry
): Map<string, ReturnType<typeof normalizeClergyTrackRegistry>["entries_by_id"][string]> {
  const out = new Map<string, ReturnType<typeof normalizeClergyTrackRegistry>["entries_by_id"][string]>();
  for (const entryId of registry.active_entry_ids) {
    const entry = registry.entries_by_id[entryId];
    if (!entry?.active || !entry.institution_id) continue;
    const current = out.get(entry.institution_id);
    if (!current || compareText(entry.entry_id, current.entry_id) < 0) out.set(entry.institution_id, entry);
  }
  return out;
}

export function buildInstitutionHolderRegistry(
  state: RunState,
  options?: { clergy_track_registry?: ClergyTrackRegistry }
): InstitutionHolderRegistry {
  const institutions = institutionMap(state);
  const prior = normalizeInstitutionHolderRegistry((state as any).institution_holder_registry);
  const clergyTrackRegistry = options?.clergy_track_registry ?? buildClergyTrackRegistryFromState(state);
  const placementByInstitution = activePlacementByInstitution(clergyTrackRegistry);
  const institutionIds = Object.keys(institutions).sort(compareText);
  const nowTurn = normalizeTurnIndex(state.turn_index);

  const entries = institutionIds.map((institutionId) => {
    const institution = institutions[institutionId];
    const institutionType = normalizeInstitutionType(institution?.type) ?? "parish";
    const placement = placementByInstitution.get(institutionId) ?? null;
    const directParishHolderId =
      institutionType === "parish" && typeof institution?.priest_person_id === "string" && institution.priest_person_id.length > 0
        ? institution.priest_person_id
        : null;
    const holderPersonId = placement?.person_id ?? directParishHolderId ?? null;
    const priorEntry = prior.entries_by_institution_id[institutionId];
    const startTurnIndex =
      holderPersonId && priorEntry?.holder_person_id === holderPersonId
        ? priorEntry.start_turn_index
        : holderPersonId
          ? placement?.start_turn_index ?? nowTurn
          : null;
    const clergyTrackKind = placement?.track_kind ?? null;
    const holderSex = readHolderSex(state, holderPersonId);

    return {
      schema_version: INSTITUTION_HOLDER_ENTRY_SCHEMA_VERSION,
      institution_id: institutionId,
      institution_type: institutionType,
      holder_person_id: holderPersonId,
      holder_actor_id: holderPersonId ? ({ kind: "person", id: holderPersonId } as const) : null,
      holder_role: roleForInstitution(institutionType, holderSex, clergyTrackKind),
      clergy_track_entry_id: placement?.entry_id ?? null,
      clergy_track_kind: clergyTrackKind,
      start_turn_index: startTurnIndex,
      last_confirmed_turn_index: nowTurn,
      occupied: Boolean(holderPersonId),
    } satisfies InstitutionHolderEntry;
  });

  const holderPersonIds = sortUniqueStrings(entries.map((entry) => entry.holder_person_id ?? ""));
  return {
    schema_version: INSTITUTION_HOLDER_REGISTRY_SCHEMA_VERSION,
    institution_ids: institutionIds,
    holder_person_ids: holderPersonIds,
    entries_by_institution_id: Object.fromEntries(entries.map((entry) => [entry.institution_id, entry])),
  };
}

export function ensureInstitutionHolderRegistry(
  state: RunState,
  options?: { clergy_track_registry?: ClergyTrackRegistry }
): InstitutionHolderRegistry {
  const registry = buildInstitutionHolderRegistry(state, options);
  (state as any).institution_holder_registry = registry;
  (state.house as any).institution_holder_registry = registry;
  return registry;
}

export function lookupInstitutionHolder(
  registry: InstitutionHolderRegistry,
  institutionId: string
): InstitutionHolderEntry | null {
  return registry.entries_by_institution_id[institutionId] ?? null;
}

export function assignInstitutionHolder(
  state: RunState,
  input: AssignInstitutionHolderInput
): {
  clergy_track_registry: ClergyTrackRegistry;
  institution_holder_registry: InstitutionHolderRegistry;
} {
  const institutions = institutionMap(state);
  const institution = institutions[input.institution_id];
  if (!institution || typeof institution !== "object") {
    throw new Error(`Unknown institution for holder assignment: ${input.institution_id}`);
  }

  const institutionType = normalizeInstitutionType(institution.type);
  if (!institutionType) {
    throw new Error(`Unsupported institution type for holder assignment: ${String(institution.type)}`);
  }

  const clergyTrackRegistry = placePersonOnClergyTrack(state, {
    person_id: input.person_id,
    track_kind: input.track_kind,
    institution_id: input.institution_id,
    institution_type: institutionType,
    turn_index: input.turn_index,
  });

  if (institutionType === "parish") {
    institution.priest_person_id = input.person_id;
  }

  const institutionHolderRegistry = ensureInstitutionHolderRegistry(state, { clergy_track_registry: clergyTrackRegistry });
  return {
    clergy_track_registry: clergyTrackRegistry,
    institution_holder_registry: institutionHolderRegistry,
  };
}

export function buildInstitutionHolderRegistryFromState(state: RunState): InstitutionHolderRegistry {
  const stateAny: any = state as any;
  const registry = normalizeInstitutionHolderRegistry(stateAny.institution_holder_registry);
  if (registry.institution_ids.length > 0) return registry;
  return ensureInstitutionHolderRegistry(state, { clergy_track_registry: ensureClergyTrackRegistry(state) });
}
