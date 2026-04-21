import type { BoundedHouseDossierSummary, HouseDossierSummary, RunState } from "../sim/types";

export type HouseDossierRecord = HouseDossierSummary | BoundedHouseDossierSummary;

export type HouseDossierDebugRowSurface = {
  key: string;
  label: string;
  value: string;
};

export type HouseDossierRelatedPersonSurface = {
  detail: string;
  personId: string;
  title: string;
};

export type HouseDossierRelationshipMovementSurface = {
  causeLabel: string;
  detail: string;
  directionLabel: string;
  id: string;
  personId: string | null;
  postureShiftLabel: string;
  title: string;
  totalChange: number;
};

export type HouseDossierSurface = {
  debugRows: HouseDossierDebugRowSurface[];
  dossier: HouseDossierRecord;
  helperText: string;
  holdingsAnchorManorId: string | null;
  holdingsBandLabel: string;
  holdingsCount: number;
  holdingsFootprintHelperText: string;
  holdingsKnownManorIds: string[];
  holdingsSourceLabel: string;
  houseId: string;
  houseName: string;
  householdChildCount: number;
  householdLivingCount: number;
  householdMemberCount: number;
  householdScopeLabel: string;
  kinshipSummaryLabel: string;
  kinshipTags: string[];
  knownnessLabel: string;
  knownnessHelperText: string;
  knownnessSources: string[];
  ledgerBandLabel: string;
  ledgerTrendLabel: string;
  relevanceReasons: string[];
  relevanceTierLabel: string;
  relatedPeople: HouseDossierRelatedPersonSurface[];
  relationshipMovementCount: number;
  relationshipMovementHelperText: string;
  relationshipMovementRows: HouseDossierRelationshipMovementSurface[];
  relationshipPostureLabel: string;
  relationshipSummary:
    | {
        allegiance: number;
        favorScore: number;
        respect: number;
        standingBandLabel: string;
        standingVectorLabel: string;
        threat: number;
      }
    | null;
  schemaVersion: string;
  subtitle: string;
  successionLabel: string;
  tierLabel: string;
};

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortStrings(values: Iterable<string>): string[] {
  return [...values].filter(Boolean).sort(compareText);
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

function formatBoolean(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatTextList(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "None";
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function readStringArray(value: unknown): string[] {
  return sortStrings(
    Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      : []
  );
}

function readHouseDossiers(previewState: RunState | null | undefined): HouseDossierRecord[] {
  const raw = Array.isArray((previewState as any)?.house_dossiers)
    ? (previewState as any).house_dossiers
    : Array.isArray((previewState as any)?.house?.house_dossiers)
      ? (previewState as any).house.house_dossiers
      : [];

  return raw
    .filter(
      (entry: unknown): entry is HouseDossierRecord =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as any).house_id === "string" &&
        typeof (entry as any).schema_version === "string"
    )
    .sort((left, right) => compareText(left.house_id, right.house_id));
}

function readRelationshipSummary(dossier: HouseDossierRecord): HouseDossierSurface["relationshipSummary"] {
  const summary = (dossier as any).relationship_summary;
  if (!summary || typeof summary !== "object") return null;
  if (
    typeof summary.allegiance !== "number" ||
    typeof summary.respect !== "number" ||
    typeof summary.threat !== "number" ||
    typeof summary.favor_score !== "number"
  ) {
    return null;
  }

  return {
    allegiance: summary.allegiance,
    favorScore: summary.favor_score,
    respect: summary.respect,
    standingBandLabel: formatToken(summary.standing_band),
    standingVectorLabel: `Standing A ${summary.allegiance} / R ${summary.respect} / T ${summary.threat}`,
    threat: summary.threat
  };
}

function relationshipMovementRows(dossier: HouseDossierRecord): { count: number; rows: HouseDossierRelationshipMovementSurface[] } {
  const rows = Array.isArray((dossier as any).relationship_turn_movement_rows)
    ? ((dossier as any).relationship_turn_movement_rows as Array<Record<string, unknown>>)
        .map((row) => {
          const id = readString(row.row_id);
          const title = readString(row.counterparty_label);
          if (!id || !title) return null;

          const personId = readString(row.counterparty_person_id);
          const allegianceDelta = readNumber(row.allegiance_delta) ?? 0;
          const respectDelta = readNumber(row.respect_delta) ?? 0;
          const threatDelta = readNumber(row.threat_delta) ?? 0;

          return {
            causeLabel: readString(row.cause_summary) ?? "Relationship change",
            detail: `Turn delta A ${formatSigned(allegianceDelta)} · R ${formatSigned(respectDelta)} · T ${formatSigned(threatDelta)}`,
            directionLabel: readString(row.direction_label) ?? "Toward this house",
            id,
            personId,
            postureShiftLabel: `${formatToken(readString(row.before_standing_band))} -> ${formatToken(readString(row.after_standing_band))}`,
            title,
            totalChange: readNumber(row.magnitude) ?? (Math.abs(allegianceDelta) + Math.abs(respectDelta) + Math.abs(threatDelta)),
          } satisfies HouseDossierRelationshipMovementSurface;
        })
        .filter((row): row is HouseDossierRelationshipMovementSurface => row !== null)
    : [];

  return {
    count:
      typeof (dossier as any).relationship_turn_movement_count === "number"
        ? Math.max(0, Math.trunc((dossier as any).relationship_turn_movement_count))
        : rows.length,
    rows,
  };
}

function readKnownHouse(previewState: RunState | null | undefined, houseId: string): Record<string, unknown> | null {
  const knownHouses = Array.isArray((previewState as any)?.known_houses) ? ((previewState as any).known_houses as unknown[]) : [];
  return (
    knownHouses.find((entry) => {
      const record = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null;
      return record && record.house_id === houseId;
    }) as Record<string, unknown> | undefined
  ) ?? null;
}

function holdingsFootprintHelperText(
  holdingsSourceLabel: string,
  holdingsKnownManorIds: string[],
  holdingsAnchorManorId: string | null
): string {
  if (holdingsKnownManorIds.length > 0) {
    return `Known manor ids come from the ${holdingsSourceLabel.toLowerCase()} path. Use them as player-facing anchor context, not as a full map of every title this house controls.`;
  }
  if (holdingsAnchorManorId) {
    return `Only the anchor manor is currently exposed on this dossier. Additional manor ids are absent here, not unknown in-world rumor.`;
  }
  return `This dossier only exposes a coarse house footprint. Missing manor ids are absent by contract on this path, not an unresolved mystery row.`;
}

function knownnessHelperText(knownnessLabel: string, knownnessSources: string[]): string {
  if (knownnessSources.length === 0) {
    return `${knownnessLabel} is present without an attached source tag.`;
  }
  return `${knownnessLabel} matters because ${knownnessSources.join(", ")} is why this house is surfacing on the player's board right now.`;
}

function hasPersonCard(previewState: RunState | null | undefined, personId: string | null): boolean {
  if (!personId) return false;
  const registry = (previewState as any)?.person_card_registry;
  return Boolean(registry?.entries_by_person_id?.[personId]);
}

export function listHouseDossierIds(previewState: RunState | null | undefined): string[] {
  return readHouseDossiers(previewState).map((dossier) => dossier.house_id);
}

export function buildHouseDossierSurface(
  previewState: RunState | null | undefined,
  houseId: string | null | undefined
): HouseDossierSurface | null {
  const targetHouseId = typeof houseId === "string" ? houseId.trim() : "";
  if (!targetHouseId) return null;

  const dossier = readHouseDossiers(previewState).find((entry) => entry.house_id === targetHouseId);
  if (!dossier) return null;

  const houseName =
    typeof (dossier as any).house_name === "string" && (dossier as any).house_name.trim().length > 0
      ? (dossier as any).house_name.trim()
      : dossier.house_id;
  const tierLabel = formatToken((dossier as any).tier);
  const relevanceTierLabel = formatToken((dossier as any).relevance_tier);
  const relevanceReasons = readStringArray((dossier as any).relevance_reasons);
  const knownnessLabel = formatToken((dossier as any).knownness);
  const knownnessSources = readStringArray((dossier as any).knownness_sources);
  const kinshipSummaryLabel = formatToken((dossier as any).kinship_summary);
  const kinshipTags = readStringArray((dossier as any).kinship_tags);
  const relationshipSummary = readRelationshipSummary(dossier);
  const relationshipPostureLabel = relationshipSummary?.standingBandLabel ?? "Unknown";
  const { count: relationshipMovementCount, rows: relationshipMovementRowsVisible } = relationshipMovementRows(dossier);
  const householdScopeLabel = formatToken((dossier as any).household_scope);
  const householdMemberCount =
    typeof (dossier as any).household_member_count === "number"
      ? Math.max(0, Math.trunc((dossier as any).household_member_count))
      : 0;
  const householdLivingCount =
    typeof (dossier as any).living_member_count === "number"
      ? Math.max(0, Math.trunc((dossier as any).living_member_count))
      : 0;
  const householdChildCount =
    typeof (dossier as any).child_count === "number" ? Math.max(0, Math.trunc((dossier as any).child_count)) : 0;
  const hasMaleHeir = Boolean((dossier as any).has_male_heir);
  const heiressPossible = Boolean((dossier as any).heiress_possible);
  const holdings = (dossier as any).holdings_footprint ?? {};
  const holdingsCount =
    typeof holdings.holdings_count === "number" ? Math.max(0, Math.trunc(holdings.holdings_count)) : 0;
  const holdingsBandLabel = formatToken(holdings.holdings_band);
  const holdingsAnchorManorId =
    typeof holdings.anchor_manor_id === "string" && holdings.anchor_manor_id.trim().length > 0
      ? holdings.anchor_manor_id
      : null;
  const holdingsKnownManorIds = readStringArray(holdings.known_manor_ids);
  const holdingsSourceLabel = formatToken(holdings.source_kind);
  const holdingsFootprintNote = holdingsFootprintHelperText(
    holdingsSourceLabel,
    holdingsKnownManorIds,
    holdingsAnchorManorId
  );
  const ledgerBandLabel = formatToken((dossier as any).ledger_band);
  const ledgerTrendLabel = formatToken((dossier as any).ledger_trend);
  const successionLabel = hasMaleHeir
    ? "Male heir recorded."
    : heiressPossible
      ? "Heiress line remains possible."
      : "No direct heir signal is recorded.";
  const knownHouseRecord = readKnownHouse(previewState, dossier.house_id);
  const knownHeadId = typeof knownHouseRecord?.head_id === "string" ? knownHouseRecord.head_id : null;
  const knownHeadName =
    typeof knownHouseRecord?.head_name === "string" && knownHouseRecord.head_name.trim().length > 0
      ? knownHouseRecord.head_name.trim()
      : null;
  const relatedPeople: HouseDossierRelatedPersonSurface[] =
    knownHeadId && hasPersonCard(previewState, knownHeadId)
      ? [
          {
            detail: [
              "Known head",
              typeof knownHouseRecord?.head_status === "string" ? String(knownHouseRecord.head_status) : null,
              typeof knownHouseRecord?.head_age === "number" ? `Age ${Math.trunc(knownHouseRecord.head_age)}` : null
            ]
              .filter((value): value is string => typeof value === "string" && value.length > 0)
              .join(" · "),
            personId: knownHeadId,
            title: knownHeadName ?? knownHeadId
          }
        ]
      : [];

  const debugRows: HouseDossierDebugRowSurface[] = [
    { key: "schema_version", label: "schema_version", value: dossier.schema_version },
    { key: "house_id", label: "house_id", value: dossier.house_id },
    { key: "house_name", label: "house_name", value: houseName },
    { key: "tier", label: "tier", value: tierLabel },
    { key: "relevance_tier", label: "relevance_tier", value: relevanceTierLabel },
    { key: "relevance_reasons", label: "relevance_reasons", value: formatTextList(relevanceReasons) },
    { key: "knownness", label: "knownness", value: knownnessLabel },
    { key: "knownness_sources", label: "knownness_sources", value: formatTextList(knownnessSources) },
    { key: "kinship_summary", label: "kinship_summary", value: kinshipSummaryLabel },
    { key: "kinship_tags", label: "kinship_tags", value: formatTextList(kinshipTags) },
    {
      key: "relationship_summary",
      label: "relationship_summary",
      value: relationshipSummary
        ? `${relationshipSummary.standingVectorLabel} / Favor ${relationshipSummary.favorScore} / ${relationshipSummary.standingBandLabel}`
        : "Unavailable"
    },
    { key: "relationship_turn_movement_count", label: "relationship_turn_movement_count", value: String(relationshipMovementCount) },
    {
      key: "relationship_turn_movement_rows",
      label: "relationship_turn_movement_rows",
      value:
        relationshipMovementRowsVisible.length > 0
          ? relationshipMovementRowsVisible.map((row) => row.title).join(", ")
          : "None"
    },
    { key: "household_scope", label: "household_scope", value: householdScopeLabel },
    { key: "household_member_count", label: "household_member_count", value: String(householdMemberCount) },
    { key: "living_member_count", label: "living_member_count", value: String(householdLivingCount) },
    { key: "child_count", label: "child_count", value: String(householdChildCount) },
    { key: "has_male_heir", label: "has_male_heir", value: formatBoolean(hasMaleHeir) },
    { key: "heiress_possible", label: "heiress_possible", value: formatBoolean(heiressPossible) },
    { key: "holdings_count", label: "holdings_count", value: String(holdingsCount) },
    { key: "holdings_band", label: "holdings_band", value: holdingsBandLabel },
    { key: "anchor_manor_id", label: "anchor_manor_id", value: holdingsAnchorManorId ?? "None" },
    { key: "known_manor_ids", label: "known_manor_ids", value: formatTextList(holdingsKnownManorIds) },
    { key: "source_kind", label: "source_kind", value: holdingsSourceLabel },
    { key: "ledger_band", label: "ledger_band", value: ledgerBandLabel },
    { key: "ledger_trend", label: "ledger_trend", value: ledgerTrendLabel }
  ];

  return {
    debugRows,
    dossier,
    helperText:
      "This modal stays on the accepted house dossier seam only. Standing posture comes from the current relationship summary, turn movement stays separate below, and missing manor detail is called out when it is absent by contract rather than merely unknown.",
    holdingsAnchorManorId,
    holdingsBandLabel,
    holdingsCount,
    holdingsFootprintHelperText: holdingsFootprintNote,
    holdingsKnownManorIds,
    holdingsSourceLabel,
    houseId: dossier.house_id,
    houseName,
    householdChildCount,
    householdLivingCount,
    householdMemberCount,
    householdScopeLabel,
    kinshipSummaryLabel,
    kinshipTags,
    knownnessLabel,
    knownnessHelperText: knownnessHelperText(knownnessLabel, knownnessSources),
    knownnessSources,
    ledgerBandLabel,
    ledgerTrendLabel,
    relevanceReasons,
    relevanceTierLabel,
    relatedPeople,
    relationshipMovementCount,
    relationshipMovementHelperText:
      relationshipMovementCount > relationshipMovementRowsVisible.length
        ? `Showing ${relationshipMovementRowsVisible.length} of ${relationshipMovementCount} recorded relationship movements for this house.`
        : "Standing posture is read from the current relationship summary. Turn movement, when recorded, stays separate below.",
    relationshipMovementRows: relationshipMovementRowsVisible,
    relationshipPostureLabel,
    relationshipSummary,
    schemaVersion: dossier.schema_version,
    subtitle: `${knownnessLabel} · ${relevanceTierLabel} · ${dossier.house_id}`,
    successionLabel,
    tierLabel
  };
}
