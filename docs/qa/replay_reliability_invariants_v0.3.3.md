# Replay Reliability Invariants v0.3.3

Last updated: 2026-04-05  
Task: `V03-R3-001-T02`

## Purpose

Record the new invariants added to satisfy the v0.3.3 replay reliability quota, focused on fiscal and portfolio surfaces.

## New invariants

1) **Economy placeholder registry invariants**
   - **Test:** `tests/sim/replay_reliability_invariants_v033.test.ts` (`keeps economy placeholder registry paths finite and non-negative`)
   - **Purpose:** Ensure the economy placeholder registry stays schema-stable and all tracked fiscal paths remain finite and non-negative across early turns.

2) **Portfolio snapshot totals invariant**
   - **Test:** `tests/sim/replay_reliability_invariants_v033.test.ts` (`keeps portfolio snapshot totals equal to summed manor totals`)
   - **Purpose:** Ensure the bounded snapshot portfolio analysis totals remain consistent with the summed manor rows across early turns.

## Notes

- These invariants are read-only and do not alter runtime ordering or RNG usage.
- Failures should block acceptance until the underlying registry or rollup issue is corrected.
