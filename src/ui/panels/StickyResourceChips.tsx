import React from "react";

import type { StickyResourceChip } from "../playScreenLayout";
import {
  chipSigilForId,
  PLAY_SCREEN_ACTION_BUTTON_STYLE,
  PLAY_SCREEN_EYEBROW_STYLE,
  PLAY_SCREEN_PANEL_ACCENT_STYLE,
  PLAY_SCREEN_SIGIL_STYLE,
  PLAY_SCREEN_THEME,
  PLAY_SCREEN_TIMING_PILL_STYLE
} from "../playScreenTheme";

type StickyResourceChipsProps = {
  chips: StickyResourceChip[];
  helperText?: string;
  onOpenChipDetails?: (chipId: StickyResourceChip["id"]) => void;
  timingLabel?: string;
};

const CHIP_TONE_STYLE: Record<StickyResourceChip["tone"], React.CSSProperties> = {
  neutral: {
    border: "1px solid #d9d2c3",
    background: "#f7f1e4",
    color: "#2d2418"
  },
  caution: {
    border: "1px solid #d9b86d",
    background: "#fff6df",
    color: "#5b4310"
  },
  danger: {
    border: "1px solid #d79a9a",
    background: "#fff1f1",
    color: "#6b2222"
  }
};

export function StickyResourceChips({ chips, helperText, onOpenChipDetails, timingLabel }: StickyResourceChipsProps) {
  return (
    <div
      style={{
        ...PLAY_SCREEN_PANEL_ACCENT_STYLE,
        position: "sticky",
        top: 12,
        zIndex: 5,
        marginBottom: 12
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={PLAY_SCREEN_SIGIL_STYLE}>HW</span>
            {timingLabel ? <span style={PLAY_SCREEN_TIMING_PILL_STYLE}>{timingLabel}</span> : null}
          </div>
          <div style={{ ...PLAY_SCREEN_EYEBROW_STYLE, marginTop: 8, color: PLAY_SCREEN_THEME.ink }}>Household watch</div>
          {helperText ? <div style={{ marginTop: 4, fontSize: 12, opacity: 0.78 }}>{helperText}</div> : null}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {chips.map((chip) =>
          onOpenChipDetails ? (
            <button
              data-resource-chip={chip.id}
              key={chip.id}
              onClick={() => onOpenChipDetails(chip.id)}
              style={{
                ...PLAY_SCREEN_ACTION_BUTTON_STYLE,
                minWidth: 140,
                padding: "10px 12px",
                borderRadius: 10,
                textAlign: "left",
                cursor: "pointer",
                fontFamily: PLAY_SCREEN_THEME.bodyFont,
                ...CHIP_TONE_STYLE[chip.tone]
              }}
              title={`Open ${chip.label.toLowerCase()} details`}
              type="button"
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ ...PLAY_SCREEN_SIGIL_STYLE, minWidth: 24, height: 24, padding: "0 6px", fontSize: 10 }}>{chipSigilForId(chip.id)}</span>
                <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.72 }}>{chip.label}</div>
              </div>
              <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>{chip.value}</div>
              {chip.delta ? <div style={{ marginTop: 2, fontSize: 12, opacity: 0.8 }}>{chip.delta}</div> : null}
            </button>
          ) : (
            <div
              data-resource-chip={chip.id}
              key={chip.id}
              style={{
                minWidth: 140,
                padding: "10px 12px",
                borderRadius: 10,
                fontFamily: PLAY_SCREEN_THEME.bodyFont,
                ...CHIP_TONE_STYLE[chip.tone]
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ ...PLAY_SCREEN_SIGIL_STYLE, minWidth: 24, height: 24, padding: "0 6px", fontSize: 10 }}>{chipSigilForId(chip.id)}</span>
                <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.72 }}>{chip.label}</div>
              </div>
              <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>{chip.value}</div>
              {chip.delta ? <div style={{ marginTop: 2, fontSize: 12, opacity: 0.8 }}>{chip.delta}</div> : null}
            </div>
          )
        )}
      </div>
    </div>
  );
}
