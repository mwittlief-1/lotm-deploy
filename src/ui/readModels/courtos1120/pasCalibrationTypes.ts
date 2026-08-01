export const COURTOS_1120_PAS_CALIBRATION_PROPOSAL_SCHEMA_VERSION =
  "courtos_1120_pas_calibration_proposal_v0" as const;

export type CourtOs1120PasBaselineState =
  | "not_applicable"
  | "unavailable"
  | "calibration_prior_proposed"
  | "calibration_prior_approved_not_effective";

export type CourtOs1120PasEffectiveState =
  | "not_applicable"
  | "unavailable_missing_required_drivers"
  | "partial_context_not_computable"
  | "computable_effective_pas";

export type CourtOs1120PasAuthority = "proposal_only" | "executive_approved_uat_calibration_only";

export type CourtOs1120PasDisplayWidthBasis = "equal_width" | "baseline_calibration_prior" | "effective_pas";

export type CourtOs1120PasTooltipState =
  | "pas_not_applicable"
  | "baseline_prior_effective_unavailable"
  | "baseline_prior_effective_partial"
  | "effective_pas";

export interface CourtOs1120PasSegmentStateV1 {
  segment_id: string;
  source_kind: "responsibility" | "assignment_signal";
  source_ref: string;
  pas_unit_label: "PAS";
  baseline: {
    value: number | null;
    state: CourtOs1120PasBaselineState;
    calibration_version: string | null;
    authority: CourtOs1120PasAuthority;
  };
  effective: {
    value: number | null;
    state: CourtOs1120PasEffectiveState;
    null_reason: string | null;
  };
  evidence: {
    required: number;
    accepted: number;
    held: number;
    missing: number;
    coverage_pct: number | null;
  };
  display: {
    width_basis: CourtOs1120PasDisplayWidthBasis;
    tooltip_state: CourtOs1120PasTooltipState;
    baseline_badge_required: boolean;
  };
  raw: {
    proposed_width_basis: string;
    tooltip_state: string;
    proposed_baseline_pas_state: string;
    proposed_effective_pas_state: string;
    current_ui_segment_pas_state: string;
  };
}

export interface CourtOs1120PasCalibrationProposalV0 {
  schema_version: typeof COURTOS_1120_PAS_CALIBRATION_PROPOSAL_SCHEMA_VERSION;
  package_id: string;
  proposal_id: string;
  status: string;
  effective_date: string;
  calibration_version: string;
  authority: string;
  source_path: string;
  segment_count: number;
  baseline_segment_count: number;
  baseline_pas_total: number;
  effective_segment_count: number;
  assignment_signal_count: number;
  segments: readonly CourtOs1120PasSegmentStateV1[];
  invariants: readonly string[];
}
