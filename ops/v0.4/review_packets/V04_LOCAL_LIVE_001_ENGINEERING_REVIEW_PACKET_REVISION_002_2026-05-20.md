# V04-LOCAL-LIVE-001 Engineering Review Packet Revision 002

Date: 2026-05-20
Run timestamp: 2026-05-20T21:39:16Z
Automation: `v0-4-engineering-orchestrator-loop`
Status: `RETURN_FOR_PTL_REVIEW_NO_ACCEPTANCE_MARKED`

## Controlling PTL Return Addressed

Latest PTL response:

- `ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md`
- `ops/v0.4/PTL_V04_LOCAL_LIVE_001_ORCHESTRATOR_STATUS_DISPOSITION_2026-05-20.md`

This revision addresses the specific PTL return items without implementing a second Local Matters row:

- `src/sim/phases/phase_events.ts` is explicitly treated as tranche-owned for the narrow receipt-context bridge.
- Focused `applyEventsPhase` coverage was added for the selected row.
- The red preflight artifact is owner-dispositioned as broader dirty-checkout/baseline drift, not as a Local Matters receipt-path effect.

Engineering does not mark this lane accepted. PTL must accept or return this packet.

## Files Changed

Changed in this run:

- `tests/sim/local_matters_live_tranche.test.ts`
  - Added focused `applyEventsPhase` coverage for `evt_tool_breakage`.
- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET_REVISION_002_2026-05-20.md`
  - New revised PTL-facing review packet.

Tranche-owned implementation files under review:

- `src/content/events.ts`
- `src/sim/phases/phase_events.ts`
- `src/sim/domains/experience/localMatters.ts`
- `tests/sim/local_matters_live_tranche.test.ts`

No other runtime/source/test files were intentionally edited by this run.

## Selected Local Matters Rows

Selected row:

- `evt_tool_breakage` / legacy title `Tool Breakage`
- Canonical planning name: `Manor Worksite Accident`
- Visibility class: `automatic_but_visible`
- Allowed effect class: `existing_event_ledger_coin_delta`

Rows not selected and not implemented:

- `evt_boundary_dispute`
- `evt_peasant_petition`
- all other SP-017 candidate rows

## Implementation Summary

Revision 002 does not add new runtime behavior.

The existing first-row implementation remains:

- `src/sim/domains/experience/localMatters.ts` defines the single authorized v0.4 live row, blocked effect classes, and receipt/provenance evidence builder.
- `src/content/events.ts` asserts the selected row is authorized before the existing `evt_tool_breakage` coin effect and emits a fiscal receipt only when the active event context belongs to an authorized v0.4 Local Matters row.
- `src/sim/phases/phase_events.ts` temporarily sets `_active_event_receipt_context_v1` around `chosen.def.apply(...)` and restores or deletes it in `finally`.

New test coverage added in this run:

- `routes the selected row through applyEventsPhase receipt context`
  - forces all non-selected event rows onto test-only cooldown;
  - uses fixed seed `v04_phase_tool_breakage_4`;
  - exercises the real `applyEventsPhase` path;
  - asserts one `evt_tool_breakage` event result;
  - asserts one event fiscal receipt with `phase: events`, `phase_sequence: 1`, `counterparty_id: event:evt_tool_breakage`, and `rule_id: event.evt_tool_breakage.coin`;
  - asserts the transient `_active_event_receipt_context_v1` flag is removed after phase execution;
  - asserts no blocked side effects to food stores, unrest, population, construction progress, or relationships.

## Source-Truth Layer Touched

Runtime source-truth touched by the implementation remains limited to:

- existing `EVENT_DECK` row for `evt_tool_breakage`;
- existing event phase application seam;
- existing ledger receipt context API;
- new v0.4 Local Matters experience-domain guard/evidence module.

No Reference World, Generated Run State, schema, fixture, golden, active backlog, broad turn pipeline, or UI source-truth layer was intentionally changed.

## Receipt And Provenance Evidence

Expected receipt target:

```json
{
  "receipt_family": "fiscal_receipt_v1",
  "phase": "events",
  "category": "event.economic",
  "counterparty_id": "event:evt_tool_breakage",
  "rule_id": "event.evt_tool_breakage.coin"
}
```

Focused tests now prove both direct event application and live event phase application produce deterministic receipt/provenance evidence for the selected row.

The evidence builder remains:

- `buildV04LocalMatterReceiptEvidence("evt_tool_breakage", receipts)`

Provenance refs:

- `ops/v0.3/catalog_disposition/SP-017_LEGACY_62_EVENT_DISPOSITION.md`
- `ops/v0.4/safe_queue/V04_LOCAL_001_LOCAL_MATTERS_ROW_PACKAGE.md`
- `ops/v0.4/V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md`

## Phase Events Ownership

`src/sim/phases/phase_events.ts` is tranche-owned in this packet for one narrow reason: it supplies the event id/title/category/phase sequence needed for receipt provenance while the selected event row applies its existing coin delta.

The bridge does not change event selection, event count, weights, cooldown order, event text, RNG forks, or phase ordering.

Focused phase-path coverage now verifies:

- receipt context is present during `evt_tool_breakage` application;
- receipt context is not leaked after phase execution;
- selected-row effects remain bounded to the existing coin delta;
- blocked effect classes are not applied.

## Preflight Owner Disposition

Existing artifact:

- `qa_artifacts/v0.3.6_preflight.json`
- started: `2026-05-20T19:27:45.064Z`
- finished: `2026-05-20T19:40:28.880Z`
- `ok: false`
- `tests_run: 3`
- `passed: 2`
- `failed: 1`
- failed gate: `non_perturbation_golden_seeds_no_accepts`
- mismatch count: `16`
- leading field count: `manor.coin: 16`

Owner disposition:

- The red artifact predates this Revision 002 run.
- This run changed only focused test coverage and this review packet.
- The mismatch summary spans broad non-receipt state fields including `manor.coin`, `manor.bushels_stored`, `manor.farmers`, `manor.unrest`, `manor.builders`, `energy.available`, `manor.population`, arrears, and improvements.
- The Local Matters implementation adds receipt context and authorization guards around the existing `evt_tool_breakage` coin delta. The ledger balance path still computes balance from the same `applyCoinDelta` before/after values; receipt context appends evidence but does not change the arithmetic.
- The new `applyEventsPhase` test confirms the phase bridge does not leak state and does not apply blocked side effects.

Engineering therefore owner-dispositions the current preflight red as broader dirty-checkout/baseline drift outside this narrow Local Matters receipt/provenance tranche. This packet does not request baseline, golden, or fixture acceptance.

Preflight was not rerun in this pass because recent PTL/orchestrator attempts either timed out or produced no usable completion summary, and the existing red artifact remains the relevant evidence until the broader dirty checkout/baseline drift is handled.

## Tests And Validation Results

Passed:

- `npm run test -- tests/sim/local_matters_live_tranche.test.ts --run`
  - 1 file passed
  - 5 tests passed
- `npm run ops:v0.3:validate -- --json`
  - `ok: true`
  - warning: informational epics remain ready
- `npm run canon:validate:all`
  - status: `pass`
  - warnings: `0`
  - failures: `0`
- `npm run seed:replay:batch -- --limit=2 --outdir=/private/tmp/v04_orch_20260520T2130_seed_replay_run1`
  - status: `PASS`
  - soft-time warnings persisted
- `npm run seed:replay:batch -- --limit=2 --outdir=/private/tmp/v04_orch_20260520T2130_seed_replay_run2`
  - status: `PASS`
  - soft-time warnings persisted
- Normalized replay summary comparison:
  - `NORMALIZED_REPLAY_MATCH=true` after ignoring output-directory-specific fields and embedded summary hash fields

Not rerun:

- `npm run preflight`
  - reason: existing same-day red artifact remains controlling; recent PTL/orchestrator attempts timed out or produced no usable completion summary; this run made no runtime behavior change.

## Baseline / Golden / Fixture Confirmation

No baseline, golden, fixture, or schema file was intentionally edited by this run.

The shared checkout already contains unrelated dirty baseline, fixture, and active v0.3 backlog/progress paths. Those are not part of this tranche and are not accepted by this packet.

## Dirty Checkout Caveat

The repository remains broadly dirty. Current `git status --short | wc -l` reported `1117` status rows.

Scoped dirty paths include unrelated forbidden or owner-decision areas such as:

- `ops/v0.3/backlog.yaml`
- `ops/v0.3/progress/latest.yaml`
- `docs/qa/**`
- `tests/fixtures/**`
- `tests/goldenSeeds.test.ts`
- `docs/schemas/**`

This packet accepts none of that surrounding dirty work.

## Stop-Rule Checklist

- No guided testers started.
- No second Local Matters row implemented.
- No broad event deck activation/deactivation introduced.
- No runtime preset initialization touched.
- No active `ops/v0.3/backlog.yaml` or `ops/v0.3/progress/latest.yaml` mutation by this run.
- No `docs/schemas/**`, fixture, golden, or baseline update by this run.
- No broad `src/sim/turn.ts` or phase-order rewiring.
- No Food, Labor, Condition, Order, A/R/T, marriage, claims, succession, regency, justice, coercion, live maintenance Coin/Labor, or obligation collector rebasing implementation.
- No PTL acceptance marked by Engineering.

## Next Safe Engineering Action

PTL should review Revision 002 for acceptance or return.

If PTL accepts the preflight owner disposition and phase-path coverage, the next safe Engineering action remains waiting for a new PTL dispatch before any second Local Matters row.

If PTL does not accept the preflight owner disposition, the next safe action is a dedicated cleanup/baseline-drift owner lane, not a second Local Matters implementation.
