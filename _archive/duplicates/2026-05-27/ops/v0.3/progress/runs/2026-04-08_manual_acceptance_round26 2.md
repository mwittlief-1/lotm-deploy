## 2026-04-08 Manual Acceptance Round 26

- Accepted Social grant baseline chain `V03-R2-006-T01` through `V03-R2-006-T06`.
- Closed epic `V03-R2-006`.
- Opened downstream fronts:
  - Social `V03-R3-003-T03`
  - Engine `V03-R3-006-T01`
  - UI `V03-R3-007-T01`
- Pre-promoted same-lane follow-ons so long runs can continue without another scheduler stop:
  - Social `V03-R3-003-T04` and `V03-R3-003-T05`
  - Engine `V03-R3-006-T02` through `V03-R3-006-T05`
  - UI `V03-R3-007-T02` through `V03-R3-007-T05`

### Accepted code

- `68fe6a0` `feat(people): add grant acquisition baseline`

### Gates

- `npx vitest run tests/sim/grant_acquisition_registry.test.ts tests/sim/grant_acquisition_surfaces.test.ts tests/sim/grant_acquisition_fixtures.test.ts tests/sim/bounded_snapshot_contract.test.ts tests/sim/succession_registry.test.ts`
- `npm run ops:v0.3:validate -- --json`
- `ruby scripts/opsV03SchedulerDryRun.rb --json`
- `ruby scripts/opsV03RebaseDryRun.rb --json`
- `npm run qa`
- `npm run preflight`
- `npm run seed:replay:batch`
- `npm run seed:replay:batch`
- `npm run repo:duplicates -- --json`

### Replay

- `run1`: `fec2597e55528776bf3eb186e061a3622a678b8734007aa56fc692c0c72751b1`
- `run2`: `fec2597e55528776bf3eb186e061a3622a678b8734007aa56fc692c0c72751b1`

### Notes

- The lane handoff carried a different lane-local replay hash, but the accepted kickoff integration was kept replay-safe by preserving the generic serialized inheritance-claim summary while exposing the new grant surfaces through the existing bounded runtime seams.
- `qa` completed successfully after a long full-vitest pass; no grant-specific regression remained once the stale fixture and succession expectation were aligned to the accepted replay-safe surface.
