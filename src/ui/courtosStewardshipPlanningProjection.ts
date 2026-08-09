import type { CouncilRoomReadyProjectionV1 } from "../ready/councilRoomReadyProjection";
import type { CourtOsSessionContextV1 } from "../courtosSessionContext";
import {
  COURTOS_DOMAINS,
  COURTOS_RESPONSIBILITIES,
  type CourtOsResponsibilityDesignKey,
} from "./courtosInformationArchitecture";
import type {
  Household1120ReadOnlyProjection,
  Household1120ResponsibilityRow,
  Household1120StewardshipCandidateRow,
} from "./readModels/household1120/types";
import {
  FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION,
} from "./readModels/householdFoundationA/alternateStewardEligibilityContract";

const ALTERNATE_STEWARD_POLICY_SHA256 = new Set([
  "16dfd2b597b27c5900b5287c5d78ca3e91018e28ca25e30e902d28b146d0511b",
]);
import {
  courtOsStewardshipCandidates,
  threeYearStewardshipHorizonFrom,
  type CourtOsStewardshipCandidateV1,
  type CourtOsStewardshipPlanContextV1,
  type CourtOsStewardshipResponsibilityV1,
  type CourtOsStewardshipScopeV1,
} from "./courtosStewardshipPlan";
import type { CourtOsWorkspaceAssignmentRowV1 } from "./courtosResponsibilityAssignment";

export type CourtOsStewardshipWorkspaceAssignmentInputV1 = Readonly<{
  responsibility_id: CourtOsResponsibilityDesignKey;
  /** Stable identity of the exact admitted workspace row consumed by planning. */
  source_record_id: string;
  row: CourtOsWorkspaceAssignmentRowV1;
}>;

export type CourtOsStewardshipProjectionDiagnosticV1 = Readonly<{
  code:
    | "duplicate_scope_conflict"
    | "house_scope_mismatch"
    | "invalid_effective_date"
    | "unrecognized_responsibility"
    | "alternate_candidate_contract_mismatch";
  responsibility_id: string | null;
  scope_id: string | null;
}>;

export type CourtOsStewardshipPlanningProjectionV1 = Readonly<{
  context: CourtOsStewardshipPlanContextV1 | null;
  responsibilities: readonly CourtOsStewardshipResponsibilityV1[];
  candidates_by_scope: ReadonlyMap<string, readonly CourtOsStewardshipCandidateV1[]>;
  diagnostics: readonly CourtOsStewardshipProjectionDiagnosticV1[];
  planning_status: "ready" | "read_only" | "invalid";
}>;

export function courtOsStewardshipScopeKey(
  responsibilityId: string,
  scopeId: string | null,
): string {
  return `${responsibilityId}::${scopeId ?? "__responsibility_wide__"}`;
}

function roomForResponsibility(
  responsibilityId: CourtOsResponsibilityDesignKey,
): { room_id: string; room_label: string } {
  if (responsibilityId === "office_post_appointments") {
    return { room_id: "house_command", room_label: "House Command" };
  }
  const domain = COURTOS_DOMAINS.find((candidate) =>
    candidate.responsibilities.some((item) => item.key === responsibilityId),
  );
  if (!domain) return { room_id: "unresolved", room_label: "Unresolved" };
  return { room_id: domain.key, room_label: domain.label };
}

function designKey(row: Household1120ResponsibilityRow): string {
  const prefix = "courtos.responsibility.";
  return row.source_legacy_responsibility_id.startsWith(prefix)
    ? row.source_legacy_responsibility_id.slice(prefix.length)
    : row.source_legacy_responsibility_id;
}

function exactScopeId(row: Household1120ResponsibilityRow): string | null {
  return row.authority_scope_id ?? row.manor_id ?? row.demand_entity_id ?? null;
}

function exactScopeLabel(row: Household1120ResponsibilityRow): string {
  return (
    row.authority_scope_label ??
    row.demand_entity_label ??
    row.responsibility_label
  );
}

/**
 * Adapts the admitted 24-responsibility authority rows into exact planning
 * scopes. Conflicting rows for the same scope are withheld rather than merged.
 */
