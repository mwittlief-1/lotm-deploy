import React from "react";
import { splitWhyNotes } from "../viewHelpers";

type EventsPanelProps = {
  anchorId: string;
  copy: any;
  events: any[];
};

export function EventsPanel({ anchorId, copy, events }: EventsPanelProps) {
  return (
    <>
      <h4 id={anchorId} style={{ marginTop: 12 }}>Events</h4>
      {events.length === 0 ? <div>None</div> : null}
      {events.map((e) => {
        const { player } = splitWhyNotes(e.why.notes);
        return (
          <div key={e.id} style={{ padding: 8, border: "1px solid #ddd", marginBottom: 6 }}>
            <div>
              <b>{e.title}</b> <span style={{ opacity: 0.7 }}>({e.category})</span>
            </div>

            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
              <b>{copy.prospectConfidenceLabel}</b> {copy.prospectConfidence_known}
            </div>

            {player.length ? (
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6 }}>
                <b>Why:</b>
                <ul style={{ margin: "4px 0 0 18px" }}>
                  {player.map((n, idx) => (
                    <li key={idx}>{n}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <ul style={{ marginTop: 6 }}>
              {e.effects.map((t: string, idx: number) => (
                <li key={idx}>{t}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}
