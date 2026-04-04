# World Topology Fixtures v0.3.1

Last updated: 2026-04-04
Task: `V03-R1-001-T06` (refreshed by `V03-R1-001-T07`)

## Scope

This task adds a bounded, deterministic topology fixture for the world lane without reopening the frozen XMAP import surface or integrator-owned orchestration.

- Canonical selector/reporting surface: `src/sim/domains/world/xmap.ts`
- Fixture verification: `tests/sim/world_topology_fixtures.test.ts`
- Canonical fixture: `tests/fixtures/world_topology_snapshot_v0.3.1.json`

## Fixture inventory

### `tests/fixtures/world_topology_snapshot_v0.3.1.json`

- Source: `buildBoundedWorldTopologyView(createWorldDomain(clonedBundledSurfaceWithFarThreshold(50)))`
- Anchor manor: `manor_hx_26597`
- Covers:
  - territorial adjacency ordering
  - route adjacency ordering
  - canonical numeric distance sample ordering
  - far-threshold classification with both `near` and `far` rows present

## Boundedness rules

- The fixture stores only the bounded `world_topology_snapshot_v1` payload.
- It does not embed the full world domain, replay outputs, or raw import artifacts.
- The snapshot remains intentionally small enough for line-by-line review in diffs.
- Treat fixture diffs as topology contract changes, not incidental debug noise.

## Post-merge verification

1. Run `npx vitest run tests/sim/world_topology_fixtures.test.ts tests/sim/world_xmap_domain.test.ts tests/sim/bounded_snapshot_contract.test.ts`.
2. Run `npm run qa`.
3. Run `npm run preflight`.
4. Run `npm run seed:replay:batch` twice and confirm the `summary_hash` matches across both runs.

## Notes

- The fixture uses the frozen bundled world surface plus a local `far_threshold_default = 50` override so near/far coverage stays deterministic without mutating the vendored import files.
- Refresh the fixture only when bounded topology fields, selector ordering, or distance-band semantics change intentionally.
- The broader topology-contract closeout now lives in `docs/arch/XMAP_ALPHA_HANDOFF.md` and `ops/v0.3/progress/runs/V03-R1-001.md`.
