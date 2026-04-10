import { playerHouseIdOf, registryPersonFor, structuredHouseIdForPerson } from "../../actors";
import type { RunState } from "../../types";
import { listLegacyFilledHouseCourtOffices } from "../court/officeRegistry";
import {
  buildBoundedWorldTopologyView,
  classifyTravelDistance,
  getNumericDistanceMetrics,
  loadBundledWorldDomain,
  type WorldDomainV1,
} from "../world";

export const RESIDENCE_SELECTOR_SUMMARY_SCHEMA_VERSION = "residence_selector_summary_v0" as const;
export const RESIDENCE_SELECTOR_ENTRY_SCHEMA_VERSION = "residence_selector_entry_v0" as const;
export const RESIDENCE_DISTANCE_HOOKS_SCHEMA_VERSION = "residence_distance_hooks_v0" as const;

export const RESIDENCE_SELECTOR_CONTEXTS = [
  "household",
  "clergy",
  "office",
  "service",
  "external_house",
] as const;
export type ResidenceSelectorContext = (typeof RESIDENCE_SELECTOR_CONTEXTS)[number];

export const RESIDENCE_SELECTOR_SOURCE_KINDS = [
  "player_anchor_manor",
  "local_parish_anchor",
  "service_target_anchor",
  "external_house_unmapped",
  "service_target_unmapped",
  "unknown",
] as const;
export type ResidenceSelectorSourceKind = (typeof RESIDENCE_SELECTOR_SOURCE_KINDS)[number];

export type ResidenceSelectorEntry = {
  schema_version: typeof RESIDENCE_SELECTOR_ENTRY_SCHEMA_VERSION;
  person_id: string;
  person_name: string;
  residence_manor_id: string | null;
  selector_contexts: ResidenceSelectorContext[];
  source_kind: ResidenceSelectorSourceKind;
  source_ref_id: string | null;
  travel_cost_distance: number | null;
  route_hop_distance: number | null;
  distance_band: "near" | "far" | null;
};

export type ResidenceSelectorSummary = {
  schema_version: typeof RESIDENCE_SELECTOR_SUMMARY_SCHEMA_VERSION;
  anchor_manor_id: string | null;
  person_ids: string[];
  entries_by_person_id: Record<string, ResidenceSelectorEntry>;
};

export type ResidenceDistanceHookEntry = {
  person_id: string;
  residence_manor_id: string | null;
  travel_cost_distance: number | null;
  route_hop_distance: number | null;
  distance_band: "near" | "far" | null;
};

export type ResidenceDistanceHooks = {
  schema_version: typeof RESIDENCE_DISTANCE_HOOKS_SCHEMA_VERSION;
  anchor_manor_id: string | null;
  person_ids: string[];
  entries_by_person_id: Record<string, ResidenceDistanceHookEntry>;
};

type ServiceTargetResolution = {
  kind: ResidenceSelectorSourceKind;
  source_ref_id: string | null;
  residence_manor_id: string | null;
};

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function sortStrings(values: Iterable<string>): string[] {
  return [...values].sort(compareText);
}

function normalizeOptionalId(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function attachHiddenSurface(target: object | null | undefined, key: string, value: unknown): void {
  if (!target || typeof target !== "object") return;
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    writable: true,
    configurable: true,
  });
}

function readPeople(state: RunState): Record<string, any> {
  const anyState: any = state as any;
  return anyState.people && typeof anyState.people === "object" ? (anyState.people as Record<string, any>) : {};
}

function readServiceRecords(state: RunState): any[] {
  const anyState: any = state as any;
  return Array.isArray(anyState.service_records) ? [...anyState.service_records] : [];
}

function readLocalParishInstitutionId(state: RunState): string | null {
  const anyState: any = state as any;
  const fromLocals = normalizeOptionalId(anyState.locals?.parish_institution_id);
  if (fromLocals) return fromLocals;
  return normalizeOptionalId(anyState.manor?.parish_institution_id);
}

function readAnchorManorId(domain: WorldDomainV1): string | null {
  return normalizeOptionalId(buildBoundedWorldTopologyView(domain).anchor_manor_id);
}

