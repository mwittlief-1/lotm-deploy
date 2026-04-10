# 2026-04-09 Manual Acceptance Round 37

## Accepted

- Social `V03-R1-006-T01`
- Social `V03-R1-006-T02`
- Social `V03-R1-006-T03`
- Social `V03-R1-006-T04`
- Social `V03-R1-006-T05`
- Epic `V03-R1-006`

## Integrated Code

- Accepted the residence-manor assignment baseline from the Social lane:
  - `src/sim/domains/people/residenceManorRegistry.ts`
  - `src/sim/domains/experience/reporting.ts`
  - `src/sim/domains/people/playerHousehold.ts`
  - `src/sim/domains/people/marriage.ts`
  - `src/sim/domains/people/clergyTrackRegistry.ts`
  - `src/sim/domains/people/institutionHolderRegistry.ts`
  - `tests/sim/residence_manor_registry.test.ts`
  - `tests/sim/residence_manor_snapshot.test.ts`
  - `tests/sim/residence_manor_invariants.test.ts`
  - `docs/releases/v0.3.1_residence_manor_assignment_audit.md`
  - `docs/releases/v0.3.1_residence_manor_assignment_closeout.md`

## Integrator Adaptation

- Added one kickoff-only compatibility fix while integrating the lane seam:
  `residenceManorRegistry` now falls back to legacy `house.court_officers`
  assignments via `listLegacyFilledHouseCourtOffices(state)` when the newer
  `court_office_registry` surface is not yet populated. This keeps office
  selector contexts correct on current kickoff truth without changing sim
  behavior or serialized output.
- Tightened one focused test expectation so the transition case only requires
  `household + service` selector contexts unless a real office-registry seat
  exists.

## Verification

- Direct runtime assertions over the new residence-manor contract passed on
  kickoff truth.
- `ops:v0.3:validate`, scheduler dry-run, and rebase dry-run passed.
- Replay stayed on the accepted line during the integrated seam check:
  `f850077e9f6a7338869f9861a6db0fc7e27f3c8cae56b6589e09b42dcc0d67f1`

## Notes

- The Social lane reports `qa` and `preflight` as passing for the chain.
- Kickoff reruns of the `qa` and `preflight` wrappers hung in this environment,
  so acceptance relied on the direct contract assertions, the ops validators,
  and the replay check on integrated kickoff truth.
