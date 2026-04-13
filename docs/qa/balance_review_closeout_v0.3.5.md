# v0.3.5 Balance Review Closeout

## Purpose

`qa_artifacts/economy_balance/v0.3.5/balance_review_closeout.json` is the canonical closeout packet for `V03-R5-010-T03`.

It closes the balance-review loop by putting deterministic baseline comparisons first:

- KPI acceptance bands stay the primary metric-by-metric review surface
- runaway detectors stay the second-pass failure-mode translation layer
- the closeout packet adds an explicit stability-review checklist for v0.3.5 signoff

This does not add a new scenario catalog or a new init path. It reuses the already accepted baseline artifacts:

- `qa_artifacts/economy_balance/v0.3.4/regression_seed_pack.json`
- `qa_artifacts/playtest_ops/v0.3.4/receipt_bundle_seed_pack.json`
- `qa_artifacts/economy_balance/v0.3.4/turns_15/summary.json`
- `qa_artifacts/economy_balance/v0.3.4/turns_30_builder-forward/summary.json`

## Canonical review order

1. Open `balance_review_closeout.json` and start with `baseline_comparisons[]`.
2. Compare each KPI target and comparison rail against the locked baseline artifacts.
3. Only after the baseline comparisons are confirmed, read `runaway_review[]` to translate any drift into the named failure modes.
4. Finish with `stability_review_checklist[]` and attach the required gate results from `qa`, `preflight`, and the two replay runs.

## Using acceptance bands and detectors together

Acceptance bands and detectors now have distinct jobs:

- acceptance bands answer "what exact baseline values are locked for review?"
- detectors answer "if one of those baselines moves, which balance failure mode does it resemble?"

That means a detector row should never replace a KPI comparison as the main pass or fail reference. If the two ever feel in tension:

1. treat the KPI comparison as the canonical closeout anchor
2. use the detector row as the triage and explanation layer
3. drop to the cited receipt, regression, or DOE artifact only when you need the raw evidence

## Stability-review checklist

The explicit v0.3.5 stability checklist now verifies that:

- all five KPI metric rows are present
- every KPI row still carries at least one comparison rail
- all five runaway detectors remain green
- every row remains traceable back to the accepted receipt, regression, and DOE artifacts
- the closeout packet is ready to use as the final review surface

## Regeneration

```bash
node node_modules/tsx/dist/cli.mjs scripts/kpiAcceptanceBands.ts
node node_modules/tsx/dist/cli.mjs scripts/runawayDetectors.ts
node node_modules/tsx/dist/cli.mjs scripts/balanceReviewCloseout.ts
```

Refresh in that order so the closeout packet always reflects the current KPI and detector packets.

## Verification

1. `node node_modules/tsx/dist/cli.mjs scripts/kpiAcceptanceBands.ts`
2. `node node_modules/tsx/dist/cli.mjs scripts/runawayDetectors.ts`
3. `node node_modules/tsx/dist/cli.mjs scripts/balanceReviewCloseout.ts`
4. `npm run qa`
5. `npm run preflight`
6. `npm run seed:replay:batch` twice and compare the normalized `summary.json`
