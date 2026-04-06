# Replay Reliability Runbook v0.3.3

Last updated: 2026-04-05  
Task: `V03-R3-001-T04`

## Mandatory replay command

Reliability work must run the replay batch twice and compare the summary hash:

1. `npm run seed:replay:batch`
2. `npm run seed:replay:batch`

Accept the run only if both outputs report the same `summary_hash`.

## Run log expectations

Every reliability task run log should record:

- The two replay hashes (run1/run2).
- Whether snapshot cap enforcement passed.
- Whether any turn-time soft ceiling warnings appeared during replay.
- Any changes to budgets in `ops/v0.3/runtime-contract.yaml`.

Run logs live in `ops/v0.3/progress/runs/` and should reflect the lane head commit at closeout.

## Failure interpretation

### Replay hash mismatch

- Treat as a determinism failure.
- Do not accept the run until the mismatch is explained and resolved.

### Snapshot cap exceeded

- Treat as a hard block.
- Either reduce bounded snapshot payloads or update the snapshot budget with justification.
- Re-run both replay batches after the fix.

### Turn-time soft ceiling warnings

- Warnings are informative only.
- Record them in the run log and investigate if they persist or worsen.

## Notes

- Replay budgets are sourced from `ops/v0.3/runtime-contract.yaml`.
- The replay harness now hard-enforces snapshot caps and emits soft warnings for time ceilings.
