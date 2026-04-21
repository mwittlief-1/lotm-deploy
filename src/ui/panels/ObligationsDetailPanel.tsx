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

function ladderStatusStyle(statusLabel: string): React.CSSProperties {
  const normalized = statusLabel.toLowerCase();
  const isActive = normalized.includes("active") || normalized.includes("current");
  const isArmed = normalized.includes("armed");

  return {
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    border: isActive
      ? "1px solid rgba(133, 67, 48, 0.28)"
      : isArmed
        ? "1px solid rgba(116, 84, 47, 0.28)"
        : "1px solid rgba(91, 112, 68, 0.24)",
    background: isActive
      ? "rgba(159, 92, 65, 0.12)"
      : isArmed
        ? "rgba(172, 143, 100, 0.18)"
        : "rgba(141, 168, 118, 0.14)",
    color: isActive ? "#854330" : isArmed ? PLAY_SCREEN_THEME.accent : "#4f633b"
  };
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
            <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
              <span style={stagePillStyle(section.penaltyGroup.enforcementState)}>{section.penaltyGroup.stageLabel}</span>
              <button onClick={onJumpToDecisions} style={PLAY_SCREEN_ACTION_BUTTON_STYLE} type="button">
                Jump to Decisions
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            {section.detailFacts.map((fact) => (
              <div key={`${section.id}_detail_${fact.label}`} style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, background: "#fdfbf7" }}>
                <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>{fact.label}</div>
                <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>{fact.value}</div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{fact.detail}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, background: "#fdfbf7" }}>
              <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>{section.dueGroup.title}</div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700 }}>{section.dueGroup.amountLabel}</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{section.dueGroup.summary}</div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, background: "#fdfbf7" }}>
              <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>Arrears stage</div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700 }}>{section.penaltyGroup.stageLabel}</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                <b>Overdue:</b> {section.penaltyGroup.amountLabel}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
                Carried this turn: {section.penaltyGroup.carriedThisTurn ? "Yes" : "No"}.
              </div>
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>{section.penaltyGroup.enforcementSummary}</div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, background: "#fdfbf7" }}>
              <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>Timing</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                <b>This turn:</b> {section.penaltyGroup.resolvedSummary.replace(/^This turn:\s*/u, "")}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                <b>Next turn:</b> {section.penaltyGroup.responseSummary.replace(/^Next turn:\s*/u, "")}
              </div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, background: "#fdfbf7" }}>
              <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>Relationship lever</div>
              <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>{section.gestureGroup.title}</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{section.gestureGroup.leverSummary}</div>
              <div style={{ marginTop: 4, fontSize: 16, fontWeight: 700 }}>
                {section.gestureGroup.cost === null ? "Not budgeted" : `Cost ${section.gestureGroup.cost}`}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{section.gestureGroup.detail}</div>
              {section.gestureGroup.spent !== null ? (
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>Used this turn: {section.gestureGroup.spent}</div>
              ) : null}
            </div>
          </div>

          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12, background: "#fcfaf5" }}>
            <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>Consequences from v2 obligations</div>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginTop: 10 }}>
              {section.consequenceFacts.map((fact) => (
                <div key={`${section.id}_consequence_${fact.label}`} style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, background: "#fff" }}>
                  <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>{fact.label}</div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>{fact.value}</div>
                  <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>{fact.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, background: "#fdfbf7" }}>
              <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>Payment modes</div>
              <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
                <b>Preferred:</b> {section.paymentModes.preferredLabel}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
                <b>Accepted:</b> {section.paymentModes.acceptedLabels.join(", ") || "None"}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
                <b>Supported now:</b> {section.paymentModes.supportedLabels.join(", ") || "None"}
              </div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, background: "#fdfbf7" }}>
              <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>Terminal risk</div>
              <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>{section.terminalRisk.statusLabel}</div>
              <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>{section.terminalRisk.summary}</div>
              <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>{section.terminalRisk.boundaryLabel}</div>
            </div>

            {section.tangibleBitePreview ? (
              <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, background: "#fdfbf7" }}>
                <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>Tangible bite preview</div>
                <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>{section.tangibleBitePreview.categoryLabel}</div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>{section.tangibleBitePreview.summary}</div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
                  Mode {section.tangibleBitePreview.paymentModeLabel} · Preview {section.tangibleBitePreview.previewAmountLabel}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>{section.tangibleBitePreview.turnCapLabel}</div>
              </div>
            ) : null}
          </div>

          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12, background: "#fcfaf5" }}>
            <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>Enforcement ladder</div>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {section.stageRows.map((row) => (
                <div
                  key={`${section.id}_${row.id}`}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(172, 143, 100, 0.24)",
                    background: "#fff"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>{row.title}</div>
                    <span style={ladderStatusStyle(row.statusLabel)}>{row.statusLabel}</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>{row.detail}</div>
                  <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>{row.boundaryLabel}</div>
                </div>
              ))}
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

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.66, textTransform: "uppercase" }}>Receipt groups</div>
            {section.receiptGroups.map((group) => (
              <div
                key={`${section.id}_${group.id}`}
                style={{
                  ...PLAY_SCREEN_SUBCARD_STYLE,
                  padding: 12,
                  background: "#fdfbf7"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700 }}>{group.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.72 }}>{group.receiptCount} rows</div>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
                  Category order: {group.categoryOrder.join(", ") || "None"}
                </div>
                {group.rows.length > 0 ? (
                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    {group.rows.map((row) => (
                      <div
                        key={row.id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(172, 143, 100, 0.24)",
                          background: "#fff"
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{row.summary}</div>
                        <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
                          {row.category} · {row.assetLabel} {row.deltaLabel} · Balance {row.balanceAfterLabel}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.45, opacity: 0.72 }}>Rule {row.ruleLabel}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72 }}>
                    No rows landed in this group for the current snapshot.
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
