# V04-LOCAL-LIVE-001 Engineering Dispatch Packet

Date: 2026-05-20
Status: `AUTHORIZED_FOR_ENGINEERING_IMPLEMENTATION`
Controlling disposition: `AUTHORIZE_V0_4_LOCAL_MATTERS_FIRST_LIVE_MUTATION_TRANCHE`
Source issue: `https://github.com/mwittlief-1/lotm-deploy/issues/24`

## Goal

Implement one narrow Local Matters first live mutation tranche that supports v0.4's `Legible Playable Pressure` thesis while preserving determinism, receipts/provenance, and red-zone boundaries.

## Authorized Scope

Engineering may implement a small SP-017-row-backed Local Matters runtime slice.

The implementation must:

- select a narrow subset from the 11 SP-017 candidate Local Matters rows;
- preserve deterministic execution under fixed seed/input;
- emit or prepare receipt/provenance evidence for material changes;
- distinguish interactive, automatic visible, background visible, and hidden evidence-only rows;
- avoid promoting the full legacy 62-event deck into canon or live behavior;
- return a review packet before PTL acceptance.

## Suggested First Subset

Prefer one or two rows with high legibility and bounded effects:

- `evt_boundary_dispute` / Tenant Boundary Dispute; or
- `evt_peasant_petition` / Hardship Petition; or
- `evt_tool_breakage` / Manor Worksite Accident.

Avoid starting with broad Food/store loss rows unless the packet explicitly explains resource mutation boundaries.

## Allowed Paths

Engineering may propose changes only in a narrow set of paths needed for this tranche:

- `src/content/events.ts`
- `src/sim/phases/phase_events.ts` only for narrow existing event-phase integration, not phase-order rewiring
- `src/sim/domains/experience/**`
- a new narrowly named Local Matters domain file under `src/sim/domains/**`
- focused tests under `tests/sim/**` or `tests/ui/**` only if required for deterministic proof
- packet/evidence docs under `ops/v0.4/**` or `docs/qa/**`

If Engineering needs a path outside this list, it must pause and request PTL approval before editing.

## Forbidden Paths And Changes

- `ops/v0.3/backlog.yaml`
- `ops/v0.3/progress/latest.yaml`
- `docs/schemas/**`
- `tests/fixtures/**`
- goldens and baselines
- broad `src/sim/turn.ts` changes
- phase-order rewiring
- production UI integration beyond existing read/report seams
- runtime preset initialization
- live maintenance Coin/Labor
- obligation collector rebasing
- broad Food/Coin/Labor/Condition/Order mutation
- A/R/T mutation
- marriage, claims, succession, regency, justice, or coercion mutation

## Required Write API Discipline

No ad hoc direct mutation. Any material Local Matters effect must go through a named domain or phase seam with:

- deterministic ordering;
- stable row id;
- source condition;
- effect class;
- receipt/provenance record or explicit receipt-intent placeholder;
- no Reference World or Generated Run State mutation.

## Required Validation

Engineering should run focused commands relevant to the changed files, then:

- `npm run ops:v0.3:validate -- --json`
- `npm run canon:validate:all`

If feasible after implementation:

- focused Vitest for Local Matters/event behavior;
- `npm run preflight`;
- `npm run seed:replay:batch` twice when runtime mutation could affect replay.

## Required Return Packet

Return one review packet with:

- files changed;
- selected Local Matters rows;
- implementation summary;
- source-truth layer touched;
- receipt/provenance evidence;
- deterministic tests run and results;
- replay/preflight status or reason not run;
- baseline/golden/fixture confirmation;
- stop-rule checklist;
- dirty-checkout caveat;
- next safe Engineering action.

## PTL Acceptance Criteria

PTL may accept only if:

- scope is confined to the authorized Local Matters tranche;
- deterministic tests pass or any failure is clearly unrelated and non-blocking;
- no baseline/golden/fixture/schema update occurs;
- no active v0.3 backlog behavior changes;
- no standing red-zone deferral is reopened except this Local Matters authorization;
- receipt/provenance evidence is sufficient for player-legibility review.
