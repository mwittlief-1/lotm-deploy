# Merecross Repository Agent Guidance

## Production runtime

CourtOS is the official UAT runtime candidate. Treat prototype and design-system artifacts as reference material only; shipped UI behavior must resolve from current source data and runtime contracts.

## Required verification order

For a build intended for human playtest, use this promotion path:

1. Engineering QA: build, preflight, unit, integration, contract, and configuration tests.
2. Independent agent UAT: the QA/UAT Orchestrator runs the persona suite against the built preview runtime.
3. Production architecture review: a read-only reviewer evaluates production readiness independently of the implementation agent.
4. Verification: reported P0/P1 defects are independently reproduced and fixed findings are replayed.
5. Human playtest: only after the internal promotion gate passes.

The implementation agent must not certify its own work. UAT and architecture-review agents are read-only and must not modify the repository.

## CourtOS truth rules

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
