# Marriage Offer Registry Contract v0.3.0

Last updated: `2026-03-26`  
Origin task: `V03-R0-002-T02`  
Refreshed by: `V03-R0-002-T06`, `V03-R0-002-T08`  
Date: `2026-03-26`

## Goal

This document originated as the `T02` seam carve and now records the accepted bounded marriage-offer contract after the later `T06` and `T07` follow-ups.

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

## Registry seam and accepted integration

The current runtime still builds transient `MarriageWindow.offers` and later collapses one best offer into the prospect system.

The accepted bounded-offer seam now provides:

- a behavior-preserving registry helper for current inbound offers
- deterministic key helpers
- state-transition assertions
- test coverage proving the schema and keys are stable
- state reconstruction from generated prospect history plus active refs
- member-level ownership indexes for concurrent household offer state
- prospects-wrapper integration so the generated marriage prospect is sourced from a bounded registry entry instead of being rebuilt ad hoc from `MarriageWindow`

That means the same registry contract now spans the shipped `T02` through `T07` behavior without changing the canonical key model introduced at `T02`.

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
  `buildMarriageOfferOwnershipIndex(...)` and `buildMarriageOfferOwnershipIndexFromState(...)` must be able to show two household members holding concurrent active offers inside the bounded registry state

The fixed fixture state continues to use `run_seed: "seed"` so coverage stays deterministic even where the current preview path still depends on seeded offer generation.

## Remaining boundary

This contract intentionally stops short of a broader product redesign.

It does **not** claim that:

- the preview path now surfaces multiple same-turn marriage subjects in `MarriageWindow`
- the prospects phase now materializes more than one marriage prospect at a time
- raw marriage-window accept / reject resolution has been fully unified with prospect resolution

The concurrency requirement accepted in this epic closes at the registry ownership layer: bounded offer state can represent multiple household members holding active offers concurrently, while the current preview and prospect-capacity policies remain intentionally unchanged.
