import { registryPersonFor, structuredHouseIdForPerson } from "../../actors";
import { getParents } from "../../kinship";
import type {
  MarriageOffer,
  MarriageWorkflowEffectSummaryV1,
  MarriageWorkflowInboundOfferV1,
  MarriageWorkflowLatestOfferV1,
  MarriageWorkflowOutboundScoutingV1,
  MarriageWorkflowPersonRefV1,
  MarriageWorkflowRelativeRefV1,
  MarriageWorkflowSubjectViewV1,
  MarriageWorkflowViewV1,
  MarriageWindow,
  RunState,
} from "../../types";
import { buildMarriageWindow, type OutboundMarriageScoutingRegistry } from "./marriage";
import { readHouseNameForId } from "./knownHouseSummaries";
import { readPersistedOutboundMarriageOfferEntries, type MarriageOfferRegistryEntry } from "./marriageOfferRegistry";

export const MARRIAGE_WORKFLOW_VIEW_SCHEMA_VERSION = "marriage_workflow_view_v1" as const;
const MARRIAGE_WORKFLOW_SUBJECT_SCHEMA_VERSION = "marriage_workflow_subject_v1" as const;
const MARRIAGE_WORKFLOW_INBOUND_OFFER_SCHEMA_VERSION = "marriage_workflow_inbound_offer_v1" as const;
const MARRIAGE_WORKFLOW_OUTBOUND_SCOUTING_SCHEMA_VERSION = "marriage_workflow_outbound_scouting_v1" as const;
const MARRIAGE_WORKFLOW_LATEST_OFFER_SCHEMA_VERSION = "marriage_workflow_latest_offer_v1" as const;

type BuildMarriageWorkflowViewOptions = {
  marriage_window?: MarriageWindow | null;
  outbound_marriage_scouting_registry?: OutboundMarriageScoutingRegistry | null;
};

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
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

function relativeRefForPerson(state: RunState, personId: string): MarriageWorkflowRelativeRefV1 {
  const person = registryPersonFor(state, personId);
  const houseId = structuredHouseIdForPerson(state, personId);
  return {
    person_id: personId,
    person_name: person?.name ?? personId,
    house_id: houseId,
    house_name: readHouseNameForId(state, houseId),
  };
}

function personRefForPerson(state: RunState, personId: string): MarriageWorkflowPersonRefV1 {
  const person = registryPersonFor(state, personId);
  const houseId = structuredHouseIdForPerson(state, personId);
  const parentRefs = getParents(state as any, personId)
    .map((parentId) => relativeRefForPerson(state, parentId))
    .sort((left, right) => compareText(left.person_id, right.person_id));

  return {
    person_id: personId,
    person_name: person?.name ?? personId,
    house_id: houseId,
    house_name: readHouseNameForId(state, houseId),
    parent_refs: parentRefs,
  };
}

function effectSummaryFromOffer(offer: MarriageOffer): MarriageWorkflowEffectSummaryV1 {
  return {
    coin_delta: Math.trunc(offer.dowry_coin_net),
    relationship_delta: {
      allegiance: Math.trunc(offer.relationship_delta.allegiance),
      respect: Math.trunc(offer.relationship_delta.respect),
      threat: Math.trunc(offer.relationship_delta.threat),
    },
    liege_delta: offer.liege_delta
      ? {
          respect: Math.trunc(offer.liege_delta.respect),
          threat: Math.trunc(offer.liege_delta.threat),
        }
      : null,
    risk_tags: [...offer.risk_tags].sort(compareText),
  };
}

function effectSummaryFromRegistryEntry(entry: MarriageOfferRegistryEntry): MarriageWorkflowEffectSummaryV1 {
  return {
    coin_delta: Math.trunc(entry.dowry_coin_net),
    relationship_delta: {
      allegiance: Math.trunc(entry.relationship_delta.allegiance),
      respect: Math.trunc(entry.relationship_delta.respect),
      threat: Math.trunc(entry.relationship_delta.threat),
    },
    liege_delta: entry.liege_delta
      ? {
          respect: Math.trunc(entry.liege_delta.respect),
          threat: Math.trunc(entry.liege_delta.threat),
        }
      : null,
    risk_tags: [...entry.risk_tags].sort(compareText),
  };
}

function inboundOffersForSubject(
  state: RunState,
  subjectPersonId: string,
  marriageWindow: MarriageWindow | null
): MarriageWorkflowInboundOfferV1[] {
  if (!marriageWindow?.offers?.length || !marriageWindow.eligible_child_ids.includes(subjectPersonId)) return [];

  return marriageWindow.offers.map((offer, offerIndex) => ({
    schema_version: MARRIAGE_WORKFLOW_INBOUND_OFFER_SCHEMA_VERSION,
    entry_id: `inbound:${subjectPersonId}:${offer.house_person_id}:${offerIndex}`,
    offer_index: offerIndex,
    offer_key: null,
    state: "received",
    candidate: personRefForPerson(state, offer.house_person_id),
    expected_effects: effectSummaryFromOffer(offer),
  }));
}

