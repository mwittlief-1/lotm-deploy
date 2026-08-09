import { describe, expect, it } from "vitest";

import { COURTOS_RESPONSIBILITIES } from "../../src/ui/courtosInformationArchitecture";
import {
  buildCourtOsStewardshipPlanningProjection,
  courtOsStewardshipResponsibilitiesFromAuthority,
} from "../../src/ui/courtosStewardshipPlanningProjection";
import type { CouncilRoomReadyProjectionV1 } from "../../src/ready/councilRoomReadyProjection";
import type { CourtOsSessionContextV1 } from "../../src/courtosSessionContext";
import type {
  Household1120ReadOnlyProjection,
  Household1120ResponsibilityRow,
  Household1120StewardshipCandidateRow,
} from "../../src/ui/readModels/household1120/types";
import { FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION } from "../../src/ui/readModels/householdFoundationA/alternateStewardEligibilityUat1Projection";
import { FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION } from "../../src/ui/courtosResponsibilityAuthoritySource";

function authorityRow(input: {
  responsibility: string;
  scopeId: string | null;
  scopeLabel: string;
  holderId?: string | null;
  holderName?: string | null;
  recordId?: string;
}): Household1120ResponsibilityRow {
  return {
    responsibility_summary_id: input.recordId ?? `summary:${input.responsibility}:${input.scopeId}`,
    responsibility_demand_id: `demand:${input.responsibility}:${input.scopeId}`,
    demand_entity_id: input.scopeId as unknown as string,
    demand_entity_label: input.scopeLabel,
    responsibility_id: input.responsibility,
    responsibility_label: input.responsibility,
    source_legacy_responsibility_id: `courtos.responsibility.${input.responsibility}`,
    source_legacy_responsibility_label: input.responsibility,
    demand_state: "active",
    coverage_state: "recorded",
    holder_person_id: input.holderId ?? "t0p_holder",
    holder_display_name: input.holderName ?? "Recorded Holder",
    authority_posture: "admitted",
    authority_scope_id: input.scopeId,
    authority_scope_label: input.scopeLabel,
    effective_date: "1120-01-01",
    source_authority_status: "admitted",
    runtime_authority: 0,
    disclosure_posture: "house_record",
  };
}

function alternateCandidate(input: {
  houseId?: string;
  responsibility?: string;
  scopeId?: string;
  authorityAssignmentId?: string;
  personId?: string;
  personName?: string;
  generationId?: string;
  sourceAuthorityGenerationId?: string;
} = {}): Household1120StewardshipCandidateRow {
  return {
    eligibility_candidate_id: "case1:alternate",
    generation_id: input.generationId ?? FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION,
    effective_date: "1120-01-01",
    house_id: input.houseId ?? "t0h_pearwick",
    responsibility_id: input.responsibility ?? "house_fiscal_administration",
    responsibility_instance_id: "responsibility-instance",
    scope_id: input.scopeId ?? "t0h_pearwick",
    person_id: input.personId ?? "t0p_alternate",
    person_name: input.personName ?? "Gilbert Tanner",
    eligibility_posture: "admitted_uat1_plan_candidate",
    eligibility_bounds: "authority_and_custody_revalidate_before_execution",
    deterministic_order: "1",
    selector_priority: "20",
    selector: "inner_council_portfolio_holder",
    eligibility_basis: "accepted_7302_house_assignment_policy",
    affiliation_basis: "locked_house_affiliate",
    evidence_kind: "locked_inner_council_portfolio_membership",
    evidence_ids: "evidence:1",
    provenance_refs: "source#evidence:1",
    authority_boundary: "house",
    source_authority_assignment_id: input.authorityAssignmentId ??
      "summary:house_fiscal_administration:t0h_pearwick",
    source_authority_generation_id: input.sourceAuthorityGenerationId ??
      FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION,
    source_candidate_only_lineage: "true",
    foundation_a_authority_admission_disposition: "admitted_resolved_instance_only",
    source_runtime_authority_posture: "foundation_a_uat_only_not_canon",
    policy_id: "phase_five_house_wide_default_owner_policy_v3",
    policy_sha256: "16dfd2b597b27c5900b5287c5d78ca3e91018e28ca25e30e902d28b146d0511b",
    capacity_posture: "not_evaluated_not_implied",
    runtime_authority: "false",
    canon_status: "foundation_a_uat1_not_canon",
  };
}

