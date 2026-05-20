# V04-QA-003 Evidence Bundle Template

Date: 2026-05-20
Status: `COMPLETE_DOCS_ONLY`
Classification: `GREEN_READY`, `DOCS_ONLY`

## v0.4 Lane Evidence Template

Every v0.4 review packet should include:

1. Lane ID and packet title.
2. Controlling authorization or CPO/CEO disposition.
3. Classification: `GREEN_READY`, `YELLOW_NEEDS_SPEC`, `RED_ZONE_DECISION_REQUIRED`, `DOCS_ONLY`, `PROOF_ONLY`, or `IMPLEMENTATION_READY`.
4. Allowed paths.
5. Forbidden paths.
6. Changed files.
7. Source-truth layer touched:
   - Reference World;
   - Generated Run State;
   - Mutable Runtime Overlays;
   - Read Models / Projections;
   - Proof Reports / QA Artifacts;
   - Docs/control-plane only.
8. Receipts/provenance produced or planned.
9. Baseline/golden/fixture policy.
10. Determinism evidence.
11. Validation commands and results.
12. GitHub blocker issue link if any.
13. Stop-rule checks.
14. Dirty-checkout caveat.
15. PTL recommendation.
16. Next safe Engineering action.

## Red-Zone Addendum

If the packet touches or requests runtime/source behavior, UI, schemas, fixtures, goldens, baselines, turn/phase wiring, or active backlog behavior, it must include:

- exact CPO/CEO approval text;
- rollback/stop conditions;
- deterministic tests required;
- acceptance evidence required;
- safe substitute if not approved.

## Baseline Policy Block

Use this text unless CPO/CEO explicitly authorizes an update:

> No baseline, golden, fixture, or schema update is requested or authorized by this packet. Any drift must be explained row-by-row and escalated before update.

## Dirty Checkout Block

Use this text when the shared checkout is dirty:

> This packet accepts only the files and evidence listed in its changed-files section. It does not accept unrelated dirty runtime/source, UI, test, fixture, schema, docs, QA, control-plane, or backlog state.
