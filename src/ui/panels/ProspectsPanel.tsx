import React from "react";
import { getGrantProspectTemplate } from "../../content/experienceContent";
import type { RunState } from "../../sim/types";
import { buildHouseSecondaryIdentifier, buildPersonSecondaryIdentifier } from "../identityLabels";
import type {
  MarriageWorkflowActionStatus,
  MarriageWorkflowInboundOfferSurface,
  MarriageWorkflowSubjectSurface,
  MarriageWorkflowSurface
} from "../marriageWorkflowView";
import {
  marriageWorkflowInboundActionKey,
  marriageWorkflowOfferActionKey,
  marriageWorkflowScoutActionKey
} from "../marriageWorkflowView";
import { Tip, formatParentsLine } from "../viewHelpers";
import { HouseDossierTrigger } from "./HouseDossierTrigger";
import { PersonCardTrigger } from "./PersonCardTrigger";

type ProspectDecision = "accept" | "reject" | null;
type ProspectLogLine = { turn_index: number; line: string };

type ProspectsPanelProps = {
  anchorId: string;
  copy: any;
  costsForProspect: (prospect: any) => { coin: number; energy: number; bushels: number };
  dossierHouseIds?: Set<string>;
  effectsSummary: (prospect: any) => { coin?: number; rel?: string | null; flags?: string | null };
  fmtSigned: (value: number) => string;
  getProspectDecision: (id: string) => ProspectDecision;
  handleProspectAction: (prospect: any, action: "accept" | "reject") => void;
  hasProspectExpiredThisTurn: boolean;
  hiddenIds: string[];
  hiddenCount: number;
  houseLabel: (houseId: string | null | undefined) => string;
  marriageWorkflowActionStatus?: Record<string, MarriageWorkflowActionStatus | undefined>;
  marriageWorkflowSurface?: MarriageWorkflowSurface | null;
  onMarriageWorkflowAcceptInbound?: (
    workflow: MarriageWorkflowSubjectSurface,
    offer: MarriageWorkflowInboundOfferSurface
  ) => void;
  onMarriageWorkflowClearScout?: (workflow: MarriageWorkflowSubjectSurface) => void;
  onMarriageWorkflowConstructOffer?: (workflow: MarriageWorkflowSubjectSurface) => void;
  onMarriageWorkflowRejectInbound?: (
    workflow: MarriageWorkflowSubjectSurface,
    offer: MarriageWorkflowInboundOfferSurface
  ) => void;
  onMarriageWorkflowScout?: (workflow: MarriageWorkflowSubjectSurface) => void;
  onOpenHouseDossier?: (houseId: string) => void;
  onOpenPersonCard?: (personId: string) => void;
  personNameFromRegistry: (personId: string | null | undefined) => string | null;
  personCardIds?: Set<string>;
  pfHouseLabelById: Map<string, string>;
  pfParentsByChild: Map<string, string[]>;
  pfPeopleRec: Record<string, any>;
  pfPersonHouseById: Map<string, string>;
  previewState: RunState;
  prospectLogLines: ProspectLogLine[];
  prospectTypeLabel: (type: string | null | undefined) => string;
  prospectsShown: any[];
  prospectsShownCount: number;
  prospectsTotalCount: number;
  rejectHasStandingRisk: (prospect: any) => boolean;
  reportTurnIndex: number;
  shownIds: string[];
  uncertaintyLabel: (uncertainty: string | null | undefined) => string | null;
};

function workflowStatusLabel(status: MarriageWorkflowActionStatus): string {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "sent":
      return "Sent";
    case "queued":
      return "Queued";
    case "resolved":
      return "Resolved";
    case "no_effect":
      return "No effect";
    case "available":
    default:
      return "Available";
  }
}

function workflowStatusDetail(status: MarriageWorkflowActionStatus, availableDetail: string): string {
  switch (status) {
    case "accepted":
      return "Accepted in the current turn plan.";
    case "rejected":
      return "Rejected in the current turn plan.";
    case "sent":
      return "Sent and waiting for resolution.";
    case "queued":
      return "Queued for the next turn resolution.";
    case "resolved":
      return "Already resolved in the visible workflow state.";
    case "no_effect":
      return "No decision effect is queued.";
    case "available":
    default:
      return availableDetail;
  }
}

const workflowPendingContractTitle =
  "Final outbound offer submission waits on the Social lane's canonical marriage workflow contract.";

