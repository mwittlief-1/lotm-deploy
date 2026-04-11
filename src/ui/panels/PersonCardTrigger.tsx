import React from "react";

import { PLAY_SCREEN_THEME } from "../playScreenTheme";

type PersonCardTriggerProps = {
  children: React.ReactNode;
  personId: string;
  onOpenPersonCard: (personId: string) => void;
};

export function PersonCardTrigger({ children, personId, onOpenPersonCard }: PersonCardTriggerProps) {
  return (
    <button
      data-person-card-open={personId}
      onClick={() => onOpenPersonCard(personId)}
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
