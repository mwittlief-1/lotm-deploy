# CourtOS Internal UAT Corps

This package separates build ownership from internal acceptance.

## Ownership

- Engineering owns implementation, observability, test contracts, deterministic QA, fixes, and regression coverage.
- The QA/UAT Orchestrator owns scenario execution, persona-agent supervision, evidence quality, independent reproduction, and the UAT verdict.
- The Production Architecture Reviewer owns the independent architectural readiness verdict.
- Matt receives the build for human playtest only after the internal promotion report passes.

UAT agents and the architecture reviewer are read-only. They report findings; they do not fix them.

## Commands

```bash
pnpm run uat:config
pnpm run uat:internal:dry-run
pnpm run uat:internal
```

`uat:internal` performs the engineering gate, starts the built Vite preview on an available local port, runs the UAT and architecture lanes concurrently, and writes immutable run evidence to `qa_artifacts/courtos_uat/<run-id>/`.

Use `--base-url` to assess an already-running build. `--skip-engineering` is diagnostic only: it can gather agent evidence but cannot promote a build to human playtest because the runner has no engineering-gate proof.

```bash
node scripts/runCourtosInternalUat.mjs --base-url http://127.0.0.1:4173/courtos-home.html
node scripts/runCourtosInternalUat.mjs --skip-engineering
```

## Promotion policy

A build passes internal UAT only when:

- the engineering gate passes;
- the UAT Orchestrator returns `pass`;
- the architecture reviewer returns `pass`;
- no unresolved P0 or P1 finding exists;
- all required lanes return evidence;
- any accepted P2 exception is explicitly recorded.

The runner computes the final promotion result mechanically from the two independent reports. It does not allow the implementation agent to waive a failed lane.

## Evidence contract

Every finding identifies the build, lane, scenario, House selector, actor/authority context, route, expected and actual behavior, reproducibility, confidence, and evidence locations. Screenshots alone are insufficient for source-fidelity or authority findings; those require a source/API/read-model reference as well.

## Adding regressions

When a finding is verified, add its scenario ID to the permanent regression set and add a deterministic test when possible. Keep a fixed golden suite while rotating exploratory scenarios for novelty.
