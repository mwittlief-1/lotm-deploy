# Tiered Active World Doctrine


**Project:** Lords of the Manor  
**Corpus:** Final Canon Complete Corpus v0.1  
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine  
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CANON_ACCEPTED` for world-tiering posture.  
`MECHANICAL_SPEC_NEEDED` for promotion/demotion triggers and drift resolution.

## Doctrine

The full world exists as durable source truth, but runtime simulation depth is tiered, relevance-driven, and reversible.

## Rejected alternatives

- Full active simulation of every actor at player-adjacent fidelity is rejected for near-term architecture.
- Thin stage world where only player-adjacent actors are real is rejected.

## Rules

- Actors do not exit existence; they demote or promote between fidelity tiers.
- Promotion is resolution, not creation.
- Distant actors should already have minimum data or deterministically resolve missing depth from seed-stable generation and aggregate drift.
- Tier changes should be receipt/provenance aware where player-visible.

## Typical tiers

Final names are not locked, but the conceptual layers are:

- player/immediate household and estates;
- visible T1 local/liege/church/marriage-relevant world;
- known-but-shallow regional actors;
- aggregate/offscreen world truth.

## Stop rules

Codex must not fake world actors into existence at promotion time in a non-deterministic or source-truth-breaking way.
