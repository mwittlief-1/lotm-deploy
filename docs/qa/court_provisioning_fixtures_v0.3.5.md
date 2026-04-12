# v0.3.5 Court Provisioning Fixtures

## Scope

`V03-R5-007-T04` locks the read-only court provisioning flow with deterministic fixtures and a reviewable UAT pack, while staying inside tooling-owned paths.

- compact fixture: `tests/fixtures/court_provisioning_snapshot_v0.3.5.json`
- guard test: `tests/ui/courtProvisioningFixtures.test.tsx`
- UAT artifact: `qa_artifacts/playtest_ops/v0.3.5/court_provisioning_uat_pack.json`

## Fixture cases

The checked-in fixture freezes four deterministic review cases:

- `baseline_shortfall`
- `carry_forward_overrides`
- `stipend_receipt_modes`
- `debug_registry_order`

Together they preserve:

- player-tab ration allocation and undernourishment cues
- carry-forward override labels on stable person ids
- stipend receipt mode visibility without adding UI write paths
- debug-row ordering for provisioning schema, allocation order, and stipend keys

## UAT pack intent

The UAT artifact is a review packet, not a second runtime harness or init path.

- baseline shortfall keeps the player tab on the accepted ration table and placeholder stipend mode
- carry-forward overrides focus the steward row so prior-turn defaults stay visible
- stipend receipt modes surface the receipt-backed entries and the shortfall math without inventing a new control plane
- debug registry order keeps the debug tab anchored to deterministic field order and stable row keys

## Verification

1. `npx vitest run tests/ui/courtProvisioningFixtures.test.tsx tests/ui/courtProvisioningPanel.test.tsx tests/ui/courtProvisioningView.test.ts tests/ui/decisionsPanelCourtBudget.test.tsx tests/sim/court_provisioning_registry.test.ts tests/sim/court_provisioning_fiscal.test.ts`
2. `npm run qa`
3. `npm run preflight`
4. `npm run seed:replay:batch` twice and compare the `summary_hash`
