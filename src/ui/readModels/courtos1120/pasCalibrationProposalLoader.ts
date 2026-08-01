import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  COURTOS_1120_PAS_CALIBRATION_PROPOSAL_SCHEMA_VERSION,
  type CourtOs1120PasBaselineState,
  type CourtOs1120PasCalibrationProposalV0,
  type CourtOs1120PasDisplayWidthBasis,
  type CourtOs1120PasEffectiveState,
  type CourtOs1120PasSegmentStateV1,
  type CourtOs1120PasTooltipState
} from "./pasCalibrationTypes";

export const COURTOS_1120_PAS_CALIBRATION_PROPOSAL_DIR =
  "data/genrun/courtos_uat_m5_pas_calibration_v0_population_proposal_v1" as const;

const MANIFEST_FILENAME = "MANIFEST.json";
const PEARWICK_SEGMENT_PREVIEW_FILENAME = "pearwick_hall_segment_impact_preview.csv";

interface PasProposalManifest {
  package_id?: unknown;
  proposal_id?: unknown;
  status?: unknown;
  effective_date?: unknown;
  calibration_version?: unknown;
  authority?: unknown;
  invariants?: unknown;
}

type CsvRecord = Record<string, string>;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((parsedRow) => parsedRow.some((value) => value.trim().length > 0));
}

function csvRecords(text: string): CsvRecord[] {
  const [headers, ...rows] = parseCsv(text);
  if (!headers || headers.length === 0) return [];
  return rows.map((row) => {
    const record: CsvRecord = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? "";
    });
    return record;
  });
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function numericValue(value: string | undefined): number | null {
  if (!value || value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function numericNonNegativeValue(value: string | undefined): number | null {
  if (!value || value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function integerValue(value: string | undefined): number {
  if (!value || value.trim().length === 0) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : 0;
}

function baselineState(raw: string): CourtOs1120PasBaselineState {
  if (raw.includes("not_applicable")) return "not_applicable";
  if (raw.includes("approved")) return "calibration_prior_approved_not_effective";
  if (raw.includes("proposed")) return "calibration_prior_proposed";
  return "unavailable";
}

function effectiveState(raw: string): CourtOs1120PasEffectiveState {
  if (raw.includes("not_applicable")) return "not_applicable";
  if (raw.includes("partial")) return "partial_context_not_computable";
  if (raw.includes("computable")) return "computable_effective_pas";
  return "unavailable_missing_required_drivers";
}

function widthBasis(raw: string): CourtOs1120PasDisplayWidthBasis {
  if (raw.includes("effective")) return "effective_pas";
  if (raw.includes("baseline")) return "baseline_calibration_prior";
  return "equal_width";
}

function tooltipState(raw: string): CourtOs1120PasTooltipState {
  if (raw.includes("not_applicable")) return "pas_not_applicable";
  if (raw.includes("partial")) return "baseline_prior_effective_partial";
  if (raw.includes("effective_pas")) return "effective_pas";
  return "baseline_prior_effective_unavailable";
}

function segmentState(
  record: CsvRecord,
  calibrationVersion: string
): CourtOs1120PasSegmentStateV1 {
  const baselineValue = numericValue(record.proposed_baseline_pas);
  const effective = effectiveState(record.proposed_effective_pas_state ?? "");
  return {
    segment_id: record.segment_id ?? "",
    source_kind: record.source_kind === "assignment_signal" ? "assignment_signal" : "responsibility",
    source_ref: record.source_ref ?? "",
    pas_unit_label: "PAS",
    baseline: {
      value: baselineValue,
      state: baselineState(record.proposed_baseline_pas_state ?? ""),
      calibration_version: baselineValue === null ? null : calibrationVersion,
      authority: "proposal_only"
    },
    effective: {
      value: numericValue(record.proposed_effective_pas),
      state: effective,
      null_reason:
        effective === "computable_effective_pas"
          ? null
          : record.proposed_effective_pas_state || "effective_pas_unavailable"
    },
    evidence: {
      required: 0,
      accepted: 0,
      held: 0,
      missing: integerValue(record.explicit_missing_observation_count),
      coverage_pct: numericNonNegativeValue(record.evidence_coverage_pct)
    },
    display: {
      width_basis: widthBasis(record.proposed_width_basis ?? ""),
      tooltip_state: tooltipState(record.tooltip_state ?? ""),
      baseline_badge_required: baselineValue !== null
    },
    raw: {
      proposed_width_basis: record.proposed_width_basis ?? "",
      tooltip_state: record.tooltip_state ?? "",
      proposed_baseline_pas_state: record.proposed_baseline_pas_state ?? "",
      proposed_effective_pas_state: record.proposed_effective_pas_state ?? "",
      current_ui_segment_pas_state: record.current_ui_segment_pas_state ?? ""
    }
  };
}

export async function loadCourtOs1120PasCalibrationProposalV0(
  rootDir = process.cwd()
): Promise<CourtOs1120PasCalibrationProposalV0> {
  const packageDir = resolve(rootDir, COURTOS_1120_PAS_CALIBRATION_PROPOSAL_DIR);
  const [manifestText, previewText] = await Promise.all([
    readFile(resolve(packageDir, MANIFEST_FILENAME), "utf8"),
    readFile(resolve(packageDir, PEARWICK_SEGMENT_PREVIEW_FILENAME), "utf8")
  ]);
  const manifest = JSON.parse(manifestText) as PasProposalManifest;
  const calibrationVersion = stringValue(manifest.calibration_version, "courtos_pas_uat_calibration_v0_proposed");
  const segments = csvRecords(previewText)
    .map((record) => segmentState(record, calibrationVersion))
    .filter((segment) => segment.segment_id.length > 0);
  const baselineSegments = segments.filter((segment) => segment.baseline.value !== null);
  const effectiveSegments = segments.filter((segment) => segment.effective.value !== null);
  const invariants = Array.isArray(manifest.invariants)
    ? manifest.invariants.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    schema_version: COURTOS_1120_PAS_CALIBRATION_PROPOSAL_SCHEMA_VERSION,
    package_id: stringValue(manifest.package_id, "courtos_uat_m5_pas_calibration_v0_population_proposal_v1"),
    proposal_id: stringValue(manifest.proposal_id, "M5-W7-PAS-CALIBRATION-V0-POPULATION-PROPOSAL-001"),
    status: stringValue(manifest.status, "INTEGRATION_READY_PROPOSAL_ONLY_NO_POPULATION_NO_PROMOTION"),
    effective_date: stringValue(manifest.effective_date, "1120-01-01"),
    calibration_version: calibrationVersion,
    authority: stringValue(manifest.authority, "non_mutating_uat_calibration_population_proposal_only"),
    source_path: `${COURTOS_1120_PAS_CALIBRATION_PROPOSAL_DIR}/${PEARWICK_SEGMENT_PREVIEW_FILENAME}`,
    segment_count: segments.length,
    baseline_segment_count: baselineSegments.length,
    baseline_pas_total: Number(baselineSegments.reduce((sum, segment) => sum + (segment.baseline.value ?? 0), 0).toFixed(2)),
    effective_segment_count: effectiveSegments.length,
    assignment_signal_count: segments.filter((segment) => segment.source_kind === "assignment_signal").length,
    segments,
    invariants
  };
}
