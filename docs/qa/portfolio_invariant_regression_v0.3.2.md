# Portfolio Invariant Regression QA v0.3.2

Last updated: 2026-04-05  
Task: `V03-R2-001-T06`

## Scope

This note defines the QA expectations for the multi-manor portfolio regression suite introduced in `V03-R2-001-T06`.

The goal is to ensure portfolio rollups remain deterministic and that aggregate totals equal the sum of their manor rows across a representative seed pack.

## Regression coverage

The regression suite lives in `tests/sim/portfolio_invariant_regression.test.ts` and enforces:

- portfolio totals by asset equal the sum of `manor_rows_by_key[*].asset_totals`
- portfolio totals by category equal the sum of `manor_rows_by_key[*].category_totals`
- serialized portfolio analysis is stable regardless of manor input order

The seed pack uses the canonical replay seeds:

- `lotm_v022_seed_001_baseline_extworld`
- `lotm_v022_seed_002_relationship_edges`
- `lotm_v022_seed_003_succession_pressure`
- `lotm_v022_seed_004_widow_line`
- `lotm_v022_seed_005_unrest_pressure`
- `lotm_v022_seed_006_construction_path`
- `lotm_v022_seed_007_weather_volatility`
- `lotm_v022_seed_008_long_tail_check`

## How to interpret failures

If an invariant fails:

- treat it as a regression in portfolio rollup math or deterministic ordering
- confirm the manor rows are still computed from the same canonical economy inputs
- check for unintended changes to portfolio key ordering or manor row normalization

Do not accept replay outputs if the invariant fails. Fix the rollup or ordering issue first, then rerun `npm run qa`, `npm run preflight`, and both replay batches.
