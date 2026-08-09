# CourtOS Primary Task Handoff and Agent Retirement V1

**Prepared:** 2026-08-09
**Purpose:** replace the oversized orchestration thread with a repository-backed engineering handoff and a bounded-context operating model.

## 1. Controlling product direction

- CourtOS is the official Steam-desktop UAT runtime candidate.
- The current 24-responsibility / eight-room hierarchy is the only UI hierarchy.
- Navigation remains place-first: Inner Council → domain room → responsibility workspace → details/evidence.
- Source data and admitted read models are authoritative. Fixtures, presentation samples, and historical 49-atom material cannot become runtime truth.
- Inner Council membership and responsibility ownership are distinct.
- Individual-house data, people, portraits, heraldry, manors, and assignments must resolve through data contracts; none may be hard-coded for Pearwick Hall.
- Player-readable SLM language is non-authoritative presentation over admitted compact facts. Receipts and authoritative records remain structured facts.

## 2. Repository boundaries

### CourtOS product and desktop client

- Repository: `/Users/matt_wittlief_home/Documents/GitHub/lotm-deploy`
- Working branch at handoff: `codex/courtos-uat-integration`
- Handoff commit identity: `bbf3ed4bee4c576dc190369c4c8a5d06857f4d1c`
- Ownership: CourtOS UI/UX, room and responsibility presentation, planning persistence, desktop packaging, map presentation, SLM presentation, and UAT tooling.

### World runtime

- Repository: `git@github.com:mwittlief-1/merecross-world-runtime.git`
- Local checkout at handoff: `/private/tmp/merecross-world-runtime-fast`
- Branch: `codex/runtime-bootstrap`
- Handoff commit identity: `7e0516e7e8e5fbd251c8ede06ec349b0c6d2acb1`
- Ownership: admitted genesis inputs, immutable world releases, deterministic runtime clocks, effects, receipts, Matters, reports, and replay verification.
- Explicitly not owned here: CourtOS UI, map art/rendering, desktop packaging, SLM presentation, or mutable player planning state.

Runtime migration checkpoints already present at `7e0516e`:

1. deterministic 36-month kernel and replay verification;
2. repository/source boundary checks;
3. pre-manifest source register and schema audit;
4. UAT1 importer ownership policy;
5. planned importers for Household, Education, Health/Care, Manor Operations, Security, Records, and Correspondence;
6. enforced planned-importer coverage;
7. development-only release and runtime fixtures that cannot be promoted as canonical truth.

## 3. Current CourtOS checkpoint

The CourtOS **working tree**, not the named commit by itself, contains the accumulated implementation and remediation work based on `bbf3ed4bee`:

- nine entry surfaces and the shared 24-responsibility navigation shell;
- Household and fiscal responsibility depth;
- House Command / assignment planning foundations;
- desktop packaging and packaged-data staging;
- native realm → county → manor viewer integration;
- fiscal Scribe pilot with alias-only, deterministic fact rendering;
- planning-journal hardening work;
- room-art and UX consistency work;
- engineering, persona, architecture, and accessibility regression coverage.

### Tracked-candidate warning

The clean startup audit found **115 changed tracked entries and 219,369 untracked files** in the CourtOS worktree. Commit `bbf3ed4bee` does not contain the desktop client, Foundation A build/verification scripts, desktop promotion runner, desktop package verifier, or Scribe pilot. Those implementations are currently untracked or mixed with staged/unstaged work. The handoff document and child inventory are also newly untracked at this checkpoint.

Therefore `bbf3ed4bee` is a base identity, not a reproducible desktop-candidate identity. Before clean-checkout promotion, the intended CourtOS implementation must be isolated into an authoritative tracked commit without sweeping unrelated user material into it. The branch also lacks a configured upstream and a cached matching origin ref.

The last integrated persona review reported no P0 findings and three P1 gates before human-playtest promotion:

1. alternate assignment candidates were not yet fully populated for every responsibility scope;
2. packaged real-model Scribe latency was not yet measured at an acceptable target;
3. a tracked, reproducible clean rebuild remained required.

Subsequent work closed the packaged alternate-steward staging defect for the admitted 16-type House-default candidate release. Exact-scope candidate doctrine for Manor Stewardship, Manor Fiscal, Security, Works, Franchise, Revenue Rights, Portfolio Oversight, and Church Rights remains distinct and must not be inferred from House affiliation.

## 4. Root-child audit

Audited parent task: `019f5dbd-2811-7913-9a72-20c3ba0512f7`.

Machine-readable child ledger: `docs/current/COURTOS_PRIMARY_TASK_CHILD_RETIREMENT_INVENTORY_V1.csv`.

