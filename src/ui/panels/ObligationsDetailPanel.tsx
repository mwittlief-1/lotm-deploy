import React from "react";

import type {
  ObligationsCounterpartyContractSection,
  ObligationsModalFocus
} from "../playScreenObligations";
import {
  PLAY_SCREEN_ACTION_BUTTON_STYLE,
  PLAY_SCREEN_SECONDARY_BUTTON_STYLE,
  PLAY_SCREEN_SUBCARD_STYLE,
  PLAY_SCREEN_THEME
} from "../playScreenTheme";

type ObligationsDetailPanelProps = {
  allSections: ObligationsCounterpartyContractSection[];
  focus: ObligationsModalFocus;
  onFocusChange: (focus: ObligationsModalFocus) => void;
  onJumpToDecisions: () => void;
  sections: ObligationsCounterpartyContractSection[];
};

function receiptLabel(category: string): string {
  if (category === "coin") return "coin";
  if (category === "food") return "food";
  return "unrest";
}

export function ObligationsDetailPanel({
  allSections,
  focus,
  onFocusChange,
  onJumpToDecisions,
  sections
}: ObligationsDetailPanelProps) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          aria-pressed={focus === "overview"}
          onClick={() => onFocusChange("overview")}
          style={focus === "overview" ? PLAY_SCREEN_ACTION_BUTTON_STYLE : PLAY_SCREEN_SECONDARY_BUTTON_STYLE}
          type="button"
        >
          All counterparties
        </button>
        {allSections.map((section) => (
          <button
            aria-pressed={focus === section.id}
            key={section.id}
            onClick={() => onFocusChange(section.id)}
            style={focus === section.id ? PLAY_SCREEN_ACTION_BUTTON_STYLE : PLAY_SCREEN_SECONDARY_BUTTON_STYLE}
            type="button"
          >
            {section.shortTitle}
          </button>
        ))}
      </div>

      {sections.map((section) => (
        <section
          data-obligations-detail={section.id}
          key={section.id}
          style={{
            ...PLAY_SCREEN_SUBCARD_STYLE,
            padding: 14,
            display: "grid",
            gap: 12,
            color: PLAY_SCREEN_THEME.ink
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>{section.shortTitle}</div>
              <h4 style={{ margin: "6px 0 0", fontSize: 22 }}>{section.title}</h4>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{section.helper}</div>
            </div>
            <button onClick={onJumpToDecisions} style={PLAY_SCREEN_ACTION_BUTTON_STYLE} type="button">
              Jump to Decisions
            </button>
          </div>

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, background: "#fdfbf7" }}>
              <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>{section.dueGroup.title}</div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700 }}>{section.dueGroup.amountLabel}</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{section.dueGroup.summary}</div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, background: "#fdfbf7" }}>
              <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>{section.penaltyGroup.title}</div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700 }}>{section.penaltyGroup.amountLabel}</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                Carried this turn: {section.penaltyGroup.carriedThisTurn ? "Yes" : "No"}.
              </div>
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>{section.penaltyGroup.enforcementSummary}</div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, background: "#fdfbf7" }}>
              <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>{section.gestureGroup.title}</div>
              <div style={{ marginTop: 4, fontSize: 16, fontWeight: 700 }}>
                {section.gestureGroup.cost === null ? "Not budgeted" : `Cost ${section.gestureGroup.cost}`}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{section.gestureGroup.detail}</div>
              {section.gestureGroup.spent !== null ? (
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>Used this turn: {section.gestureGroup.spent}</div>
              ) : null}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>Receipt alignment</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {section.receiptCategoryOrder.map((category) => (
                <span
                  key={`${section.id}_${category}`}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(172, 143, 100, 0.32)",
                    background: "#fffaf1",
                    fontSize: 12
                  }}
                >
                  {receiptLabel(category)} receipts
                </span>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
