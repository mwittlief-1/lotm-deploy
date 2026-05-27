# Lords of the Manor — Source of Truth Hierarchy

**Status:** Final Canon Batch A v0.1  
**Authority:** Architecture spine / CPO-CTO canon draft for CEO approval  
**Source basis:** Runtime reset architecture canon, P0/P1/P2 consolidation packets, runtime alignment review  
**Scope:** Defines authoritative runtime layers and prohibits source-truth drift.

---

## 1. Core Rule

The player house is central to experience, not source truth.

The runtime architecture must preserve a layered source-of-truth hierarchy:

```text
Reference World
  -> Generated Run State
  -> Mutable Runtime Overlays
  -> Read Models / Projections
  -> Proof Reports / QA Artifacts
```

No lower layer may become authoritative over a higher layer.

---

## 2. Reference World

The Reference World is immutable during runtime.

It contains durable world facts such as:

- map geography;
- manors and settlements;
- terrain/access features;
- landed fabric;
- counties, baronies, church fiefs, and other reference holding structures;
- route/topology truth where present;
- canonical offices and institutional slots;
- static rights/holding structures;
- corrected XMAP successor data;
- long-lived reference identifiers.

Runtime systems may read the Reference World. They may not mutate it.

### Prohibited

Codex and runtime systems must not:

- rewrite Reference World during play;
- patch reference structures as a side effect of lifecycle events;
- store runtime outcomes inside reference data;
- treat test/proof outputs as reference correction;
- use player-facing UI edits as reference truth.

---

## 3. Generated Run State

Generated Run State is created at run instantiation.

It contains run-specific but pre-runtime facts such as:

- houses;
- people;
- kinship;
- initial officeholders;
- estate tenure at run start;
- demographic profiles;
- household structures;
- initial known/hidden knowledge seeds;
- initial visible/invisible relationship or relevance markers where authorized;
- initial generated world deepening derived from reference seed.

Generated Run State is separate from Reference World and separate from Mutable Runtime State.

### Mutability Rule

Generated Run State should not be rewritten by runtime events. Runtime changes should be represented through overlays.

### Example

A generated person may be born at run start as a canonical Person record. If they die during play, the person record is not deleted or rewritten. A death overlay records the runtime fact.

---

## 4. Mutable Runtime Overlays

Mutable Runtime State consists of append-only overlays.

Overlays represent runtime changes such as:

- death markers;
- birth markers;
- marriage/betrothal markers;
- office vacancy markers;
- succession/estate-tenure markers;
- obligation overlays;
- fiscal/resource overlays;
- A/R/T and relationship overlays when authorized;
- war/famine/plague event overlays when authorized;
- local order/labor/condition overlays;
- knowledge updates;
- pending action state changes;
- incident or cutpoint resolution records.

Runtime writes overlays rather than mutating Reference World or Generated Run State.

### Overlay Requirements

A material overlay should have:

- stable ID;
- subject/entity reference;
- event/action/source reference where applicable;
- timestamp or turn/cutpoint context;
- effect semantics;
- provenance/receipt reference where appropriate;
- deterministic behavior under fixed seed;
- no hidden reverse write to reference/generated truth.

---

## 5. Read Models / Projections

Read models and projections are derived views used for:

- UI;
- player-facing current state;
- dashboards;
- dossiers;
- ledgers;
- chronicles;
- compatibility bridges;
- QA summaries;
- reports;
- debug inspection.

Read models are not source truth.

They may combine Reference World, Generated Run State, overlays, and knowledge filters into a presentation or compatibility view.

### Prohibited

Read models must not:

- become write targets for source truth;
- reverse-sync into Reference World or Generated Run State;
- override overlays;
- conceal drift without receipts;
- serve as canonical state merely because existing UI expects them.

---

## 6. Proof Reports / QA Artifacts

Proof reports, JSON outputs, QA packets, fingerprints, snapshots, test logs, and review packets are evidence.

They are never runtime source truth.

They may support acceptance decisions, baseline updates, audits, and Codex review. They may not define the world.

---

## 7. Legacy `RunState.manor`

Legacy `RunState.manor` is a one-way compatibility projection.

It may exist temporarily so older runtime, QA, or UI surfaces continue functioning during transition.

It may be generated from world truth and overlays.

It may not be used as an authoritative bidirectional state sink.

No new architecture may reintroduce the player manor as the canonical runtime object.

---

## 8. Tiered Active World Compatibility

The full world exists as durable source truth. Runtime simulation fidelity may be tiered.

Tiering means:

- relevant actors may run at higher fidelity;
- distant actors may run at lower fidelity;
- actors promote/demote between tiers;
- no actor exits existence merely because they are no longer relevant;
- promotion should resolve or deepen existing identity, not create major actors ad hoc.

Tiered fidelity does not weaken the source hierarchy.

---

## 9. Entity Identity Rule

Named/role-bearing people are canonical Person records.

Commoners, grouped staff, tenant households, local labor pools, and abstract population groups may remain abstract where appropriate, but the distinction must be explicit.

Major actors such as king, direct liege, visible T1 house heads, bishops, stewards, and key officers cannot remain dead active actors. They require successor resolution, vacancy, acting administrator, or explicit unresolved state when the relevant system is authorized.

---

## 10. Source-Truth Stop Rules

The following are prohibited without explicit approval:

- Reference World mutation during runtime;
- Generated Run State mutation through lifecycle events;
- proof JSON as source truth;
- legacy `RunState.manor` as source truth;
- bidirectional legacy sync;
- UI read models becoming write targets;
- hidden base-income folding from proof metadata;
- runtime source changes without receipts/provenance;
- implementing full active-world simulation as an accidental side effect of tiering work.
