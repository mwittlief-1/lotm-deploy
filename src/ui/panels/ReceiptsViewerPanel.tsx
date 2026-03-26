import React from "react";

import type {
  GroupedReceiptSection,
  RawReceiptPhase,
  ReceiptViewerMode
} from "../playScreenReceipts";
import {
  PLAY_SCREEN_ACTION_BUTTON_STYLE,
  PLAY_SCREEN_SECONDARY_BUTTON_STYLE,
  PLAY_SCREEN_SUBCARD_STYLE,
  PLAY_SCREEN_THEME
} from "../playScreenTheme";

type ReceiptsViewerPanelProps = {
  groupedSections: GroupedReceiptSection[];
  mode: ReceiptViewerMode;
  onModeChange: (mode: ReceiptViewerMode) => void;
  rawPhases: RawReceiptPhase[];
};

const SOURCE_TONE_STYLE: Record<string, React.CSSProperties> = {
  decision: {
    border: "1px solid #d2c4a5",
    background: "#fff6df"
  },
  event: {
    border: "1px solid #c9d7e8",
    background: "#f2f7fc"
  },
  system_pressure: {
    border: "1px solid #d7d0c2",
    background: "#f8f4eb"
  },
  prospect: {
    border: "1px solid #d8c6dc",
    background: "#faf0fd"
  }
};

function modeButtonStyle(active: boolean): React.CSSProperties {
  return {
    ...(active ? PLAY_SCREEN_ACTION_BUTTON_STYLE : PLAY_SCREEN_SECONDARY_BUTTON_STYLE),
    fontWeight: active ? 700 : 500
  };
}

export function ReceiptsViewerPanel({
  groupedSections,
  mode,
  onModeChange,
  rawPhases
}: ReceiptsViewerPanelProps) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button aria-pressed={mode === "grouped"} onClick={() => onModeChange("grouped")} style={modeButtonStyle(mode === "grouped")} type="button">
          Grouped
        </button>
        <button aria-pressed={mode === "raw"} onClick={() => onModeChange("raw")} style={modeButtonStyle(mode === "raw")} type="button">
          Raw receipts
        </button>
      </div>

      {mode === "grouped" ? (
        <div style={{ display: "grid", gap: 12 }}>
          {groupedSections.map((section) => (
            <section
              data-receipts-section={section.id}
              key={section.id}
              style={{
                padding: 14,
                borderRadius: 14,
                color: PLAY_SCREEN_THEME.ink,
                ...PLAY_SCREEN_SUBCARD_STYLE
              }}
            >
              <div style={{ fontWeight: 700 }}>{section.title}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{section.helper}</div>

              {section.highlights.length ? (
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  {section.highlights.map((highlight) => (
                    <div
                      key={highlight.id}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        background: "#fcfaf5",
                        border: "1px solid rgba(172, 143, 100, 0.24)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 700 }}>{highlight.primary}</div>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                            ...SOURCE_TONE_STYLE[highlight.source]
                          }}
                        >
                          {highlight.source.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.82, marginTop: 6 }}>{highlight.why}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              {section.receipts.length ? (
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  {section.receipts.map((receipt) => (
                    <div
                      data-receipt-line={receipt.id}
                      key={receipt.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(172, 143, 100, 0.24)",
                        background: "#fdfbf7"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 600 }}>{receipt.line}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                          {receipt.phaseLabel} · {receipt.kind}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 12, fontSize: 12, opacity: 0.72 }}>
                  No extra receipt lines matched this focus. The headline summary above is still the primary explanation.
                </div>
              )}
            </section>
          ))}
        </div>
      ) : rawPhases.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {rawPhases.map((phase) => (
            <section
              data-receipts-phase={phase.phase}
              key={phase.phase}
              style={{
                padding: 14,
                borderRadius: 14,
                color: PLAY_SCREEN_THEME.ink,
                ...PLAY_SCREEN_SUBCARD_STYLE
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700 }}>{phase.label}</div>
                <div style={{ fontSize: 12, opacity: 0.74 }}>{phase.receipts.length} receipt line{phase.receipts.length === 1 ? "" : "s"}</div>
              </div>

              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {phase.receipts.map((receipt) => (
                  <div
                    data-receipt-line={receipt.id}
                    key={receipt.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(172, 143, 100, 0.24)",
                      background: "#fdfbf7"
                    }}
                  >
                    <div style={{ fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", opacity: 0.65 }}>{receipt.kind}</div>
                    <div style={{ marginTop: 4 }}>{receipt.line}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
          No raw receipt lines matched this focus yet.
        </div>
      )}
    </div>
  );
}
