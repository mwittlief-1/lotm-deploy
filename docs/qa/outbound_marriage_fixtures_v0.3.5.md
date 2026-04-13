# v0.3.5 Outbound Marriage Fixtures

## Scope

`V03-R5-005-T06` locks the accepted outbound marriage flow with deterministic fixture cases, replay guards, and preset-backed review coverage while staying inside tooling-owned paths.

- compact fixture: `tests/fixtures/outbound_marriage_snapshot_v0.3.5.json`
- guard tests:
  - `tests/ui/outboundMarriageFixtures.test.tsx`
  - `tests/sim/outbound_marriage_replay_guards.test.ts`
- preset coverage artifact: `qa_artifacts/playtest_ops/v0.3.5/outbound_marriage_preset_coverage.json`

## Fixture cases

The checked-in fixture freezes one representative launch case for each unique preset seed currently feeding the outbound marriage sheet:

- `baseline_seed_candidate_set`
- `relationship_edges_candidate_set`
- `weather_shortage_shortlist`
- `succession_pressure_candidate_set`
- `uat_baseline_launch_window`
- `market_tight_launch_window`

Together they preserve:

- stable shown and held-out candidate ordering from the accepted scouting registry
- player-tab subject, first-candidate, and preview-copy cues
- debug-tab registry counts and held-out eligibility rows
- canonical accepted and rejected preview text without adding a second decision path

## Replay guard intent

The sim-side replay guard focuses on the two deterministic seams that matter here:

- scouting stays ordered the same way across repeated preset launches
- accepted and rejected offer resolution still land the same receipt-backed outcome when fed the canonical preview draft

That keeps the review rail anchored to the real preset launch path instead of a synthetic harness.

## Preset coverage artifact

`outbound_marriage_preset_coverage.json` is a review packet, not a second init control plane.

- each case maps back to the stable preset ids that share the same launch seed
- the artifact records the preset ids, source seed, initial tab, subject, shortlist counts, and preview copy
- the generator launches through `applyPlayabilityPreset(buildNewRunInit(...)) -> createNewRun(...)`, so the packet stays on the canonical new-run seam

The locked preset manifest now consumes this packet as an outbound-marriage review rail alongside the existing court-provisioning, obligations, and UAT sources.

## Verification

1. `node node_modules/tsx/dist/cli.mjs scripts/outboundMarriagePresetCoverage.ts`
2. `node node_modules/tsx/dist/cli.mjs scripts/lockedPresetScenarios.ts`
3. `npx vitest run tests/ui/outboundMarriageFixtures.test.tsx tests/sim/outbound_marriage_replay_guards.test.ts tests/ui/outboundMarriageView.test.ts tests/ui/outboundMarriagePanel.test.tsx tests/ui/lockedPresetScenarios.test.ts`
4. `npm run qa`
5. `npm run preflight`
6. `npm run seed:replay:batch` twice and compare the `summary_hash`
