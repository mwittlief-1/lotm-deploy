# V04-LOCAL-LIVE-001 Engineering Review Packet

Date: 2026-05-20
Status: `PTL_REVIEW_REQUIRED_PREFLIGHT_RED`
Dispatch: `ops/v0.4/V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md`
Controlling disposition: `AUTHORIZE_V0_4_LOCAL_MATTERS_FIRST_LIVE_MUTATION_TRANCHE`

## Files Changed

Claimed for this Engineering run:

- `src/sim/domains/experience/localMatters.ts`
- `src/content/events.ts`
- `tests/sim/local_matters_live_tranche.test.ts`
- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md`
- `/Users/matt_wittlief_home/.codex/automations/v0-4-engineering-orchestrator-loop/memory.md`

Validation artifacts touched by commands:

- `qa_artifacts/v0.3.6_preflight.json`
- `qa_artifacts/seed_replay/v0.3.6/batch/turns_15/summary.json`

Dirty-checkout caveat: `src/content/events.ts` already contained uncommitted event receipt plumbing before this run. This packet claims only the v0.4 Local Matters import plus the selected-row authorization assertion added to that file.

## Selected Local Matters Row

Selected:

- `evt_tool_breakage` / legacy title `Tool Breakage`
- Canonical planning name: `Manor Worksite Accident`
- Visibility class: `automatic_but_visible`
- Allowed effect class in this tranche: `existing_event_ledger_coin_delta`

Not selected:

- `evt_boundary_dispute`
- `evt_peasant_petition`
- all other SP-017 Local Matters candidate rows
- all legacy 62-event rows outside the selected row

## Implementation Summary

- Added `localMatters.ts` as a narrow v0.4 experience-domain guard and receipt/provenance evidence builder.
- Registered exactly one live v0.4 row: `evt_tool_breakage`.
- Added a guard assertion in the existing `evt_tool_breakage` apply path before the existing ledger coin effect.
- Preserved existing event text, event RNG, phase ordering, event selection, ledger receipt shape, and ordinary non-v0.4 event receipt behavior.
- Added focused tests proving row authorization, blocked effect rejection, ordinary unselected event receipt separation, selected-row receipt evidence, and deterministic evidence output.

## Source-Truth Layer Touched

- Runtime content seam: existing `EVENT_DECK` row for `evt_tool_breakage`.
- Existing mutable runtime path: the selected event's pre-existing ledger-backed Coin delta.
- New experience-domain evidence seam: v0.4 Local Matters row metadata and receipt evidence builder.

No Reference World mutation, Generated Run State mutation, schema promotion, fixture update, golden update, baseline update, production UI integration, broad turn/phase wiring, or active v0.3 backlog mutation is claimed.

## Receipt And Provenance Evidence

Focused evidence seed: `v04_local_matters_tool_breakage_receipt`

Observed selected-row effect:

```json
{
  "effects": ["Repairs and replacements: -1 coin."],
  "coin_delta": -1,
  "receipt_id": "ledger:t3:events:p1:coin:0001",
  "phase": "events",
  "phase_sequence": 1,
  "category": "event.economic",
  "counterparty_id": "event:evt_tool_breakage",
  "asset": "coin",
  "delta": -1,
  "balance_after": 19,
  "rule_id": "event.evt_tool_breakage.coin"
}
```

Evidence builder status:

- `schema_version`: `v04_local_matters_live_tranche_v1`
- `tranche_id`: `V04-LOCAL-LIVE-001`
- `event_id`: `evt_tool_breakage`
- `canonical_planning_name`: `Manor Worksite Accident`
- `evidence_status`: `receipt_backed`
- `receipt_count`: `1`
- provenance refs:
  - `ops/v0.3/catalog_disposition/SP-017_LEGACY_62_EVENT_DISPOSITION.md`
  - `ops/v0.4/safe_queue/V04_LOCAL_001_LOCAL_MATTERS_ROW_PACKAGE.md`
  - `ops/v0.4/V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md`

Blocked effects asserted as not applied:

- `condition_delta`
- `labor_delta`
- `order_delta`
- `food_delta`
- `art_delta`
- `justice_or_coercion`
- `ui_response`
- `turn_wiring`
- `schema_update`
- `fixture_or_golden_update`

## Tests And Validation Results

Passed:

- `npx vitest run tests/sim/local_matters_live_tranche.test.ts`
  - 1 file passed
  - 4 tests passed
- `npx vitest run tests/sim/economy_receipt_plumbing.test.ts tests/sim/ledger_domain.test.ts tests/sim/fiscal_receipts_contract.test.ts`
  - 3 files passed
  - 13 tests passed
- `npm run ops:v0.3:validate -- --json`
  - `ok: true`
  - only warning: informational epics remain ready
- `npm run canon:validate:all`
  - `status: pass`
  - no warnings
  - no failures

Attempted but red:

- `npm run preflight`
  - artifact: `qa_artifacts/v0.3.6_preflight.json`
  - `ok: false`
  - `passed: 2`
  - `tests_run: 3`
  - failed test: `non_perturbation_golden_seeds_no_accepts`
  - mismatch count: `16`
  - first field counts: `manor.coin: 16`, `manor.bushels_stored: 11`, `manor.farmers: 7`, `manor.unrest: 6`, `manor.builders: 5`

Replay note:

- Full seed replay was run earlier during the intermediate patch state and is not claimed as final acceptance evidence for this corrected packet.
- Final double seed replay was not rerun after the final preflight failed; PTL should require replay rerun after disposition of the preflight mismatch.

## Baseline Golden Fixture Confirmation

- No `docs/schemas/**` changes were made for this tranche.
- No `tests/fixtures/**` changes were made for this tranche.
- No golden seed files were changed for this tranche.
- No baseline files were changed for this tranche.
- No fixture/golden/baseline update is requested.

## Stop-Rule Checklist

- [x] One SP-017-backed Local Matters row selected.
- [x] Full legacy 62-event deck not promoted.
- [x] Guided testers not started.
- [x] `ops/v0.3/backlog.yaml` not intentionally edited.
- [x] `ops/v0.3/progress/latest.yaml` not intentionally edited.
- [x] No schema, fixture, golden, or baseline update.
- [x] No broad `src/sim/turn.ts` change.
- [x] No phase-order rewiring.
- [x] No production UI integration.
- [x] No runtime preset initialization.
- [x] No live maintenance Coin/Labor.
- [x] No obligation collector rebasing.
- [x] No Food, Labor, Condition, Order, A/R/T, marriage, claims, succession, regency, justice, or coercion mutation.
- [x] Receipt/provenance evidence included for the selected material coin effect.
- [ ] Final preflight green.
- [ ] Final double seed replay after the final patch.
- [x] PTL acceptance not marked by Engineering.

## Dirty Checkout Caveat

The shared checkout remains broadly dirty, including unrelated v0.3 control-plane files, docs/QA artifacts, fixtures, production UI files, runtime files, and deleted/untracked paths. This packet does not claim or normalize unrelated dirty work.

During validation, two adjacent event contract test files that were present during initial exploration were no longer present in the checkout:

- `tests/sim/event_activation_contract.test.ts`
- `tests/sim/event_classification_contract.test.ts`

Those files are not claimed as part of final validation.

## PTL Disposition Request

Engineering requests PTL review of the narrow `evt_tool_breakage` implementation but does not request acceptance while preflight is red.

Recommended PTL disposition:

- Return this packet for preflight mismatch disposition or assign a focused owner to determine whether the mismatch is unrelated dirty-checkout drift or caused by this tranche.
- After preflight is green or owner-dispositioned, rerun final double seed replay and compare per-run hashes.

## Next Safe Engineering Action

Safest next Engineering action is not a second Local Matters row yet. First resolve or owner-disposition the final preflight mismatch, then rerun preflight and double seed replay. After PTL acceptance, the next row should remain a single-row tranche with explicit response/effect boundaries before any Order, A/R/T, claims, justice, Food, Coin, Labor, Condition, UI, or turn-wiring expansion.
