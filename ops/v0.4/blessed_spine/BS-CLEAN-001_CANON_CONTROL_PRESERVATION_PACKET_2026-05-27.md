# BS-CLEAN-001 Canon/Control Preservation Packet

Date: 2026-05-27

Track: v0.4 blessed-spine cleanup

Status: Preservation packet complete

## Purpose

This packet locks the first cleanup rule: preserve canon and control material
before moving, deleting, or re-promoting runtime material. It does not promote
runtime behavior, update golden baselines, or bless the current dirty tree as
future-main source.

The current checkout remains a quarantine/evidence worktree. The future spine
should import only material that passes an explicit promotion packet.

## Preserved Material

The active canon/control set currently inspected for preservation contains 68
files:

| Path group | File count | Role |
|---|---:|---|
| `SOURCE_STATUS_INDEX.md` | 1 | Source-status authority |
| `AGENTS.md` | 1 | Agent guardrails |
| `docs/DUPLICATE_DOCS_STATUS.md` | 1 | Duplicate cleanup policy/evidence |
| `docs/product/**` | 47 | Product canon and scope |
| `docs/architecture/**` | 4 | Runtime/architecture canon |
| `ops/v0.3/CODEX_CANON_HANDOFF_README.md` | 1 | Canon handoff control |
| `ops/v0.3/STOP_RULES.md` | 1 | Stop-rule authority |
| `ops/v0.3/DECISION_AUTHORITY_MATRIX.md` | 1 | Decision authority |
| `ops/v0.3/CODEX_AUTONOMY_LADDER.md` | 1 | Automation/autonomy control |
| `ops/v0.4/control/**` | 3 | v0.4 control plane |
| `ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md` | 1 | v0.4 coordination evidence |
| `ops/v0.4/blessed_spine/**` | 6 | Cleanup/promotion track |

Git status for this preserved set at inspection time: 66 untracked rows, 1
index-modified row, and 1 worktree-modified row. That is expected for this
cleanup branch; preservation here means "do not lose or casually overwrite,"
not "already committed."

## Promotion Rule

Canon/control material may be copied or cherry-picked into a clean spine before
runtime code. It remains the arbitration layer for all later promotion packets.

Runtime behavior is not authorized by this packet. Any runtime file, test,
fixture, generated artifact, or historical packet must still pass a separate
promotion packet.

## Guardrails

- Do not edit numbered duplicate files in active paths.
- Do not treat generated artifacts as source truth.
- Do not promote old `src/sim/turn.ts`, `src/App.tsx`, event deck material, or
  UI surfaces by default.
- Do not stage the whole dirty tree as a cleanup shortcut.
- When a clean worktree exists, import canon/control first, then import fixed
  reference-world data, then promote runtime seams one tranche at a time.

## Output

This packet is paired with `source_status.yaml`, which records the current
status of canon/control, duplicate quarantine, generated evidence, legacy
runtime, and the XMAP alpha reference-world candidate.
