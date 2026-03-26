import React from "react";

import {
  PLAY_SCREEN_EYEBROW_STYLE,
  PLAY_SCREEN_HEADER_HELPER_STYLE,
  PLAY_SCREEN_SIGIL_STYLE,
  PLAY_SCREEN_THEME,
  PLAY_SCREEN_TIMING_PILL_STYLE
} from "../playScreenTheme";

type SectionHeadingProps = {
  action?: React.ReactNode;
  helper?: string;
  sigil: string;
  timingLabel?: string;
  title: string;
};

export function SectionHeading({ action, helper, sigil, timingLabel, title }: SectionHeadingProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={PLAY_SCREEN_SIGIL_STYLE}>{sigil}</span>
          {timingLabel ? <span style={PLAY_SCREEN_TIMING_PILL_STYLE}>{timingLabel}</span> : null}
        </div>
        <h3 style={{ margin: "8px 0 0", fontFamily: PLAY_SCREEN_THEME.bodyFont, fontSize: 24, fontWeight: 700 }}>{title}</h3>
        {helper ? <div style={{ ...PLAY_SCREEN_HEADER_HELPER_STYLE, marginTop: 6 }}>{helper}</div> : null}
      </div>
      {action ? <div style={{ ...PLAY_SCREEN_EYEBROW_STYLE, color: PLAY_SCREEN_THEME.ink }}>{action}</div> : null}
    </div>
  );
}
