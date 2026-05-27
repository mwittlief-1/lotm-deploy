# v0.3 Manual Acceptance Round 23

Date: 2026-04-08
Branch: codex/v0.3-refactor-kickoff

Accepted tasks:
- Social `V03-R1-004-T01`
- Social `V03-R1-004-T02`

Accepted implementation:
- `docs/releases/v0.3.1_claims_and_succession_surface_audit.md`
- `src/sim/domains/people/successionRegistry.ts`
- `src/sim/phases/phase_prospects.ts`
- `tests/sim/succession_registry.test.ts`
- `ops/v0.3/progress/runs/V03-R1-004-T01.yaml`
- `ops/v0.3/progress/runs/V03-R1-004-T02.yaml`

Queue decisions:
- Marked Social `V03-R1-004-T01` and `V03-R1-004-T02` done.
- Promoted and dispatched Social `V03-R1-004-T03`.

Notes:
- The Social lane had completed the succession audit and registry seam earlier, but kickoff never reconciled that baseline and the lane was carrying a dead branch of history.
- The integrator carved a behavior-preserving seam in `src/sim/phases/phase_prospects.ts` so inheritance-claim prospect generation now routes through people-domain helpers without perturbing replay.
- This reopens Social immediately. It does not by itself reopen Engine or UI, but it restores the upstream succession path those later lanes depend on indirectly.
