# First Promotion Tranche Recommendation

Date: 2026-05-27
Status: recommendation only
Scope: first safe promotion sequence for the blessed-spine overhaul

## Boundary

This document recommends the first promotion tranche. It does not promote files, copy files, create a worktree, stage, commit, delete, restore, update schemas, update fixtures, update baselines, deploy, or authorize runtime behavior.

## Promotion Principle

The first tranche should make future work safer without pulling old runtime assumptions into the new spine. That means promoting authority and verification scaffolding before gameplay code.

## Recommended Tranche 0: Canon And Control Preservation

Purpose: preserve the rules of the overhaul before touching runtime.

Candidate paths:

```text
SOURCE_STATUS_INDEX.md
AGENTS.md
docs/DUPLICATE_DOCS_STATUS.md
docs/product/**
docs/architecture/**
ops/v0.3/CODEX_CANON_HANDOFF_README.md
ops/v0.3/STOP_RULES.md
ops/v0.3/DECISION_AUTHORITY_MATRIX.md
ops/v0.3/CODEX_AUTONOMY_LADDER.md
ops/v0.3/second_pass_contracts/**
ops/v0.3/catalog_disposition/**
ops/v0.4/control/state.yaml
ops/v0.4/control/README.md
ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md
ops/v0.4/V04_SYSTEMS_INVENTORY_AND_5R_DISPOSITION_001.md
ops/v0.4/V04_SOURCE_TRUTH_QUARANTINE_PLAN_001.md
ops/v0.4/V04-BLESSED-SPINE-PROMOTION-PLAN-001.md
ops/v0.4/blessed_spine/**
```

Promotion request:

- Promote as `CanonControl`.
- Preserve as the operating authority for cleanup and future promotion.
- Do not treat these files as runtime authorization.

Required checks:

- Confirm no numbered duplicates are included.
- Confirm no `qa_artifacts/**` or review packet zips are included.
- Confirm active canon/control docs are not replaced by stale release docs.
- Confirm any copied control files are unsuffixed canonical paths.

Explicit exclusions:

```text
src/**
tests/**
qa_artifacts/**
review_packets/**
_archive/**
docs/qa/**
docs/releases/**
docs/ux/**
docs/schemas/**
```

## Recommended Tranche 1: Fixed Reference-World Artifact Verification

Purpose: verify the leading fixed XMAP alpha artifact candidate before any runtime rebuild depends on it.

Candidate data paths:

```text
data/map/xmap_alpha_v1/xmap_alpha_manifest_v1.json
data/map/xmap_alpha_v1/manor_units_v1.json
data/map/xmap_alpha_v1/holding_fabric_v1.json
data/map/xmap_alpha_v1/world_topology_v1.json
data/map/xmap_alpha_v1/map_view_support_v1.json
data/map/xmap_alpha_v1/corridor_graph_v1.json
data/map/xmap_alpha_v1/hex_economic_profile_v1.json
data/map/xmap_alpha_v1/settlement_scaffold_v1.json
```

Candidate code paths, only after dependency scan:

```text
src/sim/domains/world/types.ts
src/sim/domains/world/xmapImport.ts
src/sim/domains/world/xmapIndex.ts
src/sim/domains/world/xmapValidation.ts
src/sim/domains/world/xmapTopology.ts
src/sim/domains/world/worldTopologyInvariants.ts
src/sim/domains/world/xmapManorDetail.ts
src/sim/domains/world/xmapMapView.ts
src/sim/domains/world/xmapScope.ts
```

Promotion request:

- First verify artifacts as `ReferenceWorld` candidates.
- Do not claim generator reproducibility.
- Do not claim generator implementation promotion.
- Do not wire artifacts into old runtime or UI.

Required checks:

- File hash manifest.
- Schema/version check.
- Manor/holding/topology count report.
- Deterministic sorted report output.
- Forbidden import scan for candidate code.
- No dependency on old `turn.ts`, old `App.tsx`, old `src/content/events.ts`, or legacy `RunState.manor` authority.

Explicit exclusions:

```text
src/sim/turn.ts
src/App.tsx
src/ui/**
src/content/events.ts
tests/fixtures/**
qa_artifacts/**
review_packets/**
```

## Recommended Tranche 2: Pure Reference-World Reader And Validator Candidates

Purpose: promote only pure import, validation, indexing, and report helpers after Tranche 1 proves the artifact boundary.

Allowed candidate qualities:

- read-only;
- deterministic;
- no runtime mutation;
- no UI import;
- no old turn import;
- no proof artifact import;
- no legacy manor authority;
- stable sorted output.

Do not promote broad `worldgen.ts` wholesale in this tranche. Treat generated houses/people/worldgen as a later `GeneratedRunState` tranche with its own contract.

## What Must Wait

Do not include these in the first promotion tranche:

| Area | Reason |
|---|---|
| Old `src/sim/turn.ts` | It is the legacy source-truth concentrator. |
| Old `src/App.tsx` and PlayScreen flow | UI is coupled to legacy runtime and command paths. |
| Legacy event deck | Evidence/catalog disposition conflicts remain. |
| Live economy/resource code | Needs command/overlay/account boundary first. |
| A/R/T, lifecycle, marriage, succession | Blocked or candidate-only until explicit contracts exist. |
| Fixtures/goldens/baselines | Old tests may protect legacy truth. |
| Review packets and QA artifacts | Evidence only. |

## Acceptance Standard

The first promotion tranche succeeds if:

- active authority docs are preserved;
- the blessed-spine promotion policy is present;
- no runtime files are accidentally blessed;
- fixed reference-world artifacts have an auditable verification plan;
- candidate source files have forbidden dependency scans;
- subsequent agents can tell candidate, evidence, quarantine, and blessed material apart.

## Recommended Next Dispatch

`BS-PROMOTE-000-CANON-CONTROL-PRESERVATION`

Allowed write scope:

```text
ops/v0.4/blessed_spine/**
```

Optional later write scope after approval:

```text
ops/v0.4/blessed_spine/source_status.yaml
```

Forbidden:

```text
src/**
tests/**
qa_artifacts/**
review_packets/**
_archive/**
docs/schemas/**
goldens/baselines
deployment
```