function collectServiceTargetResolutionByPerson(
  state: RunState,
  anchorManorId: string | null,
  localParishId: string | null
): Map<string, ServiceTargetResolution> {
  const playerHouseId = playerHouseIdOf(state);
  const activeRecords = readServiceRecords(state)
    .filter((record) => record && typeof record === "object" && record.end_turn_index == null)
    .sort((left, right) => String(left.id ?? "").localeCompare(String(right.id ?? "")));
  const out = new Map<string, ServiceTargetResolution>();

  for (const record of activeRecords) {
    const personId = normalizeOptionalId(record.person_id);
    if (!personId || out.has(personId)) continue;

    const institutionAssignmentId = normalizeOptionalId(record.institution_assignment_id);
    const servingActorKind = typeof record.serving_actor_id?.kind === "string" ? record.serving_actor_id.kind : null;
    const servingActorId = normalizeOptionalId(record.serving_actor_id?.id);

    if (institutionAssignmentId && localParishId && institutionAssignmentId === localParishId) {
      out.set(personId, {
        kind: "service_target_anchor",
        source_ref_id: institutionAssignmentId,
        residence_manor_id: anchorManorId,
      });
      continue;
    }

    if (servingActorKind === "house" && servingActorId === playerHouseId) {
      out.set(personId, {
        kind: "service_target_anchor",
        source_ref_id: servingActorId,
        residence_manor_id: anchorManorId,
      });
      continue;
    }

    if (servingActorKind === "institution" && servingActorId && localParishId && servingActorId === localParishId) {
      out.set(personId, {
        kind: "service_target_anchor",
        source_ref_id: servingActorId,
        residence_manor_id: anchorManorId,
      });
      continue;
    }

    out.set(personId, {
      kind: "service_target_unmapped",
      source_ref_id: institutionAssignmentId ?? servingActorId,
      residence_manor_id: null,
    });
  }

  return out;
}

function collectClergyPersonIds(state: RunState): Set<string> {
  const anyState: any = state as any;
  const out = new Set<string>();

  const localClergyId = normalizeOptionalId(anyState.locals?.clergy?.id);
  if (localClergyId) out.add(localClergyId);

  const clergyRegistry = anyState.clergy_track_registry;
  if (clergyRegistry && typeof clergyRegistry === "object") {
    for (const personId of clergyRegistry.person_ids ?? []) {
      const normalized = normalizeOptionalId(personId);
      if (normalized) out.add(normalized);
    }
  }

  const institutionRegistry = anyState.institution_holder_registry;
  if (institutionRegistry && typeof institutionRegistry === "object") {
    for (const personId of institutionRegistry.holder_person_ids ?? []) {
      const normalized = normalizeOptionalId(personId);
      if (normalized) out.add(normalized);
    }
  }

  return out;
}

function collectOfficeSeatHolderIds(state: RunState): Set<string> {
  const out = new Set<string>();
  for (const assignment of listLegacyFilledHouseCourtOffices(state)) {
    const holderPersonId = normalizeOptionalId(assignment.person_id);
    if (holderPersonId) out.add(holderPersonId);
  }

  const registry = (state.house as any)?.court_office_registry;
  if (!registry || typeof registry !== "object") return out;

  for (const seatId of registry.seat_ids ?? []) {
    const seat = registry.seats_by_id?.[seatId];
    const holderPersonId = normalizeOptionalId(seat?.holder_person_id);
    if (holderPersonId) out.add(holderPersonId);
  }

  return out;
}

function collectSelectorContexts(
  state: RunState,
  personId: string,
  clergyPersonIds: Set<string>,
  officeHolderIds: Set<string>,
  serviceTargetsByPerson: Map<string, ServiceTargetResolution>
): ResidenceSelectorContext[] {
  const contexts = new Set<ResidenceSelectorContext>();
  const playerHouseId = playerHouseIdOf(state);
  const person = registryPersonFor(state, personId);
  const currentResidenceHouseId = normalizeOptionalId(person?.residence_house_id);
  const structuredHouseId = structuredHouseIdForPerson(state, personId);
  const currentHouseId = normalizeOptionalId(person?.house_id);

  if (currentResidenceHouseId === playerHouseId || structuredHouseId === playerHouseId || currentHouseId === playerHouseId) {
    contexts.add("household");
  }
  if (clergyPersonIds.has(personId)) contexts.add("clergy");
  if (officeHolderIds.has(personId)) contexts.add("office");
  if (serviceTargetsByPerson.has(personId)) contexts.add("service");
  if (!contexts.has("household") && (currentResidenceHouseId || structuredHouseId || currentHouseId)) {
    contexts.add("external_house");
  }

  return sortStrings(contexts) as ResidenceSelectorContext[];
}

