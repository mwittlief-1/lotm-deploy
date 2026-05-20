# v0.4 Engineering Start Prompt

Date: 2026-05-20
Status: `READY_TO_USE`

Use this prompt to start the v0.4 Engineering loop.

```text
Act as Orchestrator / Engineering Lead for v0.4 in /Users/matt_wittlief_home/Documents/GitHub/lotm-deploy.

First create or update a new v0.4 Engineering automation so future Engineering runs do not inherit v0.3-only instructions. If the Codex automation tool is available, create an automation named `v0.4 Engineering orchestrator loop` with ID `v0-4-engineering-orchestrator-loop`, hourly cadence, working directory `/Users/matt_wittlief_home/Documents/GitHub/lotm-deploy`, and memory file `$CODEX_HOME/automations/v0-4-engineering-orchestrator-loop/memory.md`. If the automation tool is not available, create local automation artifacts under `$CODEX_HOME/automations/v0-4-engineering-orchestrator-loop/automation.toml` and `memory.md`, matching the existing Codex automation TOML style, and leave the automation paused for Matt to enable.

Before making code changes, read:

- `AGENTS.md`
- `SOURCE_STATUS_INDEX.md`
- `ops/v0.3/CODEX_CANON_HANDOFF_README.md`
- `ops/v0.3/STOP_RULES.md`
- `docs/product/PRODUCT_CONSTITUTION.md`
- `docs/product/V1_SCOPE_GUARDRAILS.md`
- `docs/architecture/SOURCE_OF_TRUTH_HIERARCHY.md`
- `docs/architecture/RUNTIME_RESET_CANON.md`
- `docs/architecture/OVERLAY_RECEIPT_READMODEL_DOCTRINE.md`
- `docs/architecture/DETERMINISM_CONTRACT.md`
- `ops/v0.3/V0_3_CLOSURE_RECORD.md`
- `ops/v0.4/README.md`
- `ops/v0.4/V0_4_NOTIFICATION_PROTOCOL.md`
- `ops/v0.4/V0_4_CPO_CEO_DECISION_LOG_2026-05-20.md`
- `ops/v0.4/V0_4_BACKLOG_ACTIVATION_PROTOCOL_DRAFT.md`
- `ops/v0.4/V0_4_PTL_BLOCKER_DASHBOARD.md`
- `ops/v0.4/V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md`
- `ops/v0.4/safe_queue/V04_LOCAL_001_LOCAL_MATTERS_ROW_PACKAGE.md`
- `docs/product/catalogs/LOCAL_MATTERS_CATALOG.md`
- `ops/v0.3/catalog_disposition/SP-017_LEGACY_62_EVENT_DISPOSITION.md`

Current authority:

- v0.3 is closed with soft-time performance/reliability debt recorded.
- CPO/CEO authorized `AUTHORIZE_V0_4_LOCAL_MATTERS_FIRST_LIVE_MUTATION_TRANCHE` in GitHub issue #24.
- CPO/CEO authorized `AUTHORIZE_V0_4_BACKLOG_ACTIVATION_PROTOCOL_DRAFT_NO_V0_3_BACKLOG_MUTATION` in GitHub issue #25.
- The current Engineering frontier is `V04-LOCAL-LIVE-001 Local Matters first live mutation tranche`.
- Work only from `ops/v0.4/V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md`.
- Return a review packet before asking PTL to accept anything.

Do not start guided testers. GitHub issues #23, #26, and #27 remain open unless later comments resolve them.

Implementation goal:

Implement one narrow SP-017-row-backed Local Matters runtime slice that supports `Legible Playable Pressure`, preserves determinism, and carries receipt/provenance evidence.

Preferred first subset:

- `evt_boundary_dispute` / Tenant Boundary Dispute; or
- `evt_peasant_petition` / Hardship Petition; or
- `evt_tool_breakage` / Manor Worksite Accident.

Avoid broad Food/store-loss rows unless the packet explicitly explains resource mutation boundaries.

Allowed paths:

- `src/content/events.ts`
- `src/sim/phases/phase_events.ts` only for narrow existing event-phase integration, not phase-order rewiring
- `src/sim/domains/experience/**`
- a new narrowly named Local Matters domain file under `src/sim/domains/**`
- focused tests under `tests/sim/**` or `tests/ui/**` only if required for deterministic proof
- packet/evidence docs under `ops/v0.4/**` or `docs/qa/**`

If you need any path outside that list, pause and request PTL approval before editing.

Forbidden:

- `ops/v0.3/backlog.yaml`
- `ops/v0.3/progress/latest.yaml`
- active backlog behavior mutation
- `docs/schemas/**`
- `tests/fixtures/**`
- goldens and baselines
- broad `src/sim/turn.ts` changes
- phase-order rewiring
- production UI integration beyond existing read/report seams
- runtime preset initialization
- live maintenance Coin/Labor
- obligation collector rebasing
- broad Food/Coin/Labor/Condition/Order mutation
- A/R/T mutation
- marriage, claims, succession, regency, justice, or coercion mutation
- promotion of the full legacy 62-event deck into live canon.

Engineering rules:

- Inspect relevant files before editing.
- Use `apply_patch` for manual edits.
- Keep changes minimal and scoped.
- Do not revert unrelated dirty work.
- Preserve deterministic ordering and stable IDs.
- Do not mutate Reference World or Generated Run State.
- Any material Local Matters effect must go through a named domain/phase seam with source row id, source condition, effect class, receipt/provenance record or explicit receipt-intent placeholder, and deterministic ordering.

Validation:

Run focused tests relevant to changed files, then:

- `npm run ops:v0.3:validate -- --json`
- `npm run canon:validate:all`

If feasible after implementation:

- focused Vitest for Local Matters/event behavior
- `npm run preflight`
- `npm run seed:replay:batch` twice when runtime mutation could affect replay

Return one PTL-facing review packet under `ops/v0.4/review_packets/` with:

- files changed;
- selected Local Matters rows;
- implementation summary;
- source-truth layer touched;
- receipt/provenance evidence;
- deterministic tests run and results;
- replay/preflight status or reason not run;
- baseline/golden/fixture confirmation;
- stop-rule checklist;
- dirty-checkout caveat;
- next safe Engineering action.

Also update Engineering automation memory with the run summary.

Do not mark the lane accepted yourself. PTL must review and accept or return the packet.
```
