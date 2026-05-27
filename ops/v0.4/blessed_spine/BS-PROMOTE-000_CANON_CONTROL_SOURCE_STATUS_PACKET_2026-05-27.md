# BS-PROMOTE-000 Canon/Control Source Status Packet

Date: 2026-05-27

Track: v0.4 blessed-spine promotion

Status: Started

## Decision

The first promotable layer is canon/control, not runtime. The clean spine should
begin by preserving the files listed in `BS-CLEAN-001` and registering their
status in `source_status.yaml`.

## Promotion Boundary

Promote as control material:

- `SOURCE_STATUS_INDEX.md`
- `AGENTS.md`
- `docs/product/**`
- `docs/architecture/**`
- `docs/DUPLICATE_DOCS_STATUS.md`
- `ops/v0.3/CODEX_CANON_HANDOFF_README.md`
- `ops/v0.3/STOP_RULES.md`
- `ops/v0.3/DECISION_AUTHORITY_MATRIX.md`
- `ops/v0.3/CODEX_AUTONOMY_LADDER.md`
- `ops/v0.4/control/**`
- `ops/v0.4/blessed_spine/**`

Do not promote as runtime:

- `src/**`
- `tests/**`
- `qa_artifacts/**`
- `review_packets/**`
- numbered duplicate files in any active path

## Acceptance

This packet is accepted when a clean worktree or future-main branch contains
the control material above and the duplicate audit remains clean. It does not
require `npm run qa`, because it does not authorize runtime behavior.

## Next Promotion Candidate

The next candidate layer is XMAP alpha fixed reference-world data:
`data/map/xmap_alpha_v1/**`. Promote its data and validators before promoting
UI or turn-loop consumers.
