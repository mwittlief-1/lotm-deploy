# Integrator Run Log

**Run ID:** 2026-03-31_world_t04_acceptance_and_world_t06_dispatch
**Date:** 2026-03-31
**Branch:** codex/v0.3-refactor-kickoff
**Accepted Tasks:** V03-R1-001-T04
**Dispatched Tasks:** V03-R1-001-T06

## Accepted Inputs
- Integrated code baseline commit: `3c6bba4f5a3a7c5a44dcf6272b08f905e5d15c68`

## Outcome
- Accepted integrator-owned `V03-R1-001-T04` after bounded world snapshot fields landed cleanly inside `src/sim/domains/world/**`, reporting, and tests without touching `src/sim/turn.ts`.
- Unblocked UI follow-on `V03-R1-001-T05`; it is now `ready` but remains unclaimed because the UI lane already has active work on `V03-R1-005-T01`.
- Dispatched World `V03-R1-001-T06` immediately because the world lane was free and `T06` is the next safe same-lane continuation after `T04`.
- Left Social `V03-R0-005-T03`, UI `V03-R1-005-T01`, and Economy `V03-R3-004-T02` as the existing active lane claims.

## Verification
- `npm run ops:v0.3:validate -- --json`
- `ruby scripts/opsV03SchedulerDryRun.rb --json`
- `ruby scripts/opsV03RebaseDryRun.rb --json`
- `npx vitest run tests/sim/world_xmap_domain.test.ts tests/sim/bounded_snapshot_contract.test.ts tests/logSnapshotsBounded.test.ts tests/sim/state_schema_manifest.test.ts`
- `npm run qa`
- `npm run preflight`
- `npm run seed:replay:batch`
- `npm run seed:replay:batch`
- `npm run repo:duplicates -- --json`

## Replay hashes
- run1: `b09d55c24b36212f79c7dcd032bbf04f512e9af796f9cf87c46322f2f38a4f2f`
- run2: `b09d55c24b36212f79c7dcd032bbf04f512e9af796f9cf87c46322f2f38a4f2f`
