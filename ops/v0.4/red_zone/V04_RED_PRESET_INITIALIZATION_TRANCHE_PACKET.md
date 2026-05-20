# V04 Red-Zone Packet: Runtime Preset Initialization Tranche

Date: 2026-05-20
Status: `RED_ZONE_OVERRIDE_REQUIRED`
Related standing deferral: `V03-R5-009-T02`

## Proposed Scope

Authorize one narrow runtime preset initialization tranche for new runs. Scope must be limited to applying an explicitly named preset contract during run creation while preserving deterministic generated state.

## Allowed Files

To be finalized by Engineering packet, likely limited to:

- preset contract/application seam;
- generated-run initialization tests;
- replay/preflight evidence artifacts;
- docs/evidence packet updates.

## Forbidden Files

- `ops/v0.3/backlog.yaml`
- live maintenance Coin/Labor;
- obligation collector rebasing;
- Food mutation;
- A/R/T mutation;
- Local Matters live mutation;
- production UI integration unless separately named;
- broad generated state/schema migration;
- fixtures, goldens, baselines unless separately approved.

## Write APIs Required

- Deterministic preset application API.
- Generated run state initialization seam.
- Provenance record for preset id and applied fields.
- No runtime post-start mutation masquerading as initialization.

## Receipt / Provenance Requirements

Preset application must record:

- preset id and version;
- fields applied;
- fields explicitly not applied;
- seed and run context;
- generated-state fingerprint before/after where feasible;
- player/debug visibility boundary.

## Deterministic Tests Required

- Same preset and seed produce identical generated state.
- No preset yields current default behavior.
- Preset application does not mutate Reference World.
- Replay/preflight stays stable or drift is explained.
- Preset provenance is inspectable in QA evidence.

## Baseline / Golden Policy

No baseline, golden, fixture, or schema update is authorized unless CPO/CEO names the exact file set. Preset output drift must be explained by field and seed.

## Rollback / Stop Conditions

Stop if implementation requires:

- reference-world mutation;
- runtime state mutation after initialization;
- broad schema promotion;
- baseline/golden/fixture update;
- UI integration not named in approval;
- economy/maintenance/obligation mechanics changes.

## Acceptance Evidence

- Changed files.
- Preset contract.
- Deterministic same-seed proof.
- No-preset non-perturbation proof.
- Provenance sample.
- Stop-rule checklist.

## Exact CPO/CEO Approval Text

`AUTHORIZE_V0_4_NARROW_RUNTIME_PRESET_INITIALIZATION_TRANCHE`

Authorize one narrow runtime preset initialization tranche for new runs. Preserve deterministic generation, record preset provenance, do not mutate Reference World, do not update schemas/fixtures/goldens/baselines unless separately named, and do not reopen live maintenance, obligation rebasing, Food, A/R/T, Local Matters, UI, turn/phase, or backlog graph work.

## Safe Substitute If Not Approved

Continue preset contract documentation, non-mutating scenario planning, and UAT material preparation without runtime application.

## Safe Parallel Work While Waiting

- V04-QA-001 UAT scripts.
- V04-QA-003 evidence bundle template.
- V04-TOOL-001 source-status hygiene.
- V04-HOUSE-005 hidden substrate provenance contract.
