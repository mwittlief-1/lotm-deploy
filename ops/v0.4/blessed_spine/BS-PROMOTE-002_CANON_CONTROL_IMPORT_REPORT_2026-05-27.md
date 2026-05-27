# BS-PROMOTE-002 Canon/Control Import Report

Date: 2026-05-27

Track: v0.4 repo cleanup / blessed-spine promotion

Status: Imported into clean cleanup track

## Source And Target

Source worktree: `/Users/matt_wittlief_home/Documents/GitHub/lotm-deploy`

Target worktree: `/Users/matt_wittlief_home/Documents/GitHub/lotm-deploy-repo-cleanup-track`

Target branch: `codex/v0.4-repo-cleanup-track`

Base branch: `codex/v0.4-control-plane`

Cleanup checkpoint cherry-pick: `6a700af`

## Imported Path Set

The following canon/control roots were copied from the dirty quarry worktree
into the clean cleanup track:

- `SOURCE_STATUS_INDEX.md`
- `AGENTS.md`
- `docs/DUPLICATE_DOCS_STATUS.md`
- `docs/product/**`
- `docs/architecture/**`
- `ops/v0.3/CODEX_CANON_HANDOFF_README.md`
- `ops/v0.3/STOP_RULES.md`
- `ops/v0.3/DECISION_AUTHORITY_MATRIX.md`
- `ops/v0.3/CODEX_AUTONOMY_LADDER.md`
- `ops/v0.4/control/**`
- `ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md`
- `ops/v0.4/blessed_spine/**`

Copied file count: 73.

## Verification

`node scripts/repoDuplicateAudit.mjs --json` in the clean cleanup track
reported:

- `total_workspace_duplicates: 0`
- `canonical_conflicts: 0`
- `suffixed_without_canonical: 0`

## Policy Result

This import promotes canon/control material only. It does not promote runtime,
UI, tests, generated QA artifacts, review packets, or XMAP runtime consumers.

The next eligible tranche is still XMAP alpha fixed data and validation
infrastructure, with data promoted before runtime consumers.
