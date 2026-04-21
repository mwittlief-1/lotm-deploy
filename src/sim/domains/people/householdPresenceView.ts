import { buildCourtRoster_v0_2_4 } from "../../court";
import { registryPersonFor } from "../../actors";
import type {
  HouseholdPresenceEntryV1,
  HouseholdPresenceKindV1,
  HouseholdPresenceViewV1,
  RunState,
} from "../../types";
import { buildEconomyObligationsView, type EconomyObligationsViewV1 } from "../experience/obligationsView";
import { buildCourtProvisioningView, type CourtProvisioningView } from "./courtProvisioningRegistry";
import { buildPersonCardRegistry } from "./personCardRegistry";

export const HOUSEHOLD_PRESENCE_VIEW_SCHEMA_VERSION = "household_presence_view_v1" as const;
const HOUSEHOLD_PRESENCE_ENTRY_SCHEMA_VERSION = "household_presence_entry_v1" as const;

type PersonCardRegistry = ReturnType<typeof buildPersonCardRegistry>;
type PersonCardView = PersonCardRegistry["entries_by_person_id"][string];

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortStrings(values: Iterable<string>): string[] {
  return [...values].sort(compareText);
}

function attachHiddenSurface(target: object | null | undefined, key: string, value: unknown): void {
  if (!target || typeof target !== "object") return;
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    writable: true,
    configurable: true,
  });
}

function findLastSuccession(state: RunState): { turn_index: number; new_ruler_name: string } | null {
  const log = Array.isArray(state.log) ? state.log : [];
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const entries = Array.isArray((log[i] as any)?.report?.house_log) ? (log[i] as any).report.house_log : [];
    for (let j = entries.length - 1; j >= 0; j -= 1) {
      const entry = entries[j];
      if (entry?.kind !== "succession") continue;
      if (typeof entry?.turn_index !== "number" || typeof entry?.new_ruler_name !== "string") continue;
      return {
        turn_index: Math.trunc(entry.turn_index),
        new_ruler_name: entry.new_ruler_name,
      };
    }
  }
  return null;
}

function turnoverNoteForPerson(state: RunState, personId: string): string | null {
  const registry = (state.house as any)?.court_office_registry;
  const seatIds = Array.isArray(registry?.seat_ids) ? (registry.seat_ids as string[]) : [];
  for (const seatId of seatIds) {
    const seat = registry?.seats_by_id?.[seatId];
    if (!seat || seat.holder_person_id !== personId) continue;
    if (typeof seat.last_transition_turn_index !== "number") continue;
    if (Math.trunc(seat.last_transition_turn_index) !== Math.trunc(state.turn_index)) continue;
    const title = typeof seat.title === "string" && seat.title.length > 0 ? seat.title : seat.seat_key ?? "Court office";
    return `${title} changed hands this turn.`;
  }
  return null;
}

function successionNoteForPerson(state: RunState, personId: string, recentSuccession: HouseholdPresenceViewV1["recent_succession"]): string | null {
  if (!recentSuccession) return null;
  if (state.house.head?.id === personId) {
    return `Current ruler since Turn ${recentSuccession.turn_index}.`;
  }
  if (state.house.heir_id === personId) {
    return `Current heir after the Turn ${recentSuccession.turn_index} succession.`;
  }
  return null;
}

function localContinuityNoteForPerson(
  personId: string,
  localRole: HouseholdPresenceEntryV1["local_role"],
  obligationsView: EconomyObligationsViewV1
): string | null {
  if (localRole !== "liege" && localRole !== "clergy") return null;

  const counterpartyKind = localRole === "liege" ? "liege" : "church";
  const summary = obligationsView.counterparty_summaries.find((entry) => entry.counterparty_kind === counterpartyKind) ?? null;
  if (!summary) return null;
  if (summary.collector_state === "active") return null;
  return summary.collector_summary;
}

