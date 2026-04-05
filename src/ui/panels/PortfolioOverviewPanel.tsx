import React from "react";

import type {
  PortfolioScopeContract,
  PortfolioScopeMode,
  PortfolioSummaryCard
} from "../playScreenPortfolio";
import {
  PLAY_SCREEN_ACTION_BUTTON_STYLE,
  PLAY_SCREEN_PANEL_ACCENT_STYLE,
  PLAY_SCREEN_SECTION_SIGILS,
  PLAY_SCREEN_SUBCARD_STYLE,
  PLAY_SCREEN_THEME
} from "../playScreenTheme";
import { SectionHeading } from "./SectionHeading";

type PortfolioOverviewPanelProps = {
  contract: PortfolioScopeContract;
  onScopeModeChange: (mode: PortfolioScopeMode) => void;
  scopeMode: PortfolioScopeMode;
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

function scopeToggleStyles(isActive: boolean) {
  return {
    ...PLAY_SCREEN_ACTION_BUTTON_STYLE,
    background: isActive ? PLAY_SCREEN_THEME.accent : PLAY_SCREEN_THEME.surfaceRaised,
    borderColor: isActive ? PLAY_SCREEN_THEME.accent : PLAY_SCREEN_THEME.border,
    color: isActive ? PLAY_SCREEN_THEME.surfaceRaised : PLAY_SCREEN_THEME.ink
  };
}

function renderSummaryCards(cards: PortfolioSummaryCard[], valueFontSize: number) {
  return cards.map((card) => {
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
        <div style={{ marginTop: 6, fontSize: valueFontSize, fontWeight: 700, color: tone.color }}>{card.value}</div>
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted }}>{card.helper}</div>
      </div>
    );
  });
}

export function PortfolioOverviewPanel({
  contract,
  onScopeModeChange,
  scopeMode
}: PortfolioOverviewPanelProps) {
  const surface = contract.portfolioSummary;
  const activeScope = contract.scopeOptions.find((option) => option.id === scopeMode) ?? contract.scopeOptions[0];
  const selectedManor = contract.selectedManor;
  const assetCards = selectedManor.summaryCards.slice(0, 3);
  const pressureCards = selectedManor.summaryCards.slice(3);

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
        {renderSummaryCards(surface.summaryCards, 24)}
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: PLAY_SCREEN_THEME.inkMuted }}>
          Detail focus
        </div>
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted }}>
          {contract.selectorHelper}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {contract.scopeOptions.map((option) => (
            <button
              key={option.id}
              aria-pressed={option.id === scopeMode}
              onClick={() => onScopeModeChange(option.id)}
              style={scopeToggleStyles(option.id === scopeMode)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, marginTop: 10, background: PLAY_SCREEN_THEME.surface }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{activeScope.label}</div>
              <div style={{ fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted, marginTop: 4 }}>
                {activeScope.helper}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                border: "1px solid rgba(172, 143, 100, 0.32)",
                borderRadius: 999,
                background: scopeMode === "portfolio" ? PLAY_SCREEN_THEME.surfaceRaised : "#f8f0df",
                color: scopeMode === "portfolio" ? PLAY_SCREEN_THEME.inkMuted : PLAY_SCREEN_THEME.accent
              }}
            >
              {scopeMode === "portfolio" ? "Portfolio active" : "Selected manor active"}
            </span>
          </div>

          {scopeMode === "selected_manor" ? (
            <>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: PLAY_SCREEN_THEME.inkMuted }}>
                  Selected manor
                </div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{selectedManor.title}</div>
                <div style={{ fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted, marginTop: 4 }}>
                  {selectedManor.summary}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  marginTop: 10,
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))"
                }}
              >
                {renderSummaryCards(assetCards, 20)}
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: PLAY_SCREEN_THEME.inkMuted }}>
                  Open dues & arrears
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {pressureCards.map((card) => {
                    const tone = toneStyles(card.tone);
                    return (
                      <span
                        key={card.id}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: `1px solid ${tone.borderColor}`,
                          background: tone.background,
                          color: tone.color,
                          fontSize: 12
                        }}
                      >
                        {card.label}: {card.value}
                      </span>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted }}>
              Stay on portfolio summary when you need the additive holdings context across every tracked manor. Switch to the
              selected manor detail when you want one bounded follow-up surface without widening the ledger into a portfolio
              spreadsheet.
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: PLAY_SCREEN_THEME.inkMuted }}>
          Outlier exceptions
        </div>
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted }}>
          Exception rows stay lightweight here. They tell you which manor deserves follow-up next without becoming a second
          ledger.
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
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
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
                    {scopeMode === "selected_manor" && manor.manorId === selectedManor.manorId ? (
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          border: "1px solid rgba(172, 143, 100, 0.32)",
                          borderRadius: 999,
                          background: PLAY_SCREEN_THEME.accent,
                          color: PLAY_SCREEN_THEME.surfaceRaised
                        }}
                      >
                        Selected detail
                      </span>
                    ) : null}
                  </div>
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
