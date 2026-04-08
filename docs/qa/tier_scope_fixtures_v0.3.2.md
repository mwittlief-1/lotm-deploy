# Tier Scope Fixtures v0.3.2

Last updated: 2026-04-06
Task: `V03-R2-002-T05`

## Scope

This task adds a bounded, deterministic tier-scope regression fixture for the accepted v0.3.2 world cap-table and debug-surface contract without reopening the scope-policy implementation or integrator-owned orchestration.

- Canonical topology input fixture: `tests/fixtures/world_topology_snapshot_v0.3.1.json`
- Fixture verification: `tests/ui/playScreenTopologyFixtures.test.ts`
- Canonical tier-scope fixture: `tests/fixtures/tier_scope_debug_surface_v0.3.2.json`

## Fixture inventory

### `tests/fixtures/tier_scope_debug_surface_v0.3.2.json`

- Source: `buildTopologyDebugSurface({ player_house_id: "h_player", houses: { h_player: { tier: "Knight" } }, world_topology_view: world_topology_snapshot_v0.3.1.json })`
- Anchor manor: `manor_hx_26597`
- Covers:
  - bounded raw distance sample formatting from the accepted topology fixture
  - canonical scope-cap bucket ordering and cumulative cap labels
  - deterministic admitted and rejected counts for the Knight tier
  - bounded rationale rows showing admitted territorial adjacency and rejected far-band examples

## Boundedness rules

- The fixture stores only the bounded `TopologyDebugSurface` payload derived from the accepted world-topology fixture.
- It does not embed the full world domain, the unbounded cap-evaluation decision list, or replay outputs.
- The snapshot remains intentionally small enough for line-by-line review in diffs.
- Treat fixture diffs as scope-contract changes, not incidental UI noise.

## Post-merge verification

1. Run `npx vitest run tests/ui/playScreenTopologyFixtures.test.ts tests/ui/playScreenTopology.test.ts tests/sim/world_scope_caps.test.ts`.
2. Run `npm run qa`.
3. Run `npm run preflight`.
4. Run `npm run seed:replay:batch` twice and confirm the `summary_hash` matches across both runs.

## Notes

- The fixture intentionally reuses `tests/fixtures/world_topology_snapshot_v0.3.1.json` so T05 locks the accepted bounded topology surface instead of creating a second topology input.
- The canonical far-threshold in this regression pack remains `50`, inherited from the topology fixture, so both `near` and `far` scope rows stay present.
- Refresh the fixture only when accepted scope-cap ordering, bounded rationale rows, or raw-distance formatting changes intentionally.
- The full epic closeout now lives in `ops/v0.3/progress/runs/V03-R2-002.md`.
