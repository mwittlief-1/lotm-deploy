import type { MarriageWindow, RunState } from "../sim/types";
import type {
  OutboundMarriageOfferResolutionResult,
  OutboundMarriageScoutingCandidateEntry,
  OutboundMarriageScoutingRegistry
} from "../sim/domains/people/marriage";
import { resolveOutboundMarriageOffer } from "../sim/domains/people/marriage";
import { deepCopy } from "../sim/util";

export const OUTBOUND_MARRIAGE_VIEW_SCHEMA_VERSION = "ui_outbound_marriage_view_v1" as const;

export type OutboundMarriageSummaryCard = {
  detail: string;
  id: "subject" | "shown" | "held_out" | "scope";
  label: string;
  value: string;
};

export type OutboundMarriageCandidateRow = {
  candidateHouseLabel: string;
  candidatePersonId: string;
  candidatePersonName: string;
  distanceLabel: string;
  excludeReasonLabel: string;
  includeReasonLabel: string;
  rankGroupLabel: string;
  rankIndex: number;
  rankingScore: number;
  readinessLabel: string;
  relevanceLabel: string;
  scopeLabel: string;
  selectorLabel: string;
};

export type OutboundMarriageOfferDraft = {
  dowerCoinDelta: number;
  dowerFoodStores: number;
  dowerMeatStores: number;
  dowryCoinDelta: number;
  dowryFoodStores: number;
  dowryMeatStores: number;
  includeLiegeDelta: boolean;
  liegeRespect: number;
  liegeThreat: number;
  relationshipAllegiance: number;
  relationshipRespect: number;
  relationshipThreat: number;
  riskTagsText: string;
  selectedCandidateId: string | null;
};

export type OutboundMarriageOfferPreview = {
  blockedReasonLabel: string | null;
  debugRows: Array<{ key: string; label: string; value: string }>;
  outcome: OutboundMarriageOfferResolutionResult["outcome"];
  outcomeLabel: string;
  receiptSummary: string;
  summary: string;
};

export type OutboundMarriageSurface = {
  candidateRows: OutboundMarriageCandidateRow[];
  helperText: string;
  heldOutCount: number;
  previewState: RunState;
  schemaVersion: typeof OUTBOUND_MARRIAGE_VIEW_SCHEMA_VERSION;
  scopeSummary: string;
  shownCount: number;
  subjectPersonId: string;
  subjectPersonName: string;
  subtitle: string;
  summaryCards: OutboundMarriageSummaryCard[];
  totalCandidates: number;
  totalCandidatesConsidered: number;
  scoutingRegistry: OutboundMarriageScoutingRegistry;
};

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function asRegistry(
  previewState: RunState | null | undefined,
  marriageWindow: MarriageWindow | null | undefined
): OutboundMarriageScoutingRegistry | null {
  const value =
    (previewState as any)?.outbound_marriage_scouting_registry ??
    (previewState as any)?.house?.outbound_marriage_scouting_registry ??
    (marriageWindow as any)?.outbound_marriage_scouting_registry ??
    null;

  if (!value || typeof value !== "object") return null;
  return value.schema_version === "outbound_marriage_scouting_registry_v1"
    ? (value as OutboundMarriageScoutingRegistry)
    : null;
}

function asPersonName(previewState: RunState, personId: string): string {
  const person = (previewState as any)?.people?.[personId];
  return typeof person?.name === "string" && person.name.trim().length > 0 ? person.name.trim() : personId;
}

