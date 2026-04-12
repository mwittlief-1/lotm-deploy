# v0.3.5 World Map Route Fixtures

## Scope

`V03-R5-001-T05` locks the accepted kingdom-map route seam without reopening world topology imports or adding a second routing surface.

- route seam: `src/ui/worldMapRoute.ts`
- routed screen projection: `src/ui/worldMapView.ts`
- fixture: `tests/fixtures/world_map_route_snapshot_v0.3.5.json`
- guard test: `tests/ui/worldMapRouteFixtures.test.ts`

## Fixture contents

The fixture keeps the contract compact on purpose:

- the canonical external renderer surface for the current-manor route
- the routed selection summary for `manor_hx_27972`
- the first eight marker ids and first eight debug-row ids
- the selected marker payload and selected debug-row payload

That is enough to catch:

- route-hash drift
- selected-manor drift
- marker/debug ordering drift
- player-holding and liege-seat drift

## Replay guard intent

The replay guard for this task is ordering-focused rather than export-focused.

- `first_marker_ids` must stay aligned with `first_debug_row_ids`
- the selected manor must keep the same route target and debug-row flags
- the generated `#/map?manor_id=...` hash must still round-trip through `readAppRouteState()`

## Verification

1. `npx vitest run tests/ui/worldMapRouteFixtures.test.ts tests/ui/worldMapRoute.test.ts tests/sim/world_map_surfaces.test.ts`
2. `npm run qa`
3. `npm run preflight`
4. `npm run seed:replay:batch` twice and compare the `summary_hash`
