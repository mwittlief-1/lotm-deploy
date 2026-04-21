import { registryPersonFor, structuredHouseIdForPerson } from "../../actors";
import { getParents } from "../../kinship";
import type {
  MarriageOffer,
  MarriageWorkflowDecisionPayloadV1,
  MarriageWorkflowEffectSummaryV1,
  MarriageWorkflowInboundOfferV1,
  MarriageWorkflowLatestOfferV1,
  MarriageWorkflowOutboundOfferConstructionV1,
  MarriageWorkflowOutboundOfferDraftV1,
  MarriageWorkflowOutboundScoutingV1,
  MarriageWorkflowOutboundSearchResultV1,
  MarriageWorkflowPersonRefV1,
  MarriageWorkflowRelativeRefV1,
  MarriageWorkflowResolutionOutcomeV1,
  MarriageWorkflowSettlementRequestV1,
  MarriageWorkflowSubjectViewV1,
  MarriageWorkflowTermControlV1,
  MarriageWorkflowViewV1,
  MarriageWindow,
  RunState,
} from "../../types";
import { deepCopy } from "../../util";
import {
  buildMarriageWindow,
  resolveOutboundMarriageOffer,
  type OutboundMarriageScoutingCandidateEntry,
  type OutboundMarriageScoutingRegistry,
} from "./marriage";
import { readHouseNameForId } from "./knownHouseSummaries";
import {
  buildMarriageOfferRegistryFromSubjectOffers,
  makeMarriageOfferKey,
  readPersistedOutboundMarriageOfferEntries,
  type MarriageOfferRegistryEntry,
} from "./marriageOfferRegistry";

export const MARRIAGE_WORKFLOW_VIEW_SCHEMA_VERSION = "marriage_workflow_view_v1" as const;
const MARRIAGE_WORKFLOW_SUBJECT_SCHEMA_VERSION = "marriage_workflow_subject_v1" as const;
const MARRIAGE_WORKFLOW_INBOUND_OFFER_SCHEMA_VERSION = "marriage_workflow_inbound_offer_v1" as const;
const MARRIAGE_WORKFLOW_OUTBOUND_SCOUTING_SCHEMA_VERSION = "marriage_workflow_outbound_scouting_v1" as const;
const MARRIAGE_WORKFLOW_LATEST_OFFER_SCHEMA_VERSION = "marriage_workflow_latest_offer_v1" as const;
const MARRIAGE_WORKFLOW_DECISION_PAYLOAD_SCHEMA_VERSION = "marriage_workflow_decision_payload_v1" as const;
const MARRIAGE_WORKFLOW_RESOLUTION_OUTCOME_SCHEMA_VERSION = "marriage_workflow_resolution_outcome_v1" as const;
const MARRIAGE_WORKFLOW_OUTBOUND_SEARCH_RESULT_SCHEMA_VERSION = "marriage_workflow_outbound_search_result_v1" as const;
const MARRIAGE_WORKFLOW_OUTBOUND_OFFER_CONSTRUCTION_SCHEMA_VERSION =
  "marriage_workflow_outbound_offer_construction_v1" as const;
const MARRIAGE_WORKFLOW_TERM_CONTROL_SCHEMA_VERSION = "marriage_workflow_term_control_v1" as const;

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

function emptySettlementRequest(): MarriageWorkflowSettlementRequestV1 {
  return {
    coin: 0,
    food_stores: 0,
    meat_stores: 0,
  };
}

function relationshipDeltaIsZero(summary: MarriageWorkflowEffectSummaryV1): boolean {
  return (
    summary.relationship_delta.allegiance === 0 &&
    summary.relationship_delta.respect === 0 &&
    summary.relationship_delta.threat === 0 &&
    (!summary.liege_delta || (summary.liege_delta.respect === 0 && summary.liege_delta.threat === 0))
  );
}

function effectSummaryHasSettlement(summary: MarriageWorkflowEffectSummaryV1): boolean {
  return summary.coin_delta !== 0;
}