function presenceKindForEntry(
  rosterRole: HouseholdPresenceEntryV1["roster_role"],
  provisioningClass: string | null,
  localRole: HouseholdPresenceEntryV1["local_role"]
): HouseholdPresenceKindV1 {
  if (localRole) return "outsider";
  if (rosterRole === "local_power") return "outsider";
  if (rosterRole === "officer") return "retainer";
  if (provisioningClass === "retainer" || provisioningClass === "realm_holder" || provisioningClass === "institutional_service") {
    return "retainer";
  }
  if (provisioningClass === "guest") return "guest";
  return "resident";
}

function presenceSummaryForEntry(args: {
  localRole: HouseholdPresenceEntryV1["local_role"];
  personName: string;
  presenceKind: HouseholdPresenceKindV1;
  provisioningClass: string | null;
  rosterRole: HouseholdPresenceEntryV1["roster_role"];
  seatLabels: string[];
}): string {
  const { localRole, personName, presenceKind, provisioningClass, rosterRole, seatLabels } = args;
  if (rosterRole === "head") return "Rules the household and anchors the court this turn.";
  if (rosterRole === "spouse") return "Shares the manor household as the current spouse.";
  if (rosterRole === "child") return "Remains in the active household line under the current ruler.";
  if (rosterRole === "married_in_spouse") {
    return "Joined the court through marriage and now counts as household family on the player path.";
  }
  if (rosterRole === "officer") {
    return `${personName} serves the court as ${seatLabels[0] ?? "an office holder"} and stays on the household path through active service.`;
  }
  if (seatLabels.length > 0 && (provisioningClass === "retainer" || provisioningClass === "realm_holder" || provisioningClass === "institutional_service")) {
    return `${personName} serves the court as ${seatLabels[0]} and stays on the household path through active service.`;
  }
  if (localRole === "liege") return "Lives outside your household but still drives local obligation and liege continuity.";
  if (localRole === "clergy") return "Lives outside your household but still anchors the local church relationship and collector continuity.";
  if (localRole === "noble") return "Lives outside your household but still matters as part of the nearby noble web.";
  if (presenceKind === "guest") return "Stays at court without a standing office or permanent household claim.";
  if (provisioningClass === "realm_holder") return "Appears here because a realm office still ties this person into the court shell.";
  return "Remains on the player-facing household path without a current office assignment.";
}

function entryForPerson(args: {
  state: RunState;
  personId: string;
  personName: string;
  rosterRole: HouseholdPresenceEntryV1["roster_role"];
  localRole: HouseholdPresenceEntryV1["local_role"];
  personCard: PersonCardView | null;
  provisioningView: CourtProvisioningView;
  recentSuccession: HouseholdPresenceViewV1["recent_succession"];
  obligationsView: EconomyObligationsViewV1;
}): HouseholdPresenceEntryV1 {
  const { state, personId, personName, rosterRole, localRole, personCard, provisioningView, recentSuccession, obligationsView } = args;
  const provisioningEntry = provisioningView.entries_by_person_id[personId] ?? null;
  const seatLabels = personCard?.office_assignments.map((assignment) => assignment.title).filter(Boolean) ?? [];
  const presenceKind = presenceKindForEntry(rosterRole, provisioningEntry?.provisioning_class ?? null, localRole);
  const householdSuccessionNote = successionNoteForPerson(state, personId, recentSuccession);
  const localContinuityNote = localContinuityNoteForPerson(personId, localRole, obligationsView);
  const successionNote = [householdSuccessionNote, localContinuityNote]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");

  return {
    schema_version: HOUSEHOLD_PRESENCE_ENTRY_SCHEMA_VERSION,
    person_id: personId,
    person_name: personName,
    presence_kind: presenceKind,
    roster_role: rosterRole,
    local_role: localRole,
    provisioning_class: provisioningEntry?.provisioning_class ?? null,
    lodging_level: provisioningEntry?.lodging_level ?? null,
    stipend_basis: provisioningEntry?.stipend_basis ?? null,
    residence_manor_id: personCard?.residence_binding.residence_manor_id ?? null,
    court_role_labels: provisioningEntry ? [...provisioningEntry.court_role_labels] : [...(personCard?.court_role_labels ?? [])],
    active_seat_ids: provisioningEntry ? [...provisioningEntry.active_seat_ids] : [],
    active_service_record_ids: provisioningEntry ? [...provisioningEntry.active_service_record_ids] : [...(personCard?.service_timeline.active_record_ids ?? [])],
    presence_summary: presenceSummaryForEntry({
      localRole,
      personName,
      presenceKind,
      provisioningClass: provisioningEntry?.provisioning_class ?? null,
      rosterRole,
      seatLabels
    }),
    turnover_note: turnoverNoteForPerson(state, personId),
    succession_note: successionNote.length > 0 ? successionNote : null,
  };
}

