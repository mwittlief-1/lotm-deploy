# v0.3.6 UAT Scenario Pack (Trust And Legibility)

## Quick Run

```
node --import tsx ./scripts/uatScenarioGate.ts
```

Optional: run a single deterministic smoke scenario by id.

```
node --import tsx ./scripts/uatScenarioGate.ts --scenario=uat_arrears_enforcement
```

Optional: run a single closure case by preset id.

```
node --import tsx ./scripts/uatScenarioGate.ts --preset=uat_arrears_enforcement
```

Filtered `--preset` or `--scenario` reruns still write release-scoped artifacts under `qa_artifacts/playtest_ops/v0.3.5/` so the canonical full checklist at `qa_artifacts/playtest_ops/uat_scenario_gate.json` stays intact for downstream preset manifests.

Scenario source: `qa_artifacts/playtest_ops/uat_scenarios_v0.3.json`
Gate artifact: `qa_artifacts/playtest_ops/uat_scenario_gate.json`
Story fixture pack: `qa_artifacts/playtest_ops/v0.3.6/story_uat_fixture_pack.json`

## How To Read This Pack

- The deterministic smoke rail still proves short-run UAT triggers.
- The v0.3.6 pass adds a story checklist centered on the explanation and provenance surfaces: `Turn Report`, `Diff Ledger`, `Manor State`, `Explain Changes`, `Obligations`, `New Run`, and `Run Log`.
- The canonical gate now records both the automated scenario outcomes and the manual story checklist so reviewers can stay on one accepted release stamp.

## Automated Smoke Scenarios

### Arrears + enforcement visibility

- Preset: `uat_arrears_enforcement`
- Scenario: `uat_arrears_enforcement`
- Seed: `lotm_v026_seed_003_market_tight`
- Policy: `builder-forward`
- Turns: `3`
- Expectation: arrears enforcement becomes visible by turn 3.
- Why it stays: this remains the short deterministic rail for obligations consequences while the broader explanation-story review is still manual.

### Grant prospect visibility

- Preset: `uat_grant_visibility`
- Scenario: `uat_grant_visibility`
- Seed: `lotm_v026_seed_003_market_tight`
- Policy: `builder-forward`
- Turns: `4`
- Expectation: a grant prospect appears by turn 4.
- Why it stays: this still guards a live social surface while the v0.3.6 review shifts toward trust and legibility.

### Hunting/meat proxy

- Preset: `uat_hunting_proxy`
- Scenario: `uat_meat_hunting_proxy`
- Seed: `lotm_v026_seed_001_baseline`
- Policy: `prudent-builder`
- Turns: `2`
- Turn-0 override: `41 farmers`, `0 builders`
- Expectation: deterministic hunting yield proxy is `>= 1`.
- Why it stays: meat is still partially placeholder-shaped, so the proxy remains the deterministic fallback until the live resource story is complete.

## Story Checklist

### Food reconciliation

- Stories: `US-01`, `US-04`, `US-05`
- Surfaces: `Turn Report`, `Explain Changes`, `Food & Stores`
- Fixture cue rail: `ledger_explain_changes_story` in `qa_artifacts/playtest_ops/v0.3.6/story_uat_fixture_pack.json`
- Acceptance focus: the headline summary and ordered walkdown should reconcile starting stores, production, deductions, and ending stores without raw receipt spelunking.

### Coin reconciliation

- Stories: `US-02`, `US-04`, `US-05`, `US-32`
- Surfaces: `Turn Report`, `Explain Changes`, `Coin & Dues`
- Fixture cue rail: `ledger_explain_changes_story`
- Acceptance focus: coin should show visible inflows and outflows, including upkeep and dues, even when the net change is zero.

### Unrest causal walkdown

- Stories: `US-03`, `US-09`
- Surfaces: `Manor State`, `Explain Changes`, `Unrest & Stability`
- Fixture cue rail: `ledger_explain_changes_story`
- Acceptance focus: arrears, events, and easing effects should appear as readable named causes, and the net should match the headline delta.

### Obligations timing and payment truth

- Stories: `US-06`, `US-07`, `US-08`, `US-10`
- Surfaces: `Obligations`, `Turn Report`, `Coin & Dues`, `Council Agenda`
- Fixture cue rail: `obligations_split_payment_story`
- Acceptance focus: liege and church obligations stay separated; current dues, arrears carried in, paid this turn, and unpaid carry remain distinct.

### Project completion evidence

- Stories: `US-32`, `US-35`
- Surfaces: `Manor State`, `Explain Changes`, `Construction`
- Acceptance focus: completed projects leave visible before and after evidence plus ongoing cost and effect lines.

### Relationship delta trust

- Stories: `US-38`, `US-39`, `US-40`
- Surfaces: `Diff Ledger`, `Explain Changes`, `House Dossier`, `Person Card`
- Acceptance focus: turn movement is separated from absolute standing and tied to named causes rather than repeated totals.

### Provenance parity

- Story: `US-45`
- Surfaces: `New Run`, `Run Log`, `Run summary export`, `docs/BUILD_INFO.json`
- Acceptance focus: the same build and version identity appears in the UI and exported artifacts, with mismatches shown explicitly instead of silently drifting.

## Notes

- Manual review should still start from the New Run preset selector, not from raw scenario ids.
- `qa_artifacts/playtest_ops/uat_scenario_gate.json` now includes both `closure_checklist[]` and `story_checklist[]`.
- The v0.3.5 preset pack remains the stable preset-id map, while the active packet and provenance rails now use the v0.3.6 release stamp.
- Turn numbers above are 1-based.
- If hunting or meat becomes a surfaced runtime output later, replace the proxy check with a direct assertion on meat stores or production receipts and refresh the story fixture pack.