function formatToken(value: string | null | undefined): string {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token) return "Unknown";

  return token
    .split(/[._]/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatHouseLabel(entry: OutboundMarriageScoutingCandidateEntry): string {
  if (entry.candidate_house_name) return `House ${entry.candidate_house_name}`;
  if (entry.candidate_house_id) return entry.candidate_house_id;
  return "Unknown house";
}

function formatReasonList(values: readonly string[], emptyLabel: string): string {
  return values.length > 0 ? values.map((value) => formatToken(value)).join(", ") : emptyLabel;
}

function formatDistanceLabel(entry: OutboundMarriageScoutingCandidateEntry): string {
  const parts: string[] = [];
  if (entry.distance_band) parts.push(formatToken(entry.distance_band));
  if (typeof entry.route_hop_distance === "number" && Number.isFinite(entry.route_hop_distance)) {
    parts.push(`${Math.trunc(entry.route_hop_distance)} hops`);
  }
  if (typeof entry.travel_cost_distance === "number" && Number.isFinite(entry.travel_cost_distance)) {
    parts.push(`${Math.trunc(entry.travel_cost_distance)} travel`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Route not mapped";
}

function formatScopeLabel(entry: OutboundMarriageScoutingCandidateEntry): string {
  if (entry.scope_bucket) return `${formatToken(entry.scope_status)} · ${formatToken(entry.scope_bucket)}`;
  return formatToken(entry.scope_status);
}

function candidateRows(registry: OutboundMarriageScoutingRegistry): OutboundMarriageCandidateRow[] {
  return registry.candidate_ids
    .map((candidateId, index) => {
      const entry = registry.entries_by_candidate_id[candidateId];
      if (!entry) return null;

      return {
        candidateHouseLabel: formatHouseLabel(entry),
        candidatePersonId: entry.candidate_person_id,
        candidatePersonName: entry.candidate_person_name,
        distanceLabel: formatDistanceLabel(entry),
        excludeReasonLabel: formatReasonList(entry.exclude_reasons, "None"),
        includeReasonLabel: formatReasonList(entry.include_reasons, "None"),
        rankGroupLabel: entry.rank_group === "shown" ? "Shown" : "Held out",
        rankIndex: index + 1,
        rankingScore: Math.trunc(entry.ranking_score),
        readinessLabel: entry.match_ready ? "Ready now" : "Not ready",
        relevanceLabel: formatReasonList(entry.relevance_reasons, "No special relevance"),
        scopeLabel: formatScopeLabel(entry),
        selectorLabel:
          entry.selector_contexts.length > 0
            ? entry.selector_contexts.map((value) => formatToken(value)).join(", ")
            : "No selector context"
      };
    })
    .filter((row): row is OutboundMarriageCandidateRow => row !== null);
}

export function resolveOutboundMarriageSelectedCandidateId(
  surface: OutboundMarriageSurface,
  requestedCandidateId: string | null | undefined
): string | null {
  if (
    requestedCandidateId &&
    surface.candidateRows.some((row) => row.candidatePersonId === requestedCandidateId)
  ) {
    return requestedCandidateId;
  }

  const shownRow = surface.candidateRows.find((row) => row.rankGroupLabel === "Shown");
  return shownRow?.candidatePersonId ?? surface.candidateRows[0]?.candidatePersonId ?? null;
}

function coerceInteger(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

export function createOutboundMarriageOfferDraft(
  surface: OutboundMarriageSurface,
  current?: Partial<OutboundMarriageOfferDraft> | null
): OutboundMarriageOfferDraft {
  return {
    dowerCoinDelta: coerceInteger(current?.dowerCoinDelta),
    dowerFoodStores: coerceInteger(current?.dowerFoodStores),
    dowerMeatStores: coerceInteger(current?.dowerMeatStores),
    dowryCoinDelta: coerceInteger(current?.dowryCoinDelta),
    dowryFoodStores: coerceInteger(current?.dowryFoodStores),
    dowryMeatStores: coerceInteger(current?.dowryMeatStores),
    includeLiegeDelta: current?.includeLiegeDelta === true,
    liegeRespect: coerceInteger(current?.liegeRespect),
    liegeThreat: coerceInteger(current?.liegeThreat),
    relationshipAllegiance: coerceInteger(current?.relationshipAllegiance),
    relationshipRespect: coerceInteger(current?.relationshipRespect),
    relationshipThreat: coerceInteger(current?.relationshipThreat),
    riskTagsText: typeof current?.riskTagsText === "string" ? current.riskTagsText : "",
    selectedCandidateId: resolveOutboundMarriageSelectedCandidateId(surface, current?.selectedCandidateId ?? null)
  };
}

function parseRiskTags(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawPart of value.split(",")) {
    const normalized = rawPart.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    tags.push(normalized);
  }

  return tags;
}

function previewReceiptSummary(result: OutboundMarriageOfferResolutionResult): string {
  if (result.receipt_snapshots.length === 0) return "No settlement receipts would be written.";
  return `${result.receipt_snapshots.length} receipt-backed settlement row${result.receipt_snapshots.length === 1 ? "" : "s"} would be written.`;
}

function previewDebugRows(result: OutboundMarriageOfferResolutionResult): Array<{ key: string; label: string; value: string }> {
  const rows: Array<{ key: string; label: string; value: string }> = [];
  if (result.acceptance_debug) {
    rows.push(
      {
        key: "acceptance_score",
        label: "Acceptance score",
        value: String(result.acceptance_debug.acceptance_score)
      },
      {
        key: "acceptance_threshold",
        label: "Acceptance threshold",
        value: String(result.acceptance_debug.acceptance_threshold)
      },
      {
        key: "recipient_favor_score",
        label: "Recipient favor",
        value: String(result.acceptance_debug.recipient_favor_score)
      },
      {
        key: "settlement_score",
        label: "Settlement score",
        value: String(result.acceptance_debug.settlement_score)
      },
      {
        key: "relationship_delta_score",
        label: "Relationship delta score",
        value: String(result.acceptance_debug.relationship_delta_score)
      },
      {
        key: "risk_tag_score",
        label: "Risk tag score",
        value: String(result.acceptance_debug.risk_tag_score)
      },
      {
        key: "scope_score",
        label: "Scope score",
        value: String(result.acceptance_debug.scope_score)
      }
    );
  }

  rows.push(
    {
      key: "blocked_reason",
      label: "Blocked reason",
      value: result.blocked_reason ? formatToken(result.blocked_reason) : "None"
    },
    {
      key: "receipt_summary",
      label: "Receipt preview",
      value: previewReceiptSummary(result)
    }
  );

  return rows;
}

export function buildOutboundMarriageOfferPreview(
  surface: OutboundMarriageSurface,
  draft: OutboundMarriageOfferDraft
): OutboundMarriageOfferPreview | null {
  const selectedCandidateId = resolveOutboundMarriageSelectedCandidateId(surface, draft.selectedCandidateId);
  if (!selectedCandidateId) return null;

  const selectedRow = surface.candidateRows.find((row) => row.candidatePersonId === selectedCandidateId) ?? null;
  if (!selectedRow) return null;

  const result = resolveOutboundMarriageOffer(deepCopy(surface.previewState), {
    subject_person_id: surface.subjectPersonId,
    scouting_registry: surface.scoutingRegistry,
    offer: {
      house_person_id: selectedCandidateId,
      house_label: selectedRow.candidateHouseLabel,
      dowry_coin_net: coerceInteger(draft.dowryCoinDelta),
      relationship_delta: {
        respect: coerceInteger(draft.relationshipRespect),
        allegiance: coerceInteger(draft.relationshipAllegiance),
        threat: coerceInteger(draft.relationshipThreat)
      },
      liege_delta: draft.includeLiegeDelta
        ? {
            respect: coerceInteger(draft.liegeRespect),
            threat: coerceInteger(draft.liegeThreat)
          }
        : null,
      risk_tags: parseRiskTags(draft.riskTagsText)
    },
    dowry_requested_delta_by_asset: {
      coin: coerceInteger(draft.dowryCoinDelta),
      food_stores: coerceInteger(draft.dowryFoodStores),
      meat_stores: coerceInteger(draft.dowryMeatStores)
    },
    dower_requested_delta_by_asset: {
      coin: coerceInteger(draft.dowerCoinDelta),
      food_stores: coerceInteger(draft.dowerFoodStores),
      meat_stores: coerceInteger(draft.dowerMeatStores)
    }
  });

  return {
    blockedReasonLabel: result.blocked_reason ? formatToken(result.blocked_reason) : null,
    debugRows: previewDebugRows(result),
    outcome: result.outcome,
    outcomeLabel:
      result.outcome === "accepted"
        ? "Accepted preview"
        : result.outcome === "rejected"
          ? "Rejected preview"
          : "Blocked preview",
    receiptSummary: previewReceiptSummary(result),
    summary: result.notes[0] ?? "No outbound marriage result preview is available."
  };
}

export function buildOutboundMarriageSurface(
  previewState: RunState | null | undefined,
  marriageWindow: MarriageWindow | null | undefined
): OutboundMarriageSurface | null {
  if (!previewState) return null;

  const scoutingRegistry = asRegistry(previewState, marriageWindow);
  if (!scoutingRegistry) return null;

  const rows = candidateRows(scoutingRegistry);
  const subjectPersonName = asPersonName(previewState, scoutingRegistry.subject_person_id);
  const shownCount = scoutingRegistry.total_shown_candidates;
  const heldOutCount = scoutingRegistry.total_held_out_candidates;
  const scopeSummary = `${formatToken(scoutingRegistry.scope_mode)} · ${scoutingRegistry.admitted_manor_ids.length} admitted · ${scoutingRegistry.rejected_manor_ids.length} rejected`;

  return {
    candidateRows: rows,
    helperText:
      "This sheet reads the accepted outbound scouting registry and previews the canonical offer resolver against a cloned snapshot. Live state stays unchanged until a turn decision resolves.",
    heldOutCount,
    previewState,
    schemaVersion: OUTBOUND_MARRIAGE_VIEW_SCHEMA_VERSION,
    scopeSummary,
    shownCount,
    subjectPersonId: scoutingRegistry.subject_person_id,
    subjectPersonName,
    subtitle: `${subjectPersonName} · ${shownCount} shown · ${heldOutCount} held out`,
    summaryCards: [
      {
        detail: `Subject person_id ${scoutingRegistry.subject_person_id}.`,
        id: "subject",
        label: "Subject",
        value: subjectPersonName
      },
      {
        detail: `${rows.filter((row) => row.readinessLabel === "Ready now").length} rows are currently match-ready.`,
        id: "shown",
        label: "Shown",
        value: `${shownCount} shown`
      },
      {
        detail: `${heldOutCount} additional rows are retained for deterministic debug review.`,
        id: "held_out",
        label: "Held out",
        value: `${heldOutCount} held out`
      },
      {
        detail: `Anchor ${scoutingRegistry.anchor_manor_id ?? "none"} · ${scoutingRegistry.total_candidates_considered} candidates considered.`,
        id: "scope",
        label: "Scope",
        value: scopeSummary
      }
    ],
    totalCandidates: scoutingRegistry.candidate_ids.length,
    totalCandidatesConsidered: scoutingRegistry.total_candidates_considered,
    scoutingRegistry
  };
}
