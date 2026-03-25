import React from "react";

type DiffLedgerItem = {
  id: string;
  primary: string;
  source: string;
  why: string;
};

type DiffLedgerPanelProps = {
  copy: any;
  items: DiffLedgerItem[];
};

export function DiffLedgerPanel({ copy, items }: DiffLedgerPanelProps) {
  return (
    <div style={{ padding: 12, border: "1px solid #ccc", background: "#fafafa", marginBottom: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{copy.diffLedgerTitle}</div>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>{copy.diffLedgerHelper}</div>

      <div style={{ display: "grid", gap: 8 }}>
        {items.map((it) => (
          <div key={it.id} style={{ padding: 10, border: "1px solid #ddd", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <div style={{ fontWeight: 700 }}>{it.primary}</div>
              <span
                title="Source of the change (highest-priority contributor)."
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  border: "1px solid #ddd",
                  borderRadius: 999,
                  background: "#fafafa",
                  whiteSpace: "nowrap"
                }}
              >
                {it.source}
              </span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{it.why}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
