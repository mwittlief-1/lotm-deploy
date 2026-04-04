# XMAP Alpha Handoff

Last updated: 2026-04-04
Task: `V03-R1-001-T07`

This repo's Current World Context v1 alpha handoff bundle for `lotm-deploy` is:

- `manor_units_v1.json`
- `holding_fabric_v1.json`
- `world_topology_v1.json`
- `xmap_alpha_manifest_v1.json`

Supporting debug sidecars:

- `hex_economic_profile_v1.json`
- `corridor_graph_v1.json`
- `settlement_scaffold_v1.json`
- `manor_generation_report.json`

## Intended Integration Surface

- target domain: `src/sim/domains/world/**`
- expected consumers:
  - manor lookup by stable ID
  - territorial adjacency query
  - route adjacency query
  - numeric distance query
  - configurable `far` helper in downstream repo
  - bounded world-topology snapshot reporting
  - topology debug display surfaces backed by bounded snapshot data

## Explicit Non-Goals At Merge

- no `src/sim/turn.ts` rewrite
- no people-domain rewrite at merge time
- no tier-cap or inheritance consumer logic required yet
- no UI redesign required for merge readiness

## Merged Topology Contract

The accepted `V03-R1-001` world/topology epic now closes with these repo-truth surfaces:

- frozen import inputs remain `data/map/xmap_alpha_v1/manor_units_v1.json`, `data/map/xmap_alpha_v1/holding_fabric_v1.json`, `data/map/xmap_alpha_v1/world_topology_v1.json`, and `data/map/xmap_alpha_v1/xmap_alpha_manifest_v1.json`
- `src/sim/domains/world/**` remains the canonical domain seam for stable manor IDs, higher-order holding IDs, overlay lookups, territorial adjacency, route adjacency, weighted route-edge semantics, and numeric distance selectors
- `travel_cost_distance` remains the canonical numeric baseline and `route_hop_distance` remains the companion QA/debug metric
- configurable far-threshold behavior is layered on top of the numeric baseline rather than reopened in the import/schema surface
- bounded reporting now exposes `world_topology_snapshot_v1` for deterministic downstream consumers without dumping the full topology graph into snapshots
- accepted UI consumers remain display-only and read the bounded topology snapshot rather than mutating world state directly

## Artifact Semantics

- `manor_units_v1.json` is the canonical manor registry
  - includes seat archetype, elite seat-complex role metadata, higher-lordship-oriented seat metrics, ownership assignments, manor provenance flags, and additive holding-legal semantics copied from the holding fabric
  - `abbey_site` should be interpreted downstream as the abbey/monastery house layer
- `holding_fabric_v1.json` is the canonical ownership/aggregation layer
  - direct holdings: crown domain, church fief, county domain, minor lordship
  - mesne holdings: baronies
  - territorial rollups: counties, bishoprics, archbishoprics
  - additive legal fields now include immediate/superior lord actor IDs, tenure basis, service and succession families, jurisdiction bundle, franchise bundle, forest overlay status, and church-holder metadata where applicable
  - revised county borders are derived here from the ownership fabric and then written back into the final `map_v1.json`
  - legal semantics for these layers are defined in
    [HOLDING_FABRIC_LEGAL_RULES_v0_1.md](/Users/matt_wittlief_home/lotm-mapgen/docs/HOLDING_FABRIC_LEGAL_RULES_v0_1.md)
- `settlement_scaffold_v1.json` now includes the bounded `settlement_registry` layer inserted between corridor graphing and strategic-site scoring
- `world_topology_v1.json` is the canonical manor topology
- `travel_cost_distance` is the raw numeric baseline
- `route_hop_distance` is shipped for QA/debug and later threshold tuning
- `manor_generation_report.json` records pre-reserved domain regions, elite seat-complex counts, assignable residual regions, assembly thresholds, productive-residual absorption counts, and seat archetype counts for QA/tuning review
- the report now also carries a deterministic `royal_forest_land` overlay so downstream world work can distinguish legal royal forest from ordinary woodland

## Current World Context v1 Follow-Up

The current alpha now targets a bounded `300–500` manor world with `15` counties, `8` bishoprics, `45–75` baronial seats, and `30–60` abbey/monastery houses. The next tuning lane should preserve:

- stable `manor_id`
- stable higher-order holding IDs
- territorial adjacency
- route adjacency
- weighted route graph semantics
- stable numeric distance meaning

But the underlying export strategy may still become lighter than the current preview-row representation once later institutions and fiscal consumers are aggregated over this manor/holding layer.

## Accepted Evidence

- Canonical world import/domain seam: `src/sim/domains/world/xmap.ts`
- Canonical world-domain coverage: `tests/sim/world_xmap_domain.test.ts`
- Accepted bounded snapshot evidence: `ops/v0.3/progress/runs/V03-R1-001-T04.md`
- Accepted UI debug evidence: `ops/v0.3/progress/runs/V03-R1-001-T05.md`
- Deterministic topology fixture note: `docs/qa/world_topology_fixtures_v0.3.1.md`
- Deterministic topology fixture coverage: `tests/sim/world_topology_fixtures.test.ts`

## Accepted Diff Notes

- `V03-R1-001-T01` and `V03-R1-001-T02` were resolved as repo-truth rebase tasks after `V03-XMAP-001`; no new XMAP import pass was reopened.
- `V03-R1-001-T03` added configurable far-threshold selectors on top of the existing numeric distance seam without mutating the frozen import bundle.
- `V03-R1-001-T04` added bounded snapshot fields for downstream reporting while preserving the stricter integrator boundary around orchestration and turn wiring.
- `V03-R1-001-T05` consumed the bounded snapshot in debug UI surfaces only; it did not widen the underlying world contract.
- `V03-R1-001-T06` locked deterministic topology fixtures and QA guidance without reopening import or schema design.

## Epic Outcome

`V03-R1-001` is ready to remain `done` in backlog state after merge because:

- the frozen XMAP alpha bundle is now anchored by one canonical world-domain seam in repo truth
- adjacency, numeric distance, far-threshold classification, bounded snapshot reporting, and deterministic topology fixtures all have accepted evidence
- the remaining world/topology boundary is now about later consumer scope, not about re-litigating the frozen import contract
