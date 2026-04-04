import React from "react";

import type { ObligationsCounterpartyContractSection, ObligationsModalFocus } from "../playScreenObligations";
import {
  PLAY_SCREEN_ACTION_BUTTON_STYLE,
  PLAY_SCREEN_SUBCARD_STYLE,
  PLAY_SCREEN_THEME
} from "../playScreenTheme";

type ObligationsSummaryCardsProps = {
  actionLabel?: string;
  helperText?: string;
  onOpenDetails: (focus: ObligationsModalFocus) => void;
  sections: ObligationsCounterpartyContractSection[];
  surface: "turn_report" | "decisions";
};

function stagePillStyle(state: ObligationsCounterpartyContractSection["penaltyGroup"]["enforcementState"]): React.CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    border: state === "arrears" ? "1px solid rgba(133, 67, 48, 0.28)" : "1px solid rgba(91, 112, 68, 0.24)",
    background: state === "arrears" ? "rgba(159, 92, 65, 0.12)" : "rgba(141, 168, 118, 0.14)",
    color: state === "arrears" ? "#854330" : "#4f633b"
  };
}

export function ObligationsSummaryCards({
  actionLabel = "Open detail sheet",
  helperText,
  onOpenDetails,
  sections,
  surface
}: ObligationsSummaryCardsProps) {
  if (sections.length === 0) return null;

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      {helperText ? <div style={{ fontSize: 12, opacity: 0.8 }}>{helperText}</div> : null}

      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {sections.map((section) => (
          <div
            data-obligations-summary={section.id}
            key={section.id}
            style={{
              ...PLAY_SCREEN_SUBCARD_STYLE,
              padding: 12,
              display: "grid",
              gap: 8
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>{section.shortTitle}</div>
                <div style={{ marginTop: 4, fontWeight: 700, color: PLAY_SCREEN_THEME.ink }}>{section.title}</div>
              </div>
              <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
                <span style={stagePillStyle(section.penaltyGroup.enforcementState)}>{section.penaltyGroup.stageLabel}</span>
                <button onClick={() => onOpenDetails(section.id)} style={PLAY_SCREEN_ACTION_BUTTON_STYLE} type="button">
                  {actionLabel}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
              <div>
                <b>Due now:</b> {section.dueGroup.amountLabel}
              </div>
              <div>
                <b>Overdue:</b> {section.penaltyGroup.amountLabel}
              </div>
              <div>
                <b>Carried arrears:</b> {section.penaltyGroup.carriedThisTurn ? "Yes" : "No"}
              </div>
            </div>

            <div
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                background: "#fdf8ef",
                border: "1px solid rgba(172, 143, 100, 0.22)",
                fontSize: 12,
                lineHeight: 1.45
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>
                {surface === "turn_report" ? "This turn" : "Next turn"}
              </div>
              <div style={{ marginTop: 4 }}>
                {surface === "turn_report" ? section.penaltyGroup.resolvedSummary : section.penaltyGroup.responseSummary}
              </div>
            </div>

            <div style={{ fontSize: 12, opacity: 0.8 }}>{section.penaltyGroup.enforcementSummary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
