# Integrator Run Log

**Run ID:** 2026-03-31_social_t04_acceptance_and_t05_dispatch
**Date:** 2026-03-31
**Branch:** codex/v0.3-refactor-kickoff
**Accepted Tasks:** V03-R0-005-T04
**Dispatched Tasks:** V03-R0-005-T05

## Accepted Inputs
- Social lane handoff commit: `7f9a4e43e611fca73e153c0dcf7f4696292f7e0c`

## Outcome
- Accepted Social `V03-R0-005-T04` after known-house relevance promotion landed cleanly inside the people-domain ownership boundary with deterministic coverage for kinship and marriage tie promotion.
- Accepted the lane handoff report at `ops/v0.3/progress/runs/V03-R0-005-T04.yaml` as the documented control-plane exception, but excluded the lane-local `ops/v0.3/backlog.yaml` and `ops/v0.3/progress/latest.yaml` edits from the merge so kickoff remains the control-plane source of truth.
- Dispatched Social `V03-R0-005-T05` as the next safe same-lane continuation now that `V03-R0-005-T04` is complete.
- Left UI `V03-R1-005-T02`, Economy `V03-R3-004-T04`, and World `V03-R1-001-T07` as continuing in-flight claims because none produced a new handoff artifact during this pass.
- Recorded `npm run qa` as an acceptable sandbox exception because the wrapper's `tsx` IPC step hit `EPERM` after the full Vitest suite had already written a passing report; the equivalent direct `node --import tsx scripts/uatGate.ts` run also passed.

## Verification
- `npx vitest run tests/sim/known_house_relevance.test.ts tests/sim/world_init_relationship_seeding.test.ts tests/ops_v03_control_plane.test.ts`
- `npm run ops:v0.3:validate -- --json`
- `ruby scripts/opsV03SchedulerDryRun.rb --json`
- `ruby scripts/opsV03RebaseDryRun.rb --json`
- `npm run qa`
- `npm run preflight`
- `npm run seed:replay:batch`
- `npm run seed:replay:batch`
- `npm run repo:duplicates -- --json`

## Replay hashes
- run1: `7b196da2593b2b05f25550733389f4061af4907e084afaea7ec9c26f4e9f9e3a`
- run2: `7b196da2593b2b05f25550733389f4061af4907e084afaea7ec9c26f4e9f9e3a`
