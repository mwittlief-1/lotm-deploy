# Promotion Packet Template

Status: template
Scope: required shape for re-promoting code, data, docs, tests, or tooling into the blessed spine

## Packet Header

```yaml
packet_id:
date:
status: draft | ready_for_review | accepted | returned | rejected
owner:
review_authority:
source_paths:
target_paths:
primary_source_layer:
promotion_status_requested: Candidate | Verified | Blessed | Protected | Integrated
```

## 1. Promotion Claim

What is being promoted, and to what boundary?

- Source material:
- Proposed blessed target:
- Owner/domain:
- Layer:
- Why this belongs in the new spine:
- What this packet does not promote:

## 2. Current Status

Classify each source path before promotion.

| Path | Current status | Current layer | Dirty state | Existing owner | Notes |
|---|---|---|---|---|---|
|  | EvidenceOnly / Quarantine / Candidate / Unknown |  |  |  |  |

## 3. Retained Concepts

List only the concepts that should survive.

-

## 4. Rejected Or Quarantined Behavior

List behavior that must not come forward.

-

## 5. Dependency Scan

Required dependency findings:

| Check | Result | Evidence |
|---|---|---|
| Imports old `src/sim/turn.ts` | pass/fail |  |
| Imports old `src/App.tsx` or old UI shell | pass/fail |  |
| Imports `src/content/events.ts` legacy deck | pass/fail |  |
| Treats `RunState.manor` as source truth | pass/fail |  |
| Reads proof/QA artifacts as source truth | pass/fail |  |
| Imports numbered duplicate files | pass/fail |  |
| Writes generated/reference truth at runtime | pass/fail |  |

Recommended commands:

```sh
rg -n "from ['\"].*(turn|App|events)|RunState\\.manor|qa_artifacts| 2\\." <candidate paths>
rg -n "ensure[A-Z]|normalize|sync|migrate" <candidate paths>
```

## 6. Source-Truth Contract

Declare inputs, outputs, and write boundary.

| Field | Answer |
|---|---|
| Reads from |  |
| Writes to |  |
| Runtime writes? | none / overlay / command / legacy adapter |
| Deterministic under fixed seed? | yes/no |
| Stable ordering requirements |  |
| Receipts/provenance requirements |  |
| Player-facing truth unlocked |  |

## 7. Stop-Rule Assessment

| Stop-rule area | Crossed? | Notes |
|---|---|---|
| Source truth | yes/no |  |
| Economy/resource | yes/no |  |
| A/R/T/relationship | yes/no |  |
| Marriage/succession/claims | yes/no |  |
| Turn/UI integration | yes/no |  |
| Demography/lifecycle | yes/no |  |
| Event/incident | yes/no |  |
| World/map/tiering | yes/no |  |
| Baseline/QA | yes/no |  |
| Canon/requirements | yes/no |  |

If any answer is `yes`, this packet must either be returned or include explicit CPO/PTL approval.

## 8. Verification Plan

Verification must prove the new boundary, not old behavior.

| Gate | Command/report | Expected result | Writes artifacts? |
|---|---|---|---|
| Static dependency scan |  |  | no |
| Type/build check |  |  | no/predeclared |
| Focused test/report |  |  | yes/no |
| Determinism check |  |  | yes/no |
| Source-status update |  |  | no |

## 9. Evidence References

Evidence may support promotion but cannot become source truth.

| Evidence path | Why cited | Authority limit |
|---|---|---|
|  |  | Evidence only |

## 10. Acceptance Decision

Reviewer decision:

```text
ACCEPT_AS:
REJECT_OR_RETURN_REASON:
BOUNDARY:
FILES_PROMOTED:
FILES_HELD:
FOLLOW_UP_GUARDS:
```

## 11. Post-Acceptance Guard

After acceptance, add or update:

- source-status record;
- forbidden import guard;
- focused invariant/test/report;
- owner map;
- review packet.
