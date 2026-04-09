# 2026-04-09 — Manual Acceptance Round 36

Accepted the docs and final scrub tail for `V03-R4-001` and closed the epic.

## Accepted

- `V03-R4-001-T05` — Refresh v0.3 docs, playtest instructions, and bug report template
- `V03-R4-001-T06` — Final release scrub and close v0.3.4 hardening epic
- `V03-R4-001` — epic closeout

## Key Outcome

- The `v0.3.4` hardening line now has one release-facing playtest guide, one canonical bug-report template source, one final hardening report, and an explicit known-issues sheet.
- No code path changed after `T04`, so the accepted replay line remains `f850077e9f6a7338869f9861a6db0fc7e27f3c8cae56b6589e09b42dcc0d67f1`.

## Verification

- Reused the immediately preceding full passing stack from `T04`:
  - `qa`
  - `preflight`
  - `seed:replay:batch` twice
  - `repo:duplicates`
- Reran control-plane checks after the docs closeout:
  - `ops:v0.3:validate`
  - scheduler dry-run
  - rebase dry-run
