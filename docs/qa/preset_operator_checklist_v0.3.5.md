# v0.3.5 Preset Operator Checklist

## Purpose

This note is the operator-facing handoff for `V03-R5-009-T05`.

Use the stable preset ids as the checklist handles for closeout review:

- `uat_arrears_enforcement`
- `uat_grant_visibility`
- `uat_hunting_proxy`

The raw UAT scenario ids remain deterministic execution details, but they are no longer the primary names operators should use in review notes or manual launch instructions.

## Canonical artifacts

- preset catalog: `qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json`
- visible cue manifest: `qa_artifacts/playtest_ops/v0.3.5/locked_preset_scenarios.json`
- gate output: `qa_artifacts/playtest_ops/uat_scenario_gate.json`
- scenario source pack: `qa_artifacts/playtest_ops/uat_scenarios_v0.3.json`

Together these form one preset-driven closure checklist:

- the preset pack owns the stable preset ids
- the locked preset manifest owns the visible-surface cues
- the UAT gate owns the pass or fail result for the executable short-run cases

## Manual review flow

1. Open the New Run UI and select the locked preset by preset id.
2. Launch through the normal preset path only. Do not construct a raw custom-seed init when the goal is preset closeout review.
3. Confirm the run provenance surface shows the expected preset id and seed.
4. Review the live surfaces and cues called out in `locked_preset_scenarios.json`.
5. Run the deterministic gate and compare its `closure_checklist[]` entry for the same preset id.

The full checklist artifact remains `qa_artifacts/playtest_ops/uat_scenario_gate.json`. Targeted `--preset` reruns write release-scoped filtered artifacts under `qa_artifacts/playtest_ops/v0.3.5/` so the canonical closure packet does not get replaced during spot checks.

## Exact commands

Run the full preset-backed UAT gate:

```bash
node node_modules/tsx/dist/cli.mjs scripts/uatScenarioGate.ts
```

Run a single preset-backed closure case:

```bash
node node_modules/tsx/dist/cli.mjs scripts/uatScenarioGate.ts --preset=uat_arrears_enforcement
node node_modules/tsx/dist/cli.mjs scripts/uatScenarioGate.ts --preset=uat_grant_visibility
node node_modules/tsx/dist/cli.mjs scripts/uatScenarioGate.ts --preset=uat_hunting_proxy
```

Refresh the visible-cue manifest after rebuilding upstream preset or gate artifacts:

```bash
node node_modules/tsx/dist/cli.mjs scripts/lockedPresetScenarios.ts
```

## Expected closure surfaces

### `uat_arrears_enforcement`

- provenance: preset id `uat_arrears_enforcement`, seed `lotm_v026_seed_003_market_tight`
- primary visible surface: `obligations_modal`
- locked cue focus: arrears enforcement visible by turn 3

### `uat_grant_visibility`

- provenance: preset id `uat_grant_visibility`, seed `lotm_v026_seed_003_market_tight`
- primary visible surface: `prospects_window`
- locked cue focus: grant prospect visible by turn 4

### `uat_hunting_proxy`

- provenance: preset id `uat_hunting_proxy`, seed `lotm_v026_seed_001_baseline`
- primary visible surface: `hunting_proxy`
- locked cue focus: fallback hunting-yield proxy remains at or above the deterministic threshold

## Operator reminders

- Treat preset ids as the checklist names in tickets, handoffs, and run notes.
- Use the `closure_checklist[]` rows in `qa_artifacts/playtest_ops/uat_scenario_gate.json` when you need the canonical operator summary across all locked presets.
- Use the matching filtered gate artifact after a targeted rerun when you want a one-preset packet without mutating the canonical checklist file.
- If a preset passes the scripted gate but the visible UI cues drift, the locked manifest is the tie-breaker reference for expected surfaces and cue text.
