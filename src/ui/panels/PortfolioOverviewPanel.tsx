import React from "react";

import type {
  PortfolioMapCheckpoint,
  PortfolioScopeContract,
  PortfolioScopeMode,
  PortfolioSelectedManorSurface,
  PortfolioSummaryCard
} from "../playScreenPortfolio";
import type { MaintenancePressureSurface } from "../maintenancePressureView";
import {
  PLAY_SCREEN_ACTION_BUTTON_STYLE,
  PLAY_SCREEN_PANEL_ACCENT_STYLE,
  PLAY_SCREEN_SECONDARY_BUTTON_STYLE,
  PLAY_SCREEN_SECTION_SIGILS,
  PLAY_SCREEN_SUBCARD_STYLE,
  PLAY_SCREEN_THEME
} from "../playScreenTheme";
import { SectionHeading } from "./SectionHeading";

type PortfolioOverviewPanelProps = {
  anchorId?: string;
  contract: PortfolioScopeContract;
  mapCheckpoint?: PortfolioMapCheckpoint | null;
  maintenancePressure?: MaintenancePressureSurface | null;
  onCenterSelectedHolding?: () => void;
  onScopeModeChange: (mode: PortfolioScopeMode) => void;
  onSelectManor: (manorId: string) => void;
  selectedManor: PortfolioSelectedManorSurface;
  selectedManorId: string;
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
  anchorId,
  contract,
  mapCheckpoint = null,
  maintenancePressure = null,
  onCenterSelectedHolding,
  onScopeModeChange,
  onSelectManor,
  selectedManor,
  selectedManorId,
  scopeMode
}: PortfolioOverviewPanelProps) {
  const surface = contract.portfolioSummary;
  const activeScope = contract.scopeOptions.find((option) => option.id === scopeMode) ?? contract.scopeOptions[0] ?? {
    helper: contract.selectorHelper,
    id: "portfolio" as const,
    label: "Portfolio summary"
  };
  const assetCards = selectedManor.summaryCards.slice(0, 3);
  const pressureCards = selectedManor.summaryCards.slice(3);
  const selectedMaintenanceRow = maintenancePressure?.manorRows.find((row) => row.manorId === selectedManorId) ?? null;

  return (
    <div id={anchorId} style={{ ...PLAY_SCREEN_PANEL_ACCENT_STYLE, marginBottom: 12 }}>
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

      {maintenancePressure?.manorRows.length ? (
        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 10, marginTop: 12, background: "#fcfaf5" }}>
          <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: PLAY_SCREEN_THEME.inkMuted }}>
            Maintenance pressure
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted, marginTop: 4 }}>
            {maintenancePressure.helperText}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted, marginTop: 6 }}>
            {maintenancePressure.coinAudit?.summary ?? "No coin walkdown audit is available for these upkeep rows yet."}
          </div>

          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th align="left" style={{ borderBottom: "1px solid rgba(172, 143, 100, 0.32)", paddingBottom: 6 }}>
                    Manor
                  </th>
                  <th align="left" style={{ borderBottom: "1px solid rgba(172, 143, 100, 0.32)", paddingBottom: 6 }}>
                    Modeled coin
                  </th>
                  <th align="left" style={{ borderBottom: "1px solid rgba(172, 143, 100, 0.32)", paddingBottom: 6 }}>
                    Ledger-paid
                  </th>
                  <th align="left" style={{ borderBottom: "1px solid rgba(172, 143, 100, 0.32)", paddingBottom: 6 }}>
                    Labor
                  </th>
                  <th align="left" style={{ borderBottom: "1px solid rgba(172, 143, 100, 0.32)", paddingBottom: 6 }}>
                    Rows
                  </th>
                </tr>
              </thead>
              <tbody>
                {maintenancePressure.manorRows.map((row) => (
                  <tr key={row.manorKey}>
                    <td style={{ borderBottom: "1px solid rgba(172, 143, 100, 0.18)", padding: "8px 0" }}>{row.manorLabel}</td>
                    <td style={{ borderBottom: "1px solid rgba(172, 143, 100, 0.18)", padding: "8px 0" }}>{row.coinCost}</td>
                    <td style={{ borderBottom: "1px solid rgba(172, 143, 100, 0.18)", padding: "8px 0" }}>{row.ledgerPaidCoinCost}</td>
                    <td style={{ borderBottom: "1px solid rgba(172, 143, 100, 0.18)", padding: "8px 0" }}>{row.laborRequired}</td>
                    <td style={{ borderBottom: "1px solid rgba(172, 143, 100, 0.18)", padding: "8px 0" }}>
                      {row.entryCount} ({row.buildingCount} buildings / {row.rightCount} rights)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {scopeMode === "selected_manor" ? (
            selectedMaintenanceRow ? (
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: PLAY_SCREEN_THEME.inkMuted }}>
                  Selected manor upkeep rows
                </div>
                {selectedMaintenanceRow.rows.map((row) => (
                  <div
                    key={row.entryId}
                    style={{
                      ...PLAY_SCREEN_SUBCARD_STYLE,
                      padding: 10,
                      background: PLAY_SCREEN_THEME.surfaceRaised
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{row.label}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted, marginTop: 4 }}>
                      {row.kindLabel} · {row.stateLabel} · modeled {row.coinCost} coin · ledger-paid {row.ledgerPaidCoinCost} coin · {row.laborRequired} labor
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted, marginTop: 3 }}>
                      {row.ledgerStatusLabel}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted, marginTop: 10 }}>
                Maintenance rows remain anchored to the current manor chronicle in this read model, so the selected holding only inherits the portfolio rollup above.
              </div>
            )
          ) : null}
        </div>
      ) : null}

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
                  {contract.selectorLabel}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted, marginTop: 4 }}>
                  Selector order stays deterministic and never mutates sim state. This only changes which manor the holdings shell is
                  following.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {contract.selectorOptions.map((option) => (
                    <button
                      data-portfolio-selector={option.manorId}
                      key={option.id}
                      onClick={() => onSelectManor(option.manorId)}
                      style={{
                        ...scopeToggleStyles(option.manorId === selectedManorId),
                        display: "grid",
                        gap: 2,
                        textAlign: "left",
                        minWidth: 160
                      }}
                      type="button"
                    >
                      <span>{option.title}</span>
                      <span style={{ fontSize: 11, lineHeight: 1.35, opacity: option.manorId === selectedManorId ? 0.92 : 0.76 }}>
                        {option.summary}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: PLAY_SCREEN_THEME.inkMuted }}>
                  Selected manor
                </div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{selectedManor.title}</div>
                <div style={{ fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted, marginTop: 4 }}>
                  {selectedManor.summary}
                </div>
              </div>

              {mapCheckpoint ? (
                <div
                  data-portfolio-map-checkpoint={mapCheckpoint.state}
                  style={{
                    ...PLAY_SCREEN_SUBCARD_STYLE,
                    padding: 10,
                    marginTop: 10,
                    background: "#fcfaf5"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: PLAY_SCREEN_THEME.inkMuted }}>
                        Map checkpoint
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted, marginTop: 4 }}>
                        {mapCheckpoint.helper}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: "1px solid rgba(172, 143, 100, 0.32)",
                        background: mapCheckpoint.state === "ready" ? "#f8f0df" : PLAY_SCREEN_THEME.surfaceRaised,
                        color: mapCheckpoint.state === "ready" ? PLAY_SCREEN_THEME.accent : PLAY_SCREEN_THEME.inkMuted,
                        fontSize: 11,
                        letterSpacing: 0.4,
                        textTransform: "uppercase"
                      }}
                    >
                      {mapCheckpoint.statusLabel}
                    </span>
                  </div>

                  <button
                    data-center-selected-holding="true"
                    disabled={mapCheckpoint.state !== "ready"}
                    onClick={mapCheckpoint.state === "ready" ? onCenterSelectedHolding : undefined}
                    style={{
                      ...(mapCheckpoint.state === "ready" ? PLAY_SCREEN_ACTION_BUTTON_STYLE : PLAY_SCREEN_SECONDARY_BUTTON_STYLE),
                      marginTop: 10,
                      opacity: mapCheckpoint.state === "ready" ? 1 : 0.72,
                      cursor: mapCheckpoint.state === "ready" ? "pointer" : "not-allowed"
                    }}
                    type="button"
                  >
                    {mapCheckpoint.buttonLabel}
                  </button>
                </div>
              ) : null}

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
