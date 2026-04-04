# Integrator Run Log

**Run ID:** 2026-03-31_xmap_checkpoint_posture_update
**Date:** 2026-03-31
**Branch:** codex/v0.3-refactor-kickoff
**Accepted Task:** none
**Dispatched Tasks:** none

## Outcome
- Recorded the map-repo operator guidance that `lotm-deploy` must not run another XMAP import pass while `V03-XMAP-001` remains blocked.
- Marked the frozen `xmap_alpha_v1` import surface already landed in kickoff as repo truth for world/topology planning.
- Clarified that `V03-R1-001-T01` and `V03-R1-001-T02` should be rebased against existing repo truth after `V03-XMAP-001` clears rather than rebuilt.
- Clarified that `V03-R1-001-T03` is the first clearly remaining map-coded topology task after unlock and that `V03-R1-001-T04` remains integrator-owned after T03.

## Frozen Surface
- data/map/xmap_alpha_v1/manor_units_v1.json
- data/map/xmap_alpha_v1/holding_fabric_v1.json
- data/map/xmap_alpha_v1/world_topology_v1.json
- data/map/xmap_alpha_v1/xmap_alpha_manifest_v1.json
- docs/schemas/xmap_alpha_v1.md
- docs/arch/XMAP_ALPHA_HANDOFF.md
- docs/HOLDING_FABRIC_LEGAL_RULES_v0_1.md
- imported kickoff commit: `eaa9da5`

## Preserved Semantics
- stable `manor_id`
- stable higher-order holding IDs
- territorial adjacency semantics
- route adjacency semantics
- weighted route graph semantics
- `travel_cost_distance` meaning
- `route_hop_distance` meaning
- `holding_fabric_legal_rules_v0_1` field family

## Operator Checkpoint Read
- counties: `15`
- bishoprics: `8`
- archbishoprics: `2`
- baronial band: `45–60`
- abbey/monastery band: `30–60`
- manor band: `300–500`

## Verification
- `npm run ops:v0.3:validate -- --json`
- `ruby scripts/opsV03SchedulerDryRun.rb --json`
- `ruby scripts/opsV03RebaseDryRun.rb --json`
