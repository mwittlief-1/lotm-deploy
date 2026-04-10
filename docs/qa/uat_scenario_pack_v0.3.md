# v0.3 UAT Scenario Pack (Deterministic)

## Quick Run

```
node --import tsx ./scripts/uatScenarioGate.ts
```

Optional: run a single scenario by id.

```
node --import tsx ./scripts/uatScenarioGate.ts --scenario=uat_arrears_enforcement
```

Scenario pack source: `qa_artifacts/playtest_ops/uat_scenarios_v0.3.json`.

## Scenario Summary

### Arrears + enforcement (visible within 2–3 turns)
- **Scenario:** `uat_arrears_enforcement`
- **Seed:** `lotm_v026_seed_003_market_tight`
- **Policy:** `builder-forward`
- **Turns:** 3
- **Visible expectation:** obligations view shows arrears on the church counterparty and `enforcement_state = "arrears"` by turn 3 (3 turns executed).
- **Fail if:** no counterparty shows arrears + enforcement by turn 3.

### Grant prospect visibility
- **Scenario:** `uat_grant_visibility`
- **Seed:** `lotm_v026_seed_003_market_tight`
- **Policy:** `builder-forward`
- **Turns:** 4
- **Visible expectation:** a grant prospect appears in the prospects window by turn 4.
- **Fail if:** no grant prospect appears by turn 4.

### Meat/hunting visibility (fallback proxy)
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

- Turn numbers above are **1-based** (turn 1 is the first processed turn after run start).
- If hunting/meat becomes a surfaced runtime output later, replace the proxy check with a direct assertion on meat stores or production receipts and update the scenario pack accordingly.
