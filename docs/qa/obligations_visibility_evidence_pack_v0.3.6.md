# Obligations Visibility Evidence Pack v0.3.6

Last updated: `2026-04-19`  
Task: `V03-R6-002-T04`

## Purpose

This pack gives reviewers one canonical read path for the v0.3.6 obligation visibility closeout:

- split payment that clears carried arrears before current dues
- close-turn carry from current due into arrears
- liege and church successor rebasing after death
- explicit parish vacancy handling when no living clergy successor exists
- stage-one consequence copy on the same player-facing obligations path

## Canonical evidence bundle

- fixture snapshot: `tests/fixtures/obligations_visibility_snapshot_v0.3.6.json`
- operator pack: `qa_artifacts/playtest_ops/v0.3.6/obligations_visibility_evidence_pack.json`
- live gate: `qa_artifacts/playtest_ops/uat_scenario_gate.json`

## Deterministic fixture ids and seeds

- `split_payment_successor_rebase`
  - seed: `obligations_visibility_successor_seed`
  - proves liege and church collectors rebase onto living successors, partial settlement happens first, and unpaid current dues roll into arrears with penalty-trail receipts
- `church_vacancy_carry`
  - seed: `obligations_visibility_vacancy_seed`
  - proves the church path rebases onto the parish institution vacancy instead of the dead clergy actor and keeps carry/consequence copy attached to that vacant seat

## Operator path

1. Open `qa_artifacts/playtest_ops/v0.3.6/obligations_visibility_evidence_pack.json`.
2. Use the listed fixture case first for successor or vacancy truth.
3. Use `qa_artifacts/playtest_ops/uat_scenario_gate.json` for the live `uat_arrears_enforcement` preset when checking that stage-one obligation consequence text is visible on schedule.
4. Keep the obligations sheet as the primary surface. Reviewers should not need raw ledger exports for first-pass confirmation.

## Focused validation

```bash
npm exec vitest run tests/sim/obligations_view.test.ts tests/sim/obligation_visibility_gate.test.ts tests/ui/obligationsFixtures.test.tsx
node --import tsx ./scripts/uatScenarioGate.ts
```

## Full merge gates

1. `npm run qa`
2. `npm run preflight`
3. `npm run seed:replay:batch`
4. `npm run seed:replay:batch` again and compare outputs or hashes
