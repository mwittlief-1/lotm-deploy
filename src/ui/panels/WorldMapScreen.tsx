import React from "react";

import { EXTERNAL_MAP_RENDERER_HOST_ID, type ExternalMapRendererSurfaceV1 } from "../worldMapRoute";

type WorldMapScreenProps = {
  appVersion: string;
  onBack: () => void;
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

export function WorldMapScreen({ appVersion, onBack, surface }: WorldMapScreenProps) {
  const targetLabel = surface.target.manor_label ?? "No selected manor";
  const countyLabel = surface.target.county_label ?? "No county target";
  const holdingLabel = surface.target.holding_label ?? "No holding target";

  return (
    <div style={SHELL_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={LABEL_STYLE}>Map Route</div>
          <h1 style={{ margin: "6px 0 0", fontSize: 30 }}>World Map Preview</h1>
          <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, maxWidth: 760 }}>{surface.helper_text}</p>
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
          <div style={LABEL_STYLE}>Frozen Topology</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>{surface.manor_count} manors</div>
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: "#6d5b4a" }}>
            {surface.holding_count} holdings
            <br />
            {surface.route_edge_count} route edges
          </div>
        </div>
      </div>

      <div style={{ ...CARD_STYLE, marginTop: 16 }}>
        <div style={LABEL_STYLE}>Renderer Host</div>
        <div
          data-external-map-renderer-host={EXTERNAL_MAP_RENDERER_HOST_ID}
          style={{
            marginTop: 10,
            minHeight: 360,
            borderRadius: 16,
            border: "1px dashed rgba(119, 89, 61, 0.32)",
            background:
              "radial-gradient(circle at top, rgba(219, 196, 152, 0.35), rgba(244, 236, 223, 0.92) 48%, rgba(238, 229, 215, 0.96) 100%)",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            padding: 24
          }}
        >
          <div style={{ maxWidth: 520 }}>
            <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "#6d5b4a" }}>
              External renderer seam attached
            </div>
            <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700 }}>{targetLabel}</div>
            <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.6, color: "#4c3c2f" }}>
              This host is intentionally thin. It keeps the frozen xmap bundle wired into a dedicated route now, so the later map UI
              task can focus on rendering, overlays, and click-through behavior instead of re-plumbing entry and bundle ownership.
            </p>
            <div style={{ marginTop: 14, fontSize: 13, color: "#6d5b4a" }}>Anchor manor: {surface.anchor_manor_id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
