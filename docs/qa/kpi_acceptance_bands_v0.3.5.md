# v0.3.5 KPI Acceptance Bands

## Purpose

`qa_artifacts/playtest_ops/v0.3.5/kpi_acceptance_bands.json` turns the locked regression, receipt-bundle, and preset artifacts into one explicit KPI-band manifest for v0.3.5 closeout.

It does not create a new preset list or a new init path. It reuses:

- `qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json`
- `qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json`
- `qa_artifacts/playtest_ops/v0.3.4/receipt_bundle_seed_pack.json`
- the accepted 15-turn and 30-turn DOE summaries

The canonical balance closeout now starts from these metric rows through:

- `qa_artifacts/economy_balance/v0.3.5/balance_review_closeout.json`
- `docs/qa/balance_review_closeout_v0.3.5.md`

## Metrics covered

The manifest records explicit bands for:

1. `net_coin`
2. `arrears_incidence`
3. `dispossession`
4. `shortages`
5. `manor_count_growth`

## Targets vs comparison rails

Every metric band splits the evidence into two buckets:

- `targets`
  - exact values the locked preset or packet should still hit
- `comparison_rails`
  - accepted comparison points that should remain available for review, but are not the primary pass/fail number

For `v0.3.5` closeout, this packet is the first review stop. Runaway detectors are a downstream triage layer, not a replacement for the metric comparisons here.

Examples:

- `net_coin` uses the calm prudent packet as the target and the stable-clear prudent scenario as the comparison rail.
- `arrears_incidence` uses the arrears-pressure builder scenario as the target and the 15-turn builder DOE share as the comparison rail.
- `dispossession` uses the long-run dispossession scenario as the target and the 30-turn builder DOE rate as the comparison rail.

## Regeneration

```
node node_modules/tsx/dist/cli.mjs scripts/kpiAcceptanceBands.ts
node node_modules/tsx/dist/cli.mjs scripts/balanceReviewCloseout.ts
```

Run this only after the preset pack and upstream deterministic regression artifacts are refreshed, so the band file never drifts onto a second scenario catalog.

## Verification

1. `npx vitest run tests/sim/kpi_acceptance_bands.test.ts tests/ui/playabilityPresetPack.test.ts`
2. `node node_modules/tsx/dist/cli.mjs scripts/balanceReviewCloseout.ts`
3. `npm run qa`
4. `npm run preflight`
5. `npm run seed:replay:batch` twice and compare the `summary_hash`
