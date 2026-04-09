import { allHouseMemberIds, playerHouseIdOf, registryPersonFor, structuredHouseIdForPerson } from "../../actors";
import type { InstitutionType, RunState, Sex } from "../../types";

export const CLERGY_TRACK_REGISTRY_SCHEMA_VERSION = "clergy_track_registry_v0" as const;
export const CLERGY_TRACK_ENTRY_SCHEMA_VERSION = "clergy_track_entry_v0" as const;
export const CLERGY_ELIGIBILITY_REGISTRY_SCHEMA_VERSION = "clergy_eligibility_registry_v0" as const;
export const CLERGY_TRACK_MIN_AGE = 12 as const;

export const CLERGY_TRACK_KINDS = ["holy_orders", "convent"] as const;
export type ClergyTrackKind = (typeof CLERGY_TRACK_KINDS)[number];

export const CLERGY_PLACEMENT_SOURCES = ["send_to_orders", "send_to_convent"] as const;
export type ClergyPlacementSource = (typeof CLERGY_PLACEMENT_SOURCES)[number];

export const CLERGY_ELIGIBILITY_BLOCKERS = [
  "dead",
  "underage",
  "married",
  "wrong_sex",
  "house_head",
  "house_spouse",
  "current_heir",
  "already_placed",
] as const;
export type ClergyEligibilityBlocker = (typeof CLERGY_ELIGIBILITY_BLOCKERS)[number];

export type ClergyTrackEntry = {
  schema_version: typeof CLERGY_TRACK_ENTRY_SCHEMA_VERSION;
  entry_id: string;
  track_kind: ClergyTrackKind;
  placement_source: ClergyPlacementSource;
  person_id: string;
  person_name: string;
  sex: Sex | null;
  age_at_placement: number | null;
  house_id: string | null;
  residence_house_id: string | null;
  institution_id: string | null;
  institution_type: InstitutionType | null;
  start_turn_index: number;
  end_turn_index: number | null;
  active: boolean;
};

export type ClergyTrackRegistry = {
  schema_version: typeof CLERGY_TRACK_REGISTRY_SCHEMA_VERSION;
  entry_ids: string[];
  active_entry_ids: string[];
  person_ids: string[];
  entries_by_id: Record<string, ClergyTrackEntry>;
  person_entry_ids: Record<string, string[]>;
};

export type ClergyEligibilityEntry = {
  eligibility_key: string;
  track_kind: ClergyTrackKind;
  person_id: string;
  person_name: string;
  sex: Sex | null;
  age: number | null;
  house_id: string | null;
  institution_type: InstitutionType | null;
  eligible: boolean;
  blocker_codes: ClergyEligibilityBlocker[];
};

export type ClergyEligibilityRegistry = {
  schema_version: typeof CLERGY_ELIGIBILITY_REGISTRY_SCHEMA_VERSION;
  house_id: string;
  generated_at_turn_index: number;
  minimum_age: number;
  entry_keys: string[];
  entries_by_key: Record<string, ClergyEligibilityEntry>;
};

export type PlacePersonOnClergyTrackInput = {
  person_id: string;
  track_kind: ClergyTrackKind;
  institution_id?: string | null;
  institution_type?: InstitutionType | null;
  turn_index?: number;
};

type ClergyTrackEntryDraft = Omit<ClergyTrackEntry, "schema_version" | "entry_id">;

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

function normalizeOptionalId(value: string | null | undefined): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeSex(value: unknown): Sex | null {
  return value === "M" || value === "F" ? value : null;
}

function normalizeInstitutionType(value: unknown): InstitutionType | null {
  return value === "bishopric" || value === "abbey" || value === "parish" || value === "town_corporation" ? value : null;
}

function normalizeTurnIndex(value: unknown, fallback = 0): number {
  return Number.isFinite(value) ? Math.trunc(Number(value)) : fallback;
}

function compareClergyTrackEntries(a: ClergyTrackEntry, b: ClergyTrackEntry): number {
  const activeDelta = Number(b.active) - Number(a.active);
  if (activeDelta !== 0) return activeDelta;
  if (a.start_turn_index !== b.start_turn_index) return a.start_turn_index - b.start_turn_index;
  return compareText(a.entry_id, b.entry_id);
}

function compareEligibilityEntries(a: ClergyEligibilityEntry, b: ClergyEligibilityEntry): number {
  const eligibleDelta = Number(b.eligible) - Number(a.eligible);
  if (eligibleDelta !== 0) return eligibleDelta;
  if (a.track_kind !== b.track_kind) return compareText(a.track_kind, b.track_kind);
  const ageDelta = (b.age ?? -1) - (a.age ?? -1);
  if (ageDelta !== 0) return ageDelta;
  return compareText(a.person_id, b.person_id);
}

