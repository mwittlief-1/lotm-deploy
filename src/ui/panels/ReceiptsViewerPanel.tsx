import React from "react";

import type {
  CounterpartyReceiptSection,
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
  counterpartySections: CounterpartyReceiptSection[];
  groupedSections: GroupedReceiptSection[];
  mode: ReceiptViewerMode;
  onModeChange: (mode: ReceiptViewerMode) => void;
  rawPhases: RawReceiptPhase[];
  scopeLabel?: string;
  scopeSummary?: string;
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

function stagePillStyle(label: string): React.CSSProperties {
  const active = label.toLowerCase().includes("stage");
  return {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    border: active ? "1px solid rgba(133, 67, 48, 0.28)" : "1px solid rgba(91, 112, 68, 0.24)",
    background: active ? "rgba(159, 92, 65, 0.12)" : "rgba(141, 168, 118, 0.14)",
    color: active ? "#854330" : "#4f633b"
  };
}

function rawReceiptFieldLabelStyle(): React.CSSProperties {
  return {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    opacity: 0.65
  };
}

export function ReceiptsViewerPanel({
  counterpartySections,
  groupedSections,
  mode,
  onModeChange,
  rawPhases,
  scopeLabel,
  scopeSummary
}: ReceiptsViewerPanelProps) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {scopeLabel || scopeSummary ? (
        <div
          data-receipts-scope="true"
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(172, 143, 100, 0.24)",
            background: "#fcfaf5",
            color: PLAY_SCREEN_THEME.ink
          }}
        >
          {scopeLabel ? <div style={{ fontWeight: 700 }}>{scopeLabel}</div> : null}
          {scopeSummary ? <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82, marginTop: scopeLabel ? 4 : 0 }}>{scopeSummary}</div> : null}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button aria-pressed={mode === "grouped"} onClick={() => onModeChange("grouped")} style={modeButtonStyle(mode === "grouped")} type="button">
          Drilldown
        </button>
        <button aria-pressed={mode === "raw"} onClick={() => onModeChange("raw")} style={modeButtonStyle(mode === "raw")} type="button">
          Phase record
        </button>
      </div>

      <div
        style={{
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(172, 143, 100, 0.24)",
          background: "#fcfaf5",
          color: PLAY_SCREEN_THEME.ink,
          fontSize: 12,
          lineHeight: 1.45,
          opacity: 0.86
        }}
      >
        {mode === "grouped"
          ? "Drilldown is the main player-facing explanation path here: ordered walkdowns, counterparty timing, and matched receipts stay grouped together."
          : "Phase record is secondary evidence. Use it when the drilldown still leaves questions about the exact per-phase receipt trail."}
      </div>

      {mode === "grouped" ? (
        <div style={{ display: "grid", gap: 12 }}>
          {counterpartySections.length ? (
            <section
              data-receipts-counterparties="true"
              style={{
                padding: 14,
                borderRadius: 14,
                color: PLAY_SCREEN_THEME.ink,
                ...PLAY_SCREEN_SUBCARD_STYLE
              }}
            >
              <div style={{ fontWeight: 700 }}>Counterparty paths</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                Gifts and offerings stay attached to liege and church identity here, so each obligation fact and relationship action keeps one stable home.
              </div>

              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {counterpartySections.map((section) => (
                  <div
                    data-receipts-counterparty={section.id}
                    key={section.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(172, 143, 100, 0.24)",
                      background: "#fdfbf7",
                      display: "grid",
                      gap: 10
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{section.title}</div>
                        <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>{section.helper}</div>
                      </div>
                      <span style={stagePillStyle(section.stageLabel)}>{section.stageLabel}</span>
                    </div>

                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                      <div style={{ padding: 10, borderRadius: 12, background: "#fcfaf5", border: "1px solid rgba(172, 143, 100, 0.18)" }}>
                        <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.66, textTransform: "uppercase" }}>Due & pressure</div>
                        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45 }}>{section.dueSummary}</div>
                        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45 }}>{section.penaltySummary}</div>
                      </div>

                      <div style={{ padding: 10, borderRadius: 12, background: "#fcfaf5", border: "1px solid rgba(172, 143, 100, 0.18)" }}>
                        <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.66, textTransform: "uppercase" }}>Relationship lever</div>
                        <div style={{ marginTop: 6, fontWeight: 700 }}>{section.gestureLabel}</div>
                        <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.45 }}>{section.gestureSummary}</div>
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>{section.gestureDetail}</div>
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>
                          {section.gestureCost === null ? "No court budget cost recorded." : `Cost ${section.gestureCost}.`}
                          {section.gestureSpent !== null ? ` Used this turn ${section.gestureSpent}.` : ""}
                        </div>
                      </div>

                      <div style={{ padding: 10, borderRadius: 12, background: "#fcfaf5", border: "1px solid rgba(172, 143, 100, 0.18)" }}>
                        <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.66, textTransform: "uppercase" }}>Timing</div>
                        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45 }}>{section.resolvedSummary}</div>
                        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45 }}>{section.responseSummary}</div>
                      </div>
                    </div>

                    {section.receipts.length ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.66, textTransform: "uppercase" }}>Matched receipts</div>
                        {section.receipts.map((receipt) => (
                          <div
                            data-counterparty-receipt-line={receipt.id}
                            key={receipt.id}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: "1px solid rgba(172, 143, 100, 0.24)",
                              background: "#fff"
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
                      <div style={{ fontSize: 12, opacity: 0.72 }}>
                        No receipt lines matched this counterparty yet. The summaries above remain the primary explanation home.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

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

              {section.walkdownRows.length ? (
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.66, textTransform: "uppercase" }}>Walkdown</div>
                  {section.walkdownRows.map((row) => (
                    <div
                      key={row.id}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        background: "#fcfaf5",
                        border: "1px solid rgba(172, 143, 100, 0.24)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 700 }}>{row.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{row.amountLabel}</div>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.82, marginTop: 6 }}>{row.summary}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              {section.auditRows.length ? (
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.66, textTransform: "uppercase" }}>Audit detail</div>
                  {section.auditRows.map((row) => (
                    <div
                      data-receipts-audit-row={row.id}
                      key={row.id}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        background: "#fff",
                        border: "1px solid rgba(172, 143, 100, 0.24)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 700 }}>{row.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.72 }}>{row.statusLabel}</div>
                      </div>
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", marginTop: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.66, textTransform: "uppercase" }}>Receipts</div>
                          <div style={{ marginTop: 4 }}>{row.receiptLabel}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.66, textTransform: "uppercase" }}>Walkdown</div>
                          <div style={{ marginTop: 4 }}>{row.walkdownLabel}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.82, marginTop: 8 }}>{row.detail}</div>
                    </div>
                  ))}
                </div>
              ) : null}

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
                  No extra receipt lines matched this focus. The grouped drilldown above is still the primary explanation.
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
                    {receipt.structured ? (
                      <div data-raw-structured-receipt={receipt.structured.receiptId} style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                          <div>
                            <div style={rawReceiptFieldLabelStyle()}>Receipt ID</div>
                            <div style={{ marginTop: 4 }}>{receipt.structured.receiptId}</div>
                          </div>
                          <div>
                            <div style={rawReceiptFieldLabelStyle()}>Category</div>
                            <div style={{ marginTop: 4 }}>{receipt.structured.category || "Unknown"}</div>
                          </div>
                          <div>
                            <div style={rawReceiptFieldLabelStyle()}>Asset</div>
                            <div style={{ marginTop: 4 }}>{receipt.structured.asset || "Unknown"}</div>
                          </div>
                          <div>
                            <div style={rawReceiptFieldLabelStyle()}>Delta</div>
                            <div style={{ marginTop: 4 }}>{receipt.structured.delta > 0 ? `+${receipt.structured.delta}` : `${receipt.structured.delta}`}</div>
                          </div>
                          <div>
                            <div style={rawReceiptFieldLabelStyle()}>Counterparty</div>
                            <div style={{ marginTop: 4 }}>{receipt.structured.counterpartyLabel || "Unknown"}</div>
                          </div>
                        </div>

                        <div>
                          <div style={rawReceiptFieldLabelStyle()}>Summary / rule</div>
                          <div style={{ marginTop: 4 }}>{receipt.structured.summary || receipt.structured.ruleLabel || receipt.line}</div>
                          {receipt.structured.summary && receipt.structured.ruleLabel ? (
                            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.76 }}>Rule: {receipt.structured.ruleLabel}</div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", opacity: 0.65 }}>{receipt.kind}</div>
                        <div style={{ marginTop: 4 }}>{receipt.line}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
          No phase record lines matched this focus yet.
        </div>
      )}
    </div>
  );
}
