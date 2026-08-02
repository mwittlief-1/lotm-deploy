# Phase Five — CourtOS Actor-Context Person-Report Projection Handoff v1

**Status:** implementation-ready read-model seam; no source admission, runtime
write, action, or player rollout is authorized by this handoff.

## Purpose

This handoff turns the current Knowledge doctrine into a concrete CourtOS
projection boundary:

```text
admitted domain receipt/evidence
  -> domain semantic report
  -> admitted Track-1/Track-2 compacted projection + opaque presentation ref
  -> resolved actor-context + responsibility instance + entitlement
  -> CourtOS person-report card
```

The report is not a person profile, generic adviser view, raw-receipt browser,
or source of authority. It is a knowledge-safe expression for the current
named actor carrying a current responsibility instance.

## Reused current contracts

- The canonical 24-type control plane is
  [Responsibility Control-Plane Registry V3](PHASE_FIVE_COURTOS_RESPONSIBILITY_CONTROL_PLANE_REGISTRY_V3.json).
- Current production-oriented CourtOS projections expose responsibility rows,
  people, presence, docket, and explicit non-runtime boundaries through
  [the 1120 read-model service](../../src/server/courtos1120Api/readModelService.ts).
- Journey establishes the accepted CourtOS pattern: upstream entitlement,
  source-attributed semantic reports, receipt references only in development
  UAT, and no generic action.

## New pure projection contract

[`personReportProjection.ts`](../../src/ui/readModels/courtos1120/personReportProjection.ts)
requires each upstream report row to include:

| Required binding | Why it is required |
| --- | --- |
| `acting_house_id` and exact `entitled_viewer_person_id` | Prevents cross-House or cross-actor presentation. |
| `responsibility_instance_id` and stable responsibility key | Prevents title, Council, kinship, or person identity from becoming entitlement. |
| Named author and source kind | Preserves the difference between a responsible-party report, provider report, office report, observer account, or domain receipt. |
| Observed period, received cutpoint and ordinal, display cutpoint and ordinal, and posture | Makes a report accountable and time-scoped without accepting upstream prose. Display identity must equal the viewer request, and received information cannot be later than the requested monotonic cutpoint. |
| Admitted compacted projection identity, schema, generation, digest, manifest ID/digest, admission state, and runtime boundary | Ensures CourtOS consumes P5-WI-053 output rather than correspondence/news mechanics or raw event data. The row must match a separately supplied trusted admission policy; it cannot admit itself. |
| Opaque presentation reference | Selects a later player-readable treatment without making generated prose authoritative input. |
| Non-empty audit-only `source_refs` | Makes the upstream report traceable without placing raw records on a normal player card. |
| `runtime_authority` and source status | Candidate and non-runtime evidence fails closed. |
| Upstream entitlement | The UI never derives access itself. |

The player card uses `confirmed`, `reported`, `assessed`,
`unknown_or_withheld`, or `conflicted_or_stale`. It exposes receipt references
only when both direct-evidence entitlement and the development/UAT provenance
flag are true. Its fallback summary is deterministic and generated locally from
the posture. Every inbound object uses exact-shape validation, so raw or disguised
prose fields such as `summary`, `upstream_summary`, `content`, or `display_text`
are rejected at the consumer boundary rather than ignored. Domain command links
must be owned by the report's exact workspace; the adapter invents no generic
action.

The incoming domain contract is the exported
`CourtOsPersonReportReadPortV1`: a domain reads rows for the supplied
actor-context, while the CourtOS projection independently validates scope,
cutpoint, source status, and entitlement. A read-port implementation cannot
bypass those gates.

## Current boundary

The January 1120 read-only CourtOS SQLite generation cannot yet supply these
rows: it reports no runtime receipt model and has `runtime_authority=false`.
The adapter therefore intentionally renders its data fail-closed today. It is
ready for the in-progress data/lifecycle work to inject admitted semantic
report rows into the current CourtOS UI path without changing the control
plane or promoting current candidate assignments.

## UAT acceptance for the eventual wiring

1. A report is visible only when house, actor-context, responsibility instance,
   effective cutpoint, and upstream entitlement all match.
2. Withheld, non-runtime, or non-entitled rows produce no card, identifiers,
   metadata, opaque presentation reference, receipt, command, or count signal;
   they are player-indistinguishable from absent rows.
3. Raw upstream prose and every undeclared field are rejected even if attached
   to an otherwise admitted compacted projection.
4. Normal player delivery exposes a deterministic bounded posture and an
   opaque presentation reference only;
   raw receipt references require explicit development/UAT evidence access.
5. The adapter creates no mutation, generic action, or authority; domain-owned
   commands remain exact-workspace typed links and enter the normal action
   pipeline elsewhere.
6. A UAT run follows repository promotion order: engineering QA, independent
   agent UAT, architecture review, replayed defect verification, then human
   playtest.

## Verification

Focused contract tests:

```text
npx --no-install vitest run --reporter=verbose \
  tests/ui/courtosPersonReportProjection.test.ts
```

Run CourtOS verification under the repository-pinned Node 20.20.2
(`.node-version`). The native SQLite read-model dependency is ABI-specific;
using another Node major can fail before a read-model test reaches application
code.

Current evidence: 10/10 focused consumer tests, strict CourtOS TypeScript, and
the complete 28-file CourtOS suite (198/198 tests) pass. An independent
read-only consumer-boundary review found no remaining P0/P1 after replaying the
actor, metadata-suppression, manifest-binding, cutpoint, exact-shape, and
workspace-ownership regressions.

The seam is pure and does not change `App.tsx`, API transport, action intake,
SQLite, source data, or runtime state.
