import React, { useMemo, useState } from "react";

import type { RunState } from "../../sim/types";
import type { PortfolioMapTarget } from "../playScreenPortfolio";
import { buildManorViewSurface, buildWorldMapScreenSurface } from "../worldMapView";
import { EXTERNAL_MAP_RENDERER_HOST_ID, type ExternalMapRendererSurfaceV1 } from "../worldMapRoute";
import { ManorViewPanel } from "./ManorViewPanel";

type WorldMapScreenProps = {
  appVersion: string;
  onBack: () => void;
  onSelectManor: (target: PortfolioMapTarget) => void;
  previewState?: RunState | null;
  surface: ExternalMapRendererSurfaceV1;
};

const SHELL_STYLE: React.CSSProperties = {
  padding: 16,
  maxWidth: 1100,
  margin: "0 auto",
  fontFamily: "Georgia, serif",
  color: "#241b14"
};

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

export function WorldMapScreen({ appVersion, onBack, onSelectManor, previewState, surface }: WorldMapScreenProps) {
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const targetLabel = surface.target.manor_label ?? "No selected manor";
  const countyLabel = surface.target.county_label ?? "No county target";
  const holdingLabel = surface.target.holding_label ?? "No holding target";
  const worldMap = useMemo(() => buildWorldMapScreenSurface(previewState ?? null, surface), [previewState, surface]);
  const manorView = useMemo(
    () => buildManorViewSurface(previewState ?? null, worldMap.selectedManorId),
    [previewState, worldMap.selectedManorId]
  );

  return (
    <div style={SHELL_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={LABEL_STYLE}>Map Route</div>
          <h1 style={{ margin: "6px 0 0", fontSize: 30 }}>Kingdom Map</h1>
          <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, maxWidth: 760 }}>{worldMap.helperText}</p>
        </div>
        <button
          onClick={onBack}
          style={{
            border: "1px solid rgba(119, 89, 61, 0.28)",
            background: "#ffffff",
            color: "#241b14",
            borderRadius: 999,
            padding: "10px 16px",
            cursor: "pointer",
            fontWeight: 700
          }}
          type="button"
        >
          Return to play
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          marginTop: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
        }}
      >
        <div style={CARD_STYLE}>
          <div style={LABEL_STYLE}>Bundle</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>{surface.map_bundle_id}</div>
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: "#6d5b4a" }}>
            Manifest: {surface.manifest_schema_version}
            <br />
            App: {appVersion}
          </div>
        </div>

        <div style={CARD_STYLE}>
          <div style={LABEL_STYLE}>Focus Target</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>{targetLabel}</div>
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: "#6d5b4a" }}>
            Holding: {holdingLabel}
            <br />
            County: {countyLabel}
          </div>
        </div>

        <div style={CARD_STYLE}>
          <div style={LABEL_STYLE}>Highlighted Seats</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>{worldMap.playerHoldingManorIds.length} player holdings</div>
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: "#6d5b4a" }}>
            Liege seat: {worldMap.liegeSeatLabel ?? "Not resolved"}
            <br />
            Selected: {worldMap.selectedManorLabel}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          marginTop: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))"
        }}
      >
        <div
          style={{
            ...CARD_STYLE,
            position: "relative"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
            <div>
              <div style={LABEL_STYLE}>Frozen xmap bundle</div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>{surface.map_bundle_id}</div>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: "#6d5b4a" }}>
                {worldMap.markerCount} manors · {surface.holding_count} holdings · {surface.route_edge_count} route edges
              </div>
            </div>
            <button
              onClick={() => setShowDebugOverlay((current) => !current)}
              style={{
                border: "1px solid rgba(119, 89, 61, 0.28)",
                background: showDebugOverlay ? "#5f4736" : "#ffffff",
                color: showDebugOverlay ? "#fffaf0" : "#241b14",
                borderRadius: 999,
                cursor: "pointer",
                fontWeight: 700,
                padding: "8px 14px"
              }}
              type="button"
            >
              {showDebugOverlay ? "Hide debug overlay" : "Show debug overlay"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#6d5b4a", marginTop: 12 }}>
            <span>
              <b>Anchor:</b> {worldMap.anchorManorId}
            </span>
            <span>
              <b>Player holdings:</b> {worldMap.playerHoldingManorIds.join(", ")}
            </span>
            <span>
              <b>Renderer host:</b> {EXTERNAL_MAP_RENDERER_HOST_ID}
            </span>
          </div>

          <div
            data-external-map-renderer-host={EXTERNAL_MAP_RENDERER_HOST_ID}
            data-world-map-canvas={surface.map_bundle_id}
            style={{
              marginTop: 14,
              minHeight: 480,
              position: "relative",
              overflow: "hidden",
              borderRadius: 18,
              border: "1px solid rgba(119, 89, 61, 0.24)",
              background:
                "radial-gradient(circle at top, rgba(219, 196, 152, 0.36), rgba(244, 236, 223, 0.94) 50%, rgba(234, 223, 208, 0.98) 100%)"
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(rgba(119, 89, 61, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(119, 89, 61, 0.05) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
                opacity: 0.6
              }}
            />

            {worldMap.markers.map((marker) => {
              const size = marker.isSelected ? 16 : marker.isLiegeSeat ? 14 : marker.isPlayerHolding ? 13 : 10;
              const background = marker.isSelected
                ? "#5f4736"
                : marker.isLiegeSeat
                  ? "#8a3a2f"
                  : marker.isPlayerHolding
                    ? "#c2a05e"
                    : "#8f7865";
              const borderRadius = marker.isLiegeSeat ? 4 : 999;

              return (
                <button
                  aria-label={`${marker.manorLabel} · ${marker.holdingLabel}`}
                  data-manor-marker={marker.manorId}
                  key={marker.manorId}
                  onClick={() => onSelectManor(marker.target)}
                  style={{
                    position: "absolute",
                    left: `${marker.leftPct}%`,
                    top: `${marker.topPct}%`,
                    width: size,
                    height: size,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
                    borderRadius,
                    border: marker.isSelected ? "2px solid #f6f1e7" : "1px solid rgba(36, 27, 20, 0.42)",
                    background,
                    boxShadow: marker.isSelected ? "0 0 0 3px rgba(95, 71, 54, 0.18)" : "0 4px 10px rgba(36, 27, 20, 0.14)",
                    cursor: "pointer",
                    padding: 0
                  }}
                  title={`${marker.manorLabel}\n${marker.holdingLabel}\n${marker.countyLabel}`}
                  type="button"
                />
              );
            })}

            {worldMap.markers
              .filter((marker) => marker.isSelected)
              .map((marker) => (
                <div
                  key={`${marker.manorId}:label`}
                  style={{
                    position: "absolute",
                    left: `${marker.leftPct}%`,
                    top: `calc(${marker.topPct}% + 14px)`,
                    transform: "translateX(-50%)",
                    padding: "4px 8px",
                    borderRadius: 999,
                    background: "rgba(36, 27, 20, 0.88)",
                    color: "#fffaf0",
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: "nowrap"
                  }}
                >
                  {marker.manorLabel}
                </div>
              ))}

            <div
              style={{
                position: "absolute",
                left: 12,
                bottom: 12,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                padding: "10px 12px",
                borderRadius: 14,
                background: "rgba(255, 250, 240, 0.92)",
                border: "1px solid rgba(119, 89, 61, 0.16)",
                fontSize: 12,
                color: "#4c3c2f"
              }}
            >
              <span><b>Gold:</b> player holdings</span>
              <span><b>Red:</b> liege seat</span>
              <span><b>Dark:</b> selected manor</span>
            </div>

            {showDebugOverlay ? (
              <div
                style={{
                  position: "absolute",
                  inset: 12,
                  borderRadius: 16,
                  background: "rgba(246, 241, 231, 0.97)",
                  border: "1px solid rgba(119, 89, 61, 0.24)",
                  boxShadow: "0 18px 36px rgba(36, 27, 20, 0.16)",
                  overflow: "auto",
                  padding: 16
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <div>
                    <div style={LABEL_STYLE}>Debug overlay</div>
                    <div style={{ marginTop: 6, fontWeight: 700 }}>Sorted by manor_id</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#6d5b4a" }}>{worldMap.debugRows.length} rows</div>
                </div>
                <div style={{ overflowX: "auto", marginTop: 12 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>Manor</th>
                        <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>Flags</th>
                        <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>Seat</th>
                        <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>Holding</th>
                        <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>County</th>
                        <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>Roads</th>
                        <th align="left" style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.24)", paddingBottom: 6 }}>Rivers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {worldMap.debugRows.map((row) => (
                        <tr key={row.manorId}>
                          <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0" }}>
                            <div style={{ fontWeight: 700 }}>{row.manorLabel}</div>
                            <div style={{ color: "#6d5b4a" }}>{row.manorId}</div>
                          </td>
                          <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0" }}>
                            {row.flags.join(", ") || "none"}
                          </td>
                          <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0" }}>
                            {row.seatHexId} ({row.seatQ},{row.seatR})
                          </td>
                          <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0" }}>
                            <div>{row.holdingLabel}</div>
                            <div style={{ color: "#6d5b4a" }}>{row.ownerLabel}</div>
                          </td>
                          <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0" }}>{row.countyLabel}</td>
                          <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0" }}>{row.roadExposure}</td>
                          <td style={{ borderBottom: "1px solid rgba(119, 89, 61, 0.12)", padding: "8px 0" }}>{row.riverExposure}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <ManorViewPanel onSelectManor={onSelectManor} surface={manorView} />
      </div>
    </div>
  );
}
