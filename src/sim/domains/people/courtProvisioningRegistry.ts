import type { RunState } from "../../types";
import { buildPersonCardRegistry } from "./personCardRegistry";

export const COURT_PROVISIONING_VIEW_SCHEMA_VERSION = "court_provisioning_view_v1" as const;
export const COURT_STIPEND_REGISTRY_SCHEMA_VERSION = "court_stipend_registry_v1" as const;

export type CourtProvisioningStipendBasis =
  | "family_service"
  | "retainer_upkeep"
  | "realm_stipend"
  | "benefice"
  | "unknown"
  | "none";
export type CourtProvisioningClass =
  | "head_of_house"
  | "household_family"
  | "household_child"
  | "retainer"
  | "realm_holder"
  | "institutional_service"
  | "guest";
export type CourtProvisioningRationLevel = "full" | "standard" | "light" | "external";
export type CourtProvisioningLodgingLevel = "manor_house" | "court_quarters" | "institution" | "external";

export type CourtProvisioningEntry = {
  schema_version: "court_provisioning_entry_v1";
  person_id: string;
  person_name: string;
  court_role_labels: string[];
  provisioning_class: CourtProvisioningClass;
  ration_level: CourtProvisioningRationLevel;
  lodging_level: CourtProvisioningLodgingLevel;
  stipend_basis: CourtProvisioningStipendBasis;
  stipend_key: string;
  active_service_record_ids: string[];
  active_seat_ids: string[];
  carried_forward_from_prior: boolean;
};

export type CourtProvisioningView = {
  schema_version: typeof COURT_PROVISIONING_VIEW_SCHEMA_VERSION;
  generated_at_turn_index: number;
  person_ids: string[];
  entries_by_person_id: Record<string, CourtProvisioningEntry>;
};

export type CourtStipendEntry = {
  schema_version: "court_stipend_entry_v1";
  stipend_key: string;
  person_id: string;
  person_name: string;
  payment_basis: CourtProvisioningStipendBasis;
  provisioning_class: CourtProvisioningClass;
  service_record_ids: string[];
  active_seat_ids: string[];
  carry_forward_from_prior: boolean;
};

export type CourtStipendRegistry = {
  schema_version: typeof COURT_STIPEND_REGISTRY_SCHEMA_VERSION;
  generated_at_turn_index: number;
  person_ids: string[];
  stipend_keys: string[];
  stipend_key_by_person_id: Record<string, string | null>;
  entries_by_key: Record<string, CourtStipendEntry>;
};

type PersonCardRegistry = ReturnType<typeof buildPersonCardRegistry>;
type PersonCardView = PersonCardRegistry["entries_by_person_id"][string];

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

function paymentBasisForCard(card: PersonCardView): CourtProvisioningStipendBasis {
  const officeBasis = card.office_assignments.map((assignment) => assignment.payment_basis).find((basis) => typeof basis === "string");
  if (officeBasis === "family_service" || officeBasis === "retainer_upkeep" || officeBasis === "realm_stipend" || officeBasis === "benefice") {
    return officeBasis;
  }
  if (
    card.court_role_labels.includes("Head of House") ||
    card.court_role_labels.includes("Spouse") ||
    card.court_role_labels.includes("Household Child")
  ) {
    return "family_service";
  }
  if (card.service_timeline.active_record_ids.length > 0) return "unknown";
  return "none";
}

function provisioningClassForCard(card: PersonCardView, stipendBasis: CourtProvisioningStipendBasis): CourtProvisioningClass {
  if (card.court_role_labels.includes("Head of House")) return "head_of_house";
  if (card.court_role_labels.includes("Spouse")) return "household_family";
  if (card.court_role_labels.includes("Household Child")) return "household_child";
  if (stipendBasis === "realm_stipend") return "realm_holder";
  if (stipendBasis === "benefice") return "institutional_service";
  if (stipendBasis === "retainer_upkeep" || card.office_assignments.length > 0 || card.service_timeline.active_record_ids.length > 0) {
    return "retainer";
  }
  return "guest";
}

function defaultRationLevel(provisioningClass: CourtProvisioningClass): CourtProvisioningRationLevel {
  if (provisioningClass === "head_of_house" || provisioningClass === "household_family") return "full";
  if (provisioningClass === "household_child" || provisioningClass === "retainer" || provisioningClass === "realm_holder") return "standard";
  if (provisioningClass === "institutional_service") return "light";
  return "external";
}

function defaultLodgingLevel(provisioningClass: CourtProvisioningClass): CourtProvisioningLodgingLevel {
  if (provisioningClass === "head_of_house" || provisioningClass === "household_family" || provisioningClass === "household_child") {
    return "manor_house";
  }
  if (provisioningClass === "retainer" || provisioningClass === "realm_holder") return "court_quarters";
  if (provisioningClass === "institutional_service") return "institution";
  return "external";
}

