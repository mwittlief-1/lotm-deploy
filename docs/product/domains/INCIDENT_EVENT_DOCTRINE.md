# Incident and Event Doctrine


**Project:** Lords of the Manor  
**Corpus:** Final Canon Complete Corpus v0.1  
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine  
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`STRONG_DRAFT` for taxonomy.  
`CATALOG_CONTENT` for incident catalogs and SP-005 catalog-only planning.  
`RED_ZONE_BLOCKED` for unsupported live mutation.

## Event classes

Do not overload all events into one category. The game should distinguish:

1. **Lifecycle events** — births, deaths, marriages, coming of age, widowhood, succession-relevant family changes.
2. **Action-outcome events** — consequences of actions or processes.
3. **Incident events** — geography/state-shaped pressures not necessarily caused by the player.
4. **Macro/regional shocks** — war, plague, famine, royal death, regional lawlessness, taxation pressure, church conflict, trade disruption.

## Incident doctrine

Incidents are geography-shaped world pressure. They can be unfair, but they must be legible.

Legibility requires:

- surface eligibility;
- affected parties;
- state basis;
- blame/credit vectors;
- knowledge state;
- escalation path;
- resolution state;
- receipts and recap handling.

## Geography matters

Geography affects incident eligibility, probability, severity, detection, response, recovery, and upside.

Relevant geography/pressure tags include:

- major road;
- river / ford / bridge;
- forest;
- marsh;
- coast;
- borderland;
- market town;
- church / abbey;
- castle;
- upland;
- valley;
- poor soil;
- frontier;
- pilgrimage / trade route.

## Existing event deck

The existing 62-event deck is evidence, not canon. SP-017 completed the row-by-row disposition and CPO ratification approved:

- 11 rows as v0.3 Local Matter candidate catalog rows only;
- 41 rows as evidence only;
- 4 rows for rewrite as future action-outcome rows;
- 5 rows deferred to later mechanics;
- 1 row rejected/archived for v0.3.

The 11 Local Matter candidates are:

`evt_spoilage_spike`, `evt_rodent_infestation`, `evt_bandits`, `evt_fire`, `evt_petty_theft`, `evt_tool_breakage`, `evt_boundary_dispute`, `evt_peasant_petition`, `evt_festival`, `evt_good_harvest_celebration`, `evt_village_wedding`.

Future row packages must classify each candidate as one of `interactive`, `automatic_but_visible`, `background_visible`, or `background_hidden_evidence_only`. Do not assume all 11 are interactive prompts.

The legacy deck remains CONSOLIDATION_SOURCE evidence outside the ratified candidate rows. Ratified candidate status is catalog-only and does not authorize live incident mutation.

## Stop rules

Codex must not harden legacy no-op/event-card behavior into canon or add live state mutation without explicit authorization.
