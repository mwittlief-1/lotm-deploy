# Action Outcome Event Catalog Seed


**Project:** Lords of the Manor  
**Corpus:** Final Canon Complete Corpus v0.1  
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine  
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CATALOG_CONTENT`; SP-012 catalog-only planning is ratified.

Action-outcome events are consequences of state-changing processes. They should not be mixed with incidents or lifecycle events.

SP-017 confirms four legacy event rows require rewrite as future action-outcome rows. They are not accepted Local Matter rows and do not authorize live hooks.

## Example outcome families

- obligation paid/deferred/refused;
- marriage proposal accepted/rejected/countered;
- office appointed/removed/vacant;
- repair/build/maintenance completed or failed;
- petition granted/refused;
- investigation verified/failed/produced rumor;
- local order appeased/suppressed/escalated;
- military summons answered/substituted/refused;
- succession/vacancy resolved/unresolved.

## SP-017 rewrite candidates

These legacy rows should become future action-outcome rows tied to build, repair, maintain, or related mechanics after the relevant action rows, effect rows, and acceptance evidence are approved.

| Legacy row | Future outcome direction | Current status | Blockers |
|---|---|---|---|
| `evt_skilled_mason` | Build/repair/maintain opportunity or quality outcome | Requires rewrite | Action row linkage, capacity/coverage boundary, no hidden labor/resource mutation |
| `evt_supply_shortage` | Build/repair/maintain supply constraint or delay outcome | Requires rewrite | Resource-cost model, receipt rule, no live shortage mutation |
| `evt_small_theft_tools` | Tool/material loss or maintenance disruption outcome | Requires rewrite | Justice/order boundary, receipt rule, no live resource/justice effects |
| `evt_extra_hands` | Temporary labor assistance or coverage outcome | Requires rewrite | Labor/standing coverage model, no free automation or hidden capacity mutation |

All four rows remain catalog rewrite candidates only. They are not implementation authority.

## Required row fields

- source action;
- outcome state;
- affected entities;
- resource effects;
- relationship hooks;
- knowledge effects;
- receipts;
- pending-action transition;
- chronicle eligibility;
- implementation/status;
- stop-rule status.

No outcome row authorizes live action hooks, runtime schema promotion, resource mutation, A/R/T mutation, incidents, obligations, justice/coercion, or turn-pipeline integration.