export function buildCourtProvisioningView(
  state: RunState,
  personCards: PersonCardRegistry = buildPersonCardRegistry(state)
): CourtProvisioningView {
  const priorView = (state as any)?.court_provisioning_view;
  const personIds = personCards.person_ids
    .filter((personId) => personCards.entries_by_person_id[personId]?.court_member)
    .sort(compareText);
  const entriesByPersonId: Record<string, CourtProvisioningEntry> = {};

  for (const personId of personIds) {
    const card = personCards.entries_by_person_id[personId];
    const priorEntry = priorView?.entries_by_person_id?.[personId] ?? null;
    const stipendBasis = paymentBasisForCard(card);
    const provisioningClass = provisioningClassForCard(card, stipendBasis);
    const stipendKey = `stipend:${personId}`;

    entriesByPersonId[personId] = {
      schema_version: "court_provisioning_entry_v1",
      person_id: personId,
      person_name: card.person_name,
      court_role_labels: [...card.court_role_labels],
      provisioning_class: provisioningClass,
      ration_level: priorEntry?.ration_level ?? defaultRationLevel(provisioningClass),
      lodging_level: priorEntry?.lodging_level ?? defaultLodgingLevel(provisioningClass),
      stipend_basis: stipendBasis,
      stipend_key: stipendKey,
      active_service_record_ids: [...card.service_timeline.active_record_ids],
      active_seat_ids: card.office_assignments
        .map((assignment) => assignment.seat_id)
        .filter((seatId): seatId is string => typeof seatId === "string" && seatId.length > 0)
        .sort(compareText),
      carried_forward_from_prior: Boolean(priorEntry),
    };
  }

  return {
    schema_version: COURT_PROVISIONING_VIEW_SCHEMA_VERSION,
    generated_at_turn_index: Math.trunc(state.turn_index),
    person_ids: personIds,
    entries_by_person_id: entriesByPersonId,
  };
}

export function buildCourtStipendRegistry(
  state: RunState,
  provisioningView: CourtProvisioningView = buildCourtProvisioningView(state)
): CourtStipendRegistry {
  const priorRegistry = (state as any)?.court_stipend_registry;
  const stipendKeys: string[] = [];
  const stipendKeyByPersonId: Record<string, string | null> = {};
  const entriesByKey: Record<string, CourtStipendEntry> = {};

  for (const personId of provisioningView.person_ids) {
    const provisioningEntry = provisioningView.entries_by_person_id[personId]!;
    const stipendKey = provisioningEntry.stipend_key ?? `stipend:${personId}`;
    const priorEntry = priorRegistry?.entries_by_key?.[stipendKey] ?? null;
    stipendKeys.push(stipendKey);
    stipendKeyByPersonId[personId] = stipendKey;
    entriesByKey[stipendKey] = {
      schema_version: "court_stipend_entry_v1",
      stipend_key: stipendKey,
      person_id: personId,
      person_name: provisioningEntry.person_name,
      payment_basis: provisioningEntry.stipend_basis,
      provisioning_class: provisioningEntry.provisioning_class,
      service_record_ids: [...provisioningEntry.active_service_record_ids],
      active_seat_ids: [...provisioningEntry.active_seat_ids],
      carry_forward_from_prior: Boolean(priorEntry),
    };
  }

  return {
    schema_version: COURT_STIPEND_REGISTRY_SCHEMA_VERSION,
    generated_at_turn_index: Math.trunc(state.turn_index),
    person_ids: [...provisioningView.person_ids],
    stipend_keys: sortStrings(stipendKeys),
    stipend_key_by_person_id: stipendKeyByPersonId,
    entries_by_key: entriesByKey,
  };
}

export function attachCourtProvisioningSurfaces(
  target: RunState | Record<string, unknown>,
  provisioningView: CourtProvisioningView | null,
  stipendRegistry: CourtStipendRegistry | null
): void {
  attachHiddenSurface(target as object, "court_provisioning_view", provisioningView);
  attachHiddenSurface(target as object, "court_stipend_registry", stipendRegistry);
  attachHiddenSurface((target as any)?.house, "court_provisioning_view", provisioningView);
  attachHiddenSurface((target as any)?.house, "court_stipend_registry", stipendRegistry);
  if (!provisioningView || !stipendRegistry) return;

  const people = (target as any)?.people;
  if (people && typeof people === "object") {
    for (const personId of provisioningView.person_ids) {
      const person = people[personId];
      if (!person || typeof person !== "object") continue;
      attachHiddenSurface(person, "court_provisioning_entry", provisioningView.entries_by_person_id[personId] ?? null);
      const stipendKey = stipendRegistry.stipend_key_by_person_id[personId];
      attachHiddenSurface(person, "court_stipend_entry", stipendKey ? stipendRegistry.entries_by_key[stipendKey] ?? null : null);
    }
  }
}
