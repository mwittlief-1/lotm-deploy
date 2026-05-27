# Lords of the Manor — Codex Canon Handoff README

**Status:** Final Canon Batch A v0.1  
**Authority:** Codex operating entrypoint / CPO-CTO canon draft for CEO approval  
**Source basis:** P0/P1/P2 consolidation packets, Codex operating model, runtime reset canon  
**Scope:** Tells Codex how to use the canon corpus and what it may not infer.

---

## 1. Purpose

This README is the first entrypoint for Codex work on *Lords of the Manor* after the canon consolidation effort.

Codex should treat the final canon corpus as the source for requirements derivation, proof lanes, implementation tasks, test design, evidence packets, and review behavior.

Codex should not derive product canon from scattered older repo docs, old chat exports, proof reports, or consolidation packets unless those materials are explicitly incorporated into final canon docs.

---

## 2. Current Batch A Scope

Batch A establishes the spine:

```text
docs/product/PRODUCT_CONSTITUTION.md
docs/product/V1_SCOPE_GUARDRAILS.md
docs/architecture/SOURCE_OF_TRUTH_HIERARCHY.md
docs/architecture/RUNTIME_RESET_CANON.md
docs/architecture/OVERLAY_RECEIPT_READMODEL_DOCTRINE.md
docs/architecture/DETERMINISM_CONTRACT.md
ops/v0.3/DECISION_AUTHORITY_MATRIX.md
ops/v0.3/CODEX_AUTONOMY_LADDER.md
ops/v0.3/STOP_RULES.md
```

These files define what Codex must protect. They do not provide all domain mechanics or catalog rows.

---

## 3. Canon Status Hierarchy

Codex should observe this authority order:

1. System/developer instructions and safety rules.
2. Current final canon docs.
3. Decision Authority Matrix and Stop Rules.
4. Current authorized task/lane dispatch.
5. Approved review packets and accepted gates.
6. Consolidation packets as supporting evidence only.
7. Older source docs as historical/source evidence only.
8. Codex inference or recommendations.

Where older source docs conflict with final canon docs, final canon docs control.

---

## 4. What Codex May Do with Batch A

Codex may:

- orient itself to product identity and source-truth rules;
- detect red-zone crossings;
- create requirements-derivation scaffolding after authorized;
- draft capability maps and requirements registers with source references;
- update status docs and review packets;
- perform green-zone documentation reconciliation;
- run tests and evidence checks inside authorized lanes;
- recommend next proof lanes;
- create RFIs for unresolved canon/mechanics.

---

## 5. What Codex Must Not Do from Batch A Alone

Codex must not use Batch A alone to implement:

- live economy writes;
- live obligation creation, dues, arrears, or settlement;
- live Food/Coin/Labor/Condition/Order mutation;
- live A/R/T initialization or mutation;
- live relationship graph behavior;
- marriage market behavior;
- dowry acceptance scoring beyond explicitly authorized v0.3 rules;
- claims enforcement;
- generalized succession runtime;
- live regency/wardship mechanics;
- runtime mortality/fertility;
- UI integration;
- live turn-pipeline integration;
- full active-world simulation;
- source-truth mutation;
- schema promotion;
- final numeric balance constants.

---

## 6. Required Classification Tags

When deriving requirements, auditing docs, or preparing backlogs, Codex must tag items as:

```text
CANON_CONFIRMED
INFERRED_FROM_CANON
IMPLEMENTATION_EXISTING
IMPLEMENTATION_GAP
NEEDS_CPO_REVIEW
MECHANICAL_SPEC_NEEDED
CATALOG_CONTENT
RED_ZONE_BLOCKED
CONFLICT_OR_OUTDATED
```

Codex must not convert `INFERRED_FROM_CANON` into `CANON_CONFIRMED` without approval.

---

## 7. Requirements Derivation Rule

Codex may derive implementation work only through a traceable chain:

```text
Final canon statement
  -> domain doctrine
  -> mechanical spec or catalog source
  -> requirement
  -> proof lane
  -> task packet
  -> acceptance gate
  -> evidence packet
```

If a required mechanical spec or catalog does not exist, Codex should create a `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, or `NEEDS_CPO_REVIEW` item instead of inventing final behavior.

---

## 8. Product Target vs Authorization

Many final canon documents describe product targets. Product target language does not authorize implementation.

Codex must always check:

- Is there an authorized lane?
- Does the task cross a stop rule?
- Is a mechanical spec required?
- Is a catalog required?
- Does a review/approval packet exist?
- Is the behavior green, yellow, or red under the Decision Authority Matrix?

---

## 9. Review Packet Requirement

Every nontrivial Codex run should produce a review packet with:

- lane/task ID;
- authorized scope;
- changed files;
- tests run;
- evidence artifacts;
- source-truth layer touched;
- stop-rule assessment;
- baseline/fingerprint effects;
- RFIs/blockers;
- recommended next step.

Longer autonomous runs should consolidate multiple green-zone steps into one packet rather than asking for micro-approval after every small task.

---

## 10. Current Recommended Post-Batch-A Direction

After Batch A import, the recommended next work is not feature implementation.

Next steps should be one of:

1. Build Batch B core domain doctrines.
2. Run targeted second-pass mechanical contracts.
3. Build requirements-derivation scaffolding.
4. Create/refresh repo-resident runtime-reset ops docs.

Codex should not begin broad feature implementation until final canon/domain/spec materials are sufficient for the relevant lane.
