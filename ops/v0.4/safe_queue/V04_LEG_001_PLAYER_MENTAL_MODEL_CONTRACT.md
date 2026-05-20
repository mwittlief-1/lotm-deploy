# V04-LEG-001 Player Mental Model Contract

Date: 2026-05-20
Status: `COMPLETE_DOCS_ONLY`
Classification: `GREEN_READY`, `DOCS_ONLY`

## Contract

The v0.4 player mental model is:

> The player guides a landed house through multi-year pressure, using household capacity, estate resources, obligations, relationship memory, partial knowledge, and receipts to decide what to preserve, pay, repair, delegate, investigate, or risk.

This contract describes current v0.3 systems and v0.4 planning language. It does not authorize UI integration, runtime behavior, schema changes, fixtures, goldens, baselines, or turn/phase wiring.

## Core Concepts

| Concept | Player meaning | Source-truth boundary |
|---|---|---|
| House | Continuity unit across heads, heirs, kin, debts, land, memory, and reputation. | Generated run state and overlays, not UI-only identity. |
| Head of House | Current authority holder with traits, relationships, capacity, and risks. | Person record plus overlays/read models. |
| Estate / Manor | Material base: land, rights, people, work, condition, stores, obligations, and local pressures. | Reference/generated world plus runtime overlays and projections. |
| Coin | Liquid estate wealth. | Economy/ledger state; no live mutation outside authorized APIs. |
| Food | Provisions and resilience. | Distinct from Coin; live mutation remains red-zone unless authorized. |
| Labor Pressure | Manpower strain and local capacity. | Planning/read-model language until live labor mutation is authorized. |
| Condition | Physical state of assets and improvements. | Maintenance live mutation remains red-zone. |
| Order | Local stability, compliance, and social strain. | Must not collapse into generic unrest-only flavor. |
| Obligations | What is owed, to whom, by what authority, in what form, and with what consequence. | Catalog planning ready; live obligations/settlement changes remain red-zone. |
| Local Matters | State-linked local incidents or pressures that may demand attention or receipt-backed resolution. | Catalog-only until live mutation/interaction is authorized. |
| Receipts | Explanation of meaningful change. | Proof/debug receipts are not automatically player-facing explanation. |
| Known / Likely / Possible | Confidence rails for what the house knows. | Must not imply omniscient player truth. |

## Required Player-Facing Explanation Stack

1. Plain-language situation summary.
2. Structured effects in domain language.
3. Receipt/provenance trail for material changes.
4. Debug/proof evidence only behind development or review surfaces.

## v0.4 Acceptance Questions

- Can the player say what changed, why it changed, and who or what caused it?
- Can the player distinguish estate material pressure from household/dynasty pressure?
- Can the player tell when something is known, likely, possible, hidden, or debug-only?
- Can the player tell which facts are current runtime state versus proof/report evidence?
- Does the surface avoid claiming blocked mechanics are live?

## Stop Rules

This contract does not authorize:

- live Local Matters mutation;
- live Coin/Food/Labor/Condition/Order changes;
- A/R/T mutation;
- runtime preset initialization;
- obligation collector rebasing;
- schema, fixture, golden, or baseline updates;
- production UI integration;
- turn/phase wiring.
