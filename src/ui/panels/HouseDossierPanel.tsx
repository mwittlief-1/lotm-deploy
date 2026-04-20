import React, { useEffect, useState } from "react";

import type { HouseDossierSurface } from "../houseDossierView";
import {
  PLAY_SCREEN_ACTION_BUTTON_STYLE,
  PLAY_SCREEN_EYEBROW_STYLE,
  PLAY_SCREEN_SECONDARY_BUTTON_STYLE,
  PLAY_SCREEN_SUBCARD_STYLE,
  PLAY_SCREEN_THEME
} from "../playScreenTheme";
import { PersonCardTrigger } from "./PersonCardTrigger";

type HouseDossierTab = "player" | "debug";

type HouseDossierPanelProps = {
  initialTab?: HouseDossierTab;
  onOpenPersonCard?: (personId: string) => void;
  surface: HouseDossierSurface;
};

function tabButtonStyle(isActive: boolean): React.CSSProperties {
  return isActive ? PLAY_SCREEN_ACTION_BUTTON_STYLE : PLAY_SCREEN_SECONDARY_BUTTON_STYLE;
}

export function HouseDossierPanel({ initialTab = "player", onOpenPersonCard, surface }: HouseDossierPanelProps) {
  const [activeTab, setActiveTab] = useState<HouseDossierTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, surface.houseId]);

  return (
    <div data-house-dossier={surface.houseId} style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={PLAY_SCREEN_EYEBROW_STYLE}>House dossier</div>
          <h3 style={{ margin: "6px 0 0", fontSize: 28 }}>{surface.houseName}</h3>
          <div style={{ marginTop: 8, fontSize: 13, color: PLAY_SCREEN_THEME.inkMuted }}>{surface.subtitle}</div>
          <p style={{ margin: "10px 0 0", maxWidth: 760, color: PLAY_SCREEN_THEME.inkMuted, lineHeight: 1.55 }}>
            {surface.helperText}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setActiveTab("player")} style={tabButtonStyle(activeTab === "player")} type="button">
            Player tab
          </button>
          <button onClick={() => setActiveTab("debug")} style={tabButtonStyle(activeTab === "debug")} type="button">
            Debug tab
          </button>
        </div>
      </div>

      {activeTab === "player" ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
              <div style={PLAY_SCREEN_EYEBROW_STYLE}>Standing</div>
              <div style={{ marginTop: 8, fontSize: 21, fontWeight: 700 }}>{surface.tierLabel}</div>
              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>
                Knownness: {surface.knownnessLabel}
                <br />
                Relevance: {surface.relevanceTierLabel}
                <br />
                {surface.knownnessHelperText}
              </div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
              <div style={PLAY_SCREEN_EYEBROW_STYLE}>Standing posture</div>
              <div style={{ marginTop: 8, fontSize: 21, fontWeight: 700 }}>{surface.relationshipPostureLabel}</div>
              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>
                {surface.relationshipSummary ? (
                  <>
                    A {surface.relationshipSummary.allegiance} / R {surface.relationshipSummary.respect} / T {surface.relationshipSummary.threat}
                    <br />
                    Favor {surface.relationshipSummary.favorScore} ({surface.relationshipSummary.standingBandLabel})
                  </>
                ) : (
                  "No relationship vector is available in this dossier."
                )}
              </div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
              <div style={PLAY_SCREEN_EYEBROW_STYLE}>Turn movement</div>
              <div style={{ marginTop: 8, fontSize: 21, fontWeight: 700 }}>{surface.relationshipMovementCount} changes</div>
              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>
                {surface.relationshipMovementHelperText}
              </div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
              <div style={PLAY_SCREEN_EYEBROW_STYLE}>Household</div>
              <div style={{ marginTop: 8, fontSize: 21, fontWeight: 700 }}>{surface.householdMemberCount} members</div>
              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>
                Living: {surface.householdLivingCount}
                <br />
                Children: {surface.householdChildCount}
                <br />
                Scope: {surface.householdScopeLabel}
              </div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
              <div style={PLAY_SCREEN_EYEBROW_STYLE}>Holdings</div>
              <div style={{ marginTop: 8, fontSize: 21, fontWeight: 700 }}>{surface.holdingsCount} holdings</div>
              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>
                Band: {surface.holdingsBandLabel}
                <br />
                Source: {surface.holdingsSourceLabel}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {surface.relatedPeople.length > 0 ? (
              <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>Known people</div>
                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  {surface.relatedPeople.map((person) => (
                    <div key={person.personId} style={{ display: "grid", gap: 4 }}>
                      {onOpenPersonCard ? (
                        <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={person.personId}>
                          {person.title}
                        </PersonCardTrigger>
                      ) : (
                        <div style={{ fontWeight: 700 }}>{person.title}</div>
                      )}
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>{person.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
              <div style={PLAY_SCREEN_EYEBROW_STYLE}>Kinship & Reasons</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>{surface.kinshipSummaryLabel}</div>
              <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>
                Kinship tags: {surface.kinshipTags.length > 0 ? surface.kinshipTags.join(", ") : "None"}
                <br />
                Knownness sources: {surface.knownnessSources.length > 0 ? surface.knownnessSources.join(", ") : "None"}
                <br />
                Relevance reasons: {surface.relevanceReasons.length > 0 ? surface.relevanceReasons.join(", ") : "None"}
              </div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
              <div style={PLAY_SCREEN_EYEBROW_STYLE}>Ledger Posture</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>
                {surface.ledgerBandLabel} / {surface.ledgerTrendLabel}
              </div>
              <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>
                {surface.successionLabel}
              </div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
              <div style={PLAY_SCREEN_EYEBROW_STYLE}>Known Manor Footprint</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>{surface.holdingsAnchorManorId ?? "No anchor manor recorded"}</div>
              <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>
                {surface.holdingsKnownManorIds.length > 0
                  ? surface.holdingsKnownManorIds.join(", ")
                  : "No known manor ids are exposed on this dossier."}
                <br />
                {surface.holdingsFootprintHelperText}
              </div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
              <div style={PLAY_SCREEN_EYEBROW_STYLE}>Relationship movement</div>
              {surface.relationshipMovementRows.length > 0 ? (
                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  {surface.relationshipMovementRows.map((row) => (
                    <div key={row.id} style={{ display: "grid", gap: 4 }}>
                      {row.personId && onOpenPersonCard ? (
                        <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={row.personId}>
                          {row.title}
                        </PersonCardTrigger>
                      ) : (
                        <div style={{ fontWeight: 700 }}>{row.title}</div>
                      )}
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>
                        {row.directionLabel}
                        <br />
                        {row.detail}
                        <br />
                        {row.causeLabel} ({row.postureShiftLabel})
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 13, color: PLAY_SCREEN_THEME.inkMuted }}>
                  No turn-movement rows are recorded on this bounded dossier.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
            <div>
              <div style={PLAY_SCREEN_EYEBROW_STYLE}>Debug table</div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>Deterministic dossier field order</div>
            </div>
            <div style={{ fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted }}>{surface.schemaVersion}</div>
          </div>
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>
                    Field
                  </th>
                  <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {surface.debugRows.map((row) => (
                  <tr key={row.key}>
                    <td
                      style={{
                        borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                        padding: "8px 0",
                        fontFamily: PLAY_SCREEN_THEME.bodyFont
                      }}
                    >
                      {row.label}
                    </td>
                    <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
