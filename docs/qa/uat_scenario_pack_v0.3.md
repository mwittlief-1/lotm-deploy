# v0.3 UAT Scenario Pack (Preset-Driven Closure)

## Quick Run

```
node --import tsx ./scripts/uatScenarioGate.ts
```

Optional: run a single scenario by id.

```
node --import tsx ./scripts/uatScenarioGate.ts --scenario=uat_arrears_enforcement
```

Optional: run a single closure case by preset id.

```
node --import tsx ./scripts/uatScenarioGate.ts --preset=uat_arrears_enforcement
```

Filtered `--preset` or `--scenario` reruns now write release-scoped artifacts under `qa_artifacts/playtest_ops/v0.3.5/` so the canonical full checklist at `qa_artifacts/playtest_ops/uat_scenario_gate.json` stays intact for downstream preset manifests.

Scenario pack source: `qa_artifacts/playtest_ops/uat_scenarios_v0.3.json`.

Operator-facing checklist sources:

- preset catalog: `qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json`
- visible cue manifest: `qa_artifacts/playtest_ops/v0.3.5/locked_preset_scenarios.json`
- gate output: `qa_artifacts/playtest_ops/uat_scenario_gate.json`
- v0.3.6 release closeout: `qa_artifacts/playtest_ops/v0.3.6/release_closeout.json`

The scenario pack remains the deterministic execution source. The preset pack is now the canonical closure checklist handle for operators.

## v0.3.6 Closeout Overlay

The v0.3.6 UAT trust-and-legibility release keeps the locked v0.3.5 preset catalog as the run-launch source, then layers the v0.3.6 story evidence on top of it.

- Release closeout doc: `docs/qa/v0.3.6_release_closeout.md`
- Release closeout artifact: `qa_artifacts/playtest_ops/v0.3.6/release_closeout.json`
- Obligations visibility evidence: `docs/qa/obligations_visibility_evidence_pack_v0.3.6.md`
- Obligations visibility artifact: `qa_artifacts/playtest_ops/v0.3.6/obligations_visibility_evidence_pack.json`

Use those v0.3.6 files for final story coverage, gate evidence, and obligation successor/vacancy review. Use the v0.3.5 preset catalog paths above for deterministic New Run preset launch and filtered reruns.

## Preset Checklist Summary

### Arrears + enforcement (visible within 2–3 turns)
- **Preset:** `uat_arrears_enforcement`
- **Scenario:** `uat_arrears_enforcement`
- **Seed:** `lotm_v026_seed_003_market_tight`
- **Policy:** `builder-forward`
- **Turns:** 3
- **Visible expectation:** obligations view shows arrears on the church counterparty and `enforcement_state = "arrears"` by turn 3 (3 turns executed).
- **Fail if:** no counterparty shows arrears + enforcement by turn 3.

### Grant prospect visibility
- **Preset:** `uat_grant_visibility`
- **Scenario:** `uat_grant_visibility`
- **Seed:** `lotm_v026_seed_003_market_tight`
- **Policy:** `builder-forward`
- **Turns:** 4
- **Visible expectation:** a grant prospect appears in the prospects window by turn 4.
- **Fail if:** no grant prospect appears by turn 4.

### Meat/hunting visibility (fallback proxy)
- **Preset:** `uat_hunting_proxy`
- **Scenario:** `uat_meat_hunting_proxy`
- **Seed:** `lotm_v026_seed_001_baseline`
- **Policy:** `prudent-builder`
- **Turns:** 2
- **Decision override:** turn 0 labor override to `farmers=41`, `builders=0` (within labor cap).
- **Visibility status:** fallback.
- **Why fallback:** current runtime outputs do not surface hunting/meat production or meat store deltas; meat stores remain 0 under stock policies.
- **Proxy expectation:** deterministic hunting yield (computed from state) is `>= 1` by turn 2.
- **Fail if:** proxy yield is below threshold.

## Notes

- Manual review should start from the New Run preset selector, not from raw scenario ids. After launch, confirm the run provenance surface still shows the expected preset id and seed.
- `qa_artifacts/playtest_ops/uat_scenario_gate.json` is the full canonical gate artifact and now includes a `closure_checklist[]` section keyed by preset id, with operator-facing surface ids, cue samples, and provenance expectations for each UAT preset.
- Targeted reruns preserve that canonical artifact and instead write filtered reports such as `qa_artifacts/playtest_ops/v0.3.5/uat_scenario_gate__preset_uat_arrears_enforcement.json`.
- Turn numbers above are **1-based** (turn 1 is the first processed turn after run start).
- If hunting/meat becomes a surfaced runtime output later, replace the proxy check with a direct assertion on meat stores or production receipts and update the scenario pack accordingly.
