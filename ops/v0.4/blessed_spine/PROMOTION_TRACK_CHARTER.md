# Blessed Spine Promotion Track Charter

Date: 2026-05-27
Status: docs/control policy draft
Scope: repo cleanup and source promotion posture for the v0.4/v1 overhaul

## Purpose

This charter turns the current dirty checkout into a controlled source quarry for a clean, world-first blessed spine.

The current runtime is not sacred. Existing source, tests, UI, scripts, and artifacts may contain valuable material, but none of them become mainline architecture merely because they exist, pass old tests, or were once accepted in a bounded proof lane.

## Operating Model

| Workspace role | Meaning | Rule |
|---|---|---|
| Dirty/quarantine checkout | Current mixed repo state | Read, inspect, classify, cite, and extract only through approved packets. |
| Blessed spine | Future clean source-truth-controlled mainline | Accepts only promoted files and new code with declared source layer and owner. |
| Evidence/archive | Proof reports, QA artifacts, review packets, zips, old docs | Evidence only; never imported as source truth. |
| Control/canon | Active status docs, stop rules, authority matrix, control state | Preserved before runtime promotion work. |

## Default Classification

Default status is not "keep" and not "delete." Default status is `evidence_or_candidate_pending_disposition`.

| Kind | Default status | Notes |
|---|---|---|
| Active canon/control docs | Preserve first | They define authority and cleanup rules. |
| Runtime source | Candidate or quarantine | Must be re-promoted by layer. |
| UI source | Candidate or quarantine | Must consume read models and command boundaries before promotion. |
| Tests and fixtures | Evidence or candidate guards | Old assertions may protect legacy source-truth mistakes. |
| QA artifacts and proof reports | Evidence only | Can verify promotion; cannot be source truth. |
| Review packets | Evidence only | Should be indexed or archived by manifest. |
| Numbered duplicates | Quarantine | Do not edit or promote without restoration packet. |
| Generated outputs | Evidence or disposable local output | Must be manifest-classified before retention/removal. |

## Promotion Statuses

| Status | Meaning | Allowed use |
|---|---|---|
| `EvidenceOnly` | Useful history or proof, not source truth | Cite in packets only. |
| `Quarantine` | Unsafe, duplicate, stale, or wrong-layer material | Read-only unless exact cleanup/restoration packet says otherwise. |
| `Candidate` | Possibly useful material identified for promotion review | Inspect and test in isolation. |
| `Verified` | Candidate passed a named verification packet | May guide implementation, still not source truth. |
| `Blessed` | Accepted as source for one declared layer | May be imported by blessed-spine code within its boundary. |
| `Protected` | Blessed and guarded by static checks/tests | Stable foundation for adjacent work. |
| `Integrated` | Protected and wired into the clean spine | Active dependency of blessed source-truth flow. |

## Promotion Rule

A file, subsystem, or concept enters the blessed spine only through a promotion packet that names:

- source path and proposed target path;
- owner/domain;
- intended source-truth layer;
- retained concept;
- rejected legacy behavior;
- forbidden imports and dependencies;
- determinism expectations;
- tests/reports required;
- stop-rule assessment;
- acceptance decision.

Passing tests is not promotion. A prior bounded v0.4 acceptance is not promotion. A proof artifact is not promotion.

## Source-Truth Layers

Promotion packets must choose exactly one primary layer:

- `ReferenceWorld`
- `GeneratedRunState`
- `RuntimeOverlay`
- `CommandBoundary`
- `ReadModel`
- `UI`
- `Tooling`
- `CanonControl`
- `EvidenceArchive`

If a file crosses layers, the packet must split it or mark it `Quarantine` until the split exists.

## Hard Rules

1. Do not promote old `RunState.manor` authority.
2. Do not promote old `turn.ts` orchestration as the new spine.
3. Do not promote the legacy event deck as current canon.
4. Do not promote UI files that mutate sim state or rely on proof/debug truth.
5. Do not import from `qa_artifacts/**`, review packet zips, screenshots, logs, baselines, or generated proof JSON.
6. Do not promote numbered duplicate files from active paths.
7. Do not update baselines/goldens as part of cleanup.
8. Do not mix cleanup, runtime promotion, and deployment in one lane.
9. Preserve deterministic replay discipline, but do not let old replay outputs define new source truth.
10. Keep branch/worktree promotion decisions explicit.

## Agent Behavior

Agents working in this repo should stop saying only "the repo is dirty" and instead report:

- what bucket the touched files belong to;
- whether the task is control/canon, promotion, cleanup, evidence, or implementation;
- exact allowed write paths;
- exact forbidden paths;
- whether any file is being promoted or only classified.

Implementation agents must not infer authority from dirty files. Cleanup agents must not infer deletion authority from quarantine status.

## Non-Authorization

This charter does not authorize:

- deleting files;
- restoring files;
- archiving files;
- staging or committing;
- creating a new worktree;
- changing runtime behavior;
- changing schemas/fixtures/goldens/baselines;
- deploying;
- treating any runtime subsystem as blessed.

