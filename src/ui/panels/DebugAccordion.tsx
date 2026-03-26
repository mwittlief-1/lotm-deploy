import React from "react";

type DebugAccordionProps = {
  children: React.ReactNode;
  summary: string;
  title: string;
};

export function DebugAccordion({ children, summary, title }: DebugAccordionProps) {
  return (
    <details style={{ border: "1px solid #d6d1c4", background: "#f6f2e8" }}>
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          padding: 12
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", opacity: 0.6 }}>Debug</div>
            <h3 style={{ margin: "4px 0 0" }}>{title}</h3>
          </div>
          <div style={{ fontSize: 12, opacity: 0.78, maxWidth: 460 }}>{summary}</div>
        </div>
      </summary>

      <div style={{ padding: 12, borderTop: "1px solid #d6d1c4", display: "grid", gap: 12 }}>{children}</div>
    </details>
  );
}
