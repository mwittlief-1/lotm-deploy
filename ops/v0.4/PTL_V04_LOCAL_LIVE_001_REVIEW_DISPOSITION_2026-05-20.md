# PTL V04-LOCAL-LIVE-001 Review Disposition

Date: 2026-05-20
Run timestamp: 2026-05-20T15:21:56-0400
Status: `RETURN_FOR_REVISION_NO_PTL_ACCEPTANCE`
Review packet: `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md`

## Disposition

PTL does not accept `V04-LOCAL-LIVE-001` in its current packet shape.

The selected `evt_tool_breakage` / Manor Worksite Accident slice appears directionally aligned with the authorized Local Matters frontier, and focused PTL reruns passed. However, the packet cannot be accepted because the dirty implementation includes unclaimed event activation/classification files and a runtime normal-play activation change affecting multiple event rows outside the single selected live row.

## Blocking Findings

### 1. Unclaimed Runtime Dependencies

The review packet claims tranche-owned files:

- `src/content/events.ts`
- `src/sim/phases/phase_events.ts`
- `src/sim/domains/experience/localMatters.ts`
- `tests/sim/local_matters_live_tranche.test.ts`
- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md`

But the implementation also depends on untracked files not listed in the packet:

- `src/sim/domains/experience/eventActivation.ts`
- `src/sim/domains/experience/eventClassification.ts`
- `tests/sim/event_activation_contract.test.ts`
- `tests/sim/event_classification_contract.test.ts`

Because `src/content/events.ts` imports `eventActivation.ts`, this is not merely stray documentation or test debris. It is part of the runtime behavior under review.

### 2. Broad Event Activation Change Outside Single-Row Tranche

`src/content/events.ts` applies `applyEventNormalPlayActivationContract(EVENT_DECK)`, which forces multiple hidden/deferred/retired event rows to zero normal-play eligibility.

That may be desirable later, but it is broader than the claimed `evt_tool_breakage` live slice and is not listed in the packet's files changed, selected rows, implementation summary, source-truth layer touched, or stop-rule checklist.

The current CPO/CEO authorization is narrow: one SP-017-backed Local Matters first live mutation tranche. PTL cannot accept a packet that combines that tranche with unclaimed runtime event-selection behavior across multiple rows.

## Validation Rerun By PTL

Passed:

- `npm run test -- tests/sim/local_matters_live_tranche.test.ts --run` - 1 file, 4 tests passed.
- `npm run test -- tests/sim/event_activation_contract.test.ts tests/sim/event_classification_contract.test.ts --run` - 2 files, 8 tests passed.
- `npm run ops:v0.3:validate -- --json` - pass; one informational epic warning.
- `npm run canon:validate:all` - pass; 0 warnings, 0 failures.
- `npm run seed:replay:batch -- --limit=2 --outdir=/private/tmp/v04_ptl_seed_replay_run1` - pass; soft-time warnings persisted.
- `npm run seed:replay:batch -- --limit=2 --outdir=/private/tmp/v04_ptl_seed_replay_run2` - pass; soft-time warnings persisted.

The two limited replay summaries matched after normalizing output-directory-specific fields.

Inconclusive:

- PTL attempted `npm run preflight`; it remained silent after startup for several minutes and was stopped. The packet's claimed preflight pass is not independently reaffirmed by this PTL rerun.

## Boundary Assessment

No new CPO/CEO escalation is required if Engineering removes the unclaimed activation/classification runtime change from this tranche or returns a revised packet that clearly separates it as out-of-scope.

If Engineering wants the normal-play event activation/deactivation behavior accepted as part of v0.4 runtime behavior, it needs separate PTL dispatch and likely CPO/CEO confirmation because it changes live event eligibility beyond the selected Local Matters row.

## Required Engineering Revision

Return a revised packet that does one of the following:

1. **Preferred:** Limit `V04-LOCAL-LIVE-001` to the selected `evt_tool_breakage` row and remove unclaimed event activation/classification runtime behavior from the tranche-owned implementation.
2. Or split the activation/classification work into a separate docs/proof/control packet with no runtime activation change.
3. Or explicitly request PTL/CPO/CEO authority for a broader event activation/deactivation tranche before implementation acceptance.

The revised packet must list every runtime and test file required by the implementation, rerun focused tests, and either rerun preflight successfully or explain why preflight is not feasible in the local checkout.
