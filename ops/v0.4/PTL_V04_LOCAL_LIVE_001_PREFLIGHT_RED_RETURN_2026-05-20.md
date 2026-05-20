# PTL V04-LOCAL-LIVE-001 Preflight Red Return

Date: 2026-05-20
Run timestamp: 2026-05-20T16:17:48-0400
Status: `RETURN_FOR_REVISION_NO_PTL_ACCEPTANCE_PREFLIGHT_RED`
Review packet: `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md`

## Disposition

PTL does not accept the current `V04-LOCAL-LIVE-001` packet.

The current packet is returned for revision because Engineering now reports final preflight red and does not request acceptance while that red state is unresolved:

- `qa_artifacts/v0.3.6_preflight.json` reports `ok: false`.
- Failed test: `non_perturbation_golden_seeds_no_accepts`.
- Mismatch count: `16`.
- First field counts include `manor.coin: 16`, `manor.bushels_stored: 11`, `manor.farmers: 7`, `manor.unrest: 6`, and `manor.builders: 5`.
- The packet says final double seed replay was not rerun after the final preflight failed.

This disposition supersedes any earlier PTL acceptance language for the current packet state. It does not reject the selected Local Matters row on product grounds; it holds acceptance until the failed preflight is owner-dispositioned or repaired and final validation is rerun.

## Scope Review

Current allowed tranche scope remains:

- one SP-017-backed Local Matters row;
- `evt_tool_breakage` / Tool Breakage / Manor Worksite Accident;
- visibility class `automatic_but_visible`;
- effect class `existing_event_ledger_coin_delta`;
- receipt/provenance-backed evidence only for the selected material coin effect.

The current implementation shape is still inside the Local Matters frontier in principle, but the current checkout cannot be accepted because final gate evidence is red.

## PTL Findings

1. `BLOCKER`: final preflight is red in the packet evidence and artifact.
   - Evidence: `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md`
   - Evidence: `qa_artifacts/v0.3.6_preflight.json`
   - Required action: determine whether the mismatch is caused by this tranche, adjacent pre-existing event receipt plumbing, or unrelated dirty-checkout drift. Provide owner disposition with file/path evidence.

2. `BLOCKER`: final double seed replay was not rerun after the final preflight failure.
   - Evidence: packet section "Replay note".
   - Required action: after preflight is green or explicitly owner-dispositioned, rerun double replay and compare per-run outputs. Do not rely on intermediate-patch replay evidence.

3. `RISK`: current git status still shows a modified `src/sim/phases/phase_events.ts`, while the current packet claims only the v0.4 Local Matters import/assertion in `src/content/events.ts` plus new `localMatters.ts` and tests.
   - `phase_events.ts` may be pre-existing adjacent work, but it is part of the live receipt path because it sets `_active_event_receipt_context_v1`.
   - Required action: either include it in the reviewed tranche scope with focused live phase coverage, or explicitly owner-disposition it as unrelated pre-existing dirty work and show that the selected row remains valid without accepting broader phase changes.

4. `TEST GAP`: focused Local Matters tests manually seed `_active_event_receipt_context_v1` before directly applying event definitions.
   - Evidence: `tests/sim/local_matters_live_tranche.test.ts`.
   - Risk: the test proves the receipt builder and direct event apply path, but not the actual `applyEventsPhase` context wiring.
   - Required action: add or identify a focused test that exercises the selected row through the event phase path, or explain why existing phase-level coverage proves it.

## Validation Rerun By PTL

PTL reran:

- `npm run test -- tests/sim/local_matters_live_tranche.test.ts --run` - pass; 1 file, 4 tests.
- `npm run ops:v0.3:validate -- --json` - pass; one informational epic warning.
- `npm run canon:validate:all` - pass; 0 warnings and 0 failures.
- Two limited seed replay probes with `--limit=1` - both pass; per-run JSON artifacts match; summary hashes differ only because `summary.json` embeds output-directory-specific paths and hash.

PTL attempted `npm run preflight` twice in this pass. Both attempts ended abnormally through the tool session without a usable completion summary. The existing packet artifact remains the controlling preflight evidence and is red.

Soft-time replay warnings persisted and remain carried-forward v0.3 performance/reliability debt.

## Red-Zone And Dirty-Checkout Boundaries

This return does not authorize:

- broad UI integration;
- schema changes;
- fixture, golden, or baseline updates;
- broad `src/sim/turn.ts` or phase-order rewiring;
- active `ops/v0.3/backlog.yaml` or `ops/v0.3/progress/latest.yaml` mutation;
- active backlog behavior mutation beyond the authorized draft protocol;
- live maintenance Coin/Labor;
- runtime preset initialization;
- obligation collector rebasing;
- Food, Labor, Condition, Order, A/R/T, marriage, succession, claims, regency, justice, or coercion mutation;
- promotion of the full legacy 62-event deck.

The surrounding dirty checkout remains unaccepted.

## CPO/CEO Escalation

No new CPO/CEO escalation is required for this return.

Current CPO/CEO authority already allows the narrow Local Matters first tranche. The issue is validation and ownership, not a request for new red-zone authority.

Open GitHub blockers remain:

- Issue #23 guided tester boundary.
- Issue #26 actor accounting and fiscal bridge.
- Issue #27 hidden seed and fiscal/labor visibility.

## Next Safe Engineering Action

Do not start a second Local Matters row.

Resolve or owner-disposition the preflight mismatch first, then rerun:

- focused Local Matters/event phase validation;
- `npm run ops:v0.3:validate -- --json`;
- `npm run canon:validate:all`;
- `npm run preflight`;
- final double seed replay.

Return a revised packet with exact changed files, final validation evidence, and explicit treatment of `src/sim/phases/phase_events.ts`.
