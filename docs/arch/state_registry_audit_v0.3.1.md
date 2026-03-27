# State Registry Audit v0.3.1

Last updated: 2026-03-26
Task: `V03-R1-002-T01`

## Scope

This audit inventories the current state registries, save/load surfaces, and migration-sensitive seams that exist before `V03-R1-002-T02` adds explicit state schema metadata and a registry manifest.

The review is limited to the current tooling-owned code surfaces and current runtime behavior. It does not propose mechanic changes.

## Executive summary

- `RunState` has `version` and `app_version`, but it does not have a dedicated state schema version or registry manifest today.
- Runtime migration is currently distributed across `proposeTurn()`, `applyDecisions()`, `ensurePeopleFirst()`, `ensureExternalHousesSeed_v0_2_2()`, `ensureCourtOfficers()`, and `ensureBeliefRegistry()` rather than a single load-time migration runner.
- The durable registry surfaces today are the People-First registries (`people`, `houses`, `player_house_id`, `kinship_edges`), additive world/court registries (`institutions`, `service_records`, house-level court fields), AI beliefs, flags subtrees, and turn log history.
- Several versioned domain artifacts already exist, but they are not durable `RunState` fields: marriage-offer registries are rebuilt from logs plus active prospects, economy production registries are derived from current balances, and the fiscal receipt journal is held in a `WeakMap`.
- The first economy migration candidate is the tracked manor-economy surface, especially `manor.meat_stores`, which is already treated as a persisted runtime asset but still sits outside the typed `ManorState` contract.
- There is no live portfolio registry in `RunState` yet. The first portfolio migration candidate therefore has to be an additive empty scaffold, not a backfill of pre-existing portfolio data.

## Current save/load entrypoints

### Runtime creation

- `src/sim/state.ts`
  - `createNewRun(run_seed)` builds the initial `RunState`, then runs `normalizeState()`, `ensurePeopleFirst()`, `ensureExternalHousesSeed_v0_2_2()`, and `ensureCourtOfficers()`.

### Runtime load/migration entrypoints

- `src/sim/turn.ts`
  - `proposeTurn(state)` deep-copies caller state, then runs additive migration/sync helpers before computing preview output.
  - `applyDecisions(state, decisions)` accepts legacy state, conditionally migrates through `ensurePeopleFirst()`, re-bounds prior snapshots, resolves the turn, and emits new bounded snapshots into `state.log`.

There is no dedicated `loadRunState()` or standalone migration runner yet. Raw parsed state is passed directly into engine entrypoints, and those entrypoints perform the current compatibility work.

### Save/export surfaces

- `src/App.tsx`
  - `Export Full Run JSON` downloads the full `RunState` object.
  - `Export Run Summary` downloads `buildRunSummary(state)`, which is intentionally smaller and omits registry detail.
- `src/sim/exports.ts`
  - `buildRunSummary(state)` exports a compact summary of seed, versions, turns played, ending resources, and public flags only.
- `scripts/simBatch.ts`, `scripts/simBatchNoDeps.mjs`
  - batch tooling writes final state JSON artifacts directly with `JSON.stringify(state)`.

### Fixture/replay load surfaces

- `tests/migration_v021.test.ts`
  - parses `tests/fixtures/v0.1.0_state_fixture.json` and passes it directly to `proposeTurn()`.
- `scripts/qaNoDeps.mjs`
  - runs the same legacy fixture smoke path through compiled sim entrypoints.
- `scripts/seedReplay.ts`
  - replays seeds from `createNewRun()` plus `proposeTurn()/applyDecisions()`; it does not load arbitrary saved run JSON.

## Durable registry inventory

