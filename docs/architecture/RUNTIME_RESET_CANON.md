# Lords of the Manor — Runtime Reset Canon

**Status:** Final Canon Batch A v0.1  
**Authority:** Runtime/architecture spine / CPO-CTO canon draft for CEO approval  
**Source basis:** Runtime Reset Alignment Review, P0/P1/P2 consolidation packets, existing architecture docs  
**Scope:** Establishes the runtime-reset direction, accepted guardrails, and current no-jump discipline.

---

## 1. Executive Summary

The runtime reset is not a tangent. It is the backbone required for the product vision.

The project must move away from singleton player-manor runtime architecture toward a world-first, house/person/tenure/overlay/receipt-driven simulation architecture.

The reset direction is:

- Reference World remains immutable.
- Generated Run State is distinct from Reference World.
- Runtime mutation occurs through append-only overlays.
- Read models/projections serve presentation and compatibility only.
- Proof reports and QA artifacts are evidence only.
- Receipts/recaps are the legibility spine.
- Legacy `RunState.manor` is a one-way projection only.
- CourtOS is an execution/capacity layer, not an action taxonomy.
- Actions are canonical state-changing processes, not UI buttons.

---

## 2. Why the Reset Exists

The earlier prototype risked treating the player manor as the center of source truth. That architecture cannot support the intended product:

- dynastic continuity across heads of house;
- visible non-player houses and institutions;
- estate tenure and office succession;
- world-scale relationships and obligations;
- tiered active-world simulation;
- knowledge and provenance;
- receipts and chronicle;
- multi-manor holdings;
- Church, liege, crown, and local community pressure;
- future economy, A/R/T, marriage, claims, and succession runtime.

The reset protects future v1 by preventing feature work from being built on the wrong state model.

---

## 3. Accepted Runtime Direction

The following are accepted runtime principles.

### 3.1 World-First Source Truth

The world exists before and beyond the player. The player house is central to experience, not source truth.

### 3.2 Layered Runtime State

The controlling hierarchy is:

```text
Reference World
  -> Generated Run State
  -> Mutable Runtime Overlays
  -> Read Models / Projections
  -> Proof Reports / Evidence
```

### 3.3 Overlays for Mutation

Runtime systems should write overlays rather than mutating reference/generated truth.

### 3.4 Receipts for Legibility

Meaningful change should be receipt-backed, source-referenced, and explainable.

### 3.5 Legacy Compatibility Is Temporary and One-Way

Legacy `RunState.manor` may remain as projection/compatibility during transition. It is not source truth.

### 3.6 Staged Turn Integration

Do not jump directly to full live turn implementation. Turn shell, recaps, receipt aggregation, and safe overlay proofs should precede live integration.

### 3.7 Product Target Does Not Equal Authorization

The product may require eventual live economy, relationship, marriage, succession, or UI systems. The runtime reset does not authorize those systems until their lanes are explicitly approved.

---

## 4. Accepted Runtime-Reset Workstream Categories

The following categories are already part of the accepted reset path or consolidation spine:

- map/landed foundation;
- corrected landed fabric;
- relevance spine;
- people/house/lineage foundation;
- demographic profile engine and KPI routing;
- schema promotion for accepted runtime foundation items;
- runtime read-model proof;
- death/succession overlay proof;
- succession/estate-tenure overlay proof;
- turn pipeline reorientation plan;
- headless turn overlay recap proof;
- Turn Epic 002;
- runtime overlay API stub proof;
- turn recap aggregator API proof;
- turn kernel shell proof;
- turn domain integration roadmap;
- default decision domain proof;
- economy/obligation boundary audit;
- economy/obligation context read model proof;
- economy/obligation assessment preview proof;
- ledger/resource/account proofs only where expressly non-mutating and authorized.

This list is status guidance, not blanket approval for implementation scope expansion.

---

## 5. Current v0.3 Runtime Posture

v0.3 is a stabilization and legibility band. It should prove that the runtime spine can support v1 without drifting back into singleton player-manor truth.

v0.3 should prioritize:

- truthful runtime plumbing;
- source-truth separation;
- overlay mutation where specifically authorized;
- receipt-backed state changes;
- deterministic evidence;
- non-perturbation checks;
- release-gate discipline;
- careful compatibility projections.

v0.3 should not attempt final mature implementations of every domain.

---

## 6. Accepted Cross-Domain Runtime Boundaries

### 6.1 Action Registry

Action rows are canonical state-changing processes, not UI buttons. ACT-001 through ACT-078 are the accepted base rows. Older 56-action references are obsolete.

### 6.2 CourtOS

CourtOS is the execution/capacity layer, not the action taxonomy. Exact slot counts and final executor mapping remain deferred.

### 6.3 Standing Responsibilities

Standing responsibilities are distinct from action rows. Baseline coverage must be modeled before discrete action weights.

### 6.4 Turn Model

Three-year player-facing turns remain the working envelope. Hidden chronology, cutpoints, reactions, interruptions, and recaps remain the direction.

### 6.5 Incidents and Events

Lifecycle events, action-outcome events, incident events, and macro/realm shocks must remain distinct.

### 6.6 Tiered Active World

Full world source truth exists durably. Simulation fidelity may be tiered. Promotion/demotion changes fidelity, not existence.

---

## 7. No-Jump Rule

The runtime reset must proceed by staged proofs and explicit authorization.

Codex must not use a successful proof in one lane as permission to implement adjacent live systems.

Examples:

- A non-mutating ledger receipt proof does not authorize coin mutation.
- A demographic projection report does not authorize live births/deaths.
- A succession overlay proof does not authorize generalized succession runtime.
- A receipt aggregator proof does not authorize UI integration.
- A CourtOS doctrine document does not authorize final slot counts.
- A product target for marriage consequences does not authorize a live marriage market.

---

## 8. Baseline Drift Discipline

Determinism and baseline updates must be controlled.

Baseline drift may be accepted only with:

- row-level owner proof;
- receipts/log evidence;
- causal explanation;
- narrow update scope;
- no blanket acceptance of unrelated drift;
- no freezing of obsolete behavior merely because it was previously deterministic.

The non-perturbation golden proves specific non-perturbation properties; it does not freeze obsolete economy behavior or authorize unexplained drift.

---

## 9. Current High-Risk Runtime Areas

The following remain especially sensitive:

- live economy writes;
- live obligations/dues/arrears/settlement;
- live A/R/T initialization or mutation;
- live relationship initialization;
- live marriage market;
- claims enforcement;
- generalized succession runtime;
- live regency/wardship;
- runtime mortality/fertility;
- UI integration;
- live turn-pipeline integration;
- reference/generated source mutation;
- proof reports as source truth.

All are red-zone unless explicitly authorized.

---

## 10. Runtime Reset Acceptance Standard

A reset proof or implementation lane must answer:

1. What source layer does this read?
2. What source layer does this write, if any?
3. What receipts/provenance explain it?
4. What deterministic tests prove it?
5. What legacy projection remains one-way?
6. What player-facing truth does this unlock?
7. What red-zone systems remain blocked?

If those questions cannot be answered, the lane is not ready for autonomous Codex execution.
