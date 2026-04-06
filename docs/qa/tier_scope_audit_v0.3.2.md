# Tier Scope Audit v0.3.2

Last updated: 2026-04-06
Task: `V03-R2-002-T01` (fixture closeout in `V03-R2-002-T05`)

## Scope

This audit covers the world/topology lane scope for `V03-R2-002-T01`:

- `src/sim/domains/world/**`
- `tests/**`
- `docs/qa/**`

This task does not change runtime behavior. The lane-owned deliverable is this audit artifact. Current relevance and tier-scope callers outside the world domain were inspected read-only so the audit can map today’s rules onto the merged topology contract.

The accepted deterministic regression fixture that closes this audit now lives in `docs/qa/tier_scope_fixtures_v0.3.2.md`.

Primary surfaces audited:

- `src/sim/domains/world/xmap.ts`
- `src/sim/domains/world/index.ts`
- `src/sim/domains/world/README.md`
- `tests/sim/world_xmap_domain.test.ts`
- `src/sim/tiers.ts`
- `src/sim/domains/people/knownHouseRelevance.ts`
- `src/sim/domains/people/knownHouseSummaries.ts`
- `src/sim/domains/people/marriage.ts`
- `src/sim/marriageMarket.ts`
- `src/sim/domains/experience/reporting.ts`
- `tests/sim/known_house_relevance.test.ts`
- `tests/sim/known_house_snapshot_fields.test.ts`
- `tests/ui/topologyDebugPanel.test.tsx`
- `docs/releases/v0.3_SCOPE_LOCK.md`

## Topology selector surface already available

The merged topology v1 surface already exposes the inputs that later tier-scope work needs:

- territorial adjacency selectors
- route adjacency selectors
- canonical numeric distance via `travel_cost_distance`
- companion distance via `route_hop_distance`
- configurable `far_threshold_default`
- explicit near/far classification on top of the numeric distance baseline
- bounded topology snapshot output for reporting and debug views

Those selectors are already locked against the frozen XMAP bundle and are test-covered on fixed fixtures. The world domain README also already states that the current surface provides adjacency, numeric distance, and configurable near/far classification without rewriting people, turn orchestration, or fiscal surfaces.

Important scope-lock baseline:

- `docs/releases/v0.3_SCOPE_LOCK.md` says topology v1 provides deterministic adjacency and numeric distance.
- The same scope lock also says kinship exists for T0/T1 houses and that kinship implies T1 relevance.

That means the repo already has the raw topology inputs needed for later scope capping, but the existing relevance baseline is still kinship-first rather than topology-first.

## Current scope-rule inventory

| Surface | Current rule | Topology usage today | Audit note |
| --- | --- | --- | --- |
| `src/sim/tiers.ts` | `computeTierSets(...)` builds Tier0 from court, liege-chain, clergy, parish, and local snapshots. Tier1 uses a scalar `tier1_max_houses` cap, then fills priority houses and finally all remaining houses in lexicographic `house_id` order. | None | This is the main bounded scope surface today. It is deterministic, but its cap and fill order do not read topology selectors. |
| `src/sim/domains/people/knownHouseRelevance.ts` | `buildKnownHouseRelevanceSnapshot(...)` promotes only `blood_tie` and `marriage_tie` houses into Tier1, bounded by the same scalar cap and ordered by kinship reason then `house_id`. | None | This matches the scope-lock rule that kinship implies T1 relevance, but it is not distance-aware. |
| `src/sim/domains/people/marriage.ts` | `buildMarriageWindow(...)` uses `listRelevantTier1HouseIds(...)` when tier sets are present; otherwise it falls back to all non-player houses in sorted `house_id` order. | None | Marriage offer scope inherits the upstream Tier1 house list rather than applying topology itself. |
| `src/sim/marriageMarket.ts` | `listEligibleCandidates(...)` filters by `house_ids` scope and orders candidates by house tier/proximity metadata, then `house_id`, then `person_id`. | None | This ordering is deterministic, but the proximity key is house metadata, not topology v1 numeric distance. |
| `src/sim/domains/people/knownHouseSummaries.ts` and `src/sim/domains/experience/reporting.ts` | Known-house summaries and bounded snapshots already include `known_houses`, `house_dossiers`, and `world_topology_view`. | Indirect only | Reporting can already show topology data, but it does not yet explain scope inclusion or exclusion with topology rationale. |
| `tests/ui/topologyDebugPanel.test.tsx` | UI debug coverage already expects raw distance fields and the current far threshold to remain visible. | Yes, as a read-only debug surface | This is a strong downstream seam for later rationale/debug work once caps are topology-driven. |

## Gaps versus topology v1

### 1. No current scope caller imports the world-domain selectors

The world domain now owns the canonical distance and adjacency contract, but the current Tier0/Tier1 and relevance callers do not import or query that domain at all. The topology work is complete enough to be consumed; the consumer surfaces simply have not been updated yet.

### 2. The current cap is a scalar, not a cap table