| Surface | Current storage path | Primary initializer / mutator | Full run export | Bounded snapshot | Current schema/version signal | Migration note |
| --- | --- | --- | --- | --- | --- | --- |
| Sim/runtime version | `state.version`, `state.app_version` | `createNewRun()` | Yes | No dedicated projection beyond full snapshot copies | `SIM_VERSION`, app version string | These identify sim/app code, not a state schema contract. |
| People registry | `state.people` | `ensurePeopleFirst()`, worldgen, marriage/prospects, demography | Yes | Yes | None at top level | Additive and durable; already required for legacy migration. |
| House registry | `state.houses` | `ensurePeopleFirst()`, worldgen, court helpers, succession | Yes | Yes | None at top level | Carries mixed concerns: player house, external houses, court fields, family flags, holdings_count. |
| Player house pointer | `state.player_house_id` | `ensurePeopleFirst()` | Yes | Yes | None | Required by most registry readers. |
| Kinship registry | `state.kinship_edges` with legacy `state.kinship` fallback | `ensurePeopleFirst()`, demography, marriage flows | Yes | Yes | None | Still has legacy alias handling, so schema work needs one canonical name. |
| Institutions registry | `state.institutions` | `ensurePeopleFirst()`, `ensureExternalHousesSeed_v0_2_8()` | Yes | No | None at top level | Durable in full state, but currently absent from bounded snapshots despite `RunSnapshot` type allowing it. |
| Service records | `state.service_records` | `ensurePeopleFirst()`, `syncCourtOfficerServiceRecords()` | Yes | No | None at top level | Durable in full state, omitted from bounded snapshots today. |
| Belief registry | `state.beliefs` | `ensureBeliefRegistry()`, `recordBeliefEvidence()` | Yes | Present as non-enumerable property | Nested `schema_version: "belief_registry_v0"` | Persisted in full state, but hidden from JSON-stringified snapshots. |
| Internal flags | `state.flags` | `createNewRun()`, normalize, worldgen, marriage market, other feature helpers | Yes | Yes | None for container | Mixed storage for tuning, idempotence flags, modifiers, cooldowns, and reservations. |
| Turn log history | `state.log[]` | `applyDecisions()` | Yes | N/A | Embedded nested schema tags only | Durable replay/audit surface and the only place some derived registries are reconstructed from. |

## Derived or partially durable registry-like surfaces

| Surface | Storage model today | Source of truth | Migration sensitivity |
| --- | --- | --- | --- |
| Marriage offer registry | Derived on demand, not stored in `RunState` | `state.log[].report.prospects_log` plus active prospects reservations | Future schema work cannot migrate this directly until it becomes a durable state field. |
| Economy production registry and summary | Derived on demand, not stored in `RunState` | Current manor balances plus deterministic production rules | Already versioned (`economy_production_registry_v1`, `economy_production_summary_v1`) but not yet part of saved run state. |
| Fiscal receipt journal | Ephemeral `WeakMap<RunState, LedgerReceiptJournalV1>` | Live `RunState` object identity during a process | Cannot be migrated across saved JSON because it is not serialized at all today. |
| Prospects window | Preview/log surface, not root state | `phase_prospects` output and turn log | Versioned (`prospects_window_v1`) but not a persistent root registry. |
| Household roster, roster view, court roster | Derived preview/log surfaces | Current registry state | Versioned read models only; safe to exclude from first state schema manifest. |

## Migration-sensitive findings

### 1. There is no dedicated state schema version yet

`RunState` exposes `version` and `app_version`, but those represent sim/app code identity. They do not identify a structural state schema, a migration level, or a manifest of bounded registries.

This is the primary gap `V03-R1-002-T02` needs to close.

### 2. Load-time migration logic is distributed, not centralized

Current compatibility work is spread across:

- `ensurePeopleFirst()`
- `ensureExternalHousesSeed_v0_2_2()`
- `syncHouseRegistryCurrentHeads()`
- `ensureCourtOfficers()`
- `gcExpiredReservations()`
- `ensureBeliefRegistry()`
- `normalizeState()`

That means state upgrades currently happen as side effects of engine entrypoints instead of through an ordered migration contract. The future migration runner should wrap these responsibilities explicitly instead of adding another hidden side effect site.

### 3. The bounded snapshot contract is narrower than the `RunSnapshot` type

`RunSnapshot` in `src/sim/types.ts` allows `institutions`, `service_records`, and `beliefs`.

Current `boundedSnapshot()` behavior in `src/sim/domains/experience/reporting.ts` is narrower:

- `institutions` are omitted
- `service_records` are omitted
- `beliefs` are attached as a non-enumerable property

This matters for schema/versioning because:

- full run exports keep these surfaces
- JSON-stringified bounded snapshots do not include them
- replay traces and snapshot-based artifacts may not observe future schema additions unless the snapshot contract is deliberately widened

### 4. `manor.meat_stores` is already real runtime state, but it is not part of the typed manor schema

