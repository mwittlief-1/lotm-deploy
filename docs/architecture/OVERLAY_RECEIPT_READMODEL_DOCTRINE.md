# Lords of the Manor — Overlay, Receipt, and Read Model Doctrine

**Status:** Final Canon Batch A v0.1  
**Authority:** Architecture/legibility spine / CPO-CTO canon draft for CEO approval  
**Source basis:** Runtime reset canon, P0/P1/P2 consolidation packets, knowledge/receipt/evidence-gate consolidation  
**Scope:** Defines relationship between runtime overlays, receipts, read models, projections, and player/debug explanation.
**SP-BUNDLE-001 ratification:** SP-010 confidence/provenance vocabulary and field planning are approved for docs/spec planning only; no schema, UI, or read-model source-truth promotion is authorized.

---

## 1. Core Doctrine

Runtime change, player legibility, and UI presentation are separate concerns.

- **Overlays** record runtime changes.
- **Receipts** explain why material changes happened and preserve provenance.
- **Read models/projections** present current state, UI summaries, compatibility surfaces, and QA views.

None of these may collapse into each other.

---

## 2. Overlays

An overlay is an append-only runtime record representing a change from Reference World or Generated Run State.

Examples include:

- person death;
- birth marker;
- office vacancy;
- marriage/betrothal;
- estate-tenure change;
- obligation preview or live obligation where authorized;
- fiscal/resource delta where authorized;
- local order/condition/labor change where authorized;
- knowledge update;
- pending action state transition;
- relationship/A/R/T movement where authorized.

### Overlay Requirements

A material overlay should include:

- stable overlay ID;
- affected entity/entity type;
- overlay class;
- source event/action/authority reference;
- turn/date/cutpoint context;
- deterministic identity under fixed seed where appropriate;
- relation to prior overlays where relevant;
- receipt/provenance reference where material;
- clear non-mutation of reference/generated truth.

---

## 3. Receipts

A receipt is a player/developer-legible explanation of a material change.

Receipts should answer:

- what changed;
- why it changed;
- who/what caused it;
- what authority or condition applied;
- what source data was used;
- what the player knew or could know;
- what downstream consequences may exist;
- where the change can be inspected.

Receipts are the bridge between simulation and trust.

### Receipt Classes

Final taxonomy belongs in later domain/schema docs, but Batch A recognizes these broad classes:

- action outcome receipt;
- incident receipt;
- lifecycle receipt;
- obligation/fiscal receipt;
- knowledge/provenance receipt;
- relationship/memory receipt;
- turn recap receipt;
- baseline/QA evidence receipt.

### Player-Facing vs Debug Receipts

Player-facing receipts must be understandable in game terms.

Debug/proof artifacts may be more technical. They do not satisfy the player-facing explanation requirement by themselves.

---

## 4. Read Models / Projections

Read models and projections derive current views from source truth and overlays.

Examples:

- current manor summary;
- current household board;
- current Head of House view;
- dossier;
- ledger;
- turn briefing;
- turn recap;
- chronicle;
- compatibility `RunState.manor` projection;
- QA report.

Read models may filter by player knowledge. They may summarize. They may hide details. They may translate source truth into UI language. They may not become source truth.

---

## 5. Legacy Projection Rule

Legacy compatibility projections may exist during runtime reset, including `RunState.manor`.

They must be one-way:

```text
Reference World + Generated Run State + Overlays -> Projection
```

They must not reverse-write:

```text
Projection -> Source Truth
```

Any bidirectional sync attempt is a red-zone crossing.

---

## 6. Knowledge and Receipt Interaction

Receipts should respect player knowledge.

Some receipt facts may be:

- Known;
- Likely;
- Possible;
- hidden from the player but visible in QA;
- visible only through later investigation;
- uncertain because of stale records or contested reports.

Player-facing explanation should not imply omniscience. Developer proof can see more than the player.

---

## 7. Recaps and Chronicle

Turn recaps summarize what happened during the turn. They should collect and interpret receipts without replacing them.

Chronicle entries preserve durable, structural, or narratively significant consequences, such as:

- accession/death;
- land loss/acquisition;
- major marriage;
- serious disgrace;
- major obligation failure;
- local revolt or suppression;
- Church conflict;
- dynastic recovery;
- notable military service;
- major estate transformation.

Not every receipt becomes a chronicle entry.

---

## 8. Local Matters and Incidents

Local Matters presentation should distinguish:

- interactive incidents requiring response;
- automatic background events;
- directive-covered matters;
- hidden/deferred events;
- chronicle-worthy consequences.

Existing deterministic event decks are evidence. They are not automatically canon content.

---

## 9. Evidence Gate Doctrine

QA and proof evidence must remain auditable.

A review packet should show:

- changed files;
- tests run;
- pass/fail state;
- baseline effects;
- receipt/log evidence;
- source-truth layer touched;
- stop-rule checks;
- unresolved RFIs;
- recommended next lane.

Baseline updates must be narrow, explained, and owner-backed.

---

## 10. Prohibitions

Codex and runtime systems must not:

- use proof JSON as runtime source truth;
- use debug output as player-facing explanation;
- use read models as write targets;
- create hidden state deltas without receipts/provenance;
- accept unexplained deterministic drift;
- hide source-truth violations behind passing UI snapshots;
- treat old event decks as canon catalogs without classification;
- fold new income/right/effect metadata into live state without authorization.
