# V04 Red-Zone Packet: Local Matters Live Tranche

Date: 2026-05-20
Status: `RED_ZONE_OVERRIDE_REQUIRED`
Recommended disposition: `AUTHORIZE_V0_4_LOCAL_MATTERS_FIRST_LIVE_MUTATION_TRANCHE`

## Proposed Scope

Authorize one narrow Local Matters runtime tranche using the SP-017 candidate rows as the source catalog. The first implementation should choose a small subset, write receipt-backed incident overlays or equivalent authorized runtime records, and preserve deterministic replay.

## Allowed Files

To be finalized by Engineering packet, likely limited to:

- Local Matters/incident domain files under `src/sim/domains/experience/**` or a new incident-domain seam;
- event classification or Local Matters catalog adapters only where needed;
- focused tests for deterministic Local Matters behavior;
- QA evidence artifacts for the packet.

## Forbidden Files

- `ops/v0.3/backlog.yaml`
- schemas, fixtures, goldens, baselines unless separately authorized;
- broad `src/sim/turn.ts` rewrite;
- broad phase-order changes;
- production UI integration beyond a separately named surface;
- Food, Coin, Labor, Condition, Order, A/R/T, obligation, marriage, claims, justice, or coercion mutation outside the selected row scope.

## Write APIs Required

- Authorized incident/local-matter write seam.
- Receipt/provenance writer for material changes.
- Deterministic ID and ordering helper.
- No direct mutation of Reference World or Generated Run State.

## Receipt / Provenance Requirements

Each live Local Matter must record:

- row id and canonical planning name;
- visibility class;
- source condition or trigger;
- player knowledge confidence;
- material effect, if any;
- receipt id;
- blocked/omitted effects;
- deterministic ordering key.

## Deterministic Tests Required

- Same seed emits same Local Matter rows and receipts.
- Unrelated state remains unchanged when no candidate triggers.
- Candidate order is stable.
- Hidden/background rows do not appear as interactive prompts.
- No legacy 62-event row is promoted without row-package status.

## Baseline / Golden Policy

No baseline, golden, fixture, or schema update is authorized by this decision unless the exact file set is named in a later approval. Drift requires row-level explanation.

## Rollback / Stop Conditions

Stop if implementation requires:

- UI response flow not named in approval;
- turn/phase wiring beyond the approved seam;
- Food/Coin/Labor/Condition/Order mutation not explicitly scoped;
- A/R/T mutation;
- justice/coercion outcome mutation;
- baseline/golden/fixture update;
- nondeterministic replay output.

## Acceptance Evidence

- Changed files.
- Row subset implemented.
- Receipt/provenance examples.
- Deterministic test results.
- Preflight/replay evidence when feasible.
- Stop-rule checklist.
- Confirmation that unrelated red-zone mechanics remain blocked.

## Exact CPO/CEO Approval Text

`AUTHORIZE_V0_4_LOCAL_MATTERS_FIRST_LIVE_MUTATION_TRANCHE`

Authorize one narrow Local Matters runtime tranche from the SP-017 candidate rows. Scope must preserve deterministic execution, receipt/provenance evidence, no baseline/golden/fixture/schema update unless separately named, no broad UI/turn wiring, and no live Food/Coin/Labor/Condition/Order/A/R/T/obligation/marriage/claims/justice mutation beyond the explicitly selected row effects.

## Safe Substitute If Not Approved

`AUTHORIZE_V0_4_LOCAL_MATTERS_CATALOG_AND_PROOF_ONLY_NO_LIVE_MUTATION`

Continue row package, visibility classification, probability proof, UAT script, and receipt design only.

## Safe Parallel Work While Waiting

- V04-LOCAL-001 row package refinement.
- V04-QA-001 UAT materials.
- V04-QA-003 evidence bundle template.
- V04-TOOL-001 source-status hygiene.
