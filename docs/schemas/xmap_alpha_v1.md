# XMAP Alpha Sidecar Contract

This document defines the alpha manor/topology sidecars emitted by `mapGenV1`.

This is the current emitted contract for the Current World Context v1 alpha bundle.

## Primary Artifacts

### `manor_units_v1.json`

- `schema_version = "manor_units_v1"`
- stable ordered `manors[]`
- `abbey_site` role semantics: abbey/monastery house layer, not only major abbeys
- each manor includes:
  - `manor_id`
  - `seat_hex_id`
  - `hex_ids[]`
  - `hex_count`
  - `seat_archetype`
  - `is_seat_complex`
  - `primary_role`
  - `seat_roles[]`
  - `seat_score`
  - `route_access_score`
  - `crossing_score`
  - `strategic_score`
  - `defensibility_score`
  - `lordship_attraction_score`
  - `domain_target_hexes`
  - `direct_domain_hex_count`
  - `role_scores`
  - `total_net_productive_capacity`
  - `avg_water_access_score`
  - `avg_buildability_score`
  - `manor_size_class`
  - `estimated_peasant_households`
  - `household_profile`
  - `capacity_quantile_band`
  - `county_id`
  - `holding_id`
  - `holding_type`
  - `holding_tier`
  - `bishopric_id`
  - `archbishopric_id`
  - `legal_rule_version = "holding_fabric_legal_rules_v0_1"`
  - `immediate_lord_actor_id`
  - `superior_lord_actor_id`
  - `holder_actor_id`
  - `holder_actor_type`
  - `church_holder_kind`
  - `tenure_basis`
  - `service_basis[]`
  - `default_succession_incidents[]`
  - `jurisdiction_bundle`
  - `franchise_bundle`
  - `forest_overlay_status`
  - `vacancy_rule_family`
  - `was_repaired`
  - `was_merged`
  - `was_split`

### `holding_fabric_v1.json`

- `schema_version = "holding_fabric_v1"`
- `legal_rule_version = "holding_fabric_legal_rules_v0_1"`
- stable ordered ownership/aggregation layer built on top of final manors
- legal interpretation of this scaffold is defined in
  [HOLDING_FABRIC_LEGAL_RULES_v0_1.md](/Users/matt_wittlief_home/lotm-mapgen/docs/HOLDING_FABRIC_LEGAL_RULES_v0_1.md)
- includes:
  - `direct_holdings[]`
    - `crown_domain`
    - `church_fief`
    - `county_domain`
    - `minor_lordship`
    - each holding now also carries additive legal semantics:
      - `immediate_lord_actor_id`
      - `superior_lord_actor_id`
      - `holder_actor_id`
      - `holder_actor_type`
      - `church_holder_kind`
      - `tenure_basis`
      - `service_basis[]`
      - `default_succession_incidents[]`
      - `jurisdiction_bundle`
      - `franchise_bundle`
      - `forest_overlay_status`
      - `vacancy_rule_family`
  - `baronies[]`
  - `counties[]`
    - county overlay rows now distinguish jurisdiction from ownership through:
      - `overlay_actor_id`
      - `ownership_scope`
      - `controls_ownership`
      - `controls_jurisdiction`
      - `jurisdiction_bundle`
      - `franchise_bundle`
      - `forest_overlay_status`
  - `bishoprics[]`
  - `archbishoprics[]`
  - `manor_assignments[]`
    - assignment rows mirror the additive holding legal-semantics fields for
      downstream lookup convenience
  - `ownership_metrics`
- counties in this artifact are the revised county fabric derived from the manor/holding layer, not the legacy county-first partition

### `world_topology_v1.json`

- `schema_version = "world_topology_v1"`
- stable ordered `manor_ids[]`
- `territorial_adjacency[]`
- `route_adjacency[]`
- `weighted_route_edges[]`
- `distance_preview_rows[]`
- `distance_metrics`
  - `canonical_numeric_distance = "travel_cost_distance"`
  - `companion_metric = "route_hop_distance"`
  - `far_threshold_default = null`
  - `export_mode = "preview_rows_plus_route_graph"`

Directional lock for the next retune:

- adjacency and weighted route edges remain primary
- distance semantics stay stable
- preview distance rows are QA/debug aids, not the primary query surface

### `xmap_alpha_manifest_v1.json`

- versioned summary of the package
- stable hashes for primary and debug sidecars
- summary counts used for merge and QA review
- now also carries top-line ownership counts and shares:
  - `county_count`
  - `bishopric_count`
  - `archbishopric_count`
  - `barony_count`
  - `crown_demesne_hex_share`
  - `direct_church_fief_hex_share`

## Debug / Internal Artifacts

### `hex_economic_profile_v1.json`

- per-hex productivity, access, reliability, and settlement scores

### `corridor_graph_v1.json`

- crossing nodes
- corridor nodes
- corridor edges

### `settlement_scaffold_v1.json`

- proto-settlement candidates
- settlement registry
  - `hamlet`
  - `village`
  - `market_town_candidate`
  - `regional_center_candidate`
- strategic site candidates
- elite seat complexes
- route nodes
- route edges

### `manor_generation_report.json`

- core land count
- proto-settlement count
- corridor node/edge counts
- target/final manor counts
- route tier counts
- locked viability thresholds used by validation
- `seat_archetype_counts`
- `elite_seat_complex_count`
- `settlement_registry`
- `elite_seat_role_counts`
- `elite_direct_domain_hex_count`
- `assembly_thresholds`
- `repair_thresholds`
- `bundle_growth_assignments`
- `support_fill_assignments`
- `tiny_component_absorptions`
- `tiny_component_absorption_count`
- `productive_residual_absorptions`
- `productive_residual_component_absorptions`
- `transfer_count`
- `merge_count`
- `dissolve_count`
- `final_assembly_transfer_count`
- `final_assembly_merge_count`
- `final_assembly_dissolve_count`
- `pre_reserved_land`
  - contiguous pre-manorial crown/waste regions reserved before manor assembly
  - component count and largest component size
- `pre_reserved_thresholds`
- `pre_reserved_domain_land`
  - pre-reserved domain regions re-summarized against final manor adjacency
  - used for legal-domain overlays like royal forests
- `residual_land`
  - total contiguous non-manorial regions after manor assembly
  - this is the union of pre-reserved land and post-assembly assignable residual land
  - residual hex registry
  - component count and largest component size
- `assignable_residual_land`
  - contiguous post-assembly residual land that remained outside ordinary manor assignment but was not pre-reserved
  - useful for separating likely crown forest/hunting blocks from up-front harsh-terrain reserve
- `royal_forest_thresholds`
- `royal_forest_land`
  - legal-domain overlay, not a terrain blanket
  - only a subset of residual forest regions should classify as royal forest
  - ordinary forest may remain manorial or residual without becoming royal
- `ownership_metrics`
  - crown demesne share
  - direct church-fief share
  - residual / non-manorial share
- `residual_thresholds`
- `oversize_split_count`
- `oversize_split_attempt_count`
- `repaired_manor_ids`
- `merged_absorber_ids`
- `split_manor_ids`

## Determinism Rules

- IDs are derived, not random
- arrays are emitted in deterministic order
- no `Math.random()` in replay-critical paths
- identical seed and config must produce byte-stable primary artifacts
