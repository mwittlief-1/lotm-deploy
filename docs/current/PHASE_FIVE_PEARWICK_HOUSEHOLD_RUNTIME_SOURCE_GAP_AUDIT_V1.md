# Phase Five Pearwick Household Runtime Source-Gap Audit V1

Status: Track 4 consumer audit, 2026-08-02. This document does not admit,
promote, or mutate source data.

## Executive finding

The current CourtOS runtime is honest but cannot yet become an editable
Pearwick planning surface. Education supplies four admitted turn-opening plans.
The other Household operating families are withheld, Pearwick has no current
assignment rows in the pinned Household read contract, and the acting player
actor is unadmitted. The plan lifecycle can now persist and protect valid
authority-scoped commands, but no UI write capability should open until the
missing admission and authority contracts arrive.

## Pinned runtime facts

Current Household read generation:

`9e58577246a3a381395f5a03b520d9790e94ab2d12287999c9bae362466014c0`

Current SQLite digest:

`4e5cd5c687ef4e862cdda459fa93b6999ada6a4f9a3881b3abd891f70eb631c4`

Pearwick resolves in the CourtOS contract to
`uatentity_2feb6d3c5a81604f9bebeb8c`. Against the pinned Household contract:

| Surface | Pearwick current rows | Disposition |
| --- | ---: | --- |
| Responsibility assignment summary | 0 | no accountable holder may be inferred |
| Household membership context | 14 | read context only; not a House Book destination |
| Education learner plans | 4 | admitted current plans |
| Education cycle reports | 0 | withheld; no prior executed cycle output |
| Stores position | 0 | withheld; historic flow cannot synthesize stock |
| Stores history | 0 | withheld; no admitted order/receipt lifecycle |
| Supply/counterparty routes | 0 | withheld |
| Adult Kin roster and arrangements | 0 | withheld |
| Health roster, care arrangements, and reports | 0 | withheld |
| Household Matters | 0 | withheld; revised 1120 Matters are pending |
| Protected-person dossiers | 0 | withheld; do not infer an active overlay |

The newer assignment artifact at
`data/genrun/phase_five_courtos_admitted_current_assignment_projection_v2/`
contains 22 player-surface-eligible Pearwick rows, but its own validation marks
the package `candidate_only: true` and `runtime_authority: false`. It is useful
for reconciliation, not eligible for CourtOS consumption or fixture promotion.

## Required admissions and contracts

### 1. Acting actor and authority substrate — blocking all writes

Track 2 must supply the admitted acting player person (Head, regent, or selected
council actor as applicable), House scope, authority basis, authority scope,
effective term, current authority generation/effective date/digest, and
per-command validation receipts. Inner Council membership, House control, and
responsibility labels are not substitutes.

### 2. Current responsibility assignments — blocking truthful ownership

CPO/Track 2 must publish a House-scoped admitted assignment projection using
the current 24-responsibility control plane. Each instance needs:

- responsibility instance ID and current responsibility key;
- House and exact scope kind/ID/label;
- accountable owner person ID and display identity;
- authority/delegation basis and effective interval;
- assignment/admission state and exact source references;
- source generation/effective date/digest and supersession;
- player-surface eligibility and Knowledge/disclosure posture;
- explicit withheld state where no defensible assignment exists.

Capacity/PAS is not required to admit accountable ownership. It remains a
separate utilization surface.

### 3. Operational read families — blocking ordinary planning content

- Stores needs admitted opening position/custody plus ordinary planning inputs.
- Adult Kin needs the reconciled roster and at least one bounded arrangement or
  an exact unavailable state.
- Education can proceed first from the four admitted plans, while prior reports
  remain honestly absent.
- Health/Care needs a Knowledge-safe roster and bounded planning case.
- Protected Persons remains absent unless a keyed House dossier is admitted.

### 4. Hosted durable store and authenticated API — blocking deployment writes

The Track 4 lifecycle and local-UAT SQLite store are implemented. Hosted writes
still require an authenticated House/actor-scoped API and a durable deployment
store. A transient deployment filesystem is not acceptable.

### 5. Downstream execution — not required for draft/save, required later

Track 3 feasibility/economic semantics and Track 1/5 runtime output contracts
are not required to inspect current state or save a structurally valid draft.
They are required before Lock/Submit can claim an executable plan and before
CourtOS can display receipts, Matters, reports, or a refreshed projection.

## Unblocked Track 4 work

- Maintain the authority-scoped draft/save/supersession lifecycle and tests.
- Build read-only planning readiness from exact source dispositions.
- Design the Education planning workspace against admitted learner plans while
  withholding commands until actor/authority admission.
- Define the SLM presentation envelope and deterministic fallback without
  enabling live model calls or inventing report evidence.
- Integrate admitted spatial holdings only after the House-to-manor release
  artifact is present; do not compile founder-confirmed examples directly into
  runtime truth.