describe("CourtOS stewardship planning projection", () => {
  it("always presents the sole 24-responsibility hierarchy and only source scopes", () => {
    const adapted = courtOsStewardshipResponsibilitiesFromAuthority([
      authorityRow({
        responsibility: "household_stores_provisioning_procurement",
        scopeId: "t0h_pearwick",
        scopeLabel: "House Pearwick Hall",
      }),
      authorityRow({
        responsibility: "manor_stewardship",
        scopeId: "manor_hx_44835",
        scopeLabel: "Roadcote Court",
      }),
    ]);

    expect(adapted.responsibilities).toHaveLength(24);
    expect(adapted.responsibilities.map((item) => item.responsibility_id)).toEqual(
      COURTOS_RESPONSIBILITIES.map((item) => item.key),
    );
    expect(adapted.responsibilities.find(
      (item) => item.responsibility_id === "manor_stewardship",
    )?.scopes).toEqual([expect.objectContaining({
      scope_id: "manor_hx_44835",
      scope_label: "Roadcote Court",
      source_record_id: "summary:manor_stewardship:manor_hx_44835",
    })]);
    expect(adapted.responsibilities.find(
      (item) => item.responsibility_id === "education_formation",
    )?.scopes).toEqual([]);
  });

  it("withholds duplicate scope rows with conflicting stewardship", () => {
    const adapted = courtOsStewardshipResponsibilitiesFromAuthority([
      authorityRow({
        responsibility: "manor_stewardship",
        scopeId: "manor_hx_44835",
        scopeLabel: "Roadcote Court",
        holderId: "t0p_first",
        holderName: "First Steward",
        recordId: "summary:first",
      }),
      authorityRow({
        responsibility: "manor_stewardship",
        scopeId: "manor_hx_44835",
        scopeLabel: "Roadcote Court",
        holderId: "t0p_second",
        holderName: "Second Steward",
        recordId: "summary:second",
      }),
    ]);

    expect(adapted.responsibilities.find(
      (item) => item.responsibility_id === "manor_stewardship",
    )?.scopes).toEqual([]);
    expect(adapted.diagnostics).toContainEqual({
      code: "duplicate_scope_conflict",
      responsibility_id: "manor_stewardship",
      scope_id: "manor_hx_44835",
    });
  });

  it("does not admit obsolete or unknown responsibility identifiers", () => {
    const adapted = courtOsStewardshipResponsibilitiesFromAuthority([
      authorityRow({
        responsibility: "legacy_atom_49",
        scopeId: "legacy:scope",
        scopeLabel: "Legacy scope",
      }),
    ]);

    expect(adapted.responsibilities).toHaveLength(24);
    expect(adapted.responsibilities.every((item) => item.scopes.length === 0)).toBe(true);
    expect(adapted.diagnostics).toContainEqual({
      code: "unrecognized_responsibility",
      responsibility_id: "legacy_atom_49",
      scope_id: "legacy:scope",
    });
  });

  it("retains one verified responsibility-wide null scope without fabricating absent scopes", () => {
    const adapted = courtOsStewardshipResponsibilitiesFromAuthority([
      authorityRow({
        responsibility: "house_fiscal_administration",
        scopeId: null,
        scopeLabel: "House-wide fiscal administration",
        recordId: "summary:house-fiscal:wide",
      }),
    ]);

    expect(adapted.responsibilities.find(
      (item) => item.responsibility_id === "house_fiscal_administration",
    )?.scopes).toEqual([expect.objectContaining({
      scope_id: null,
      scope_label: "House-wide fiscal administration",
      source_record_id: "summary:house-fiscal:wide",
    })]);
    expect(adapted.responsibilities.find(
      (item) => item.responsibility_id === "adult_kin_support",
    )?.scopes).toEqual([]);
  });

  it("keeps planning read-only when the exact authority generation is absent", () => {
    const projection = {
      contract: {
        generation_id: "broader-household-generation",
        effective_date: "1120-01-01",
      },
      query: { house_id: "t0h_pearwick" },
      responsibility_summary: [authorityRow({
        responsibility: "house_fiscal_administration",
        scopeId: "t0h_pearwick",
        scopeLabel: "House Pearwick Hall",
      })],
    } as unknown as Household1120ReadOnlyProjection;
    const session = {
      selected_house_id: "t0h_pearwick",
      capabilities: { manage_assignments: true },
      acting_actor: {
        status: "house_head",
        person_id: "t0p_edmund",
        authority_basis: "foundation_a_uat1_succession_head_identity_plus_player_session",
      },
    } as unknown as CourtOsSessionContextV1;
    const council = {
      house_ref: { entity_id: "t0h_pearwick" },
      head_ref: { entity_id: "t0p_edmund", display_name: "Edmund" },
    } as unknown as CouncilRoomReadyProjectionV1;

    const result = buildCourtOsStewardshipPlanningProjection({
      projection,
      session,
      council,
      authority_source_generation_id: null,
    });
    expect(result.planning_status).toBe("read_only");
    expect(result.context).toBeNull();
    expect(result.candidates_by_scope.values().next().value).toEqual([
      expect.objectContaining({ eligibility: "current_holder" }),
    ]);
  });

  it("uses an exact eligible project workspace scope when the House authority register has no project charge", () => {
    const projection = {
      contract: { generation_id: "household", effective_date: "1120-01-01" },
      query: { house_id: "t0h_pearwick" },
      responsibility_summary: [],
    } as unknown as Household1120ReadOnlyProjection;
    const session = {
      selected_house_id: "t0h_pearwick",
      capabilities: { manage_assignments: true },
      acting_actor: {
        status: "house_head",
        person_id: "t0p_edmund",
        authority_basis: "head-authority",
      },
    } as unknown as CourtOsSessionContextV1;
    const council = {
      house_ref: { entity_id: "t0h_pearwick" },
      head_ref: { entity_id: "t0p_edmund", display_name: "Edmund" },
    } as unknown as CouncilRoomReadyProjectionV1;

    const result = buildCourtOsStewardshipPlanningProjection({
      projection,
      session,
      council,
      authority_source_generation_id: "authority-generation",
      workspace_assignment_rows: [{
        responsibility_id: "works_project_supervision",
        source_record_id: "conditional-package::digest::works::project-1::osmund",
        row: {
          source_table: "works_project_assignment_context_v1",
          subject_id: "project-1",
          subject_label: "Hall roof renewal",
          scope_id: "project-1",
          scope_label: "Hall roof renewal",
          accountable_person_id: "t0p_osmund",
          accountable_person_label: "Osmund Cooper",
          player_surface_eligible: true,
        },
      }],
    });

    const works = result.responsibilities.find(
      (responsibility) => responsibility.responsibility_id === "works_project_supervision",
    );
    expect(works?.scopes).toEqual([expect.objectContaining({
      scope_id: "project-1",
      scope_label: "Hall roof renewal",
      source_record_id: "conditional-package::digest::works::project-1::osmund",
      current_holder: {
        person_id: "t0p_osmund",
        display_name: "Osmund Cooper",
      },
    })]);
    expect(result.candidates_by_scope.get("works_project_supervision::project-1")).toEqual([
      expect.objectContaining({ person_id: "t0p_osmund", eligibility: "current_holder" }),
      expect.objectContaining({ person_id: "t0p_edmund", eligibility: "head_self_assignment" }),
    ]);
  });

  it("never lets a workspace row override an authority-derived scope", () => {
    const projection = {
      contract: { generation_id: "household", effective_date: "1120-01-01" },
      query: { house_id: "t0h_pearwick" },
      responsibility_summary: [authorityRow({
        responsibility: "works_project_supervision",
        scopeId: "authority-project",
        scopeLabel: "Authority project",
        holderId: "t0p_authority",
        holderName: "Authority Steward",
      })],
    } as unknown as Household1120ReadOnlyProjection;
    const session = {
      selected_house_id: "t0h_pearwick",
      capabilities: { manage_assignments: true },
      acting_actor: { status: "house_head", person_id: "t0p_head", authority_basis: "head-authority" },
    } as unknown as CourtOsSessionContextV1;
    const council = {
      house_ref: { entity_id: "t0h_pearwick" },
      head_ref: { entity_id: "t0p_head", display_name: "Head" },
    } as unknown as CouncilRoomReadyProjectionV1;

    const result = buildCourtOsStewardshipPlanningProjection({
      projection,
      session,
      council,
      authority_source_generation_id: "authority-generation",
      workspace_assignment_rows: [{
        responsibility_id: "works_project_supervision",
        source_record_id: "workspace-row",
        row: {
          source_table: "works_project_assignment_context_v1",
          subject_id: "workspace-project",
          subject_label: "Workspace project",
          scope_id: "workspace-project",
          scope_label: "Workspace project",
          accountable_person_id: "t0p_workspace",
          accountable_person_label: "Workspace Steward",
          player_surface_eligible: true,
        },
      }],
    });

    expect(result.responsibilities.find(
      (responsibility) => responsibility.responsibility_id === "works_project_supervision",
    )?.scopes).toEqual([expect.objectContaining({
      scope_id: "authority-project",
      current_holder: expect.objectContaining({ person_id: "t0p_authority" }),
    })]);
  });

  it("offers exact admitted alternate stewards while retaining the current holder and Head", () => {
    const projection = {
      contract: { generation_id: "household", effective_date: "1120-01-01" },
      query: { house_id: "t0h_pearwick" },
      responsibility_summary: [authorityRow({
        responsibility: "house_fiscal_administration",
        scopeId: "t0h_pearwick",
        scopeLabel: "House Pearwick Hall",
      })],
      responsibility_assignment_candidates: [alternateCandidate()],
      responsibility_assignment_candidate_generation_id:
        FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION,
    } as unknown as Household1120ReadOnlyProjection;
    const session = {
      selected_house_id: "t0h_pearwick",
      capabilities: { manage_assignments: true },
      acting_actor: { status: "house_head", person_id: "t0p_head", authority_basis: "head-authority" },
    } as unknown as CourtOsSessionContextV1;
    const council = {
      house_ref: { entity_id: "t0h_pearwick" },
      head_ref: { entity_id: "t0p_head", display_name: "Edmund" },
    } as unknown as CouncilRoomReadyProjectionV1;

    const result = buildCourtOsStewardshipPlanningProjection({
      projection,
      session,
      council,
      authority_source_generation_id:
        FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION,
    });

    expect(result.context?.source_generation_id).toBe(
      `${FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION}::alternate-steward-eligibility@${FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION}`,
    );
    expect(result.candidates_by_scope.get(
      "house_fiscal_administration::t0h_pearwick",
    )).toEqual([
      expect.objectContaining({ person_id: "t0p_alternate", eligibility: "admitted_candidate" }),
      expect.objectContaining({ person_id: "t0p_holder", eligibility: "current_holder" }),
      expect.objectContaining({ person_id: "t0p_head", eligibility: "head_self_assignment" }),
    ]);
  });

  it("fails mixed alternate bytes closed without removing current-holder or Head planning", () => {
    const projection = {
      contract: { generation_id: "household", effective_date: "1120-01-01" },
      query: { house_id: "t0h_pearwick" },
      responsibility_summary: [authorityRow({
        responsibility: "house_fiscal_administration",
        scopeId: "t0h_pearwick",
        scopeLabel: "House Pearwick Hall",
      })],
      responsibility_assignment_candidates: [alternateCandidate({
        sourceAuthorityGenerationId: "stale-authority-generation",
      })],
      responsibility_assignment_candidate_generation_id:
        FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION,
    } as unknown as Household1120ReadOnlyProjection;
    const session = {
      selected_house_id: "t0h_pearwick",
      capabilities: { manage_assignments: true },
      acting_actor: { status: "house_head", person_id: "t0p_head", authority_basis: "head-authority" },
    } as unknown as CourtOsSessionContextV1;
    const council = {
      house_ref: { entity_id: "t0h_pearwick" },
      head_ref: { entity_id: "t0p_head", display_name: "Edmund" },
    } as unknown as CouncilRoomReadyProjectionV1;

    const result = buildCourtOsStewardshipPlanningProjection({
      projection,
      session,
      council,
      authority_source_generation_id:
        FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION,
    });

    expect(result.context?.source_generation_id).toBe(
      FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION,
    );
    expect(result.diagnostics).toContainEqual({
      code: "alternate_candidate_contract_mismatch",
      responsibility_id: null,
      scope_id: null,
    });
    expect(result.candidates_by_scope.get(
      "house_fiscal_administration::t0h_pearwick",
    )).toEqual([
      expect.objectContaining({ person_id: "t0p_holder", eligibility: "current_holder" }),
      expect.objectContaining({ person_id: "t0p_head", eligibility: "head_self_assignment" }),
    ]);
  });

  it("fails a missing alternate release closed while retaining holder and Head", () => {
    const projection = {
      contract: { generation_id: "household", effective_date: "1120-01-01" },
      query: { house_id: "t0h_pearwick" },
      responsibility_summary: [authorityRow({
        responsibility: "house_fiscal_administration",
        scopeId: "t0h_pearwick",
        scopeLabel: "House Pearwick Hall",
      })],
    } as unknown as Household1120ReadOnlyProjection;
    const result = buildCourtOsStewardshipPlanningProjection({
      projection,
      session: {
        selected_house_id: "t0h_pearwick",
        capabilities: { manage_assignments: true },
        acting_actor: { status: "house_head", person_id: "t0p_head", authority_basis: "head-authority" },
      } as unknown as CourtOsSessionContextV1,
      council: {
        house_ref: { entity_id: "t0h_pearwick" },
        head_ref: { entity_id: "t0p_head", display_name: "Edmund" },
      } as unknown as CouncilRoomReadyProjectionV1,
      authority_source_generation_id:
        FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION,
    });

    expect(result.planning_status).toBe("ready");
    expect(result.candidates_by_scope.get(
      "house_fiscal_administration::t0h_pearwick",
    )).toEqual([
      expect.objectContaining({ person_id: "t0p_holder", eligibility: "current_holder" }),
      expect.objectContaining({ person_id: "t0p_head", eligibility: "head_self_assignment" }),
    ]);
  });

  it("preserves holder and Head semantics when corrupt alternate rows duplicate them", () => {
    const projection = {
      contract: { generation_id: "household", effective_date: "1120-01-01" },
      query: { house_id: "t0h_pearwick" },
      responsibility_summary: [authorityRow({
        responsibility: "house_fiscal_administration",
        scopeId: "t0h_pearwick",
        scopeLabel: "House Pearwick Hall",
      })],
      responsibility_assignment_candidates: [
        alternateCandidate({ personId: "t0p_holder", personName: "Recorded Holder" }),
        alternateCandidate({ personId: "t0p_head", personName: "Edmund" }),
      ],
      responsibility_assignment_candidate_generation_id:
        FOUNDATION_A_UAT1_ALTERNATE_STEWARD_ELIGIBILITY_GENERATION,
    } as unknown as Household1120ReadOnlyProjection;
    const result = buildCourtOsStewardshipPlanningProjection({
      projection,
      session: {
        selected_house_id: "t0h_pearwick",
        capabilities: { manage_assignments: true },
        acting_actor: { status: "house_head", person_id: "t0p_head", authority_basis: "head-authority" },
      } as unknown as CourtOsSessionContextV1,
      council: {
        house_ref: { entity_id: "t0h_pearwick" },
        head_ref: { entity_id: "t0p_head", display_name: "Edmund" },
      } as unknown as CouncilRoomReadyProjectionV1,
      authority_source_generation_id:
        FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION,
    });

    expect(result.candidates_by_scope.get(
      "house_fiscal_administration::t0h_pearwick",
    )).toEqual([
      expect.objectContaining({ person_id: "t0p_holder", eligibility: "current_holder" }),
      expect.objectContaining({ person_id: "t0p_head", eligibility: "head_self_assignment" }),
    ]);
  });
});
