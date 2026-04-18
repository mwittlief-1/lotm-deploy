# Task Dispatch Packet

Use this template when creating or tightening executable `backlog.yaml` tasks.

## Goal
- One sentence on the player-visible or contract-visible outcome.

## Exact deliverables
- Exact contract versions to add or change.
- Exact files or surfaces that must consume them.
- Exact fixtures, reports, or docs expected from the task.

## Definition of done
- Observable acceptance points only.
- Prefer “file/contract/surface/test exists and says X” over thematic language.
- If a task touches release trust, say exactly which player-facing surface must become auditable.

## Required test updates
- Name the test files to extend or add.
- Name any focused command the lane should run before handing back.
- Call out when deterministic fixtures or UAT scenarios are mandatory.

## Stop rules
- When to escalate instead of improvising.
- Which downstream task ids must not be started until integrator acceptance.
- Any integrator-only boundary or replay/golden checkpoint that blocks continuation.

## Handoff requirements
- One task-owned run report at the task `handoff.report_path`.
- Include `delivery_state`, changed files, tests run, and whether the task is truly claimable.
- If the lane made progress but missed the finish line, report `advanced_not_claimable` instead of “done”.
