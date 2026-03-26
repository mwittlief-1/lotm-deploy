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
            </div>
            <button onClick={() => onScrollToAnchor(a.anchor)} style={{ ...PLAY_SCREEN_ACTION_BUTTON_STYLE, whiteSpace: "nowrap" }}>
              {a.cta_label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
