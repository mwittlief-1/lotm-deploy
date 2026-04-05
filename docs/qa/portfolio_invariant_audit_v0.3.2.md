# Portfolio Invariant Audit v0.3.2

Last updated: 2026-04-05
Task: `V03-R2-001-T01`

## Scope

This audit covers the economy lane scope for `V03-R2-001-T01`:

- `src/sim/domains/economy/**`
- `tests/**`
- `docs/qa/**`

The goal here is to inventory the current manor-level asset and category surfaces and lock the invariant contract that follow-on portfolio tasks should implement.

## Current portfolio baseline

There is still no live portfolio registry with totals, manor rollups, or outlier math.

Current state only guarantees an additive placeholder:

- `state.portfolio.schema_version = "portfolio_registry_placeholder_v1"`
- `state.portfolio.positions = []`

That placeholder exists to reserve the root-state surface. It does not yet:

- infer portfolio totals
- infer per-manor positions
- backfill holdings from current runtime state
- compute outliers or rankings

## Canonical manor-level stock surfaces

The safest current manor inventory comes from the economy placeholder tracked paths plus the economy-owned fiscal/obligations helpers already on this branch.

### Fungible held assets

These are the manor-owned balances that can be summed directly across manors without interpretation changes:

| Portfolio asset key | Runtime source | Current owner | Notes |
| --- | --- | --- | --- |
| `coin` | `manor.coin` | economy ledger/schema | Canonical liquid coin balance. |
| `food_stores` | `manor.bushels_stored` | economy ledger/schema | Canonical grain store alias. |
| `meat_stores` | `manor.meat_stores` | economy ledger/schema | Canonical meat store balance. |

### Liability and obligation buckets

These are manor-level obligation surfaces that should remain separate from held assets in the portfolio contract:

| Portfolio category key | Runtime source | Current owner | Notes |
| --- | --- | --- | --- |
| `tax_due_coin` | `manor.obligations.tax_due_coin` | economy ledger/obligations | Current liege due slot. |
| `tithe_due_bushels` | `manor.obligations.tithe_due_bushels` | economy ledger/obligations | Current church due slot. |
| `arrears_coin` | `manor.obligations.arrears.coin` | economy ledger/obligations | Open arrears in coin. |
| `arrears_bushels` | `manor.obligations.arrears.bushels` | economy ledger/obligations | Open arrears in bushels. |
| `war_levy_due` | `manor.obligations.war_levy_due` | legacy obligations branch | Non-fungible `men_or_coin` obligation; track separately from fungible totals. |

## Canonical manor-level flow categories

These are not persistent stock balances, but they are already deterministic economy outputs and should be treated as category rollup inputs once the portfolio registry grows beyond the placeholder.

### Production categories

`src/sim/domains/economy/productionRegistry.ts` already exposes deterministic manor-level production totals:

| Portfolio category key | Source seam | Notes |
| --- | --- | --- |
| `production.food_delta` | `EconomyProductionRegistryV1.totals_by_asset.food_stores` | Grain output added this turn. |
| `production.meat_delta` | `EconomyProductionRegistryV1.totals_by_asset.meat_stores` | Hunting output added this turn. |

### Consumption categories

`src/sim/domains/economy/consumption.ts` already exposes deterministic manor-level consumption outputs:

| Portfolio category key | Source seam | Notes |
| --- | --- | --- |
| `consumption.food_stores` | `EconomyConsumptionPlanV1.food_consumed_bushels` | Grain consumed this turn. |
| `consumption.meat_stores` | `EconomyConsumptionPlanV1.meat_consumed_units` | Meat consumed this turn. |
| `consumption.shortage_bushels` | `EconomyConsumptionPlanV1.shortage_bushels` | Unsatisfied household demand; keep separate from stores. |

### Obligation categories

`src/sim/domains/economy/obligationRegistry.ts` now makes the current obligation ladder deterministic per counterparty. The first portfolio cut does not need to duplicate church/liege detail yet, but it should preserve category families that can later be expanded by counterparty.

| Portfolio category key | Source seam | Notes |
| --- | --- | --- |
| `obligations.current_due.coin` | `tax_due_coin` and registry due totals | Coin-denominated current due. |
| `obligations.current_due.food_stores` | `tithe_due_bushels` and registry due totals | Bushel-denominated current due. |
| `obligations.arrears.coin` | `arrears_coin` and registry arrears totals | Coin-denominated arrears. |
| `obligations.arrears.food_stores` | `arrears_bushels` and registry arrears totals | Bushel-denominated arrears. |
| `obligations.enforcement.war_levy` | `war_levy_due` | Keep as a separate non-fungible category until levy semantics are normalized. |

## Explicit invariant contract for follow-on tasks

`V03-R2-001-T02` through `V03-R2-001-T04` should implement the portfolio registry against the following invariants.

### 1. Asset totals are pure sums of manor-held fungible assets

For every tracked fungible asset:

- `portfolio.total_assets.coin = sum(manor.coin)`
- `portfolio.total_assets.food_stores = sum(manor.bushels_stored)`
- `portfolio.total_assets.meat_stores = sum(manor.meat_stores)`

Rules:

- no liability bucket may be netted into these totals
- no price conversion may be used
- no service-placeholder or levy coercion may be folded into fungible asset totals

### 2. Category totals are pure sums of same-category manor values

For every tracked category family, the portfolio total must equal the deterministic sum of the exact same manor-level input category:

- current due totals sum only current due fields
- arrears totals sum only arrears fields
- production totals sum only production deltas
- consumption totals sum only consumption outputs
- shortage totals sum only shortage outputs
- war-levy totals sum only levy entries

Rules:

