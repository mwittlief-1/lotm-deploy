# Incident Catalog Seed


**Project:** Lords of the Manor
**Corpus:** Final Canon Complete Corpus v0.1
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CATALOG_CONTENT`. SP-005 catalog-only direction is ratified. SP-017 completed the legacy 62-event disposition and ratified 11 Local Matter rows as v0.3 candidate catalog rows only. Existing 62-event deck remains evidence, not canon. SP-001 event pressure anchors are approved for incident catalog planning only.
`RED_ZONE_BLOCKED` for live incident mutation until separately authorized.

Implementation/status: catalog/planning source only. This does not authorize implementation, runtime imports, schema promotion, UI integration, turn-pipeline wiring, tests/fixtures/goldens, or live mechanics.

## Families

- Estate / condition;
- Agriculture / food;
- Security / banditry;
- Local community / grievance;
- Crime / justice;
- Church / parish;
- Household / administration;
- Opportunity / patronage;
- Regional pressure / macro-derived.

## Required row fields

- id;
- name;
- event class;
- root cause;
- pressure source;
- geography modifiers;
- eligibility;
- probability band;
- severity band;
- affected parties;
- player visibility;
- knowledge confidence;
- possible responses;
- visibility/interaction class;
- automatic effects;
- receipts;
- escalation;
- resolution;
- persistence/decay;
- implementation status.

Every catalog row must carry the implementation status field before it can be considered for v0.3 subset review.

## Approved event pressure bands

Use these bands for catalog planning and proof scenarios only. They do not authorize live incident mutation.

| Band | Approved pressure range |
|---|---|
| Routine | 0-5 percent of annual gross support capacity. |
| Local/serious | 5-15 percent of annual gross support capacity. |
| Serious | 15-30 percent of annual gross support capacity. |
| Crisis | 30-50 percent of annual gross support capacity. |

Standard manor gross support is 20 Coin/year, with planning band 18-24 Coin/year.

## v0.3 classification

SP-017 classifies the legacy 62-event deck as follows:

| Disposition | Count | Handling |
|---|---:|---|
| v0.3 Local Matter candidate | 11 | Accepted as candidate catalog rows only. |
| Evidence only | 41 | Keep as consolidation evidence; do not promote without later CPO review. |
| Requires rewrite | 4 | Rewrite as future action-outcome rows tied to build, repair, maintain, or related mechanics. |
| Deferred | 5 | Defer to later mechanics. |
| Rejected/archive | 1 | Archive for v0.3; lifecycle reconsideration requires later live lifecycle authorization. |

The 11 candidate rows are:

`evt_spoilage_spike`, `evt_rodent_infestation`, `evt_bandits`, `evt_fire`, `evt_petty_theft`, `evt_tool_breakage`, `evt_boundary_dispute`, `evt_peasant_petition`, `evt_festival`, `evt_good_harvest_celebration`, `evt_village_wedding`.

Future row packages must classify each candidate as exactly one of:

- `interactive`;
- `automatic_but_visible`;
- `background_visible`;
- `background_hidden_evidence_only`.

Do not assume all 11 candidates are interactive prompts.

The 11 candidate rows remain `RED_ZONE_BLOCKED` for live incident mutation, live response handling, resource effects, A/R/T effects, UI integration, and turn-pipeline integration.
