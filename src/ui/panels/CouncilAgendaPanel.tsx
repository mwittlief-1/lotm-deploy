import React from "react";
import {
  PLAY_SCREEN_ACTION_BUTTON_STYLE,
  PLAY_SCREEN_PANEL_STYLE,
  PLAY_SCREEN_SECTION_SIGILS,
  PLAY_SCREEN_SUBCARD_STYLE
} from "../playScreenTheme";
import { SectionHeading } from "./SectionHeading";

type AgendaItem = {
  id: string;
  title: string;
  context: string;
  notes: string[];
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
    <div style={{ ...PLAY_SCREEN_PANEL_STYLE, marginBottom: 12 }}>
      <SectionHeading helper={copy.councilAgendaHelper} sigil={PLAY_SCREEN_SECTION_SIGILS.agenda} title={copy.councilAgendaTitle} />
      {items.length === 0 ? (
        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12, fontSize: 12, opacity: 0.82 }}>
          No court agenda items are surfaced for this turn.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((a) => (
            <div
              key={a.id}
              style={{
                ...PLAY_SCREEN_SUBCARD_STYLE,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: 10
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{a.title}</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{a.context}</div>
                {a.notes.length > 0 ? (
                  <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                    {a.notes.map((note) => (
                      <div key={note} style={{ fontSize: 11, opacity: 0.78 }}>
                        {note}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <button onClick={() => onScrollToAnchor(a.anchor)} style={{ ...PLAY_SCREEN_ACTION_BUTTON_STYLE, whiteSpace: "nowrap" }}>
                {a.cta_label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
