# Lords of the Manor — Product Constitution

**Status:** Final Canon Batch A v0.1  
**Authority:** Product spine / CPO canon draft for CEO approval  
**Source basis:** P0/P1/P2 consolidation packets, prior Product Constitution, runtime-reset architecture canon, CPO cockpit synthesis  
**Scope:** Product identity, pillars, player role, product boundaries, and high-level doctrine. This document does not authorize live implementation.

---

## 1. Product Identity

*Lords of the Manor* is a **single-player, turn-based dynastic feudal strategy simulation**.

The player guides a **landed house/dynasty**, not a static ruler token and not an omniscient kingdom manager. The player experiences the world through the household, landed base, bloodline, obligations, relationships, knowledge limits, and institutional position of that house.

The v1 promise is:

> Build, preserve, and adapt a landed medieval house across generations in a dangerous feudal world.

The game is not a paint-the-map conquest game, not a tactical battle game, not a modern economic market sim, not a generic RPG character sheet in medieval costume, and not a manor spreadsheet detached from people, land, law, kinship, and obligation.

---

## 2. Core Product Thesis

The game’s central dramatic engine is the collision of:

1. **Landed material reality** — food, coin, labor, condition, order, rights, improvements, geography, and local people.
2. **Dynastic continuity** — births, deaths, succession, marriage, heirs, widows, cadets, wards, claims, family placement, and memory across generations.
3. **Feudal obligation pressure** — liege, Church, crown, kin, household, tenants, communities, office, custom, reputation, and law.
4. **Bounded household capacity** — attention, delegation, roles, officers, competence, traits, standing responsibilities, and reserve/slack.
5. **Partial knowledge** — dossiers, records, correspondence, rumor, offices, confidence rails, and knowledge that can be incomplete, stale, or custodied by particular people.
6. **Relationship memory** — Allegiance, Respect, Threat, reputation, fear, loyalty, resentment, legitimacy, grievance, and social consequence.

The game should feel like a serious dynastic simulation of medieval landed power, not a generic optimization loop.

---

## 3. Player Role

The player controls the continuity of a house/dynasty.

Individual Heads of House matter deeply. They have traits, capacities, relationships, knowledge, authority, weaknesses, and reputations. But the campaign is not invalidated when one head dies. The house can continue through heirs, widows, regency, collateral kin, cadet branches, marriage alliances, patronage, or diminished recovery paths where plausible.

The player should feel that:

- a capable lord’s death is strategically and emotionally meaningful;
- heirs are not interchangeable avatars;
- marriages reshape alliances, claims, household stability, fiscal pressure, and future risk;
- spouses, children, siblings, widows, wards, clergy, officers, tenants, and kin are strategic actors;
- the house can be wounded without the campaign ending;
- dynastic continuity is a lived strategic problem, not just a family-tree display.

---

## 4. World-First Principle

The world exists before the player acts and beyond what the player currently sees.

The player house is central to experience, not to source truth. Other houses, offices, Church institutions, lieges, kings, communities, claims, routes, manors, kinship, debts, rivalries, and local pressures are real world entities or durable generated facts, not ad hoc event-card scenery.

The product must protect a world model composed of:

- people;
- houses;
- manors and holdings;
- villages, settlements, local context, and terrain;
- offices and institutions;
- estate tenure and authority channels;
- obligations and fiscal state;
- claims and succession expectations;
- relationships and memory;
- knowledge states and records;
- incidents, lifecycle events, and action outcomes;
- receipts and chronicle-worthy consequences.

The UI may focus player attention. It may not define what exists.

---

## 5. Product Pillars

### 5.1 Land Is the Material Basis of Power

Manors, holdings, rights, improvements, geography, labor, food, condition, local order, access, and obligation create the material base from which houses act.

A manor is not merely an income number. It is a place with people, work, risks, buildings, rights, social expectations, geography, and history.

### 5.2 Dynasty Is Continuity Under Pressure

The house persists through birth, death, succession, marriage, widowhood, regency, family placement, cadets, collateral lines, claims, and failures.

Dynastic pressure should emerge naturally from mortality, fertility, marriage politics, finance, education, inheritance, law, and relationships.

### 5.3 Feudal Society Is Obligation Pressure

Power is mediated by duty, hierarchy, custom, rank, law, Church legitimacy, military service, kinship, reputation, coercion, and dependence.

The house is not free-floating. It owes and is owed.

### 5.4 Household Capacity Bounds Action

The player cannot do everything. Head-of-House attention, delegated throughput, standing directives, household roles, offices, staff, competence, distance, and crisis load constrain what the house can manage.

Growing power should increase apparatus and obligations, not simply grant unlimited direct actions.

### 5.5 Information Is Partial and Custodied

The player does not receive god-view truth by default.

Knowledge lives in records, offices, people, correspondence, scouts, Church sources, kin networks, local memory, and household capacity. Confidence rails are:

