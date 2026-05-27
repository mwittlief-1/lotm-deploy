# Lords of the Manor — Codex Autonomy Ladder

**Status:** Final Canon Batch A v0.1  
**Authority:** Codex operating policy draft for CEO approval  
**Source basis:** Codex operating model, P0/P1/P2 consolidation packets, runtime reset workflow  
**Scope:** Defines how far Codex may proceed without human dispatch.

---

## 1. Purpose

The purpose of the autonomy ladder is to reduce five-minute stop/start cycles while preserving product control.

Codex should not require human approval for every proof, test, file lookup, status update, or routine repair. Codex should require approval when work crosses product, architecture, runtime, schema, or red-zone boundaries.

---

## 2. Autonomy Levels

### Level 0 — Advisory Only

Codex may inspect, summarize, and recommend. No repo changes.

Use for:

- unfamiliar domains;
- high ambiguity;
- product strategy;
- red-zone questions;
- canon interpretation before authority exists.

### Level 1 — Documentation / Evidence Maintenance

Codex may update green-zone docs, status files, review packets, source indexes, and evidence summaries.

Allowed:

- formatting;
- cross-reference cleanup;
- adding source-status labels;
- recording accepted gates;
- evidence packet generation;
- RFI queue updates.

Not allowed:

- new product doctrine;
- schema promotion;
- implementation changes.

### Level 2 — Non-Mutating Proof Lane

Codex may implement non-mutating proofs inside an approved lane.

Allowed:

- read models;
- preview APIs;
- candidate entries;
- source-reference checks;
- deterministic reports;
- no-op or proof-only scaffolds;
- tests proving no mutation.

Not allowed:

- live resource mutation;
- live obligations;
- overlays unless explicitly authorized;
- UI integration;
- turn integration;
- product-default changes.

### Level 3 — Mechanical Implementation Inside Approved Runtime Boundary

Codex may implement authorized runtime behavior when the lane explicitly permits mutation and the mechanical spec exists.

Allowed only if dispatch specifies:

- source layer;
- write layer;
- expected overlay/state behavior;
- receipts;
- tests;
- stop rules;
- rollback/review packet.

This level is not implied by Batch A.

### Level 4 — Same-Lane Multi-Step Autonomy

Codex may proceed through multiple green-zone or non-mutating yellow-reviewed tasks inside one authorized lane.

Allowed when:

- tasks share the same approved lane;
- stop rules are explicit;
- max runtime/iteration budget is defined;
- review packet is required;
- red-zone crossings are blocked;
- RFIs are logged and safe work can continue.

### Level 5 — Cross-Lane Orchestration

Codex may select among multiple queued tasks across lanes only if a human-approved backlog, priority order, stop rules, and authority matrix exist.

This is future/autopilot territory and requires explicit approval.

---

## 3. Default Autonomy Budget

Unless a dispatch says otherwise, default autonomy is:

```text
max same-task repair loops: 3
max changed files before review: 40
max new durable interfaces: 0 unless authorized
max baseline updates: 0 unless explicitly requested
may continue to next same-lane green task: yes, if no stop rule crossed
may continue after red-zone RFI: only to unrelated safe queued work
```

A future runner may add wall-clock limits such as 2–4 hours, but time alone is not the authority boundary. Stop rules and lane scope are the authority boundary.

---

## 4. Same-Lane Continuation Rule

Codex may continue without human redispatch when all are true:

- the next step is inside the same approved lane;
- the work is green-zone or expressly authorized yellow-zone;
- required tests pass or failures are mechanical and repairable;
- no source-truth boundary is crossed;
- no product default changes;
- no schema promotion;
- no baseline update without approval;
- review packet is updated.

---

## 5. Block-and-Continue Rule

If Codex hits a blocker on one task, it should:

1. stop that task;
2. write an RFI or blocked-decision packet;
3. preserve evidence;
4. move to the next safe queued task if available and authorized;
5. include the blocker in the final review packet.

Codex should not stop an entire multi-hour work session because one task needs a product decision, unless no safe work remains.

---

## 6. Required Review Packet at End of Autonomous Run

A multi-step Codex run must return a consolidated packet with:

- tasks attempted;
- tasks completed;
- tasks blocked;
- changed files;
- tests run;
- evidence artifacts;
- baseline/fingerprint impacts;
- RFIs;
- stop-rule assessment;
- suggested next lane;
- any recommended approvals.

---

## 7. Autonomy Does Not Mean Product Authority

Codex autonomy is execution autonomy, not canon authority.

Codex may run longer. It may not decide more than its lane permits.

---

## 8. Escalation Triggers

Codex must escalate for:

- red-zone work;
- ambiguous product doctrine;
- conflicting final canon;
- missing mechanical spec required for implementation;
- baseline drift without clear owner/cause;
- failed gates that require disposition;
- schema promotion;
- live runtime mutation outside authorized lane;
- UI/turn integration;
- economy/A/R/T/marriage/claims/succession runtime behavior unless explicitly authorized.
