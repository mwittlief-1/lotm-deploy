import type { HouseholdPresenceEntryV1, HouseholdPresenceViewV1, RunState } from "../sim/types";

export type HouseholdPresenceEntrySurface = {
  detail: string;
  personId: string;
  personName: string;
  presenceLabel: string;
  reason: string;
  successionNote: string | null;
  turnoverNote: string | null;
};

export type HouseholdPresenceSurface = {
  entries: HouseholdPresenceEntrySurface[];
  helperText: string;
  recentSuccessionSummary: string | null;
  schemaVersion: string;
};

function formatToken(value: string | null | undefined): string {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token) return "Unknown";
  return token
    .split(/[._]/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readHouseholdPresenceView(previewState: RunState | null | undefined): HouseholdPresenceViewV1 | null {
  const value =
    (previewState as any)?.household_presence_view ??
    (previewState as any)?.house?.household_presence_view ??
    null;
  if (!value || typeof value !== "object") return null;
  return value.schema_version === "household_presence_view_v1" ? (value as HouseholdPresenceViewV1) : null;
}

function detailForEntry(entry: HouseholdPresenceEntryV1): string {
  const parts = [
    `Presence ${formatToken(entry.presence_kind)}`,
    entry.local_role ? `Local ${formatToken(entry.local_role)}` : null,
    entry.provisioning_class ? `Provisioning ${formatToken(entry.provisioning_class)}` : null,
    entry.court_role_labels.length > 0 ? `Court ${entry.court_role_labels.join(", ")}` : null,
    entry.lodging_level ? `Lodging ${formatToken(entry.lodging_level)}` : null,
    entry.stipend_basis ? `Support ${formatToken(entry.stipend_basis)}` : null,
    entry.residence_manor_id ? `Residence ${entry.residence_manor_id}` : null
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
  return parts.join(" · ");
}

export function buildHouseholdPresenceSurface(
  previewState: RunState | null | undefined
): HouseholdPresenceSurface | null {
  const view = readHouseholdPresenceView(previewState);
  if (!view) return null;

  return {
    entries: view.entry_order
      .map((personId) => view.entries_by_person_id[personId] ?? null)
      .filter((entry): entry is HouseholdPresenceEntryV1 => entry !== null)
      .map((entry) => ({
        detail: detailForEntry(entry),
        personId: entry.person_id,
        personName: entry.person_name,
        presenceLabel: formatToken(entry.presence_kind),
        reason: entry.presence_summary,
        successionNote: entry.succession_note,
        turnoverNote: entry.turnover_note,
      })),
    helperText:
      "Presence explains why each resident, guest, retainer, or outsider still appears on the player household path, using the same household and provisioning truth surfaced elsewhere.",
    recentSuccessionSummary: view.recent_succession
      ? `Recent succession: Turn ${view.recent_succession.turn_index} — ${view.recent_succession.new_ruler_name}.`
      : null,
    schemaVersion: view.schema_version
  };
}
