# Local Matters Catalog Seed


**Project:** Lords of the Manor
**Corpus:** Final Canon Complete Corpus v0.1
**Source basis:** P0/P1/P2 consolidation packets + Batch A spine
**Status rule:** This document is canon-directional unless explicitly marked `MECHANICAL_SPEC_NEEDED`, `CATALOG_CONTENT`, `CPO_DECISION_NEEDED`, or `RED_ZONE_BLOCKED`.


## Status

`CATALOG_CONTENT`; SP-005 catalog-only direction is ratified. SP-017 ratifies 11 Local Matter rows as v0.3 candidate catalog rows only. SP-001 event pressure anchors are approved for Local Matters catalog planning only.
`RED_ZONE_BLOCKED` for live Local Matters interaction or incident mutation until separately authorized.

Implementation/status: catalog/planning source only. This does not authorize implementation, runtime imports, schema promotion, UI integration, turn-pipeline wiring, tests/fixtures/goldens, or live mechanics.

## Definition

Local Matters are player-visible, state-linked local incidents or pressures that may require attention, directive handling, or receipt-backed automatic resolution.

## v0.3 rules

- Small subset only.
- State-linked and explainable.
- No no-op flavor cards.
- Must produce receipts for material changes.
- Must respect runtime reset stop rules.

## Approved event pressure bands

Use these bands for Local Matters catalog planning and proof scenarios only. They do not authorize live Local Matters interaction or incident mutation.

- Routine: 0-5 percent of annual gross support capacity.
- Local/serious: 5-15 percent of annual gross support capacity.
- Serious: 15-30 percent of annual gross support capacity.
- Crisis: 30-50 percent of annual gross support capacity.

Standard manor gross support is 20 Coin/year, with planning band 18-24 Coin/year.

## Row categories

Future Local Matter row packages must classify each candidate with exactly one visibility/interaction class:

- `interactive`;
- `automatic_but_visible`;
- `background_visible`;
- `background_hidden_evidence_only`.

Do not assume all Local Matter candidates are interactive prompts.

## SP-017 ratified v0.3 candidate rows

These rows are accepted as v0.3 candidate catalog rows only. They do not authorize live interaction, incident mutation, resource effects, A/R/T effects, obligations, marriage effects, justice/coercion effects, UI wiring, or turn-pipeline integration.

| Legacy row | Proposed canonical name | Domain tags | Candidate status | Visibility/interaction class | Implementation status |
|---|---|---|---|---|---|
| `evt_spoilage_spike` / Spoilage Spike | Spoilage Trouble | Food, Condition | v0.3 Local Matter candidate | Pending future row package | Catalog-only; red-zone blocked |
| `evt_rodent_infestation` / Rodent Infestation | Rats in the Stores | Food, Order, Condition | v0.3 Local Matter candidate | Pending future row package | Catalog-only; red-zone blocked |
| `evt_bandits` / Bandit Raid | Storehouse Raid | Order, Food, Economy, Justice | v0.3 Local Matter candidate | Pending future row package | Catalog-only; red-zone blocked |
| `evt_fire` / Manor Fire | Storehouse Fire | Condition, Food, Economy, Household | v0.3 Local Matter candidate | Pending future row package | Catalog-only; red-zone blocked |
| `evt_petty_theft` / Petty Theft | Petty Store Theft | Order, Economy, Food, Justice | v0.3 Local Matter candidate | Pending future row package | Catalog-only; red-zone blocked |
| `evt_tool_breakage` / Tool Breakage | Manor Worksite Accident | Condition, Economy, Labor | v0.3 Local Matter candidate | Pending future row package | Catalog-only; red-zone blocked |
| `evt_boundary_dispute` / Boundary Dispute | Tenant Boundary Dispute | Order, Justice, World/Geography | v0.3 Local Matter candidate | Pending future row package | Catalog-only; red-zone blocked |
| `evt_peasant_petition` / Peasant Petition | Hardship Petition | Order, Labor, Food, Economy | v0.3 Local Matter candidate | Pending future row package | Catalog-only; red-zone blocked |
| `evt_festival` / Local Festival | Village Celebration | Household, Order, Church, Economy | v0.3 Local Matter candidate | Pending future row package | Catalog-only; red-zone blocked |
| `evt_good_harvest_celebration` / Good Harvest Celebration | Harvest Celebration | Food, Order, Household | v0.3 Local Matter candidate | Pending future row package | Catalog-only; red-zone blocked |
| `evt_village_wedding` / Village Wedding | Village Celebration | Marriage/Dynasty, Household, Order | v0.3 Local Matter candidate | Pending future row package | Catalog-only; red-zone blocked |

## SP-017 non-candidate disposition

Evidence-only rows remain consolidation evidence and must not be treated as accepted v0.3 Local Matter rows:

`evt_hard_winter`, `evt_drought`, `evt_late_rains`, `evt_gentle_season`, `evt_bumper_harvest_omen`, `evt_blight`, `evt_good_storage_year`, `evt_market_glut`, `evt_market_shortage`, `evt_traveling_merchant`, `evt_small_windfall`, `evt_runaways`, `evt_tithe_collector`, `evt_clergy_mediation`, `evt_pilgrims_pay_tolls`, `evt_tax_surge`, `evt_tax_relief`, `evt_herd_disease`, `evt_repair_bridge`, `evt_hired_miners`, `evt_wandering_bards`, `evt_bad_rumors`, `evt_good_rumors`, `evt_pious_procession`, `evt_clergy_rebuke`, `evt_muddy_roads`, `evt_clear_roads`, `evt_local_scribe`, `evt_ale_shortage`, `evt_ale_plenty`, `evt_muster_practice`, `evt_truce_news`, `evt_wolf_scare`, `evt_craft_fair`, `evt_salt_shortage`, `evt_salt_wagon`, `evt_minor_blessing`, `evt_minor_curse`, `evt_funeral_procession`, `evt_better_seed`, `evt_bad_seed`.

Rows requiring future rewrite as action-outcome rows tied to build, repair, maintain, or related mechanics:

`evt_skilled_mason`, `evt_supply_shortage`, `evt_small_theft_tools`, `evt_extra_hands`.

Rows deferred to later mechanics:

`evt_liege_inspection`, `evt_war_levy`, `evt_minor_illness`, `evt_miller_dispute`, `evt_miller_settles`.

Rejected/archive row for v0.3:

`evt_infant_loss`.

## SP-005 disposition gate

SP-017 completed the legacy 62-event row-by-row disposition and CPO ratification accepted the 11 rows listed above as v0.3 candidate catalog rows only. Each future candidate row package must carry implementation/status and one visibility/interaction class. The legacy deck remains CONSOLIDATION_SOURCE evidence, not canon.
