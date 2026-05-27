# Current Dirty Tree Inventory

Date: 2026-05-27
Status: read-only snapshot
Scope: current quarantine/evidence checkout at `/Users/matt_wittlief_home/Documents/GitHub/lotm-deploy`

## Boundary

This inventory supports the blessed-spine promotion track. It does not authorize cleanup, deletion, restore, archive movement, staging, commit, runtime changes, UI changes, fixture updates, baseline updates, deployment, or source promotion.

The current checkout is treated as quarantine/evidence. Runtime files are not sacred, but they are also not disposable without a promotion or cleanup packet.

## Commands

Snapshot commands used:

```sh
git status --porcelain=v1 -uall | wc -l
git status --porcelain=v1 -uall | awk '{code=substr($0,1,2); counts[code]++} END {for (code in counts) printf "%s %d\n", code, counts[code]}' | sort
git status --porcelain=v1 -uall | awk '{path=substr($0,4); gsub(/^\"|\"$/, "", path); split(path,a,"/"); counts[a[1]]++} END {for (area in counts) printf "%5d %s\n", counts[area], area}' | sort -nr
git diff --numstat | awk '{add+=$1; del+=$2; files++} END {printf "files %d\ninsertions %d\ndeletions %d\n", files, add, del}'
npm run repo:duplicates -- --json
du -sh _archive qa_artifacts review_packets ops docs src tests data scripts 2>/dev/null | sort -h
```

## Dirty Counts

`git status --porcelain=v1 -uall` reported 3939 dirty rows before this blessed-spine packet was created.

| Status | Count | Meaning |
|---|---:|---|
| `??` | 3601 | Untracked paths |
| ` M` | 231 | Modified tracked paths |
| ` D` | 100 | Deleted tracked paths |
| `A ` | 4 | Added in index |
| `AM` | 2 | Added in index and modified in worktree |
| `MM` | 1 | Modified in index and worktree |

Tracked diff size:

| Metric | Count |
|---|---:|
| Tracked files in diff | 334 |
| Insertions | 540400 |
| Deletions | 176896 |

## Top Dirty Areas

| Area | Dirty rows |
|---|---:|
| `ops` | 1228 |
| `review_packets` | 783 |
| `qa_artifacts` | 495 |
| `_archive` | 424 |
| `tests` | 375 |
| `src` | 324 |
| `docs` | 215 |
| `scripts` | 76 |
| `data` | 10 |
| `.github` | 3 |

Large workspace areas by disk size:

| Area | Size |
|---|---:|
| `qa_artifacts` | 328M |
| `review_packets` | 130M |
| `data` | 32M |
| `ops` | 10M |
| `src` | 7.0M |
| `_archive` | 5.5M |
| `tests` | 4.8M |
| `docs` | 2.7M |
| `scripts` | 892K |

## Duplicate Status

`npm run repo:duplicates -- --json` reports:

| Metric | Count |
|---|---:|
| Total active workspace duplicates | 121 |
| Canonical conflicts | 121 |
| Suffixed files without canonical counterpart | 0 |

Top duplicate directories:

| Directory | Count |
|---|---:|
| `ops/v0.3/progress/runs` | 94 |
| `docs/releases` | 11 |
| `docs/ux` | 8 |
| `docs/qa` | 5 |
| `qa_artifacts/playtest_ops` | 2 |
| `docs/templates` | 1 |

All active numbered duplicates remain `DO_NOT_USE_FOR_CURRENT_CANON` and should move only through an explicit duplicate-quarantine lane.

## Sensitive Source And Test Subsets

Current source subset:

| Status | Count |
|---|---:|
| `??` | 227 |
| ` M` | 87 |
| ` D` | 10 |

Current test subset:

| Status | Count |
|---|---:|
| `??` | 266 |
| ` M` | 70 |
| ` D` | 37 |
| `A ` | 2 |

Current evidence/archive subset across `qa_artifacts`, `review_packets`, and `_archive`:

| Status | Count |
|---|---:|
| `??` | 1685 |
| ` D` | 11 |
| ` M` | 5 |
| `A ` | 1 |

Other notable signals:

- 40 zip files exist directly under `review_packets`.
- 86 untracked zip files exist across the dirty checkout.
- 13 `.DS_Store` files exist outside `.git` and `node_modules`.
- Active canon/control paths are also dirty or untracked, including `SOURCE_STATUS_INDEX.md`, `docs/product/**`, `docs/architecture/**`, `docs/DUPLICATE_DOCS_STATUS.md`, and key `ops/v0.3/**` canon/control files.

## Interpretation

The dirty tree should not be treated as a broken runtime branch waiting to be normalized. It is now a mixed quarry:

- active canon/control that should be preserved first;
- evidence-only outputs and review packets that need manifest/archive policy;
- active numbered duplicates that should be quarantined;
- runtime/UI/test material that is candidate substrate only;
- tracked deletions that need owner adjudication;
- generated artifacts that should not be source truth.

The most important blocker is authority ambiguity, not file count alone.

## Immediate Cleanup Implications

Recommended first five actions:

1. Preserve active canon/control and blessed-spine policy docs in a dedicated control/canon lane.
2. Quarantine the 121 active numbered duplicates with original path context.
3. Create manifests for `review_packets/**` and `qa_artifacts/**`, then decide what stays in repo.
4. Adjudicate the 100 tracked deletions by owner and exact path.
5. Register runtime/UI/test files as promotion candidates, not active truth.

