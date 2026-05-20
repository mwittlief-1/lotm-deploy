# V04-LEG-002 Receipt And Explanation Vocabulary Audit

Date: 2026-05-20
Status: `COMPLETE_DOCS_ONLY`
Classification: `GREEN_READY`, `DOCS_ONLY`

## Purpose

Normalize v0.4 planning language so Engineering and CPO/CEO can distinguish player-facing explanation, proof evidence, and blocked mechanics before implementation begins.

## Preferred Vocabulary

| Use | Preferred term | Avoid / constrain | Notes |
|---|---|---|---|
| Material change explanation | Receipt | Debug event, proof row | Receipts explain player-relevant change; proof rows support review. |
| Current derived display | Read model | Source truth | Read models are projections only. |
| Player uncertainty | Known, Likely, Possible | Hidden truth as fact | Confidence rails must respect knowledge limits. |
| Local incident surface | Local Matter | Generic event card | Local Matters are a subset, not the whole old event deck. |
| Automatic non-interactive event | Background event | Local Matter prompt | Not all visible events require player response. |
| Hidden or deferred incident | Hidden evidence-only row | Missing content | Some rows are intentionally not player-visible. |
| Estate pressure | Coin, Food, Labor Pressure, Condition, Order, Obligations | Single money/unrest score | Keep the six-dimension economy vocabulary distinct. |
| Obligation party | Counterparty | Generic tax sink | Must identify who is owed and by what authority. |
| Runtime change | Overlay | Reference rewrite | Runtime state changes should append overlays where authorized. |
| Closure evidence | Gate evidence | Product authority | Passing evidence does not authorize blocked mechanics. |

## Explanation Rules

- Say "what changed" in player terms before exposing technical proof.
- Say "why it changed" with authority, condition, action, or incident basis.
- Say "where it came from" with source/provenance when material.
- Say "what remains blocked" when a surface is scaffold-honest.
- Do not call a catalog row live content.
- Do not describe a red-zone candidate as implementation-ready without the decision string that authorizes it.

## High-Risk Terms

| Term | Risk | v0.4 handling |
|---|---|---|
| baseline | May imply approval to update goldens/fixtures. | Use only in validation context with explicit owner. |
| debug | May leak proof language into player explanation. | Keep debug as secondary developer evidence. |
| event | Too broad for Local Matters. | Classify as Local Matter, background, hidden, action outcome, lifecycle, or macro/regional. |
| obligation | May hide owed-to/authority/form. | Require owed-by, owed-to, authority, form, timing, status. |
| fiscal state | May imply fully ledgered actors. | State actor tier: ledgered, semi-ledgered, or abstract. |

## Output Use

Use this audit as the vocabulary baseline for v0.4 UAT scripts, evidence packets, red-zone decision packets, and future UI copy specs. It does not authorize production UI copy changes.
