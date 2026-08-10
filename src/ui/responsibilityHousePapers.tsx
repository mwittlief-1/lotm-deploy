import type React from "react";

import type { CourtOsResponsibilityDataPosture } from "./responsibilityWorkspaceCatalog";

import "./responsibilityHousePapers.css";

export interface CourtOsResponsibilityPaperRecordV1 {
  source_table: string;
  subject_id?: string | null;
  subject_label?: string | null;
  scope_id?: string | null;
  scope_label?: string | null;
  state?: string | null;
  player_surface_eligible?: boolean | null;
  evidence_references: readonly { field: string; value: string }[];
}

export interface CourtOsResponsibilityPaperSelectionV1 {
  kind: "named_evidence" | "opening_record";
  index: number;
  title: string;
  record?: CourtOsResponsibilityPaperRecordV1;
}

export interface CourtOsResponsibilityHousePapersProps {
  detailsRef?: React.Ref<HTMLDetailsElement>;
  evidence: readonly string[];
  records: readonly CourtOsResponsibilityPaperRecordV1[];
  loading: boolean;
  posture: CourtOsResponsibilityDataPosture;
  errorMessage?: string | null;
  onOpenPaper: (selection: CourtOsResponsibilityPaperSelectionV1) => void;
  onRetry?: () => void;
}

const REGISTER_LABELS: Readonly<Record<string, string>> = {
  ro_household_responsibility_summary_v1: "Stewardship register",
  ro_household_stores_position_v1: "Stores account",
  ro_household_stores_history_v1: "Stores movement account",
  ro_household_supply_counterparty_route_v1: "Supply-route account",
  ro_adult_kin_support_roster_v1: "Supported-kin roll",
  ro_adult_kin_support_arrangement_v1: "Support arrangements",
  ro_education_learner_plan_v1: "Learner arrangements",
  ro_education_cycle_report_uat1_v1: "Formation reports",
  ro_household_education_cycle_report_v1: "Formation reports",
  ro_health_roster_v1: "Care roll",
  ro_health_cycle_report_v1: "Care reports",
  ro_care_arrangement_v1: "Specialized-care arrangements",
};

function sentenceCase(value: string): string {
  return value
    .replace(/^ro_/, "")
    .replace(/_v\d+$/, "")
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function registerLabel(sourceTable: string): string {
  return REGISTER_LABELS[sourceTable] ?? sentenceCase(sourceTable);
}

function stateLabel(state: string | null | undefined): string {
  if (!state) return "Held in the opening record";
  const labels: Readonly<Record<string, string>> = {
    admitted_resolved_instance_only: "Accountability recorded",
    candidate_binding_pending_foundation_a_admission: "House and manor scope recorded",
    projected_read_ready: "Available for review",
    read_ready: "Available for review",
    conditional_empty: "No current instance",
    withheld_fail_closed: "No verified entry in the House papers",
    provisional_uat1_fuzzy_report_no_raw_score_or_prose: "Responsible-party account recorded",
  };
  return labels[state] ?? sentenceCase(state);
}

export function CourtOsResponsibilityHousePapers({
  detailsRef,
  evidence,
  records,
  loading,
  posture,
  errorMessage,
  onOpenPaper,
  onRetry,
}: CourtOsResponsibilityHousePapersProps) {
  const visibleRecords = records
    .map((record, sourceIndex) => ({ record, sourceIndex }))
    .filter(({ record }) => record.player_surface_eligible !== false);
  const paperCount = evidence.length + visibleRecords.length;
  return (
    <details className="uat-responsibility-house-papers" ref={detailsRef}>
      <summary>
        <span>
          <small>Secondary record</small>
          <strong>House papers</strong>
        </span>
        <em>{loading ? "Reading…" : `${paperCount} ${paperCount === 1 ? "paper" : "papers"}`}</em>
      </summary>
      <div className="uat-responsibility-house-papers__contents">
        <header>
          <strong>The evidence behind the steward's account</strong>
          <p>Open these papers when the account needs examination. Source custody and provenance remain here, outside the Head's working brief.</p>
        </header>

        {evidence.length > 0 ? (
          <section aria-label="Named supporting papers">
            <h3>Named papers</h3>
            <ol>
              {evidence.map((item, index) => (
                <li key={`${item}:${index}`}>
                  <span>
                    <small>{index === 0 ? "Opening paper" : "Supporting paper"}</small>
                    <strong>{item}</strong>
                  </span>
                  <button
                    onClick={() => onOpenPaper({
                      kind: "named_evidence",
                      index,
                      title: item,
                    })}
                    type="button"
                  >
                    Read paper
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section aria-label="House-scoped opening entries">
          <h3>Entries in the opening record</h3>
          {errorMessage ? (
            <div className="uat-responsibility-house-papers__recovery" role="alert">
              <p>{errorMessage} No substitute entry is shown.</p>
              {onRetry ? <button onClick={onRetry} type="button">Read the record again</button> : null}
            </div>
          ) : loading ? (
            <p>Reading the House-scoped opening record…</p>
          ) : visibleRecords.length > 0 ? (
            <ol>
              {visibleRecords.slice(0, 24).map(({ record, sourceIndex }) => {
                const title = record.subject_label ?? record.scope_label ?? registerLabel(record.source_table);
                return (
                  <li key={`${record.source_table}:${record.subject_id ?? record.scope_id ?? sourceIndex}`}>
                    <span>
                      <small>{registerLabel(record.source_table)}</small>
                      <strong>{title}</strong>
                      <em>{stateLabel(record.state)}</em>
                    </span>
                    <button
                      onClick={() => onOpenPaper({
                        kind: "opening_record",
                        index: sourceIndex,
                        title,
                        record,
                      })}
                      type="button"
                    >
                      Examine entry
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p>
              {posture === "read_ready"
                ? "No further House-scoped entry is recorded. The named papers form the complete opening account."
                : posture === "conditional_empty"
                  ? "No exact current instance is recorded for this responsibility."
                  : "No verified opening entry is recorded in the House papers."}
            </p>
          )}
          {visibleRecords.length > 24 ? <p>Showing 24 of {visibleRecords.length} entries.</p> : null}
        </section>
      </div>
    </details>
  );
}
