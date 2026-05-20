# PTL V04-LOCAL-LIVE-001 Revision 003 Acceptance

Date: 2026-05-20
Run timestamp: 2026-05-20T18:29:12-0400
Status: `ACCEPT_REVISION_003_LOCAL_MATTERS_FIRST_ROW_WITH_PREFLIGHT_OWNER_DISPOSITION`
Review packet: `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET_REVISION_003_2026-05-20.md`

## Disposition

PTL accepts `V04-LOCAL-LIVE-001` Revision 003 for the selected first Local Matters live row only:

- `evt_tool_breakage` / Tool Breakage
- Canonical planning name: Manor Worksite Accident
- Visibility class: `automatic_but_visible`
- Accepted effect class: `existing_event_ledger_coin_delta`

This acceptance supersedes the earlier preflight-red return for the current Revision 003 packet because Engineering supplied the missing owner disposition for the preflight mismatch, explicitly treated `src/sim/phases/phase_events.ts` as tranche-owned for the narrow receipt-context bridge, added focused `applyEventsPhase` coverage, and PTL reran final validation.

This is not a general v0.4 runtime approval. It does not approve a second Local Matters row, broad event activation/deactivation, UI integration, schema changes, fixture/golden/baseline updates, active v0.3 backlog mutation, broad `src/sim/turn.ts` changes, phase-order rewiring, Food/Labor/Condition/Order/A/R/T mutation, live maintenance Coin/Labor, obligation collector rebasing, marriage, succession, claims, regency, justice, coercion, or promotion of the full legacy 62-event deck.

## Scope Accepted

Accepted tranche-owned files:

- `src/content/events.ts`
- `src/sim/phases/phase_events.ts`
- `src/sim/domains/experience/localMatters.ts`
- `tests/sim/local_matters_live_tranche.test.ts`
- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md`
- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET_REVISION_002_2026-05-20.md`
- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET_REVISION_003_2026-05-20.md`

The accepted implementation is limited to:

- one SP-017-backed Local Matters row;
- a v0.4 Local Matters guard/evidence module;
- an authorization assertion before the existing selected-row event coin effect;
- a transient event receipt context around event phase application;
- receipt/provenance evidence for the selected row's existing ledger-backed coin delta;
- focused deterministic tests, including the real `applyEventsPhase` path.

## Findings

1. `ACCEPTED WITH CAVEAT`: preflight is still red, but PTL accepts Engineering's owner disposition for this tranche.
   - PTL rerun artifact: `qa_artifacts/v0.3.6_preflight.json`
   - State: `ok: false`, `passed: 2`, `failed: 1`, `tests_run: 3`
   - Failed gate: `non_perturbation_golden_seeds_no_accepts`
   - Mismatch count: `16`
   - Leading field counts: `manor.coin: 16`, `manor.bushels_stored: 11`, `manor.farmers: 7`, `manor.unrest: 6`, `manor.builders: 5`
   - PTL interpretation: this remains broader dirty-checkout/baseline drift, not accepted baseline drift and not blocking the narrow receipt/provenance tranche.

2. `RESOLVED`: `src/sim/phases/phase_events.ts` is now explicitly in tranche scope for one narrow bridge.
   - The bridge sets `_active_event_receipt_context_v1` around `chosen.def.apply(...)` and restores or deletes it in `finally`.
   - PTL does not treat this as phase-order rewiring or broad turn wiring.

3. `RESOLVED`: focused phase-path coverage now exists.
   - `tests/sim/local_matters_live_tranche.test.ts` includes `routes the selected row through applyEventsPhase receipt context`.
   - The test verifies selected-row receipt context, cleanup of the transient flag, and no blocked Food/Order/Labor/Condition/A/R/T-style side effects.

4. `RISK PRESERVED`: the surrounding checkout remains heavily dirty and includes forbidden or unaccepted paths.
   - Current status count during PTL review: `1117` rows.
   - Dirty paths include `ops/v0.3/backlog.yaml`, `ops/v0.3/progress/latest.yaml`, `docs/schemas/**`, `tests/fixtures/**`, broad runtime/source files, broad UI files, and QA artifacts.
   - None of those surrounding changes are accepted by this disposition.

## PTL Validation

PTL reran:

- `npm run test -- tests/sim/local_matters_live_tranche.test.ts --run` - pass; 1 file, 5 tests.
- `npm run ops:v0.3:validate -- --json` - pass; one informational epic warning.
- `npm run canon:validate:all` - pass; 0 warnings, 0 failures.
- `npm run seed:replay:batch -- --limit=2 --outdir=/private/tmp/v04_ptl_20260520T1809_seed_replay_run1` - pass; soft-time warnings persisted.
- `npm run seed:replay:batch -- --limit=2 --outdir=/private/tmp/v04_ptl_20260520T1809_seed_replay_run2` - pass; soft-time warnings persisted.
- Normalized limited replay summary comparison - pass after ignoring output-directory-specific fields, summary hash, artifact paths, and time/duration fields.
- `npm run preflight` - fail; `test3_mismatches=16`, `passed 2/3`.

The soft-time replay warnings remain carried-forward v0.3 performance/reliability debt.

## Baseline / Golden / Fixture / Schema Disposition

No baseline, golden, fixture, or schema update is authorized.

`qa_artifacts/v0.3.6_preflight.json` was refreshed by PTL's rerun and remains red evidence only. It is not source truth and does not authorize baseline acceptance.

## CPO/CEO Escalation

No new CPO/CEO escalation is required.

Current CPO/CEO authority already allows the narrow Local Matters first live mutation tranche. Revision 003 does not request or perform a new red-zone override beyond that authorization.

Open GitHub blockers remain:

- Issue #23 guided tester boundary.
- Issue #26 actor accounting and fiscal bridge.
- Issue #27 hidden seed and fiscal/labor visibility.

## Next Safe Engineering Action

Do not implement a second Local Matters row without a new PTL dispatch.

The next safe action is either:

- wait for PTL to dispatch the next single-row Local Matters tranche with explicit response/effect boundaries; or
- run a separate cleanup/baseline-drift owner lane to reduce the dirty checkout and preflight mismatch evidence.

Any next row must keep Order, A/R/T, claims, justice, Food, Coin, Labor, Condition, UI, fixture/golden/baseline, schema, and turn/phase expansion inside its own explicit dispatch boundaries.
