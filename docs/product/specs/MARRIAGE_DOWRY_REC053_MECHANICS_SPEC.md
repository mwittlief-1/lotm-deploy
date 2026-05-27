# Marriage / Dowry / REC-053 Mechanics Spec


**Project:** Lords of the Manor
**Corpus:** Final Canon Complete Corpus v0.1
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CANON_ACCEPTED` for v0.3 REC-053 semantics, SP-001 dowry planning anchors, and SP-003 planning boundaries.
`MECHANICAL_SPEC_NEEDED` for Marriage Opportunity schema, rank/quality application, receipt fields, and rejection/counteroffer contracts.
`RED_ZONE_BLOCKED` for live marriage market implementation, live A/R/T initialization or mutation, claims, succession/regency runtime, and dowry debt/settlement behavior beyond the hard funding gate.

## v0.3 accepted rules

- Standard dowry anchor: 30 Coin.
- Ordinary dowry band: 20-50 Coin.
- Cash due must be fundable at acceptance/signing.
- No hidden dowry debt, arrears, installments, land-backed dowry, dower, jointure, or debt instruments.
- A/R/T relationship terms classify proposals as `clean`, `strained`, or `blocked_by_relationship_terms`.
- A/R/T does not hide candidates, reorder candidates, or change dowry in v0.3.

## SP-003 required negative cases

Future proof planning must include explicit rejection cases for hidden debt, arrears/installments, land-backed settlement, dower, jointure, debt instruments, and A/R/T-modified dowry. REC-053 remains narrow: it classifies relationship terms and does not authorize a live marriage market, candidate hiding/reordering, dowry repricing, succession, claims, or regency behavior.

## Required contract outputs

- Marriage Opportunity schema.
- Outbound pursuit/builder constraints.
- Candidate visibility rules.
- Dowry band logic.
- Offer-quality labels.
- Fiscal receipt fields.
- Relationship-terms classification rule.
- Rejection/counteroffer receipt rules.
- Stop-rule boundary for future A/R/T deltas.