function placementSourceForTrackKind(trackKind: ClergyTrackKind): ClergyPlacementSource {
  return trackKind === "holy_orders" ? "send_to_orders" : "send_to_convent";
}

function sexRequiredForTrackKind(trackKind: ClergyTrackKind): Sex {
  return trackKind === "holy_orders" ? "M" : "F";
}

function institutionTypeForTrackKind(trackKind: ClergyTrackKind): InstitutionType {
  return trackKind === "holy_orders" ? "parish" : "abbey";
}

export function makeClergyTrackEntryId(trackKind: ClergyTrackKind, personId: string): string {
  return `clergy_track:${trackKind}:${personId}`;
}

export function makeClergyEligibilityKey(trackKind: ClergyTrackKind, personId: string): string {
  return `clergy_eligibility:${trackKind}:${personId}`;
}

function createClergyTrackEntry(draft: ClergyTrackEntryDraft): ClergyTrackEntry {
  return {
    schema_version: CLERGY_TRACK_ENTRY_SCHEMA_VERSION,
    entry_id: makeClergyTrackEntryId(draft.track_kind, draft.person_id),
    track_kind: draft.track_kind,
    placement_source: draft.placement_source,
    person_id: draft.person_id,
    person_name: draft.person_name,
    sex: normalizeSex(draft.sex),
    age_at_placement: typeof draft.age_at_placement === "number" ? Math.trunc(draft.age_at_placement) : null,
    house_id: normalizeOptionalId(draft.house_id),
    residence_house_id: normalizeOptionalId(draft.residence_house_id),
    institution_id: normalizeOptionalId(draft.institution_id),
    institution_type: normalizeInstitutionType(draft.institution_type),
    start_turn_index: normalizeTurnIndex(draft.start_turn_index),
    end_turn_index: draft.end_turn_index == null ? null : normalizeTurnIndex(draft.end_turn_index),
    active: draft.active,
  };
}

function normalizeClergyTrackEntry(value: unknown): ClergyTrackEntry | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Partial<ClergyTrackEntry>;
  if (draft.track_kind !== "holy_orders" && draft.track_kind !== "convent") return null;
  if (typeof draft.person_id !== "string" || draft.person_id.length === 0) return null;
  return createClergyTrackEntry({
    track_kind: draft.track_kind,
    placement_source:
      draft.placement_source === "send_to_orders" || draft.placement_source === "send_to_convent"
        ? draft.placement_source
        : placementSourceForTrackKind(draft.track_kind),
    person_id: draft.person_id,
    person_name: typeof draft.person_name === "string" && draft.person_name.length > 0 ? draft.person_name : draft.person_id,
    sex: normalizeSex(draft.sex),
    age_at_placement: typeof draft.age_at_placement === "number" ? draft.age_at_placement : null,
    house_id: normalizeOptionalId(draft.house_id),
    residence_house_id: normalizeOptionalId(draft.residence_house_id),
    institution_id: normalizeOptionalId(draft.institution_id),
    institution_type: normalizeInstitutionType(draft.institution_type),
    start_turn_index: normalizeTurnIndex(draft.start_turn_index),
    end_turn_index: draft.end_turn_index == null ? null : normalizeTurnIndex(draft.end_turn_index),
    active: draft.active !== false && draft.end_turn_index == null,
  });
}

export function buildClergyTrackRegistry(entries: readonly ClergyTrackEntryDraft[]): ClergyTrackRegistry {
  const normalized = entries
    .map((entry) => createClergyTrackEntry(entry))
    .sort(compareClergyTrackEntries);

  const entriesById = new Map<string, ClergyTrackEntry>();
  for (const entry of normalized) {
    entriesById.set(entry.entry_id, entry);
  }

  const entryIds = sortStrings(entriesById.keys());
  const activeEntryIds = entryIds.filter((entryId) => entriesById.get(entryId)?.active === true);
  const personIds = sortUniqueStrings(entryIds.map((entryId) => entriesById.get(entryId)?.person_id ?? ""));
  const personEntryIds = Object.fromEntries(
    personIds.map((personId) => [
      personId,
      entryIds.filter((entryId) => entriesById.get(entryId)?.person_id === personId),
    ])
  );

  return {
    schema_version: CLERGY_TRACK_REGISTRY_SCHEMA_VERSION,
    entry_ids: entryIds,
    active_entry_ids: activeEntryIds,
    person_ids: personIds,
    entries_by_id: Object.fromEntries(entryIds.map((entryId) => [entryId, entriesById.get(entryId)!])),
    person_entry_ids: personEntryIds,
  };
}

