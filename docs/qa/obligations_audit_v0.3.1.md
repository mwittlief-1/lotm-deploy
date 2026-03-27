# Obligations Audit v0.3.1

Last updated: 2026-03-26
Task: `V03-R1-003-T01`

## Scope

This audit covers the economy/fiscal lane scope for `V03-R1-003-T01`:

- `src/sim/domains/economy/**`
- `tests/**`
- `docs/qa/**`

The audit inspects the current runtime callers outside those edit surfaces where needed, but the lane-owned output here is the audit artifact itself.

## Fiscal packet expectations used here

From `docs/releases/v0.3_FISCAL_SPINE_PACKET.md`, the `v0.3.1` obligations baseline is expected to build on:

- settlement once per 3-year turn per counterparty
- explicit obligation counterparties for church and liege
- no negative coin; unpaid amounts roll into arrears
- ordered receipt lines keyed by category, counterparty, asset, and delta
- accepted payment modes already locked for `church_due`, `liege_due`, `extraordinary_levy`, `church_offering`, and `liege_gift`

## Canonical fiscal seams already available

The economy domain already contains the scaffolding that later obligations tasks should extend instead of replacing:

- `src/sim/domains/economy/schema.ts` locks the accepted payment contracts and runtime asset mappings for `coin`, `food_stores`, `meat_stores`, and `service_placeholder`.
- `src/sim/domains/economy/receipts.ts` locks the canonical receipt schema, sort order, counterparty fields, and obligation-facing receipt assets.
- `src/sim/domains/economy/ledger.ts` owns the current due and arrears mutation helpers for `tax_due_coin`, `tithe_due_bushels`, `arrears_coin`, and `arrears_bushels`.
- `src/sim/domains/economy/storeReceiptWriters.ts` can already build and execute settlement scaffolds for coin, food, and meat payment modes.

Important boundary note:

- These seams exist, but the live obligations runtime does not yet call the settlement scaffold path or pass receipt metadata through its current phase-owned settlement flow.

## Current runtime settlement inventory

| Flow | Current runtime path | Current behavior | Packet alignment | First insertion point |
| --- | --- | --- | --- | --- |
| Obligations state shape | `src/sim/types.ts` and `src/sim/state.ts` | Runtime state stores one aggregate liege due slot (`tax_due_coin`), one aggregate church due slot (`tithe_due_bushels`), one aggregate arrears bucket for each asset family, and `war_levy_due`. | Partial | Expand `ObligationsState` into a per-counterparty registry before trying to add cadence or enforcement semantics. |
| Turn preview assessment | `src/sim/phases/phase_obligations.ts` -> `applyPreviewObligationsPhase` | Computes a flat liege tax from population and a flat church tithe from production, then applies unrest and liege relationship pressure if dues or arrears look unpayable. | Partial | Replace direct `setTaxDueCoin` / `setTitheDueBushels` assessment with counterparty-aware assess helpers that still preserve current deterministic formulas. |
| Decision-time settlement | `src/sim/phases/phase_obligations.ts` -> `applyDecisionObligationsPhase` | Spends pooled `pay_coin` and `pay_bushels` inputs in fixed order: arrears first, then current dues. Only coin and grain are used; meat and service hooks are ignored. | Missing | Replace the pooled spend block with per-counterparty settlement scaffolds built from the accepted payment contracts. |
| Turn-close arrears carry | `src/sim/phases/phase_succession.ts` -> `closeTurnPhase` | Rolls any remaining tax/tithe due into aggregate arrears without receipt metadata, then applies liege/clergy relationship deltas from the final aggregate arrears state. | Partial | Add a close-turn counterparty helper that carries due into per-counterparty arrears and emits canonical carry receipts before stage-one penalties. |
| Event-driven obligation pressure | `src/content/events.ts` | Religious and political events directly nudge `tithe_due_bushels` and `tax_due_coin` using generic due helpers. | Partial | Route event pressure through counterparty-aware assess helpers so event-triggered dues still land in the same registry and receipt taxonomy. |
| Payment contract scaffolds | `src/sim/domains/economy/storeReceiptWriters.ts` and tests | Church, liege, offering, gift, and levy payment modes are explicit and deterministic in domain helpers and tests. | Ready but not wired | Use these helpers as the runtime settlement entrypoint instead of adding a second settlement contract. |
| Receipt coverage | `tests/sim/ledger_domain.test.ts`, `tests/sim/fiscal_schema_contract.test.ts`, `tests/sim/store_receipt_writers.test.ts` | Domain tests prove assess/pay/carry receipts and settlement scaffold execution when metadata is supplied. | Partial | Add phase-facing tests in follow-on tasks once runtime obligations actually passes receipt/scaffold context through. |

## Current runtime behavior in detail

### 1. Counterparties are implied by field names, not stored explicitly

The current runtime obligations model is still:

- `tax_due_coin` for the liege-side obligation
- `tithe_due_bushels` for the church-side obligation
- one shared `arrears.coin`
- one shared `arrears.bushels`

That means the runtime can tell whether coin or grain is overdue, but it cannot yet:

- represent separate arrears ledgers per counterparty
- remember when each counterparty was last settled
- distinguish current-due versus carried-arrears ownership beyond the field name

### 2. Settlement cadence is phase-timed, not registry-backed

