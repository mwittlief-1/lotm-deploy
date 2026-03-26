import React from "react";

import type { StickyResourceChip } from "../playScreenLayout";

type StickyResourceChipsProps = {
  chips: StickyResourceChip[];
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

export function StickyResourceChips({ chips }: StickyResourceChipsProps) {
  return (
    <div
      style={{
        position: "sticky",
        top: 12,
        zIndex: 5,
        marginBottom: 12,
        padding: 10,
        border: "1px solid #d7d0c2",
        borderRadius: 12,
        background: "#fdfbf6",
        boxShadow: "0 8px 24px rgba(40, 28, 12, 0.08)"
      }}
    >
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {chips.map((chip) => (
          <div
            key={chip.id}
            data-resource-chip={chip.id}
            style={{
              minWidth: 140,
              padding: "10px 12px",
              borderRadius: 10,
              ...CHIP_TONE_STYLE[chip.tone]
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.72 }}>{chip.label}</div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>{chip.value}</div>
            {chip.delta ? <div style={{ marginTop: 2, fontSize: 12, opacity: 0.8 }}>{chip.delta}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
