# v0.3 Manual Acceptance Round 14

Date: 2026-04-05
Branch: codex/v0.3-refactor-kickoff

Accepted lane handoffs:
- World `V03-R2-002-T02`
- World `V03-R2-002-T03`
- Social `V03-R2-003-T03`
- Social `V03-R2-003-T04`
- Social `V03-R2-003-T05`
- Social `V03-R2-003-T06`
- Tooling `V03-R3-001-T02`
- Tooling `V03-R3-001-T03`
- Tooling `V03-R3-001-T04`
- Tooling `V03-R3-001-T05`

Imported lane artifacts:
- `docs/releases/v0.3.2_delegation_v0_closeout.md`
- `docs/qa/replay_reliability_invariants_v0.3.3.md`
- `docs/qa/replay_reliability_guards_v0.3.3.md`
- `docs/qa/replay_reliability_runbook_v0.3.3.md`
- `src/sim/domains/court/maintenance.ts`
- `src/sim/domains/economy/storeReceiptWriters.ts`
- `src/sim/domains/experience/reporting.ts`
- `src/sim/domains/people/marriage.ts`
- `src/sim/domains/world/index.ts`
- `src/sim/domains/world/types.ts`
- `src/sim/domains/world/xmap.ts`
- `scripts/seedReplay.ts`
- `tests/sim/world_scope_caps.test.ts`
- `tests/sim/delegated_maintenance.test.ts`
- `tests/sim/court_delegation_snapshot.test.ts`
- `tests/sim/replay_reliability_invariants_v033.test.ts`

Queue decisions:
- Marked `V03-R2-003` done after accepting `T03` through `T06`.
- Marked `V03-R3-001` done after accepting `T02` through `T05`.
- Marked World `V03-R2-002-T02` and `T03` done.
- Reopened UI `V03-R2-002-T04`.
- Promoted Social `V03-R2-004-T01` as the next clean same-lane frontier.

Notes:
- World `T02/T03` remained inside the world-domain surface and added deterministic cap-table plus topology-backed scope classification helpers.
- Social completed the full delegation v0 chain, including delegated settlement hooks, scouting cost reduction with a one-decision floor, and bounded snapshot exposure.
- Tooling completed the replay-hardening chain, including new invariants, snapshot budget guards, replay harness enforcement, and runbook closeout.
- While validating the imported work, kickoff exposed older accepted-baseline gaps in the bounded experience stack. I restored the minimal companion surfaces for pricing views, known-house summaries, and portfolio analysis/phase wiring so the newly accepted Social and Tooling tests run against coherent repo truth.
- Full kickoff gates were rerun successfully after intake.
