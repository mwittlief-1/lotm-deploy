import type {
  MarriageWorkflowDecisionPayloadV1,
  MarriageWorkflowEffectSummaryV1,
  MarriageWorkflowInboundOfferV1,
  MarriageWorkflowPersonRefV1,
  MarriageWorkflowSubjectViewV1,
  MarriageWorkflowViewV1,
  RunState,
} from "../sim/types";
import { buildHouseSecondaryIdentifier, buildPersonSecondaryIdentifier } from "./identityLabels";

export type MarriageWorkflowLinkSurface = {
  detail: string;
  houseDetail: string | null;
  houseId: string | null;
  houseLabel: string | null;
  personId: string;
  title: string;
};

export type MarriageWorkflowActionStatus =
  | "available"
  | "accepted"
  | "rejected"
  | "sent"
  | "queued"
  | "resolved"
  | "no_effect";

export type MarriageWorkflowInboundOfferSurface = {
  acceptDecisionPayload: MarriageWorkflowDecisionPayloadV1;
  acceptOutcomeSummary: string;
  effectSummary: string;
  entryId: string;
  houseId: string | null;
  houseLabel: string | null;
  offerIndex: number;
  offerSummary: string;
  rejectDecisionPayload: MarriageWorkflowDecisionPayloadV1;
  rejectOutcomeSummary: string;
  candidate: MarriageWorkflowLinkSurface;
};

export type MarriageWorkflowSubjectSurface = {
  helperText: string;
  inboundOffers: MarriageWorkflowInboundOfferSurface[];
  inboundSummary: string;
  latestOfferSummary: string | null;
  latestOfferStatus: MarriageWorkflowActionStatus | null;
  outboundFeaturedCandidate: MarriageWorkflowLinkSurface | null;
  queueOutboundOfferPayload: MarriageWorkflowDecisionPayloadV1 | null;
  scoutDecisionPayload: MarriageWorkflowDecisionPayloadV1 | null;
  sendOutboundOfferPayload: MarriageWorkflowDecisionPayloadV1 | null;
  outboundSendOutcomeSummary: string | null;
  outboundTermSummary: string;
  outboundSummary: string;
  subject: MarriageWorkflowLinkSurface;
  subjectParents: MarriageWorkflowLinkSurface[];
  workflowId: string;
};

export type MarriageWorkflowSurface = {
  helperText: string;
  schemaVersion: string;
  subjects: MarriageWorkflowSubjectSurface[];
};

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function readMarriageWorkflowView(previewState: RunState | null | undefined): MarriageWorkflowViewV1 | null {
  const value =
    (previewState as any)?.marriage_workflow_view ??
    (previewState as any)?.house?.marriage_workflow_view ??
    null;
  if (!value || typeof value !== "object") return null;
  return value.schema_version === "marriage_workflow_view_v1" ? (value as MarriageWorkflowViewV1) : null;
}

