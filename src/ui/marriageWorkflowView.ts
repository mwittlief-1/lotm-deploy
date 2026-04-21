import { buildMarriageWindow } from "../sim/domains/people/marriage";
import type {
  MarriageWorkflowEffectSummaryV1,
  MarriageWorkflowInboundOfferV1,
  MarriageWorkflowPersonRefV1,
  MarriageWorkflowSubjectViewV1,
  MarriageWorkflowViewV1,
  RunState,
} from "../sim/types";
import { buildHouseSecondaryIdentifier, buildPersonSecondaryIdentifier } from "./identityLabels";
import {
  buildOutboundMarriageOfferPreview,
  buildOutboundMarriageSurface,
  createOutboundMarriageOfferDraft
} from "./outboundMarriageView";

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
  acceptOutcomeSummary: string;
  effectSummary: string;
  entryId: string;
  houseId: string | null;
  houseLabel: string | null;
  offerIndex: number;
  offerSummary: string;
  rejectOutcomeSummary: string;
  candidate: MarriageWorkflowLinkSurface;
};

export type MarriageWorkflowOutboundOfferDraftSurface = {
  candidatePersonId: string | null;
  dowryCoinDelta: number;
  relationshipAllegiance: number;
  relationshipRespect: number;
  relationshipThreat: number;
};

export type MarriageWorkflowSubjectSurface = {
  helperText: string;
  inboundOffers: MarriageWorkflowInboundOfferSurface[];
  inboundSummary: string;
  latestOfferSummary: string | null;
  latestOfferStatus: MarriageWorkflowActionStatus | null;
  outboundFeaturedCandidate: MarriageWorkflowLinkSurface | null;
  outboundSendOutcomeSummary: string | null;
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

function inboundAcceptSummary(offer: MarriageWorkflowInboundOfferV1): string {
  const candidateHouse = houseLabel(offer.candidate.house_name, offer.candidate.house_id);
  return `Accepting queues this proposal for resolution${candidateHouse ? ` with ${candidateHouse}` : ""}.`;
}

function inboundRejectSummary(offerCount: number, firstHouseLabel: string | null): string {
  if (offerCount <= 0) {
    return "No inbound offers are pending.";
  }
  if (offerCount === 1 && firstHouseLabel) {
    return `Rejecting this proposal leaves the match unresolved and adds slight social friction with ${firstHouseLabel}.`;
  }
  return "Rejecting all current proposals leaves the match unresolved and adds slight social friction this turn.";
}

function latestOfferSummary(subjectView: MarriageWorkflowSubjectViewV1): string | null {
  const latestOffer = subjectView.latest_outbound_offer;
  if (!latestOffer) return null;
  const candidateHouse = houseLabel(latestOffer.candidate.house_name, latestOffer.candidate.house_id);
  const candidateLabel = candidateHouse ? `${latestOffer.candidate.person_name} of ${candidateHouse}` : latestOffer.candidate.person_name;
  return `Last outbound offer: ${formatToken(latestOffer.state)} with ${candidateLabel}.`;
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

function outboundSendOutcomeSummary(previewState: RunState, subjectView: MarriageWorkflowSubjectViewV1): string | null {
  const scouting = subjectView.outbound_scouting;
  const featuredCandidateId = scouting?.featured_candidate?.person_id ?? null;
  if (!scouting || !featuredCandidateId) return null;

  const marriageWindow = buildMarriageWindow(previewState);
  const surface = buildOutboundMarriageSurface(previewState, marriageWindow);
  if (!surface || surface.subjectPersonId !== subjectView.subject.person_id) return null;

  const draft = createOutboundMarriageOfferDraft(surface, { selectedCandidateId: featuredCandidateId });
  const preview = buildOutboundMarriageOfferPreview(surface, draft);
  if (!preview) return null;

  return `If you send now: ${preview.outcomeLabel}. ${preview.summary}`;
}

function subjectSurface(previewState: RunState, subjectView: MarriageWorkflowSubjectViewV1): MarriageWorkflowSubjectSurface {
  const inboundOffers = subjectView.inbound_offers.map((offer) => ({
    acceptOutcomeSummary: inboundAcceptSummary(offer),
    candidate: personLink(previewState, offer.candidate),
    effectSummary: effectSummary(offer.expected_effects),
    entryId: offer.entry_id,
    houseId: offer.candidate.house_id,
    houseLabel: houseLabel(offer.candidate.house_name, offer.candidate.house_id),
    offerIndex: offer.offer_index,
    offerSummary: inboundOfferSummary(offer),
    rejectOutcomeSummary: inboundRejectSummary(
      subjectView.inbound_offers.length,
      houseLabel(subjectView.inbound_offers[0]?.candidate.house_name, subjectView.inbound_offers[0]?.candidate.house_id)
    ),
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
    outboundSendOutcomeSummary: outboundSendOutcomeSummary(previewState, subjectView),
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