- do not mix stock and flow categories into the same total
- do not mix held assets and liabilities into a single aggregate field
- when a category is absent for a manor, treat it as `0` rather than omitting the manor from ordering

### 3. Per-manor net values are asset-local and category-explicit

The first net contract should stay asset-local so it remains deterministic and does not depend on prices:

- `net.coin = coin - tax_due_coin - arrears_coin`
- `net.food_stores = food_stores - tithe_due_bushels - arrears_bushels`
- `net.meat_stores = meat_stores`

`meat_stores` currently has no matching arrears/due bucket in the live runtime, so its first net is just the held balance.

Rules:

- `war_levy_due` must not be converted into coin or folded into any fungible net
- production and consumption deltas must remain separate flow surfaces, not be added into end-of-turn net fields
- if later tasks add new fungible due/arrears families, they should reduce only the matching asset-family net

### 4. Outlier metrics must be derived from explicit, deterministic metrics

The first outlier computation should rank manors only on metrics that already have stable arithmetic:

- highest and lowest `coin`
- highest and lowest `food_stores`
- highest and lowest `meat_stores`
- highest `tax_due_coin`
- highest `tithe_due_bushels`
- highest `arrears_coin`
- highest `arrears_bushels`
- highest `production.food_delta`
- highest `production.meat_delta`
- highest `consumption.shortage_bushels`
- lowest asset-local nets

Rules:

- each ranking must define a stable sort key before implementation
- sort by metric value first, then by deterministic manor key as the tie-breaker
- never depend on object insertion order
- never derive outliers from mixed-unit composites

### 5. Portfolio totals must equal the sum of portfolio manor rows

Once `T02` adds explicit manor rows and `T03` adds aggregation:

- every portfolio aggregate field must be reproducible by summing the canonical manor-row field values
- no aggregate-only field may appear without a matching manor-level source field
- serialization must preserve deterministic key ordering for manor rows, category maps, and outlier lists

## First rollup and outlier computation surfaces

The first safe insertion points are:

| Need | First safe surface | Reason |
| --- | --- | --- |
| Registry schema | `state.portfolio` placeholder expansion | The root-state seam already exists and is additive. |
| Manor asset rollup keys | economy-owned portfolio registry schema under `src/sim/domains/economy/**` | Keeps asset/category naming in the economy lane rather than phase code. |
| Aggregation inputs | economy production, consumption, obligation, and ledger-owned manor surfaces | These are the current deterministic source-of-truth seams. |
| Outlier metrics | portfolio manor rows derived from the same canonical keys | Prevents a second ad hoc ranking contract. |

Important boundary:

- `src/sim/turn.ts` is not needed for this tranche
- phase files should remain callers only
- the first portfolio registry should consume already-owned economy data rather than inventing parallel state

## Non-perturbation guardrails for the portfolio epic

The audit implies a conservative first implementation boundary:

- keep `state.portfolio` additive until the schema is explicit
- do not mutate existing manor balances while computing rollups
- do not introduce price-based valuation during `R2-001`
- do not treat `war_levy_due` as fungible coin
- do not change replay ordering, RNG usage, or receipt ordering

## Task-to-task handoff

### `V03-R2-001-T02`

Add the explicit registry fields and deterministic manor rollup keys for:

- held fungible assets
- obligation/liability categories
- production categories
- consumption categories
- outlier bookkeeping keys only, without calculations yet

### `V03-R2-001-T03`

Compute portfolio totals as exact sums of the manor rollup rows and prove:

- asset totals equal summed manor asset rows
- category totals equal summed manor category rows
- missing manor/category values normalize to `0`

### `V03-R2-001-T04`

Compute per-manor nets and outliers using only the locked asset-local formulas and stable ranking rules from this audit.

## Audit conclusion

`v0.3.2` portfolio work should start from the economy seams that already exist, not from inferred holdings math.

The safe baseline is:

- fungible assets are `coin`, `food_stores`, and `meat_stores`
- liabilities stay separate as due and arrears categories
- `war_levy_due` remains a non-fungible tracked category
- production, consumption, and shortage are flow categories, not stock balances
- nets stay asset-local
- outliers rank explicit deterministic metrics only

If `T02` through `T04` follow that contract, portfolio rollups can land without changing current manor semantics or forcing early price valuation into the economy domain.

## Epic closeout baseline after T05-T07

The shipped `v0.3.2` portfolio baseline now extends beyond the original lane-local audit.

Accepted follow-on work landed:

- `V03-R2-001-T05` integrated the portfolio analysis surface into accepted phase and bounded snapshot refresh paths on kickoff.
- `V03-R2-001-T06` added the regression suite and QA guidance that proves portfolio totals continue to equal summed manor rows.
- `V03-R2-001-T07` added the read-only gameplay stub that exposes portfolio totals and bounded outlier lists without adding post-`v0.3` controls.

### Locked shipped boundary

The accepted `v0.3.2` contract is now:

- `state.portfolio` is no longer only a placeholder at the shipped snapshot boundary; accepted phase wiring can refresh a bounded `economy_portfolio_analysis_v1` surface.
- portfolio totals remain deterministic sums of manor asset totals and manor category totals
- manor nets remain asset-local and price-free
- outlier lists remain bounded, explicitly keyed, and tie-break on deterministic manor key ordering
- UI exposure remains read-only and presentation-only

### Accepted diff note

`T05` intentionally changed bounded snapshot and replay artifacts so portfolio totals and outlier rows can appear in the shipped analysis surface. `T06` and `T07` then held replay on the same stable hash `7b196da2593b2b05f25550733389f4061af4907e084afaea7ec9c26f4e9f9e3a`.
