# BS-PROMOTE-001 XMAP Alpha Fixed Artifact Verification Report

Date: 2026-05-27

Track: v0.4 blessed-spine promotion

Status: Candidate artifact verified for shape/hash; not runtime-promoted

## Purpose

This report starts the first data promotion tranche after canon/control:
`data/map/xmap_alpha_v1/**` as a fixed reference-world candidate. The goal is
to promote fixed artifacts and validators before re-promoting turn-loop, UI, or
legacy event-deck consumers.

## Git Status

At inspection time the XMAP tranche was mixed modified/untracked:

| Status | Paths |
|---|---|
| Modified | `holding_fabric_v1.json`, `manor_units_v1.json`, `map_v1_config.json`, `map_view_support_v1.json`, `world_topology_v1.json`, `xmap_alpha_manifest_v1.json`, `src/sim/domains/world/types.ts`, `src/sim/domains/world/xmap.ts` |
| Untracked | `corridor_graph_v1.json`, `hex_economic_profile_v1.json`, `manor_generation_report.json`, `settlement_scaffold_v1.json`, `worldTopologyInvariants.ts`, `xmapImport.ts`, `xmapIndex.ts`, `xmapManorDetail.ts`, `xmapMapView.ts`, `xmapScope.ts`, `xmapTopology.ts`, `xmapValidation.ts` |

This means the tranche is a candidate, not a committed baseline.

## Artifact Hashes And Shapes

| File | Size bytes | Shape | Key counts | SHA-256 |
|---|---:|---|---|---|
| `corridor_graph_v1.json` | 150762 | object, 8 keys | `corridor_edges`: 229; `corridor_nodes`: 120; `crossing_nodes`: 56 | `459581ed9e30041835cf0526694ccdc92f9ab45d1753d6e9ef8092065b08a98c` |
| `hex_economic_profile_v1.json` | 4134409 | object, 6 keys | `hexes`: 9216 | `7f9460b86abbec26a1e6b1a665b5350a5aab5649cb7126f0bd07ec834088ae4c` |
| `holding_fabric_v1.json` | 4813962 | object, 14 keys | `holdings`: 646; `direct_holdings`: 604; `manor_assignments`: 1250; `counties`: 15; `baronies`: 42 | `4ee3f732ee342de415ad219d3514ddaa807b55bf5a58b34c0ebc5790af86a138` |
| `manor_generation_report.json` | 52542 | object, 14 keys | `target_manor_count`: scalar; `final_manor_count`: scalar; `route_edge_counts`: 3 | `b0b7399fea4ad7a4f1b4dd8e615f21ebc9ce0a0bef993feac45838ff7f2afad3` |
| `manor_units_v1.json` | 3573234 | object, 6 keys | `manors`: 1250 | `42218dabb925de41b4fe3ab3f4b844b1208c60ed55fd123f5ac9344d993e931a` |
| `map_v1_config.json` | 16954 | object, 20 keys | `xmap_alpha`: 61; `mapgen`: 14; `scale`: 7 | `65af10689034e1fd3fb9041308839d400093f4dc4393f15b2de855521c48ca6d` |
| `map_view_support_v1.json` | 7076108 | object, 7 keys | `hexes`: 9216 | `13fbef5e078107f1ee5b5e427741147b44f833ae9a7aa39e78269335f2cdabbb` |
| `settlement_scaffold_v1.json` | 7687205 | object, 11 keys | `settlement_registry`: 68; `route_nodes`: 120; `route_edges`: 229; `strategic_site_candidates`: 8147 | `fbdeca035ed5fbd1d768e797e72e9697a35b12836cc5ba170a00c92c5dc2c3ef` |
| `world_topology_v1.json` | 3026312 | object, 11 keys | `manor_ids`: 1250; `route_adjacency`: 1250; `territorial_adjacency`: 1250; `weighted_route_edges`: 3488 | `259e5cb964b134f361b3e7af15f17965719356cc54288b478a5ac68faa9cd5df` |
| `xmap_alpha_manifest_v1.json` | 5758 | object, 14 keys | `summary`: 15; `stop_rules`: 12; `distance_metrics`: 5 | `2605e77caf812d4569d42a6afe17b8a04a10b66951f1e76dce5ab3af9cb59c25` |

## Boundary Scan

The candidate XMAP domain files were scanned for obvious forbidden coupling:

- `RunState.manor`
- `Math.random(`
- imports from `turn`, `App`, or `src/content/events`

No matches were found in the scanned XMAP/domain candidates.

## Promotion Order

1. Promote the JSON fixed artifacts with hashes captured above.
2. Promote `xmapValidation.ts`, `xmapImport.ts`, `xmapIndex.ts`, and
   `xmapTopology.ts` as read/validation infrastructure.
3. Promote read-model consumers such as `xmapMapView.ts`,
   `xmapManorDetail.ts`, and `xmapScope.ts`.
4. Only then evaluate old runtime/UI consumers.

## Stop Rules

- Do not update golden baselines from this report alone.
- Do not wire XMAP into `src/sim/turn.ts` as part of this tranche.
- Do not treat modified/untracked status as release readiness.
- If a hash changes, rerun this report and explain the source of the change.
