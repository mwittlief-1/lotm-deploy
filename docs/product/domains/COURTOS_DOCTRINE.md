# CourtOS Doctrine


**Project:** Lords of the Manor  
**Corpus:** Final Canon Complete Corpus v0.1  
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine  
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`STRONG_DRAFT` for doctrine.  
`CANON_ACCEPTED` for SP-008 coverage-first planning direction.  
`MECHANICAL_SPEC_NEEDED` for slot counts, attention units, capacity conversion, and degradation curves.

## Definition

CourtOS is the execution, capacity, and delegation layer for the house. It determines how work is covered, who carries it, with what competence, risk, delay, reliability, and relationship consequence.

CourtOS is **not** the action taxonomy.

## Core principles

- The player cannot do everything.
- Capacity is scarce.
- Household composition and officers matter.
- Standing responsibilities consume real capacity.
- Delegation shifts load; it does not erase load.
- Baseline coverage must be modeled before discrete action weights.
- Exact slot counts are deferred.

SP-008 ratifies coverage-first planning and keeps exact slot counts deferred.

## Actor/capacity sources

Potential capacity-bearing actors include:

- head of house;
- spouse;
- heir;
- adult children/collateral kin;
- steward;
- chaplain or clergy connection;
- marshal or military officer;
- household staff manager;
- reeve/bailiff/local official;
- retainers/envoys/agents;
- acting regent/guardian/caretaker where appropriate.

Ordinary staff should usually be grouped, not individually simulated.

## Coverage first

Every manor requires coverage. Multi-manor holdings do not collapse into one generic portfolio. Portfolio oversight adds overhead and does not replace manor-level coverage.

Coverage quality states:

- Uncovered;
- Thin;
- Adequate;
- Strong;
- Overcovered.

## Office vs role

The system must distinguish:

- office/title/status;
- functional role;
- actual assignment;
- authority basis;
- scope;
- capacity load;
- reporting path.

Informal or suboptimal assignment must be possible, with risk.

## Stop rules

Codex must not:

- lock exact slot counts;
- make standing responsibilities free automation;
- collapse CourtOS into the action registry;
- implement live action-throughput changes without authorization;
- silently create trait-based runtime behavior;
- bypass receipt/recap legibility for delegated outcomes.
