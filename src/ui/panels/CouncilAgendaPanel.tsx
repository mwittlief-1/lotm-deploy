import React from "react";

type AgendaItem = {
  id: string;
  title: string;
  context: string;
  cta_label: string;
  anchor: string;
};

type CouncilAgendaPanelProps = {
  copy: any;
  items: AgendaItem[];
  onScrollToAnchor: (anchorId: string) => void;
};

export function CouncilAgendaPanel({ copy, items, onScrollToAnchor }: CouncilAgendaPanelProps) {
  return (
    <div style={{ padding: 12, border: "1px solid #ccc", background: "#fafafa", marginBottom: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{copy.councilAgendaTitle}</div>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>{copy.councilAgendaHelper}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: 10,
              border: "1px solid #ddd",
              background: "#fff"
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{a.title}</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{a.context}</div>
            </div>
            <button onClick={() => onScrollToAnchor(a.anchor)} style={{ whiteSpace: "nowrap" }}>
              {a.cta_label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
