# v0.3.5 Obligations Fixtures

## Scope

`V03-R5-008-T03` locks the obligations transparency contract with deterministic fixtures and a reviewable UAT pack, while staying inside tooling-owned paths.

- compact fixture: `tests/fixtures/obligations_detail_snapshot_v0.3.5.json`
- guard test: `tests/ui/obligationsFixtures.test.tsx`
- UAT artifact: `qa_artifacts/playtest_ops/v0.3.5/obligations_uat_pack.json`

## Fixture cases

The checked-in fixture focuses on the four cases called out in the backlog:

- `arrears_carry`
- `forced_payment`
- `seizure_preview`
- `terminal_stage_visibility`

Each case preserves:

- liege and church section order
- payment-mode labels
- stage-row status labels
- terminal-risk copy and boundary labels
- grouped receipt rows for penalty and seizure paths

## UAT pack intent

The UAT artifact is not a second runtime harness. It is a review packet that names the expected focus tab, evidence cues, and deterministic fixture case for each transparency scenario.

- arrears carry stays overview-first so reviewers can compare counterparties side by side
- forced payment lands directly on the church focus where the grouped seizure rows are visible
- seizure preview lands on the liege focus where the stage-two preview text is exposed
- terminal-stage visibility lands on the liege focus where stage three is active

## Verification

1. `npx vitest run tests/ui/obligationsFixtures.test.tsx tests/ui/obligationsDetailPanel.test.tsx tests/ui/playScreenObligations.test.ts tests/sim/obligations_view.test.ts`
2. `npm run qa`
3. `npm run preflight`
4. `npm run seed:replay:batch` twice and compare the `summary_hash`
