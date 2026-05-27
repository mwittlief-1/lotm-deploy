# AGENTS.md — v0.3 Kickoff Guardrails

## Scope
This file applies to the entire repository unless a deeper `AGENTS.md` overrides it.

## Mission
Enable the `v0.3` refactor and parallel workstreams without breaking deterministic replay, golden baselines, or the `v0.2final` stabilization line.

## Canon Corpus
The Final Canon Complete Corpus v0.1 is now controlling context for product and runtime interpretation. Before deriving requirements, planning implementation, or resolving source conflicts, read `SOURCE_STATUS_INDEX.md`, `ops/v0.3/CODEX_CANON_HANDOFF_README.md`, `ops/v0.3/STOP_RULES.md`, `docs/product/PRODUCT_CONSTITUTION.md`, `docs/product/V1_SCOPE_GUARDRAILS.md`, `docs/architecture/SOURCE_OF_TRUTH_HIERARCHY.md`, `docs/architecture/RUNTIME_RESET_CANON.md`, `docs/architecture/OVERLAY_RECEIPT_READMODEL_DOCTRINE.md`, and `docs/architecture/DETERMINISM_CONTRACT.md`.

Authority order is:
1. Product Constitution / V1 Guardrails
2. Architecture / Runtime Spine
3. Domain Doctrines
4. Mechanical Specs
5. Catalog Seeds
6. Requirements / Codex Ops

Older release docs, QA packets, proof reports, progress logs, runtime inventories, and backlog entries are consolidation evidence unless `SOURCE_STATUS_INDEX.md` classifies them as active canon. Mechanical specs or catalogs marked `MECHANICAL_SPEC_NEEDED`, `CPO_DECISION_NEEDED`, `CATALOG_CONTENT`, or `RED_ZONE_BLOCKED` do not authorize live behavior, schema promotion, UI integration, turn-pipeline integration, or golden updates.

## Hard Rules
1. Behavior-preserving seam carving comes first.
   - Prefer moving code over changing outcomes.
   - Keep refactor PRs separate from mechanic changes whenever possible.
2. Determinism remains mandatory.
   - No `Math.random()` in simulation paths.
   - Preserve stable ordering for sim-critical iteration, logs, receipts, and projections.
   - Keep RNG stream usage isolated and auditable.
   - Do not change golden outputs unless the change is intentional and approved.
3. Phases own ordering; domains own meaning.
   - `src/sim/turn.ts` should become a thin orchestrator.
   - `src/sim/phases/*` own execution order only.
   - `src/sim/domains/*` own domain semantics and write rules.
4. Integrator boundary is strict.
   - Only the integrator branch edits `src/sim/turn.ts` orchestration and cross-phase wiring.
   - Lane branches should stay inside their owned domain, tests, and UI surfaces.
5. Dangerous writes must be centralized.
   - Relationship A/R/T writes go through the relationship engine API.
   - Coin deltas go through the ledger/receipt API.
   - UI layers do not mutate sim state directly.
6. Forbidden patterns in active work.
   - Direct relationship-store writes outside the relationship engine.
   - Direct coin mutation outside economy-owned APIs.
   - Unsorted object-key iteration in sim-critical paths.
   - Editing numbered duplicate files (`* 2.*`, `* 3.*`, etc.) unless explicitly restoring/archive-cleaning them.
   - Creating new numbered duplicate files instead of quarantining them under `_archive/duplicates/YYYY-MM-DD/`.
7. Active file policy.
   - Unsuffixed top-level files are canonical unless a plan doc says otherwise.
   - Numbered duplicates are historical artifacts and should not be imported, edited, or used as new sources of truth.
   - `_archive/duplicates/YYYY-MM-DD/` is the canonical quarantine destination for duplicate cleanup.
8. PhaseResult migration is staged.
   - Start with `receipts[]`, `logEvents[]`, and `rngKeysUsed[]`.
   - `patch` remains optional until a later tranche proves the pattern phase-by-phase.

## Branch Strategy
- `main`: stable integration/release history.
- `codex/v0.2final`: only `v0.2final` stabilization and hotfix work.
- `codex/v0.3-refactor-kickoff`: integrator branch for kickoff docs, repo cleanup policy, scaffolding, and early phase extraction.
- `codex/v0.3-lane-*`: short-lived category/lane branches cut from the kickoff branch and merged back only after gates pass.

## Required Gates
Run before merge on active implementation branches:
- `npm run qa`
- `npm run preflight`
- `npm run seed:replay:batch` twice and compare outputs/hashes
