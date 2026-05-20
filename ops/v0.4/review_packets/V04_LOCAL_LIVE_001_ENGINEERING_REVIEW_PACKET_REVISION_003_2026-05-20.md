# V04-LOCAL-LIVE-001 Engineering Review Packet Revision 003

Date: 2026-05-20
Run timestamp: 2026-05-20T21:50:29Z
Status: `RETURN_FOR_PTL_REVIEW_NO_ACCEPTANCE_CLAIMED`
Controlling dispatch: `ops/v0.4/V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md`
Controlling PTL return: `ops/v0.4/PTL_V04_LOCAL_LIVE_001_PREFLIGHT_RED_RETURN_2026-05-20.md`

## Summary

This packet refreshes the Engineering evidence for `V04-LOCAL-LIVE-001` without implementing a second Local Matters row.

Current implementation remains a single SP-017-backed Local Matters runtime slice:

- `evt_tool_breakage`
- legacy title: `Tool Breakage`
- canonical planning name: `Manor Worksite Accident`
- visibility class: `automatic_but_visible`
- effect class: `existing_event_ledger_coin_delta`

PTL acceptance is not claimed. The existing preflight red artifact remains controlling unless PTL accepts the owner disposition below or assigns a dedicated baseline-drift cleanup lane.

## Files Changed

Runtime/test files in reviewed tranche scope:

- `src/content/events.ts`
- `src/sim/phases/phase_events.ts`
- `src/sim/domains/experience/localMatters.ts`
- `tests/sim/local_matters_live_tranche.test.ts`

v0.4 control/evidence files:

- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md`
- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET_REVISION_002_2026-05-20.md`
- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET_REVISION_003_2026-05-20.md`

This run added only the Revision 003 packet.

## Selected Local Matters Rows

Selected:

- `evt_tool_breakage` / `Tool Breakage` / `Manor Worksite Accident`

Not selected and not activated:

- `evt_boundary_dispute`
- `evt_peasant_petition`
- all other SP-017 candidate rows
- the full legacy 62-event deck

## Implementation Summary

- `src/sim/domains/experience/localMatters.ts` defines the single authorized v0.4 live row, allowed and blocked effect classes, receipt provenance, and evidence builder.
- `src/content/events.ts` gates `evt_tool_breakage` through `assertV04LocalMatterLiveMutationAllowed(...)` before the existing coin delta and emits fiscal receipt context only for authorized v0.4 Local Matters rows.
- `src/sim/phases/phase_events.ts` is treated as tranche-owned for this narrow bridge. It sets `_active_event_receipt_context_v1` around `chosen.def.apply(...)` and restores or deletes the transient flag in `finally`.
- `tests/sim/local_matters_live_tranche.test.ts` includes direct event coverage plus `applyEventsPhase` coverage for the selected row.

Source-truth layer touched:

- existing runtime event definition and phase seam;
- new v0.4 experience-domain guard/evidence module;
- focused deterministic tests;
- v0.4 review evidence docs.

## Receipt And Provenance Evidence

Receipt shape proven by focused tests:

```json
{
  "phase": "events",
  "phase_sequence": 1,
  "category": "event.economic",
  "counterparty_kind": "event",
  "counterparty_id": "event:evt_tool_breakage",
  "counterparty_label": "Tool Breakage",
  "asset": "coin",
  "rule_id": "event.evt_tool_breakage.coin"
}
```

Evidence builder:

- `buildV04LocalMatterReceiptEvidence("evt_tool_breakage", receipts)`
- returns `evidence_status: "receipt_backed"` and `receipt_count: 1` in the focused tests.

Provenance refs recorded by the row:

- `ops/v0.3/catalog_disposition/SP-017_LEGACY_62_EVENT_DISPOSITION.md`
- `ops/v0.4/safe_queue/V04_LOCAL_001_LOCAL_MATTERS_ROW_PACKAGE.md`
- `ops/v0.4/V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md`

## Focused Validation

PASS:

- `npm run test -- tests/sim/local_matters_live_tranche.test.ts --run`
- Result: 1 file, 5 tests passed.

PASS:

- `npm run ops:v0.3:validate -- --json`
- Result: `ok: true`; informational warning only: epics remain informational.

PASS:

- `npm run canon:validate:all`
- Result: `status: pass`; 0 warnings, 0 failures.

## Replay And Preflight

Preflight attempt:

- Command: `npm run preflight`
- Result: inconclusive. The process printed initial baseline setup output, then ended abnormally with code `-1` and no usable completion summary.
- Artifact check after the attempt showed `qa_artifacts/v0.3.6_preflight.json` still had mtime `May 20 15:40` and remained the controlling artifact.

Existing controlling preflight artifact:

- `qa_artifacts/v0.3.6_preflight.json`
- `ok: false`
- `passed: 2`
- `failed: 1`
- `tests_run: 3`
- failed gate: `non_perturbation_golden_seeds_no_accepts`
- mismatch count: `16`
- leading field count: `manor.coin: 16`

Owner disposition:

- The Local Matters implementation adds receipt context and authorization guards around the existing `evt_tool_breakage` coin delta.
- The receipt bridge appends evidence to the existing ledger path; it does not change the coin arithmetic performed by `applyCoinDelta`.
- Focused `applyEventsPhase` coverage confirms the transient receipt context is removed after phase execution and blocked side effects are not applied.
- Engineering therefore continues to owner-disposition the current preflight red as broader dirty-checkout/baseline drift outside this narrow Local Matters receipt/provenance tranche.

Double replay:

- PASS: `npm run seed:replay:batch -- --limit=2 --outdir=/private/tmp/v04_orch_20260520T2145_seed_replay_run1`
- PASS: `npm run seed:replay:batch -- --limit=2 --outdir=/private/tmp/v04_orch_20260520T2145_seed_replay_run2`
- Known soft-time warnings persisted for both seeds and both policies.
- Normalized replay summaries matched after ignoring output-directory-specific fields, hash fields, and time/duration/timestamp fields.

## Baseline, Golden, Fixture, Schema Confirmation

No baseline, golden, fixture, or schema update is requested or claimed.

No authorized edits were made to:

- `docs/schemas/**`
- `tests/fixtures/**`
- goldens or baselines
- `ops/v0.3/backlog.yaml`
- `ops/v0.3/progress/latest.yaml`

## Dirty Checkout Caveat

The surrounding checkout is heavily dirty and unaccepted. This packet claims only the scoped Local Matters tranche files and v0.4 packet docs listed above.

Scoped status for the tranche shows:

- modified `src/content/events.ts`
- modified `src/sim/phases/phase_events.ts`
- untracked `src/sim/domains/experience/localMatters.ts`
- untracked `tests/sim/local_matters_live_tranche.test.ts`
- untracked `ops/v0.4/**`
- untracked `qa_artifacts/v0.3.6_preflight.json`

The untracked preflight artifact is pre-existing evidence from earlier same-day validation and was not updated by this run.

## Stop-Rule Checklist

- No second Local Matters row implemented.
- No guided testers started.
- No broad legacy 62-event promotion.
- No production UI integration.
- No schema, fixture, golden, or baseline update.
- No broad `src/sim/turn.ts` change.
- No phase-order rewiring.
- No runtime preset initialization.
- No live maintenance Coin/Labor implementation.
- No obligation collector rebasing.
- No Food, Labor, Condition, Order, A/R/T, marriage, claims, succession, regency, justice, or coercion mutation.
- `src/sim/phases/phase_events.ts` is explicitly treated as tranche-owned only for the narrow receipt-context bridge.

## Next Safe Engineering Action

PTL should review Revision 003 and either:

- accept the first-row implementation with the preflight owner disposition and phase-path coverage; or
- return the packet to a dedicated cleanup/baseline-drift owner lane.

Do not implement `evt_boundary_dispute`, `evt_peasant_petition`, or any second Local Matters row without a new PTL dispatch.