- Direct child tasks: **55**
- Finished child tasks: **55**
- Child tasks with recorded Git branch and SHA: **52**
- Read-only/review tasks without a Git commit: **3**
- Child-task session volume: approximately **24.7 GiB**
- Database edge status was stale: all 55 were still marked `open` despite completed work.

### Repository-preserved implementation and QA families

The following work families are consolidated into the CourtOS branch history and/or the current `bbf3ed4bee` checkpoint:

- production hardening, architecture review, authority review, P1 remediation;
- Pearwick interaction and authority UAT;
- planning-contract, compact-report, and SLM-boundary review;
- map R&D, LOD geometry, map art, 3D restoration, manor fabric, spatial parity, and visual acceptance;
- 24-responsibility projection and wiring;
- room configuration, room art, responsibility flow, category completion, and accessibility/persona UAT;
- finance consistency and full-flow replay;
- fiscal SLM pilot, UAT, independent review, and real-time language work;
- alternate-steward data staging and responsibility-workbench work;
- stewardship planning and integrated architecture/persona review.

### Three non-commit lanes

1. `estate_manor_candidate` — implementation summary preserved in the parent handoff: typed spatial boundary hardening completed; verification was blocked by macOS dataless-file hydration.
2. `production_architecture_uat` — read-only architecture review; no source changes were expected.
3. `visual_room_uat` — read-only visual UAT; no source changes were expected.

These three are retirement-eligible because their purpose was review/evidence, not ownership of unmerged source. The latest integrated architecture and persona reviews supersede their gate role.

## 5. Retirement and storage disposition

### Approved and completed cleanup

- Approximately 20 GiB of obsolete generated economy generations and freeze material was removed while retaining the current generation.
- Approximately 19.6 GiB of duplicated backups, UAT workspaces, and two clean inactive worktrees was removed; their branches were preserved.

### Approved but not executed in this session

- Approximately **9.2 GiB** of duplicate economy data in three worktrees is approved for APFS clone/deduplication against the verified canonical copy.
- The current filesystem policy exposes `.codex` read-only, so this operation must run in a session with explicit write access to the affected worktree paths.

### Task-history disposition

- Preserve the current root task as an archive and stop using it for daily production work.
- Retire/archive all 55 completed direct children after the repository handoff is accepted.
- Do not delete the root or child logs until the clean task has successfully resumed from this document and the user confirms the historical archive is no longer needed.
- Session-log cleanup is separate from product-repository cleanup; never mutate Codex state databases directly.
- Execution note: `codex archive <session-id>` was attempted through the supported CLI on 2026-08-09 and failed with `failed to initialize state database` because this session has read-only access to `.codex`. The archive operation therefore remains pending a session with supported state-write access; no direct database workaround was used.

## 6. New-task operating contract

All future agents must receive a file-backed handoff and bounded context:

1. Use `fork_turns: "none"` by default.
2. If recent conversational nuance is indispensable, fork only the smallest recent-turn window.
3. Pass exact repository, branch, commit, controlling contracts, source hashes, scope, exclusions, and acceptance tests in the task prompt.
4. Never use full-history forks from the archived root.
5. Each implementation lane must finish with source committed or clearly identified in the shared worktree, exact tests, and a concise repository-backed handoff.
6. Read-only UAT and architecture lanes must write their report into `docs/qa/` or `qa_artifacts/`; a thread-only verdict is insufficient.
7. Finished child tasks are archived promptly after their handoff is captured.

## 7. Clean primary task startup prompt

Clean bounded-context continuation created from this handoff: `/root/clean_primary_engineering` (`019fe53c-7a2e-78e1-8f96-8e454acdf31c`). It was started with `fork_turns: "none"`.

> Continue Merecross engineering from `docs/current/COURTOS_PRIMARY_TASK_HANDOFF_AND_AGENT_RETIREMENT_V1.md`. Treat that file and the repositories/commit identities it names as the startup context; do not inherit the archived orchestration thread. First verify the two repository identities and current working-tree state without cleaning or reverting user changes. Then select the highest-value unblocked CourtOS or world-runtime production milestone, state the exact scope and dependencies, implement it, and run proportional verification. Use bounded/file-backed delegation only; never fork full conversation history.

## 8. First clean-task priorities

1. Isolate the intended CourtOS desktop/Foundation A/Scribe/assignment implementation into an authoritative tracked commit without sweeping in unrelated dirty-worktree material.
2. Produce a clean-checkout CourtOS desktop build from that tracked state and re-run the packaged Steam-desktop promotion suite.
3. Measure real packaged Scribe latency and implement the agreed lazy-load/warm-service strategy without weakening the compact-fact boundary.
4. Complete exact-scope assignment-candidate contracts for the eight responsibility families not covered by House-default eligibility.
5. Continue world-runtime migration from the pre-manifest register, next addressing the unblocked Marriage/Dynasty planned importer; Church follows after its remaining Product decisions.
