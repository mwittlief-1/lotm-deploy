# Obligations Enforcement Ladder v0.3.1

Last updated: 2026-04-05  
Task: `V03-R1-003-T07`

## Purpose

This note records the architectural boundary shipped by `V03-R1-003`.

The goal is to preserve one clear ownership model for obligations and enforcement after the economy, integrator, and UI slices landed across `T02` through `T06`.

## Ownership split

Phases own ordering:

- preview assessment timing
- decision-phase settlement timing
- close-turn carry timing

Economy domain owns meaning:

- per-counterparty registry state
- settlement scaffolds and accepted payment modes
- arrears carry helpers
- stage-one penalty helpers
- stage-two tangible-bite helpers
- canonical receipt taxonomy

Experience/read-model surfaces own legibility:

- bounded `economy_obligations_view_v1`
- deterministic counterparty ordering
- summary labels for due, arrears, and enforcement state

## Shipped ladder

The shipped ladder is intentionally narrow:

- liege and church are the only active counterparties
- settlement is once per turn per counterparty
- unpaid balances move into explicit arrears
- stage-one pressure remains bounded
- stage-two bite remains capped and deterministic

This is enough to support current play and later balance review without introducing a full political or legal simulation.

## Stable identifiers and taxonomy

Downstream work should treat these as locked:

- counterparty order: liege, church
- carry receipt category: `obligation.arrears_carry`
- stage-one receipt category: `enforcement.penalty`
- stage-two receipt categories:
  - `enforcement.seizure`
  - `enforcement.forced_payment_stores`

## Deferred boundaries

The following remain intentionally outside the `v0.3.1` ladder:

- institution-aware church enforcement targets
- active extraordinary levy integration through `service_placeholder`
- stage-three dispossession automation
- new counterparty classes beyond liege and church

Future work should extend the existing registry and receipt surfaces rather than creating a second obligations contract.
