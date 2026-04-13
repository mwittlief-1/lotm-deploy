# v0.3.5 Runaway Detectors

## Scope

`V03-R5-010-T02` turns the already-locked preset, KPI, regression, and DOE artifacts into a deterministic detector packet for the five balance failure modes named in the backlog.

- generator: `scripts/runawayDetectors.ts`
- artifact: `qa_artifacts/economy_balance/v0.3.5/runaway_detectors.json`
- guard test: `tests/sim/runaway_detectors.test.ts`

The canonical balance closeout now consumes this packet through:

- `qa_artifacts/economy_balance/v0.3.5/balance_review_closeout.json`
- `docs/qa/balance_review_closeout_v0.3.5.md`

## Detector set

The detector packet keeps one row per failure mode:

- `coin_runaway`
- `starvation_spiral`
- `arrears_too_soft`
- `arrears_too_hard`
- `manor_count_growth_frozen`

Each detector lists:

- the acceptance id from the playability preset pack
- the preset ids that feed that acceptance rail
- one or more bounded checks
- a pass or fail status derived from those checks

## Integration posture

This stays on the existing balance-review path instead of opening a new control plane.

- the preset pack still owns scenario-to-acceptance mapping
- the KPI bands still own target versus comparison-rail framing
- the runaway detector packet only translates those accepted rails into named failure-mode checks after the KPI baseline comparisons are reviewed first

The only direct regression-only checks added here are the short-run arrears hardness guard and the long-run dispossession timing anchor, because those are not fully expressible in the existing KPI packet alone.

## Verification

1. `npx tsx scripts/runawayDetectors.ts`
2. `node node_modules/tsx/dist/cli.mjs scripts/balanceReviewCloseout.ts`
3. `npx vitest run tests/sim/runaway_detectors.test.ts tests/sim/kpi_acceptance_bands.test.ts`
4. `npm run qa`
5. `npm run preflight`
6. `npm run seed:replay:batch` twice and compare the `summary_hash`
