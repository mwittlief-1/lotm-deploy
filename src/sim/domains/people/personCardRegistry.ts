import { playerHouseIdOf, registryPersonFor, structuredHouseIdForPerson } from "../../actors";
import { buildCourtRoster_v0_2_4, deriveCourtMemberIds } from "../../court";
import { getChildren, getLivingSpouse, getParents, getSiblings } from "../../kinship";
import type {
  HouseDossierHoldingsBand,
  KnownHouseRelevanceReason,
  KnownHouseRelevanceTier,
  Person,
  PersonCardFamilyProjection,
  PersonCardLandsHeldProjection,
  PersonCardOfficeAssignment,
  PersonCardRegistry,
  PersonCardRelativeRef,
  PersonCardResidenceBinding,
  PersonCardServiceTimelineEntry,
  PersonCardSuccessionProjection,
  PersonCardView,
  RunState,
} from "../../types";
import { buildBoundedWorldTopologyView } from "../world";
import { buildKnownHouseRelevanceSnapshot } from "./knownHouseRelevance";
import { readHouseNameForId } from "./knownHouseSummaries";
import { ensureResidenceManorBindings } from "./residenceManorRegistry";
import { buildSuccessionExperienceSurfaces } from "./successionSummaries";

export const PERSON_CARD_VIEW_SCHEMA_VERSION = "person_card_view_v1" as const;
export const PERSON_CARD_REGISTRY_SCHEMA_VERSION = "person_card_registry_v1" as const;

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function sortStrings(values: Iterable<string>): string[] {
  return [...values].sort(compareText);
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

function peopleMap(state: RunState): Record<string, Person> {
  const anyState: any = state as any;
  return anyState.people && typeof anyState.people === "object" ? (anyState.people as Record<string, Person>) : {};
}

function housesMap(state: RunState): Record<string, any> {
  const anyState: any = state as any;
  return anyState.houses && typeof anyState.houses === "object" ? (anyState.houses as Record<string, any>) : {};
}

function normalizeOptionalId(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeTurnIndex(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function titleFromKey(value: string | null | undefined): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  return raw
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function currentHouseIdForPerson(state: RunState, personId: string): string | null {
  const person = registryPersonFor(state, personId);
  const structured = structuredHouseIdForPerson(state, personId);
  if (structured) return structured;
  return normalizeOptionalId(person?.house_id) ?? normalizeOptionalId(person?.residence_house_id);
}

function birthHouseIdForPerson(state: RunState, personId: string): string | null {
  const parentHouseIds = getParents(state as any, personId)
    .map((parentId) => currentHouseIdForPerson(state, parentId))
    .filter((houseId): houseId is string => typeof houseId === "string" && houseId.length > 0);
  if (parentHouseIds.length === 0) return currentHouseIdForPerson(state, personId);
  return sortStrings(parentHouseIds)[0] ?? null;
}

function isMarriedOut(state: RunState, personId: string, birthHouseId: string | null, currentHouseId: string | null): boolean {
  if (!birthHouseId || !currentHouseId || birthHouseId === currentHouseId) return false;
  const person = registryPersonFor(state, personId);
  return Boolean(person?.married || getLivingSpouse(state as any, personId));
}

function relativeRefForPerson(state: RunState, personId: string): PersonCardRelativeRef {
  const person = registryPersonFor(state, personId);
  const currentHouseId = currentHouseIdForPerson(state, personId);
  const birthHouseId = birthHouseIdForPerson(state, personId);
  return {
    person_id: personId,
    person_name: person?.name ?? personId,
    house_id: currentHouseId,
    house_name: readHouseNameForId(state, currentHouseId),
    age: typeof person?.age === "number" ? person.age : null,
    sex: person?.sex ?? null,
    alive: person?.alive !== false,
    married_out: isMarriedOut(state, personId, birthHouseId, currentHouseId),
  };
}

function familyProjectionForPerson(state: RunState, personId: string): PersonCardFamilyProjection {
  const parentIds = getParents(state as any, personId);
  const childIds = getChildren(state as any, personId);
  const siblingIds = getSiblings(state as any, personId);
  const spouseId = getLivingSpouse(state as any, personId);
  const birthHouseId = birthHouseIdForPerson(state, personId);
  const currentHouseId = currentHouseIdForPerson(state, personId);
  const kinshipTags = new Set<string>();

  if (parentIds.length > 0) kinshipTags.add("child");
  if (childIds.length > 0) kinshipTags.add("parent");
  if (siblingIds.length > 0) kinshipTags.add("sibling");
  if (spouseId) kinshipTags.add("spouse");
  if (birthHouseId && currentHouseId && birthHouseId !== currentHouseId) kinshipTags.add("moved_branch");

  const familyPersonIds = sortStrings([
    ...parentIds,
    ...childIds,
    ...siblingIds,
    ...(spouseId ? [spouseId] : []),
  ]);

  return {
    family_person_ids: familyPersonIds,
    parents: parentIds.map((id) => relativeRefForPerson(state, id)),
    spouse: spouseId ? relativeRefForPerson(state, spouseId) : null,
    siblings: siblingIds.map((id) => relativeRefForPerson(state, id)),
    children: childIds.map((id) => relativeRefForPerson(state, id)),
    kinship_tags: [...kinshipTags].sort(compareText),
    married_out: isMarriedOut(state, personId, birthHouseId, currentHouseId),
  };
}

function courtRoleLabelsByPerson(state: RunState): Map<string, string[]> {
  const labels = new Map<string, Set<string>>();
  const add = (personId: string, label: string) => {
    if (!personId || !label) return;
    if (!labels.has(personId)) labels.set(personId, new Set<string>());
    labels.get(personId)!.add(label);
  };

  const roster = buildCourtRoster_v0_2_4(state);
  for (const row of roster.rows) {
    if (row.role === "head") add(row.person_id, "Head of House");
    else if (row.role === "spouse") add(row.person_id, "Spouse");
    else if (row.role === "child") add(row.person_id, "Household Child");
    else if (row.role === "married_in_spouse") add(row.person_id, "Married-in Spouse");
    else if (row.role === "resident") add(row.person_id, "Resident");
    if (row.role === "officer" && row.officer_role) add(row.person_id, titleFromKey(row.officer_role));
  }

  return new Map(
    [...labels.entries()].map(([personId, value]) => [personId, [...value].sort(compareText)])
  );
}

function findServiceRecordPaymentBasis(state: RunState, recordId: string | null): string | null {
  if (!recordId) return null;
  const registry = (state.house as any)?.court_service_record_registry;
  const record = registry?.records_by_id?.[recordId];
  return normalizeOptionalId(record?.payment_basis);
}

function activeLegacyServiceRecordIdForRole(state: RunState, personId: string, role: string): string | null {
  const genericRecords = Array.isArray((state as any)?.service_records) ? ((state as any).service_records as any[]) : [];
  const record = genericRecords.find(
    (entry) => entry && entry.person_id === personId && entry.role === role && entry.end_turn_index == null
  );
  return normalizeOptionalId(record?.id);
}

function legacyHouseOfficeAssignmentsForPerson(state: RunState, personId: string): PersonCardOfficeAssignment[] {
  const playerHouseId = playerHouseIdOf(state);
  const house = housesMap(state)[playerHouseId];
  const courtOfficers = house?.court_officers;
  if (!courtOfficers || typeof courtOfficers !== "object") return [];

  const currentHouseId = currentHouseIdForPerson(state, personId);
  const holderKind = currentHouseId === playerHouseId ? "household_member" : "non_family_retainer";
  const paymentBasis = holderKind === "household_member" ? "family_service" : "retainer_upkeep";
  const assignments: PersonCardOfficeAssignment[] = [];

  for (const role of ["steward", "clerk", "marshal"] as const) {
    if (courtOfficers[role] !== personId) continue;
    assignments.push({
      seat_id: `house:house:${playerHouseId}:${role}`,
      title: titleFromKey(role),
      scope: "house",
      owner_actor_id: `house:${playerHouseId}`,
      holder_kind: holderKind,
      payment_basis: paymentBasis,
      active_service_record_id: activeLegacyServiceRecordIdForRole(state, personId, role),
    });
  }

  return assignments;
}

function officeAssignmentsForPerson(state: RunState, personId: string): PersonCardOfficeAssignment[] {
  const registry = (state.house as any)?.court_office_registry;
  const assignments: PersonCardOfficeAssignment[] = [];
  if (registry && typeof registry === "object") {
    for (const seatId of registry.seat_ids ?? []) {
      const seat = registry.seats_by_id?.[seatId];
      if (!seat || seat.holder_person_id !== personId) continue;
      assignments.push({
        seat_id: normalizeOptionalId(seat.seat_id),
        title: titleFromKey(seat.title ?? seat.seat_key ?? seat.seat_id),
        scope: normalizeOptionalId(seat.scope),
        owner_actor_id: normalizeOptionalId(seat.owner_actor_id),
        holder_kind: normalizeOptionalId(seat.holder_kind),
        payment_basis: findServiceRecordPaymentBasis(state, normalizeOptionalId(seat.active_service_record_id)),
        active_service_record_id: normalizeOptionalId(seat.active_service_record_id),
      });
    }
  }
  if (assignments.length === 0) assignments.push(...legacyHouseOfficeAssignmentsForPerson(state, personId));

  assignments.sort((left, right) =>
    compareText(left.title, right.title) ||
    compareText(left.seat_id ?? "", right.seat_id ?? "")
  );
  return assignments;
}

function actorRefKey(actor: any): string {
  const kind = normalizeOptionalId(actor?.kind) ?? "unknown";
  const id = normalizeOptionalId(actor?.id) ?? "unknown";
  return `${kind}:${id}`;
}

function timelineSort(left: PersonCardServiceTimelineEntry, right: PersonCardServiceTimelineEntry): number {
  const leftStart = left.start_turn_index ?? -1;
  const rightStart = right.start_turn_index ?? -1;
  if (leftStart !== rightStart) return leftStart - rightStart;
  const leftEnd = left.end_turn_index ?? Number.MAX_SAFE_INTEGER;
  const rightEnd = right.end_turn_index ?? Number.MAX_SAFE_INTEGER;
  if (leftEnd !== rightEnd) return leftEnd - rightEnd;
  return compareText(left.record_id, right.record_id);
}

function serviceTimelineForPerson(state: RunState, personId: string): { active_record_ids: string[]; entries: PersonCardServiceTimelineEntry[] } {
  const entries: PersonCardServiceTimelineEntry[] = [];
  const seenKeys = new Set<string>();
  const activeRecordIds = new Set<string>();

  const courtRegistry = (state.house as any)?.court_service_record_registry;
  for (const recordId of courtRegistry?.record_ids ?? []) {
    const record = courtRegistry.records_by_id?.[recordId];
    if (!record || record.holder_person_id !== personId) continue;
    const actorId = normalizeOptionalId(record.serve_at_actor_id);
    const entry: PersonCardServiceTimelineEntry = {
      record_id: record.record_id,
      title: titleFromKey(record.seat_key ?? record.record_id),
      role_key: String(record.seat_key ?? ""),
      source_kind: "court_service_record",
      serve_at_actor_id: actorId,
      institution_assignment_id: normalizeOptionalId(record.institution_assignment_id),
      payment_basis: normalizeOptionalId(record.payment_basis),
      start_turn_index: normalizeTurnIndex(record.start_turn_index),
      end_turn_index: normalizeTurnIndex(record.end_turn_index),
      active: record.end_turn_index == null,
    };
    entries.push(entry);
    seenKeys.add(`${entry.role_key}|${actorId ?? ""}|${entry.start_turn_index ?? ""}|${entry.end_turn_index ?? ""}`);
    if (entry.active) activeRecordIds.add(entry.record_id);
  }

  const genericRecords = Array.isArray((state as any)?.service_records) ? ((state as any).service_records as any[]) : [];
  for (const record of genericRecords) {
    if (!record || record.person_id !== personId) continue;
    const actorKey = actorRefKey(record.serving_actor_id);
    const startTurnIndex = normalizeTurnIndex(record.start_turn_index);
    const endTurnIndex = normalizeTurnIndex(record.end_turn_index);
    const dedupeKey = `${String(record.role ?? "")}|${actorKey}|${startTurnIndex ?? ""}|${endTurnIndex ?? ""}`;
    if (seenKeys.has(dedupeKey)) continue;
    const entry: PersonCardServiceTimelineEntry = {
      record_id: String(record.id ?? `${personId}:${record.role ?? "service"}`),
      title: titleFromKey(record.role),
      role_key: String(record.role ?? ""),
      source_kind: "service_record",
      serve_at_actor_id: actorKey,
      institution_assignment_id: normalizeOptionalId(record.institution_assignment_id),
      payment_basis: null,
      start_turn_index: startTurnIndex,
      end_turn_index: endTurnIndex,
      active: record.end_turn_index == null,
    };
    entries.push(entry);
    if (entry.active) activeRecordIds.add(entry.record_id);
  }

  entries.sort(timelineSort);
  return {
    active_record_ids: sortStrings(activeRecordIds),
    entries,
  };
}

function extractPortfolioManorId(position: unknown): string | null {
  if (typeof position !== "string") return null;
  const trimmed = position.trim();
  if (trimmed.length === 0) return null;
  const manorToken = ":manor:";
  const manorIndex = trimmed.indexOf(manorToken);
  if (manorIndex >= 0) {
    const manorId = trimmed.slice(manorIndex + manorToken.length).trim();
    return manorId.length > 0 ? manorId : null;
  }
  return trimmed.startsWith("manor_") ? trimmed : null;
}

function holdingsBandForCount(count: number): HouseDossierHoldingsBand {
  if (count >= 4) return "broad_domain";
  if (count >= 2) return "minor_cluster";
  return "single_holding";
}

function landsHeldProjectionForPerson(state: RunState, personId: string): PersonCardLandsHeldProjection {
  const houses = housesMap(state);
  const playerHouseId = playerHouseIdOf(state);
  const currentHouseId = currentHouseIdForPerson(state, personId);
  const currentHouse = currentHouseId ? houses[currentHouseId] : null;
  const knownManorIds = new Set<string>();
  if (currentHouseId === playerHouseId) {
    const topology = buildBoundedWorldTopologyView();
    const anchorManorId = normalizeOptionalId(topology.anchor_manor_id);
    if (anchorManorId) knownManorIds.add(anchorManorId);
    const positions = Array.isArray(state.portfolio?.positions) ? state.portfolio.positions : [];
    for (const position of positions) {
      const manorId = extractPortfolioManorId(position);
      if (manorId) knownManorIds.add(manorId);
    }
  }

  const manorIds = sortStrings(knownManorIds);
  const houseHoldingsStatus =
    !currentHouseId
      ? "absent_no_house"
      : currentHouseId === playerHouseId
        ? "player_anchor_known"
        : "coarse_house_only";
  const personalHoldingsStatus = currentHouseId ? "not_exposed_on_this_seam" : "absent_no_house";
  const holdingsCount =
    !currentHouseId
      ? 0
      : currentHouseId === playerHouseId
        ? Math.max(1, manorIds.length || 1)
        : typeof currentHouse?.holdings_count === "number" && Number.isFinite(currentHouse.holdings_count)
          ? Math.max(1, Math.trunc(currentHouse.holdings_count))
          : 1;

  return {
    house_id: currentHouseId,
    house_name: readHouseNameForId(state, currentHouseId),
    holdings_count: holdingsCount,
    holdings_band: holdingsBandForCount(Math.max(1, holdingsCount)),
    anchor_manor_id: manorIds[0] ?? null,
    known_manor_ids: manorIds,
    house_holdings_status: houseHoldingsStatus,
    personal_holdings_status: personalHoldingsStatus,
  };
}

function successionProjectionForPerson(
  state: RunState,
  personId: string,
  currentHouseId: string | null,
  relevanceTier: KnownHouseRelevanceTier | null,
  relevanceReasons: KnownHouseRelevanceReason[],
  succession: ReturnType<typeof buildSuccessionExperienceSurfaces>
): PersonCardSuccessionProjection {
  const lineEntry = succession.succession_line_summary.entries.find((entry) => entry.person_id === personId) ?? null;
  const claimantEntry = succession.claimant_summary.entries.find((entry) => entry.claimant_person_id === personId) ?? null;
  const person = registryPersonFor(state, personId);

  return {
    line_position: lineEntry?.line_position ?? null,
    adult_line_position: lineEntry?.adult_line_position ?? null,
    claimant_position: claimantEntry?.succession_position ?? null,
    claimant_adult_position: claimantEntry?.adult_succession_position ?? null,
    current_heir_id: succession.succession_line_summary.current_heir_id,
    adult_successor_id: succession.succession_line_summary.adult_successor_id,
    claim_window_open: succession.claimant_summary.claim_window_open,
    blocked_by_current_heir: claimantEntry?.blocked_by_current_heir ?? null,
    current_heir: personId === succession.succession_line_summary.current_heir_id,
    adult_eligible:
      lineEntry?.adult_eligible ??
      claimantEntry?.adult_eligible ??
      Boolean(person?.alive !== false && typeof person?.age === "number" && person.age >= 15),
    player_house_relevance_reasons:
      currentHouseId === playerHouseIdOf(state) || relevanceTier != null
        ? [...relevanceReasons].sort(compareText)
        : [],
  };
}

export function buildPersonCardRegistry(state: RunState): PersonCardRegistry {
  const people = peopleMap(state);
  const personIds = sortStrings(Object.keys(people));
  const relevance = buildKnownHouseRelevanceSnapshot(state);
  const relevanceByHouseId = new Map(relevance.entries.map((entry) => [entry.house_id, entry]));
  const residenceSummary = ensureResidenceManorBindings(state).selector_summary;
  const courtMemberIds = new Set(deriveCourtMemberIds(state));
  const roleLabelsByPerson = courtRoleLabelsByPerson(state);
  const succession = buildSuccessionExperienceSurfaces(state);
  const entriesByPersonId: Record<string, PersonCardView> = {};

  for (const personId of personIds) {
    const person = registryPersonFor(state, personId);
    if (!person) continue;

    const currentHouseId = currentHouseIdForPerson(state, personId);
    const birthHouseId = birthHouseIdForPerson(state, personId);
    const relevanceEntry = currentHouseId ? relevanceByHouseId.get(currentHouseId) ?? null : null;
    const residenceEntry = residenceSummary.entries_by_person_id[personId];
    const courtRoleLabels = roleLabelsByPerson.get(personId) ?? [];
    const familyProjection = familyProjectionForPerson(state, personId);

    entriesByPersonId[personId] = {
      schema_version: PERSON_CARD_VIEW_SCHEMA_VERSION,
      person_id: personId,
      person_name: person.name,
      short_id: typeof (person as any).short_id === "string" ? String((person as any).short_id) : null,
      sex: person.sex ?? null,
      age: typeof person.age === "number" ? person.age : null,
      alive: person.alive !== false,
      current_house_id: currentHouseId,
      current_house_name: readHouseNameForId(state, currentHouseId),
      birth_house_id: birthHouseId,
      birth_house_name: readHouseNameForId(state, birthHouseId),
      court_member: courtMemberIds.has(personId),
      court_role_labels: [...courtRoleLabels],
      known_house_relevance_tier: relevanceEntry?.tier ?? null,
      known_house_relevance_reasons: relevanceEntry?.reasons ? [...relevanceEntry.reasons] : [],
      married_out: familyProjection.married_out,
      residence_binding: {
        residence_manor_id: residenceEntry?.residence_manor_id ?? null,
        selector_contexts: residenceEntry?.selector_contexts ? [...residenceEntry.selector_contexts] : [],
        source_kind: residenceEntry?.source_kind ?? null,
        source_ref_id: residenceEntry?.source_ref_id ?? null,
        travel_cost_distance: residenceEntry?.travel_cost_distance ?? null,
        route_hop_distance: residenceEntry?.route_hop_distance ?? null,
        distance_band: residenceEntry?.distance_band ?? null,
      } as PersonCardResidenceBinding,
      family_projection: familyProjection,
      succession_projection: successionProjectionForPerson(
        state,
        personId,
        currentHouseId,
        relevanceEntry?.tier ?? null,
        relevanceEntry?.reasons ?? [],
        succession
      ),
      office_assignments: officeAssignmentsForPerson(state, personId),
      service_timeline: serviceTimelineForPerson(state, personId),
      lands_held_projection: landsHeldProjectionForPerson(state, personId),
    };
  }

  return {
    schema_version: PERSON_CARD_REGISTRY_SCHEMA_VERSION,
    person_ids: personIds,
    entries_by_person_id: entriesByPersonId,
  };
}

export function attachPersonCardRegistry(target: RunState | Record<string, unknown>, registry: PersonCardRegistry): void {
  attachHiddenSurface(target as object, "person_card_registry", registry);
  attachHiddenSurface((target as any)?.house as object, "person_card_registry", registry);

  const people = (target as any)?.people;
  if (people && typeof people === "object") {
    for (const personId of registry.person_ids) {
      const person = people[personId];
      if (!person || typeof person !== "object") continue;
      attachHiddenSurface(person, "person_card_view", registry.entries_by_person_id[personId] ?? null);
    }
  }

  const headId = normalizeOptionalId((target as any)?.house?.head?.id);
  if (headId && (target as any)?.house?.head) {
    attachHiddenSurface((target as any).house.head, "person_card_view", registry.entries_by_person_id[headId] ?? null);
  }
  const spouseId = normalizeOptionalId((target as any)?.house?.spouse?.id);
  if (spouseId && (target as any)?.house?.spouse) {
    attachHiddenSurface((target as any).house.spouse, "person_card_view", registry.entries_by_person_id[spouseId] ?? null);
  }
  if (Array.isArray((target as any)?.house?.children)) {
    for (const child of (target as any).house.children as any[]) {
      const childId = normalizeOptionalId(child?.id);
      if (!childId || !child || typeof child !== "object") continue;
      attachHiddenSurface(child, "person_card_view", registry.entries_by_person_id[childId] ?? null);
    }
  }
}
