# PTL V04-LOCAL-LIVE-001 Revision 001 Acceptance

Date: 2026-05-20
Run timestamp: 2026-05-20T16:14:08-0400
Status: `ACCEPT_REVISION_001_LOCAL_MATTERS_FIRST_ROW`
Review packet: `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md`

## Disposition

PTL accepts `V04-LOCAL-LIVE-001` Revision 001 for the selected first Local Matters live row:

- `evt_tool_breakage` / Tool Breakage
- Canonical planning name: Manor Worksite Accident
- Visibility class: `automatic_but_visible`
- Accepted effect class in this tranche: `existing_event_ledger_coin_delta`

This acceptance is limited to the narrow selected-row implementation described in the revised packet. It does not approve broad event activation/deactivation, UI integration, schema changes, fixture/golden/baseline updates, active v0.3 backlog mutation, broad turn/phase wiring, Food mutation, A/R/T mutation, maintenance Coin/Labor, obligation collector rebasing, marriage, succession, claims, regency, justice, or coercion mutation.

## Revision Issue Resolved

The prior return blocker was unclaimed normal-play event activation/classification behavior.

Revision 001 resolves that blocker for PTL purposes:

- `src/content/events.ts` no longer imports `src/sim/domains/experience/eventActivation.ts`.
- `src/sim/domains/experience/eventActivation.ts` is absent from the current filesystem snapshot.
- `src/sim/domains/experience/eventClassification.ts` is absent from the current filesystem snapshot.
- The activation/classification tests are absent from the current filesystem snapshot.
- The revised packet explicitly excludes normal-play activation/deactivation from this tranche.

## Accepted Files For This Tranche

Accepted tranche-owned files:

- `src/content/events.ts`
- `src/sim/phases/phase_events.ts`
- `src/sim/domains/experience/localMatters.ts`
- `tests/sim/local_matters_live_tranche.test.ts`
- `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md`

The surrounding dirty checkout remains unaccepted.

## PTL Validation

Passed:

- `npm run test -- tests/sim/local_matters_live_tranche.test.ts --run` - 1 file, 4 tests passed.
- `npm run ops:v0.3:validate -- --json` - pass; one informational epic warning.
- `npm run canon:validate:all` - pass; 0 warnings, 0 failures.
- `npm run seed:replay:batch -- --limit=2 --outdir=/private/tmp/v04_ptl_revision_seed_replay_run1` - pass; soft-time warnings persisted.
- `npm run seed:replay:batch -- --limit=2 --outdir=/private/tmp/v04_ptl_revision_seed_replay_run2` - pass; soft-time warnings persisted.

The two limited replay summaries matched after normalizing output-directory-specific fields.

Preflight caveat:

- Engineering reports preflight was attempted after revision and exited abnormally without usable final result.
- PTL previously observed preflight hanging after startup in this checkout.
- Because focused Local Matters validation, canon validation, ops validation, and limited deterministic replay passed, PTL accepts this tranche with preflight inconclusive as a checkout/tooling caveat, not as authorization to update baselines or fixtures.

## Dirty Checkout Caveat

The shared checkout remains broadly dirty, including forbidden or red-zone paths outside this tranche. This acceptance applies only to the listed tranche-owned files and does not normalize, accept, or publish unrelated dirty work.

## CPO/CEO Escalation

No new CPO/CEO escalation is required for this acceptance.

Open blockers remain:

- `https://github.com/mwittlief-1/lotm-deploy/issues/23` - guided tester boundary.
- `https://github.com/mwittlief-1/lotm-deploy/issues/26` - actor accounting and fiscal bridge.
- `https://github.com/mwittlief-1/lotm-deploy/issues/27` - hidden seed and fiscal/labor visibility.

## Next Safe Engineering Action

No second Local Matters row is authorized by this acceptance.

The next implementation step requires a new PTL dispatch. Preferred next candidates remain `evt_boundary_dispute` or `evt_peasant_petition`, but only after response/effect boundaries are defined before any Order, A/R/T, claims, justice, Food, Coin, or Labor mutation beyond the next explicit scope.
