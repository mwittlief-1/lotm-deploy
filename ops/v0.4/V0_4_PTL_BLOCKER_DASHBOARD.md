# v0.4 PTL Blocker Dashboard

Date: 2026-05-20
Status: `OPEN`

## Active Blockers

| ID | Label | Status | GitHub Issue | Affected Lane | Decision Needed | PTL Recommendation | Safe Parallel Work |
|---|---|---|---|---|---|---|---|
| V04-BLOCK-002 | `CPO_DECISION_REQUIRED` | Open | https://github.com/mwittlief-1/lotm-deploy/issues/23 | Guided testing / playtest readiness | Decide whether guided testers remain blocked until after v0.4 planning or a guided-test planning packet should be prepared. | Keep guided testers blocked; allow UAT material preparation only. | `V04-SAFE-004`. |
| V04-BLOCK-005 | `CPO_DECISION_REQUIRED` | Open | https://github.com/mwittlief-1/lotm-deploy/issues/26 | Estate / Obligation / Maintenance | Decide actor accounting tiers and world fiscal bridge boundary before actor Fiscal State or XMAP fiscal seeding implementation. | Prepare decision packet; keep work docs/proof-only. | `V04-SAFE-006`, `V04-SAFE-011`, `V04-SAFE-012`. |
| V04-BLOCK-006 | `CPO_DECISION_REQUIRED` | Open | https://github.com/mwittlief-1/lotm-deploy/issues/27 | Household / Dynasty Visibility | Decide minimum hidden-world seed contract and nearby fiscal/labor visibility rules. | Prepare provenance/visibility contract; do not implement runtime sourcing. | `V04-SAFE-003`, `V04-SAFE-007`, `V04-SAFE-011`. |

## Resolved Blockers

| ID | Label | Resolution | Date | Notes |
|---|---|---|---|---|
| V03-CLOSE-001 | `CPO_DECISION_REQUIRED` | `CPO_CEO_CLOSE_V0_3_WITH_SOFT_TIME_PERFORMANCE_DEBT_RECORDED` | 2026-05-20 | v0.3 closure recorded; soft-time performance debt preserved. |
| V04-NOTIFY-001 | `CPO_DECISION_REQUIRED` | GitHub notification smoke test created and closed: https://github.com/mwittlief-1/lotm-deploy/issues/22 | 2026-05-20 | Assignment, direct mention, and labels verified. |
| V04-BLOCK-001 | `CEO_PRIORITY_REQUIRED` | `V0_4_UNBLOCK_AND_NOTIFY_BUNDLE_001` approved for safe planning queue and red-zone packet preparation | 2026-05-20 | Initial safe queue proceeded; first runtime tranche still needs red-zone approval. |
| V04-BLOCK-003 | `RED_ZONE_OVERRIDE_REQUIRED` | `AUTHORIZE_V0_4_LOCAL_MATTERS_FIRST_LIVE_MUTATION_TRANCHE`: https://github.com/mwittlief-1/lotm-deploy/issues/24 | 2026-05-20 | First v0.4 implementation frontier is `V04-LOCAL-LIVE-001`; Engineering dispatch packet created. |
| V04-BLOCK-004 | `SCHEDULER_BLOCKED` | `AUTHORIZE_V0_4_BACKLOG_ACTIVATION_PROTOCOL_DRAFT_NO_V0_3_BACKLOG_MUTATION`: https://github.com/mwittlief-1/lotm-deploy/issues/25 | 2026-05-20 | Protocol draft created; no active v0.3 backlog mutation authorized. |

## Dashboard Maintenance

- Add every blocker packet here before or at the same time it is sent for CPO/CEO disposition.
- Create or update a GitHub issue for every real CPO/CEO blocker, assigned to `mwittlief-1` and mentioning `@mwittlief-1`.
- Keep status values to `Open`, `Resolved`, `Superseded`, or `Withdrawn`.
- Never mark a red-zone blocker resolved without explicit CPO/CEO disposition text.
