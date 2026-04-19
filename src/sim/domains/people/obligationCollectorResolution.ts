import {
  houseIdForPerson,
  registryPersonFor,
  resolveCurrentHouseHeadId,
  structuredHouseIdForPerson
} from "../../actors";
import type { Institution, Person, RunState } from "../../types";
import { buildInstitutionHolderRegistry, lookupInstitutionHolder } from "./institutionHolderRegistry";

export const ECONOMY_OBLIGATION_COLLECTOR_STATE_VALUES = ["active", "successor", "vacant"] as const;

export type EconomyObligationCollectorStateV1 = typeof ECONOMY_OBLIGATION_COLLECTOR_STATE_VALUES[number];
export type EconomyObligationCollectorActorKindV1 = "person" | "house" | "institution";
export type EconomyObligationCollectorKindV1 = "church" | "liege";

export interface EconomyObligationCollectorResolutionV1 {
  counterparty_kind: EconomyObligationCollectorKindV1;
  counterparty_id: string;
  counterparty_label: string;
  counterparty_actor_kind: EconomyObligationCollectorActorKindV1;
  collector_state: EconomyObligationCollectorStateV1;
  collector_successor_label: string | null;
  collector_summary: string;
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function trimString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function statusFreeName(value: unknown, fallback: string): string {
  const label = trimString(value) ?? fallback;
  return label.replace(/\s+\((?:Deceased|Vacant)\)$/u, "");
}

function livingPerson(state: RunState, personId: string | null | undefined): Person | null {
  const person = registryPersonFor(state, personId);
  return person && person.alive ? person : null;
}

function localLivingPerson(localPerson: Person | null | undefined, state: RunState): Person | null {
  if (!localPerson || !localPerson.alive) return null;
  return livingPerson(state, localPerson.id) ?? localPerson;
}

function housesMap(state: RunState): Record<string, Record<string, unknown>> {
  const anyState: any = state as any;
  return anyState.houses && typeof anyState.houses === "object" ? (anyState.houses as Record<string, Record<string, unknown>>) : {};
}

function houseName(state: RunState, houseId: string | null, fallback: string): string {
  if (!houseId) return fallback;
  const house = housesMap(state)[houseId];
  if (!house || typeof house !== "object") return fallback;

  return (
    trimString(house.house_name) ??
    trimString(house.houseName) ??
    trimString(house.name) ??
    fallback
  );
}

function institutionsMap(state: RunState): Record<string, Institution> {
  const anyState: any = state as any;
  return anyState.institutions && typeof anyState.institutions === "object" ? (anyState.institutions as Record<string, Institution>) : {};
}

function parishInstitutionIdOf(state: RunState): string | null {
  const anyState: any = state as any;
  const localsParishId = trimString(anyState?.locals?.parish_institution_id);
  if (localsParishId) return localsParishId;

  const manorParishId = trimString(anyState?.manor?.parish_institution_id);
  if (manorParishId) return manorParishId;

  const institutions = institutionsMap(state);
  const parishIds = Object.keys(institutions)
    .filter((institutionId) => institutions[institutionId]?.type === "parish")
    .sort(compareText);
  return parishIds[0] ?? null;
}

function institutionLabel(institution: Institution | null | undefined, fallback: string): string {
  return trimString(institution?.name) ?? fallback;
}

function localLiegeName(state: RunState): string {
  return statusFreeName(state.locals?.liege?.name, "Liege");
}

function localClergyName(state: RunState): string {
  return statusFreeName(state.locals?.clergy?.name, "Parish Church");
}

function resolveLiegeCollector(state: RunState): EconomyObligationCollectorResolutionV1 {
  const localLiegeId = trimString(state.locals?.liege?.id);
  const localLiegeNameValue = localLiegeName(state);
  const localLiege = localLivingPerson(state.locals?.liege, state);
  const houseId = localLiegeId
    ? structuredHouseIdForPerson(state, localLiegeId) ?? houseIdForPerson(state, localLiegeId)
    : null;
  const successorId = houseId ? resolveCurrentHouseHeadId(state, houseId) : null;
  const successor = livingPerson(state, successorId);

  if (successor) {
    if (localLiege && successor.id === localLiege.id) {
      return {
        counterparty_kind: "liege",
        counterparty_id: successor.id,
        counterparty_label: successor.name,
        counterparty_actor_kind: "person",
        collector_state: "active",
        collector_successor_label: null,
        collector_summary: `${successor.name} remains the active liege collector.`
      };
    }

    return {
      counterparty_kind: "liege",
      counterparty_id: successor.id,
      counterparty_label: `${successor.name} (current liege)`,
      counterparty_actor_kind: "person",
      collector_state: "successor",
      collector_successor_label: successor.name,
      collector_summary: `${successor.name} now collects liege dues after ${localLiegeNameValue} died.`
    };
  }

  if (localLiege) {
    return {
      counterparty_kind: "liege",
      counterparty_id: localLiege.id,
      counterparty_label: localLiege.name,
      counterparty_actor_kind: "person",
      collector_state: "active",
      collector_successor_label: null,
      collector_summary: `${localLiege.name} remains the active liege collector.`
    };
  }

  const fallbackHouseId = houseId ?? "house:liege_vacant";
  const fallbackHouseName = houseName(state, houseId, "Liege seat");

  return {
    counterparty_kind: "liege",
    counterparty_id: fallbackHouseId,
    counterparty_label: `${fallbackHouseName} (Vacant)`,
    counterparty_actor_kind: "house",
    collector_state: "vacant",
    collector_successor_label: null,
    collector_summary: `${fallbackHouseName} is vacant after ${localLiegeNameValue} died; dues remain pending succession.`
  };
}

function resolveChurchCollector(state: RunState): EconomyObligationCollectorResolutionV1 {
  const localClergyId = trimString(state.locals?.clergy?.id);
  const localClergyNameValue = localClergyName(state);
  const localClergy = localLivingPerson(state.locals?.clergy, state);
  const parishInstitutionId = parishInstitutionIdOf(state);
  const institution = parishInstitutionId ? institutionsMap(state)[parishInstitutionId] ?? null : null;
  const parishLabel = institutionLabel(institution, localClergyNameValue);
  const holderRegistry = buildInstitutionHolderRegistry(state);
  const holderEntry = parishInstitutionId ? lookupInstitutionHolder(holderRegistry, parishInstitutionId) : null;
  const holder = livingPerson(state, holderEntry?.holder_person_id ?? null);

  if (holder) {
    if (localClergy && holder.id === localClergy.id) {
      return {
        counterparty_kind: "church",
        counterparty_id: holder.id,
        counterparty_label: holder.name,
        counterparty_actor_kind: "person",
        collector_state: "active",
        collector_successor_label: null,
        collector_summary: `${holder.name} remains the active church collector.`
      };
    }

    return {
      counterparty_kind: "church",
      counterparty_id: holder.id,
      counterparty_label: institution ? `${holder.name} (${parishLabel})` : `${holder.name} (current priest)`,
      counterparty_actor_kind: "person",
      collector_state: "successor",
      collector_successor_label: holder.name,
      collector_summary: `${holder.name} now collects church dues for ${parishLabel} after ${localClergyNameValue} died.`
    };
  }

  if (localClergy) {
    return {
      counterparty_kind: "church",
      counterparty_id: localClergy.id,
      counterparty_label: localClergy.name,
      counterparty_actor_kind: "person",
      collector_state: "active",
      collector_successor_label: null,
      collector_summary: `${localClergy.name} remains the active church collector.`
    };
  }

  if (parishInstitutionId) {
    return {
      counterparty_kind: "church",
      counterparty_id: parishInstitutionId,
      counterparty_label: `${parishLabel} (Vacant)`,
      counterparty_actor_kind: "institution",
      collector_state: "vacant",
      collector_successor_label: parishLabel,
      collector_summary: `${parishLabel} has no living priest; dues remain with the institution until a successor is placed.`
    };
  }

  return {
    counterparty_kind: "church",
    counterparty_id: "institution:parish_vacant",
    counterparty_label: "Parish Church (Vacant)",
    counterparty_actor_kind: "institution",
    collector_state: "vacant",
    collector_successor_label: null,
    collector_summary: `The church collector seat is vacant after ${localClergyNameValue} died; dues remain pending succession.`
  };
}

export function resolveEconomyObligationCollector(
  state: RunState,
  counterpartyKind: EconomyObligationCollectorKindV1
): EconomyObligationCollectorResolutionV1 {
  return counterpartyKind === "liege" ? resolveLiegeCollector(state) : resolveChurchCollector(state);
}
