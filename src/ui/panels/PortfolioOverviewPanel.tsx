import React from "react";

import {
  PLAY_SCREEN_PANEL_ACCENT_STYLE,
  PLAY_SCREEN_SECTION_SIGILS,
  PLAY_SCREEN_SUBCARD_STYLE,
  PLAY_SCREEN_THEME
} from "../playScreenTheme";
import type { PortfolioOverviewSurface } from "../playScreenPortfolio";
import { SectionHeading } from "./SectionHeading";

type PortfolioOverviewPanelProps = {
  surface: PortfolioOverviewSurface;
};

function toneStyles(tone: "neutral" | "caution" | "danger") {
  if (tone === "danger") {
    return {
      background: "#f6e4dc",
      borderColor: "rgba(146, 77, 60, 0.28)",
      color: PLAY_SCREEN_THEME.accentDanger
    };
  }

  if (tone === "caution") {
    return {
      background: "#f8f0df",
      borderColor: "rgba(172, 143, 100, 0.32)",
      color: PLAY_SCREEN_THEME.accent
    };
  }

  return {
    background: PLAY_SCREEN_THEME.surfaceRaised,
    borderColor: "rgba(172, 143, 100, 0.32)",
    color: PLAY_SCREEN_THEME.ink
  };
}

export function PortfolioOverviewPanel({ surface }: PortfolioOverviewPanelProps) {
  return (
    <div style={{ ...PLAY_SCREEN_PANEL_ACCENT_STYLE, marginBottom: 12 }}>
      <SectionHeading
        action={<span>{surface.manorCountLabel}</span>}
        helper={surface.helper}
        sigil={PLAY_SCREEN_SECTION_SIGILS.portfolio}
        title="Portfolio Totals & Outliers"
      />

      <div
        style={{
          display: "grid",
          gap: 8,
          marginTop: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))"
        }}
      >
        {surface.summaryCards.map((card) => {
          const tone = toneStyles(card.tone);
          return (
            <div
              key={card.id}
              style={{
                ...PLAY_SCREEN_SUBCARD_STYLE,
                borderColor: tone.borderColor,
                background: tone.background,
                padding: 10
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: PLAY_SCREEN_THEME.inkMuted }}>
                {card.label}
              </div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: tone.color }}>{card.value}</div>
              <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted }}>{card.helper}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: PLAY_SCREEN_THEME.inkMuted }}>
          Outlier manors
        </div>
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted }}>
          Read-only list of the bounded manors currently driving the strongest portfolio extremes.
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {surface.outlierManors.length > 0 ? (
            surface.outlierManors.map((manor) => (
              <div key={manor.manorId} style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{manor.manorLabel}</div>
                    <div style={{ fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted, marginTop: 4 }}>{manor.manorId}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      border: "1px solid rgba(172, 143, 100, 0.32)",
                      borderRadius: 999,
                      background: "#f8f0df",
                      color: PLAY_SCREEN_THEME.accent
                    }}
                  >
                    {manor.summary}
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {manor.flags.map((flag) => {
                    const tone = toneStyles(flag.tone);
                    return (
                      <span
                        key={flag.id}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: `1px solid ${tone.borderColor}`,
                          background: tone.background,
                          color: tone.color,
                          fontSize: 12
                        }}
                      >
                        {flag.label}: {flag.value}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted }}>
              {surface.emptyOutliersLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
