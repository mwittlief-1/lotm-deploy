version: 1
run_id: 2026-04-05_lane_self_advance_policy_update
date: 2026-04-05
operator: codex-integrator
summary:
  accepted: []
  dispatched: []
  blocked: []
  notes:
    - Updated the v0.3 control-plane policy to allow lane-local same-lane self-advance without an integration pass.
    - Kept kickoff as the durable source of truth for cross-lane coordination while allowing provisional lane-local chaining under strict conditions.
policy:
  allowed_when:
    - next task is in the same lane
    - next task requires_integrator is false
    - all cross-lane deps are already done in kickoff truth
    - newly satisfied deps come only from tasks already completed in that same lane chain
    - no checkpoint, escalation, or integrator-only boundary applies
  required_records:
    - close the current task in the lane-local run log
    - record the next local claim transition in the lane-local run log
    - update lane-local backlog and progress files for later integrator reconciliation
  prohibited:
    - skipping decomposed tasks
    - creating multiple active tasks in one lane
    - advancing across requires_integrator true tasks
    - using provisional lane-local claims as cross-lane scheduling authority
gates:
  ops_v03_validate: pass
  scheduler_dry_run: pass
  rebase_dry_run: pass
