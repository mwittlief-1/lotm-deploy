import React from "react";
import type { RunState } from "../../sim/types";
import { buildHouseholdPresenceSurface } from "../householdPresenceView";
import { findLastSuccession, getPlayerHousehold } from "../stateSelectors";
import { formatPersonName, Tip } from "../viewHelpers";
import { PersonCardTrigger } from "./PersonCardTrigger";

type HouseholdPanelProps = {
  anchorId: string;
  copy: any;
  courtSize: number | null;
  onOpenPersonCard?: (personId: string) => void;
  personCardIds?: Set<string>;
  previewState: RunState;
  state: RunState;
  showDetails: boolean;
  onToggleDetails: () => void;
};

export function HouseholdPanel({
  anchorId,
  copy,
  courtSize,
  onOpenPersonCard,
  personCardIds,
  previewState,
  state,
  showDetails,
  onToggleDetails
}: HouseholdPanelProps) {
  const household = getPlayerHousehold(previewState);
  const lastSuccession = findLastSuccession(state);
  const householdPresenceSurface = buildHouseholdPresenceSurface(previewState);

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
      </div>
    </>
  );
}
