# v0.4 Safe Parallel Work Queue

Date: 2026-05-20
Status: `SAFE_PARALLEL_QUEUE_PLANNING_ONLY`

## Purpose

This queue identifies work that can proceed while CPO/CEO decisions are pending. It must remain docs/proof/tooling/catalog oriented and must not implement v0.4 runtime features.

## Queue

| ID | Work Item | Classification | Allowed Output | Forbidden Scope |
|---|---|---|---|---|
| V04-SAFE-001 | Docs cleanup and source-status routing | `GREEN_READY`, `DOCS_ONLY` | Source classification matrix; obsolete/superseded doc routing notes. | Editing runtime/source behavior or deleting historical evidence. |
| V04-SAFE-002 | v0.4 evidence bundle template | `GREEN_READY`, `DOCS_ONLY` | Review packet/evidence bundle template. | Changing validation scripts or gate behavior without approval. |
| V04-SAFE-003 | Catalog completion matrix | `GREEN_READY`, `DOCS_ONLY` | Local Matters, obligations, office/staff, action-effect row completeness tables. | Treating catalog rows as live content. |
| V04-SAFE-004 | UAT materials preparation | `GREEN_READY`, `DOCS_ONLY` | Scenario scripts, observer prompts, expected player-language checks. | Running guided testers without approval. |
| V04-SAFE-005 | Soft-time debt tracking spec | `GREEN_READY`, `PROOF_ONLY` | Performance debt report shape and command capture plan. | Treating warnings as deterministic drift or updating baselines. |
| V04-SAFE-006 | Non-mutating proof/report generation plan | `GREEN_READY`, `PROOF_ONLY` | Food sufficiency, Local Matters probability, actor fiscal posture report specs. | Live Food/Coin/Labor/obligation mutation. |
| V04-SAFE-007 | Player mental model glossary | `GREEN_READY`, `DOCS_ONLY` | Terms for estate, obligations, household, receipts, confidence, and Local Matters. | UI implementation or product-default changes. |
| V04-SAFE-008 | Blocker dashboard maintenance | `GREEN_READY`, `DOCS_ONLY` | Current blockers, options, recommendations, exact decision text. | Resolving CPO/CEO decisions autonomously. |
| V04-SAFE-009 | v0.4 active backlog activation protocol | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | Proposal for when/how to create active v0.4 backlog state. | Mutating `ops/v0.3/backlog.yaml` or scheduler behavior. |
| V04-SAFE-010 | Red-zone option packet drafting | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | Narrow options and approval language. | Implementing the chosen option. |
| V04-SAFE-011 | PM story coverage manifest | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | Coverage map for v0.4 carry-forward deltas and candidate lanes. | Treating PM stories as implementation authority. |
| V04-SAFE-012 | KPI/cost-feel band planning packet | `YELLOW_NEEDS_SPEC`, `DOCS_ONLY` | Decision packet for support capacity, scutage, relief, dowry, staffing burden, and labor pressure bands. | Changing runtime constants, fixtures, baselines, or balance behavior. |

## Parallelization Guidance

- Docs cleanup, UAT materials, source-status hygiene, and blocker dashboard maintenance can run in parallel.
- Catalog completion can run in parallel by domain if each worker owns a disjoint catalog.
- Non-mutating proof/report planning can run in parallel with catalog work, but proof scripts should not be implemented until separately authorized.
- Any task that wants to touch `src/**`, `tests/fixtures/**`, schemas, goldens, baselines, UI, turn/phase wiring, or active backlog behavior must stop and use the blocker protocol.

## PTL Recommendation

Start with `V04-SAFE-001`, `V04-SAFE-003`, `V04-SAFE-004`, `V04-SAFE-005`, `V04-SAFE-007`, `V04-SAFE-008`, `V04-SAFE-011`, and `V04-SAFE-012` while CPO/CEO selects the first v0.4 tranche.
