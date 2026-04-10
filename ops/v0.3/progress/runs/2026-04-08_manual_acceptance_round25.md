# 2026-04-08 - Manual Acceptance Round 25

## Accepted
- Social `V03-R1-004-T04`
- Social `V03-R1-004-T05`
- Social `V03-R1-004-T06`

## Summary
- Accepted the Social succession baseline finish work on kickoff.
- Preserved deterministic replay by adapting the bounded snapshot summary surface to runtime-only properties instead of serialized snapshot keys.
- Closed epic `V03-R1-004` and dispatched the next Social grants baseline chain at `V03-R2-006-T01`.

## Verification
- `npx vitest run tests/sim/succession_registry.test.ts tests/sim/succession_summary_surfaces.test.ts tests/sim/bounded_snapshot_contract.test.ts tests/logSnapshotsBounded.test.ts`
- `npm run qa`
- `npm run preflight`
- `npm run seed:replay:batch` twice
- `npm run repo:duplicates -- --json`
- `npm run ops:v0.3:validate -- --json`
- `ruby scripts/opsV03SchedulerDryRun.rb --json`
- `ruby scripts/opsV03RebaseDryRun.rb --json`

## Replay
- `fec2597e55528776bf3eb186e061a3622a678b8734007aa56fc692c0c72751b1`