export function normalizeClergyTrackRegistry(value: unknown): ClergyTrackRegistry {
  if (!value || typeof value !== "object") return buildClergyTrackRegistry([]);
  const rawEntries = Array.isArray((value as any).entry_ids)
    ? (value as any).entry_ids
        .map((entryId: unknown) =>
          typeof entryId === "string" ? normalizeClergyTrackEntry((value as any).entries_by_id?.[entryId]) : null
        )
        .filter((entry: ClergyTrackEntry | null): entry is ClergyTrackEntry => Boolean(entry))
    : Object.values((value as any).entries_by_id ?? {})
        .map((entry) => normalizeClergyTrackEntry(entry))
        .filter((entry: ClergyTrackEntry | null): entry is ClergyTrackEntry => Boolean(entry));

  return buildClergyTrackRegistry(
    rawEntries.map((entry) => ({
      track_kind: entry.track_kind,
      placement_source: entry.placement_source,
      person_id: entry.person_id,
      person_name: entry.person_name,
      sex: entry.sex,
      age_at_placement: entry.age_at_placement,
      house_id: entry.house_id,
      residence_house_id: entry.residence_house_id,
      institution_id: entry.institution_id,
      institution_type: entry.institution_type,
      start_turn_index: entry.start_turn_index,
      end_turn_index: entry.end_turn_index,
      active: entry.active,
    }))
  );
}

export function ensureClergyTrackRegistry(state: RunState): ClergyTrackRegistry {
  const stateAny: any = state as any;
  const registry = normalizeClergyTrackRegistry(stateAny.clergy_track_registry);
  stateAny.clergy_track_registry = registry;
  (state.house as any).clergy_track_registry = registry;
  return registry;
}

function activeClergyTrackEntryForPerson(registry: ClergyTrackRegistry, personId: string): ClergyTrackEntry | null {
  const entryIds = registry.person_entry_ids[personId] ?? [];
  for (const entryId of entryIds) {
    const entry = registry.entries_by_id[entryId];
    if (entry?.active) return entry;
  }
  return null;
}

function buildEligibilityBlockers(
  state: RunState,
  registry: ClergyTrackRegistry,
  personId: string,
  trackKind: ClergyTrackKind,
  minimumAge: number
): ClergyEligibilityBlocker[] {
  const person = registryPersonFor(state, personId);
  if (!person) return ["dead"];

  const blockers = new Set<ClergyEligibilityBlocker>();
  const requiredSex = sexRequiredForTrackKind(trackKind);

  if (!person.alive) blockers.add("dead");
  if (typeof person.age !== "number" || person.age < minimumAge) blockers.add("underage");
  if (person.married === true) blockers.add("married");
  if (person.sex !== requiredSex) blockers.add("wrong_sex");
  if (person.id === state.house.head?.id) blockers.add("house_head");
  if (person.id === state.house.spouse?.id) blockers.add("house_spouse");
  if (person.id === (state.house.heir_id ?? null)) blockers.add("current_heir");
  if (activeClergyTrackEntryForPerson(registry, personId)) blockers.add("already_placed");

  return sortStrings(blockers) as ClergyEligibilityBlocker[];
}

