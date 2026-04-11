import React from "react";
import { getGrantProspectTemplate } from "../../content/experienceContent";
import type { RunState } from "../../sim/types";
import { Tip, formatParentsLine } from "../viewHelpers";
import { PersonCardTrigger } from "./PersonCardTrigger";

type ProspectDecision = "accept" | "reject" | null;
type ProspectLogLine = { turn_index: number; line: string };

type ProspectsPanelProps = {
  anchorId: string;
  copy: any;
  costsForProspect: (prospect: any) => { coin: number; energy: number; bushels: number };
  effectsSummary: (prospect: any) => { coin?: number; rel?: string | null; flags?: string | null };
  fmtSigned: (value: number) => string;
  getProspectDecision: (id: string) => ProspectDecision;
  handleProspectAction: (prospect: any, action: "accept" | "reject") => void;
  hasProspectExpiredThisTurn: boolean;
  hiddenIds: string[];
  hiddenCount: number;
  houseLabel: (houseId: string | null | undefined) => string;
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

export function ProspectsPanel({
  anchorId,
  copy,
  costsForProspect,
  effectsSummary,
  fmtSigned,
  getProspectDecision,
  handleProspectAction,
  hasProspectExpiredThisTurn,
  hiddenIds,
  hiddenCount,
  houseLabel,
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

  return (
    <>
      <h4 id={anchorId} style={{ marginTop: 12 }}>{copy.prospects}</h4>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{copy.prospectsHelper}</div>

      {(() => {
        const anyVisibleExpired = prospectsShown.some(
          (p) => typeof p?.expires_turn === "number" && reportTurnIndex > (p.expires_turn as number)
        );
        const showExpiredMsg = hasProspectExpiredThisTurn && !anyVisibleExpired;

        if (prospectsTotalCount === 0) {
          return (
            <div style={{ opacity: 0.8 }}>
              {copy.prospectsEmpty_noneThisTurn}
              {showExpiredMsg ? <div style={{ marginTop: 6 }}>{copy.prospectExpiredThisTurnMessage}</div> : null}
            </div>
          );
        }

        if (prospectsShownCount === 0) {
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
            {showExpiredMsg ? <div style={{ fontSize: 12, marginTop: 6 }}>{copy.prospectExpiredThisTurnMessage}</div> : null}

            {hiddenCount > 0 ? (
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
                {copy.prospectsShownHiddenSummary(prospectsShownCount, prospectsTotalCount, hiddenCount)}{" "}
                <span title={copy.prospectsHiddenTooltip}>ⓘ</span>
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {prospectsShown.map((p, idx) => {
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
                <div>{copy.prospectsLogShown(prospectsShownCount, shownIds.length ? shownIds : undefined)}</div>
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