export function courtOsStewardshipResponsibilitiesFromAuthority(
  rows: readonly Household1120ResponsibilityRow[],
): Readonly<{
  responsibilities: readonly CourtOsStewardshipResponsibilityV1[];
  diagnostics: readonly CourtOsStewardshipProjectionDiagnosticV1[];
}> {
  const diagnostics: CourtOsStewardshipProjectionDiagnosticV1[] = [];
  const recognized = new Set(COURTOS_RESPONSIBILITIES.map((item) => item.key));
  const byResponsibility = new Map<string, Household1120ResponsibilityRow[]>();
  for (const row of rows) {
    const key = designKey(row);
    if (!recognized.has(key as CourtOsResponsibilityDesignKey)) {
      diagnostics.push({
        code: "unrecognized_responsibility",
        responsibility_id: key,
        scope_id: exactScopeId(row),
      });
      continue;
    }
    const current = byResponsibility.get(key) ?? [];
    current.push(row);
    byResponsibility.set(key, current);
  }

  const responsibilities = COURTOS_RESPONSIBILITIES.map((definition) => {
    const room = roomForResponsibility(definition.key);
    const scopeGroups = new Map<string, {
      scope_id: string | null;
      rows: Household1120ResponsibilityRow[];
    }>();
    for (const row of byResponsibility.get(definition.key) ?? []) {
      const scopeId = exactScopeId(row);
      const groupKey = scopeId ?? "__responsibility_wide__";
      const group = scopeGroups.get(groupKey) ?? { scope_id: scopeId, rows: [] };
      group.rows.push(row);
      scopeGroups.set(groupKey, group);
    }
    const scopes: CourtOsStewardshipScopeV1[] = [];
    for (const { scope_id: scopeId, rows: scopeRows } of scopeGroups.values()) {
      const first = scopeRows[0];
      if (!first) continue;
      const holderIdentities = new Set(
        scopeRows.map((row) =>
          `${row.holder_person_id ?? "__none__"}::${row.holder_display_name ?? "__none__"}`,
        ),
      );
      const scopeLabels = new Set(scopeRows.map(exactScopeLabel));
      if (holderIdentities.size > 1 || scopeLabels.size > 1) {
        diagnostics.push({
          code: "duplicate_scope_conflict",
          responsibility_id: definition.key,
          scope_id: scopeId,
        });
        continue;
      }
      scopes.push({
        responsibility_id: definition.key,
        responsibility_label: definition.label,
        room_id: room.room_id,
        room_label: room.room_label,
        scope_id: scopeId,
        scope_label: exactScopeLabel(first),
        source_record_id: first.responsibility_summary_id,
        current_holder:
          first.holder_person_id && first.holder_display_name
            ? {
                person_id: first.holder_person_id,
                display_name: first.holder_display_name,
              }
            : null,
      });
    }
    return Object.freeze({
      responsibility_id: definition.key,
      responsibility_label: definition.label,
      room_id: room.room_id,
      room_label: room.room_label,
      scopes: Object.freeze(scopes),
    });
  });

  return Object.freeze({
    responsibilities: Object.freeze(responsibilities),
    diagnostics: Object.freeze(diagnostics),
  });
}

