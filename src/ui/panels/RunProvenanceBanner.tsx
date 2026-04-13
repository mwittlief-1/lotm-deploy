import React from "react";

import type { RunProvenanceSurface } from "../runProvenanceView";

type RunProvenanceBannerProps = {
  surface: RunProvenanceSurface;
};

export function RunProvenanceBanner({ surface }: RunProvenanceBannerProps) {
  return (
    <div
      data-run-provenance={surface.modeLabel}
      style={{
        marginTop: 12,
        padding: 12,
        border: "1px solid rgba(172, 143, 100, 0.32)",
        borderRadius: 14,
        background: "#fffaf1"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", opacity: 0.72 }}>Run provenance</div>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{surface.modeLabel}</div>
      </div>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 10 }}>
        {surface.detailRows.map((row) => (
          <div
            key={row.label}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(172, 143, 100, 0.24)",
              background: "rgba(255, 255, 255, 0.75)"
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.72, textTransform: "uppercase" }}>{row.label}</div>
            <div style={{ marginTop: 4, fontWeight: 700, lineHeight: 1.4 }}>{row.value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5, opacity: 0.82 }}>{surface.helperText}</div>
    </div>
  );
}