The economy layer already treats `meat_stores` as a tracked runtime asset:

- `FISCAL_LEDGER_RUNTIME_ASSET_PATHS.meat_stores = "manor.meat_stores"`
- `ledger.ts` reads and writes it through `manorAny(state)`
- `productionRegistry.ts` and `consumption.ts` depend on it

But `ManorState` in `src/sim/types.ts` does not declare `meat_stores`.

That makes `meat_stores` the clearest current economy migration seam:

- it already exists in durable exported state when present
- it already participates in deterministic domain logic
- it is still structurally under-specified at the type boundary

### 5. `flags` is overloaded with both migration markers and ongoing state

Current persistent flag content includes at least:

- `_worldgen_external_houses_v0_2_2`
- `_worldgen_external_houses_v0_2_8`
- `_tuning`
- `_cooldowns`
- `_mods`
- `marriage_reservations`

Some of these are idempotence or migration markers. Others are active game-state or tuning state.

That is workable today, but a future registry manifest should treat `flags` as a container of named sub-surfaces rather than a single opaque bucket.

### 6. Several domain schemas already exist, but they are not yet state-level migration targets

Current versioned domain artifacts include:

- `belief_registry_v0`
- `marriage_offer_registry_v0`
- `economy_production_registry_v1`
- `economy_production_summary_v1`
- `fiscal_receipt_v1`
- `fiscal_settlement_scaffold_v1`

These schemas are useful reference inputs for a registry manifest, but most of them are derived or ephemeral. The manifest should distinguish:

- durable state registries
- bounded snapshot/read-model registries
- derived or process-local registries

## First migration candidates

### Economy candidate: formalize the tracked manor economy surface

The first economy migration candidate should be the persisted manor-economy surface that already exists in saved state today:

- `manor.coin`
- `manor.bushels_stored`
- `manor.meat_stores`
- `manor.obligations.tax_due_coin`
- `manor.obligations.tithe_due_bushels`
- `manor.obligations.arrears.coin`
- `manor.obligations.arrears.bushels`
- `manor.obligations.war_levy_due`

Why this should be first:

- it is durable in full run exports
- it already feeds deterministic ledger and consumption code
- `meat_stores` is currently the least formalized part of the surface
- it does not require inventing any new mechanic or integrator-owned wiring

What the placeholder migration should not target yet:

- the ledger receipt journal, because it is still process-local `WeakMap` state
- production registry snapshots, because they are currently derived outputs rather than durable root-state fields

### Portfolio candidate: additive empty scaffold only

There is currently no `state.portfolio` surface anywhere in `RunState`, bounded snapshots, or full run summary exports.

The only current portfolio references are planning-level:

- the refactor charter names portfolio accounting as future economy ownership
- tranche `R2` backlog items define later portfolio rollups and invariants

That means the first portfolio migration candidate should be an additive empty scaffold, for example a top-level portfolio container with explicit schema metadata and empty deterministic collections.

It should not attempt to infer real portfolio totals yet.

Closest existing inputs that future portfolio work may eventually consume are:

- `houses[*].holdings_count`
- tracked manor asset balances
- later multi-manor registry additions

But none of those constitute an existing portfolio registry today.

## Recommended manifest cut for T02

If `V03-R1-002-T02` adds a registry manifest next, the most defensible first cut is:

1. Root state schema version metadata on `RunState`
2. Manifest entries for durable root registries only
3. An explicit classification of each entry as one of:
   - durable root-state registry
   - bounded snapshot/read-model registry
   - derived/process-local registry

Recommended initial durable entries:

- `people`
- `houses`
- `player_house_id`
- `kinship_edges`
- `institutions`
- `service_records`
- `beliefs`
- `flags`
- `log`
- `manor_economy_surface` or equivalent additive economy grouping

Recommended deferred entries:

- marriage offer registry
- economy production registry
- fiscal receipt journal
- roster/prospects read models

## Audit conclusion

The codebase already has enough deterministic structure to support a state schema/version scaffold, but the migration boundary is not centralized yet.

The safe next step is to version the durable root-state surfaces that already survive full JSON export, starting with the People-First registries and the tracked manor economy surface. The safe portfolio step is an additive empty scaffold, because no live portfolio registry exists yet.