function formatToken(value: string | null | undefined): string {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token) return "Unknown";
  return token
    .split(/[._]/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function houseLabel(houseName: string | null | undefined, houseId: string | null | undefined): string | null {
  if (houseName && houseName.trim().length > 0) return `House ${houseName.trim()}`;
  if (houseId && houseId.trim().length > 0) return houseId.trim();
  return null;
}

function personDetail(previewState: RunState, ref: MarriageWorkflowPersonRefV1): string {
  return (
    buildPersonSecondaryIdentifier(previewState, ref.person_id, {
      defaultLabel: "House not recorded on this workflow seam.",
      houseId: ref.house_id,
      houseName: ref.house_name
    }) ?? "House not recorded on this workflow seam."
  );
}

function personLink(previewState: RunState, ref: MarriageWorkflowPersonRefV1): MarriageWorkflowLinkSurface {
  return {
    detail: personDetail(previewState, ref),
    houseDetail: buildHouseSecondaryIdentifier(previewState, ref.house_id, { houseName: ref.house_name }),
    houseId: ref.house_id,
    houseLabel: houseLabel(ref.house_name, ref.house_id),
    personId: ref.person_id,
    title: ref.person_name,
  };
}

function effectSummary(summary: MarriageWorkflowEffectSummaryV1): string {
  const parts = [
    `Dowry ${formatSigned(summary.coin_delta)} coin`,
    `A ${formatSigned(summary.relationship_delta.allegiance)}`,
    `R ${formatSigned(summary.relationship_delta.respect)}`,
    `T ${formatSigned(summary.relationship_delta.threat)}`
  ];
  if (summary.liege_delta) {
    parts.push(`Liege R ${formatSigned(summary.liege_delta.respect)} / T ${formatSigned(summary.liege_delta.threat)}`);
  }
  if (summary.risk_tags.length > 0) {
    parts.push(`Tags ${summary.risk_tags.join(", ")}`);
  }
  return parts.join(" · ");
}

function inboundOfferSummary(offer: MarriageWorkflowInboundOfferV1): string {
  const candidateHouse = houseLabel(offer.candidate.house_name, offer.candidate.house_id);
  return `${offer.candidate.person_name}${candidateHouse ? ` from ${candidateHouse}` : ""} is waiting for your response.`;
}

function inboundRejectSummary(offer: MarriageWorkflowInboundOfferV1): string {
  return offer.resolution_outcomes.reject.summary;
}

function latestOfferSummary(subjectView: MarriageWorkflowSubjectViewV1): string | null {
  const latestOffer = subjectView.latest_outbound_offer;
  if (!latestOffer) return null;
  return `Post-submit state: ${latestOffer.resolution_outcome.summary}`;
}

function latestOfferStatus(subjectView: MarriageWorkflowSubjectViewV1): MarriageWorkflowActionStatus | null {
  const latestOffer = subjectView.latest_outbound_offer;
  if (!latestOffer) return null;
  if (latestOffer.state === "accepted") return "accepted";
  if (latestOffer.state === "rejected") return "rejected";
  if (latestOffer.state === "generated" || latestOffer.state === "pending") return "sent";
  return "resolved";
}

function outboundSummary(subjectView: MarriageWorkflowSubjectViewV1): string {
  const scouting = subjectView.outbound_scouting;
  if (!scouting) return "Outbound scouting has not surfaced for this subject yet.";
  if (scouting.scouting_status === "empty") {
    return "Outbound scouting found no current candidates inside the admitted action scope.";
  }
  return `${scouting.shown_candidate_count} shown candidate${scouting.shown_candidate_count === 1 ? "" : "s"} and ${scouting.held_out_candidate_count} held out candidate${scouting.held_out_candidate_count === 1 ? "" : "s"} are grouped here for one outbound workflow path.`;
}

function outboundSendOutcomeSummary(subjectView: MarriageWorkflowSubjectViewV1): string | null {
  const outcome = subjectView.outbound_offer_construction?.resolution_outcomes.send ?? null;
  if (!outcome) return null;
  const previewLabel =
    outcome.status === "accepted"
      ? "Accepted preview"
      : outcome.status === "rejected"
        ? "Rejected preview"
        : outcome.status === "blocked"
          ? "Blocked preview"
          : `${formatToken(outcome.status)} preview`;

  return `If you send now: ${previewLabel}. ${outcome.summary}`;
}

function outboundTermSummary(subjectView: MarriageWorkflowSubjectViewV1): string {
  const termControls = subjectView.outbound_offer_construction?.term_controls ?? [];
  if (termControls.length === 0) {
    return "Player-term access is unavailable until the bounded outbound offer sheet loads for this subject.";
  }

  const editableLabels = termControls
    .filter((row) => row.player_access === "editable_player_tab")
    .slice(0, 4)
    .map((row) => row.label.toLowerCase());
  const lockedLabels = termControls
    .filter((row) => row.player_access === "advanced_contract_only")
    .map((row) => row.label.toLowerCase());

  return `Editable on player tab: ${editableLabels.join(", ")}. Locked on the normal path: ${lockedLabels.join(", ")}.`;
}

function subjectSurface(previewState: RunState, subjectView: MarriageWorkflowSubjectViewV1): MarriageWorkflowSubjectSurface {
  const inboundOffers = subjectView.inbound_offers.map((offer) => ({
    acceptDecisionPayload: offer.decision_payloads.accept,
    acceptOutcomeSummary: offer.resolution_outcomes.accept.summary,
    candidate: personLink(previewState, offer.candidate),
    effectSummary: effectSummary(offer.expected_effects),
    entryId: offer.entry_id,
    houseId: offer.candidate.house_id,
    houseLabel: houseLabel(offer.candidate.house_name, offer.candidate.house_id),
    offerIndex: offer.offer_index,
    offerSummary: inboundOfferSummary(offer),
    rejectDecisionPayload: offer.decision_payloads.reject,
    rejectOutcomeSummary: inboundRejectSummary(offer),
  }));

  const outboundFeaturedCandidate = subjectView.outbound_scouting?.featured_candidate
    ? personLink(previewState, subjectView.outbound_scouting.featured_candidate)
    : null;

  return {
    helperText:
      "Inbound proposals and outbound scouting stay grouped here so the player path names likely effects before you respond or open the offer sheet.",
    inboundOffers,
    inboundSummary:
      subjectView.inbound_offers.length > 0
        ? `${subjectView.inbound_offers.length} inbound proposal${subjectView.inbound_offers.length === 1 ? "" : "s"} waiting on this subject.`
        : "No inbound proposal is active for this subject.",
    latestOfferSummary: latestOfferSummary(subjectView),
    latestOfferStatus: latestOfferStatus(subjectView),
    outboundFeaturedCandidate,
    queueOutboundOfferPayload: subjectView.outbound_offer_construction?.decision_payloads.queue ?? null,
    scoutDecisionPayload: subjectView.outbound_scouting?.decision_payload ?? null,
    sendOutboundOfferPayload: subjectView.outbound_offer_construction?.decision_payloads.send ?? null,
    outboundSendOutcomeSummary: outboundSendOutcomeSummary(subjectView),
    outboundTermSummary: outboundTermSummary(subjectView),
    outboundSummary: outboundSummary(subjectView),
    subject: personLink(previewState, subjectView.subject),
    subjectParents: [...subjectView.subject.parent_refs]
      .sort((left, right) => compareText(left.person_id, right.person_id))
      .map((parent) => ({
        detail:
          buildPersonSecondaryIdentifier(previewState, parent.person_id, {
            defaultLabel: "House not recorded on this workflow seam.",
            houseId: parent.house_id,
            houseName: parent.house_name
          }) ?? "House not recorded on this workflow seam.",
        houseDetail: buildHouseSecondaryIdentifier(previewState, parent.house_id, { houseName: parent.house_name }),
        houseId: parent.house_id,
        houseLabel: houseLabel(parent.house_name, parent.house_id),
        personId: parent.person_id,
        title: parent.person_name,
      })),
    workflowId: `workflow:${subjectView.subject.person_id}`,
  };
}

export function marriageWorkflowInboundActionKey(entryId: string): string {
  return `marriage_workflow:inbound:${entryId}`;
}

export function marriageWorkflowOfferActionKey(workflowId: string): string {
  return `marriage_workflow:outbound_offer:${workflowId}`;
}

export function marriageWorkflowScoutActionKey(workflowId: string): string {
  return `marriage_workflow:scout:${workflowId}`;
}

export function buildMarriageWorkflowSurface(
  previewState: RunState | null | undefined
): MarriageWorkflowSurface | null {
  if (!previewState) return null;
  const view = readMarriageWorkflowView(previewState);
  if (!view || view.subject_person_ids.length === 0) return null;

  return {
    helperText:
      "Marriage workflow keeps inbound proposals beside outbound scouting and offer state so you can compare the same subject from one bounded surface.",
    schemaVersion: view.schema_version,
    subjects: view.subject_person_ids
      .map((subjectPersonId) => view.subjects_by_person_id[subjectPersonId] ?? null)
      .filter((subjectView): subjectView is MarriageWorkflowSubjectViewV1 => subjectView !== null)
      .map((subjectView) => subjectSurface(previewState, subjectView))
  };
}
