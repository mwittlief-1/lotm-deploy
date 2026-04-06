import type { RunState, ServiceRecord } from "../../types";
import { asNonNegInt } from "../../util";

export const COURT_OFFICE_REGISTRY_SCHEMA_VERSION = "court_office_registry_v0" as const;
export const COURT_OFFICE_SEAT_SCHEMA_VERSION = "court_office_seat_v0" as const;
export const COURT_SERVICE_RECORD_SCHEMA_VERSION = "court_service_record_v0" as const;
export const COURT_SERVICE_RECORD_REGISTRY_SCHEMA_VERSION = "court_service_record_registry_v0" as const;

export const COURT_OFFICE_SCOPES = ["house", "realm"] as const;
export type CourtOfficeScope = (typeof COURT_OFFICE_SCOPES)[number];

export const COURT_OFFICE_REQUIREMENTS = ["required", "optional"] as const;
export type CourtOfficeRequirement = (typeof COURT_OFFICE_REQUIREMENTS)[number];

export const COURT_OFFICE_HOLDER_KINDS = [
  "household_member",
  "non_family_retainer",
  "realm_holder",
  "institutional_holder",
  "unknown",
] as const;
export type CourtOfficeHolderKind = (typeof COURT_OFFICE_HOLDER_KINDS)[number];

export const COURT_SERVICE_PAYMENT_BASES = [
  "family_service",
  "retainer_upkeep",
  "realm_stipend",
  "benefice",
  "unknown",
] as const;
export type CourtServicePaymentBasis = (typeof COURT_SERVICE_PAYMENT_BASES)[number];

export const HOUSE_COURT_OFFICE_KEYS = ["steward", "clerk", "marshal"] as const;
export type HouseCourtOfficeKey = (typeof HOUSE_COURT_OFFICE_KEYS)[number];
export const HOUSE_COURT_VARIANTS = ["A", "B", "C"] as const;
export type HouseCourtVariant = (typeof HOUSE_COURT_VARIANTS)[number];
export type LegacyHouseCourtAssignments = Partial<Record<HouseCourtOfficeKey, string>>;

export const HOUSE_COURT_REQUIRED_OFFICE_KEYS = ["steward"] as const;

export const REALM_COURT_OFFICE_KEYS = ["chancellor", "chamberlain", "constable"] as const;
export type RealmCourtOfficeKey = (typeof REALM_COURT_OFFICE_KEYS)[number];

export type CourtOfficeSeatV0 = {
  schema_version: typeof COURT_OFFICE_SEAT_SCHEMA_VERSION;
  seat_id: string;
  scope: CourtOfficeScope;
  owner_actor_id: string;
  seat_key: string;
  title: string;
  requirement: CourtOfficeRequirement;
  vacancy_cap_turns: number;
  holder_person_id: string | null;
  holder_house_id: string | null;
  holder_kind: CourtOfficeHolderKind | null;
  filled_turn_index: number | null;
  vacancy_started_turn_index: number | null;
  last_transition_turn_index: number | null;
  active_service_record_id: string | null;
};

export type CourtOfficeRegistryV0 = {
  schema_version: typeof COURT_OFFICE_REGISTRY_SCHEMA_VERSION;
  seat_ids: string[];
  required_seat_ids: string[];
  filled_seat_ids: string[];
  vacant_required_seat_ids: string[];
  seats_by_id: Record<string, CourtOfficeSeatV0>;
};

export type CourtServiceRecordV0 = {
  schema_version: typeof COURT_SERVICE_RECORD_SCHEMA_VERSION;
  record_id: string;
  seat_id: string;
  scope: CourtOfficeScope;
  owner_actor_id: string;
  seat_key: string;
  holder_person_id: string;
  holder_house_id: string | null;
  holder_kind: CourtOfficeHolderKind;
  payment_basis: CourtServicePaymentBasis;
  start_turn_index: number | null;
  end_turn_index: number | null;
};

export type CourtServiceRecordRegistryV0 = {
  schema_version: typeof COURT_SERVICE_RECORD_REGISTRY_SCHEMA_VERSION;
  record_ids: string[];
  active_record_ids: string[];
  records_by_id: Record<string, CourtServiceRecordV0>;
};

