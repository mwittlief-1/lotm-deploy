# v0.3 Manual Social T03 Unblock

Date: 2026-04-06
Branch: codex/v0.3-refactor-kickoff

Integrator seam work:
- Moved the legacy house-court seat-planning, roster read surface, and service-record mirroring helpers into `src/sim/domains/court/officeRegistry.ts`.
- Kept `src/sim/court.ts` as a thin adapter over the moved court-domain helpers.
- Added focused regression coverage in `tests/sim/office_registry_schema.test.ts`.

Verification:
- `npx vitest run tests/sim/office_registry_schema.test.ts tests/v024_dev_b_court.test.ts tests/v025_dev_b_realism.test.ts`
- `npm run qa`
- `npm run preflight`
- `npm run seed:replay:batch`
- `npm run seed:replay:batch`

Replay:
- run1: `fec2597e55528776bf3eb186e061a3622a678b8734007aa56fc692c0c72751b1`
- run2: `fec2597e55528776bf3eb186e061a3622a678b8734007aa56fc692c0c72751b1`

Queue decisions:
- Reopened Social `V03-R2-004-T03` as `ready`.
- Returned Social `V03-R2-004-T05` and `V03-R2-004-T06` to dependency-tracked `todo` state instead of administrative `blocked`.

Notes:
- This unblock intentionally preserved replay and golden behavior; the broader seam carve tested earlier in the day was not accepted because it changed the replay line.
