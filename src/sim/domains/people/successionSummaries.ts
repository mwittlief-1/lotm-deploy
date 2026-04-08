import { playerHouseIdOf, registryPersonFor, structuredHouseIdForPerson } from "../../actors";
import type { RunState } from "../../types";
import {
  buildClaimantRegistry,
  buildSuccessionLine,
  type SuccessionHouseRelevanceReason,
} from "./successionRegistry";

export const SUCCESSION_LINE_SUMMARY_SCHEMA_VERSION = "succession_line_summary_v0" as const;
export const CLAIMANT_SUMMARY_SCHEMA_VERSION = "claimant_summary_v0" as const;
export const SUCCESSION_SUMMARY_LIMIT_DEFAULT = 5;

type SuccessionLineSummaryEntry = {
  person_id: string;
  person_name: string;
  line_position: number;
  basis_kind: string;
  relation_group: string;
  adult_eligible: boolean;
  house_id: string | null;
  house_name: string | null;
  house_relevance_reasons: SuccessionHouseRelevanceReason[];
};

type ClaimantSummaryEntry = {
  claimant_person_id: string;
  claimant_name: string;
  succession_position: number | null;
  adult_succession_position: number | null;
  basis_kind: string;
  relation_group: string;
  blocked_by_current_heir: boolean;
  adult_eligible: boolean;
  house_id: string | null;
  house_name: string | null;
  house_relevance_reasons: SuccessionHouseRelevanceReason[];
};

export type SuccessionLineSummary = {
  schema_version: typeof SUCCESSION_LINE_SUMMARY_SCHEMA_VERSION;
  house_id: string;
  head_person_id: string | null;
  current_heir_id: string | null;
  adult_successor_id: string | null;
  entry_limit: number;
  overflow_count: number;
  entries: SuccessionLineSummaryEntry[];
};

export type ClaimantSummary = {
  schema_version: typeof CLAIMANT_SUMMARY_SCHEMA_VERSION;
  house_id: string;
  sponsor_person_id: string | null;
  current_heir_id: string | null;
  adult_successor_id: string | null;
  claim_window_open: boolean;
  entry_limit: number;
  overflow_count: number;
  entries: ClaimantSummaryEntry[];
};

export type SuccessionExperienceSurfaces = {
  succession_line_summary: SuccessionLineSummary;
  claimant_summary: ClaimantSummary;
};

function housesMap(state: RunState): Record<string, any> {
  const anyState: any = state as any;
  return anyState?.houses && typeof anyState.houses === "object" ? (anyState.houses as Record<string, any>) : {};
}

function readHouseName(state: RunState, houseId: string | null): string | null {
  if (!houseId) return null;
  const house = housesMap(state)[houseId];
  if (!house || typeof house !== "object") return houseId;

  const raw =
    typeof house.house_name === "string"
      ? house.house_name
      : typeof house.houseName === "string"
        ? house.houseName
        : typeof house.name === "string"
          ? house.name
          : houseId;
  const normalized = String(raw ?? "").trim();
  return normalized || houseId;
}

function resolveHouseId(state: RunState, personId: string): string | null {
  return structuredHouseIdForPerson(state, personId) ?? null;
}

export function buildSuccessionExperienceSurfaces(
  state: RunState,
  options?: { line_limit?: number; claimant_limit?: number }
): SuccessionExperienceSurfaces {
  const lineLimit =
    typeof options?.line_limit === "number"
      ? Math.max(1, Math.trunc(options.line_limit))
      : SUCCESSION_SUMMARY_LIMIT_DEFAULT;
  const claimantLimit =
    typeof options?.claimant_limit === "number"
      ? Math.max(1, Math.trunc(options.claimant_limit))
      : SUCCESSION_SUMMARY_LIMIT_DEFAULT;

  const line = buildSuccessionLine(state, { limit: lineLimit });
  const registry = buildClaimantRegistry(state, { limit: claimantLimit });
  const houseId = playerHouseIdOf(state);

  return {
    succession_line_summary: {
      schema_version: SUCCESSION_LINE_SUMMARY_SCHEMA_VERSION,
      house_id: houseId,
      head_person_id: state.house.head?.id ?? null,
      current_heir_id: registry.current_heir_id,
      adult_successor_id: registry.adult_successor_id,
      entry_limit: lineLimit,
      overflow_count: line.overflow_count,
      entries: line.entries.map((entry) => ({
        person_id: entry.person_id,
        person_name: registryPersonFor(state, entry.person_id)?.name ?? entry.person_id,
        line_position: entry.line_position,
        basis_kind: entry.basis_kind,
        relation_group: entry.relation_group,
        adult_eligible: entry.adult_eligible,
        house_id: entry.house_id,
        house_name: readHouseName(state, entry.house_id),
        house_relevance_reasons: [...entry.house_relevance_reasons],
      })),
    },
    claimant_summary: {
      schema_version: CLAIMANT_SUMMARY_SCHEMA_VERSION,
      house_id: houseId,
      sponsor_person_id: registry.sponsor_person_id,
      current_heir_id: registry.current_heir_id,
      adult_successor_id: registry.adult_successor_id,
      claim_window_open: registry.claim_window_open,
      entry_limit: claimantLimit,
      overflow_count: registry.overflow_count,
      entries: registry.entries.map((entry) => ({
        claimant_person_id: entry.claimant_person_id,
        claimant_name: registryPersonFor(state, entry.claimant_person_id)?.name ?? entry.claimant_person_id,
        succession_position: entry.succession_position,
        adult_succession_position: entry.adult_succession_position,
        basis_kind: entry.basis_kind,
        relation_group: entry.relation_group,
        blocked_by_current_heir: entry.blocked_by_current_heir,
        adult_eligible: entry.adult_eligible,
        house_id: entry.house_id ?? resolveHouseId(state, entry.claimant_person_id),
        house_name: readHouseName(state, entry.house_id ?? resolveHouseId(state, entry.claimant_person_id)),
        house_relevance_reasons: [...entry.house_relevance_reasons],
      })),
    },
  };
}
