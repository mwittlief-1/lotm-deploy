# V04-QA-002 Soft-Time Debt Tracking Plan

Date: 2026-05-20
Status: `COMPLETE_PROOF_PLAN_ONLY`
Classification: `GREEN_READY`, `PROOF_ONLY`

## Context

v0.3 closed with seed replay soft-time warnings recorded as performance/reliability debt. Current evidence says these warnings are not deterministic drift: replay passed, per-run hashes matched, and normalized summary hashes were stable.

## Tracking Goal

Keep soft-time visible as debt without treating it as a baseline failure or requiring pre-v0.4 implementation repair.

## Required Capture

For each replay or gate packet that emits soft-time warnings, capture:

- command;
- timestamp;
- environment note;
- seed/policy row count;
- warning count;
- whether warnings are stored in JSON or only console output;
- pass/fail result;
- per-run hash stability;
- normalized summary hash stability;
- wall-clock duration when available;
- whether any row crosses a new hard timeout.

## Reporting Shape

| Field | Meaning |
|---|---|
| `soft_time_warning_count` | Number of warning lines observed. |
| `soft_time_rows_affected` | Number of seed/policy rows with warnings. |
| `determinism_status` | `stable`, `unstable`, or `not_checked`. |
| `closure_debt_status` | `tracked_debt`, `regression_candidate`, or `blocking_timeout`. |
| `evidence_owner` | Command or packet owning the observation. |

## Stop Conditions

Escalate if:

- soft-time warnings become hard failures;
- per-run hashes no longer match;
- normalized summaries drift without explanation;
- warning count or runtime sharply increases after a local change;
- a proposed repair requires baseline, fixture, schema, runtime, UI, or turn/phase changes without authorization.

## Safe Work

Safe work may define capture fields, dashboards, and review packet language. It may not change replay execution, thresholds, baselines, or timeout behavior without a separate tooling authorization.
