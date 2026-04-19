import React from "react";
import { PLAY_SCREEN_ACTION_BUTTON_STYLE, PLAY_SCREEN_PANEL_ACCENT_STYLE, PLAY_SCREEN_SECTION_SIGILS, PLAY_SCREEN_SUBCARD_STYLE } from "../playScreenTheme";
import { SectionHeading } from "./SectionHeading";

type DiffLedgerItem = {
  id: string;
  primary: string;
  source: string;
  why: string;
};

type DiffLedgerPanelProps = {
  copy: any;
  items: DiffLedgerItem[];
  onOpenExplainChanges?: () => void;
  scopeHelperText?: string;
  scopeLabel?: string;
};

const MAX_VISIBLE_DIFF_LEDGER_ITEMS = 4;

export function DiffLedgerPanel({ copy, items, onOpenExplainChanges, scopeHelperText, scopeLabel }: DiffLedgerPanelProps) {
  const visibleItems = items.slice(0, MAX_VISIBLE_DIFF_LEDGER_ITEMS);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <div style={{ ...PLAY_SCREEN_PANEL_ACCENT_STYLE, marginBottom: 12 }}>
      <SectionHeading
        action={
          onOpenExplainChanges ? (
            <button data-open-explain-changes onClick={onOpenExplainChanges} style={PLAY_SCREEN_ACTION_BUTTON_STYLE} type="button">
              {copy.diffLedgerExplainChanges ?? "Explain Changes"}
            </button>
          ) : null
        }
        helper={scopeHelperText ?? copy.diffLedgerHelper}
        sigil={PLAY_SCREEN_SECTION_SIGILS.ledger}
        timingLabel={copy.turnSummary_last3Years}
        title={copy.diffLedgerTitle}
      />

      {scopeLabel ? (
        <div style={{ marginTop: 10 }}>
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              border: "1px solid rgba(172, 143, 100, 0.32)",
              borderRadius: 999,
              background: "#f8f0df",
              color: "#74542f"
            }}
          >
            {scopeLabel}
          </span>
        </div>
      ) : null}

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.82 }}>
        {hiddenCount > 0
          ? `Showing the ${visibleItems.length} biggest resolved moves here. Open Explain Changes for ${hiddenCount} more item${hiddenCount === 1 ? "" : "s"} and the deeper cause chain.`
          : "Top deltas only. Open Explain Changes for the ordered walkdowns and matched receipts behind them."}
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {visibleItems.map((it) => (
          <div key={it.id} style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <div style={{ fontWeight: 700 }}>{it.primary}</div>
              <span
                title="Source of the change (highest-priority contributor)."
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  border: "1px solid rgba(172, 143, 100, 0.32)",
                  borderRadius: 999,
                  background: "#f8f0df",
                  whiteSpace: "nowrap"
                }}
              >
                {it.source.replace(/_/g, " ")}
              </span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{it.why}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
