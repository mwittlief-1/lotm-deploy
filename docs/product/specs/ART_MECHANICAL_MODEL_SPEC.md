# A/R/T Mechanical Model Spec


**Project:** Lords of the Manor  
**Corpus:** Final Canon Complete Corpus v0.1  
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine  
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CANON_ACCEPTED` for SP-007 hidden/banded taxonomy and planning frame.
`MECHANICAL_SPEC_NEEDED` for scale, final deltas, decay, caps, and live consumer rules; live A/R/T remains `RED_ZONE_BLOCKED`.

## Required decisions

- Scale: hidden normalized, 0–100, -100/+100, or other.
- Delta bands: minor, moderate, major, traumatic.
- Memory-marker thresholds.
- Per-turn movement caps.
- Repeated-action dampening.
- Decay/persistence rules.
- Public vs private modifier.
- Kinship/rank/legitimacy modifier.
- Lawful vs unlawful coercion modifier.
- Confidence/visibility rules.
- Edge-specific behavior.

## Future action delta matrix fields

- action/event id;
- source actor;
- target actor/entity;
- affected edge;
- A delta band;
- R delta band;
- T delta band;
- memory marker;
- confidence;
- public/private;
- decay class;
- stop-rule status.

## Stop rule

Do not implement live values or outcome effects from this spec without authorization.

SP-007 does not ratify final numeric scale, delta magnitudes, decay rates, caps, or automatic action/outcome effects.
