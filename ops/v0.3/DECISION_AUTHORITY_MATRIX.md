# Lords of the Manor — Decision Authority Matrix

**Status:** Final Canon Batch A v0.1  
**Authority:** CPO/CTO operating policy draft for CEO approval  
**Source basis:** Codex operating model, P0/P1/P2 consolidation packets, runtime stop rules  
**Scope:** Defines which decisions Codex may approve, recommend, or must escalate.

---

## 1. Core Authority Split

The operating model is:

```text
User / CEO:
  Final product authority, canon authority, priority, red-zone approval.

ChatGPT / CPO-CTO:
  Strategic product and architecture advisor; ambiguous decision support; canon drafting/review.

Codex Integrator:
  Repo execution, task packets, implementation within authorized lanes, tests, evidence, first-pass review.

Codex Subagents:
  Bounded exploration, audit, implementation, QA, documentation, and review inside assigned scope.
```

Codex is not the final product authority.

---

## 2. Decision Zones

### Green Zone — Codex May Approve and Continue

Codex may self-approve green-zone work inside an already authorized lane.

Examples:

- typo/format cleanup in current docs;
- doc reconciliation that records already accepted canon;
- adding source-status headers;
- updating cross-references without changing meaning;
- adding tests for existing behavior;
- non-mutating proof scaffolds inside an authorized lane;
- evidence packet generation;
- status-log updates;
- mechanical repair of test failures that does not alter product behavior;
- removing/annotating obsolete 56-action references where current 78-row canon is explicit;
- creating task packets from already approved requirements;
- improving review packet structure;
- file organization that does not change import/runtime behavior.

Green-zone work still requires evidence in the review packet.

### Yellow Zone — Codex May Recommend, Not Ratify

Codex may complete analysis, draft proposed files, or recommend approval, but must package for human/CPO review.

Examples:

- new API shape or durable interface;
- schema-like contract;
- new acceptance gate;
- mechanical spec draft;
- catalog row schema;
- requirements derivation from canon;
- broad architecture doc rewrite;
- new domain boundary language;
- player-visible read model changes;
- fixture updates that change expected outputs;
- baseline update requests;
- refactors touching multiple runtime domains;
- next-lane recommendation;
- interpreting ambiguous product doctrine.

Yellow-zone work should be marked `NEEDS_CPO_REVIEW` or `RECOMMENDED_FOR_APPROVAL`.

### Red Zone — Codex Must Stop or Record RFI

Codex may not self-approve red-zone work.

Examples:

- product canon change;
- product-default change;
- schema promotion to canonical contract;
- live runtime writes beyond approved lane;
- live economy writes;
- live obligations, dues, arrears, or settlement;
- live A/R/T initialization or mutation;
- relationship initialization;
- live marriage market behavior;
- claims enforcement;
- generalized succession runtime;
- live regency/wardship mechanics;
- runtime mortality/fertility;
- UI integration;
- live turn-pipeline integration;
- full active-world simulation;
- mutation of Reference World;
- mutation of Generated Run State through lifecycle/runtime events;
- treating proof JSON as source truth;
- treating `RunState.manor` as source truth;
- bidirectional legacy sync;
- accepting failed gates;
- accepting unexplained baseline drift;
- expanding v1 scope into grand-strategy/kingdom-sim territory.

Red-zone work requires CEO/CPO approval before implementation.

---

## 3. Ambiguity Rule

If Codex cannot determine whether a change is green, yellow, or red, it must classify the change as yellow or red.

Codex should not guess product authority.

---

## 4. RFI Rule

If Codex is blocked by a product/architecture decision, it should create or update an RFI packet rather than stopping all possible work.

RFI should include:

- decision needed;
- domain;
- current best answer;
- risk if unresolved;
- files/tasks blocked;
- whether other safe work can continue;
- recommended disposition.

Where safe queued work exists, Codex may continue to the next green-zone task after recording the RFI.

---

## 5. Approval Language

Codex may use these dispositions:

- `APPROVED_GREEN_ZONE`
- `APPROVED_WITH_NOTES_GREEN_ZONE`
- `RECOMMENDED_APPROVAL_YELLOW_ZONE`
- `REQUEST_CHANGES_YELLOW_ZONE`
- `BLOCKED_RED_ZONE`
- `RFI_REQUIRED`
- `OUT_OF_SCOPE_FOR_CURRENT_LANE`

Codex must not use “accepted canon” unless the source is already final canon or a human/CPO approval explicitly ratifies it.

---

## 6. Final Acceptance

Final acceptance of canon, scope, red-zone boundary crossing, schema promotion, baseline drift, or new implementation lanes belongs to the CEO/CPO authority layer.

Codex can prepare the evidence. It cannot grant itself final authority.
