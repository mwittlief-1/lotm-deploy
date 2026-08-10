import { describe, expect, it } from "vitest";

import {
  buildCourtOsEducationCyclePresentation,
  courtOsEducationProgressLabel,
} from "../../src/ui/educationBriefPresentation";

const boundary = {
  source_id: "education-cycle",
  source_status: "opening-cycle-report",
  effective_date: "1120-01-01",
  disclosure_posture: "responsible-party-account",
} as const;

describe("CourtOS Education briefing presentation", () => {
  it("turns the structured prior-cycle report into a Head-facing account", () => {
    expect(buildCourtOsEducationCyclePresentation(
      { review_date: "1121-01-01" },
      {
        ...boundary,
        cycle_report_id: "report-1",
        learner_person_id: "person-1",
        cycle_year: 1119,
        report_state: "three_year_progress_report",
        progress_interpretation: "advancing_in_primary_instruction",
        progress_course_interpretation: "steady_progress",
        annual_receipt_count: 3,
        assignment_continuity_basis: "arrangement_assumed_active_from_1117",
      },
    )).toEqual({
      state: "reported",
      headline: "Advancing in primary instruction",
      course: "The responsible party reports steady progress.",
      accountSpan: "3 annual accounts · 1117–1119",
      continuity: "Account spans 1117–1119",
      nextReview: "Review due 1121-01-01",
    });
  });

  it("does not describe a learner who starts in 1120 as missing progress", () => {
    const presentation = buildCourtOsEducationCyclePresentation(
      { review_date: null },
      {
        ...boundary,
        cycle_report_id: "report-2",
        learner_person_id: "person-2",
        cycle_year: 1119,
        report_state: "instruction_commences_at_turn0",
        progress_interpretation: "not_yet_reportable",
        progress_course_interpretation: "not_started_in_review_window",
        annual_receipt_count: 0,
        assignment_continuity_basis: "instruction_commences_at_turn0",
      },
    );
    expect(presentation.state).toBe("begins_this_turn");
    expect(presentation.headline).toBe("Instruction begins this turn");
    expect(presentation.course).toContain("begins in 1120");
  });

  it("keeps an absent report honest and uses natural labels", () => {
    expect(buildCourtOsEducationCyclePresentation({ review_date: null }, null).state)
      .toBe("not_available");
    expect(courtOsEducationProgressLabel("forming_foundations"))
      .toBe("Foundations are forming");
  });
});