function effectForSummary(summary: MarriageWorkflowEffectSummaryV1): MarriageWorkflowResolutionOutcomeV1["effect"] {
  if (relationshipDeltaIsZero(summary) && !effectSummaryHasSettlement(summary)) return "no_effect";
  if (relationshipDeltaIsZero(summary)) return "settlement_only";
  return effectSummaryHasSettlement(summary) ? "relationship_and_settlement" : "relationship_only";
}

function effectForAcceptedSummary(summary: MarriageWorkflowEffectSummaryV1): MarriageWorkflowResolutionOutcomeV1["effect"] {
  const effect = effectForSummary(summary);
  return effect === "no_effect" ? "state_only" : effect;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function effectSummaryText(summary: MarriageWorkflowEffectSummaryV1): string {
  const parts = [
    `dowry ${formatSigned(summary.coin_delta)} coin`,
    `A ${formatSigned(summary.relationship_delta.allegiance)}`,
    `R ${formatSigned(summary.relationship_delta.respect)}`,
    `T ${formatSigned(summary.relationship_delta.threat)}`,
  ];
  if (summary.liege_delta) {
    parts.push(`liege R ${formatSigned(summary.liege_delta.respect)} / T ${formatSigned(summary.liege_delta.threat)}`);
  }
  if (summary.risk_tags.length > 0) parts.push(`tags ${summary.risk_tags.join(", ")}`);
  return parts.join("; ");
}

function houseLabelForRef(ref: MarriageWorkflowPersonRefV1): string {
  if (ref.house_name && ref.house_name.trim().length > 0) {
    const name = ref.house_name.trim();
    return name.startsWith("House ") ? name : `House ${name}`;
  }
  return ref.house_id ?? "Unknown house";
}

function decisionPayload(args: Omit<MarriageWorkflowDecisionPayloadV1, "schema_version">): MarriageWorkflowDecisionPayloadV1 {
  return {
    schema_version: MARRIAGE_WORKFLOW_DECISION_PAYLOAD_SCHEMA_VERSION,
    ...args,
  };
}

function resolutionOutcome(
  args: Omit<MarriageWorkflowResolutionOutcomeV1, "schema_version">
): MarriageWorkflowResolutionOutcomeV1 {
  return {
    schema_version: MARRIAGE_WORKFLOW_RESOLUTION_OUTCOME_SCHEMA_VERSION,
    ...args,
  };
}

function inboundAcceptPayload(
  subjectPersonId: string,
  entry: MarriageOfferRegistryEntry,
  offerIndex: number
): MarriageWorkflowDecisionPayloadV1 {
  return decisionPayload({
    action_id: `marriage:${subjectPersonId}:inbound:${entry.offer_key}:accept`,
    action: "accept_inbound_offer",
    label: "Accept inbound proposal",
    subject_person_id: subjectPersonId,
    candidate_person_id: entry.candidate_person_id,
    offer_key: entry.offer_key,
    enabled: true,
    disabled_reason: null,
    payload: {
      kind: "marriage",
      action: "accept",
      child_id: subjectPersonId,
      offer_index: Math.trunc(offerIndex),
      offer_key: entry.offer_key,
    },
  });
}

function inboundRejectPayload(
  subjectPersonId: string,
  offerKeys: string[]
): MarriageWorkflowDecisionPayloadV1 {
  return decisionPayload({
    action_id: `marriage:${subjectPersonId}:inbound:reject_all`,
    action: "reject_inbound_offers",
    label: offerKeys.length === 1 ? "Reject inbound proposal" : "Reject inbound proposals",
    subject_person_id: subjectPersonId,
    candidate_person_id: null,
    offer_key: null,
    enabled: offerKeys.length > 0,
    disabled_reason: offerKeys.length > 0 ? null : "No inbound offers are available to reject.",
    payload: {
      kind: "marriage",
      action: "reject_all",
      subject_person_id: subjectPersonId,
      offer_keys: [...offerKeys].sort(compareText),
    },
  });
}

function inboundAcceptOutcome(
  subject: MarriageWorkflowPersonRefV1,
  candidate: MarriageWorkflowPersonRefV1,
  entry: MarriageOfferRegistryEntry,
  expectedEffects: MarriageWorkflowEffectSummaryV1
): MarriageWorkflowResolutionOutcomeV1 {
  return resolutionOutcome({
    outcome_id: `marriage:${subject.person_id}:inbound:${entry.offer_key}:accept:outcome`,
    action: "accept_inbound_offer",
    status: "accepted",
    effect: effectForAcceptedSummary(expectedEffects),
    subject_person_id: subject.person_id,
    candidate_person_id: entry.candidate_person_id,
    offer_key: entry.offer_key,
    expected_effects: expectedEffects,
    blocked_reason: null,
    summary: `Accepting would marry ${subject.person_name} to ${candidate.person_name}; expected effects: ${effectSummaryText(expectedEffects)}.`,
  });
}

function inboundRejectOutcome(
  subjectPersonId: string,
  offerKey: string,
  offerCount: number
): MarriageWorkflowResolutionOutcomeV1 {
  return resolutionOutcome({
    outcome_id: `marriage:${subjectPersonId}:inbound:${offerKey}:reject:outcome`,
    action: "reject_inbound_offers",
    status: "rejected",
    effect: "state_only",
    subject_person_id: subjectPersonId,
    candidate_person_id: null,
    offer_key: offerKey,
    expected_effects: null,
    blocked_reason: null,
    summary:
      offerCount === 1
        ? "Rejecting this proposal uses the inbound reject action and adds slight social friction (+1 unrest) without relationship changes."
        : `Rejecting this proposal uses the shared inbound reject-all action for ${offerCount} offers and adds slight social friction (+1 unrest) without relationship changes.`,
  });
}

function inboundOffersForSubject(
  state: RunState,
  subjectPersonId: string,
  marriageWindow: MarriageWindow | null
): MarriageWorkflowInboundOfferV1[] {
  if (!marriageWindow?.offers?.length || !marriageWindow.eligible_child_ids.includes(subjectPersonId)) return [];

  const subject = personRefForPerson(state, subjectPersonId);
  const registry = buildMarriageOfferRegistryFromSubjectOffers(state, [
    {
      subject_person_id: subjectPersonId,
      offers: marriageWindow.offers,
      direction: "inbound",
      state: "generated",
      created_turn: state.turn_index,
    },
  ]);
  const offerKeys = registry.offer_keys;
  const rejectPayload = inboundRejectPayload(subjectPersonId, offerKeys);

  return marriageWindow.offers.flatMap((offer, offerIndex) => {
    const offerKey = makeMarriageOfferKey({
      direction: "inbound",
      subject_person_id: subjectPersonId,
      candidate_person_id: offer.house_person_id,
    });
    const entry = registry.offers_by_key[offerKey];
    if (!entry) return [];

    const candidate = personRefForPerson(state, entry.candidate_person_id);
    const expectedEffects = effectSummaryFromRegistryEntry(entry);
    return [
      {
        schema_version: MARRIAGE_WORKFLOW_INBOUND_OFFER_SCHEMA_VERSION,
        entry_id: `inbound:${subjectPersonId}:${entry.candidate_person_id}:${offerIndex}`,
        offer_index: offerIndex,
        offer_key: entry.offer_key,
        state: "received",
        candidate,
        expected_effects: expectedEffects,
        decision_payloads: {
          accept: inboundAcceptPayload(subjectPersonId, entry, offerIndex),
          reject: rejectPayload,
        },
        resolution_outcomes: {
          accept: inboundAcceptOutcome(subject, candidate, entry, expectedEffects),
          reject: inboundRejectOutcome(subjectPersonId, entry.offer_key, offerKeys.length),
        },
      },
    ];
  });
}

function scoutDecisionPayload(subjectPersonId: string): MarriageWorkflowDecisionPayloadV1 {
  return decisionPayload({
    action_id: `marriage:${subjectPersonId}:outbound:scout`,
    action: "scout_outbound_candidates",
    label: "Scout outbound candidates",
    subject_person_id: subjectPersonId,
    candidate_person_id: null,
    offer_key: null,
    enabled: true,
    disabled_reason: null,
    payload: {
      kind: "marriage",
      action: "scout",
      subject_person_id: subjectPersonId,
    },
  });
}

function scoutResolutionOutcome(
  subjectPersonId: string,
  registry: OutboundMarriageScoutingRegistry | null
): MarriageWorkflowResolutionOutcomeV1 {
  const shown = Math.max(0, Math.trunc(registry?.total_shown_candidates ?? 0));
  const heldOut = Math.max(0, Math.trunc(registry?.total_held_out_candidates ?? 0));
  const total = Math.max(0, Math.trunc(registry?.total_candidates_considered ?? 0));
  const hasResults = shown + heldOut > 0;

  return resolutionOutcome({
    outcome_id: `marriage:${subjectPersonId}:outbound:scout:outcome`,
    action: "scout_outbound_candidates",
    status: hasResults ? "available" : "no_effect",
    effect: hasResults ? "state_only" : "no_effect",
    subject_person_id: subjectPersonId,
    candidate_person_id: null,
    offer_key: null,
    expected_effects: null,
    blocked_reason: null,
    summary: hasResults
      ? `Current outbound search has ${shown} shown and ${heldOut} held-out candidate${shown + heldOut === 1 ? "" : "s"} from ${total} considered.`
      : "No outbound search result is active yet; queue scouting to refresh the candidate list.",
  });
}

function outboundSearchResultForEntry(
  state: RunState,
  entry: OutboundMarriageScoutingCandidateEntry,
  rankIndex: number
): MarriageWorkflowOutboundSearchResultV1 {
  return {
    schema_version: MARRIAGE_WORKFLOW_OUTBOUND_SEARCH_RESULT_SCHEMA_VERSION,
    candidate: personRefForPerson(state, entry.candidate_person_id),
    rank_index: Math.trunc(rankIndex),
    rank_group: entry.rank_group,
    match_ready: entry.match_ready,
    ranking_score: Math.trunc(entry.ranking_score),
    scope_status: entry.scope_status,
    scope_bucket: entry.scope_bucket,
    distance_band: entry.distance_band,
    route_hop_distance:
      typeof entry.route_hop_distance === "number" && Number.isFinite(entry.route_hop_distance)
        ? Math.trunc(entry.route_hop_distance)
        : null,
    travel_cost_distance:
      typeof entry.travel_cost_distance === "number" && Number.isFinite(entry.travel_cost_distance)
        ? Math.trunc(entry.travel_cost_distance)
        : null,
    include_reasons: [...entry.include_reasons].sort(compareText),
    exclude_reasons: [...entry.exclude_reasons].sort(compareText),
    relevance_reasons: [...entry.relevance_reasons].sort(compareText),
  };
}

function outboundScoutingForSubject(
  state: RunState,
  subjectPersonId: string,
  scoutingRegistry: OutboundMarriageScoutingRegistry | null
): MarriageWorkflowOutboundScoutingV1 | null {
  const activeRegistry = scoutingRegistry?.subject_person_id === subjectPersonId ? scoutingRegistry : null;

  const featuredCandidateId =
    activeRegistry?.shown_candidate_ids[0] ??
    activeRegistry?.candidate_ids[0] ??
    null;

  return {
    schema_version: MARRIAGE_WORKFLOW_OUTBOUND_SCOUTING_SCHEMA_VERSION,
    scouting_status: activeRegistry && activeRegistry.candidate_ids.length > 0 ? "available" : "empty",
    candidate_ids: [...(activeRegistry?.candidate_ids ?? [])],
    shown_candidate_ids: [...(activeRegistry?.shown_candidate_ids ?? [])],
    held_out_candidate_ids: [...(activeRegistry?.held_out_candidate_ids ?? [])],
    shown_candidate_count: Math.max(0, Math.trunc(activeRegistry?.total_shown_candidates ?? 0)),
    held_out_candidate_count: Math.max(0, Math.trunc(activeRegistry?.total_held_out_candidates ?? 0)),
    total_candidates_considered: Math.max(0, Math.trunc(activeRegistry?.total_candidates_considered ?? 0)),
    featured_candidate: featuredCandidateId ? personRefForPerson(state, featuredCandidateId) : null,
    search_results: (activeRegistry?.candidate_ids ?? [])
      .map((candidateId, index) => {
        const entry = activeRegistry?.entries_by_candidate_id[candidateId] ?? null;
        return entry ? outboundSearchResultForEntry(state, entry, index + 1) : null;
      })
      .filter((entry): entry is MarriageWorkflowOutboundSearchResultV1 => entry !== null),
    decision_payload: scoutDecisionPayload(subjectPersonId),
    resolution_outcome: scoutResolutionOutcome(subjectPersonId, activeRegistry),
  };
}

function outboundTermControls(): MarriageWorkflowTermControlV1[] {
  const rows: Array<Omit<MarriageWorkflowTermControlV1, "schema_version">> = [
    {
      draft_field_path: "default_draft.offer.dowry_coin_net",
      resolver_field_path: "offer.dowry_coin_net",
      label: "Dowry coin",
      player_access: "editable_player_tab",
      helper_text: "Player offer copy can tune the headline dowry coin value directly on the bounded player tab.",
    },
    {
      draft_field_path: "default_draft.offer.relationship_delta.respect",
      resolver_field_path: "offer.relationship_delta.respect",
      label: "Respect delta",
      player_access: "editable_player_tab",
      helper_text: "Respect stays player-directed on the main offer sheet.",
    },
    {
      draft_field_path: "default_draft.offer.relationship_delta.allegiance",
      resolver_field_path: "offer.relationship_delta.allegiance",
      label: "Allegiance delta",
      player_access: "editable_player_tab",
      helper_text: "Allegiance stays player-directed on the main offer sheet.",
    },
    {
      draft_field_path: "default_draft.offer.relationship_delta.threat",
      resolver_field_path: "offer.relationship_delta.threat",
      label: "Threat delta",
      player_access: "editable_player_tab",
      helper_text: "Threat stays player-directed on the main offer sheet.",
    },
    {
      draft_field_path: "default_draft.dowry_requested_delta_by_asset.food_stores",
      resolver_field_path: "dowry_requested_delta_by_asset.food_stores",
      label: "Dowry food",
      player_access: "editable_player_tab",
      helper_text: "Non-coin dowry requests stay exposed as bounded settlement rows.",
    },
    {
      draft_field_path: "default_draft.dowry_requested_delta_by_asset.meat_stores",
      resolver_field_path: "dowry_requested_delta_by_asset.meat_stores",
      label: "Dowry meat",
      player_access: "editable_player_tab",
      helper_text: "Non-coin dowry requests stay exposed as bounded settlement rows.",
    },
    {
      draft_field_path: "default_draft.dower_requested_delta_by_asset.coin",
      resolver_field_path: "dower_requested_delta_by_asset.coin",
      label: "Dower coin",
      player_access: "editable_player_tab",
      helper_text: "Dower settlement rows remain player-directed on the main sheet.",
    },
    {
      draft_field_path: "default_draft.dower_requested_delta_by_asset.food_stores",
      resolver_field_path: "dower_requested_delta_by_asset.food_stores",
      label: "Dower food",
      player_access: "editable_player_tab",
      helper_text: "Dower settlement rows remain player-directed on the main sheet.",
    },
    {
      draft_field_path: "default_draft.dower_requested_delta_by_asset.meat_stores",
      resolver_field_path: "dower_requested_delta_by_asset.meat_stores",
      label: "Dower meat",
      player_access: "editable_player_tab",
      helper_text: "Dower settlement rows remain player-directed on the main sheet.",
    },
    {
      draft_field_path: "default_draft.offer.liege_delta",
      resolver_field_path: "offer.liege_delta",
      label: "Liege delta",
      player_access: "advanced_contract_only",
      helper_text: "Liege-side nudges stay off the player tab until the sim exposes them as a direct player control.",
    },
    {
      draft_field_path: "default_draft.offer.risk_tags",
      resolver_field_path: "offer.risk_tags[]",
      label: "Risk tags",
      player_access: "advanced_contract_only",
      helper_text: "Risk-tag tuning stays on the advanced contract path rather than the normal player offer flow.",
    },
  ];

  return rows.map((row) => ({
    schema_version: MARRIAGE_WORKFLOW_TERM_CONTROL_SCHEMA_VERSION,
    ...row,
  }));
}

function outboundOfferDraftForCandidate(
  subjectPersonId: string,
  candidate: MarriageWorkflowPersonRefV1
): MarriageWorkflowOutboundOfferDraftV1 {
  const offerKey = makeMarriageOfferKey({
    direction: "outbound",
    subject_person_id: subjectPersonId,
    candidate_person_id: candidate.person_id,
  });

  return {
    selected_candidate_person_id: candidate.person_id,
    offer_key: offerKey,
    offer: {
      house_person_id: candidate.person_id,
      house_label: houseLabelForRef(candidate),
      dowry_coin_net: 0,
      relationship_delta: { respect: 0, allegiance: 0, threat: 0 },
      liege_delta: null,
      risk_tags: [],
    },
    dowry_requested_delta_by_asset: emptySettlementRequest(),
    dower_requested_delta_by_asset: emptySettlementRequest(),
  };
}

function sendOutboundOfferPayload(
  subjectPersonId: string,
  candidatePersonId: string,
  draft: MarriageWorkflowOutboundOfferDraftV1
): MarriageWorkflowDecisionPayloadV1 {
  return decisionPayload({
    action_id: `marriage:${subjectPersonId}:outbound:${draft.offer_key}:send`,
    action: "send_outbound_offer",
    label: "Send outbound offer",
    subject_person_id: subjectPersonId,
    candidate_person_id: candidatePersonId,
    offer_key: draft.offer_key,
    enabled: true,
    disabled_reason: null,
    payload: {
      kind: "marriage",
      action: "send_outbound_offer",
      subject_person_id: subjectPersonId,
      candidate_person_id: candidatePersonId,
      offer_key: draft.offer_key,
      draft,
    },
  });
}

function queueOutboundOfferPayload(
  subjectPersonId: string,
  candidatePersonId: string,
  draft: MarriageWorkflowOutboundOfferDraftV1
): MarriageWorkflowDecisionPayloadV1 {
  return decisionPayload({
    action_id: `marriage:${subjectPersonId}:outbound:${draft.offer_key}:queue`,
    action: "queue_outbound_offer",
    label: "Queue outbound offer",
    subject_person_id: subjectPersonId,
    candidate_person_id: candidatePersonId,
    offer_key: draft.offer_key,
    enabled: true,
    disabled_reason: null,
    payload: {
      kind: "marriage",
      action: "queue_outbound_offer",
      subject_person_id: subjectPersonId,
      candidate_person_id: candidatePersonId,
      offer_key: draft.offer_key,
      draft,
    },
  });
}

function sendOutboundOfferOutcome(
  state: RunState,
  subjectPersonId: string,
  scoutingRegistry: OutboundMarriageScoutingRegistry,
  draft: MarriageWorkflowOutboundOfferDraftV1
): MarriageWorkflowResolutionOutcomeV1 {
  const result = resolveOutboundMarriageOffer(deepCopy(state), {
    subject_person_id: subjectPersonId,
    scouting_registry: scoutingRegistry,
    offer: draft.offer,
    dowry_requested_delta_by_asset: draft.dowry_requested_delta_by_asset,
    dower_requested_delta_by_asset: draft.dower_requested_delta_by_asset,
  });
  const expectedEffects = result.offer_entry
    ? effectSummaryFromRegistryEntry(result.offer_entry)
    : effectSummaryFromOffer(draft.offer);
  const status = result.outcome === "blocked" ? "blocked" : result.outcome;

  return resolutionOutcome({
    outcome_id: `marriage:${subjectPersonId}:outbound:${draft.offer_key}:send:outcome`,
    action: "send_outbound_offer",
    status,
    effect:
      result.outcome === "accepted"
        ? effectForAcceptedSummary(expectedEffects)
        : result.outcome === "rejected"
          ? "no_effect"
          : "no_effect",
    subject_person_id: subjectPersonId,
    candidate_person_id: draft.selected_candidate_person_id,
    offer_key: draft.offer_key,
    expected_effects: expectedEffects,
    blocked_reason: result.blocked_reason,
    summary: result.notes[0] ?? "No outbound marriage send result is available.",
  });
}

function queueOutboundOfferOutcome(
  subjectPersonId: string,
  draft: MarriageWorkflowOutboundOfferDraftV1
): MarriageWorkflowResolutionOutcomeV1 {
  return resolutionOutcome({
    outcome_id: `marriage:${subjectPersonId}:outbound:${draft.offer_key}:queue:outcome`,
    action: "queue_outbound_offer",
    status: "queued",
    effect: "state_only",
    subject_person_id: subjectPersonId,
    candidate_person_id: draft.selected_candidate_person_id,
    offer_key: draft.offer_key,
    expected_effects: effectSummaryFromOffer(draft.offer),
    blocked_reason: null,
    summary: "Queueing this outbound offer records a pending canonical offer without applying relationship or settlement effects this turn.",
  });
}

function outboundOfferConstructionForSubject(
  state: RunState,
  subjectPersonId: string,
  scoutingRegistry: OutboundMarriageScoutingRegistry | null
): MarriageWorkflowOutboundOfferConstructionV1 | null {
  if (!scoutingRegistry || scoutingRegistry.subject_person_id !== subjectPersonId) return null;
  const featuredCandidateId = scoutingRegistry.shown_candidate_ids[0] ?? scoutingRegistry.candidate_ids[0] ?? null;
  if (!featuredCandidateId) return null;

  const candidate = personRefForPerson(state, featuredCandidateId);
  const draft = outboundOfferDraftForCandidate(subjectPersonId, candidate);

  return {
    schema_version: MARRIAGE_WORKFLOW_OUTBOUND_OFFER_CONSTRUCTION_SCHEMA_VERSION,
    offer_key: draft.offer_key,
    subject_person_id: subjectPersonId,
    candidate,
    default_draft: draft,
    term_controls: outboundTermControls(),
    decision_payloads: {
      send: sendOutboundOfferPayload(subjectPersonId, featuredCandidateId, draft),
      queue: queueOutboundOfferPayload(subjectPersonId, featuredCandidateId, draft),
    },
    resolution_outcomes: {
      send: sendOutboundOfferOutcome(state, subjectPersonId, scoutingRegistry, draft),
      queue: queueOutboundOfferOutcome(subjectPersonId, draft),
    },
  };
}

function latestOutboundOfferOutcome(
  subjectPersonId: string,
  candidate: MarriageWorkflowPersonRefV1,
  entry: MarriageOfferRegistryEntry,
  expectedEffects: MarriageWorkflowEffectSummaryV1
): MarriageWorkflowResolutionOutcomeV1 {
  switch (entry.state) {
    case "accepted":
      return resolutionOutcome({
        outcome_id: `marriage:${subjectPersonId}:outbound:${entry.offer_key}:accepted:outcome`,
        action: "send_outbound_offer",
        status: "accepted",
        effect: effectForAcceptedSummary(expectedEffects),
        subject_person_id: subjectPersonId,
        candidate_person_id: entry.candidate_person_id,
        offer_key: entry.offer_key,
        expected_effects: expectedEffects,
        blocked_reason: null,
        summary: `Outbound offer accepted by ${candidate.person_name}; resolved effects: ${effectSummaryText(expectedEffects)}.`,
      });
    case "rejected":
      return resolutionOutcome({
        outcome_id: `marriage:${subjectPersonId}:outbound:${entry.offer_key}:rejected:outcome`,
        action: "send_outbound_offer",
        status: "rejected",
        effect: "no_effect",
        subject_person_id: subjectPersonId,
        candidate_person_id: entry.candidate_person_id,
        offer_key: entry.offer_key,
        expected_effects: null,
        blocked_reason: null,
        summary: `Outbound offer rejected by ${candidate.person_name}; no relationship or settlement effects were applied.`,
      });
    case "pending":
      return resolutionOutcome({
        outcome_id: `marriage:${subjectPersonId}:outbound:${entry.offer_key}:pending:outcome`,
        action: "queue_outbound_offer",
        status: "pending",
        effect: "state_only",
        subject_person_id: subjectPersonId,
        candidate_person_id: entry.candidate_person_id,
        offer_key: entry.offer_key,
        expected_effects: expectedEffects,
        blocked_reason: null,
        summary: `Outbound offer to ${candidate.person_name} is pending; no relationship or settlement effects have resolved yet.`,
      });
    case "generated":
      return resolutionOutcome({
        outcome_id: `marriage:${subjectPersonId}:outbound:${entry.offer_key}:generated:outcome`,
        action: "queue_outbound_offer",
        status: "available",
        effect: "state_only",
        subject_person_id: subjectPersonId,
        candidate_person_id: entry.candidate_person_id,
        offer_key: entry.offer_key,
        expected_effects: expectedEffects,
        blocked_reason: null,
        summary: `Outbound offer for ${candidate.person_name} is generated but not resolved.`,
      });
    case "expired":
      return resolutionOutcome({
        outcome_id: `marriage:${subjectPersonId}:outbound:${entry.offer_key}:expired:outcome`,
        action: "send_outbound_offer",
        status: "no_effect",
        effect: "no_effect",
        subject_person_id: subjectPersonId,
        candidate_person_id: entry.candidate_person_id,
        offer_key: entry.offer_key,
        expected_effects: null,
        blocked_reason: null,
        summary: `Outbound offer to ${candidate.person_name} expired without relationship or settlement effects.`,
      });
    case "withdrawn":
      return resolutionOutcome({
        outcome_id: `marriage:${subjectPersonId}:outbound:${entry.offer_key}:withdrawn:outcome`,
        action: "send_outbound_offer",
        status: "no_effect",
        effect: "no_effect",
        subject_person_id: subjectPersonId,
        candidate_person_id: entry.candidate_person_id,
        offer_key: entry.offer_key,
        expected_effects: null,
        blocked_reason: null,
        summary: `Outbound offer to ${candidate.person_name} was withdrawn without relationship or settlement effects.`,
      });
  }
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
    resolution_outcome: latestOutboundOfferOutcome(
      subjectPersonId,
      personRefForPerson(state, latest.candidate_person_id),
      latest,
      effectSummaryFromRegistryEntry(latest)
    ),
  };
}

function subjectViewForPerson(
  state: RunState,
  subjectPersonId: string,
  marriageWindow: MarriageWindow | null,
  scoutingRegistry: OutboundMarriageScoutingRegistry | null
): MarriageWorkflowSubjectViewV1 {
  const inboundOffers = inboundOffersForSubject(state, subjectPersonId, marriageWindow);
  return {
    schema_version: MARRIAGE_WORKFLOW_SUBJECT_SCHEMA_VERSION,
    subject: personRefForPerson(state, subjectPersonId),
    inbound_offer_count: inboundOffers.length,
    inbound_offers: inboundOffers,
    outbound_scouting: outboundScoutingForSubject(state, subjectPersonId, scoutingRegistry),
    outbound_offer_construction: outboundOfferConstructionForSubject(state, subjectPersonId, scoutingRegistry),
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