Both `computeTierSets(...)` and known-house relevance use a single `tier1_max_houses` number. There is no deterministic cap table yet that distinguishes:

- direct kinship relevance
- territorial adjacency
- route adjacency
- near versus far numeric-distance bands

That is the main policy gap that `V03-R2-002-T02` is meant to address.

### 3. Current fill behavior is lexicographic rather than topology-ordered

When Tier1 expands beyond its priority set, the fill path is simply sorted `house_id` order. That preserves determinism, but it does not encode any world meaning. Topology v1 now provides two stronger deterministic signals:

- adjacency
- canonical numeric distance

Any follow-on cap work should prefer those world selectors over more ad hoc house-id ordering once policy is defined.

### 4. Marriage scope inherits upstream house scope unchanged

The marriage path already has a deterministic `house_ids` scope seam, which is good. The gap is that the supplied `house_ids` are still produced by kinship and lexicographic Tier1 logic rather than by topology-aware capping. No new marriage-market selector is needed here; the upstream house-scope provider is the missing piece.

### 5. Candidate ordering still uses house metadata heuristics

`listEligibleCandidates(...)` orders by tier/proximity keys read from house records when present. That is stable, but it is not the same thing as the topology v1 numeric baseline. If future scope work needs distance-aware ordering, it should use the world-domain numeric selectors instead of extending the house metadata heuristic.

### 6. Reporting and UI can show topology, but not scope rationale

The bounded snapshot already exposes `world_topology_view`, and the topology debug panel already renders raw distances and the active far threshold. What is still missing is a joined rationale surface explaining why a given house was:

- in Tier0
- in Tier1 via kinship
- admitted by a later cap table
- excluded as too far or outside the bounded scope

That gap belongs to the later debug-output task rather than this audit.

## Recommended insertion points

### Lane-owned selector work for `V03-R2-002-T02` and `V03-R2-002-T03`

The next world-lane tasks should build on the selector contract that already exists in `src/sim/domains/world/**` instead of inventing a new public API. The raw inputs are already sufficient:

- `getTerritorialAdjacency(...)`
- `getRouteAdjacency(...)`
- `getNumericDistanceMetrics(...)`
- `getTravelCostDistance(...)`
- `getRouteHopDistance(...)`
- `getFarThreshold(...)`
- `classifyTravelDistance(...)`

The likely world-domain addition is a deterministic scope-cap helper or fixture-backed contract that accepts stable manor inputs and returns ordered, reviewable cap decisions without mutating non-world state.

### First downstream consumer: `src/sim/tiers.ts`

`computeTierSets(...)` is the first live runtime insertion point because it already owns the broad Tier0/Tier1 bounded scope decision. Once a world-domain cap helper exists, this is the clearest place to replace the current lexicographic Tier1 fill with topology-driven ordering while preserving deterministic caps.

### Kinship-preserving consumer: `src/sim/domains/people/knownHouseRelevance.ts`

Known-house relevance is the place where the scope-lock rule is enforced most directly today. Follow-on work should preserve the explicit kinship reasons already recorded there. In practical terms:

- kinship should remain an auditable inclusion reason
- topology should supply ordering and capping signals
- later work should not silently discard kinship rationale behind an opaque distance-only rule

### Downstream consumer of the bounded house scope: `src/sim/domains/people/marriage.ts`

`buildMarriageWindow(...)` is already structured to consume a bounded `house_ids` scope. That means the marriage path should not need its own separate topology policy. Once Tier1 and relevance scope become topology-aware, the marriage window will inherit that bounded scope through the existing selector path.

### Debug-output seam: reporting and UI surfaces

`src/sim/domains/experience/reporting.ts` and the topology debug panel already expose the bounded topology view. Once cap behavior changes, those surfaces are the right place to show:

- the anchor manor or house used for the distance query
- the raw numeric distance
- the near/far band
- the applied cap bucket or exclusion reason

That should happen in the later debug task rather than inside the cap-table implementation itself.

## Audit conclusion

The repo is ready for topology-driven scope work, but that work has not started yet in the current relevance and tier callers.

What is already true:

- the canonical world selector contract exists and is frozen against the merged XMAP bundle
- raw numeric distance and near/far classification are stable and test-covered
- current Tier1 and known-house relevance rules are deterministic
- current kinship promotion behavior matches the scope-lock baseline

What is still missing:

- a deterministic tier-scope cap table
- any runtime caller that reads the world-domain selectors when building Tier1 scope
- topology-driven ordering in place of the current lexicographic fill
- joined debug outputs that explain scope rationale per house

The safest follow-on path is:

1. add the deterministic cap helper inside `src/sim/domains/world/**`
2. bind that helper into `computeTierSets(...)`
3. preserve kinship rationale in known-house relevance while using topology for ordering and caps
4. surface the resulting rationale in bounded reporting and UI debug views

No new cross-domain public API is required to begin that work. The merged world-domain selectors already provide the necessary baseline.
