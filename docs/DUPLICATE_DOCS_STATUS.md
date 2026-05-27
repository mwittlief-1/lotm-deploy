# Duplicate Docs Status

**Date:** 2026-05-16  
**Scope:** Active numbered duplicate docs and doc-adjacent artifacts outside `_archive/duplicates/**`.  
**Status:** Classification-only cleanup. No files were moved or deleted.

## Classification

All active-path files matching numbered duplicate patterns such as `* 2.*`, `* 3.*`, and similar are classified as `DO_NOT_USE_FOR_CURRENT_CANON`.

This applies even when the unsuffixed counterpart is missing or deleted in the current dirty worktree. A numbered duplicate may be restored only through an explicit restoration/archive-cleaning task that records why it is being promoted.

## Handling Decision

This pass does not quarantine files because the worktree already contains extensive unrelated changes and deleted/untracked progress artifacts. Moving many files would make the docs-only canon reconciliation harder to review and could accidentally mask unrelated worktree state.

Future cleanup should move confirmed historical duplicates under `_archive/duplicates/YYYY-MM-DD/` or remove them through an explicit archive-cleaning task.

## Active Duplicate Inventory Summary

Command used:

```sh
find docs ops/v0.3/progress qa_artifacts -path './_archive/duplicates/*' -prune -o -type f \( -name '* 2.*' -o -name '* 3.*' -o -name '* 4.*' -o -name '* 5.*' -o -name '* 6.*' -o -name '* 7.*' -o -name '* 8.*' -o -name '* 9.*' \) -print | sort
```

Result: 121 active numbered duplicate files.

By area:

| Area | Count | Status |
|---|---:|---|
| `docs/qa` | 5 | `DO_NOT_USE_FOR_CURRENT_CANON` |
| `docs/releases` | 11 | `DO_NOT_USE_FOR_CURRENT_CANON` |
| `docs/templates` | 1 | `DO_NOT_USE_FOR_CURRENT_CANON` |
| `docs/ux` | 8 | `DO_NOT_USE_FOR_CURRENT_CANON` |
| `ops/v0.3/progress/runs` | 94 | `DO_NOT_USE_FOR_CURRENT_CANON` |
| `qa_artifacts/playtest_ops` | 2 | `DO_NOT_USE_FOR_CURRENT_CANON` |

## Representative Active Duplicates

- `docs/qa/uat_scenario_pack_v0.3 2.md`
- `docs/releases/v0.3.1_claims_and_succession_closeout 2.md`
- `docs/templates/v0.3.4_playtest_bug_report_template 2.md`
- `docs/ux/v0.3.4_playtest_reporting_expectations 2.md`
- `ops/v0.3/progress/runs/2026-04-09_manual_acceptance_round30 2.md`
- `ops/v0.3/progress/runs/V03-R3-002 2.md`
- `qa_artifacts/playtest_ops/uat_scenario_gate 2.json`

## Required Future Quarantine Rule

Do not edit these numbered duplicate files as source material. If a future task confirms they are purely historical artifacts, move them to:

```text
_archive/duplicates/YYYY-MM-DD/
```

Keep the original subdirectory context under the archive path when practical.
