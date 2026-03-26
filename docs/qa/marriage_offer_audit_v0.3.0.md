# Marriage Offer Audit v0.3.0

Task: `V03-R0-002-T01`

Scope:
- Audit the current marriage offer lifecycle without changing runtime behavior.
- Enumerate candidate identity and uniqueness surfaces.
- Identify household-level concurrency and storage limits that the bounded-offer follow-up must address.

Primary code surfaces audited:
- `src/sim/domains/people/marriage.ts`
- `src/sim/marriageMarket.ts`
- `src/sim/phases/phase_prospects.ts`
- `src/sim/types.ts`
- `src/sim/turn.ts`
- `src/sim/policies.ts`
- `tests/sim/marriage_market.test.ts`
- `tests/v024_dev_b_court.test.ts`
- `tests/v025_dev_b_realism.test.ts`
- `tests/v0272_hotfix_p0_regressions.test.ts`

## Lifecycle audit

### 1. Preview-time inbound offer generation

Current raw offer creation lives in `src/sim/domains/people/marriage.ts:57-124`.

- Eligibility is derived from the player household only.
- The eligible pool includes the head only when the house has no current spouse and is not widowed, plus any unmarried living children age 15+.
- Even if multiple household members are eligible, the code collapses them to a single subject by sorting `eligibleAll` by descending age and then ascending person id.
- `MarriageWindow.eligible_child_ids` is therefore currently a single-element array in practice.
- Candidate lookup delegates to `listEligibleCandidates(...)` with `subject_person_id` and a deterministic house-id scope.
- The raw offer set is transient: `MarriageWindow` only stores `eligible_child_ids` and `offers`, and the window is returned through `TurnContext` / `proposeTurn` rather than written into persistent sim state.
- Offer count is bounded only for the current preview: `2 + (rng.bool(0.4) ? 1 : 0)`, with no persistent registry.

Offer fields today (`src/sim/types.ts:393-405`):

| Surface | Fields | Notes |
| --- | --- | --- |
| `MarriageOffer` | `house_person_id`, `house_label`, `dowry_coin_net`, `relationship_delta`, `liege_delta`, `risk_tags` | Ephemeral raw offer shown in `marriage_window`. |
| `MarriageWindow` | `eligible_child_ids`, `offers` | Turn-preview container only. |

Outbound status:

- There is no first-class outbound marriage offer object or registry.
- The `scout` branch in `src/sim/domains/people/marriage.ts:137-143` only spends energy and coin, then multiplies `_mods.marriage_quality`.
- That means the current lifecycle is effectively inbound-offer generation plus accept/reject decisions, not a two-sided inbound/outbound registry.

### 2. Candidate selection and uniqueness

Current deterministic candidate enumeration lives in `src/sim/marriageMarket.ts:306-385`.

- Subject identity is normalized through the People-First registry first, with legacy fallbacks to embedded `state.house` / `state.locals` records.
- Candidate uniqueness is person-id based, not house-member-slot based.
- `personToHouseMap(...)` prefers the earliest house id in stable sort order when the same person can be discovered through multiple house membership surfaces.
- Candidates are filtered by:
  - opposite-sex pairing via `desiredSpouseSex(...)`
  - age band
  - alive status
  - no living spouse edge
  - widowed fallback when `married=true` is stale but no living spouse remains
  - not currently reserved in `state.flags.marriage_reservations`
- Final ordering is deterministic by tier, proximity, house id, then person id.

Reservation behavior:

- `src/sim/marriageMarket.ts:49-107` defines `state.flags.marriage_reservations` as `person_id -> { prospect_id, expires_turn }`.
- Reservations are inclusive through `expires_turn`.
- Reservation GC iterates sorted keys for determinism.
- `listEligibleCandidates(...)` is intentionally read-only and does not GC reservations itself.

Evidence:

- `tests/sim/marriage_market.test.ts:91-255` covers reservation exclusion, duplicate prevention across simultaneous subject pools, spouse-edge detection across alternate edge shapes, and widow eligibility.
- `tests/v0272_hotfix_p0_regressions.test.ts:21-89` confirms `spouse_person_id` resolves to a People-First registry person and that `from_house_id` matches the spouse's actual house.

### 3. Prospect materialization and persistence

Persistent marriage offers do not reuse `MarriageOffer` directly. Instead, `src/sim/phases/phase_prospects.ts:187-358` converts the best current raw offer into a `Prospect`.

Current steps:

1. Read active prospect refs from `state.flags._prospects_active_v1`.
2. Expire old refs, clear their reservation entries, and emit `prospect_expired`.
3. If there is no active `"marriage"` prospect type and the current `marriage_window` has offers, choose the single best raw offer through `bestMarriageOfferIndexPolicy(...)`.
4. Materialize one `Prospect` with deterministic id, `subject_person_id`, `spouse_person_id`, `from_house_id`, `to_house_id`, predicted coin delta, and relationship deltas.
5. Reserve the spouse candidate through `reserveCandidate(...)`.
6. Persist only `{ id, expires_turn }` into `_prospects_active_v1`; the full prospect body is reconstructed later from historical `prospect_generated` log entries.

