# Lords of the Manor — Stop Rules

**Status:** Final Canon Batch A v0.1  
**Authority:** Runtime/product/ops red-zone policy draft for CEO approval  
**Source basis:** Runtime Reset Alignment Review, P0/P1/P2 consolidation packets, v0.3 scope, Codex operating model  
**Scope:** Defines what Codex and implementation lanes must not cross without explicit approval.

---

## 1. Core Rule

If a task crosses a stop rule, Codex must stop, record an RFI or blocked-decision packet, and request CEO/CPO approval before implementing.

A successful proof, passing test, or plausible implementation is not authorization to cross a stop rule.

---

## 2. Source-Truth Stop Rules

Do not:

- mutate Reference World during runtime;
- mutate Generated Run State through runtime/lifecycle events;
- treat read models as source truth;
- treat proof JSON or QA artifacts as source truth;
- treat legacy `RunState.manor` as source truth;
- create bidirectional legacy sync;
- hide source-truth changes in compatibility projections;
- use UI or debug surfaces as authoritative state.

---

## 3. Economy / Resource Stop Rules

Do not implement without explicit approval:

- live Coin mutation;
- live Food/store mutation;
- live Labor Pressure mutation;
- live Condition mutation;
- live Order mutation;
- live obligation creation;
- live dues;
- arrears;
- settlement;
- scutage/tithe/tax/aid execution;
- hidden income folding;
- hidden expense folding;
- mill/franchise/right income as live coin;
- economy turn integration;
- multi-actor fiscal settlement;
- actor account mutation beyond approved proof lane.

Non-mutating previews, candidate entries, or receipt-intent structures must be explicitly labeled as such.

---

## 4. A/R/T and Relationship Stop Rules

Do not implement without explicit approval:

- live A/R/T initialization;
- live A/R/T mutation;
- relationship graph initialization;
- relationship-driven candidate hiding;
- relationship-driven dowry modification;
- relationship-driven acceptance scoring;
- AI behavior based on A/R/T;
- relationship side effects in runtime outcomes;
- hidden memory markers that alter behavior.

For v0.3 marriage REC-053 semantics, A/R/T relationship terms may classify proposals as `clean`, `strained`, or `blocked_by_relationship_terms` only if that lane is authorized. It must not hide candidates, reorder candidates, or modify dowry.

---

## 5. Marriage / Succession / Claims Stop Rules

Do not implement without explicit approval:

- live marriage market;
- live outbound/inbound marriage resolution;
- dowry settlement beyond authorized hard-funding gate behavior;
- dowry debt, installments, dower, jointure, or land-backed dowry;
- claims enforcement;
- generalized succession runtime;
- live regency;
- live wardship;
- runtime mortality/fertility;
- family placement effects that mutate runtime state;
- claimant/holder effects that alter tenure.

Player succession and visible T1 death/succession expectations may be product requirements, but implementation still requires the proper authorized lane.

---

## 6. Turn / UI Stop Rules

Do not implement without explicit approval:

- live turn-pipeline integration;
- broad `turn.ts` replacement;
- UI integration;
- player-facing dashboard rewrites;
- live interruption system;
- live pending-action lifecycle beyond authorized proof;
- live Local Matters interaction;
- in-game chronicle/ledger/dossier UI changes;
- player-facing turn briefing integration.

Read models and proof reports may be built only where authorized and must not become UI truth.

---

## 7. Action / CourtOS Stop Rules

Do not:

- lock exact CourtOS slot counts without approval;
- treat CourtOS as action taxonomy;
- treat action registry rows as final UI buttons;
- collapse standing responsibilities into action rows;
- implement live action throughput changes without authorization;
- create trait-based action behavior not ratified by spec;
- treat military readiness as merely event response;
- treat law/justice/coercion as a generic action family rather than domain requiring guardrails.

---

## 8. Demography / Lifecycle Stop Rules

Do not implement without explicit approval:

- live birth runtime;
- live death runtime;
- live fertility or mortality system;
- live marriage generation;
- runtime wardship/regency effects;
- demographic drift in active world;
- lifecycle mutation of generated registries;
- UI/turn integration for lifecycle systems.

Demographic reports, KPI projections, and offline/headless fixtures do not authorize live lifecycle runtime.

---

## 9. Incident / Event Stop Rules

Do not:

- promote the existing 62-event deck as canon backlog;
- add generic flavor-card events disconnected from state;
- create person-flavored events without tracked people or honest abstraction;
- add generic unrest-only logic where Local Order/A/R/T/tenant strain should eventually be distinguished;
- implement live incident mutation without authorized lane;
- implement immediate player response UI without authorization.

Incident catalogs may be drafted and classified. Live event execution requires authorization.

---

## 10. World / Map / Tiering Stop Rules

Do not implement without approval:

- full strategic map gameplay;
- full active-world simulation at player-adjacent fidelity for all actors;
- dynamic border/route/pathfinding expansion;
- new mapgen target;
- promotion that invents major actors ad hoc;
- actor deletion/demotion semantics that imply actors exit existence;
- old large-world scale revival.

Current world scale uses the medium-realm frame unless explicitly changed.

---

## 11. Baseline / QA Stop Rules

Do not:

- accept failed gates;
- apply blanket baseline updates;
- accept unexplained deterministic drift;
- update snapshots to silence failures without owner proof;
- treat non-perturbation as freezing obsolete behavior;
- conflate debug evidence with player-facing explanation;
- skip preflight/QA evidence for nontrivial changes.

---

## 12. Canon / Requirements Stop Rules

Do not:

- convert `INFERRED_FROM_CANON` into accepted canon;
- derive final mechanics without a mechanical spec;
- derive catalog rows as final content without catalog source;
- promote schemas without approval;
- change product defaults;
- expand v1 scope;
- treat P0/P1/P2 consolidation packets as direct final canon;
- treat older source docs as controlling over final canon.

---

## 13. Required Stop Response

When a stop rule is reached, Codex should produce:

```text
BLOCKED_RED_ZONE or RFI_REQUIRED
Domain:
Task/lane:
Stop rule crossed:
Why current authorization is insufficient:
Recommended decision:
Safe alternate work, if any:
Evidence/files affected:
```

Codex should then continue only if safe queued work remains and the autonomy ladder permits it.
