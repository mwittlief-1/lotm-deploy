import type { PersonCardRegistry, PersonCardView as PersonCardViewRecord, RunState } from "../sim/types";
import { buildPersonSecondaryIdentifier } from "./identityLabels";

export type PersonCardRouteOrigin = "household" | "roster" | "prospects" | "known_houses" | "house_dossier" | "person_card";

export type PersonCardRoute = {
  origin: PersonCardRouteOrigin;
  personId: string;
};

export type PersonCardOverviewCard = {
  detail: string;
  id: string;
  label: string;
  value: string;
};

export type PersonCardRelativeSurface = {
  detail: string;
  personId: string;
  title: string;
};

export type PersonCardFamilySection = {
  emptyLabel: string;
  entries: PersonCardRelativeSurface[];
  id: "parents" | "spouse" | "siblings" | "children";
  title: string;
};

export type PersonCardOfficeSurface = {
  detail: string;
  id: string;
  title: string;
};

export type PersonCardServiceSurface = {
  detail: string;
  id: string;
  title: string;
};

export type PersonCardRelationshipSurface = {
  allegiance: number;
  detail: string;
  directionLabel: string;
  id: string;
  personId: string | null;
  respect: number;
  threat: number;
  title: string;
  totalScore: number;
};

export type PersonCardDebugRowSurface = {
  key: string;
  label: string;
  value: string;
};

export type PersonCardSurface = {
  debugRows: PersonCardDebugRowSurface[];
  familySections: PersonCardFamilySection[];
  helperText: string;
  officeAssignments: PersonCardOfficeSurface[];
  overviewCards: PersonCardOverviewCard[];
  personId: string;
  personName: string;
  relationshipCount: number;
  relationshipHelperText: string;
  relationshipRows: PersonCardRelationshipSurface[];
  schemaVersion: string;
  serviceEntries: PersonCardServiceSurface[];
  subtitle: string;
};

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function formatToken(value: string | null | undefined): string {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token) return "Unknown";
  return token
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatList(values: Iterable<string>): string {
  const items = [...values].filter((value) => value.trim().length > 0);
  return items.length > 0 ? items.join(", ") : "None";
}

