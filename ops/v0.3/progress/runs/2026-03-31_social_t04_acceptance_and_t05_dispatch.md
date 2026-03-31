# Integrator Run Log

**Run ID:** 2026-03-31_social_t04_acceptance_and_t05_dispatch
**Date:** 2026-03-31
**Branch:** codex/v0.3-refactor-kickoff
**Accepted Tasks:** V03-R0-005-T04
**Dispatched Tasks:** V03-R0-005-T05

## Accepted Inputs
- Social lane handoff commit: `7f9a4e43e611fca73e153c0dcf7f4696292f7e0c`

## Outcome
- Accepted Social `V03-R0-005-T04` after deterministic known-house relevance promotion landed fully inside the people-domain boundary with focused coverage for blood ties, marriage ties, and bounded ordering.
- Corrected the copied lane handoff report metadata during intake because the lane recorded the pre-task merge-sync commit instead of the task commit; the task-owned diff and pushed lane tip still matched the accepted surface.
- Dispatched Social `V03-R0-005-T05` as the next same-lane continuation now that the relevance baseline is complete.
- Left Economy `V03-R3-004-T04`, UI `V03-R1-005-T02`, and World `V03-R1-001-T07` as continuing active claims.

## Verification
- `npm run ops:v0.3:validate -- --json`
- `ruby scripts/opsV03SchedulerDryRun.rb --json`
- `ruby scripts/opsV03RebaseDryRun.rb --json`
- `npx vitest run tests/sim/known_house_relevance.test.ts`
- `node ./node_modules/.bin/vitest run --reporter=json --outputFile=qa_artifacts/vitest.json`
- `node --import tsx ./scripts/uatGate.ts`
- `npm run preflight`
- `node --import tsx ./scripts/seedReplay.ts --mode=batch`
- `node --import tsx ./scripts/seedReplay.ts --mode=batch`

## Replay hashes
- run1: `7b196da2593b2b05f25550733389f4061af4907e084afaea7ec9c26f4e9f9e3a`
- run2: `7b196da2593b2b05f25550733389f4061af4907e084afaea7ec9c26f4e9f9e3a`