function resolveResidenceSource(
  state: RunState,
  personId: string,
  anchorManorId: string | null,
  localParishId: string | null,
  serviceTargetsByPerson: Map<string, ServiceTargetResolution>
): { source_kind: ResidenceSelectorSourceKind; source_ref_id: string | null; residence_manor_id: string | null } {
  const anyState: any = state as any;
  const playerHouseId = playerHouseIdOf(state);
  const person = registryPersonFor(state, personId);
  const currentResidenceHouseId = normalizeOptionalId(person?.residence_house_id);
  const structuredHouseId = structuredHouseIdForPerson(state, personId);
  const currentHouseId = normalizeOptionalId(person?.house_id);

  const localClergyId = normalizeOptionalId(anyState.locals?.clergy?.id);
  if (localClergyId && personId === localClergyId && localParishId) {
    return {
      source_kind: "local_parish_anchor",
      source_ref_id: localParishId,
      residence_manor_id: anchorManorId,
    };
  }

  const holderEntry = anyState.institution_holder_registry?.entries_by_institution_id
    ? Object.values(anyState.institution_holder_registry.entries_by_institution_id as Record<string, any>)
        .find((entry) => normalizeOptionalId((entry as any)?.holder_person_id) === personId)
    : null;
  if (holderEntry && localParishId && normalizeOptionalId((holderEntry as any).institution_id) === localParishId) {
    return {
      source_kind: "local_parish_anchor",
      source_ref_id: localParishId,
      residence_manor_id: anchorManorId,
    };
  }

  const serviceTarget = serviceTargetsByPerson.get(personId);
  if (serviceTarget) {
    return {
      source_kind: serviceTarget.kind,
      source_ref_id: serviceTarget.source_ref_id,
      residence_manor_id: serviceTarget.residence_manor_id,
    };
  }

  if (currentResidenceHouseId === playerHouseId || structuredHouseId === playerHouseId || currentHouseId === playerHouseId) {
    return {
      source_kind: "player_anchor_manor",
      source_ref_id: playerHouseId,
      residence_manor_id: anchorManorId,
    };
  }

  const externalHouseId = currentResidenceHouseId ?? structuredHouseId ?? currentHouseId;
  if (externalHouseId) {
    return {
      source_kind: "external_house_unmapped",
      source_ref_id: externalHouseId,
      residence_manor_id: null,
    };
  }

  return {
    source_kind: "unknown",
    source_ref_id: null,
    residence_manor_id: null,
  };
}

function buildDistanceFields(
  domain: WorldDomainV1,
  anchorManorId: string | null,
  residenceManorId: string | null
): { travel_cost_distance: number | null; route_hop_distance: number | null; distance_band: "near" | "far" | null } {
  if (!anchorManorId || !residenceManorId) {
    return {
      travel_cost_distance: null,
      route_hop_distance: null,
      distance_band: null,
    };
  }

  const metrics = getNumericDistanceMetrics(domain, anchorManorId, residenceManorId);
  return {
    travel_cost_distance: metrics?.travel_cost_distance ?? null,
    route_hop_distance: metrics?.route_hop_distance ?? null,
    distance_band: classifyTravelDistance(domain, anchorManorId, residenceManorId),
  };
}

function collectPersonIds(state: RunState): string[] {
  return Object.keys(readPeople(state)).sort(compareText);
}

export function buildResidenceSelectorSummary(
  state: RunState,
  options?: { domain?: WorldDomainV1 }
): ResidenceSelectorSummary {
  const domain = options?.domain ?? loadBundledWorldDomain();
  const anchorManorId = readAnchorManorId(domain);
  const localParishId = readLocalParishInstitutionId(state);
  const serviceTargetsByPerson = collectServiceTargetResolutionByPerson(state, anchorManorId, localParishId);
  const clergyPersonIds = collectClergyPersonIds(state);
  const officeHolderIds = collectOfficeSeatHolderIds(state);
  const people = readPeople(state);
  const personIds = collectPersonIds(state);

  const entriesByPersonId = Object.fromEntries(
    personIds.map((personId) => {
      const personName =
        typeof people[personId]?.name === "string" && people[personId].name.length > 0 ? people[personId].name : personId;
      const selectorContexts = collectSelectorContexts(state, personId, clergyPersonIds, officeHolderIds, serviceTargetsByPerson);
      const source = resolveResidenceSource(state, personId, anchorManorId, localParishId, serviceTargetsByPerson);
      const distance = buildDistanceFields(domain, anchorManorId, source.residence_manor_id);
      return [
        personId,
        {
          schema_version: RESIDENCE_SELECTOR_ENTRY_SCHEMA_VERSION,
          person_id: personId,
          person_name: personName,
          residence_manor_id: source.residence_manor_id,
          selector_contexts: selectorContexts,
          source_kind: source.source_kind,
          source_ref_id: source.source_ref_id,
          travel_cost_distance: distance.travel_cost_distance,
          route_hop_distance: distance.route_hop_distance,
          distance_band: distance.distance_band,
        } satisfies ResidenceSelectorEntry,
      ];
    })
  );

  return {
    schema_version: RESIDENCE_SELECTOR_SUMMARY_SCHEMA_VERSION,
    anchor_manor_id: anchorManorId,
    person_ids: personIds,
    entries_by_person_id: entriesByPersonId,
  };
}