function formatBoolean(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatManorLabel(manorId: string | null): string {
  if (!manorId) return "Unmapped";
  const match = manorId.match(/hx_(\d+)/);
  return match ? `Hx ${match[1]}` : manorId;
}

function houseHoldingsStatusLabel(status: PersonCardViewRecord["lands_held_projection"]["house_holdings_status"]): string {
  if (status === "player_anchor_known") return "Player anchor footprint";
  if (status === "coarse_house_only") return "Coarse house footprint";
  return "No house footprint";
}

function personalHoldingsStatusLabel(status: PersonCardViewRecord["lands_held_projection"]["personal_holdings_status"]): string {
  if (status === "not_exposed_on_this_seam") return "Personal holdings not exposed";
  return "No personal holdings context";
}

function houseDisplayName(previewState: RunState | null | undefined, houseId: string | null, fallbackName?: string | null): string {
  if (!houseId) return "No house recorded";
  const previewRecord = asRecord(previewState);
  const playerHouseId = readString(previewRecord?.player_house_id);
  const houses = asRecord(previewRecord?.houses);
  const houseRecord = asRecord(houses?.[houseId]);
  const explicitName =
    readString(houseRecord?.house_name) ??
    readString(houseRecord?.name) ??
    readString(houseRecord?.houseName) ??
    readString(fallbackName);

  if (explicitName && explicitName !== houseId) return `House ${explicitName}`;
  if (playerHouseId && houseId === playerHouseId) return "Player house";
  return houseId;
}

function readPersonCardRegistry(previewState: RunState | null | undefined): PersonCardRegistry | null {
  const registry = (previewState as any)?.person_card_registry;
  const record = asRecord(registry);
  if (!record) return null;
  if (readString(record.schema_version) !== "person_card_registry_v1") return null;
  if (!Array.isArray(record.person_ids)) return null;
  return registry as PersonCardRegistry;
}

function readPersonCardView(
  previewState: RunState | null | undefined,
  personId: string
): PersonCardViewRecord | null {
  const registry = readPersonCardRegistry(previewState);
  const entry = registry?.entries_by_person_id?.[personId];
  return entry && typeof entry === "object" ? entry : null;
}

function relativeDetail(
  previewState: RunState | null | undefined,
  relative: PersonCardViewRecord["family_projection"]["parents"][number]
): string {
  const detailParts = [
    relative.sex ? formatToken(relative.sex) : null,
    relative.age !== null ? `Age ${relative.age}` : null,
    relative.house_id ? houseDisplayName(previewState, relative.house_id, relative.house_name) : null,
    relative.alive ? "Alive" : "Deceased",
    relative.married_out ? "Married out" : null
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
  return detailParts.join(" · ");
}

function familySection(
  previewState: RunState | null | undefined,
  id: PersonCardFamilySection["id"],
  title: string,
  relatives: PersonCardViewRecord["family_projection"]["parents"],
  emptyLabel: string
): PersonCardFamilySection {
  return {
    emptyLabel,
    entries: relatives.map((relative) => ({
      detail: relativeDetail(previewState, relative),
      personId: relative.person_id,
      title: relative.person_name
    })),
    id,
    title
  };
}

function officeAssignments(record: PersonCardViewRecord): PersonCardOfficeSurface[] {
  return record.office_assignments.map((assignment) => {
    const detail = [
      assignment.scope ? `Scope ${formatToken(assignment.scope)}` : null,
      assignment.owner_actor_id ? `Owner ${assignment.owner_actor_id}` : null,
      assignment.holder_kind ? `Holder ${formatToken(assignment.holder_kind)}` : null,
      assignment.payment_basis ? `Payment ${formatToken(assignment.payment_basis)}` : null,
      assignment.active_service_record_id ? `Service ${assignment.active_service_record_id}` : null
    ].filter((value): value is string => typeof value === "string" && value.length > 0);

    return {
      detail: detail.join(" · "),
      id: assignment.seat_id ?? `${assignment.title}:${assignment.owner_actor_id ?? "none"}`,
      title: assignment.title
    };
  });
}

function formatTurnRange(startTurnIndex: number | null, endTurnIndex: number | null, active: boolean): string {
  if (active) return startTurnIndex === null ? "Active now" : `Active since turn ${startTurnIndex}`;
  if (startTurnIndex === null && endTurnIndex === null) return "Historic service";
  if (startTurnIndex === null) return `Ended turn ${endTurnIndex}`;
  if (endTurnIndex === null) return `Started turn ${startTurnIndex}`;
  return `Turn ${startTurnIndex} to ${endTurnIndex}`;
}

function serviceEntries(record: PersonCardViewRecord): PersonCardServiceSurface[] {
  return record.service_timeline.entries.map((entry) => {
    const detailParts = [
      formatTurnRange(entry.start_turn_index, entry.end_turn_index, entry.active),
      entry.source_kind === "court_service_record" ? "Court service" : "Service record",
      entry.payment_basis ? `Payment ${formatToken(entry.payment_basis)}` : null,
      entry.serve_at_actor_id ? `At ${entry.serve_at_actor_id}` : null
    ].filter((value): value is string => typeof value === "string" && value.length > 0);

    return {
      detail: detailParts.join(" · "),
      id: entry.record_id,
      title: entry.title
    };
  });
}

function actorDisplayLabel(previewState: RunState | null | undefined, actorId: string): { personId: string | null; title: string } {
  const previewRecord = asRecord(previewState);
  const people = asRecord(previewRecord?.people);
  const personRecord = asRecord(people?.[actorId]);
  if (personRecord) {
    return {
      personId: actorId,
      title: readString(personRecord.name) ?? actorId
    };
  }

  const houses = asRecord(previewRecord?.houses);
  const houseRecord = asRecord(houses?.[actorId]);
  if (houseRecord) {
    return {
      personId: null,
      title: houseDisplayName(previewState, actorId)
    };
  }

  return { personId: null, title: actorId };
}

function relationshipRows(
  previewState: RunState | null | undefined,
  personId: string
): { count: number; rows: PersonCardRelationshipSurface[] } {
  const relationships = Array.isArray((previewState as any)?.relationships)
    ? ((previewState as any).relationships as Array<Record<string, unknown>>)
    : [];

  const rows = relationships
    .map((edge) => {
      const fromId = readString(edge.from_id);
      const toId = readString(edge.to_id);
      if (!fromId || !toId) return null;
      if (fromId !== personId && toId !== personId) return null;

      const otherId = fromId === personId ? toId : fromId;
      const other = actorDisplayLabel(previewState, otherId);
      const directionLabel = fromId === personId ? "From this person" : "Toward this person";
      const allegiance = readNumber(edge.allegiance) ?? 0;
      const respect = readNumber(edge.respect) ?? 0;
      const threat = readNumber(edge.threat) ?? 0;
      const totalScore = allegiance + respect + threat;

      return {
        allegiance,
        detail: `A ${allegiance} · R ${respect} · T ${threat}`,
        directionLabel,
        id: `${fromId}|${toId}`,
        personId: other.personId,
        respect,
        threat,
        title: other.title,
        totalScore
      };
    })
    .filter((row): row is PersonCardRelationshipSurface => row !== null);

  rows.sort(
    (left, right) =>
      right.totalScore - left.totalScore ||
      compareText(left.title, right.title) ||
      compareText(left.id, right.id)
  );

  return {
    count: rows.length,
    rows: rows.slice(0, 12)
  };
}

function debugRows(
  previewState: RunState | null | undefined,
  record: PersonCardViewRecord,
  relationshipCount: number
): PersonCardDebugRowSurface[] {
  const currentHouseLabel = houseDisplayName(previewState, record.current_house_id, record.current_house_name);
  const birthHouseLabel = houseDisplayName(previewState, record.birth_house_id, record.birth_house_name);
  const residence = record.residence_binding;

  return [
    { key: "schema_version", label: "schema_version", value: record.schema_version },
    { key: "person_id", label: "person_id", value: record.person_id },
    { key: "person_name", label: "person_name", value: record.person_name },
    { key: "short_id", label: "short_id", value: record.short_id ?? "None" },
    { key: "alive", label: "alive", value: formatBoolean(record.alive) },
    { key: "sex", label: "sex", value: record.sex ?? "Unknown" },
    { key: "age", label: "age", value: record.age === null ? "Unknown" : String(record.age) },
    { key: "current_house", label: "current_house", value: currentHouseLabel },
    { key: "birth_house", label: "birth_house", value: birthHouseLabel },
    { key: "court_member", label: "court_member", value: formatBoolean(record.court_member) },
    { key: "court_roles", label: "court_roles", value: formatList(record.court_role_labels) },
    {
      key: "known_house_relevance",
      label: "known_house_relevance",
      value: `${record.known_house_relevance_tier ?? "None"} · ${formatList(record.known_house_relevance_reasons)}`
    },
    { key: "married_out", label: "married_out", value: formatBoolean(record.married_out) },
    { key: "residence_manor_id", label: "residence_manor_id", value: residence.residence_manor_id ?? "None" },
    { key: "selector_contexts", label: "selector_contexts", value: formatList(residence.selector_contexts) },
    { key: "source_kind", label: "source_kind", value: residence.source_kind ?? "None" },
    { key: "source_ref_id", label: "source_ref_id", value: residence.source_ref_id ?? "None" },
    {
      key: "distance",
      label: "distance",
      value:
        residence.travel_cost_distance === null && residence.route_hop_distance === null
          ? "Unavailable"
          : `travel ${residence.travel_cost_distance ?? "?"} / hops ${residence.route_hop_distance ?? "?"}`
    },
    {
      key: "family_person_ids",
      label: "family_person_ids",
      value: formatList(record.family_projection.family_person_ids)
    },
    {
      key: "succession_projection",
      label: "succession_projection",
      value: [
        `line ${record.succession_projection.line_position ?? "None"}`,
        `adult line ${record.succession_projection.adult_line_position ?? "None"}`,
        `claimant ${record.succession_projection.claimant_position ?? "None"}`,
        `adult claimant ${record.succession_projection.claimant_adult_position ?? "None"}`,
        `current heir ${record.succession_projection.current_heir_id ?? "None"}`,
        `adult successor ${record.succession_projection.adult_successor_id ?? "None"}`
      ].join(" · ")
    },
    {
      key: "office_assignments",
      label: "office_assignments",
      value: record.office_assignments.length === 0 ? "None" : String(record.office_assignments.length)
    },
    {
      key: "service_entries",
      label: "service_entries",
      value: record.service_timeline.entries.length === 0 ? "None" : String(record.service_timeline.entries.length)
    },
    {
      key: "lands_held_projection",
      label: "lands_held_projection",
      value: [
        `count ${record.lands_held_projection.holdings_count}`,
        formatToken(record.lands_held_projection.holdings_band),
        houseHoldingsStatusLabel(record.lands_held_projection.house_holdings_status),
        personalHoldingsStatusLabel(record.lands_held_projection.personal_holdings_status),
        `anchor ${record.lands_held_projection.anchor_manor_id ?? "None"}`,
        `known ${formatList(record.lands_held_projection.known_manor_ids)}`
      ].join(" · ")
    },
    {
      key: "relationship_rows",
      label: "relationship_rows",
      value: String(relationshipCount)
    }
  ];
}

export function createPersonCardRoute(personId: string, origin: PersonCardRouteOrigin): PersonCardRoute {
  return {
    origin,
    personId
  };
}

export function listPersonCardIds(previewState: RunState | null | undefined): string[] {
  const registry = readPersonCardRegistry(previewState);
  return registry ? [...registry.person_ids] : [];
}

export function buildPersonCardSurface(
  previewState: RunState | null | undefined,
  personId: string | null | undefined
): PersonCardSurface | null {
  const targetPersonId = typeof personId === "string" ? personId.trim() : "";
  if (!targetPersonId) return null;

  const record = readPersonCardView(previewState, targetPersonId);
  if (!record) return null;

  const currentHouseLabel = houseDisplayName(previewState, record.current_house_id, record.current_house_name);
  const birthHouseLabel = houseDisplayName(previewState, record.birth_house_id, record.birth_house_name);
  const residence = record.residence_binding;
  const residenceValue =
    residence.residence_manor_id !== null
      ? formatManorLabel(residence.residence_manor_id)
      : residence.source_kind === "external_house_unmapped"
        ? "External house"
        : "Unmapped";
  const residenceDetail = [
    residence.selector_contexts.length > 0 ? `Contexts ${residence.selector_contexts.join(", ")}` : null,
    residence.source_kind ? `Source ${formatToken(residence.source_kind)}` : null,
    residence.travel_cost_distance !== null ? `Travel ${residence.travel_cost_distance}` : null,
    residence.route_hop_distance !== null ? `Hops ${residence.route_hop_distance}` : null,
    "Residence routing keeps travel and court reach tied to one bounded seam."
  ].filter((value): value is string => typeof value === "string" && value.length > 0).join(" · ");

  const roleValue = record.court_member ? "Court-linked" : "Outside court";
  const roleDetail = [
    record.court_role_labels.length > 0 ? record.court_role_labels.join(", ") : "No active court roles",
    record.married_out ? "Married out" : null
  ].filter((value): value is string => typeof value === "string" && value.length > 0).join(" · ");

  const successionValue =
    record.succession_projection.current_heir
      ? "Current heir"
      : record.succession_projection.claim_window_open
        ? "Claim window open"
        : "No active claim";
  const successionDetail = [
    record.succession_projection.line_position !== null
      ? `Line ${record.succession_projection.line_position}`
      : null,
    record.succession_projection.adult_line_position !== null
      ? `Adult line ${record.succession_projection.adult_line_position}`
      : null,
    record.succession_projection.current_heir_id
      ? `Current heir ${record.succession_projection.current_heir_id}`
      : null,
    record.succession_projection.blocked_by_current_heir ? "Blocked by current heir" : null
  ].filter((value): value is string => typeof value === "string" && value.length > 0).join(" · ");

  const landsValue =
    record.lands_held_projection.house_holdings_status === "player_anchor_known"
      ? "Known footprint"
      : record.lands_held_projection.house_holdings_status === "coarse_house_only"
        ? "House-level footprint"
        : "No house recorded";
  const landsDetail = [
    record.lands_held_projection.holdings_count > 0
      ? `${record.lands_held_projection.holdings_count} house holding${record.lands_held_projection.holdings_count === 1 ? "" : "s"}`
      : null,
    formatToken(record.lands_held_projection.holdings_band),
    houseHoldingsStatusLabel(record.lands_held_projection.house_holdings_status),
    personalHoldingsStatusLabel(record.lands_held_projection.personal_holdings_status),
    record.lands_held_projection.anchor_manor_id
      ? `Anchor ${formatManorLabel(record.lands_held_projection.anchor_manor_id)}`
      : record.lands_held_projection.house_holdings_status === "coarse_house_only"
        ? "Anchor manor absent by contract"
        : "No anchor manor",
    record.lands_held_projection.known_manor_ids.length > 0
      ? `Known ${record.lands_held_projection.known_manor_ids.map((manorId) => formatManorLabel(manorId)).join(", ")}`
      : record.lands_held_projection.house_holdings_status === "coarse_house_only"
        ? "Known manor ids stay absent on external house cards"
        : null
  ].filter((value): value is string => typeof value === "string" && value.length > 0).join(" · ");

  const { count: relationshipCount, rows: relationshipRowsVisible } = relationshipRows(previewState, targetPersonId);

  return {
    debugRows: debugRows(previewState, record, relationshipCount),
    familySections: [
      familySection(previewState, "parents", "Parents", record.family_projection.parents, "No parents recorded."),
      familySection(
        previewState,
        "spouse",
        "Spouse",
        record.family_projection.spouse ? [record.family_projection.spouse] : [],
        "No living spouse recorded."
      ),
      familySection(previewState, "siblings", "Siblings", record.family_projection.siblings, "No siblings recorded."),
      familySection(previewState, "children", "Children", record.family_projection.children, "No children recorded.")
    ],
    helperText:
      "This modal stays on the accepted person-card seam. Residence and holding context show what the player actually knows about this person without implying personal control that the sim does not model yet.",
    officeAssignments: officeAssignments(record),
    overviewCards: [
      {
        detail: [record.sex ? formatToken(record.sex) : null, record.age !== null ? `Age ${record.age}` : null]
          .filter((value): value is string => typeof value === "string" && value.length > 0)
          .join(" · ") || "No demographic detail recorded",
        id: "status",
        label: "Status",
        value: record.alive ? "Alive" : "Deceased"
      },
      {
        detail: `Birth house: ${birthHouseLabel}`,
        id: "house",
        label: "House",
        value: currentHouseLabel
      },
      {
        detail: residenceDetail || "No routed residence detail recorded.",
        id: "residence",
        label: "Residence",
        value: residenceValue
      },
      {
        detail: roleDetail,
        id: "roles",
        label: "Court & roles",
        value: roleValue
      },
      {
        detail: successionDetail || "No succession position recorded.",
        id: "succession",
        label: "Succession",
        value: successionValue
      },
      {
        detail: landsDetail,
        id: "lands",
        label: "Lands held",
        value: landsValue
      }
    ],
    personId: record.person_id,
    personName: record.person_name,
    relationshipCount,
    relationshipHelperText:
      relationshipCount > relationshipRowsVisible.length
        ? `Showing the strongest ${relationshipRowsVisible.length} of ${relationshipCount} direct relationship edges for this person.`
        : "Direct relationship edges stay sorted deterministically here so the person card does not hide graph state.",
    relationshipRows: relationshipRowsVisible,
    schemaVersion: record.schema_version,
    serviceEntries: serviceEntries(record),
    subtitle:
      buildPersonSecondaryIdentifier(previewState, targetPersonId) ??
      [
        record.short_id ?? null,
        currentHouseLabel,
        record.known_house_relevance_tier ? formatToken(record.known_house_relevance_tier) : null
      ]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .join(" · ")
  };
}
