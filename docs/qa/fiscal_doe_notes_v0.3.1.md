# Fiscal DOE Notes v0.3.1

Last updated: 2026-04-05  
Task: `V03-R1-003-T07`

## Scope

This note refreshes the DOE scaffold for the shipped `V03-R1-003` obligations ladder.

It is not a new fixture pack and it does not change the accepted runtime baseline. It records what later balance-hook work should measure now that arrears, stage-one pressure, stage-two tangible bite, and bounded snapshot outputs all exist.

## Locked ladder under observation

The DOE scaffold assumes the current `v0.3.1` enforcement flow is:

1. per-turn liege and church assessment
2. per-counterparty settlement
3. carry into arrears
4. bounded stage-one pressure
5. capped stage-two tangible bite

The scaffold is only for balance review. It should not be used to justify new mechanic surfaces outside the current ladder.

## Primary metrics

Track these per seed pack and per policy:

- liege due paid versus carried
- church due paid versus carried
- arrears incidence by counterparty
- arrears size bands:
  - `0`
  - `1-5`
  - `6-15`
  - `16+`
- stage-one penalty turns
- seizure turns
- forced-payment-from-stores turns
- food-store depletion associated with church enforcement
- unrest deltas that coincide with open arrears
- relationship deltas applied during stage-one pressure

## Recommended scenario slices

### Clear-state baseline

Target:

- dues settle without arrears
- no enforcement stage activates

Watch:

- zero carry receipts
- zero enforcement receipts
- obligations view remains `clear` for both counterparties

### Coin-poor liege pressure

Target:

- liege dues carry into arrears before church dues become the dominant failure mode

Watch:

- `arrears_coin` growth
- stage-one liege pressure frequency
- seizure cap activation rate

### Food-poor church pressure

Target:

- church dues and forced store payment remain legible without inventing grain-to-coin conversion

Watch:

- `arrears_bushels` growth
- forced-payment-from-stores frequency
- shortage interaction after church-facing store drains

### Chronic mixed arrears

Target:

- stage ordering remains deterministic when both counterparties stay open across turns

Watch:

- counterparty summary order remains liege then church
- both carry and enforcement outputs stay stable across replay
- stage-two activation remains capped rather than compounding without bound

## Review thresholds

Flag for balance review when any of these patterns appears consistently:

- liege or church arrears remain open for three or more consecutive turns under prudent play
- seizure or forced-payment triggers on most turns instead of exceptional turns
- church forced payment reliably causes immediate food collapse with no recovery window
- stage-one pressure becomes effectively invisible compared with stage-two bite
- one counterparty never enters pressure because the other always consumes the full settlement capacity

## Data sources

Later DOE passes should read from these stable outputs first:

- `economy_obligations_view_v1`
- canonical obligation and enforcement receipt taxonomy
- replay-stable turn summaries and bounded snapshots

Prefer those surfaces over reconstructing arrears state from raw manor fields.

## Non-goals

This note does not claim:

- a final balance target for church versus liege pressure
- a final seed pack or fixture matrix for release gating
- a stage-three dispossession contract
- active extraordinary levy / `service_placeholder` DOE coverage

Those remain later scope once additional balance-hook and realm-pressure work is promoted.