The packet says settlement happens once per 3-year turn per counterparty. Today that cadence is only implicit:

- `applyPreviewObligationsPhase` reassesses tax and tithe once during the obligations phase
- `applyDecisionObligationsPhase` spends whatever the pooled decision inputs allow
- `closeTurnPhase` rolls leftovers into arrears at turn close

That produces one obligations cycle per turn, but it is not yet a per-counterparty cadence contract because no registry tracks separate settlement state for church and liege.

### 3. Accepted payment modes exist, but runtime settlement still uses only coin and grain

The fiscal schema already says:

- `church_due` accepts `coin` and `food_stores`
- `liege_due` accepts `coin`, `food_stores`, and `meat_stores`
- `extraordinary_levy` accepts `coin`, `food_stores`, `meat_stores`, and `service_placeholder`

The live obligations phase does not use that contract yet. It still:

- reads `decisions.obligations.pay_coin`
- reads `decisions.obligations.pay_bushels`
- spends from `coin`
- spends from `bushels_stored` via the `food_stores` alias

There is no live runtime path yet for:

- paying church dues in coin via the scaffold contract
- paying liege dues from `meat_stores`
- expressing a service-placeholder levy path
- selecting payment mode per counterparty instead of per pooled asset bucket

### 4. Receipt-capable helpers exist, but live obligations calls do not pass receipt metadata

`ledger.ts` can emit deterministic receipt rows for:

- tax assessment and payment
- tithe assessment and payment
- arrears carry debit and credit

But the live obligations and succession phases currently call those helpers without receipt context, so runtime obligation settlement still lands as:

- state mutation only in the ledger-owned fields
- phase summary and note text elsewhere
- no canonical receipt rows for the actual church/liege runtime path

The scaffold path in `storeReceiptWriters.ts` is in the same position: it is covered in tests, but not yet used by the live obligations phase.

### 5. Church and liege social targets are still asymmetrical

The runtime relationship effects at close turn still target:

- `state.locals.liege.id` for liege-facing pressure
- `state.locals.clergy.id` for church-facing pressure

That is good enough for early stage-one pressure, but it is still weaker than the fiscal packet wants because the church side is not yet modeled as a unified institution-aware counterparty. The earlier world-init audit already called this out as a constraint for church-facing enforcement design.

### 6. War levy is still a separate legacy branch

`war_levy_due` remains a special `men_or_coin` branch with:

- direct coin payment
- men fallback
- relationship deltas and report notes

That means the extraordinary-levy payment contract exists in schema only today. The runtime does not yet map the live levy branch onto:

- `obligation.extraordinary_levy`
- scaffold-based accepted payment modes
- canonical service-placeholder semantics

## Gap summary versus the packet

1. There is no `arrears_registry` per counterparty yet. The live runtime only has aggregate arrears by asset family.
2. Church and liege settlement cadence is implicit in phase timing, not explicit in stored per-counterparty settlement state.
3. Accepted payment modes are documented in schema but not wired into live runtime obligations settlement.
4. The live runtime obligations path does not emit canonical receipt rows because the current phase callers omit receipt metadata.
5. The church-side social baseline still points at `locals.clergy` rather than a unified institution-aware obligation target.
6. Extraordinary levy and service-placeholder semantics are present in schema/tests only, not in the live runtime branch.

## Recommended insertion points for follow-on tasks

### `V03-R1-003-T02`

Start with the state and domain seams that can add per-counterparty structure without changing phase ordering:

- expand `src/sim/types.ts` and `src/sim/state.ts` from aggregate due/arrears fields into a bounded registry shape keyed by church and liege
- add economy-domain assess / spend / carry helpers that operate on those counterparty entries
- keep `src/sim/phases/phase_obligations.ts` and `src/sim/phases/phase_succession.ts` as the ordering layer, but make them call the new registry helpers

### `V03-R1-003-T03`

The first bounded enforcement stage should attach at turn close, where arrears already become stable:

- replace the direct close-turn relationship delta block with a domain helper that first emits arrears-carry receipts, then applies bounded stage-one penalties
- keep liege pressure on `state.locals.liege.id`
- keep church pressure on `state.locals.clergy.id` until institution-aware church targeting is ready, rather than inventing a new social contract inside the enforcement task

### `V03-R1-003-T04`

The first tangible-bite hooks should extend the scaffold and tracked-store seams that already exist:

- route forced store payment through `makeFiscalSettlementScaffold` and `applyFiscalSettlementScaffold`
- keep store debit ownership in the economy-owned helper path so receipt rows and mutations stay coupled
- treat the current war levy branch as the earliest adapter candidate for `extraordinary_levy`, not as a separate new contract

### Event-pressure follow-through

When follow-on tasks touch event-driven dues:

- keep `src/content/events.ts` as a caller only
- route added tax/tithe pressure through counterparty-aware assess helpers in the economy domain
- avoid adding direct registry mutations or duplicate receipt logic in content code

## Audit conclusion

The current repo is in a useful intermediate state for `v0.3.1` obligations work:

- the asset, receipt, and payment-mode contracts already exist in the economy domain
- the live runtime still settles church and liege obligations through older aggregate tax/tithe slots
- the next task should convert those aggregate slots into a per-counterparty registry and wire the existing scaffold/receipt helpers into the live phase callers, rather than inventing a parallel obligations contract