export function buildResidenceDistanceHooks(
  state: RunState,
  options?: { selector_summary?: ResidenceSelectorSummary }
): ResidenceDistanceHooks {
  const selectorSummary = options?.selector_summary ?? buildResidenceSelectorSummary(state);
  return {
    schema_version: RESIDENCE_DISTANCE_HOOKS_SCHEMA_VERSION,
    anchor_manor_id: selectorSummary.anchor_manor_id,
    person_ids: [...selectorSummary.person_ids],
    entries_by_person_id: Object.fromEntries(
      selectorSummary.person_ids.map((personId) => {
        const entry = selectorSummary.entries_by_person_id[personId];
        return [
          personId,
          {
            person_id: personId,
            residence_manor_id: entry?.residence_manor_id ?? null,
            travel_cost_distance: entry?.travel_cost_distance ?? null,
            route_hop_distance: entry?.route_hop_distance ?? null,
            distance_band: entry?.distance_band ?? null,
          } satisfies ResidenceDistanceHookEntry,
        ];
      })
    ),
  };
}

function attachResidenceMetadataToPerson(person: any, entry: ResidenceSelectorEntry | null, hook: ResidenceDistanceHookEntry | null): void {
  if (!person || typeof person !== "object") return;
  attachHiddenSurface(person, "residence_manor_id", entry?.residence_manor_id ?? null);
  attachHiddenSurface(person, "residence_selector_contexts", entry?.selector_contexts ?? []);
  attachHiddenSurface(person, "residence_distance_hook", hook);
}

export function ensureResidenceManorBindings(
  state: RunState,
  options?: { selector_summary?: ResidenceSelectorSummary; distance_hooks?: ResidenceDistanceHooks }
): { selector_summary: ResidenceSelectorSummary; distance_hooks: ResidenceDistanceHooks } {
  const selectorSummary = options?.selector_summary ?? buildResidenceSelectorSummary(state);
  const distanceHooks = options?.distance_hooks ?? buildResidenceDistanceHooks(state, { selector_summary: selectorSummary });
  const people = readPeople(state);

  for (const personId of selectorSummary.person_ids) {
    const entry = selectorSummary.entries_by_person_id[personId] ?? null;
    const hook = distanceHooks.entries_by_person_id[personId] ?? null;
    attachResidenceMetadataToPerson(people[personId], entry, hook);
  }

  const headId = normalizeOptionalId(state.house.head?.id);
  if (headId) {
    attachResidenceMetadataToPerson(
      state.house.head as any,
      selectorSummary.entries_by_person_id[headId] ?? null,
      distanceHooks.entries_by_person_id[headId] ?? null
    );
  }
  const spouseId = normalizeOptionalId(state.house.spouse?.id);
  if (spouseId && state.house.spouse) {
    attachResidenceMetadataToPerson(
      state.house.spouse as any,
      selectorSummary.entries_by_person_id[spouseId] ?? null,
      distanceHooks.entries_by_person_id[spouseId] ?? null
    );
  }
  for (const child of state.house.children) {
    const childId = normalizeOptionalId(child?.id);
    if (!childId) continue;
    attachResidenceMetadataToPerson(
      child as any,
      selectorSummary.entries_by_person_id[childId] ?? null,
      distanceHooks.entries_by_person_id[childId] ?? null
    );
  }

  attachHiddenSurface(state as object, "residence_selector_summary", selectorSummary);
  attachHiddenSurface(state as object, "residence_distance_hooks", distanceHooks);
  attachHiddenSurface(state.house as object, "residence_selector_summary", selectorSummary);
  attachHiddenSurface(state.house as object, "residence_distance_hooks", distanceHooks);

  return {
    selector_summary: selectorSummary,
    distance_hooks: distanceHooks,
  };
}

export function getResidenceManorId(state: RunState, personId: string): string | null {
  return buildResidenceSelectorSummary(state).entries_by_person_id[personId]?.residence_manor_id ?? null;
}