function outboundScoutingForSubject(
  state: RunState,
  subjectPersonId: string,
  scoutingRegistry: OutboundMarriageScoutingRegistry | null
): MarriageWorkflowOutboundScoutingV1 | null {
  if (!scoutingRegistry || scoutingRegistry.subject_person_id !== subjectPersonId) return null;

  const featuredCandidateId =
    scoutingRegistry.shown_candidate_ids[0] ??
    scoutingRegistry.candidate_ids[0] ??
    null;

  return {
    schema_version: MARRIAGE_WORKFLOW_OUTBOUND_SCOUTING_SCHEMA_VERSION,
    scouting_status: scoutingRegistry.candidate_ids.length > 0 ? "available" : "empty",
    shown_candidate_count: Math.max(0, Math.trunc(scoutingRegistry.total_shown_candidates)),
    held_out_candidate_count: Math.max(0, Math.trunc(scoutingRegistry.total_held_out_candidates)),
    total_candidates_considered: Math.max(0, Math.trunc(scoutingRegistry.total_candidates_considered)),
    featured_candidate: featuredCandidateId ? personRefForPerson(state, featuredCandidateId) : null,
  };
}

function latestOutboundOfferForSubject(
  state: RunState,
  subjectPersonId: string
): MarriageWorkflowLatestOfferV1 | null {
  const offers = readPersistedOutboundMarriageOfferEntries(state)
    .filter((entry) => entry.subject_person_id === subjectPersonId)
    .sort((left, right) => {
      if (right.last_state_change_turn !== left.last_state_change_turn) {
        return right.last_state_change_turn - left.last_state_change_turn;
      }
      if (right.created_turn !== left.created_turn) return right.created_turn - left.created_turn;
      return compareText(left.offer_key, right.offer_key);
    });

  const latest = offers[0] ?? null;
  if (!latest) return null;

  return {
    schema_version: MARRIAGE_WORKFLOW_LATEST_OFFER_SCHEMA_VERSION,
    offer_key: latest.offer_key,
    state: latest.state,
    candidate: personRefForPerson(state, latest.candidate_person_id),
    expected_effects: effectSummaryFromRegistryEntry(latest),
  };
}

function subjectViewForPerson(
  state: RunState,
  subjectPersonId: string,
  marriageWindow: MarriageWindow | null,
  scoutingRegistry: OutboundMarriageScoutingRegistry | null
): MarriageWorkflowSubjectViewV1 {
  return {
    schema_version: MARRIAGE_WORKFLOW_SUBJECT_SCHEMA_VERSION,
    subject: personRefForPerson(state, subjectPersonId),
    inbound_offer_count: inboundOffersForSubject(state, subjectPersonId, marriageWindow).length,
    inbound_offers: inboundOffersForSubject(state, subjectPersonId, marriageWindow),
    outbound_scouting: outboundScoutingForSubject(state, subjectPersonId, scoutingRegistry),
    latest_outbound_offer: latestOutboundOfferForSubject(state, subjectPersonId),
  };
}

export function buildMarriageWorkflowView(
  state: RunState,
  opts: BuildMarriageWorkflowViewOptions = {}
): MarriageWorkflowViewV1 {
  const marriageWindow = opts.marriage_window ?? buildMarriageWindow(state);
  const scoutingRegistry =
    opts.outbound_marriage_scouting_registry ??
    ((state as any)?.outbound_marriage_scouting_registry as OutboundMarriageScoutingRegistry | null | undefined) ??
    (marriageWindow && (marriageWindow as any)?.outbound_marriage_scouting_registry
      ? ((marriageWindow as any).outbound_marriage_scouting_registry as OutboundMarriageScoutingRegistry)
      : null);

  const subjectIds = new Set<string>();
  for (const subjectPersonId of marriageWindow?.eligible_child_ids ?? []) {
    const normalized = normalizeOptionalId(subjectPersonId);
    if (normalized) subjectIds.add(normalized);
  }
  const scoutingSubjectId = normalizeOptionalId(scoutingRegistry?.subject_person_id);
  if (scoutingSubjectId) subjectIds.add(scoutingSubjectId);
  for (const entry of readPersistedOutboundMarriageOfferEntries(state)) {
    const normalized = normalizeOptionalId(entry.subject_person_id);
    if (normalized) subjectIds.add(normalized);
  }

  const subjectPersonIds = sortStrings(subjectIds);
  const subjectsByPersonId: Record<string, MarriageWorkflowSubjectViewV1> = {};
  for (const subjectPersonId of subjectPersonIds) {
    subjectsByPersonId[subjectPersonId] = subjectViewForPerson(state, subjectPersonId, marriageWindow, scoutingRegistry);
  }

  return {
    schema_version: MARRIAGE_WORKFLOW_VIEW_SCHEMA_VERSION,
    turn_index: Math.trunc(state.turn_index),
    subject_person_ids: subjectPersonIds,
    subjects_by_person_id: subjectsByPersonId,
  };
}

export function attachMarriageWorkflowView(target: RunState, workflowView: MarriageWorkflowViewV1): void {
  attachHiddenSurface(target as object, "marriage_workflow_view", workflowView);
  attachHiddenSurface((target as any)?.house as object, "marriage_workflow_view", workflowView);
}
