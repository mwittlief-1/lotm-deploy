version: 1
run_id: 2026-04-04_manual_acceptance_round4
date: 2026-04-04
operator: codex-integrator
summary:
  accepted:
    - V03-R1-005-T05
    - V03-R3-005-T01
  dispatched:
    - V03-R1-005-T06
    - V03-R3-005-T02
  blocked: []
  notes:
    - Accepted the UI receipts/counterparty legibility pass from the UI lane.
    - Accepted the engine realm-pressure audit closeout from the engine lane.
    - Reopened the next safe same-lane follow-ons immediately to keep manual flow continuous.
evidence:
  ui_handoff: ops/v0.3/progress/runs/V03-R1-005-T05.yaml
  engine_handoff: ops/v0.3/progress/runs/V03-R3-005-T01.yaml
  ui_artifacts:
    - src/ui/playScreenReceipts.ts
    - src/ui/panels/ReceiptsViewerPanel.tsx
    - tests/ui/receiptsViewerPanel.test.tsx
  engine_artifacts:
    - docs/releases/v0.3.3_REALM_PRESSURE_SURFACE_AUDIT.md
gates:
  ops_v03_validate: pass
  scheduler_dry_run: pass
  rebase_dry_run: pass
  qa: pass
  preflight: pass
  seed_replay_batch_twice: pass
  repo_duplicates: pass
