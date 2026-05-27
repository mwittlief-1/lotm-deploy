# Lords of the Manor — v1 Scope Guardrails

**Status:** Final Canon Batch A v0.1  
**Authority:** Product spine / CPO canon draft for CEO approval  
**Source basis:** P0/P1/P2 consolidation packets, Product Outcome v1, v0.3 scope, roadmap, CPO cockpit synthesis  
**Scope:** v1 product boundaries and release-shaping guardrails. This document does not authorize live implementation.

---

## 1. Purpose

This document defines the scope guardrails for v1 and the transition from v0.3/runtime-reset work toward a coherent first complete game.

It answers:

- what v1 must protect;
- what systems are v1-critical in some form;
- what can be v1-light or post-v1-deep;
- what current work must not accidentally implement;
- how Codex should treat product target language versus implementation authorization.

---

## 2. v1 North Star

v1 should deliver a playable, legible, repeatable dynastic feudal simulation in which the player can guide a landed house through multi-year turns, manage household and estate pressures, navigate obligations and relationships, survive dynastic shocks, and experience meaningful continuity across generations.

v1 does not need maximal historical breadth. It does need the core identity to be visible:

> A house survives, adapts, compromises, governs, loses, recovers, and remembers across generations in a world that is larger than the player.

---

## 3. v1-Critical Capabilities

The following capabilities must exist in some meaningful form by v1, though depth may vary by release band.

### 3.1 World-First Runtime Spine

The game must not depend on singleton player-manor truth.

World entities, houses, people, offices, tenures, institutions, manors, and overlays must remain distinguishable from player-facing projections.

### 3.2 Dynasty and Lifecycle

Birth, death, marriage, widowhood, heirs, succession relevance, family placement, and continuity must matter.

The campaign must not collapse merely because one Head of House dies.

### 3.3 Estate / Manor Material Loop

The player must make meaningful choices around local material conditions:

- Coin;
- Food;
- Labor Pressure;
- Condition;
- Order;
- improvements/rights;
- local obligations;
- local community pressure.

The manor is the material base, not the whole source truth.

### 3.4 Economy / Ledger / Obligation Spine

Major actors should not spend from nowhere.

Resources, obligations, candidate ledger entries, receipts, and eventual settlement must be source-traceable. v1 need not simulate every fiscal institution at maximum detail, but it must avoid a fake singleton economy model.

### 3.5 CourtOS / Capacity / Delegation

The player should not be able to do everything.

Household, family, officer, staff, and standing-responsibility capacity must constrain action. Exact slot counts remain deferred until action-state simulation, standing-responsibility modeling, and turn-pressure calibration support them.

### 3.6 Action Registry Runtime Boundary

Actions are canonical state-changing processes, not merely UI buttons.

The registry must preserve domain meaning, authority basis, requirements, costs, risks, state effects, relationship implications, knowledge effects, receipts, and failure modes where relevant.

### 3.7 A/R/T Relationship Memory

Allegiance, Respect, and Threat are core relationship dimensions. They should eventually apply to person-person and house-house edges and shape memory, cooperation, fear, loyalty, resentment, legitimacy, and strategic behavior.

Live A/R/T behavior remains blocked until authorized.

### 3.8 Knowledge / Dossiers / Receipts

The player must not receive omniscient truth by default.

Knowledge should be confidence-bounded and provenance-aware. Dossiers, records, correspondence, reports, rumors, offices, and receipts should help explain what the player knows and why.

### 3.9 Incident / Event System

The world must generate pressures not solely caused by player actions or lifecycle mechanics.

Lifecycle events, action-outcome events, incident events, and macro/regional shocks must remain distinct. Incidents should be geography-shaped, state-linked, bounded, explainable, and capable of being unfair but legible.

### 3.10 Military Readiness / Service

Military readiness should be treated as a standing capacity and obligation system, not merely an event response.

Training, arms, knights, able-bodied men, readiness degradation, and service obligations are core to landed medieval play, even if v1 starts bounded.

### 3.11 Justice / Crime / Coercion

Justice, accusation, crime, punishment, pardon, lawful coercion, unlawful violence, fear, legitimacy, Church risk, liege exposure, and local order are v1-important.

This lane may begin simplified, but it must not disappear.

### 3.12 Church / Legitimacy / Office

The Church is not flavor.

It affects legitimacy, education, recordkeeping, family placement, political access, marriage law, dispute mediation, patronage, office networks, and reputation.

### 3.13 Player Legibility

The player must understand enough to make decisions.

Briefings, agendas, dashboards, recaps, dossiers, ledgers, chronicle entries, source labels, and receipts must explain meaningful change without exposing raw simulation internals as the main UX.

