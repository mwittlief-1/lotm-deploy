import React from "react";

import { PLAY_SCREEN_THEME } from "../playScreenTheme";

type HouseDossierTriggerProps = {
  children: React.ReactNode;
  houseId: string;
  onOpenHouseDossier: (houseId: string) => void;
};

export function HouseDossierTrigger({ children, houseId, onOpenHouseDossier }: HouseDossierTriggerProps) {
  return (
    <button
      data-house-dossier-open={houseId}
      onClick={() => onOpenHouseDossier(houseId)}
      style={{
        padding: 0,
        border: "none",
        background: "none",
        color: PLAY_SCREEN_THEME.accent,
        cursor: "pointer",
        font: "inherit",
        textDecoration: "underline",
        textDecorationThickness: "0.08em",
        textUnderlineOffset: "0.12em"
      }}
      type="button"
    >
      {children}
    </button>
  );
}
