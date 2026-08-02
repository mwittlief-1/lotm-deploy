# Phase Five — CourtOS UAT Integration Candidate v1

**Status:** engineering integration candidate; no new source, runtime, actor,
command, or player-presentation authority is granted by this package.

## Purpose

This candidate closes the clean-checkout gap between the tracked CourtOS
runtime baseline and the already verified planning, Journey, and compacted
information consumer work. It makes the implementation and its regression
evidence reproducible without changing the admission posture of any input.

## Included implementation seams

- Authority-scoped, versioned planning lifecycle and local-UAT persistence.
- Journey lifecycle, deterministic replay, Foundation-A adapters, and the
  purpose-owning CourtOS read surfaces.
- Compacted information consumer accepting only an independently admitted
  projection plus an opaque presentation reference.
- UAT scenarios and contract tests for source, authority, temporal, Journey,
  planning, and player-prose boundaries.

## Source posture

| Input family | Candidate use | Authority boundary |
| --- | --- | --- |
| Current CourtOS and Household SQLite contracts | Immutable read projection | Existing admitted/withheld fields remain controlling. |
| XMAP route/topology support | Deterministic route and spatial test input | Does not prove presence, ownership, lodging, or a Journey. |
| Founder-directed residence successor | Opening-presence adapter evidence | `runtime_authority=false`; a separate exact admission grant is required before runtime seeding. |
| Foundation-A Journey calibration | Deterministic development calculation | Provisional and non-authoritative; unsupported postures remain withheld. |
| Planning lifecycle | Structural persistence and validation | Does not infer actor authority or domain feasibility. |
| Compacted report seam | Consumer-boundary proof | P5-WI-053 remains held; no player prose is consumed or created. |

## Explicit exclusions

- No proposal or candidate row is promoted as runtime truth.
- No actor, responsibility assignment, Journey, Matter, correspondence,
  receipt, historical outcome, or SLM prose is invented.
- No hosted write API is opened.
- No engine feasibility or economic rule is recreated in CourtOS.
- No later Phase-V lane or admission gate is waived.

## Promotion sequence

1. All declared CourtOS runtime and test inputs are tracked or deliberately
   removed from the runtime closure.
2. The clean-checkout input verifier passes from this branch.
3. Engineering QA passes under the pinned Node 20 runtime.
4. A clean worktree reproduces the same build and test result.
5. Independent persona UAT and production architecture review run against the
   exact candidate build.
6. Verified P0/P1 findings are replayed before founder playtest.

## Still-held product gates

This integration candidate does not make the planning experience executable.
Hosted planning remains blocked on admitted actor/session context, Track-2
scope and command receipts, a production persistence adapter, and the accepted
submitted-plan runtime seam. Player-readable generated language remains
blocked on the P5-WI-053 admission and later entitlement/presentation gate.
