version: 1
run_id: 2026-04-05_parallel_lane_reopen_round1
date: 2026-04-05
operator: codex-integrator
summary:
  accepted: []
  dispatched: []
  blocked: []
  notes:
    - Promoted Economy V03-R1-003-T07 to ready because its dependency V03-R1-003-T06 is done.
    - Promoted Social V03-R1-004-T01 to ready because its dependency V03-R0-002-T08 is done.
    - Left both tasks unclaimed so the lanes can claim them directly under the new same-lane self-advance policy.
gates:
  ops_v03_validate: pending
  scheduler_dry_run: pending
  rebase_dry_run: pending
