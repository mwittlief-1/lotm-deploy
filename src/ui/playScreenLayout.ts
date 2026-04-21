export const PLAY_SCREEN_CARD_ORDER = [
  "council_agenda",
  "diff_ledger",
  "manor_state",
  "turn_report",
  "portfolio_overview",
  "prospects",
  "known_houses",
  "intel",
  "events",
  "decisions",
  "debug_relationships"
] as const;

export type PlayScreenCardId = (typeof PLAY_SCREEN_CARD_ORDER)[number];

export type StickyResourceChip = {
  id: "food" | "coin" | "unrest";
  label: string;
  value: string;
  delta: string | null;
  tone: "neutral" | "caution" | "danger";
};

type StickyResourceChipArgs = {
  manor: {
    bushels_stored: number;
    coin: number;
    unrest: number;
  };
  deltaBushels: number;
  deltaCoin: number;
  deltaUnrest: number;
  fmtSigned: (value: number) => string;
};

function deltaLabel(value: number, fmtSigned: (value: number) => string): string | null {
  return value === 0 ? null : `Delta ${fmtSigned(value)}`;
}

function unrestTone(unrest: number, deltaUnrest: number): "neutral" | "caution" | "danger" {
  if (unrest >= 75 || deltaUnrest >= 10) return "danger";
  if (unrest >= 40 || deltaUnrest > 0) return "caution";
  return "neutral";
}

export function buildStickyResourceChips({
  manor,
  deltaBushels,
  deltaCoin,
  deltaUnrest,
  fmtSigned
}: StickyResourceChipArgs): StickyResourceChip[] {
  return [
    {
      id: "food",
      label: "Food Stores",
      value: `${manor.bushels_stored} bushels`,
      delta: deltaLabel(deltaBushels, fmtSigned),
      tone: deltaBushels < 0 ? "caution" : "neutral"
    },
    {
      id: "coin",
      label: "Coin",
      value: `${manor.coin}`,
      delta: deltaLabel(deltaCoin, fmtSigned),
      tone: deltaCoin < 0 ? "caution" : "neutral"
    },
    {
      id: "unrest",
      label: "Unrest",
      value: `${manor.unrest}/100`,
      delta: deltaLabel(deltaUnrest, fmtSigned),
      tone: unrestTone(manor.unrest, deltaUnrest)
    }
  ];
}
