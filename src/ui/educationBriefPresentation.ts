import type {
  Household1120EducationCycleReportRow,
  Household1120EducationLearnerPlanRow,
} from "./readModels/household1120/types";

export interface CourtOsEducationCyclePresentationV1 {
  state: "reported" | "begins_this_turn" | "not_available";
  headline: string;
  course: string;
  accountSpan: string;
  continuity: string;
  nextReview: string;
}

const PROGRESS_LABELS: Readonly<Record<string, string>> = {
  advancing_in_primary_instruction: "Advancing in primary instruction",
  forming_foundations: "Foundations are forming",
  new_to_primary_instruction: "New to primary instruction",
  not_yet_reportable: "Instruction begins this turn",
};

const COURSE_LABELS: Readonly<Record<string, string>> = {
  steady_progress: "The responsible party reports steady progress.",
  not_started_in_review_window: "No instruction fell within the prior review window.",
};

const CONTINUITY_LABELS: Readonly<Record<string, string>> = {
  arrangement_assumed_active_from_1117: "Account spans 1117–1119",
  instruction_commenced_mid_cycle_at_zero: "Instruction began during the prior cycle",
  instruction_commences_at_turn0: "Instruction begins in 1120",
};

function sentenceCase(value: string): string {
  const clean = value.replace(/_/g, " ").trim();
  return clean ? `${clean[0]?.toUpperCase()}${clean.slice(1)}` : "Not recorded";
}

export function courtOsEducationProgressLabel(value: string | null | undefined): string {
  if (!value) return "No prior account is available";
  return PROGRESS_LABELS[value] ?? sentenceCase(value);
}

export function buildCourtOsEducationCyclePresentation(
  plan: Pick<Household1120EducationLearnerPlanRow, "review_date">,
  report: Household1120EducationCycleReportRow | null | undefined,
): CourtOsEducationCyclePresentationV1 {
  const nextReview = plan.review_date
    ? `Review due ${plan.review_date}`
    : "Review date not entered";

  if (!report) {
    return {
      state: "not_available",
      headline: "No prior account is available",
      course: "The current arrangement remains readable without inventing a report.",
      accountSpan: "No prior-cycle account",
      continuity: "Current arrangement only",
      nextReview,
    };
  }

  const receiptCount = report.annual_receipt_count ?? 0;
  const beginsThisTurn = receiptCount === 0 ||
    report.report_state === "instruction_commences_at_turn0" ||
    report.progress_interpretation === "not_yet_reportable";
  if (beginsThisTurn) {
    return {
      state: "begins_this_turn",
      headline: "Instruction begins this turn",
      course: "No prior progress account is due because instruction begins in 1120.",
      accountSpan: "Begins in 1120",
      continuity: CONTINUITY_LABELS[report.assignment_continuity_basis ?? ""] ?? "New arrangement",
      nextReview,
    };
  }

  return {
    state: "reported",
    headline: courtOsEducationProgressLabel(report.progress_interpretation),
    course: COURSE_LABELS[report.progress_course_interpretation ?? ""] ??
      sentenceCase(report.progress_course_interpretation ?? "Course not recorded"),
    accountSpan: `${receiptCount} annual ${receiptCount === 1 ? "account" : "accounts"} · 1117–1119`,
    continuity: CONTINUITY_LABELS[report.assignment_continuity_basis ?? ""] ??
      sentenceCase(report.assignment_continuity_basis ?? "Continuity not recorded"),
    nextReview,
  };
}
