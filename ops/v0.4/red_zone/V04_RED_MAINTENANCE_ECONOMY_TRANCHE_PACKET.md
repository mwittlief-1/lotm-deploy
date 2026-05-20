# V04 Red-Zone Packet: Maintenance / Economy Tranche

Date: 2026-05-20
Status: `RED_ZONE_OVERRIDE_REQUIRED`
Related standing deferral: `V03-R5-006-T02`

## Proposed Scope

Authorize one narrow live recurring maintenance tranche for estate Condition pressure with explicit Coin/Labor receipt semantics. This would reopen only the named maintenance mechanics boundary, not broad economy rebalance.

## Allowed Files

To be finalized by Engineering packet, likely limited to:

- maintenance/economy domain seam files;
- receipt/provenance helpers for maintenance;
- focused deterministic maintenance tests;
- QA evidence artifacts for the packet.

## Forbidden Files

- `ops/v0.3/backlog.yaml`
- runtime preset initialization;
- obligation collector rebasing;
- Food mutation unless separately approved;
- A/R/T mutation;
- production UI integration;
- turn/phase wiring beyond a named maintenance call site;
- schemas, fixtures, goldens, baselines unless separately approved.

## Write APIs Required

- Coin ledger debit API, if Coin changes are approved.
- Labor/Condition write API, if those changes are approved.
- Maintenance receipt writer.
- Deterministic ordering/id helper.

No direct ad hoc resource mutation is allowed.

## Receipt / Provenance Requirements

Every maintenance effect must state:

- affected estate/improvement;
- source rule;
- Coin effect;
- Labor effect;
- Condition effect;
- skipped/blocked effects;
- receipt id and turn context.

## Deterministic Tests Required

- Same seed and inputs produce same maintenance effects.
- Maintenance cannot spend below allowed bounds without explicit failure receipt.
- No unrelated Food, obligation, A/R/T, Local Matters, marriage, claims, or UI state changes.
- Replay/preflight remains stable or drift is row-explained.

## Baseline / Golden Policy

No baseline, golden, fixture, or schema update is authorized unless explicitly named by CPO/CEO. Maintenance balance drift cannot be hidden behind snapshot replacement.

## Rollback / Stop Conditions

Stop if implementation requires:

- broad economy rebalance;
- direct Coin mutation outside ledger API;
- unreceipted Labor/Condition changes;
- turn-pipeline rewiring;
- fixture/golden/baseline changes;
- runtime preset or obligation rebasing changes.

## Acceptance Evidence

- Changed files and allowed-path proof.
- Maintenance scenario matrix.
- Receipt examples.
- Focused deterministic tests.
- Ops/canon validation where appropriate.
- Replay or preflight evidence when feasible.

## Exact CPO/CEO Approval Text

`AUTHORIZE_V0_4_NARROW_LIVE_MAINTENANCE_COIN_LABOR_TRANCHE`

Authorize one narrow live recurring maintenance tranche for estate Condition pressure with explicit Coin/Labor receipt semantics. Do not authorize Food mutation, runtime preset initialization, obligation collector rebasing, A/R/T mutation, production UI integration, schema/fixture/golden/baseline updates, broad turn/phase wiring, or broad backlog graph edits.

## Safe Substitute If Not Approved

Continue maintenance mechanics spec, obligation catalog completion, KPI/cost-feel band planning, and non-mutating maintenance proof scenarios.

## Safe Parallel Work While Waiting

- V04-EST-001 obligation catalog completion.
- V04-QA-004 KPI/cost-feel band manifest.
- V04-QA-002 soft-time debt tracking.
- V04-TOOL-001 source-status hygiene.