- **Known**
- **Likely**
- **Possible**

Knowledge can be stale, partial, contested, hidden, or lost across succession and office turnover.

### 5.6 Relationship Memory Matters

The world remembers. Allegiance, Respect, Threat, favors, grievances, reputation, fear, loyalty, gratitude, scandal, legitimacy, and resentment should create durable strategic consequences.

Relationship memory should be explainable through receipts or memory markers when material.

### 5.7 Receipts Make Simulation Legible

Every meaningful state change should have an inspectable explanation appropriate to the player’s knowledge.

The preferred player-facing stack is:

1. narrative summary;
2. structured effects;
3. inspectable receipts/provenance;
4. debug/proof artifacts only for development, not as player explanation.

---

## 6. Time and Turn Constitution

The standard player-facing turn is a **three-year planning envelope**.

Internally, the world should advance through hidden chronology, event timestamps, cutpoints, reaction waves, lifecycle events, action outcomes, pending actions, and rare interruptions.

The player is the experiential center of the turn, not the temporal center of the world.

A turn may include:

- opening briefing;
- direct Head-of-House actions;
- delegated assignments;
- standing directives;
- mandatory agenda responses;
- pending action resolution;
- cutpoints and reaction waves;
- rare interruption responses;
- notices and recap;
- chronicle entries for durable events.

Exact slot counts and decision density are not locked in this constitution.

---

## 7. Core Simulation Lanes

The product must preserve the following major lanes, whether implemented immediately or staged:

- Household / Dynasty
- Marriage / Alliance
- Succession / Tenure
- Estate / Manor
- Fiscal / Obligations
- Court / Liege / Politics
- Church / Religious
- Military / Readiness / Service
- Local Community / Labor / Order
- Justice / Crime / Coercion
- Council / Assembly / Governance
- Knowledge-Increasing Actions / Correspondence

CourtOS is the execution/capacity layer, not an action domain. Dossier review is a read activity. Inquiry, scouting, auditing, correspondence, and investigation are actions when they consume capacity and change knowledge.

---

## 8. Economy Constitution

The player-facing economy spine is:

- **Coin** — liquid, spendable estate wealth; not total wealth.
- **Food** — provisions, grain-equivalent stores, subsistence, resilience, and provisioning pressure.
- **Labor Pressure** — manpower strain, availability, and local capacity; not stored money.
- **Condition** — material state of estate assets, buildings, land, and infrastructure.
- **Order** — local stability, compliance, disorder, and social strain.
- **Obligations** — what is owed, to whom, by what authority, from which estate/tenure basis, with what consequence.

Major actors should not spend from nowhere. Fiscal state must eventually apply to major houses and institutions at a fidelity appropriate to their relevance tier.

Numeric anchors belong in mechanical specs, not this constitution, unless separately ratified.

---

## 9. Failure and Recovery Constitution

Failure should usually scar, reroute, subordinate, endanger, impoverish, or destabilize the house before deleting the campaign.

The house/dynasty is the continuity unit. Land loss, debt, disgrace, succession shock, social hostility, relationship damage, local disorder, or economic collapse should often be recoverable when plausible, but recovery should carry costs and memories.

True extinction should require loss of plausible dynastic agency, not merely one bad event.

---

## 10. Historical Design Posture

The game should be historically grounded but not antiquarian.

Historical grounding should shape authority, obligation, kinship, land tenure, Church influence, local labor and production, justice/coercion, war service, marriage, inheritance, rank, legitimacy, and information flow.

The goal is not maximal institutional simulation. The goal is convincing medieval pressure that generates meaningful strategic choice and emergent dynastic story.

---

## 11. What the Game Is Not

The game is not:

- a modern city builder;
- a pure resource optimization game;
- a grand-strategy paint-the-map game;
- a tactical battle simulator;
- a fantasy RPG;
- a card-event game where the world exists only when cards appear;
- a single-character life sim;
- a UI-first management dashboard detached from simulation truth;
- a spreadsheet where people, houses, and institutions are fungible accounts.

---

## 12. Product Authority Rule

Product canon must be approved through the CEO/CPO authority layer.

Codex may:

- preserve canon;
- reconcile docs;
- identify contradictions;
- derive requirements from canon;
- propose inferred requirements;
- recommend changes;
- implement approved requirements inside authorized lanes.

Codex may not independently invent or ratify core product doctrine.

---

## 13. Constitution-Level Red Lines

This constitution does not authorize:

- live runtime writes;
- schema promotion;
- UI integration;
- turn-pipeline integration;
- live A/R/T initialization or mutation;
- live marriage market implementation;
- claims enforcement;
- generalized succession runtime;
- live regency/wardship mechanics;
- live economy obligations, dues, arrears, or settlement;
- reference-world mutation;
- treating read models, proof artifacts, or legacy singleton views as source truth.

Such changes require explicit approval under the Decision Authority Matrix and Codex Autonomy Ladder.