export function ProspectsPanel({
  anchorId,
  copy,
  costsForProspect,
  dossierHouseIds,
  effectsSummary,
  fmtSigned,
  getProspectDecision,
  handleProspectAction,
  hasProspectExpiredThisTurn,
  hiddenIds,
  hiddenCount,
  houseLabel,
  marriageWorkflowActionStatus,
  marriageWorkflowSurface,
  onMarriageWorkflowAcceptInbound,
  onMarriageWorkflowClearScout,
  onMarriageWorkflowConstructOffer,
  onMarriageWorkflowRejectInbound,
  onMarriageWorkflowScout,
  onOpenHouseDossier,
  onOpenPersonCard,
  personNameFromRegistry,
  personCardIds,
  pfHouseLabelById,
  pfParentsByChild,
  pfPeopleRec,
  pfPersonHouseById,
  previewState,
  prospectLogLines,
  prospectTypeLabel,
  prospectsShown,
  prospectsShownCount,
  prospectsTotalCount,
  rejectHasStandingRisk,
  reportTurnIndex,
  shownIds,
  uncertaintyLabel
}: ProspectsPanelProps) {
  const people: any = (previewState as any).people;
  const grantTemplate = getGrantProspectTemplate();
  const canOpenHouseDossier = (houseId: string | null | undefined): houseId is string =>
    Boolean(houseId && dossierHouseIds?.has(houseId) && onOpenHouseDossier);
  const unifiedMarriageWorkflowActive = Boolean(marriageWorkflowSurface && marriageWorkflowSurface.subjects.length > 0);
  const visibleProspectsShown = unifiedMarriageWorkflowActive
    ? prospectsShown.filter((prospect) => prospect?.type !== "marriage")
    : prospectsShown;
  const hiddenLegacyMarriageCount = unifiedMarriageWorkflowActive
    ? prospectsShown.length - visibleProspectsShown.length
    : 0;
  const visibleProspectsShownCount = unifiedMarriageWorkflowActive
    ? visibleProspectsShown.length
    : prospectsShownCount;
  const visibleProspectsTotalCount = unifiedMarriageWorkflowActive
    ? Math.max(visibleProspectsShown.length, prospectsTotalCount - hiddenLegacyMarriageCount)
    : prospectsTotalCount;
  const legacyMarriageDemotionNotice = unifiedMarriageWorkflowActive ? (
    <div
      data-marriage-legacy-demoted="true"
      style={{ marginTop: 10, padding: 10, border: "1px solid #eadfca", background: "#fffaf0", fontSize: 12, lineHeight: 1.45 }}
    >
      Legacy marriage proposal cards are retired here. Use the unified marriage workflow above for inbound replies,
      scouting/search, and outbound offer construction so proposals do not appear in two conflicting places.
    </div>
  ) : null;

  return (
    <>
      <h4 id={anchorId} style={{ marginTop: 12 }}>{copy.prospects}</h4>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{copy.prospectsHelper}</div>

      {marriageWorkflowSurface && marriageWorkflowSurface.subjects.length > 0 ? (
        <div
          data-marriage-workflow={marriageWorkflowSurface.schemaVersion}
          style={{ marginTop: 10, display: "grid", gap: 10 }}
        >
          <div style={{ padding: 10, border: "1px solid #eee", background: "#fffdf8" }}>
            <div style={{ fontWeight: 700 }}>Marriage workflow</div>
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>{marriageWorkflowSurface.helperText}</div>
          </div>

          {marriageWorkflowSurface.subjects.map((workflow) => {
            const scoutStatus =
              marriageWorkflowActionStatus?.[marriageWorkflowScoutActionKey(workflow.workflowId)] ?? "available";
            const offerStatus =
              marriageWorkflowActionStatus?.[marriageWorkflowOfferActionKey(workflow.workflowId)] ??
              workflow.latestOfferStatus ??
              "available";
            const canScout = Boolean(onMarriageWorkflowScout) && scoutStatus === "available";
            const canClearScout = Boolean(onMarriageWorkflowClearScout) && scoutStatus !== "no_effect";
            const canConstructOffer =
              Boolean(onMarriageWorkflowConstructOffer) &&
              Boolean(workflow.outboundFeaturedCandidate) &&
              (offerStatus === "available" || offerStatus === "no_effect");

            return (
              <div key={workflow.workflowId} style={{ padding: 10, border: "1px solid #eee", background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>
                {personCardIds?.has(workflow.subject.personId) && onOpenPersonCard ? (
                  <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={workflow.subject.personId}>
                    {workflow.subject.title}
                  </PersonCardTrigger>
                ) : (
                  workflow.subject.title
                )}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>{workflow.subject.detail}</div>
              {workflow.subject.houseDetail ? (
                <div style={{ marginTop: 2, fontSize: 12, opacity: 0.8 }}>{workflow.subject.houseDetail}</div>
              ) : null}

              {workflow.subjectParents.length > 0 ? (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                  Parents:{" "}
                  {workflow.subjectParents.map((parent, index) => (
                    <React.Fragment key={parent.personId}>
                      {index > 0 ? ", " : null}
                      {personCardIds?.has(parent.personId) && onOpenPersonCard ? (
                        <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={parent.personId}>
                          {parent.title}
                        </PersonCardTrigger>
                      ) : (
                        parent.title
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : null}

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={{ padding: 10, border: "1px solid #f0ede4", background: "#fffcf5" }}>
                  <div style={{ fontWeight: 700 }}>Inbound proposals</div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>{workflow.inboundSummary}</div>

                  {workflow.inboundOffers.length > 0 ? (
                    <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                      {workflow.inboundOffers.map((offer) => {
                        const inboundStatus =
                          marriageWorkflowActionStatus?.[marriageWorkflowInboundActionKey(offer.entryId)] ?? "available";
                        const canAcceptInbound = Boolean(onMarriageWorkflowAcceptInbound) && inboundStatus === "available";
                        const canRejectInbound = Boolean(onMarriageWorkflowRejectInbound) && inboundStatus === "available";

                        return (
                          <div key={offer.entryId} style={{ paddingTop: 8, borderTop: "1px solid #f0ede4" }}>
                          <div style={{ fontSize: 12, opacity: 0.85 }}>{offer.offerSummary}</div>
                          <div style={{ marginTop: 4 }}>
                            Candidate:{" "}
                            {personCardIds?.has(offer.candidate.personId) && onOpenPersonCard ? (
                              <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={offer.candidate.personId}>
                                {offer.candidate.title}
                              </PersonCardTrigger>
                            ) : (
                              offer.candidate.title
                            )}
                          </div>
                          <div style={{ marginTop: 2, fontSize: 12, opacity: 0.85 }}>{offer.candidate.detail}</div>
                          {offer.houseLabel ? (
                            <div style={{ marginTop: 2, fontSize: 12, opacity: 0.85 }}>
                              House:{" "}
                              {canOpenHouseDossier(offer.houseId) ? (
                                <HouseDossierTrigger houseId={offer.houseId} onOpenHouseDossier={onOpenHouseDossier!}>
                                  {offer.houseLabel}
                                </HouseDossierTrigger>
                              ) : (
                                offer.houseLabel
                              )}
                            </div>
                          ) : null}
                          {offer.candidate.houseDetail ? (
                            <div style={{ marginTop: 2, fontSize: 12, opacity: 0.8 }}>{offer.candidate.houseDetail}</div>
                          ) : null}
                          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                            Expected effects: {offer.effectSummary}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                            Accept outcome: {offer.acceptOutcomeSummary}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                            Reject outcome: {offer.rejectOutcomeSummary}
                          </div>
                          <div style={{ marginTop: 6, fontSize: 12 }}>
                            Status: <b>{workflowStatusLabel(inboundStatus)}</b>.{" "}
                            {workflowStatusDetail(inboundStatus, "Waiting for your response.")}
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                            <button
                              disabled={!canAcceptInbound}
                              onClick={() => onMarriageWorkflowAcceptInbound?.(workflow, offer)}
                              title={onMarriageWorkflowAcceptInbound ? "" : "Inbound action wiring is supplied by the current turn decision flow."}
                              type="button"
                            >
                              Accept proposal
                            </button>
                            <button
                              disabled={!canRejectInbound}
                              onClick={() => onMarriageWorkflowRejectInbound?.(workflow, offer)}
                              title={onMarriageWorkflowRejectInbound ? "" : "Inbound action wiring is supplied by the current turn decision flow."}
                              type="button"
                            >
                              Reject proposals
                            </button>
                          </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div style={{ padding: 10, border: "1px solid #f0ede4", background: "#fffcf5" }}>
                  <div style={{ fontWeight: 700 }}>Outbound scouting & offer</div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>{workflow.outboundSummary}</div>
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    Search status: <b>{workflowStatusLabel(scoutStatus)}</b>.{" "}
                    {workflowStatusDetail(scoutStatus, "Ready to scout/search for outbound candidates.")}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <button
                      disabled={!canScout}
                      onClick={() => onMarriageWorkflowScout?.(workflow)}
                      title={onMarriageWorkflowScout ? "" : "Scouting/search uses the current turn decision flow when available."}
                      type="button"
                    >
                      Scout/search candidates
                    </button>
                    <button
                      disabled={!canClearScout}
                      onClick={() => onMarriageWorkflowClearScout?.(workflow)}
                      title={onMarriageWorkflowClearScout ? "" : "Scouting/search uses the current turn decision flow when available."}
                      type="button"
                    >
                      Clear search
                    </button>
                  </div>
                  {workflow.outboundFeaturedCandidate ? (
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                      Featured candidate:{" "}
                      {personCardIds?.has(workflow.outboundFeaturedCandidate.personId) && onOpenPersonCard ? (
                        <PersonCardTrigger
                          onOpenPersonCard={onOpenPersonCard}
                          personId={workflow.outboundFeaturedCandidate.personId}
                        >
                          {workflow.outboundFeaturedCandidate.title}
                        </PersonCardTrigger>
                      ) : (
                        workflow.outboundFeaturedCandidate.title
                      )}
                      {workflow.outboundFeaturedCandidate.houseLabel ? (
                        <>
                          {" "}from{" "}
                          {canOpenHouseDossier(workflow.outboundFeaturedCandidate.houseId) ? (
                            <HouseDossierTrigger
                              houseId={workflow.outboundFeaturedCandidate.houseId}
                              onOpenHouseDossier={onOpenHouseDossier!}
                            >
                              {workflow.outboundFeaturedCandidate.houseLabel}
                            </HouseDossierTrigger>
                          ) : (
                            workflow.outboundFeaturedCandidate.houseLabel
                          )}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  {workflow.outboundFeaturedCandidate?.detail ? (
                    <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                      {workflow.outboundFeaturedCandidate.detail}
                    </div>
                  ) : null}
                  {workflow.outboundFeaturedCandidate?.houseDetail ? (
                    <div style={{ marginTop: 2, fontSize: 12, opacity: 0.8 }}>
                      {workflow.outboundFeaturedCandidate.houseDetail}
                    </div>
                  ) : null}
                  {workflow.outboundSendOutcomeSummary ? (
                    <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                      Send outcome: {workflow.outboundSendOutcomeSummary}
                    </div>
                  ) : null}
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                    Terms: {workflow.outboundTermSummary}
                  </div>
                  {workflow.latestOfferSummary ? (
                    <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                      {workflow.latestOfferSummary}
                    </div>
                  ) : null}
                  <div
                    data-marriage-outbound-offer-form={workflow.workflowId}
                    style={{ marginTop: 10, padding: 10, border: "1px solid #eadfca", background: "#fffaf0" }}
                  >
                    <div style={{ fontWeight: 700 }}>Outbound offer construction</div>
                    <div style={{ marginTop: 4, fontSize: 12, opacity: 0.82 }}>
                      Offer terms stay read-only until the Social lane publishes the canonical submission contract.
                    </div>
                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", marginTop: 8 }}>
                      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                        Candidate
                        <input
                          readOnly
                          value={workflow.outboundFeaturedCandidate?.title ?? "No candidate selected"}
                        />
                      </label>
                      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                        Dowry/dower terms
                        <input readOnly value="Contract pending" />
                      </label>
                      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                        Relationship terms
                        <input readOnly value="Preview only" />
                      </label>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      Offer status: <b>{workflowStatusLabel(offerStatus)}</b>.{" "}
                      {workflowStatusDetail(offerStatus, workflowPendingContractTitle)}
                    </div>
                    <button
                      disabled={!canConstructOffer}
                      onClick={() => onMarriageWorkflowConstructOffer?.(workflow)}
                      style={{ marginTop: 8 }}
                      title={workflowPendingContractTitle}
                      type="button"
                    >
                      Construct outbound offer
                    </button>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>{workflow.helperText}</div>
                </div>
              </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {(() => {
        const anyVisibleExpired = visibleProspectsShown.some(
          (p) => typeof p?.expires_turn === "number" && reportTurnIndex > (p.expires_turn as number)
        );
        const showExpiredMsg = hasProspectExpiredThisTurn && !anyVisibleExpired;

        if (visibleProspectsTotalCount === 0) {
          if (unifiedMarriageWorkflowActive) {
            return legacyMarriageDemotionNotice;
          }

          return (
            <div style={{ opacity: 0.8 }}>
              {copy.prospectsEmpty_noneThisTurn}
              {showExpiredMsg ? <div style={{ marginTop: 6 }}>{copy.prospectExpiredThisTurnMessage}</div> : null}
            </div>
          );
        }

        if (visibleProspectsShownCount === 0) {
          if (unifiedMarriageWorkflowActive) {
            return (
              <>
                {legacyMarriageDemotionNotice}
                <div style={{ opacity: 0.8, marginTop: 10 }}>
                  {hiddenCount > 0 ? copy.prospectsEmpty_noneShown : copy.prospectsEmpty_noneAvailableYet}
                  {hiddenCount > 0 ? <div style={{ marginTop: 6 }}>{copy.prospectsEmpty_noneShownHelper}</div> : null}
                  {showExpiredMsg ? <div style={{ marginTop: 6 }}>{copy.prospectExpiredThisTurnMessage}</div> : null}
                </div>
              </>
            );
          }

          return (
            <div style={{ opacity: 0.8 }}>
              {hiddenCount > 0 ? copy.prospectsEmpty_noneShown : copy.prospectsEmpty_noneAvailableYet}
              {hiddenCount > 0 ? <div style={{ marginTop: 6 }}>{copy.prospectsEmpty_noneShownHelper}</div> : null}
              {showExpiredMsg ? <div style={{ marginTop: 6 }}>{copy.prospectExpiredThisTurnMessage}</div> : null}
            </div>
          );
        }

        return (
          <>
            {legacyMarriageDemotionNotice}
            {showExpiredMsg ? <div style={{ fontSize: 12, marginTop: 6 }}>{copy.prospectExpiredThisTurnMessage}</div> : null}

            {hiddenCount > 0 ? (
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
                {copy.prospectsShownHiddenSummary(visibleProspectsShownCount, visibleProspectsTotalCount, hiddenCount)}{" "}
                <span title={copy.prospectsHiddenTooltip}>ⓘ</span>
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {visibleProspectsShown.map((p, idx) => {
                const id = typeof p?.id === "string" ? p.id : `prospect_${idx}`;
                const t = typeof p?.type === "string" ? p.type : null;
                const typeLabel = prospectTypeLabel(t);

                const fromHouseId = typeof p?.from_house_id === "string" ? p.from_house_id : null;
                const fromHouse = houseLabel(fromHouseId);
                const partiesLine = fromHouse ? copy.prospectFromToLine(fromHouse) : null;

                const subjectId: string | null = typeof p?.subject_person_id === "string" ? p.subject_person_id : null;
                const subjectParentsLine: string | null = subjectId
                  ? formatParentsLine(subjectId, pfParentsByChild, pfPeopleRec, pfHouseLabelById, pfPersonHouseById)
                  : null;

                const subject =
                  personNameFromRegistry(subjectId) ??
                  (typeof p?.subject_person_name === "string" ? p.subject_person_name : null) ??
                  null;
                const subjectSecondary = subjectId ? buildPersonSecondaryIdentifier(previewState, subjectId) : null;
                const fromHouseSecondary = fromHouseId
                  ? buildHouseSecondaryIdentifier(previewState, fromHouseId, {
                      houseName: fromHouse
                    })
                  : null;

                const summary = typeof p?.summary === "string" ? p.summary : "";
                const reqs: any[] = Array.isArray(p?.requirements) ? p.requirements : [];
                const reqTexts: string[] = reqs.map((r) => (typeof r?.text === "string" ? r.text : "")).filter(Boolean);
                const costs = costsForProspect(p);
                const anyCost = costs.coin !== 0 || costs.energy !== 0 || costs.bushels !== 0;
                const eff = effectsSummary(p);
                const u = typeof p?.uncertainty === "string" ? p.uncertainty : null;
                const uLabel = uncertaintyLabel(u);

                const expiresTurn = typeof p?.expires_turn === "number" ? p.expires_turn : null;
                const expired = expiresTurn !== null && reportTurnIndex > expiresTurn;
                const decided = getProspectDecision(id);
                const allowedActions: any[] = Array.isArray(p?.actions) ? p.actions : [];
                const canAccept = !expired && !decided && (allowedActions.length === 0 || allowedActions.includes("accept"));
                const canReject = !expired && !decided && (allowedActions.length === 0 || allowedActions.includes("reject"));

                return (
                  <div key={id} style={{ padding: 10, border: "1px solid #eee", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <div style={{ fontWeight: 700 }}>{typeLabel}</div>
                      {expired ? (
                        <span style={{ fontSize: 12, border: "1px solid #ddd", padding: "2px 6px" }}>
                          {copy.prospectExpiredBadge}
                        </span>
                      ) : decided ? (
                        <span style={{ fontSize: 12, border: "1px solid #ddd", padding: "2px 6px" }}>
                          {decided === "accept" ? copy.prospectDecisionBadgeAccepted : copy.prospectDecisionBadgeRejected}
                        </span>
                      ) : null}
                    </div>

                    {partiesLine ? <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{partiesLine}</div> : null}
                    {subject ? (
                      <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                        {copy.prospectSubjectLabel}{" "}
                        {subjectId && personCardIds?.has(subjectId) && onOpenPersonCard ? (
                          <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={subjectId}>
                            {subject}
                          </PersonCardTrigger>
                        ) : (
                          subject
                        )}
                      </div>
                    ) : null}
                    {subjectSecondary ? (
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{subjectSecondary}</div>
                    ) : null}

                    {t === "marriage" && subjectParentsLine ? (
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Parents: {subjectParentsLine}</div>
                    ) : null}

                    {t === "marriage" ? (
                      (() => {
                        const spouseId: string | null =
                          typeof p?.spouse_person_id === "string"
                            ? p.spouse_person_id
                            : typeof p?.offer_person_id === "string"
                              ? p.offer_person_id
                              : typeof p?.offer_personId === "string"
                                ? p.offer_personId
                                : null;

                        const spouseRec: any = spouseId && people && typeof people === "object" ? people[spouseId] : null;
                        const spouseSex: string | null = spouseRec && typeof spouseRec === "object" ? spouseRec.sex : null;
                        const label = spouseSex === "F" ? "Bride" : spouseSex === "M" ? "Groom" : "Spouse";

                        const spouseName: string | null =
                          personNameFromRegistry(spouseId) ??
                          (typeof p?.spouse_name === "string" ? String(p.spouse_name) : null) ??
                          (typeof p?.other_person_name === "string" ? String(p.other_person_name) : null);

                        const spouseAgeFromRec: number | null =
                          spouseRec && typeof spouseRec === "object" && typeof spouseRec.age === "number" && Number.isFinite(spouseRec.age)
                            ? Math.trunc(spouseRec.age)
                            : null;

                        const spouseAge: number | null =
                          typeof p?.spouse_age === "number" && Number.isFinite(p.spouse_age)
                            ? Math.trunc(p.spouse_age)
                            : spouseAgeFromRec;

                        const spouseText: string | null = (() => {
                          if (!spouseName) return null;
                          if (spouseAge !== null && !spouseName.includes("Age")) return `${spouseName} (Age ${spouseAge})`;
                          return spouseName;
                        })();

                        const spouseParentsLine: string | null = spouseId
                          ? formatParentsLine(spouseId, pfParentsByChild, pfPeopleRec, pfHouseLabelById, pfPersonHouseById)
                          : null;
                        const spouseSecondary = spouseId
                          ? buildPersonSecondaryIdentifier(previewState, spouseId, {
                              age: spouseAge,
                              houseId: fromHouseId,
                              houseName: fromHouse
                            })
                          : null;

                        return spouseText ? (
                          <>
                            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                              {label}:{" "}
                              {spouseId && personCardIds?.has(spouseId) && onOpenPersonCard ? (
                                <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={spouseId}>
                                  {spouseText}
                                </PersonCardTrigger>
                              ) : (
                                spouseText
                              )}
                              {fromHouse ? ` — House ${fromHouse}` : ""}
                            </div>
                            {spouseSecondary ? (
                              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{spouseSecondary}</div>
                            ) : null}
                            {fromHouseSecondary ? (
                              <div style={{ fontSize: 12, opacity: 0.78, marginTop: 2 }}>{fromHouseSecondary}</div>
                            ) : null}
                            {spouseParentsLine ? (
                              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Parents: {spouseParentsLine}</div>
                            ) : null}
                          </>
                        ) : null;
                      })()
                    ) : null}

                    {summary ? <div style={{ marginTop: 6 }}>{summary}</div> : null}

                    {t === "grant" ? (
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>{grantTemplate.helperLine}</div>
                    ) : null}

                    {t === "grant" && canReject && rejectHasStandingRisk(p) ? (
                      <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>{grantTemplate.rejectRiskNote}</div>
                    ) : null}

                    {reqTexts.length > 0 ? (
                      <div style={{ marginTop: 10, fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <b>{copy.prospectRequirementsLabel}</b>
                          <Tip text={copy.prospectTooltip_requirements} />
                        </div>
                        <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                          {reqTexts.map((text, i) => (
                            <li key={i}>{text}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {anyCost ? (
                      <div style={{ marginTop: 10, fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <b>{copy.prospectCostsLabel}</b>
                          <Tip text={copy.prospectTooltip_costs} />
                        </div>
                        <div style={{ marginTop: 6, display: "grid", gap: 2 }}>
                          {costs.coin !== 0 ? <div>Coin: {costs.coin}</div> : null}
                          {costs.energy !== 0 ? <div>Energy: {costs.energy}</div> : null}
                          {costs.bushels !== 0 ? <div>Bushels: {costs.bushels}</div> : null}
                        </div>
                      </div>
                    ) : null}

                    {eff.coin !== undefined || eff.rel || eff.flags ? (
                      <div style={{ marginTop: 10, fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <b>{copy.prospectEffectsLabel}</b>
                        </div>
                        <div style={{ marginTop: 6, display: "grid", gap: 2 }}>
                          {typeof eff.coin === "number" ? <div>Coin: {fmtSigned(eff.coin)}</div> : null}
                          {eff.rel ? <div>Relationships: {eff.rel}</div> : null}
                          {eff.flags ? <div>Flags: {eff.flags}</div> : null}
                        </div>
                      </div>
                    ) : null}

                    {uLabel ? (
                      <div style={{ marginTop: 10, fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <b>{copy.prospectConfidenceLabel}</b> {uLabel}
                          <Tip text={copy.prospectTooltip_confidence} />
                        </div>
                      </div>
                    ) : null}

                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
                      {expired && expiresTurn !== null
                        ? copy.prospectExpiredAtEndOfTurn(expiresTurn)
                        : expiresTurn === reportTurnIndex
                          ? copy.prospectExpiresThisTurn
                          : expiresTurn !== null
                            ? copy.prospectExpiresEndOfTurn(expiresTurn)
                            : null}{" "}
                      <Tip text={copy.prospectTooltip_expiry} />
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button disabled={!canAccept} onClick={() => handleProspectAction(p, "accept")}>
                        {copy.prospectAccept}
                      </button>
                      <button disabled={!canReject} onClick={() => handleProspectAction(p, "reject")}>
                        {copy.prospectReject}
                      </button>
                    </div>

                    {expired ? (
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>{copy.prospectExpiredHint}</div>
                    ) : decided ? (
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>{copy.prospectDecisionRecorded}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <details style={{ marginTop: 10 }}>
              <summary>{copy.prospectsLogTitle}</summary>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                <div>{copy.prospectsLogShown(visibleProspectsShownCount, shownIds.length ? shownIds : undefined)}</div>
                <div>{copy.prospectsLogHidden(hiddenCount, hiddenIds.length ? hiddenIds : undefined)}</div>
                {hiddenCount > 0 ? <div style={{ marginTop: 6 }}>{copy.prospectsHiddenTooltip}</div> : null}

                {prospectLogLines.length > 0 ? (
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {Object.entries(
                      prospectLogLines.reduce((acc: Record<string, string[]>, it) => {
                        const key = String(it.turn_index);
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(it.line);
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .map(([turn, lines]) => (
                        <div key={turn}>
                          <div style={{ fontWeight: 700 }}>Turn {turn}</div>
                          <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                            {lines.map((line, i) => (
                              <li key={i}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            </details>
          </>
        );
      })()}
    </>
  );
}