---

## 4. v1-Light or Post-v1-Deep Areas

The following may appear in v1-light form or be deferred for deeper post-v1 treatment:

- complex parliament/council/assembly politics;
- full inter-realm diplomacy;
- detailed tactical warfare;
- highly granular trade networks;
- complex canon-law litigation;
- fully simulated lower-population household-by-household life;
- full dynamic regional labor markets;
- full procedural portrait/world presentation;
- mature full-map strategic gameplay;
- high-depth papal/heresy/schism arcs;
- multiplayer;
- modding.

Deferral does not mean contradiction. Architecture should preserve future paths where doing so does not overburden the current release.

---

## 5. Current v0.3 / Runtime-Reset Guardrail

v0.3 is a closure, legibility, and architecture-reset stabilization band.

It succeeds if:

- source truth is protected;
- overlays can safely mutate runtime reality where specifically authorized;
- projections can update current-state views without becoming source truth;
- receipts explain proof events;
- deterministic tests prove invariance;
- old player-manor pathways do not regain authority;
- economic/receipt scaffolds remain legible and compatible.

v0.3 does not need to be final v1 fun, but it must not block v1.

---

## 6. Product Target vs Implementation Authorization

This distinction is mandatory.

A product target may say a system should eventually exist. That does not authorize Codex to implement live behavior.

Every final canon or requirements document must distinguish:

1. **Product target** — what the game should eventually support.
2. **Doctrine** — how the domain should conceptually behave.
3. **Mechanical spec** — numbers, formulas, probability bands, thresholds, or ranges.
4. **Current implementation authorization** — what Codex may build now.
5. **Stop rule** — what remains blocked until explicit approval.

Examples:

- Food sufficiency is product-critical, but live Food mutation is blocked unless a lane authorizes it.
- A/R/T is product-critical, but live A/R/T initialization/mutation is blocked.
- Marriage/dowry consequences are product-critical, but live marriage-market behavior remains blocked unless authorized.
- Receipts are product-critical, but proof JSON is never source truth.

---

## 7. Current Campaign Shape Guardrails

The working product frame remains long-form dynastic play using multi-year turns.

Earlier assumptions include a long campaign ceiling around 50–100 turns and a three-year turn model. Campaign length and modes should remain engine-agnostic until specifically locked.

The system should support:

- meaningful short scenario testing;
- long-run dynastic continuity;
- household growth and burden growth;
- delegation and apparatus growth;
- failure/recovery arcs;
- open chronicle / legacy reckoning rather than one global score.

---

## 8. Current World-Scale Guardrails

Current world-frame canon favors a medium realm, not the earlier large-world target.

Current lane assumptions include:

- 15 counties;
- 8 bishoprics;
- planning for 2 archbishoprics;
- roughly 300–500 manors, with current tuned seed around 387 manors.

Older larger-world assumptions such as 25 counties, ~2,000 manors, ~2,500 villages/parishes, and 200–300 abbeys/monasteries are retired for the current lane unless explicitly revived.

---

## 9. Action Registry Guardrails

The current accepted base action registry is ACT-001 through ACT-078.

Older 56-action language is obsolete.

Additional action rows must preserve status bands:

- Base Canon;
- Integrated Canon Add;
- Tier A Pressure Additions;
- Candidate v0.8/v1;
- Held pending Law / Coercion / Legitimacy guardrails.

The action registry is not the standing-responsibility catalog. Standing coverage must be modeled separately.

---

## 10. UI / Presentation Guardrails

The game should develop a premium archive/ledger/chronicle/report identity.

Avoid:

- fantasy-decorative excess;
- UI that implies omniscience;
- UI that collapses source truth into presentation summaries;
- debug outputs used as player explanation;
- polished map/UI work that outruns source-truth safety.

The UI is a read/presentation layer. It must not become source truth.

---

## 11. Red-Zone Scope Changes

The following require explicit CEO/CPO approval:

- changing player role from house/dynasty to single-character avatar;
- abandoning world-first source truth;
- making `RunState.manor` or any projection source truth;
- replacing receipts with unexplained state mutation;
- locking exact CourtOS slot counts;
- converting actions into mere UI buttons;
- implementing live A/R/T mutation;
- implementing live obligations, dues, arrears, or settlement;
- implementing live succession/regency;
- implementing marriage-market behavior;
- implementing claims enforcement;
- integrating UI or turn pipeline around unapproved proof scaffolds;
- expanding v1 into full kingdom/grand-strategy scope;
- treating P0/P1/P2 consolidation packets as direct implementation authority.
