import React from "react";
import type { TopologyDebugSurface } from "../playScreenTopology";

type TopologyDebugPanelProps = {
  description: string;
  surface: TopologyDebugSurface | null;
  title: string;
};

const META_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 0.4,
  opacity: 0.62,
  textTransform: "uppercase"
};

const META_VALUE_STYLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  marginTop: 4
};

export function TopologyDebugPanel({ description, surface, title }: TopologyDebugPanelProps) {
  if (!surface) return null;

  return (
    <div style={{ padding: 12, border: "1px solid #ddd7cb", background: "#fff" }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{description}</div>

      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <div style={{ border: "1px solid #ece5d6", background: "#faf7f0", padding: 8 }}>
            <div style={META_LABEL_STYLE}>Anchor manor</div>
            <div style={META_VALUE_STYLE}>{surface.anchorManorId}</div>
          </div>
          <div style={{ border: "1px solid #ece5d6", background: "#faf7f0", padding: 8 }}>
            <div style={META_LABEL_STYLE}>Holding</div>
            <div style={META_VALUE_STYLE}>{surface.anchorHoldingId}</div>
          </div>
          <div style={{ border: "1px solid #ece5d6", background: "#faf7f0", padding: 8 }}>
            <div style={META_LABEL_STYLE}>County</div>
            <div style={META_VALUE_STYLE}>{surface.anchorCountyId}</div>
          </div>
          <div style={{ border: "1px solid #ece5d6", background: "#faf7f0", padding: 8 }}>
            <div style={META_LABEL_STYLE}>Far threshold</div>
            <div style={META_VALUE_STYLE}>{surface.farThreshold}</div>
          </div>
          <div style={{ border: "1px solid #ece5d6", background: "#faf7f0", padding: 8 }}>
            <div style={META_LABEL_STYLE}>Raw metric</div>
            <div style={META_VALUE_STYLE}>{surface.rawMetric}</div>
          </div>
          <div style={{ border: "1px solid #ece5d6", background: "#faf7f0", padding: 8 }}>
            <div style={META_LABEL_STYLE}>Companion metric</div>
            <div style={META_VALUE_STYLE}>{surface.companionMetric}</div>
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.78 }}>{surface.sampleSummary}</div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th align="left" style={{ borderBottom: "1px solid #ddd7cb", padding: "0 0 6px" }}>To manor</th>
                <th align="left" style={{ borderBottom: "1px solid #ddd7cb", padding: "0 0 6px" }}>Raw distance</th>
                <th align="left" style={{ borderBottom: "1px solid #ddd7cb", padding: "0 0 6px" }}>Route hops</th>
                <th align="left" style={{ borderBottom: "1px solid #ddd7cb", padding: "0 0 6px" }}>Band</th>
              </tr>
            </thead>
            <tbody>
              {surface.samples.map((sample) => (
                <tr key={sample.toManorId}>
                  <td style={{ borderBottom: "1px solid #f0e7d7", padding: "8px 0" }}>{sample.toManorId}</td>
                  <td style={{ borderBottom: "1px solid #f0e7d7", padding: "8px 0" }}>{sample.rawDistance}</td>
                  <td style={{ borderBottom: "1px solid #f0e7d7", padding: "8px 0" }}>{sample.routeHops}</td>
                  <td style={{ borderBottom: "1px solid #f0e7d7", padding: "8px 0", textTransform: "capitalize" }}>{sample.distanceBand}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
