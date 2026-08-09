# Merecross Repository Agent Guidance

## Production runtime

CourtOS is the official UAT runtime candidate. Treat prototype and design-system artifacts as reference material only; shipped UI behavior must resolve from current source data and runtime contracts.

## Continuous production operating rule

Phase Five is a production-readiness program. Agents continuously implement the
next authorized milestone within their lane; they do not stop at planning,
freeze, packaging, audit, registration, or handoff. The global plan assumes
eight working slots at 20 productive Terra hours per slot per day.

A slot may pause only when it has:

- a concrete dependency that prevents all useful in-scope production work; or
- a material product or authority choice that only the founder/CEO can make.

Report either condition immediately with the exact unblock request. Otherwise,
move directly to the next non-overlapping production checkpoint while review of
the prior checkpoint runs concurrently. Normal implementation and production
wiring inside an accepted contract and assigned lane do not require a new
permission merely because an older packet said “held,” “no dispatch,” or “no
implementation.” Those phrases remain historical records of their original
moment, not standing program policy.

Productive Terra hours count only work that directly retires a Phase Five
finished-capability milestone: implementation, canonical product/domain design,
production data construction, production art/environment work, performance
optimization, integration/runtime wiring, and substantive defect correction.
Coordination, status, planning, registration, audit/reviewer time, packers,
manifests/checksums, evidence-only documents, freeze/handoff mechanics, test
reruns without fixes, duplicate attempts, and waiting are required overhead but
count as zero productive hours.

## Rolling verification and promotion

Verification protects the production candidate; it is not the production
program and must not serialize unrelated work. For a build intended for human
playtest, use this promotion path while implementation continues on the next
authorized, non-overlapping checkpoint:

1. Engineering QA: build, preflight, unit, integration, contract, and configuration tests.
2. Independent agent UAT: the QA/UAT Orchestrator runs the persona suite against the built preview runtime.
3. Production architecture review: a read-only reviewer evaluates production readiness independently of the implementation agent.
4. Verification: reported P0/P1 defects are independently reproduced and fixed findings are replayed.
5. Human playtest: only after the internal promotion gate passes.

Implementation agents may test their own work but may not be the sole acceptance
reviewer. UAT and architecture-review agents remain read-only. Review work does
not satisfy a production slot and carries no productive-hour credit.

## Bounded delegation and task retirement

- Default every delegated implementation or review task to `fork_turns: "none"`
  and provide a repository-backed handoff containing the exact branch, commit,
  controlling contracts, source hashes, scope, exclusions, and acceptance tests.
- Use a limited recent-turn fork only when the required nuance cannot be captured
  faithfully in the handoff. Never fork the full long-running orchestration history.
- Implementation work must finish with its source and tests preserved in the
  shared worktree or a named commit. Read-only UAT and architecture work must
  write a durable report under `docs/qa/` or `qa_artifacts/`.
- Archive a completed child task after its repository handoff is captured. Do not
  leave finished child tasks open as standing context or use thread history as
  the sole source of product or engineering truth.

## CourtOS truth rules

- These rules constrain how production is wired; they are not a reason to avoid
  production wiring or to substitute proof packets for working software.
- Source data and admitted read models are authoritative; never promote candidate or presentation fixture data into runtime truth.
- Do not hard-code a House, person, portrait, heraldic asset, manor, or responsibility merely to satisfy one UAT example.
- Preserve actor authority, knowledge limitations, uncertainty, and source provenance.
- Inner Council membership is not equivalent to responsibility ownership.
- The current 24-responsibility hierarchy is the sole product/UI hierarchy. Historical atom counts and obsolete mappings are not UI concepts.
- Household membership is exposed through responsibilities. The House Book remains out of scope for Household.
- CourtOS navigation is place-first: Inner Council to domain room to responsibility workspace to details/evidence.

## Commands

- `pnpm run qa:engineering` runs the engineering-owned production gate.
- `pnpm run uat:config` validates the UAT package without invoking agents.
- `pnpm run uat:internal:dry-run` validates and prints the complete internal UAT execution plan.
- `pnpm run uat:internal` builds the preview candidate, runs the UAT persona swarm and architecture reviewer in parallel, and writes a promotion report under `qa_artifacts/courtos_uat/`.

Verified defects must add or update a repeatable regression test before closure whenever the behavior is mechanically testable.
