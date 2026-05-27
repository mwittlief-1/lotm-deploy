# Lords of the Manor — Final Canon Complete Corpus v0.1

**Collision resolution:** This file preserves the package `README.md` content without overwriting the existing root `README.md`. It is a corpus intake note, not a higher authority than `SOURCE_STATUS_INDEX.md`, `docs/product/PRODUCT_CONSTITUTION.md`, or `docs/product/V1_SCOPE_GUARDRAILS.md`.

**Date:** 2026-05-15  
**Prepared by:** CPO cockpit synthesis  
**Status:** Near-final canon corpus for review and Codex handoff preparation  

This package extends **Batch A Spine v0.1** into the broader canon corpus: domain doctrines, mechanical-spec contracts, catalog seeds, and requirements-derivation scaffolding.

## Important status distinction

This is a **canon/documentation corpus**, not an implementation authorization.

Codex may use this package to:

- read product and architecture canon;
- derive capabilities and requirements;
- create proof-lane/task packets;
- prepare implementation plans;
- identify gaps and RFIs;
- maintain traceability.

Codex may not use this package to self-authorize:

- live runtime mutation;
- schema promotion;
- UI integration;
- turn-pipeline integration;
- A/R/T initialization or mutation;
- live economy writes;
- live obligations/dues/arrears/settlement;
- marriage market implementation;
- generalized succession/regency/wardship;
- claim enforcement;
- replacement of source-truth hierarchy.

## Package structure

```text
docs/product/                         # Batch A product spine
docs/architecture/                    # Batch A architecture spine
docs/product/domains/                 # domain doctrine docs
docs/product/specs/                   # mechanical-spec contracts and queues
docs/product/catalogs/                # catalog seeds and schema docs
docs/product/CAPABILITY_MAP.md        # first-pass capability derivation map
docs/product/REQUIREMENTS_REGISTER.md # first-pass requirement register skeleton
ops/v0.3/                             # Batch A operating docs + derivation ops
```

## Recommended use order

1. Review this README and `SOURCE_STATUS_INDEX.md`.
2. Treat Batch A docs as the controlling spine.
3. Treat domain doctrines as final-canon candidates.
4. Treat mechanical specs and catalogs as structured contracts/queues unless explicitly marked accepted.
5. Have Codex derive requirements only after reading `CODEX_CANON_HANDOFF_README.md`, `STOP_RULES.md`, `DECISION_AUTHORITY_MATRIX.md`, and `REQUIREMENTS_DERIVATION_PROTOCOL.md`.

## Top unresolved areas

The following still require targeted harmonization before live implementation:

1. Economy numeric anchors: scutage, relief, fees, dowry, Coin/Food units.
2. Marriage/dowry REC-053 mechanics and outbound opportunity builder.
3. Food sufficiency mechanics and live mutation authorization.
4. XMAP / holding-fabric legal rules.
5. Local Matters / Manor Events v0.3 live catalog.
6. Improvements / mill rights / franchise mechanics.
7. A/R/T delta math and visibility/confidence model.
8. CourtOS capacity conversion from attention-hour scaffold to game-facing units.
