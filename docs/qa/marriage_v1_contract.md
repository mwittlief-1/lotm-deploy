# Marriage v1 Contract

Last updated: 2026-03-26
Task: `V03-R0-002-T08`

## Scope

This document closes the `V03-R0-002` marriage epic for the social-mechanics lane by consolidating the accepted bounded-offer behavior, the canonical QA evidence, and the remaining boundary notes.

The lane-owned scope closed by this epic is:

- `src/sim/domains/people/marriage.ts`
- `src/sim/domains/people/marriageOfferRegistry.ts`
- `tests/sim/marriage_market.test.ts`
- `tests/sim/marriage_offer_registry.test.ts`
- `docs/qa/**`

The accepted integrator-owned seam merged into this branch is:

- `src/sim/phases/phase_prospects.ts`

The unchanged integrator boundary remains:

- `src/sim/turn.ts`

## Canonical surfaces

- Canonical audit: `docs/qa/marriage_offer_audit_v0.3.0.md`
- Canonical registry contract: `docs/qa/marriage_offer_registry_contract_v0.3.0.md`
- Canonical bounded-offer domain seam: `src/sim/domains/people/marriageOfferRegistry.ts`
- Preview-time cooldown filter: `src/sim/domains/people/marriage.ts`
- Accepted wrapper integration evidence: `ops/v0.3/progress/runs/V03-R0-002-T07.md`

## Contract summary

### Offer identity and state

The canonical bounded-offer contract for `v0.3.0` now locks:

- deterministic `subject`, `candidate`, and direction-scoped `offer` keys
- explicit non-terminal states: `generated`, `pending`
- explicit terminal states: `accepted`, `rejected`, `expired`, `withdrawn`
- stable offer payload fields for dowry, relationship deltas, liege deltas, rank, and risk tags

### Bounded behavior

The accepted runtime interpretation on this branch is:

- each candidate key may hold at most one surviving `pending` offer at a time
- duplicate pending offers collapse by stable precedence rather than remaining simultaneously active
- rejected subject/candidate pairings cool down for turns `+1` through `+3` and re-enter eligibility on turn `+4`
- ownership indexes can represent multiple household members holding concurrent active offers inside the bounded registry state
- inbound and outbound offers share one schema while remaining direction-scoped by key

### Accepted wrapper behavior

The accepted `T07` integration means:

- the prospects phase resolves the selected marriage offer through the bounded registry helper instead of rebuilding the generated prospect directly from raw `MarriageWindow` fields
- generated marriage prospects reconstruct back into canonical bounded-offer state as `pending`
- later terminal history continues to reconstruct as `accepted`, `rejected`, `expired`, or `withdrawn` through the same registry key model

## Accepted QA evidence

### T01 audit

`docs/qa/marriage_offer_audit_v0.3.0.md` records the original lifecycle, the fragmented storage surfaces, and the pre-refactor household-concurrency limits that the bounded-offer work needed to address.

### T02, T03, T04, and T05 registry behavior

`docs/qa/marriage_offer_registry_contract_v0.3.0.md` and `tests/sim/marriage_offer_registry.test.ts` now lock:

- deterministic keys and registry shape
- one pending offer per candidate
- deterministic terminal finalization
- three-turn reject cooldowns
- member-level ownership indexes for concurrent household offer state

### T06 deterministic fixtures

`tests/sim/marriage_offer_registry.test.ts` fixes bounded-policy fixtures for inbound boundedness, outbound direction separation, cooldown behavior, and registry-level household concurrency under a stable seed.

### T07 phase integration

`tests/sim/marriage_phase_registry_integration.test.ts` proves that the accepted prospects wrapper integration:

- writes a pending bounded-offer entry for the generated marriage prospect
- propagates rejected pairings back into the canonical cooldown surface

## Accepted diff notes

- Tasks `T03`, `T04`, `T05`, and `T07` were allowed to change marriage-facing behavior while moving the runtime onto the bounded-offer seam.
- Across those accepted runs, the replay batch remained hash-stable on the shipped deterministic seeds.
- The concurrency requirement closes at the registry ownership layer, not at a broader preview or prospect-capacity expansion.
- The generated marriage prospect now consumes canonical bounded-offer state for subject, candidate, dowry, and relationship deltas.

## Remaining boundary notes

- This epic closes deterministic offer identity, pending uniqueness, reject cooldowns, member-level ownership, and bounded wrapper sourcing.
- It does not expand the current single-subject `MarriageWindow` preview selection or the one-marriage-prospect limit inside the prospects phase.
- It does not fully unify raw marriage-window accept / reject resolution with prospect resolution; that would require new backlog scope.

## Epic outcome

`V03-R0-002` is ready to remain `done` in backlog state because:

- bounded marriage-offer identity and state now live in one canonical registry seam
- the accepted wrapper integration consumes that seam instead of rebuilding prospect data ad hoc
- deterministic QA evidence now covers uniqueness, cooldowns, direction scoping, ownership concurrency, and phase integration
