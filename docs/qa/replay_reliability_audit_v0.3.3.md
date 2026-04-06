# Replay Reliability Audit v0.3.3

Last updated: 2026-04-05  
Task: `V03-R3-001-T01`

## Scope

Audit the current replay harness and invariant coverage against the v0.3 registry surfaces and reliability quota. This report inventories which registries are exercised by replay artifacts, which invariants exist today, and what gaps remain before adding new guards.

Sources referenced:
- `docs/arch/state_registry_audit_v0.3.1.md`
- `docs/arch/state_placeholder_registries_v0.3.1.md`
- `docs/qa/state_migration_failure_qa_v0.3.1.md`
- `scripts/seedReplay.ts`
- `scripts/seed_replay/seedPlan.ts`
- `scripts/qaNoDeps.mjs`
- existing invariant/unit tests under `tests/`

## Replay harness coverage

### Seed replay batch (`npm run seed:replay:batch`)

What it captures today:
- Uses `createNewRun()` + `proposeTurn()`/`applyDecisions()` for each seed/policy.
- Persists per-run artifacts with:
  - `final_signature` (core economy/obligation + energy snapshot)
  - `final_summary` (from `buildRunSummary`)
  - `turn_trace` with `summary`, `decisions`, `deltas`, `report.*` slices, and selected end-of-turn balances.
- Persists a batch summary with hash-stable ordering for runs.

Key omissions relative to v0.3 registries:
- Does not serialize or hash `state_schema_version` or `bounded_registry_manifest`.
- Does not assert presence or schema of placeholder registries (`state.economy`, `state.portfolio`).
- Does not assert `institutions`, `service_records`, or `beliefs` registry surfaces.
- Does not include receipt journals or ledger snapshots; receipts are not validated by replay hashes.

### No-deps QA gate (`scripts/qaNoDeps.mjs`)

Coverage present:
- Determinism check for log hash on a single seed/policy.
- Golden-seed invariant sweeps for population/coin/bushels/energy/clamps.
- Bounded snapshot guard that allows only a small key whitelist and forbids `log`.
- Migration fixture smoke for People-First registries.

Known mismatch with v0.3 registry contract:
- The bounded snapshot key whitelist currently omits `state_schema_version`, `bounded_registry_manifest`, `economy`, and `portfolio` (expected by the v0.3.1 migration QA note). If those keys are serialized as intended, this guard will fail. If they are not serialized, then replay artifacts are not currently validating that the v0.3 registry metadata is present.

## Registry coverage map

Legend:
- **Replay**: explicitly captured/validated by seed replay artifacts or no-deps gate
- **Invariants**: covered by test suite invariants or focused unit tests

| Registry surface (v0.3) | Replay coverage | Invariant coverage | Notes |
| --- | --- | --- | --- |
| `state_schema_version` | No | No | Expected in bounded snapshots per v0.3.1 QA note, but not asserted today. |
| `bounded_registry_manifest` | No | No | Same gap as `state_schema_version`. |
| `state.economy` placeholder | No | No | Placeholder registry exists in migration scaffold; not validated by replay or tests. |
| `state.portfolio` placeholder | No | Partially | Portfolio invariants exist for rollups, but placeholder registry presence/shape is not asserted. |
| `people` registry | Indirect | Partial | Migration fixture ensures People-First on legacy load; no replay-specific signature includes registry shape. |
| `houses` registry | Indirect | Partial | Same as `people`; household view test touches `houses` only indirectly. |
| `player_house_id` | Indirect | Minimal | Covered only by migration fixture assertions. |
| `kinship_edges` | Indirect | Yes | `tests/sim/kinship_household.test.ts` asserts spouse exclusivity and succession rebase. |
| `institutions` registry | No | No | Explicitly omitted from bounded snapshots; not covered by invariants. |
| `service_records` registry | No | No | Explicitly omitted from bounded snapshots; not covered by invariants. |
| `beliefs` registry | No | No | Stored non-enumerably; no replay guard or invariant. |
| `flags` | Indirect | No | No invariant checks on `flags` contents; only `game_over` reason check. |
| `log` (turn history) | Partial | Yes | Replay artifacts store `turn_trace` and QA gate checks log hash determinism. |
| Manor economy surface (`manor.coin`, `bushels_stored`, `meat_stores`, obligations) | Yes | Yes | Covered in `seedReplay` core signature and in invariants + ledger tests. |

## Current invariant/test coverage (selected)

- Core invariants: `tests/invariants.test.ts` + `scripts/qaNoDeps.mjs` checks for non-negativity, clamps, and energy constraints across seeds.
- Portfolio rollup invariants: `tests/sim/portfolio_invariant_regression.test.ts` covers totals and determinism for multi-manor analysis.
- Fiscal/ledger contract: `tests/sim/ledger_domain.test.ts`, `tests/sim/obligation_registry.test.ts`, `tests/sim/fiscal_schema_contract.test.ts`.
- Kinship constraints: `tests/sim/kinship_household.test.ts`.
- Demography spacing invariant: `tests/sim/spacing_invariant_v029.test.ts`.

## Reliability quota gaps (v0.3.3)

The epic quota requires at least two new invariants tests focused on fiscal/portfolio surfaces. The audit shows these missing guard areas:

1. **Registry manifest + schema metadata invariants**
   - No test asserts `state_schema_version` or `bounded_registry_manifest` presence in bounded snapshots.
   - Placeholder registries (`economy`, `portfolio`) are not asserted to exist with correct schema IDs.

2. **Portfolio placeholder contract**
   - No invariant ensures `state.portfolio.schema_version` matches the placeholder spec or that `positions` remains deterministically ordered/empty until filled by later tasks.

3. **Receipt/ledger replay guard**
   - Ledger unit tests exist, but seed replay artifacts do not validate receipt ordering or receipt journal stability across runs.

## Recommended next guard additions (for T02)

These are the minimum reliability quota additions that should be added next:

1. **Bounded snapshot registry invariant test**
   - Assert `state_schema_version` and `bounded_registry_manifest` are present in `state.log[].snapshot_*`.
   - Assert placeholder registries `economy` and `portfolio` exist and match the v0.3.1 schema versions.

2. **Portfolio placeholder invariant test**
   - Assert `state.portfolio.schema_version` is `portfolio_registry_placeholder_v1`.
   - Assert `positions` remains a stable empty array until a later task intentionally populates it.

Optional follow-on (if time remains after quota):
- A replay-harness extension that hashes a receipt snapshot (or ledger summary) to validate receipt ordering determinism across seed batches.

## Audit conclusion

The replay harness reliably captures and hashes core manor economy balances and deterministic turn traces, but it does not yet validate the v0.3 registry manifest, placeholder registries, or receipt journal stability. The next reliability work should focus on adding registry/placeholder invariants and then extending replay artifacts to validate receipt ordering if needed.
