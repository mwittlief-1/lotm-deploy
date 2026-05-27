## 2026-04-09 Manual Acceptance Round 30

- Accepted kickoff `V03-R3-002-T04`.
- Advanced the clergy-placement epic to the Social closeout task:
  - `V03-R3-002-T05`

### Accepted code

- `f718ae4` `feat(people): sync clergy placement registries in phases`

### Accepted artifacts

- `src/sim/domains/people/clergyPlacementPersistence.ts`
- `src/sim/phases/phase_demography.ts`
- `src/sim/phases/phase_succession.ts`
- `tests/sim/clergy_phase_integration.test.ts`
- `ops/v0.3/progress/runs/V03-R3-002-T04.md`

### Gates

- `npx vitest run tests/sim/clergy_phase_integration.test.ts tests/sim/clergy_track_registry.test.ts tests/sim/institution_holder_registry.test.ts`
- `npx vitest run tests/ops_v03_control_plane.test.ts`
- `npm run qa`
- `npm run preflight`
- `npm run seed:replay:batch`
- `npm run seed:replay:batch`
- `npm run repo:duplicates -- --json`
- `npm run ops:v0.3:validate -- --json`
- `ruby scripts/opsV03SchedulerDryRun.rb --json`
- `ruby scripts/opsV03RebaseDryRun.rb --json`

### Replay

- `run1`: `fec2597e55528776bf3eb186e061a3622a678b8734007aa56fc692c0c72751b1`
- `run2`: `fec2597e55528776bf3eb186e061a3622a678b8734007aa56fc692c0c72751b1`

### Notes

- The first `qa` run failed on stale control-plane bookkeeping because `latest.yaml` still pointed at no current task; fixing `cursor.current_task_id` to `V03-R3-002-T04` restored the ops invariant and the rerun passed.
- The phase-wrapper seam stayed replay-safe because it only rehydrates clergy-placement state when a prior placement or seeded parish holder already exists.
