# v0.3 Manual Acceptance Round 15

Date: 2026-04-06
Branch: codex/v0.3-refactor-kickoff

Accepted lane handoffs:
- UI `V03-R2-002-T04`
- Social `V03-R2-004-T01`
- Social `V03-R2-004-T02`

Imported lane artifacts:
- `docs/releases/v0.3.2_office_service_surface_audit.md`
- `ops/v0.3/progress/runs/V03-R2-002-T04.md`
- `ops/v0.3/progress/runs/V03-R2-004-T01.yaml`
- `ops/v0.3/progress/runs/V03-R2-004-T02.yaml`
- `src/sim/domains/court/officeRegistry.ts`
- `src/ui/panels/TopologyDebugPanel.tsx`
- `src/ui/playScreenChrome.ts`
- `src/ui/playScreenTopology.ts`
- `tests/sim/office_registry_schema.test.ts`
- `tests/ui/playScreenChrome.test.ts`
- `tests/ui/playScreenTopology.test.ts`
- `tests/ui/topologyDebugPanel.test.tsx`

Queue decisions:
- Marked UI `V03-R2-002-T04` done.
- Reopened World `V03-R2-002-T05`.
- Marked Social `V03-R2-004-T01` and `T02` done.
- Marked Social `V03-R2-004-T03` blocked at the legacy `src/sim/court.ts` boundary.
- Promoted Social `V03-R2-004-T04` as the next clean same-lane frontier.

Notes:
- UI `T04` stayed inside the allowed UI surface and added deterministic scope-cap debug outputs without perturbing replay.
- Social `T01/T02` stayed inside the court-domain surface and added a dedicated office registry seam plus the release audit for current role, seat, and holder-transition behavior.
- The next Social behavior task should not be advertised as immediately executable while live seat filling, roster reporting, and service mirroring still route through the legacy court layer outside the lane write surface.
- Full kickoff gates reran successfully: validate, scheduler dry-run, rebase dry-run, focused UI and court schema tests, `qa`, `preflight`, replay twice, and duplicate audit.
