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
};

export function ObligationsSummaryCards({
  actionLabel = "Open detail sheet",
  helperText,
  onOpenDetails,
  sections
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
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>{section.shortTitle}</div>
                <div style={{ marginTop: 4, fontWeight: 700, color: PLAY_SCREEN_THEME.ink }}>{section.title}</div>
              </div>
              <button onClick={() => onOpenDetails(section.id)} style={PLAY_SCREEN_ACTION_BUTTON_STYLE} type="button">
                {actionLabel}
              </button>
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

            <div style={{ fontSize: 12, opacity: 0.8 }}>{section.helper}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