export function buildClergyEligibilityRegistry(
  state: RunState,
  options?: {
    house_id?: string;
    minimum_age?: number;
    include_ineligible?: boolean;
    clergy_track_registry?: ClergyTrackRegistry;
  }
): ClergyEligibilityRegistry {
  const houseId = normalizeOptionalId(options?.house_id) ?? playerHouseIdOf(state);
  const minimumAge = Math.max(0, Math.trunc(options?.minimum_age ?? CLERGY_TRACK_MIN_AGE));
  const includeIneligible = options?.include_ineligible !== false;
  const registry = options?.clergy_track_registry ?? ensureClergyTrackRegistry(state);

  const entries = allHouseMemberIds(state, houseId)
    .filter((personId) => structuredHouseIdForPerson(state, personId) === houseId)
    .flatMap((personId) => {
      const person = registryPersonFor(state, personId);
      if (!person) return [];
      return CLERGY_TRACK_KINDS.map((trackKind) => {
        const blockerCodes = buildEligibilityBlockers(state, registry, personId, trackKind, minimumAge);
        return {
          eligibility_key: makeClergyEligibilityKey(trackKind, personId),
          track_kind: trackKind,
          person_id: personId,
          person_name: person.name,
          sex: normalizeSex(person.sex),
          age: typeof person.age === "number" ? Math.trunc(person.age) : null,
          house_id: structuredHouseIdForPerson(state, personId),
          institution_type: institutionTypeForTrackKind(trackKind),
          eligible: blockerCodes.length === 0,
          blocker_codes: blockerCodes,
        } satisfies ClergyEligibilityEntry;
      });
    })
    .filter((entry) => includeIneligible || entry.eligible)
    .sort(compareEligibilityEntries);

  const entryKeys = entries.map((entry) => entry.eligibility_key);

  return {
    schema_version: CLERGY_ELIGIBILITY_REGISTRY_SCHEMA_VERSION,
    house_id: houseId,
    generated_at_turn_index: normalizeTurnIndex(state.turn_index),
    minimum_age: minimumAge,
    entry_keys: entryKeys,
    entries_by_key: Object.fromEntries(entries.map((entry) => [entry.eligibility_key, entry])),
  };
}

export function placePersonOnClergyTrack(
  state: RunState,
  input: PlacePersonOnClergyTrackInput
): ClergyTrackRegistry {
  const registry = ensureClergyTrackRegistry(state);
  const eligibility = buildClergyEligibilityRegistry(state, {
    clergy_track_registry: registry,
    include_ineligible: true,
  });
  const eligibilityKey = makeClergyEligibilityKey(input.track_kind, input.person_id);
  const eligibilityEntry = eligibility.entries_by_key[eligibilityKey];

  if (!eligibilityEntry || !eligibilityEntry.eligible) {
    const blockers = eligibilityEntry?.blocker_codes.join(", ") ?? "unknown_person";
    throw new Error(`Person ${input.person_id} is not eligible for ${input.track_kind}: ${blockers}`);
  }

  const person = registryPersonFor(state, input.person_id);
  if (!person) throw new Error(`Unknown person for clergy placement: ${input.person_id}`);

  const nextEntry = createClergyTrackEntry({
    track_kind: input.track_kind,
    placement_source: placementSourceForTrackKind(input.track_kind),
    person_id: person.id,
    person_name: person.name,
    sex: normalizeSex(person.sex),
    age_at_placement: typeof person.age === "number" ? person.age : null,
    house_id: structuredHouseIdForPerson(state, person.id),
    residence_house_id: normalizeOptionalId(person.residence_house_id),
    institution_id: normalizeOptionalId(input.institution_id),
    institution_type: normalizeInstitutionType(input.institution_type) ?? institutionTypeForTrackKind(input.track_kind),
    start_turn_index: normalizeTurnIndex(input.turn_index, state.turn_index),
    end_turn_index: null,
    active: true,
  });

  const nextEntries = [
    ...registry.entry_ids
      .map((entryId) => registry.entries_by_id[entryId])
      .filter((entry) => entry.entry_id !== nextEntry.entry_id)
      .map((entry) => ({
        track_kind: entry.track_kind,
        placement_source: entry.placement_source,
        person_id: entry.person_id,
        person_name: entry.person_name,
        sex: entry.sex,
        age_at_placement: entry.age_at_placement,
        house_id: entry.house_id,
        residence_house_id: entry.residence_house_id,
        institution_id: entry.institution_id,
        institution_type: entry.institution_type,
        start_turn_index: entry.start_turn_index,
        end_turn_index: entry.end_turn_index,
        active: entry.active,
      })),
    {
      track_kind: nextEntry.track_kind,
      placement_source: nextEntry.placement_source,
      person_id: nextEntry.person_id,
      person_name: nextEntry.person_name,
      sex: nextEntry.sex,
      age_at_placement: nextEntry.age_at_placement,
      house_id: nextEntry.house_id,
      residence_house_id: nextEntry.residence_house_id,
      institution_id: nextEntry.institution_id,
      institution_type: nextEntry.institution_type,
      start_turn_index: nextEntry.start_turn_index,
      end_turn_index: nextEntry.end_turn_index,
      active: nextEntry.active,
    },
  ];

  const nextRegistry = buildClergyTrackRegistry(nextEntries);
  (state as any).clergy_track_registry = nextRegistry;
  (state.house as any).clergy_track_registry = nextRegistry;
  return nextRegistry;
}

export function buildClergyTrackRegistryFromState(state: RunState): ClergyTrackRegistry {
  return ensureClergyTrackRegistry(state);
}