export type CourtOfficeTransitionDraft = {
  seat_id: string;
  holder_person_id?: string | null;
  holder_house_id?: string | null;
  holder_kind?: CourtOfficeHolderKind;
  payment_basis?: CourtServicePaymentBasis;
  transition_turn_index?: number | null;
  record_id?: string;
};

export type CourtOfficeTransitionResult = {
  registry: CourtOfficeRegistryV0;
  service_record_registry: CourtServiceRecordRegistryV0;
  seat: CourtOfficeSeatV0;
  ended_record_id: string | null;
  started_record_id: string | null;
};

export type CourtOfficeSeatDraft = {
  seat_id?: string;
  scope?: CourtOfficeScope;
  owner_actor_id?: string;
  seat_key: string;
  title?: string;
  requirement?: CourtOfficeRequirement;
  vacancy_cap_turns?: number;
  holder_person_id?: string | null;
  holder_house_id?: string | null;
  holder_kind?: CourtOfficeHolderKind | null;
  filled_turn_index?: number | null;
  vacancy_started_turn_index?: number | null;
  last_transition_turn_index?: number | null;
  active_service_record_id?: string | null;
};

export type CourtServiceRecordDraft = {
  record_id?: string;
  seat_id: string;
  scope?: CourtOfficeScope;
  owner_actor_id?: string;
  seat_key?: string;
  holder_person_id?: string | null;
  holder_house_id?: string | null;
  holder_kind?: CourtOfficeHolderKind;
  payment_basis?: CourtServicePaymentBasis;
  start_turn_index?: number | null;
  end_turn_index?: number | null;
};

const HOUSE_COURT_OFFICE_TITLES: Record<HouseCourtOfficeKey, string> = {
  steward: "Steward",
  clerk: "Clerk",
  marshal: "Marshal",
};

const REALM_COURT_OFFICE_TITLES: Record<RealmCourtOfficeKey, string> = {
  chancellor: "Chancellor",
  chamberlain: "Chamberlain",
  constable: "Constable",
};

function defaultLegacyCourtOfficerId(role: HouseCourtOfficeKey): string {
  return `p_court_${role}`;
}

function defaultPlayerHouseId(state: RunState): string {
  return typeof (state as any).player_house_id === "string" ? (state as any).player_house_id : "h_player";
}

function getPlayerHouseRegistry(state: RunState): any {
  const anyState: any = state as any;
  const houses = anyState.houses;
  if (!houses || typeof houses !== "object") return null;
  const playerHouseId = defaultPlayerHouseId(state);
  const house = houses[playerHouseId];
  return house && typeof house === "object" ? house : null;
}

function normalizeOptionalId(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeRequiredId(value: unknown, fallback: string): string {
  const normalized = normalizeOptionalId(value);
  return normalized ?? fallback;
}

function normalizeTurnIndex(value: unknown): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.trunc(Number(value)));
}

function normalizeScope(value: unknown): CourtOfficeScope {
  return value === "realm" ? "realm" : "house";
}

function normalizeRequirement(value: unknown): CourtOfficeRequirement {
  return value === "required" ? "required" : "optional";
}

function normalizeHolderKind(value: unknown): CourtOfficeHolderKind {
  return value === "household_member" ||
    value === "non_family_retainer" ||
    value === "realm_holder" ||
    value === "institutional_holder"
    ? value
    : "unknown";
}

function normalizePaymentBasis(value: unknown): CourtServicePaymentBasis {
  return value === "family_service" ||
    value === "retainer_upkeep" ||
    value === "realm_stipend" ||
    value === "benefice"
    ? value
    : "unknown";
}

function isHouseCourtOfficeKey(value: string): value is HouseCourtOfficeKey {
  return (HOUSE_COURT_OFFICE_KEYS as readonly string[]).includes(value);
}

