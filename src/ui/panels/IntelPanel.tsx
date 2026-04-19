import React from "react";

type IntelEntry = {
  id: string;
  subject_label: string;
  detail: string;
  source_label: string;
  why_it_matters: string;
  confidence: "known" | "likely" | "possible";
  category: string;
  phase: string;
  turn_index: number;
  source: "current" | "memory";
};

type IntelPanelProps = {
  copy: any;
  current: IntelEntry[];
  memory: IntelEntry[];
};

function confidenceLabel(copy: any, confidence: IntelEntry["confidence"]): string {
  if (confidence === "known") return copy.prospectConfidence_known;
  if (confidence === "likely") return copy.prospectConfidence_likely;
  return copy.prospectConfidence_possible;
}

function renderEntries(copy: any, entries: IntelEntry[]) {
  return entries.map((entry) => (
    <div key={entry.id} style={{ padding: 8, border: "1px solid #eee", background: "#fff", marginBottom: 6 }}>
      <div style={{ fontWeight: 700 }}>{entry.subject_label}</div>
      <div style={{ marginTop: 4 }}>{entry.detail}</div>
      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{entry.why_it_matters}</div>
      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
        <b>{copy.prospectConfidenceLabel}</b> {confidenceLabel(copy, entry.confidence)} · <b>{copy.intelCategoryLabel}</b> {entry.category} · <b>{copy.intelTurnLabel}</b> {entry.turn_index}
      </div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
        <b>{copy.intelPhaseLabel}</b> {entry.phase} · {entry.source_label}
      </div>
    </div>
  ));
}

export function IntelPanel({ copy, current, memory }: IntelPanelProps) {
  const hasAny = current.length > 0 || memory.length > 0;

  return (
    <>
      <h4 style={{ marginTop: 12 }}>{copy.intelTitle}</h4>
      {!hasAny ? <div style={{ opacity: 0.7 }}>{copy.intelEmpty}</div> : null}
      {current.length > 0 ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, marginBottom: 6 }}>{copy.intelCurrentTurn}</div>
          {renderEntries(copy, current)}
        </div>
      ) : null}
      {memory.length > 0 ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, marginBottom: 6 }}>{copy.intelMemory}</div>
          {renderEntries(copy, memory)}
        </div>
      ) : null}
    </>
  );
}
