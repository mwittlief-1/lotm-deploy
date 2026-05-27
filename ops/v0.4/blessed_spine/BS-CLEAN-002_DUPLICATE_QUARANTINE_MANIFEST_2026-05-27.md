# BS-CLEAN-002 Duplicate Quarantine Manifest

Date: 2026-05-27

Track: v0.4 blessed-spine cleanup

Status: Quarantine move complete

## Purpose

This packet removes active numbered duplicate files from working source paths without deleting their contents. The files were moved into `_archive/duplicates/2026-05-27/` with original path context preserved.

## Summary

| Metric | Value |
|---|---:|
| Files quarantined | 121 |
| Canonical conflicts | 121 |
| Suffixed files without canonical counterpart | 0 |
| Archive manifest | `_archive/duplicates/2026-05-27/MANIFEST.md` |

## Source Directories

| Original directory | Files moved |
|---|---:|
| `ops/v0.3/progress/runs` | 94 |
| `docs/releases` | 11 |
| `docs/ux` | 8 |
| `docs/qa` | 5 |
| `qa_artifacts/playtest_ops` | 2 |
| `docs/templates` | 1 |

## Policy Result

The active source tree should no longer expose numbered duplicate files from this batch. The quarantine archive is evidence-only; restoring any file from it requires an explicit promotion or restoration packet.

## Verification

Run `node scripts/repoDuplicateAudit.mjs --json` after this move. Expected result: `total_workspace_duplicates: 0`.
