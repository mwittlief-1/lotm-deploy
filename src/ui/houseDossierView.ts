import type { BoundedHouseDossierSummary, HouseDossierSummary, RunState } from "../sim/types";

export type HouseDossierRecord = HouseDossierSummary | BoundedHouseDossierSummary;

export type HouseDossierDebugRowSurface = {
  key: string;
  label: string;
  value: string;
};

export type HouseDossierSurface = {
  debugRows: HouseDossierDebugRowSurface[];
  dossier: HouseDossierRecord;
  helperText: string;
  holdingsAnchorManorId: string | null;
  holdingsBandLabel: string;
  holdingsCount: number;
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
  knownnessSources: string[];
  ledgerBandLabel: string;
  ledgerTrendLabel: string;
  relevanceReasons: string[];
  relevanceTierLabel: string;
  relationshipBandLabel: string;
  relationshipSummary:
    | {
        allegiance: number;
        favorScore: number;
        respect: number;
        standingBandLabel: string;
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
    threat: summary.threat
  };
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
  const relationshipBandLabel = formatToken((dossier as any).relationship_band);
  const relationshipSummary = readRelationshipSummary(dossier);
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
  const ledgerBandLabel = formatToken((dossier as any).ledger_band);
  const ledgerTrendLabel = formatToken((dossier as any).ledger_trend);
  const successionLabel = hasMaleHeir
    ? "Male heir recorded."
    : heiressPossible
      ? "Heiress line remains possible."
      : "No direct heir signal is recorded.";

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
    { key: "relationship_band", label: "relationship_band", value: relationshipBandLabel },
    {
      key: "relationship_summary",
      label: "relationship_summary",
      value: relationshipSummary
        ? `A ${relationshipSummary.allegiance} / R ${relationshipSummary.respect} / T ${relationshipSummary.threat} / Favor ${relationshipSummary.favorScore} / ${relationshipSummary.standingBandLabel}`
        : "Unavailable"
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
      "This modal stays on the accepted house dossier seam only. The player tab keeps the coarse narrative view, and the debug tab mirrors the deterministic dossier fields in a fixed order.",
    holdingsAnchorManorId,
    holdingsBandLabel,
    holdingsCount,
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
    knownnessSources,
    ledgerBandLabel,
    ledgerTrendLabel,
    relevanceReasons,
    relevanceTierLabel,
    relationshipBandLabel,
    relationshipSummary,
    schemaVersion: dossier.schema_version,
    subtitle: `${knownnessLabel} · ${relevanceTierLabel} · ${dossier.house_id}`,
    successionLabel,
    tierLabel
  };
}
