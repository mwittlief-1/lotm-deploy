import { describe, expect, it } from "vitest";

import {
  buildCouncilRoomReadyProjection,
  DEFAULT_COUNCIL_ROOM_HOUSE_ID,
} from "../../src/ready/councilRoomReadyProjection";
import {
  courtOsAssignmentScopeForReview,
  courtOsAssignmentCandidates,
  courtOsAssignmentScopes,
  courtOsWorkspaceAssignmentScopes,
} from "../../src/ui/courtosResponsibilityAssignment";
import type { Household1120ResponsibilityRow } from "../../src/ui/readModels/household1120/types";
import { courtOsRouteForAssignmentDialog } from "../../src/ui/panels/HouseholdVerticalSlice";
import {
  courtOsRouteFromSearch,
  courtOsSearchForRoute,
} from "../../src/ui/courtosRoute";

describe("CourtOS responsibility assignment interaction", () => {
  it("offers only explicit HoH self-assignment and holder retention without inferring Council eligibility", () => {
    const council = buildCouncilRoomReadyProjection({
      houseId: DEFAULT_COUNCIL_ROOM_HOUSE_ID,
      turnYear: 1120,
    });
    const candidates = courtOsAssignmentCandidates(council, {
      personId: "person-current-outside-council",
      displayName: "Current local holder",
    });

    expect(candidates.map((candidate) => candidate.entity_id)).toEqual([
      council.head_ref.entity_id,
      "person-current-outside-council",
    ]);
    expect(candidates.some((candidate) => candidate.eligibility === ("inner_council" as never))).toBe(false);
    expect(
      candidates.some((candidate) =>
        council.summoned_or_available_attendees.some(
          (attendee) => attendee.person_ref.entity_id === candidate.entity_id,
        ),
      ),
    ).toBe(false);
  });

  it("deduplicates exact admitted scopes and never manufactures a missing scope", () => {
    const base = {
      responsibility_summary_id: "summary-1",
      responsibility_demand_id: "demand-1",
      demand_entity_id: "manor_hx_44835",
      demand_entity_label: "Roadcote Court",
      responsibility_id: "responsibility-1",
      responsibility_label: "Manor Stewardship",
      source_legacy_responsibility_id: "courtos.responsibility.manor_stewardship",
      source_legacy_responsibility_label: "Manor Stewardship",
      demand_state: "current",
      coverage_state: "covered",
      holder_person_id: "person-steward",
      holder_display_name: "Recorded steward",
      authority_posture: "recorded",
      authority_scope_id: "manor_hx_44835",
      authority_scope_label: "Roadcote Court",
      manor_id: "manor_hx_44835",
      effective_date: "1120-01-01",
      source_authority_status: "foundation_a_uat1_admitted_read_model",
      runtime_authority: 0,
      disclosure_posture: "house_scoped",
    } satisfies Household1120ResponsibilityRow;
    const scopes = courtOsAssignmentScopes([
      base,
      { ...base, responsibility_summary_id: "summary-duplicate" },
      {
        ...base,
        responsibility_summary_id: "summary-2",
        responsibility_demand_id: "demand-2",
        demand_entity_id: "manor_hx_38958",
        demand_entity_label: "Other manor",
        authority_scope_id: "manor_hx_38958",
        authority_scope_label: "Other manor",
        manor_id: "manor_hx_38958",
      },
    ]);

    expect(scopes.map((scope) => scope.scope_id)).toEqual([
      "manor_hx_44835",
      "manor_hx_38958",
    ]);
    expect(courtOsAssignmentScopes([])).toEqual([]);
  });

  it("uses an exact workspace project scope without leaking or manufacturing source fields", () => {
    const scopes = courtOsWorkspaceAssignmentScopes([{
      source_table: "works_project_assignment_context_v1",
      subject_id: "project-1",
      subject_label: "Repair the mill leat",
      scope_id: "project-1",
      scope_label: "Repair the mill leat",
      accountable_person_id: "person-1",
      accountable_person_label: "Recorded works steward",
      player_surface_eligible: true,
      state: "active",
      evidence_references: [{ field: "source_basis", value: "admitted project record" }],
    }]);
    expect(scopes).toEqual([expect.objectContaining({
      scope_id: "project-1",
      scope_label: "Repair the mill leat",
      holder_person_id: "person-1",
    })]);
    expect(courtOsWorkspaceAssignmentScopes([{
      source_table: "withheld",
      subject_id: null,
      subject_label: null,
      scope_id: null,
      scope_label: null,
      accountable_person_id: null,
      accountable_person_label: null,
      player_surface_eligible: false,
      state: "withheld",
      evidence_references: [],
    }])).toEqual([]);
  });

  it("opens a lone charge directly and makes multi-scope stewardship choose an exact charge", () => {
    const roadcote = {
      scope_id: "manor_hx_44835",
      scope_label: "Roadcote Court",
      holder_person_id: "person-steward",
      holder_display_name: "Recorded steward",
      source_row: null,
    };
    const pearwick = {
      ...roadcote,
      scope_id: "manor_hx_38958",
      scope_label: "Pearwick Hall",
    };

    expect(courtOsAssignmentScopeForReview([roadcote], null)).toBe(roadcote);
    expect(courtOsAssignmentScopeForReview([roadcote, pearwick], null)).toBeNull();
    expect(
      courtOsAssignmentScopeForReview([roadcote, pearwick], "manor_hx_44835"),
    ).toBe(roadcote);
    expect(
      courtOsAssignmentScopeForReview([roadcote, pearwick], "unknown-scope"),
    ).toBeNull();
  });

  it("routes a House Command plan action into the exact responsibility and preserves its scope", () => {
    const route = courtOsRouteForAssignmentDialog({
      responsibility: "manor_fiscal_administration",
      scopeId: "manor_hx_44835",
    });
    expect(route).toEqual({
      place: {
        kind: "responsibility",
        domain: "resources_finance",
        responsibility: "manor_fiscal_administration",
        scopeId: "manor_hx_44835",
      },
      detail: { kind: "assignment_basis" },
    });
    expect(courtOsRouteFromSearch(courtOsSearchForRoute("", route))).toEqual(route);

    expect(courtOsRouteForAssignmentDialog({
      responsibility: "office_post_appointments",
    })).toEqual({
      place: { kind: "house_command" },
      detail: {
        kind: "command_responsibility",
        responsibility: "office_post_appointments",
      },
    });
  });
});
