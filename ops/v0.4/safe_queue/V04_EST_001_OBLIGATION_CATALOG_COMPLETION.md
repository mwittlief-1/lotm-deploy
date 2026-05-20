# V04-EST-001 Obligation Catalog Completion

Date: 2026-05-20
Status: `COMPLETE_DOCS_ONLY`
Classification: `GREEN_READY`, `DOCS_ONLY`

## Boundary

The obligation catalog is planning content only. This packet does not authorize live dues, arrears, settlement, Food mutation, Coin mutation, UI integration, turn-pipeline integration, schemas, tests, fixtures, or golden baselines.

## Required Row Fields

Every v0.4 obligation row should carry:

- obligation id;
- owed by;
- owed to;
- authority basis;
- form: Coin, Food, service, rights, attendance, hospitality, or other;
- recurrence;
- due timing;
- amount or planning band;
- deferral/refusal rules;
- relationship hooks;
- receipt rules;
- settlement/arrears status;
- implementation authorization status.

## Initial Completion Matrix

| Obligation type | Authority basis | Form | Planning anchor | Missing before implementation |
|---|---|---|---|---|
| Tithe | Church/custom | Goods-first / Coin-equivalent | 2 Coin-equivalent/year | Counterparty specificity, goods settlement, receipt class. |
| Tax | Liege/custom | Coin | 1 Coin/year, 0.5-2 band | Rank/fee basis, collector state, receipt class. |
| Scutage | Military service commutation | Coin | 4 Coin event, 2-6 band | Fee basis, service alternative, refusal effects. |
| Relief | Succession/tenure | Coin | 10 Coin event, 6-12 band | Succession trigger, collector state, hardship rules. |
| Aids | Feudal/courtly demand | Coin/Food/service | Needs spec | Trigger taxonomy and refusal consequences. |
| Dowry settlement | Marriage alliance | Coin | 30 Coin standard, 20-50 band | Only hard-funding gate accepted; no debt instruments. |
| Military service | Tenure/service | Men/service/Coin | Needs spec | Readiness source and no tactical warfare boundary. |
| Court attendance | Household/court obligation | Time/capacity | Needs spec | CourtOS capacity interaction. |
| Church patronage/dues | Church/custom | Coin/Food/status | Needs spec | Distinguish tithe from patronage. |
| Household wages/support | Household office/service | Coin/support | 3 Coin/year household service | Staff tiers and retainer/professional source. |
| Estate maintenance/upkeep | Land/improvements | Coin/Labor/Condition | 10-30 percent, 20 percent anchor | Live maintenance red-zone authorization. |
| Hospitality/status | Social expectation | Coin/Food/capacity | Needs spec | Separate celebration/status from Local Matters. |
| Crisis relief | Local obligation | Coin/Food/Labor | Event pressure bands | Local Matters and Food/Labor mutation authority. |

## Completion Recommendation

Complete row fields and receipt taxonomy before reopening live obligation settlement or collector rebasing. Treat collector rebasing after death/succession as a separate red-zone decision.
