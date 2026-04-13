# v0.3.5 Locked Preset Scenarios

## Purpose

`qa_artifacts/playtest_ops/v0.3.5/locked_preset_scenarios.json` is the deterministic closure manifest for `V03-R5-009-T03`.

It keeps the preset checklist in one place by combining:

- the stable preset ids from `playability_preset_pack_v1`
- live seed-derived surface cues for court provisioning and outbound marriage
- the already-landed packet, fixture, UAT, and comparison artifacts

The goal is to lock visible review outcomes without adding a second init path or a parallel preset catalog.

## What each scenario row contains

Each scenario row keeps the exact:

- `preset_id`
- `seed`
- `policy_id`
- `turns`
- `acceptance_ids`

On top of that, every preset row now carries two direct live-seed surfaces:

- `court_provisioning_sheet`
- `outbound_marriage_sheet`

Those cues are rebuilt from `createNewRun(seed)` plus the accepted preview seams, so the manifest stays tied to the canonical run initialization path.

## Source-backed review coverage

The manifest then layers in the already-accepted review rails where they apply:

- receipt-bundle packet review expectations for `baseline_low_pressure_prudent`, `arrears_pressure_builder`, `relationship_edges_builder`, and `weather_shortage_builder`
- regression comparison expectations for the prudent stable-clear rail, the single-manor baseline rail, and the long-run dispossession rail
- obligations fixture locks for `arrears_pressure_builder` and `uat_arrears_enforcement`
- court provisioning fixture locks for seeds already covered by the provisioning UAT pack
- UAT gate expectations for `uat_arrears_enforcement`, `uat_grant_visibility`, and `uat_hunting_proxy`

Maintenance remains a shared closure reference source rather than a preset-specific live surface today. The manifest carries the full `maintenance_pressure_scenarios_v1` scenario list as a supporting review rail until later preset-driven upkeep coverage lands.

## Why this does not create a second control plane

This task does not introduce a preset-only initializer, fixture runner, or alternate worldgen path.

- live seed surfaces are derived from `createNewRun(seed)`
- packet, fixture, and UAT expectations are read from checked-in artifacts
- the manifest itself is only a deterministic review contract

That keeps `playability_preset_pack_v1` as the canonical preset map and leaves future preset application on the accepted `applyPlayabilityPreset -> createNewRun` seam.

## Regeneration

```bash
node node_modules/tsx/dist/cli.mjs scripts/lockedPresetScenarios.ts
```

Focused verification:

```bash
npx vitest run tests/ui/lockedPresetScenarios.test.ts tests/ui/outboundMarriageView.test.ts tests/ui/outboundMarriagePanel.test.tsx tests/ui/courtProvisioningFixtures.test.tsx tests/ui/obligationsFixtures.test.tsx tests/ui/playabilityPresetPack.test.ts
```
