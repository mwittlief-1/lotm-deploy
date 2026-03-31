# XMAP Alpha Handoff

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

## Explicit Non-Goals At Merge

- no `src/sim/turn.ts` rewrite
- no people-domain rewrite at merge time
- no tier-cap or inheritance consumer logic required yet
- no UI redesign required for merge readiness

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