Prospect fields today (`src/sim/types.ts:435-487`):

| Surface | Fields relevant to marriage identity | Notes |
| --- | --- | --- |
| `Prospect` | `id`, `type`, `from_house_id`, `to_house_id`, `subject_person_id`, `spouse_person_id`, `expires_turn` | Canonical persisted marriage-offer surface today. |
| `_prospects_active_v1` | `id`, `expires_turn` | Active refs only; no spouse or subject ids. |
| `prospect_generated` log event | full `prospect` payload | Required to reconstruct active marriage prospects later. |
| `prospect_accepted` / `prospect_rejected` / `prospect_expired` | `type`, `from_house_id`, `to_house_id`, `subject_person_id`, `prospect_id` | Terminal events do not retain `spouse_person_id`. |

Important storage finding:

- Active marriage offer storage is fragmented across `TurnContext.marriage_window`, `state.flags._prospects_active_v1`, `state.flags.marriage_reservations`, and historical `state.log[].report.prospects_log[].prospect`.
- There is no dedicated bounded marriage-offer registry that can answer "which members currently hold which offers?" without combining multiple surfaces.

### 4. Accept / reject / expiry behavior

There are two live resolution paths today.

Raw marriage-window resolution in `src/sim/domains/people/marriage.ts:127-255`:

- `scout` spends resources and buffs the next preview.
- `reject_all` only adds unrest and does not write any persistent per-offer state.
- `accept` applies coin, marriage flags, kinship edge, residency changes, and relationship deltas directly from `MarriageWindow`.

Prospect resolution in `src/sim/phases/phase_prospects.ts:489-692`:

- `accept` applies predicted effects, marriage flags, kinship edge, court/residency movement, and `prospect_accepted`.
- `reject` records `prospect_rejected` and clears reservation state.
- Expiry occurs when `current_turn > expires_turn`, clears reservation state, and records `prospect_expired`.

Ordering:

- `src/sim/turn.ts:700-714` applies marriage decisions first and prospect decisions second in the same turn.

Audit finding:

- Acceptance logic is duplicated between the raw `marriage_window` path and the persisted `prospect` path.
- Rejection semantics also diverge: `reject_all` on the raw window only adds unrest, while prospect rejection records a terminal event and clears reservation state.
- There is no reject-stickiness surface yet; a rejected candidate can reappear later once not reserved and otherwise eligible.

## Household concurrency findings

### Current limitations

1. Only one household subject can receive raw marriage offers per turn.
   Reason: `buildMarriageWindow(...)` chooses a single subject after sorting eligible members in `src/sim/domains/people/marriage.ts:73-86`.

2. Only one active marriage prospect can exist at a time.
   Reason: `buildProspectsWindowPhase(...)` will not add a new marriage prospect when `activeTypes.has("marriage")` in `src/sim/phases/phase_prospects.ts:264-358`.

3. Active prospect storage is globally capped at three entries, not three marriage entries.
   Reason: `_prospects_active_v1` is truncated to three refs in `src/sim/phases/phase_prospects.ts:54-62`, and `addProspect(...)` refuses to exceed three total prospects in `src/sim/phases/phase_prospects.ts:284-290`.

4. Candidate exclusivity is enforced per spouse candidate person id, not per household member / offer slot.
   Reason: `marriage_reservations` is keyed only by candidate `person_id` in `src/sim/marriageMarket.ts:42-107`.

5. Multiple raw offers are collapsed to one persisted marriage prospect.
   Reason: `buildProspectsWindowPhase(...)` selects the single best offer index and materializes exactly one `Prospect` in `src/sim/phases/phase_prospects.ts:292-358`.

6. Outbound court action is not modeled as a persistent offer queue.
   Reason: `scout` modifies future offer quality but does not create or track outgoing proposals in `src/sim/domains/people/marriage.ts:137-143`.

### Consequences for the follow-up bounded-offer task

- The next registry needs to represent offers per household subject, not just the single chosen elder.
- The current persistence model loses direct spouse identity at terminal events and depends on history replay to reconstruct active offers.
- A bounded registry will need one canonical path for accept/reject/expiry so the raw-offer and prospect paths stop drifting.
- If household concurrency is a goal, `eligible_child_ids` and `_prospects_active_v1` are both too narrow in their current shapes.

## Audit summary

Current v0.2.x marriage mechanics already have deterministic candidate ordering, candidate-level reservation, and People-First identity wiring. The missing piece is not basic identity correctness; it is a bounded, self-contained offer registry.

Today the effective lifecycle is:

1. Build one transient inbound `MarriageWindow` for one selected household subject.
2. Convert one best offer into one persisted `Prospect`.
3. Reserve the spouse candidate while that prospect is active.
4. Resolve through either the raw marriage path or the prospect path, with expiry only implemented on the prospect side.

That leaves the v0.3 bounded-offer follow-up with three main seams to address:

- unify raw and persisted marriage resolution
- persist offer identity in one canonical registry instead of split flags + logs
- allow multiple household members to hold concurrent offers without losing deterministic ordering
