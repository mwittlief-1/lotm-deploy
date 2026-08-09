import type { CouncilRoomReadyProjectionV1 } from "../ready/councilRoomReadyProjection";
import type { Household1120ResponsibilityRow } from "./readModels/household1120/types";

export type CourtOsWorkspaceAssignmentRowV1 = {
  source_table: string;
  subject_id: string | null;
  subject_label: string | null;
  scope_id: string | null;
  scope_label: string | null;
  accountable_person_id: string | null;
  accountable_person_label: string | null;
  player_surface_eligible: boolean | null;
};

export type CourtOsAssignmentPersonV1 = {
  entity_id: string;
  display_name: string;
  eligibility: "head_of_house" | "current_holder";
};

export type CourtOsAssignmentScopeV1 = {
  scope_id: string | null;
  scope_label: string;
  holder_person_id: string | null;
  holder_display_name: string | null;
  source_row: Household1120ResponsibilityRow | null;
};

/**
 * Resolves the exact charge opened by the shared Head's Brief. A lone scope is
 * safe to open directly; a multi-scope responsibility requires the player to
 * choose a scope first, and an unknown route scope never falls back to a
 * different charge.
 */
export function courtOsAssignmentScopeForReview(
  scopes: readonly CourtOsAssignmentScopeV1[],
  routeScopeId: string | null,
): CourtOsAssignmentScopeV1 | null {
  if (routeScopeId) {
    return scopes.find((scope) => scope.scope_id === routeScopeId) ?? null;
  }
  return scopes.length === 1 ? scopes[0] ?? null : null;
}

/**
 * Until a responsibility-specific eligibility projection is admitted,
 * assignment planning may retain the recorded holder or exercise the explicit
 * Head-of-House self-assignment path. Council membership and attendance are
 * never treated as assignment eligibility.
 */
export function courtOsAssignmentCandidates(
  council: CouncilRoomReadyProjectionV1,
  currentHolder: { personId: string; displayName: string } | null,
): readonly CourtOsAssignmentPersonV1[] {
  const candidates: CourtOsAssignmentPersonV1[] = [];
  const seen = new Set<string>();
  const push = (candidate: CourtOsAssignmentPersonV1) => {
    if (seen.has(candidate.entity_id)) return;
    seen.add(candidate.entity_id);
    candidates.push(candidate);
  };

  push({
    entity_id: council.head_ref.entity_id,
    display_name: council.head_ref.display_name,
    eligibility: "head_of_house",
  });
  if (currentHolder) {
    push({
      entity_id: currentHolder.personId,
      display_name: currentHolder.displayName,
      eligibility: "current_holder",
    });
  }
  return candidates;
}

/**
 * Produces the stable assignment scopes shown in a responsibility workspace.
 * Scope identity is consumed only from the admitted authority projection. No
 * synthetic manor, right, project, facility, or portfolio is manufactured.
 */
export function courtOsAssignmentScopes(
  authorityRows: readonly Household1120ResponsibilityRow[],
): readonly CourtOsAssignmentScopeV1[] {
  if (authorityRows.length === 0) return [];

  const result: CourtOsAssignmentScopeV1[] = [];
  const seen = new Set<string>();
  for (const row of authorityRows) {
    const scopeId = row.authority_scope_id ?? row.manor_id ?? row.demand_entity_id ?? null;
    const identity = scopeId ?? `unscoped:${row.responsibility_summary_id}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    result.push({
      scope_id: scopeId,
      scope_label:
        row.authority_scope_label ??
        row.demand_entity_label ??
        row.responsibility_label ??
        "Recorded scope",
      holder_person_id: row.holder_person_id,
      holder_display_name: row.holder_display_name,
      source_row: row,
    });
  }
  return result;
}

/**
 * Exact non-authority scopes can still be planned when an admitted workspace
 * exposes a concrete project, facility, right, manor, or other scope with its
 * recorded accountable person. No fallback or synthetic scope is created.
 */
export function courtOsWorkspaceAssignmentScopes(
  rows: readonly CourtOsWorkspaceAssignmentRowV1[],
): readonly CourtOsAssignmentScopeV1[] {
  const result: CourtOsAssignmentScopeV1[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.player_surface_eligible !== true) continue;
    const scopeId = row.scope_id ?? row.subject_id;
    if (!scopeId || seen.has(scopeId)) continue;
    if (!row.accountable_person_id || !row.accountable_person_label) continue;
    seen.add(scopeId);
    result.push({
      scope_id: scopeId,
      scope_label: row.scope_label ?? row.subject_label ?? "Recorded scope",
      holder_person_id: row.accountable_person_id,
      holder_display_name: row.accountable_person_label,
      source_row: null,
    });
  }
  return result;
}
