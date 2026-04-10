import React, { useEffect, useState } from "react";

import type { PortfolioMapTarget } from "../playScreenPortfolio";
import type { ManorViewSurface } from "../worldMapView";

type ManorViewPanelProps = {
  initialTab?: ManorViewTab;
  onSelectManor?: (target: PortfolioMapTarget) => void;
  surface: ManorViewSurface;
};

type ManorViewTab = "player" | "debug";

const CARD_STYLE: React.CSSProperties = {
  border: "1px solid rgba(119, 89, 61, 0.22)",
  borderRadius: 14,
  background: "#f6f1e7",
  padding: 14,
  boxShadow: "0 12px 28px rgba(36, 27, 20, 0.08)"
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  color: "#6d5b4a"
};

const VALUE_FORMAT = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3
});

function formatValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "n/a";
  return VALUE_FORMAT.format(value);
}

function tabButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    border: "1px solid rgba(119, 89, 61, 0.24)",
    borderRadius: 999,
    background: isActive ? "#5f4736" : "#fffaf0",
    color: isActive ? "#fffaf0" : "#241b14",
    cursor: "pointer",
    fontWeight: 700,
    padding: "8px 14px"
  };
}

export function ManorViewPanel({ initialTab = "player", onSelectManor, surface }: ManorViewPanelProps) {
  const [activeTab, setActiveTab] = useState<ManorViewTab>(initialTab);

  useEffect(() => {
    setActiveTab("player");
  }, [surface.detail.manor_id]);

  return (
    <div data-manor-view={surface.detail.manor_id} style={CARD_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <div style={LABEL_STYLE}>Manor View v0</div>
          <h2 style={{ margin: "6px 0 0", fontSize: 28 }}>{surface.detail.manor_label}</h2>
          <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.55, maxWidth: 760 }}>{surface.helperText}</p>
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
        <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
            }}
          >
            <div style={{ ...CARD_STYLE, background: "#fffaf0", boxShadow: "none" }}>
              <div style={LABEL_STYLE}>Seat</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>
                {surface.detail.seat_q},{surface.detail.seat_r}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: "#6d5b4a" }}>
                Hex {surface.detail.seat_hex_id}
                <br />
                {surface.detail.hex_count} manor hexes
              </div>
            </div>

            <div style={{ ...CARD_STYLE, background: "#fffaf0", boxShadow: "none" }}>
              <div style={LABEL_STYLE}>Holding</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>{surface.detail.holding_label}</div>
              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: "#6d5b4a" }}>
                County: {surface.detail.county_label}
                <br />
                Owner: {surface.detail.owner_label}
              </div>
            </div>

            <div style={{ ...CARD_STYLE, background: "#fffaf0", boxShadow: "none" }}>
              <div style={LABEL_STYLE}>Arability</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>
                {surface.detail.arability_summary.arable_hex_count} arable hexes
              </div>
              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: "#6d5b4a" }}>
                Avg arable: {formatValue(surface.detail.arability_summary.average_base_arable_capacity)}
                <br />
                Avg productive: {formatValue(surface.detail.arability_summary.average_net_productive_capacity)}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)"
            }}
          >
            <div style={{ ...CARD_STYLE, background: "#fffaf0", boxShadow: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <div>
                  <div style={LABEL_STYLE}>Nearby Manors</div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>Deterministic world neighbors</div>
                </div>
                <div style={{ fontSize: 12, color: "#6d5b4a" }}>Limit {surface.detail.nearest_manor_limit}</div>
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {surface.nearestManors.map((row) => (
                  <div key={row.manor_id} style={{ borderTop: "1px solid rgba(119, 89, 61, 0.16)", paddingTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{row.manor_label}</div>
                        <div style={{ fontSize: 12, color: "#6d5b4a", marginTop: 4 }}>
                          {row.holding_label} · {row.county_label}
                        </div>
                      </div>
                      {row.target && onSelectManor ? (
                        <button
                          onClick={() => onSelectManor(row.target!)}
                          style={{
                            border: "1px solid rgba(119, 89, 61, 0.24)",
                            background: "#fff",
                            borderRadius: 999,
                            cursor: "pointer",
                            fontWeight: 700,
                            padding: "6px 12px"
                          }}
                          type="button"
                        >
                          Open manor
                        </button>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#4c3c2f", marginTop: 8 }}>
                      <span>Travel cost {formatValue(row.travel_cost_distance)}</span>
                      <span>Route hops {row.route_hop_distance}</span>
                      <span>Band {row.distance_band ?? "unclassified"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ ...CARD_STYLE, background: "#fffaf0", boxShadow: "none" }}>
                <div style={LABEL_STYLE}>Terrain Mix</div>
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  {surface.detail.terrain_mix.map((row) => (
                    <div key={row.terrain} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                      <span style={{ textTransform: "capitalize" }}>{row.terrain}</span>
                      <span>
                        {row.hex_count} hexes · {formatValue(row.share_of_hexes * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...CARD_STYLE, background: "#fffaf0", boxShadow: "none" }}>
                <div style={LABEL_STYLE}>Rights & Maintenance</div>
                <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.55, color: "#6d5b4a" }}>{surface.maintenanceSummaryNote}</p>

                {surface.maintenanceSummary ? (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        marginTop: 12,
                        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))"
                      }}
                    >
                      <div>
                        <div style={LABEL_STYLE}>Coin Cost</div>
                        <div style={{ marginTop: 4, fontWeight: 700 }}>{surface.maintenanceSummary.totals.coin_cost}</div>
                      </div>
                      <div>
                        <div style={LABEL_STYLE}>Labor</div>
                        <div style={{ marginTop: 4, fontWeight: 700 }}>{surface.maintenanceSummary.totals.labor_required}</div>
                      </div>
                      <div>
                        <div style={LABEL_STYLE}>Buildings</div>
                        <div style={{ marginTop: 4, fontWeight: 700 }}>{surface.maintenanceSummary.totals.building_count}</div>
                      </div>
                      <div>
                        <div style={LABEL_STYLE}>Rights</div>
                        <div style={{ marginTop: 4, fontWeight: 700 }}>{surface.maintenanceSummary.totals.right_count}</div>
                      </div>
                    </div>

                    {surface.maintenanceSummary.active_project ? (
                      <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.55 }}>
                        <b>Active project:</b> {surface.maintenanceSummary.active_project.improvement_label} (
                        {surface.maintenanceSummary.active_project.progress}/{surface.maintenanceSummary.active_project.required})
                      </div>
                    ) : null}

                    <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.55 }}>
                      <b>Buildings:</b>{" "}
                      {surface.maintenanceSummary.building_entries.map((entry) => entry.source_label).join(", ") || "None"}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>
                      <b>Rights:</b>{" "}
                      {surface.maintenanceSummary.right_entries.map((entry) => entry.source_label).join(", ") || "None"}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
            }}
          >
            <div style={{ ...CARD_STYLE, background: "#fffaf0", boxShadow: "none" }}>
              <div style={LABEL_STYLE}>Owner Actor</div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>{surface.detail.owner_actor_id}</div>
            </div>
            <div style={{ ...CARD_STYLE, background: "#fffaf0", boxShadow: "none" }}>
              <div style={LABEL_STYLE}>Nearest Limit</div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>{surface.detail.nearest_manor_limit}</div>
            </div>
            <div style={{ ...CARD_STYLE, background: "#fffaf0", boxShadow: "none" }}>
              <div style={LABEL_STYLE}>Hex Rows</div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>{surface.detail.hex_rows.length}</div>
            </div>
          </div>

          <div style={{ ...CARD_STYLE, background: "#fffaf0", boxShadow: "none" }}>
            <div style={LABEL_STYLE}>Hex Table</div>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>Hex</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>q,r</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>Terrain</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>Roads</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>Rivers</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>Net cap</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>Buildability</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.detail.hex_rows.map((row) => (
                    <tr key={row.hex_id}>
                      <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0" }}>{row.hex_id}</td>
                      <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0" }}>
                        {row.q},{row.r}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0", textTransform: "capitalize" }}>
                        {row.terrain}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0" }}>
                        {row.road_route_tiers.join(", ") || "none"}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0" }}>
                        {row.river_tags.join(", ") || "none"}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0" }}>
                        {formatValue(row.net_productive_capacity)}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0" }}>
                        {formatValue(row.buildability_score)}
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
