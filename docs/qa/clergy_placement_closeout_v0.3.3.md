# v0.3.3 Clergy Placement Baseline Closeout

Epic: `V03-R3-002`  
Closeout Task: `V03-R3-002-T05`  
Date: `2026-04-09`  
Lane: `codex/v0.3-lane-social-mechanics`

## Scope

This closeout records the accepted `v0.3.3` clergy placement baseline after
`T01` through `T04`. It supersedes the opening audit as the release-facing
summary of what clergy-track and institution-holder seams now guarantee,
which persistence behavior is intentionally locked, and what later decision,
UI, and world work may safely assume.

## Accepted task sequence

- `T01` audited the seeded parish and institution-holder surfaces, documented
  the missing people-domain clergy seam, and named the first insertion points.
- `T02` defined the canonical `clergy_track_registry_v0` and
  `clergy_eligibility_registry_v0` shapes with deterministic ids, explicit
  blockers, and bounded placement helpers for holy orders and convent paths.
- `T03` defined the canonical `institution_holder_registry_v0` shape, added
  stable holder lookup and parish-field mirroring, and preserved holder start
  turns across unchanged rebuilds.
- `T04` wired clergy placement persistence into integrator-owned phase
  wrappers through a narrow people-domain sync helper, proving that placed
  clergy and parish holders survive preview aging and applied turn
  advancement without touching `src/sim/turn.ts`.

## Locked `v0.3.3` clergy placement rules

### Clergy track facts are explicit and deterministic

The accepted baseline now assumes:

- clergy placements live in `clergy_track_registry_v0`
- entry ids are canonical by `track_kind` and `person_id`
- active entry ordering is stable
- holy orders and convent placement sources are explicit
- placement helpers reuse stable ids instead of generating per-turn duplicates

### Eligibility is house-scoped and blocker-driven

The accepted clergy baseline now assumes:

- candidate enumeration is scoped to the structured player house
- eligibility is computed deterministically for both clergy tracks
- blockers are explicit and sorted
- the locked blocker set is:
  `dead`, `underage`, `married`, `wrong_sex`, `house_head`,
  `house_spouse`, `current_heir`, and `already_placed`

That means later decision work can explain why a person is excluded without
recomputing hidden house rules in UI or phase code.

### Institution holders mirror active clergy placements

The accepted institution-holder baseline now assumes:

- institution ownership lives in `institution_holder_registry_v0`
- parish holders mirror the existing `priest_person_id` field
- holder continuity preserves the original `start_turn_index` when the same
  person remains assigned
- abbey holders derive deterministic `abbot` versus `abbess` role labels from
  the active clergy placement
- vacant institutions remain in the registry with stable ordering

### Phase persistence is bounded but live

The accepted baseline now includes:

- a narrow `syncClergyPlacementPersistence(...)` helper in the people domain
- preview-state rehydration during phase-owned household aging
- applied-turn rehydration during close-turn succession flow
- parity between state-level and `house.*` registry mirrors after sync

The sync remains conditional on clergy-placement evidence already existing, so
the accepted replay line stays stable for runs that never place anyone on a
clergy track.

## Explicit `v0.3` non-goals

The accepted clergy baseline intentionally does **not** include:

- live player-facing send-to-orders or convent decision UX
- autonomous clergy placement gameplay
- new bishopric or abbey world generation beyond the bounded holder scaffold
- bounded snapshot or play-screen rendering of clergy registries
- `src/sim/turn.ts` orchestration changes

Those remain later backlog scope, not missing work inside this epic.

## Handoff to later social and integrator work

Follow-on work may now treat the following as locked inputs:

- clergy-track ids, placement sources, and blocker codes are canonical
- active clergy placements can be mirrored to institution holders deterministically
- parish holder continuity survives preview aging and applied turn advancement
- institution-holder lookup can read a stable per-institution ownership surface

Follow-on work should not assume the following already exist:

- player-facing choice prompts for clergy placement
- reporting or UI surfaces that render raw clergy placement history
- fully world-scoped bishopric or abbey assignment gameplay
- any cross-domain API beyond the current people-domain registry and sync seams

That leaves later decision, UI, and world work with a stable clergy-placement
contract while preserving explicit room for richer institution gameplay.

## Accepted evidence

- Opening audit: `docs/qa/clergy_placement_audit_v0.3.3.md`
- Registry seam acceptance:
  `ops/v0.3/progress/runs/V03-R3-002-T02.md`
- Institution-holder seam acceptance:
  `ops/v0.3/progress/runs/V03-R3-002-T03.md`
- Phase-persistence acceptance:
  `ops/v0.3/progress/runs/V03-R3-002-T04.md`
- Registry coverage:
  `tests/sim/clergy_track_registry.test.ts`
- Holder and persistence coverage:
  `tests/sim/institution_holder_registry.test.ts`,
  `tests/sim/clergy_phase_integration.test.ts`
