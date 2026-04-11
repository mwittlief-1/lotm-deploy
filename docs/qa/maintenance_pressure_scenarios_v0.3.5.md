# v0.3.5 Maintenance Pressure Scenarios

## Purpose

`qa_artifacts/economy_balance/v0.3.5/maintenance_pressure_scenarios.json` is the deterministic comparison pack for `V03-R5-006-T05`.

It does three things:

- freezes maintenance-pressure comparison scenarios on top of the landed helper and integrator wiring
- keeps maintenance drag comparable across rights-only, full-holdings, delegated-relief, and low-capacity cases
- provides one artifact surface for later KPI bands and runaway detectors

## Scope

This pack is tooling-only. It does not change maintenance semantics, orchestration order, or UI behavior.

The scenarios read the landed maintenance contracts:

- `src/sim/domains/economy/maintenance.ts`
- `src/sim/domains/court/maintenance.ts`
- `src/sim/turn.ts`

The scenario builder derives labor-pressure inputs from the real economy maintenance registry, then attaches the helper-facing `maintenance_registry_v1` rows to scenario states so the current drag seam can be compared deterministically.

## Scenarios

The current pack freezes four stable scenarios:

1. `rights_only_builder_capacity`
2. `full_holdings_builder_capacity`
3. `full_holdings_delegated_relief`
4. `full_holdings_low_capacity_overflow`

Together they cover:

- rights-only versus full-holdings pressure
- delegated relief against the same holdings set
- low-capacity overflow with unmet maintenance labor

## Comparison fields

Each scenario records:

- planned population, farmers, and builders
- maintenance registry totals and entry ids
- helper pressure outputs such as `applied_drag`, `effective_farmers`, `effective_builders`, and `unmet_labor`
- preview maintenance note lines
- resolved maintenance note lines
- deltas versus a matched control preview with the same seed and holdings but no attached labor-pressure registry

That control delta is the reviewable answer to “how much did maintenance drag change this run?”

## Regeneration

```
node node_modules/tsx/dist/cli.mjs scripts/maintenancePressureScenarios.ts
```

Focused verification:

```
npx vitest run tests/sim/maintenance_pressure_scenarios.test.ts tests/sim/maintenance_labor_helper.test.ts tests/sim/maintenance_labor_wiring.test.ts
```

## Downstream use

This artifact is intended to feed later balance and stability work without creating another control plane.

- KPI-band work can attach numeric thresholds to these scenario ids.
- Runaway-detector work can compare future results against the frozen deltas and pressure totals here.
- Final preset lock work can reference these scenarios when a preset needs explicit maintenance-pressure coverage.
