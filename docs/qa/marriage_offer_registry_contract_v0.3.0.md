# Marriage Offer Registry Contract v0.3.0

Task: `V03-R0-002-T02`  
Date: `2026-03-26`

## Goal

Define a bounded marriage-offer registry contract inside the people domain without changing the live phase wiring yet.

This task locks the schema, identity keys, and state model that later tasks will use for:

- one pending offer per candidate
- reject stickiness
- household-member concurrency
- eventual phase integration

## Schema

`src/sim/domains/people/marriageOfferRegistry.ts` defines `marriage_offer_registry_v0` with:

- `offer_keys`
- `subject_keys`
- `candidate_keys`
- `offers_by_key`
- `subject_offer_keys`
- `candidate_offer_keys`

Each offer record carries explicit stable fields:

- `offer_key`
- `direction`
- `state`
- `subject_key`
- `subject_person_id`
- `subject_house_id`
- `candidate_key`
- `candidate_person_id`
- `candidate_house_id`
- `candidate_house_label`
- `created_turn`
- `last_state_change_turn`
- `offer_rank`
- `dowry_coin_net`
- `relationship_delta`
- `liege_delta`
- `risk_tags`

## Deterministic keys

The registry uses three canonical keys:

- `subject_key = "subject:<subject_person_id>"`
- `candidate_key = "candidate:<candidate_person_id>"`
- `offer_key = "marriage_offer:<direction>:<subject_key>:<candidate_key>"`

Consequences:

- candidate identity is stable across label changes, dowry changes, and later state transitions
- one candidate can be indexed independently of household subject concurrency
- terminal state changes do not require a new offer key

## State model

Non-terminal states:

- `generated`
- `pending`

Terminal states:

- `accepted`
- `rejected`
- `expired`
- `withdrawn`

Transition rule for `v0.3.0` contract:

- `generated` may move to any later state
- `pending` may move only to itself or a terminal state
- terminal states are final and may only repeat idempotently as the same terminal state

## Current seam

The current runtime still builds transient `MarriageWindow.offers` and later collapses one best offer into the prospect system. This task does not change that behavior.

Instead, it adds:

- a behavior-preserving registry helper for current inbound offers
- deterministic key helpers
- state-transition assertions
- test coverage proving the schema and keys are stable

That keeps `T02` seam-carving only, while `T03` through `T05` can wire actual pending, reject-stickiness, and concurrency behavior onto the same registry contract.

## Bounded policy fixtures

`T06` extends the contract coverage without changing phase wiring.

The canonical deterministic fixtures now live in `tests/sim/marriage_offer_registry.test.ts` and lock these bounded-policy expectations:

- inbound boundedness:
  one household subject may hold multiple inbound offers, with deterministic `offer_keys` ordered by canonical key
- outbound boundedness:
  outbound offers reuse the same schema and remain direction-scoped, so the same subject/candidate pair may exist as distinct inbound and outbound offer keys
- cooldown behavior:
  rejected pairings stay cooling down for turns `+1` through `+3` and re-enter eligibility on turn `+4`
- household concurrency:
  `buildMarriageOfferOwnershipIndex(...)` and `buildMarriageOfferOwnershipIndexFromState(...)` must be able to show two household members holding concurrent active offers before `T07` phase integration

The fixed fixture state continues to use `run_seed: "seed"` so coverage stays deterministic even where the current preview path still depends on seeded offer generation.

## Deferred integration boundary

This contract now intentionally stops at the people-domain registry seam.

It does **not** claim that the phase wrappers already materialize multiple same-turn marriage prospects. That integrator-owned step remains deferred to `V03-R0-002-T07`.
