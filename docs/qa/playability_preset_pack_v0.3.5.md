# v0.3.5 Playability Preset Pack

## Purpose

`qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json` is the canonical v0.3.5 crosswalk between:

- the accepted regression seed pack
- the accepted receipt-bundle seed pack
- the accepted deterministic UAT scenario pack

It exists so later preset UI, fixture, KPI-band, and runaway-detector work can reuse one stable preset id set instead of inventing another control plane.

## Init seam rule

This task does not add live preset application yet. The pack locks the contract for that later seam:

- current mode: `seed_only`
- future adapter: `applyPlayabilityPreset`
- required entrypoint: `createNewRun`

That means later preset work must resolve to one canonical init payload before `createNewRun()` runs worldgen, migrations, or registry wiring. It must not introduce a preset-specific initializer or a second worldgen branch.

## Stable preset ids

The stable v0.3.5 preset ids are:

1. `baseline_low_pressure_prudent`
2. `stable_clear_prudent`
3. `arrears_pressure_builder`
4. `relationship_edges_builder`
5. `weather_shortage_builder`
6. `dispossession_builder`
7. `uat_arrears_enforcement`
8. `uat_grant_visibility`
9. `uat_hunting_proxy`

These ids intentionally drop source-pack suffixes like `_turns_15` when the turn budget is already recorded in the preset payload. Existing source ids remain preserved in `source_refs[]`.

## Source mapping

The pack keeps one stable preset id while preserving the exact upstream source references.

Examples:

- `baseline_low_pressure_prudent` maps to both the receipt-bundle scenario `baseline_low_pressure_prudent` and the regression scenario `single_manor_distribution_baseline`.
- `arrears_pressure_builder` maps to both the receipt-bundle scenario `arrears_pressure_builder` and the regression scenario `arrears_pressure_builder_turns_15`.
- `uat_hunting_proxy` keeps the stable preset id while preserving the current upstream UAT source id `uat_meat_hunting_proxy`.

## Acceptance mapping

Every preset points at stable acceptance ids, not ad hoc notes. The acceptance ids already reserve space for later closure work:

- packet review anchors
- UAT lock checks
- KPI acceptance bands
- runaway detectors

The first detector set deliberately matches the v0.3.5 closure guidance:

- `runaway_coin_runaway`
- `runaway_food_collapse`
- `runaway_arrears_soft`
- `runaway_arrears_hard`
- `runaway_manor_growth_frozen`

Later tasks should attach numeric bands or detector logic to these ids rather than introducing new scenario names.

## Regeneration

```
npm run playability:preset:pack
```

The pack's embedded `qa_flow.commands` also records the expected upstream regeneration order:

1. `npm run qa`
2. `npm run preflight`
3. `npm run seed:replay:batch`
4. rebuild the regression seed pack
5. rebuild the UAT scenario pack
6. rebuild the playability preset pack

## Downstream unlocks

This task is meant to unblock the rest of the tooling/UI preset chain without changing live run initialization yet.

- UI preset-selection shells can consume the stable preset ids and titles directly.
- Later tooling tasks can hang fixtures, replay guards, KPI bands, and runaway detectors off `acceptance_ids[]`.
- Final preset freeze and UAT lockability work can extend the same checked-in manifest instead of creating another preset list.

## Closure Checklist

For `v0.3.5` closeout, the preset pack is now the operator-facing checklist root rather than just a source-mapping helper.

- UAT operators should select and report the three short-run closure cases by preset id: `uat_arrears_enforcement`, `uat_grant_visibility`, and `uat_hunting_proxy`.
- `qa_artifacts/playtest_ops/uat_scenario_gate.json` now records those cases in `closure_checklist[]`, so the gate output can be read as a preset checklist instead of a raw scenario dump.
- Targeted `--preset` reruns write release-scoped filtered gate artifacts under `qa_artifacts/playtest_ops/v0.3.5/` and preserve the canonical checklist file that downstream manifests read.
- `docs/qa/preset_operator_checklist_v0.3.5.md` and `docs/qa/uat_scenario_pack_v0.3.md` should be treated as preset-driven review docs; the raw UAT scenario ids remain execution details for the deterministic pack.
