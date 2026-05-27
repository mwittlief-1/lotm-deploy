# BS-CLEAN-003 Evidence Manifest

Date: 2026-05-27

Track: v0.4 blessed-spine cleanup

Status: Manifest complete; no evidence files deleted

## Purpose

This packet classifies `review_packets/**` and `qa_artifacts/**` as
evidence-only stores for the cleanup track. They are valuable for audit,
comparison, and reconstruction, but they are not live source truth and should
not be promoted into the future spine without a specific packet.

## Summary

| Path | Files | Bytes | `du -sh` | Status |
|---|---:|---:|---:|---|
| `review_packets/**` | 804 | 134743817 | 131M | EvidenceOnly |
| `qa_artifacts/**` | 625 | 342053621 | 328M | EvidenceOnly |

Git status rows across both stores at inspection time: 1296. The status mix was
1279 untracked rows, 10 worktree deletions, 5 worktree modifications, 1 staged
addition, and 1 staged deletion. This packet records the state; it does not
resolve those rows.

## Review Packet Store

Largest top-level groups:

| Group | Files | Bytes |
|---|---:|---:|
| `review_packets/V04-BLESSED-GENRUN-KING-FIRST-HOUSE-POOL-RESOLUTION-DRYRUN-007-001_REVIEW_PACKET` | 60 | 30400089 |
| `review_packets/V04-BLESSED-GENRUN-DRYRUN-006-DEMOGRAPHIC-EQUILIBRIUM-AND-BRANCH-DIVERSITY-001_REVIEW_PACKET` | 64 | 23914569 |
| `review_packets/V04-BLESSED-GENRUN-KING-FIRST-ANCESTRY-DRYRUN-004-HARDENING-EXECUTION-001_REVIEW_PACKET` | 45 | 23543409 |
| `review_packets/V04-BLESSED-GENRUN-KING-FIRST-ANCESTRY-DRYRUN-005-DEMOGRAPHY-AND-DOWNWARD-ASSIGNMENT-001_REVIEW_PACKET` | 48 | 21167224 |
| `review_packets` | 41 | 8657618 |

Extension mix: 452 Markdown, 157 JSON, 137 CSV, 40 ZIP, 17 MJS, and 1 file
without an extension.

## QA Artifact Store

Largest top-level groups:

| Group | Files | Bytes |
|---|---:|---:|
| `qa_artifacts/review_pack_alpha` | 82 | 158090705 |
| `qa_artifacts/release_readiness` | 156 | 66941245 |
| `qa_artifacts/world_foundation` | 123 | 53437939 |
| `qa_artifacts/map_seed_batch` | 35 | 18947210 |
| `qa_artifacts/v0.3_recovery` | 20 | 17038809 |
| `qa_artifacts/v0.3_plumbing` | 43 | 14077350 |
| `qa_artifacts/seed_replay` | 50 | 11517033 |

Extension mix: 540 JSON, 43 ZIP, 18 CSV, 12 PNG, 6 Markdown, 3 files without
extensions, and 3 SHA-256 sidecars.

## Policy

- Keep these stores available for audit until a separate retention decision is
  made.
- Do not import generated JSON, ZIPs, screenshots, or review bundles as active
  requirements.
- Regenerate any future golden baseline from promoted runtime code rather than
  trusting old artifact output.
- If space pressure becomes a real problem, compact only with a dated retention
  packet that records checksums before moving or deleting anything.
