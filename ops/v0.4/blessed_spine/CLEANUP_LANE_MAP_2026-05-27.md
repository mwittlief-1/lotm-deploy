# Blessed Spine Cleanup Lane Map

Date: 2026-05-27
Status: lane map / no execution
Scope: cleanup work needed to make the current quarry navigable while future mainline promotion proceeds

## Boundary

This lane map defines cleanup work. It does not execute cleanup, delete files, move files, restore files, stage, commit, deploy, update baselines, update fixtures, or promote runtime code.

## Cleanup Strategy

Cleanup should reduce authority confusion first and file count second.

No lane should mix:

- canon/control preservation;
- duplicate quarantine;
- evidence/archive decisions;
- runtime candidate extraction;
- test/fixture adjudication;
- implementation.

Each lane must name exact allowed write paths and exact forbidden paths.

## Lane BS-CLEAN-001: Canon And Control Preservation

Goal: preserve active authority before any runtime or archive cleanup.

Allowed focus:

```text
SOURCE_STATUS_INDEX.md
AGENTS.md
docs/DUPLICATE_DOCS_STATUS.md
docs/product/**
docs/architecture/**
ops/v0.3/CODEX_*README*.md
ops/v0.3/STOP_RULES.md
ops/v0.3/DECISION_AUTHORITY_MATRIX.md
ops/v0.3/CODEX_AUTONOMY_LADDER.md
ops/v0.3/second_pass_contracts/**
ops/v0.3/catalog_disposition/**
ops/v0.4/control/**
ops/v0.4/blessed_spine/**
```

Action options:

- preserve as active control;
- add source-status entries;
- report missing/duplicate canonical control files.

Forbidden:

```text
src/**
tests/**
qa_artifacts/**
review_packets/**
_archive/**
runtime behavior
```

## Lane BS-CLEAN-002: Active Numbered Duplicate Quarantine

Goal: move active-path numbered duplicates out of source-bearing paths.

Current target count: 121 active duplicates.

Known groups:

| Group | Count |
|---|---:|
| `ops/v0.3/progress/runs` | 94 |
| `docs/releases` | 11 |
| `docs/ux` | 8 |
| `docs/qa` | 5 |
| `qa_artifacts/playtest_ops` | 2 |
| `docs/templates` | 1 |

Allowed action after dispatch:

- move exact listed duplicates to `_archive/duplicates/YYYY-MM-DD/<original-path>`;
- create/update a manifest with original path and hash;
- leave unsuffixed canonical files in place.

Forbidden:

- editing duplicate contents;
- restoring a duplicate as canonical;
- touching unsuffixed canonical files;
- touching runtime/source/test files.

## Lane BS-CLEAN-003: Evidence And Review Packet Manifesting

Goal: convert untracked evidence sprawl into a navigable manifest and retention decision.

Current pressure:

- `review_packets`: 130M and 783 dirty rows.
- `qa_artifacts`: 328M and 495 dirty rows.
- 86 untracked zip files across the checkout.
- 40 zip files directly under `review_packets`.

Allowed first action:

- create manifest-only inventories;
- classify each group as `retain_in_repo`, `external_archive_candidate`, `stale_evidence_review`, or `local_disposable_candidate`;
- do not delete or move without a second dispatch.

Forbidden:

- deleting QA artifacts;
- deleting review packets;
- treating evidence as source truth;
- importing evidence into blessed source.

## Lane BS-CLEAN-004: Tracked Deletion Adjudication

Goal: decide the 100 tracked deletions by owner and exact path.

Buckets:

| Area | Examples | Required owner |
|---|---|---|
| `docs/qa/**` deleted v0.3.5 evidence docs | fixture/closeout docs | QA/PTL |
| `ops/v0.3/progress/runs/**` deleted run logs | closure evidence | PTL |
| `qa_artifacts/**` deleted evidence | v0.3.5 JSON artifacts | QA/PTL |
| `scripts/**` deleted generators | stale tooling or still needed | Tooling/QA |
| `src/**` deleted runtime/UI helpers | old runtime candidate or retire | Engineering/PTL |
| `tests/**` deleted tests/fixtures | restore, accept deletion, or hold | QA/PTL |

Allowed action in first pass:

- report-only adjudication table.

Allowed action in later execution pass:

- restore exact files from HEAD;
- accept exact deletions with replacement evidence;
- hold exact deletions for future promotion/retire packets.

Forbidden:

- broad `git restore`;
- directory-level restore;
- accepting fixture/baseline deletion without authority;
- changing file contents.

## Lane BS-CLEAN-005: Runtime Candidate Register

Goal: stop treating dirty runtime as either sacred or trash. Register it as candidate substrate.

Allowed focus:

```text
src/**
scripts/**
tests/**
```

Output:

- candidate register by subsystem;
- source-truth layer guess;
- old dependencies;
- forbidden imports;
- proposed fate: `candidate`, `quarantine`, `replace-rebuild`, `retire`, `decision-required`.

Forbidden:

- modifying runtime files;
- updating tests;
- fixing compilation;
- baseline updates;
- behavior changes.

Priority candidate groups:

1. Reference-world readers/importers/validators.
2. Generated-run-state builders that can be separated from legacy sync.
3. Receipt/log/PhaseResult shape.
4. Pure read models with no `ensure*`, `sync*`, `normalize*`, or mutation.
5. Ledger/receipt boundaries after legacy manor detachment.

Priority quarantine groups:

1. Old `src/sim/turn.ts`.
2. Legacy `RunState.manor` source paths.
3. Legacy event deck effects.
4. UI read paths that mutate state.
5. Tests/fixtures that assert old manor authority.

## Lane BS-CLEAN-006: Local Disposable Output Cleanup

Goal: remove trivial non-evidence local output only after exact list approval.

Candidates:

```text
.DS_Store
test-results/**
var/**
node_modules/.vite/vitest/results.json
```

Current `.DS_Store` count outside `.git` and `node_modules`: 13.

Forbidden:

- deleting anything under `qa_artifacts/**` unless separately classified as local disposable;
- deleting review packets;
- deleting tracked files.

## Lane BS-CLEAN-007: Clean Worktree Setup

Goal: prepare the future blessed-spine mainline in a clean worktree after control/canon preservation.

This lane is not part of the first five safe steps unless separately authorized.

Required decisions:

- base branch or exact SHA;
- worktree path;
- branch name;
- first import scope;
- whether to create a quarantine snapshot branch/tag first.

Forbidden:

- using current dirty working tree as the base;
- broad copying from dirty checkout;
- importing runtime/UI/test files without promotion packet.

## Go-Forward Agent Rule

Every future task should declare one write class:

```text
read_only
canon_control
promotion_packet
cleanup_execution
runtime_candidate_register
implementation
test_fixture
generated_evidence
deployment
```

If a task cannot declare one class, split it before work begins.