function titleForSeatKey(seatKey: string): string {
  if (isHouseCourtOfficeKey(seatKey)) return HOUSE_COURT_OFFICE_TITLES[seatKey];
  if ((REALM_COURT_OFFICE_KEYS as readonly string[]).includes(seatKey)) {
    return REALM_COURT_OFFICE_TITLES[seatKey as RealmCourtOfficeKey];
  }
  return seatKey
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function defaultSeatId(scope: CourtOfficeScope, ownerActorId: string, seatKey: string): string {
  return `${scope}:${ownerActorId}:${seatKey}`;
}

function houseSeatOrderIndex(seatKey: string): number {
  const index = HOUSE_COURT_OFFICE_KEYS.indexOf(seatKey as HouseCourtOfficeKey);
  return index === -1 ? HOUSE_COURT_OFFICE_KEYS.length : index;
}

function realmSeatOrderIndex(seatKey: string): number {
  const index = REALM_COURT_OFFICE_KEYS.indexOf(seatKey as RealmCourtOfficeKey);
  return index === -1 ? REALM_COURT_OFFICE_KEYS.length : index;
}

function compareSeats(left: CourtOfficeSeatV0, right: CourtOfficeSeatV0): number {
  if (left.scope !== right.scope) return left.scope === "house" ? -1 : 1;
  if (left.owner_actor_id !== right.owner_actor_id) {
    return left.owner_actor_id.localeCompare(right.owner_actor_id);
  }
  if (left.scope === "house" && right.scope === "house") {
    const rankDiff = houseSeatOrderIndex(left.seat_key) - houseSeatOrderIndex(right.seat_key);
    if (rankDiff !== 0) return rankDiff;
  }
  if (left.scope === "realm" && right.scope === "realm") {
    const rankDiff = realmSeatOrderIndex(left.seat_key) - realmSeatOrderIndex(right.seat_key);
    if (rankDiff !== 0) return rankDiff;
  }
  if (left.seat_key !== right.seat_key) return left.seat_key.localeCompare(right.seat_key);
  return left.seat_id.localeCompare(right.seat_id);
}

function requiredSeatDefaultFor(scope: CourtOfficeScope, seatKey: string): CourtOfficeRequirement {
  if (scope === "house" && (HOUSE_COURT_REQUIRED_OFFICE_KEYS as readonly string[]).includes(seatKey)) {
    return "required";
  }
  return "optional";
}

function defaultHouseOwnerActorId(state: RunState): string {
  const playerHouseId = typeof (state as any).player_house_id === "string" ? (state as any).player_house_id : "h_player";
  return `house:${playerHouseId}`;
}

function registryFrom(value: CourtOfficeRegistryV0 | RunState): CourtOfficeRegistryV0 {
  if (!("run_seed" in value)) return normalizeCourtOfficeRegistry(value);
  const existing = (value.house as any)?.court_office_registry;
  return existing &&
    typeof existing === "object" &&
    existing.schema_version === COURT_OFFICE_REGISTRY_SCHEMA_VERSION
    ? normalizeCourtOfficeRegistry(existing)
    : createHouseCourtOfficeRegistry(defaultHouseOwnerActorId(value));
}

function normalizeLegacyHouseCourtAssignments(
  currentAssignments: Record<string, unknown> | null | undefined,
  people: Record<string, { alive?: boolean }> | null | undefined
): LegacyHouseCourtAssignments {
  const nextAssignments: LegacyHouseCourtAssignments = {};

  for (const role of HOUSE_COURT_OFFICE_KEYS) {
    const personId = normalizeOptionalId(currentAssignments?.[role]);
    if (!personId) continue;
    if (people?.[personId]?.alive === false) continue;
    nextAssignments[role] = personId;
  }

  return nextAssignments;
}

export function planLegacyHouseCourtAssignments(
  currentAssignments: Record<string, unknown> | null | undefined,
  people: Record<string, { alive?: boolean }> | null | undefined,
  variant: HouseCourtVariant | null
): LegacyHouseCourtAssignments {
  const nextAssignments = normalizeLegacyHouseCourtAssignments(currentAssignments, people);

  if (variant === "A") return {};
  if (variant === "B") {
    return {
      steward: nextAssignments.steward ?? defaultLegacyCourtOfficerId("steward"),
    };
  }
  if (variant === "C") {
    return {
      steward: nextAssignments.steward ?? defaultLegacyCourtOfficerId("steward"),
      clerk: nextAssignments.clerk ?? defaultLegacyCourtOfficerId("clerk"),
    };
  }

  return {
    ...(nextAssignments.clerk ? { clerk: nextAssignments.clerk } : {}),
    ...(nextAssignments.marshal ? { marshal: nextAssignments.marshal } : {}),
    steward: nextAssignments.steward ?? defaultLegacyCourtOfficerId("steward"),
  };
}

export function listLegacyFilledHouseCourtOffices(state: RunState): Array<{ role: HouseCourtOfficeKey; person_id: string }> {
  const houseRegistry = getPlayerHouseRegistry(state);
  const assignments = normalizeLegacyHouseCourtAssignments(houseRegistry?.court_officers, (state as any).people as any);

  return HOUSE_COURT_OFFICE_KEYS.flatMap((role) =>
    assignments[role] ? [{ role, person_id: assignments[role]! }] : []
  );
}

export function createCourtOfficeSeat(draft: CourtOfficeSeatDraft): CourtOfficeSeatV0 {
  const scope = normalizeScope(draft.scope);
  const ownerActorId = normalizeRequiredId(draft.owner_actor_id, scope === "house" ? "house:h_player" : "actor:realm");
  const seatKey = normalizeRequiredId(draft.seat_key, "seat");
  const requirement = normalizeRequirement(draft.requirement ?? requiredSeatDefaultFor(scope, seatKey));
  const holderPersonId = normalizeOptionalId(draft.holder_person_id);
  const holderHouseId = normalizeOptionalId(draft.holder_house_id);
  const filledTurnIndex = holderPersonId ? normalizeTurnIndex(draft.filled_turn_index) : null;
  const vacancyStartedTurnIndex = holderPersonId ? null : normalizeTurnIndex(draft.vacancy_started_turn_index);
  const lastTransitionTurnIndex = normalizeTurnIndex(
    draft.last_transition_turn_index ?? filledTurnIndex ?? vacancyStartedTurnIndex
  );

  return {
    schema_version: COURT_OFFICE_SEAT_SCHEMA_VERSION,
    seat_id: normalizeRequiredId(draft.seat_id, defaultSeatId(scope, ownerActorId, seatKey)),
    scope,
    owner_actor_id: ownerActorId,
    seat_key: seatKey,
    title: normalizeRequiredId(draft.title, titleForSeatKey(seatKey)),
    requirement,
    vacancy_cap_turns:
      requirement === "required"
        ? Math.max(1, asNonNegInt(draft.vacancy_cap_turns ?? 1))
        : asNonNegInt(draft.vacancy_cap_turns),
    holder_person_id: holderPersonId,
    holder_house_id: holderHouseId,
    holder_kind: holderPersonId ? normalizeHolderKind(draft.holder_kind) : null,
    filled_turn_index: filledTurnIndex,
    vacancy_started_turn_index: vacancyStartedTurnIndex,
    last_transition_turn_index: lastTransitionTurnIndex,
    active_service_record_id: holderPersonId ? normalizeOptionalId(draft.active_service_record_id) : null,
  };
}

export function buildCourtOfficeRegistry(drafts: readonly CourtOfficeSeatDraft[] = []): CourtOfficeRegistryV0 {
  const seatsById = new Map<string, CourtOfficeSeatV0>();

  for (const draft of drafts) {
    if (!draft || typeof draft !== "object") continue;
    if (!normalizeOptionalId(draft.seat_key)) continue;
    const seat = createCourtOfficeSeat(draft);
    seatsById.set(seat.seat_id, seat);
  }

  const seats = Array.from(seatsById.values()).sort(compareSeats);
  const seatIds = seats.map((seat) => seat.seat_id);
  const requiredSeatIds = seats.filter((seat) => seat.requirement === "required").map((seat) => seat.seat_id);
  const filledSeatIds = seats.filter((seat) => seat.holder_person_id).map((seat) => seat.seat_id);
  const vacantRequiredSeatIds = seats
    .filter((seat) => seat.requirement === "required" && !seat.holder_person_id)
    .map((seat) => seat.seat_id);

  return {
    schema_version: COURT_OFFICE_REGISTRY_SCHEMA_VERSION,
    seat_ids: seatIds,
    required_seat_ids: requiredSeatIds,
    filled_seat_ids: filledSeatIds,
    vacant_required_seat_ids: vacantRequiredSeatIds,
    seats_by_id: Object.fromEntries(seats.map((seat) => [seat.seat_id, seat])) as Record<string, CourtOfficeSeatV0>,
  };
}

export function normalizeCourtOfficeRegistry(value: any): CourtOfficeRegistryV0 {
  const rawSeats =
    value && typeof value === "object" && value.seats_by_id && typeof value.seats_by_id === "object"
      ? Object.values(value.seats_by_id)
      : [];

  const drafts = rawSeats
    .filter((rawSeat) => rawSeat && typeof rawSeat === "object")
    .map((rawSeat: any) => ({
      seat_id: rawSeat.seat_id,
      scope: rawSeat.scope,
      owner_actor_id: rawSeat.owner_actor_id,
      seat_key: rawSeat.seat_key,
      title: rawSeat.title,
      requirement: rawSeat.requirement,
      vacancy_cap_turns: rawSeat.vacancy_cap_turns,
      holder_person_id: rawSeat.holder_person_id,
      holder_house_id: rawSeat.holder_house_id,
      holder_kind: rawSeat.holder_kind,
      filled_turn_index: rawSeat.filled_turn_index,
      vacancy_started_turn_index: rawSeat.vacancy_started_turn_index,
      last_transition_turn_index: rawSeat.last_transition_turn_index,
      active_service_record_id: rawSeat.active_service_record_id,
    }));

  return buildCourtOfficeRegistry(drafts);
}

export function createHouseCourtOfficeRegistry(
  ownerActorId = "house:h_player",
  drafts: readonly CourtOfficeSeatDraft[] = []
): CourtOfficeRegistryV0 {
  const baselineBySeatId = new Map<string, CourtOfficeSeatDraft>();

  for (const seatKey of HOUSE_COURT_OFFICE_KEYS) {
    const seatId = defaultSeatId("house", ownerActorId, seatKey);
    baselineBySeatId.set(seatId, {
      seat_id: seatId,
      scope: "house",
      owner_actor_id: ownerActorId,
      seat_key: seatKey,
      title: HOUSE_COURT_OFFICE_TITLES[seatKey],
      requirement: requiredSeatDefaultFor("house", seatKey),
      vacancy_cap_turns: (HOUSE_COURT_REQUIRED_OFFICE_KEYS as readonly string[]).includes(seatKey) ? 1 : 0,
    });
  }

  const extraDrafts: CourtOfficeSeatDraft[] = [];
  for (const draft of drafts) {
    if (!draft || typeof draft !== "object") continue;
    const scope = normalizeScope(draft.scope);
    const draftOwnerActorId = normalizeRequiredId(draft.owner_actor_id, ownerActorId);
    const seatId = normalizeRequiredId(draft.seat_id, defaultSeatId(scope, draftOwnerActorId, draft.seat_key));

    if (scope === "house" && draftOwnerActorId === ownerActorId && baselineBySeatId.has(seatId)) {
      baselineBySeatId.set(seatId, { ...baselineBySeatId.get(seatId), ...draft, seat_id: seatId });
    } else {
      extraDrafts.push(draft);
    }
  }

  return buildCourtOfficeRegistry([...baselineBySeatId.values(), ...extraDrafts]);
}

export function createRealmCourtOfficeRegistry(
  ownerActorId = "actor:realm",
  drafts: readonly CourtOfficeSeatDraft[] = []
): CourtOfficeRegistryV0 {
  const baselineBySeatId = new Map<string, CourtOfficeSeatDraft>();

  for (const seatKey of REALM_COURT_OFFICE_KEYS) {
    const seatId = defaultSeatId("realm", ownerActorId, seatKey);
    baselineBySeatId.set(seatId, {
      seat_id: seatId,
      scope: "realm",
      owner_actor_id: ownerActorId,
      seat_key: seatKey,
      title: REALM_COURT_OFFICE_TITLES[seatKey],
      requirement: "optional",
      vacancy_cap_turns: 0,
    });
  }

  const extraDrafts: CourtOfficeSeatDraft[] = [];
  for (const draft of drafts) {
    if (!draft || typeof draft !== "object") continue;
    const scope = normalizeScope(draft.scope ?? "realm");
    const draftOwnerActorId = normalizeRequiredId(draft.owner_actor_id, ownerActorId);
    const seatId = normalizeRequiredId(draft.seat_id, defaultSeatId(scope, draftOwnerActorId, draft.seat_key));

    if (scope === "realm" && draftOwnerActorId === ownerActorId && baselineBySeatId.has(seatId)) {
      baselineBySeatId.set(seatId, { ...baselineBySeatId.get(seatId), ...draft, seat_id: seatId, scope: "realm" });
    } else {
      extraDrafts.push({ ...draft, scope });
    }
  }

  return buildCourtOfficeRegistry([...baselineBySeatId.values(), ...extraDrafts]);
}

export function ensureCourtOfficeRegistry(state: RunState): CourtOfficeRegistryV0 {
  const houseAny: any = state.house as any;
  const existing = houseAny?.court_office_registry;
  const normalized =
    existing &&
    typeof existing === "object" &&
    existing.schema_version === COURT_OFFICE_REGISTRY_SCHEMA_VERSION
      ? normalizeCourtOfficeRegistry(existing)
      : createHouseCourtOfficeRegistry(defaultHouseOwnerActorId(state));

  houseAny.court_office_registry = normalized;
  return normalized;
}

export function resolveCourtOfficeSeat(
  value: CourtOfficeRegistryV0 | RunState,
  seatId: string
): CourtOfficeSeatV0 | null {
  const registry = registryFrom(value);
  return registry.seats_by_id[seatId] ?? null;
}

export function resolveVacancyTurnsOpen(seat: CourtOfficeSeatV0, currentTurnIndex: number): number {
  if (seat.holder_person_id || seat.vacancy_started_turn_index === null) return 0;
  return Math.max(0, Math.trunc(currentTurnIndex) - seat.vacancy_started_turn_index);
}

export function isVacancyCapExceeded(seat: CourtOfficeSeatV0, currentTurnIndex: number): boolean {
  if (seat.requirement !== "required") return false;
  if (seat.holder_person_id) return false;
  if (seat.vacancy_started_turn_index === null) return false;
  return resolveVacancyTurnsOpen(seat, currentTurnIndex) > seat.vacancy_cap_turns;
}

function closeActiveServiceRecord(
  registry: CourtServiceRecordRegistryV0,
  recordId: string | null,
  transitionTurnIndex: number | null
): CourtServiceRecordRegistryV0 {
  if (!recordId) return registry;
  const record = registry.records_by_id[recordId];
  if (!record) return registry;

  return buildCourtServiceRecordRegistry(
    registry.record_ids.map((id) => {
      const current = registry.records_by_id[id]!;
      return id === recordId
        ? {
            ...current,
            end_turn_index: transitionTurnIndex,
          }
        : current;
    })
  );
}

export function transitionCourtOfficeHolder(
  registryValue: CourtOfficeRegistryV0 | RunState,
  serviceRegistryValue: CourtServiceRecordRegistryV0,
  draft: CourtOfficeTransitionDraft
): CourtOfficeTransitionResult {
  const registry = registryFrom(registryValue);
  const currentSeat = registry.seats_by_id[draft.seat_id];
  if (!currentSeat) {
    throw new Error(`Unknown court office seat: ${draft.seat_id}`);
  }

  const transitionTurnIndex = normalizeTurnIndex(draft.transition_turn_index);
  const holderPersonId = normalizeOptionalId(draft.holder_person_id);
  const endedRecordId = currentSeat.active_service_record_id ?? null;

  const closedServiceRegistry = closeActiveServiceRecord(serviceRegistryValue, endedRecordId, transitionTurnIndex);

  let nextServiceRegistry = closedServiceRegistry;
  let startedRecordId: string | null = null;

  if (holderPersonId) {
    const nextRecord = createCourtServiceRecord({
      record_id: draft.record_id,
      seat_id: currentSeat.seat_id,
      scope: currentSeat.scope,
      owner_actor_id: currentSeat.owner_actor_id,
      seat_key: currentSeat.seat_key,
      holder_person_id: holderPersonId,
      holder_house_id: draft.holder_house_id,
      holder_kind: draft.holder_kind ?? "realm_holder",
      payment_basis: draft.payment_basis ?? "realm_stipend",
      start_turn_index: transitionTurnIndex,
    });
    if (!nextRecord) {
      throw new Error(`Unable to create court service record for seat: ${currentSeat.seat_id}`);
    }
    startedRecordId = nextRecord.record_id;
    nextServiceRegistry = buildCourtServiceRecordRegistry([
      ...closedServiceRegistry.record_ids.map((recordId) => closedServiceRegistry.records_by_id[recordId]!),
      nextRecord,
    ]);
  }

  const nextSeat = createCourtOfficeSeat({
    ...currentSeat,
    holder_person_id: holderPersonId,
    holder_house_id: holderPersonId ? draft.holder_house_id : null,
    holder_kind: holderPersonId ? draft.holder_kind ?? "realm_holder" : null,
    filled_turn_index: holderPersonId ? transitionTurnIndex : null,
    vacancy_started_turn_index: holderPersonId ? null : transitionTurnIndex,
    last_transition_turn_index: transitionTurnIndex,
    active_service_record_id: startedRecordId,
  });

  const nextRegistry = buildCourtOfficeRegistry(
    registry.seat_ids.map((seatId) => (seatId === nextSeat.seat_id ? nextSeat : registry.seats_by_id[seatId]!))
  );

  return {
    registry: nextRegistry,
    service_record_registry: nextServiceRegistry,
    seat: nextSeat,
    ended_record_id: endedRecordId,
    started_record_id: startedRecordId,
  };
}

export function appointCourtOfficeHolder(
  registryValue: CourtOfficeRegistryV0 | RunState,
  serviceRegistryValue: CourtServiceRecordRegistryV0,
  draft: CourtOfficeTransitionDraft
): CourtOfficeTransitionResult {
  return transitionCourtOfficeHolder(registryValue, serviceRegistryValue, draft);
}

export function vacateCourtOfficeHolder(
  registryValue: CourtOfficeRegistryV0 | RunState,
  serviceRegistryValue: CourtServiceRecordRegistryV0,
  draft: Omit<CourtOfficeTransitionDraft, "holder_person_id" | "holder_house_id" | "holder_kind" | "payment_basis">
): CourtOfficeTransitionResult {
  return transitionCourtOfficeHolder(registryValue, serviceRegistryValue, {
    ...draft,
    holder_person_id: null,
    holder_house_id: null,
  });
}

export function createCourtServiceRecord(draft: CourtServiceRecordDraft): CourtServiceRecordV0 | null {
  const holderPersonId = normalizeOptionalId(draft.holder_person_id);
  if (!holderPersonId) return null;

  const scope = normalizeScope(draft.scope);
  const ownerActorId = normalizeRequiredId(draft.owner_actor_id, scope === "house" ? "house:h_player" : "actor:realm");
  const seatKey = normalizeRequiredId(draft.seat_key, draft.seat_id.split(":").slice(-1)[0] ?? "seat");
  const startTurnIndex = normalizeTurnIndex(draft.start_turn_index);

  return {
    schema_version: COURT_SERVICE_RECORD_SCHEMA_VERSION,
    record_id: normalizeRequiredId(draft.record_id, `${draft.seat_id}:${holderPersonId}:${startTurnIndex ?? 0}`),
    seat_id: draft.seat_id,
    scope,
    owner_actor_id: ownerActorId,
    seat_key: seatKey,
    holder_person_id: holderPersonId,
    holder_house_id: normalizeOptionalId(draft.holder_house_id),
    holder_kind: normalizeHolderKind(draft.holder_kind),
    payment_basis: normalizePaymentBasis(draft.payment_basis),
    start_turn_index: startTurnIndex,
    end_turn_index: normalizeTurnIndex(draft.end_turn_index),
  };
}

export function buildCourtServiceRecordRegistry(
  drafts: readonly CourtServiceRecordDraft[] = []
): CourtServiceRecordRegistryV0 {
  const recordsById = new Map<string, CourtServiceRecordV0>();

  for (const draft of drafts) {
    if (!draft || typeof draft !== "object") continue;
    if (!normalizeOptionalId(draft.seat_id)) continue;
    const record = createCourtServiceRecord(draft);
    if (!record) continue;
    recordsById.set(record.record_id, record);
  }

  const records = Array.from(recordsById.values()).sort((left, right) => left.record_id.localeCompare(right.record_id));
  const recordIds = records.map((record) => record.record_id);
  const activeRecordIds = records.filter((record) => record.end_turn_index === null).map((record) => record.record_id);

  return {
    schema_version: COURT_SERVICE_RECORD_REGISTRY_SCHEMA_VERSION,
    record_ids: recordIds,
    active_record_ids: activeRecordIds,
    records_by_id: Object.fromEntries(records.map((record) => [record.record_id, record])) as Record<
      string,
      CourtServiceRecordV0
    >,
  };
}

export function normalizeCourtServiceRecordRegistry(value: any): CourtServiceRecordRegistryV0 {
  const rawRecords =
    value && typeof value === "object" && value.records_by_id && typeof value.records_by_id === "object"
      ? Object.values(value.records_by_id)
      : [];

  const drafts = rawRecords
    .filter((rawRecord) => rawRecord && typeof rawRecord === "object")
    .map((rawRecord: any) => ({
      record_id: rawRecord.record_id,
      seat_id: rawRecord.seat_id,
      scope: rawRecord.scope,
      owner_actor_id: rawRecord.owner_actor_id,
      seat_key: rawRecord.seat_key,
      holder_person_id: rawRecord.holder_person_id,
      holder_house_id: rawRecord.holder_house_id,
      holder_kind: rawRecord.holder_kind,
      payment_basis: rawRecord.payment_basis,
      start_turn_index: rawRecord.start_turn_index,
      end_turn_index: rawRecord.end_turn_index,
    }));

  return buildCourtServiceRecordRegistry(drafts);
}

export function createCourtServiceRecordRegistry(): CourtServiceRecordRegistryV0 {
  return buildCourtServiceRecordRegistry();
}

export function ensureCourtServiceRecordRegistry(state: RunState): CourtServiceRecordRegistryV0 {
  const houseAny: any = state.house as any;
  const existing = houseAny?.court_service_record_registry;
  const normalized =
    existing &&
    typeof existing === "object" &&
    existing.schema_version === COURT_SERVICE_RECORD_REGISTRY_SCHEMA_VERSION
      ? normalizeCourtServiceRecordRegistry(existing)
      : createCourtServiceRecordRegistry();

  houseAny.court_service_record_registry = normalized;
  return normalized;
}

export function syncLegacyHouseCourtServiceRecords(
  state: RunState,
  roles: LegacyHouseCourtAssignments
): void {
  const anyState: any = state as any;
  const prior: ServiceRecord[] = Array.isArray(anyState.service_records) ? (anyState.service_records as ServiceRecord[]) : [];
  const people: Record<string, { alive?: boolean }> =
    anyState.people && typeof anyState.people === "object" ? (anyState.people as Record<string, { alive?: boolean }>) : {};
  const byId = new Map<string, ServiceRecord>();

  for (const record of prior) {
    if (!record || typeof record !== "object") continue;
    const id = (record as any).id;
    if (typeof id !== "string" || !id) continue;
    byId.set(id, record);
  }

  const playerHouseId = defaultPlayerHouseId(state);
  const actor = { kind: "house", id: playerHouseId } as const;
  const nowTurn = typeof anyState.turn_index === "number" ? anyState.turn_index : 0;
  const roleKeys = HOUSE_COURT_OFFICE_KEYS.filter((role) => Boolean(roles[role]));
  const activeRoleIds = new Set(roleKeys.map((role) => `sr_${playerHouseId}_${role}`));

  for (const role of roleKeys) {
    const personId = roles[role];
    if (typeof personId !== "string" || !personId) continue;
    if (people[personId]?.alive === false) continue;

    const id = `sr_${playerHouseId}_${role}`;
    const existing = byId.get(id);
    if (existing) {
      if (existing.person_id !== personId) {
        existing.person_id = personId;
        existing.start_turn_index = nowTurn;
      }
      existing.serving_actor_id = actor as any;
      existing.role = role;
      existing.end_turn_index = null;
    } else {
      byId.set(id, {
        id,
        person_id: personId,
        serving_actor_id: actor as any,
        role,
        start_turn_index: nowTurn,
        end_turn_index: null,
      });
    }
  }

  for (const [id, record] of byId.entries()) {
    if (!activeRoleIds.has(id)) continue;
    const personId = record.person_id;
    const person = typeof personId === "string" ? people[personId] : null;
    if (!person || person.alive === false) record.end_turn_index = nowTurn;
  }

  anyState.service_records = Array.from(byId.values()).sort((left, right) => String(left.id).localeCompare(String(right.id)));
}
