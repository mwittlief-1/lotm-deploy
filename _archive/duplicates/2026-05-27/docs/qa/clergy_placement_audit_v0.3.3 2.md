# v0.3.3 Clergy Placement Surface Audit

## Scope

This audit covers the current person-placement surfaces for clergy and
institution holders before the `V03-R3-002` baseline adds a people-domain
clergy track seam.

This document remains the opening `T01` baseline. The accepted release-facing
summary now lives in `docs/qa/clergy_placement_closeout_v0.3.3.md`.

## Current seeded surfaces

- `src/sim/types.ts`
  already carries additive graph scaffolding for `institutions` and
  `service_records`, plus a parish institution shape with `priest_person_id`.
- `src/sim/peopleFirst.ts`
  guarantees both registries exist on migrated or freshly synchronized states.
- `src/sim/worldgen.ts`
  seeds a deterministic local parish institution as `i_parish_player_local`
  and stores the id on both `locals.parish_institution_id` and
  `manor.parish_institution_id`.
- `src/sim/tiers.ts`
  already treats parish, bishopric, and abbey actors as tierable institutions,
  so clergy placements can later matter to world-scope visibility.
- `src/sim/domains/people/relationshipEngine.ts`
  already recognizes the local clergy person, the parish institution id, and
  parish institution records as church-side relationship counterparties.

## Current placement and persistence patterns

- There is no people-domain clergy placement registry yet.
- The only live church-holder field is `priest_person_id` on parish
  institutions, and the worldgen seed leaves it `null`.
- The closest existing persistence pattern is the court-side office and
  service-record seam in `src/sim/domains/court/officeRegistry.ts`, which
  keeps stable ids, preserves start turns when holders do not change, and
  mirrors legacy assignment facts into normalized registries.
- Existing `service_records[]` are still court-oriented. They do not currently
  distinguish clergy tracks, convent placements, or institution-holder tenure.

## Minimum institution-holder needs

- A deterministic clergy track registry is needed before any send-to-orders or
  convent decision can persist beyond one local helper call.
- An institution-holder registry is needed because only parishes currently
  expose a named holder field, while bishoprics and abbeys need the same
  canonical holder lookup surface later.
- Holder continuity must preserve the original placement turn when the same
  person remains assigned across later turn rebuilds.
- The registry should attach directly to runtime state from the people domain;
  there is currently no `src/sim/domains/realm/**` directory to own a richer
  realm-side implementation yet.

## First clergy-track insertion points

- Add a people-domain `clergy_track_registry` seam for deterministic candidate
  and active placement facts.
- Add a people-domain `institution_holder_registry` seam that mirrors active
  clergy placements onto seeded institutions and preserves continuity.
- Keep initial holder writes scoped to existing seeded institution fields,
  especially `parish.priest_person_id`, until later integrator work wires the
  new seams into phase wrappers and bounded reporting.

## Non-goals for this baseline

- No new `turn.ts` or phase-wrapper orchestration in this audit tranche.
- No new realm-domain directory or public cross-domain API expansion.
- No narrative or UI rendering work beyond documenting where the current
  holder and church surfaces already live.
