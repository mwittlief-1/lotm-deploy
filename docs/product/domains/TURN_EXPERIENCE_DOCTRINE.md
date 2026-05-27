# Turn Experience Doctrine


**Project:** Lords of the Manor  
**Corpus:** Final Canon Complete Corpus v0.1  
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine  
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CANON_ACCEPTED` for three-year envelope and hidden chronology.  
`CANON_ACCEPTED` for SP-009 S/D/P/I proof-scenario planning.  
`MECHANICAL_SPEC_NEEDED` for exact pressure bands and interruption cadence.

## Core model

The player-facing turn is a three-year planning envelope over hidden chronology. Events do not all happen at end-of-turn; the engine should eventually support internal timestamps, cutpoints, pending actions, reactions, notices, rare interruptions, and recap.

## Pressure model

Turn pressure should be evaluated through four buckets:

1. **Standing load** — baseline coverage burden.
2. **Discretionary action load** — new work the player initiates.
3. **Pending-action pressure** — ongoing actions exposed to expiry, repricing, contest, transfer, blockage, or resolution.
4. **Interruption eligibility** — rare high-consequence uncovered cutpoints.

This replaces action-count-only thinking.

SP-009 ratifies this S/D/P/I model for scenario planning only. It does not authorize `turn.ts` wiring, live turn integration, interruption runtime, or exact thresholds.

## Pending action states

Accepted state vocabulary:

- submitted;
- in_progress;
- contested;
- repriced;
- blocked;
- transferred;
- resolved;
- expired;
- interrupted.

## Cutpoint examples

- obligation maturity;
- tithe due;
- marriage counteroffer;
- estate reprice;
- food stress;
- grievance threshold;
- death/succession;
- military summons;
- office vacancy;
- crisis relief;
- high-consequence incident escalation.

## Presentation rule

The player should receive a legible briefing, focused agenda, material notices, and recap. The chronicle should preserve durable events, not every internal tick.

## Stop rules

Codex must not jump directly to full live turn implementation or integrate proof scaffolds into `turn.ts` without authorization.