export function buildHouseholdPresenceView(
  state: RunState,
  personCards: PersonCardRegistry = buildPersonCardRegistry(state),
  provisioningView: CourtProvisioningView = buildCourtProvisioningView(state, personCards)
): HouseholdPresenceViewV1 {
  const roster = buildCourtRoster_v0_2_4(state);
  const recentSuccession = findLastSuccession(state);
  const obligationsView = buildEconomyObligationsView(state);
  const entriesByPersonId: Record<string, HouseholdPresenceEntryV1> = {};
  const entryOrder: string[] = [];

  const pushEntry = (
    personId: string | null | undefined,
    rosterRole: HouseholdPresenceEntryV1["roster_role"],
    localRole: HouseholdPresenceEntryV1["local_role"] = null
  ) => {
    if (!personId || typeof personId !== "string") return;
    const person = registryPersonFor(state, personId);
    if (!person) return;
    if (entryOrder.includes(personId)) {
      if (!localRole) return;
      const existingEntry = entriesByPersonId[personId];
      if (!existingEntry || existingEntry.local_role) return;
      const mergedRosterRole =
        existingEntry.roster_role === "resident" || existingEntry.roster_role === "local_power"
          ? "local_power"
          : existingEntry.roster_role;
      entriesByPersonId[personId] = entryForPerson({
        state,
        personId,
        personName: person.name ?? personId,
        rosterRole: mergedRosterRole,
        localRole,
        personCard: personCards.entries_by_person_id[personId] ?? null,
        provisioningView,
        recentSuccession,
        obligationsView
      });
      return;
    }
    entryOrder.push(personId);
    entriesByPersonId[personId] = entryForPerson({
      state,
      personId,
      personName: person.name ?? personId,
      rosterRole,
      localRole,
      personCard: personCards.entries_by_person_id[personId] ?? null,
      provisioningView,
      recentSuccession,
      obligationsView
    });
  };

  for (const row of roster.rows) {
    pushEntry(row.person_id, row.role);
  }

  const localEntries: Array<{ personId: string | null; localRole: HouseholdPresenceEntryV1["local_role"] }> = [
    { personId: state.locals?.liege?.id ?? null, localRole: "liege" },
    { personId: state.locals?.clergy?.id ?? null, localRole: "clergy" },
    ...((Array.isArray(state.locals?.nobles) ? state.locals.nobles : []).map((person) => ({
      personId: person?.id ?? null,
      localRole: "noble" as const
    })))
  ];

  for (const entry of localEntries.sort((left, right) => compareText(left.personId ?? "", right.personId ?? ""))) {
    pushEntry(entry.personId, "local_power", entry.localRole);
  }

  return {
    schema_version: HOUSEHOLD_PRESENCE_VIEW_SCHEMA_VERSION,
    generated_at_turn_index: Math.trunc(state.turn_index),
    entry_order: entryOrder,
    entries_by_person_id: entriesByPersonId,
    recent_succession: recentSuccession
  };
}

export function attachHouseholdPresenceView(target: RunState, householdPresenceView: HouseholdPresenceViewV1): void {
  attachHiddenSurface(target as object, "household_presence_view", householdPresenceView);
  attachHiddenSurface((target as any)?.house as object, "household_presence_view", householdPresenceView);
}
