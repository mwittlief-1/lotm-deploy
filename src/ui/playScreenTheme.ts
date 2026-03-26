import type { CSSProperties } from "react";

import type { StickyResourceChip } from "./playScreenLayout";

export const PLAY_SCREEN_THEME = {
  bodyFont: "\"Iowan Old Style\", \"Palatino Linotype\", \"Book Antiqua\", Georgia, serif",
  labelFont: "\"Trebuchet MS\", \"Gill Sans\", \"Avenir Next Condensed\", sans-serif",
  ink: "#2f2418",
  inkMuted: "#6a5943",
  border: "#cbb89a",
  borderStrong: "#ac8f64",
  surface: "#f6efdf",
  surfaceRaised: "#fffaf1",
  surfaceInset: "#efe3cc",
  accent: "#74542f",
  accentSoft: "#ece0c9",
  accentDanger: "#924d3c",
  shadow: "0 18px 40px rgba(72, 49, 18, 0.10)"
} as const;

export const PLAY_SCREEN_PAGE_STYLE: CSSProperties = {
  padding: 18,
  maxWidth: 960,
  margin: "0 auto",
  color: PLAY_SCREEN_THEME.ink,
  fontFamily: PLAY_SCREEN_THEME.bodyFont,
  background: "linear-gradient(180deg, rgba(255, 252, 246, 0.98) 0%, rgba(244, 235, 217, 0.98) 100%)",
  border: `1px solid ${PLAY_SCREEN_THEME.border}`,
  borderRadius: 24,
  boxShadow: PLAY_SCREEN_THEME.shadow
};

export const PLAY_SCREEN_PANEL_STYLE: CSSProperties = {
  padding: 14,
  border: `1px solid ${PLAY_SCREEN_THEME.border}`,
  borderRadius: 16,
  background: `linear-gradient(180deg, ${PLAY_SCREEN_THEME.surfaceRaised} 0%, ${PLAY_SCREEN_THEME.surface} 100%)`,
  boxShadow: "0 10px 24px rgba(72, 49, 18, 0.06)"
};

export const PLAY_SCREEN_PANEL_ACCENT_STYLE: CSSProperties = {
  ...PLAY_SCREEN_PANEL_STYLE,
  borderColor: PLAY_SCREEN_THEME.borderStrong
};

export const PLAY_SCREEN_SUBCARD_STYLE: CSSProperties = {
  border: `1px solid rgba(172, 143, 100, 0.32)`,
  borderRadius: 14,
  background: PLAY_SCREEN_THEME.surfaceRaised
};

export const PLAY_SCREEN_SIGIL_STYLE: CSSProperties = {
  minWidth: 28,
  height: 28,
  padding: "0 8px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  border: `1px solid ${PLAY_SCREEN_THEME.borderStrong}`,
  background: PLAY_SCREEN_THEME.accentSoft,
  color: PLAY_SCREEN_THEME.accent,
  fontFamily: PLAY_SCREEN_THEME.labelFont,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: "uppercase"
};

export const PLAY_SCREEN_TIMING_PILL_STYLE: CSSProperties = {
  padding: "3px 10px",
  borderRadius: 999,
  border: `1px solid rgba(172, 143, 100, 0.5)`,
  background: "rgba(255, 250, 241, 0.9)",
  color: PLAY_SCREEN_THEME.inkMuted,
  fontFamily: PLAY_SCREEN_THEME.labelFont,
  fontSize: 11,
  letterSpacing: 0.5,
  textTransform: "uppercase"
};

export const PLAY_SCREEN_EYEBROW_STYLE: CSSProperties = {
  fontFamily: PLAY_SCREEN_THEME.labelFont,
  fontSize: 11,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: PLAY_SCREEN_THEME.inkMuted
};

export const PLAY_SCREEN_TITLE_STYLE: CSSProperties = {
  margin: "6px 0 0",
  fontFamily: PLAY_SCREEN_THEME.bodyFont,
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: -0.4
};

export const PLAY_SCREEN_HEADER_HELPER_STYLE: CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  lineHeight: 1.45,
  color: PLAY_SCREEN_THEME.inkMuted
};

export const PLAY_SCREEN_ACTION_BUTTON_STYLE: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: `1px solid ${PLAY_SCREEN_THEME.borderStrong}`,
  background: PLAY_SCREEN_THEME.accentSoft,
  color: PLAY_SCREEN_THEME.ink,
  fontFamily: PLAY_SCREEN_THEME.labelFont,
  fontWeight: 700,
  letterSpacing: 0.3,
  cursor: "pointer"
};

export const PLAY_SCREEN_SECONDARY_BUTTON_STYLE: CSSProperties = {
  ...PLAY_SCREEN_ACTION_BUTTON_STYLE,
  background: PLAY_SCREEN_THEME.surfaceRaised,
  borderColor: PLAY_SCREEN_THEME.border
};

export const PLAY_SCREEN_SECTION_SIGILS = {
  agenda: "AG",
  ledger: "LD",
  state: "ST",
  report: "RP",
  decisions: "DO",
  receipts: "EX"
} as const;

export const PLAY_SCREEN_CHIP_SIGILS: Record<StickyResourceChip["id"], string> = {
  food: "FD",
  coin: "CN",
  unrest: "UR"
};

export function chipSigilForId(chipId: StickyResourceChip["id"]): string {
  return PLAY_SCREEN_CHIP_SIGILS[chipId];
}
