import React, { useEffect, useState } from "react";

import type { CourtProvisioningSurface } from "../courtProvisioningView";
import {
  PLAY_SCREEN_ACTION_BUTTON_STYLE,
  PLAY_SCREEN_EYEBROW_STYLE,
  PLAY_SCREEN_SECONDARY_BUTTON_STYLE,
  PLAY_SCREEN_SUBCARD_STYLE,
  PLAY_SCREEN_THEME
} from "../playScreenTheme";

type CourtProvisioningTab = "player" | "debug";

type CourtProvisioningPanelProps = {
  initialTab?: CourtProvisioningTab;
  surface: CourtProvisioningSurface;
};

function tabButtonStyle(isActive: boolean): React.CSSProperties {
  return isActive ? PLAY_SCREEN_ACTION_BUTTON_STYLE : PLAY_SCREEN_SECONDARY_BUTTON_STYLE;
}

export function CourtProvisioningPanel({
  initialTab = "player",
  surface
}: CourtProvisioningPanelProps) {
  const [activeTab, setActiveTab] = useState<CourtProvisioningTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, surface.schemaVersion, surface.subtitle]);

  return (
    <div data-court-provisioning={surface.schemaVersion} style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={PLAY_SCREEN_EYEBROW_STYLE}>Court provisioning</div>
          <h3 style={{ margin: "6px 0 0", fontSize: 28 }}>Rations & stipends</h3>
          <p style={{ margin: "10px 0 0", maxWidth: 760, color: PLAY_SCREEN_THEME.inkMuted, lineHeight: 1.55 }}>
            {surface.helperText}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setActiveTab("player")} style={tabButtonStyle(activeTab === "player")} type="button">
            Player tab
          </button>
          <button onClick={() => setActiveTab("debug")} style={tabButtonStyle(activeTab === "debug")} type="button">
            Debug tab
          </button>
        </div>
      </div>

      {activeTab === "player" ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {surface.summaryCards.map((card) => (
              <div key={card.id} style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>{card.label}</div>
                <div style={{ marginTop: 8, fontSize: 21, fontWeight: 700 }}>{card.value}</div>
                <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>{card.detail}</div>
              </div>
            ))}
          </div>

          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>Ration policy</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Deterministic allocation order from the canonical policy</div>
              </div>
              <div style={{ fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted }}>{surface.allocationRows.length} rows</div>
            </div>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Priority</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Person</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Ration</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Request</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Status</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Shortfall</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.allocationRows.map((row) => (
                    <tr key={row.personId}>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.allocationPriority}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        <div style={{ fontWeight: 700 }}>{row.personName}</div>
                        {row.badgeLabels.length > 0 ? (
                          <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.badgeLabels.join(", ")}</div>
                        ) : null}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.rationLevelLabel}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                        {row.requestLabel}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.statusLabel}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                        {row.shortfallLabel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>Overrides & carry-forward</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Effective ration and lodging settings by stable person id</div>
              </div>
              <div style={{ fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted }}>{surface.overrideRows.length} rows</div>
            </div>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Person</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Class</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Ration / lodging</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Carry</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Court context</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.overrideRows.map((row) => (
                    <tr key={row.personId}>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        <div style={{ fontWeight: 700 }}>{row.personName}</div>
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.personId}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.provisioningClassLabel}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                        {row.rationLevelLabel} / {row.lodgingLevelLabel}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.carryForwardLabel}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                        {row.roleSummary}
                        <br />
                        Seats {row.seatSummary} · Service {row.serviceSummary}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.statusLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>Stipend table</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Canonical stipend keys and placeholder receipt behavior</div>
              </div>
              <div style={{ fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted }}>{surface.stipendRows.length} rows</div>
            </div>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Person</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Basis</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Amount</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Receipt mode</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Carry</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Context</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.stipendRows.map((row) => (
                    <tr key={row.stipendKey}>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        <div style={{ fontWeight: 700 }}>{row.personName}</div>
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.stipendKey}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        {row.paymentBasisLabel}
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.provisioningClassLabel}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.stipendAmountLabel}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        {row.appliesReceiptLabel}
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.receiptCategoryLabel}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.carryForwardLabel}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                        Seats {row.activeSeatSummary} · Service {row.serviceSummary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>Debug summary</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Deterministic provisioning field order</div>
              </div>
              <div style={{ fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted }}>{surface.schemaVersion}</div>
            </div>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Field</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.debugRows.map((row) => (
                    <tr key={row.key}>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.label}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={PLAY_SCREEN_EYEBROW_STYLE}>Provisioning rows</div>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>person_id</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>name</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>class</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>ration</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>lodging</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>status</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>stipend</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.debugEntryRows.map((row) => (
                    <tr key={row.personId}>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.personId}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        <div style={{ fontWeight: 700 }}>{row.personName}</div>
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.badgeSummary}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.provisioningClassLabel}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        {row.rationLevelLabel}
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.rationRuleId}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.lodgingLevelLabel}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        {row.statusLabel}
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.carryForwardLabel}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        {row.stipendAmountLabel}
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.stipendKey}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={PLAY_SCREEN_EYEBROW_STYLE}>Stipend registry</div>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>stipend_key</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>person_id</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>basis</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>amount</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>receipt</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>rule_id</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.debugStipendRows.map((row) => (
                    <tr key={row.stipendKey}>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.stipendKey}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        <div style={{ fontWeight: 700 }}>{row.personId}</div>
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.personName}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.paymentBasisLabel}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.stipendAmountLabel}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        {row.appliesReceiptLabel}
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.carryForwardLabel}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                        {row.ruleId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