export function buildCourtOsStewardshipPlanningProjection(input: {
  projection: Household1120ReadOnlyProjection;
  session: CourtOsSessionContextV1;
  council: CouncilRoomReadyProjectionV1;
  /** Exact admitted authority generation consumed by the planning surface. */
  authority_source_generation_id?: string | null;
  /**
   * Exact project/right/portfolio scopes exposed outside the House-wide
   * authority summary. These supplement only responsibilities with no
   * authority-derived scope; they never override or broaden authority rows.
   */
  workspace_assignment_rows?: readonly CourtOsStewardshipWorkspaceAssignmentInputV1[];
}): CourtOsStewardshipPlanningProjectionV1 {
  const adapted = courtOsStewardshipResponsibilitiesFromAuthority(
    input.projection.responsibility_summary,
  );
  const diagnostics = [...adapted.diagnostics];
  const recognized = new Set(COURTOS_RESPONSIBILITIES.map((item) => item.key));
  const workspaceByResponsibility = new Map<
    CourtOsResponsibilityDesignKey,
    CourtOsStewardshipWorkspaceAssignmentInputV1[]
  >();
  for (const assignment of input.workspace_assignment_rows ?? []) {
    if (!recognized.has(assignment.responsibility_id)) {
      diagnostics.push({
        code: "unrecognized_responsibility",
        responsibility_id: assignment.responsibility_id,
        scope_id: assignment.row.scope_id ?? assignment.row.subject_id,
      });
      continue;
    }
    if (assignment.row.player_surface_eligible !== true) continue;
    if (!assignment.row.accountable_person_id || !assignment.row.accountable_person_label) continue;
    if (!(assignment.row.scope_id ?? assignment.row.subject_id)) continue;
    const rows = workspaceByResponsibility.get(assignment.responsibility_id) ?? [];
    rows.push(assignment);
    workspaceByResponsibility.set(assignment.responsibility_id, rows);
  }
  const responsibilities = adapted.responsibilities.map((responsibility) => {
    if (responsibility.scopes.length > 0) return responsibility;
    const workspaceRows = workspaceByResponsibility.get(
      responsibility.responsibility_id as CourtOsResponsibilityDesignKey,
    ) ?? [];
    const groups = new Map<string, CourtOsStewardshipWorkspaceAssignmentInputV1[]>();
    for (const assignment of workspaceRows) {
      const scopeId = assignment.row.scope_id ?? assignment.row.subject_id;
      if (!scopeId) continue;
      const group = groups.get(scopeId) ?? [];
      group.push(assignment);
      groups.set(scopeId, group);
    }
    const scopes: CourtOsStewardshipScopeV1[] = [];
    for (const [scopeId, assignments] of groups) {
      const first = assignments[0];
      if (!first) continue;
      const holderIdentities = new Set(assignments.map((assignment) =>
        `${assignment.row.accountable_person_id}::${assignment.row.accountable_person_label}`,
      ));
      const scopeLabels = new Set(assignments.map((assignment) =>
        assignment.row.scope_label ?? assignment.row.subject_label ?? "Recorded scope",
      ));
      if (holderIdentities.size !== 1 || scopeLabels.size !== 1) {
        diagnostics.push({
          code: "duplicate_scope_conflict",
          responsibility_id: responsibility.responsibility_id,
          scope_id: scopeId,
        });
        continue;
      }
      scopes.push({
        responsibility_id: responsibility.responsibility_id,
        responsibility_label: responsibility.responsibility_label,
        room_id: responsibility.room_id,
        room_label: responsibility.room_label,
        scope_id: scopeId,
        scope_label: [...scopeLabels][0]!,
        source_record_id: first.source_record_id,
        current_holder: {
          person_id: first.row.accountable_person_id!,
          display_name: first.row.accountable_person_label!,
        },
      });
    }
    return Object.freeze({ ...responsibility, scopes: Object.freeze(scopes) });
  });
  if (
    input.session.selected_house_id !== input.projection.query.house_id ||
    input.session.selected_house_id !== input.council.house_ref.entity_id
  ) {
    diagnostics.push({
      code: "house_scope_mismatch",
      responsibility_id: null,
      scope_id: null,
    });
  }
  const horizon = threeYearStewardshipHorizonFrom(
    input.projection.contract.effective_date,
  );
  if (!horizon) {
    diagnostics.push({
      code: "invalid_effective_date",
      responsibility_id: null,
      scope_id: null,
    });
  }
  const actingActor = input.session.acting_actor;
  const actorReady =
    input.session.capabilities.manage_assignments &&
    actingActor.status === "house_head" &&
    actingActor.person_id === input.council.head_ref.entity_id;
  const structurallyValid = diagnostics.every(
    (diagnostic) => diagnostic.code !== "house_scope_mismatch" &&
      diagnostic.code !== "invalid_effective_date",
  );
  const authoritySourceGenerationId = input.authority_source_generation_id ?? null;
  const candidateRows = input.projection.responsibility_assignment_candidates ?? [];
  const candidateGeneration =
    input.projection.responsibility_assignment_candidate_generation_id ?? null;
  const candidateContractAvailable = candidateRows.length > 0 || candidateGeneration !== null;
  const candidateContractValid =
    candidateGeneration === FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION &&
    candidateRows.length > 0 &&
    candidateRows.every((row) =>
      row.generation_id === candidateGeneration &&
      row.effective_date === input.projection.contract.effective_date &&
      row.house_id === input.projection.query.house_id &&
      row.source_authority_generation_id === authoritySourceGenerationId &&
      row.eligibility_posture === "admitted_uat1_plan_candidate" &&
      row.eligibility_bounds === "authority_and_custody_revalidate_before_execution" &&
      row.authority_boundary === "house" &&
      row.source_candidate_only_lineage === "true" &&
      row.foundation_a_authority_admission_disposition === "admitted_resolved_instance_only" &&
      row.source_runtime_authority_posture === "foundation_a_uat_only_not_canon" &&
      ALTERNATE_STEWARD_POLICY_SHA256.has(row.policy_sha256) &&
      row.capacity_posture === "not_evaluated_not_implied" &&
      row.runtime_authority === "false" &&
      row.canon_status === "foundation_a_uat1_not_canon",
    );
  if (candidateContractAvailable && !candidateContractValid) {
    diagnostics.push({
      code: "alternate_candidate_contract_mismatch",
      responsibility_id: null,
      scope_id: null,
    });
  }
  const candidatesByExactScope = new Map<string, Household1120StewardshipCandidateRow[]>();
  if (candidateContractValid) {
    for (const row of candidateRows) {
      const key = courtOsStewardshipScopeKey(row.responsibility_id, row.scope_id);
      const rows = candidatesByExactScope.get(key) ?? [];
      rows.push(row);
      candidatesByExactScope.set(key, rows);
    }
  }
  let context: CourtOsStewardshipPlanContextV1 | null = null;
  if (
    structurallyValid &&
    actorReady &&
    actingActor.status === "house_head" &&
    horizon &&
    authoritySourceGenerationId
  ) {
    context = {
        house_id: input.session.selected_house_id,
        acting_actor_person_id: actingActor.person_id,
        actor_authority_basis_id: actingActor.authority_basis,
        source_generation_id: candidateContractValid
          ? `${authoritySourceGenerationId}::alternate-steward-eligibility@${candidateGeneration}`
          : authoritySourceGenerationId,
        effective_date: input.projection.contract.effective_date,
        planning_horizon: horizon,
      };
  }

  const candidatesByScope = new Map<
    string,
    readonly CourtOsStewardshipCandidateV1[]
  >();
  for (const responsibility of responsibilities) {
    for (const scope of responsibility.scopes) {
      const scopeKey = courtOsStewardshipScopeKey(
        scope.responsibility_id,
        scope.scope_id,
      );
      const admittedCandidates = (candidatesByExactScope.get(scopeKey) ?? [])
        .filter((row) =>
          row.source_authority_assignment_id === scope.source_record_id &&
          row.person_id !== scope.current_holder?.person_id &&
          row.person_id !== input.council.head_ref.entity_id,
        )
        .map((row) => ({
          person_id: row.person_id,
          display_name: row.person_name,
          eligibility: "admitted_candidate" as const,
          eligibility_source_id: row.eligibility_candidate_id,
        }));
      candidatesByScope.set(
        scopeKey,
        courtOsStewardshipCandidates({
          admitted_candidates: admittedCandidates,
          current_holder: scope.current_holder,
          current_holder_source_id: scope.current_holder
            ? scope.source_record_id
            : null,
          head: {
            person_id: input.council.head_ref.entity_id,
            display_name: input.council.head_ref.display_name,
          },
          head_self_assignment_authority_id: context?.actor_authority_basis_id ?? null,
        }),
      );
    }
  }

  return Object.freeze({
    context,
    responsibilities: Object.freeze(responsibilities),
    candidates_by_scope: candidatesByScope,
    diagnostics: Object.freeze(diagnostics),
    planning_status: !structurallyValid
      ? "invalid"
      : context
        ? "ready"
        : "read_only",
  });
}
