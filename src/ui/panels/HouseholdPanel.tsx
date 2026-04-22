import React from "react";
import type { RunState } from "../../sim/types";
import { buildCourtProvisioningSurface } from "../courtProvisioningView";
import { buildDynasticTransitionSurface } from "../dynasticTransitionSummary";
import { buildHouseholdPresenceSurface } from "../householdPresenceView";
import { findLastSuccession, getPlayerHousehold } from "../stateSelectors";
import { formatPersonName, Tip } from "../viewHelpers";
import { PersonCardTrigger } from "./PersonCardTrigger";

type HouseholdPanelProps = {
  anchorId: string;
  copy: any;
  courtSize: number | null;
  currentHouseLog?: any[];
  onOpenPersonCard?: (personId: string) => void;
  personCardIds?: Set<string>;
  previewState: RunState;
  report?: unknown;
  state: RunState;
  showDetails: boolean;
  onToggleDetails: () => void;
};

export function HouseholdPanel({
  anchorId,
  copy,
  courtSize,
  currentHouseLog = [],
  onOpenPersonCard,
  personCardIds,
  previewState,
  report,
  state,
  showDetails,
  onToggleDetails
}: HouseholdPanelProps) {
  const household = getPlayerHousehold(previewState);
  const lastSuccession = findLastSuccession(state);
  const householdPresenceSurface = buildHouseholdPresenceSurface(previewState);
  const courtProvisioningSurface = buildCourtProvisioningSurface(previewState, { report });
  const dynasticTransitionSurface = buildDynasticTransitionSurface({
    currentHouseLog,
    previewState,
    report
  });

  return (
    <>
      <h4 id={anchorId}>{copy.household}</h4>
      <div style={{ padding: 10, border: "1px solid #eee", background: "#fff", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <div>
            <div style={{ fontWeight: 700 }}>
              {household.head?.id && personCardIds?.has(household.head.id) && onOpenPersonCard ? (
                <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={household.head.id}>
                  {formatPersonName(household.head)}
                </PersonCardTrigger>
              ) : (
                formatPersonName(household.head)
              )}
            </div>
          </div>
          <button onClick={onToggleDetails} style={{ fontSize: 12 }}>
            {showDetails ? copy.hideHouseholdDetails : copy.showHouseholdDetails}
          </button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
          <div>
            <b>{copy.heirLabel}</b>{" "}
            {household.heir_id
              ? (() => {
                  const heir = household.children.find((c: any) => c.id === household.heir_id)
                    ?? (previewState as any)?.people?.[household.heir_id]
                    ?? null;
                  return heir ? (
                    personCardIds?.has(household.heir_id) && onOpenPersonCard ? (
                      <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={household.heir_id}>
                        {formatPersonName(heir)}
                      </PersonCardTrigger>
                    ) : (
                      formatPersonName(heir)
                    )
                  ) : copy.none;
                })()
              : copy.none}
          </div>
          <div>
            <b>{copy.spouseLabel}</b>{" "}
            {household.spouse ? (
              household.spouse.id && personCardIds?.has(household.spouse.id) && onOpenPersonCard ? (
                <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={household.spouse.id}>
                  {formatPersonName(household.spouse)}
                </PersonCardTrigger>
              ) : (
                formatPersonName(household.spouse)
              )
            ) : copy.none}
          </div>
          <div>
            <b>{copy.childrenLabel}</b>{" "}
            {household.children.length ? household.children.length : copy.none}
          </div>
          <div>
            <b>{copy.courtSizeLabel}</b> {courtSize !== null ? courtSize : "(Not available in this build)"} <Tip text={copy.tooltipCourtSize} />
          </div>
          <div style={{ gridColumn: "1 / -1", fontSize: 12, opacity: 0.9 }}>
            {lastSuccession
              ? `${copy.lastSuccessionLabel} Turn ${lastSuccession.turn_index} — ${copy.logOutcome_succession(lastSuccession.new_ruler_name)}`
              : copy.lastSuccessionNone}
          </div>
        </div>

        {householdPresenceSurface ? (
          <div
            data-household-presence={householdPresenceSurface.schemaVersion}
            style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 10 }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Presence at court</div>
            <div style={{ fontSize: 12, opacity: 0.82, marginBottom: 8 }}>{householdPresenceSurface.helperText}</div>
            {householdPresenceSurface.recentSuccessionSummary ? (
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
                {householdPresenceSurface.recentSuccessionSummary}
              </div>
            ) : null}
            <ul style={{ margin: "0 0 0 18px" }}>
              {householdPresenceSurface.entries.map((entry) => (
                <li key={entry.personId} style={{ marginBottom: 6 }}>
                  <div>
                    {personCardIds?.has(entry.personId) && onOpenPersonCard ? (
                      <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={entry.personId}>
                        {entry.personName}
                      </PersonCardTrigger>
                    ) : (
                      entry.personName
                    )}{" "}
                    <span style={{ fontSize: 12, opacity: 0.8 }}>({entry.presenceLabel})</span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{entry.reason}</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{entry.detail}</div>
                  {entry.turnoverNote ? (
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{entry.turnoverNote}</div>
                  ) : null}
                  {entry.successionNote ? (
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{entry.successionNote}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {dynasticTransitionSurface ? (
          <div
            data-dynastic-transition-summary="dynastic_transition_summary_v1"
            style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 10 }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Dynastic transitions</div>
            <div style={{ fontSize: 12, opacity: 0.82 }}>{dynasticTransitionSurface.headline}</div>
            <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>{dynasticTransitionSurface.helperText}</div>
            <ul style={{ margin: "8px 0 0 18px" }}>
              {dynasticTransitionSurface.items.map((item) => (
                <li key={item} style={{ marginBottom: 4, fontSize: 12, opacity: 0.88 }}>
                  {item}
                </li>
              ))}
            </ul>
            {dynasticTransitionSurface.omittedNote ? (
              <div style={{ fontSize: 12, opacity: 0.74, marginTop: 6 }}>{dynasticTransitionSurface.omittedNote}</div>
            ) : null}
          </div>
        ) : null}

        {courtProvisioningSurface?.householdRows.length ? (
          <div
            data-household-consumption-provisioning="court_provisioning_view_v1"
            style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 10 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700 }}>Household consumption & provisioning</div>
                <div style={{ fontSize: 12, opacity: 0.82, marginTop: 2 }}>
                  Detailed rations are restored here from the accepted provisioning read model. {courtProvisioningSurface.rationingDecision.label}.
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.72 }}>{courtProvisioningSurface.householdRows.length} rows</div>
            </div>
            <div style={{ overflowX: "auto", marginTop: 10 }}>
              {courtProvisioningSurface.consumptionAudit ? (
                <div
                  data-household-consumption-ledger-audit={courtProvisioningSurface.consumptionAudit.statusLabel}
                  style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82, marginBottom: 10 }}
                >
                  {courtProvisioningSurface.consumptionAudit.summary} {courtProvisioningSurface.consumptionAudit.statusLabel}.
                </div>
              ) : null}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: "1px solid #eee", paddingBottom: 6 }}>Person</th>
                    <th align="left" style={{ borderBottom: "1px solid #eee", paddingBottom: 6 }}>Class</th>
                    <th align="left" style={{ borderBottom: "1px solid #eee", paddingBottom: 6 }}>Ration</th>
                    <th align="left" style={{ borderBottom: "1px solid #eee", paddingBottom: 6 }}>Requested</th>
                    <th align="left" style={{ borderBottom: "1px solid #eee", paddingBottom: 6 }}>Allocated</th>
                    <th align="left" style={{ borderBottom: "1px solid #eee", paddingBottom: 6 }}>Shortfall</th>
                    <th align="left" style={{ borderBottom: "1px solid #eee", paddingBottom: 6 }}>Support</th>
                  </tr>
                </thead>
                <tbody>
                  {courtProvisioningSurface.householdRows.map((row) => (
                    <tr key={row.personId}>
                      <td style={{ borderBottom: "1px solid #f3f3f3", padding: "7px 0" }}>
                        <div style={{ fontWeight: 700 }}>
                          {personCardIds?.has(row.personId) && onOpenPersonCard ? (
                            <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={row.personId}>
                              {row.personName}
                            </PersonCardTrigger>
                          ) : (
                            row.personName
                          )}
                        </div>
                        <div style={{ marginTop: 2, opacity: 0.72 }}>{row.roleSummary}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid #f3f3f3", padding: "7px 0" }}>
                        {row.provisioningClassLabel}
                        <div style={{ marginTop: 2, opacity: 0.72 }}>{row.lodgingLevelLabel}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid #f3f3f3", padding: "7px 0" }}>
                        {row.rationLevelLabel}
                        <div style={{ marginTop: 2, opacity: 0.72 }}>{row.statusLabel}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid #f3f3f3", padding: "7px 0" }}>{row.requestLabel}</td>
                      <td style={{ borderBottom: "1px solid #f3f3f3", padding: "7px 0" }}>{row.allocatedLabel}</td>
                      <td style={{ borderBottom: "1px solid #f3f3f3", padding: "7px 0" }}>{row.shortfallLabel}</td>
                      <td style={{ borderBottom: "1px solid #f3f3f3", padding: "7px 0" }}>
                        {row.supportLabel}
                        <div style={{ marginTop: 2, opacity: 0.72 }}>{row.carryForwardLabel}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 12, opacity: 0.78, marginTop: 8 }}>{courtProvisioningSurface.rationingDecision.detail}</div>
          </div>
        ) : null}
      </div>
    </>
  );
}
