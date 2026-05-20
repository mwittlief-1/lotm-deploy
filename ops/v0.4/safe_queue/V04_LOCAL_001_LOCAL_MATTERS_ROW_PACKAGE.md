# V04-LOCAL-001 Local Matters Row Package

Date: 2026-05-20
Status: `COMPLETE_DOCS_ONLY`
Classification: `GREEN_READY`, `DOCS_ONLY`

## Boundary

SP-017 ratified 11 rows as v0.3 candidate catalog rows only. This package classifies them for v0.4 planning. It does not authorize live interaction, incident mutation, resource effects, A/R/T effects, obligations, marriage effects, justice/coercion effects, UI wiring, or turn-pipeline integration.

## Candidate Row Package

| Legacy row | Canonical planning name | Domains | Proposed visibility class | Receipt/provenance need | Stop-rule status |
|---|---|---|---|---|---|
| `evt_spoilage_spike` | Spoilage Trouble | Food, Condition | `automatic_but_visible` | Store condition, food-loss cause, mitigation note. | Food/Condition mutation blocked. |
| `evt_rodent_infestation` | Rats in the Stores | Food, Order, Condition | `interactive` | Evidence source, affected stores, response options. | Food/Order mutation and UI response blocked. |
| `evt_bandits` | Storehouse Raid | Order, Food, Economy, Justice | `interactive` | Incident source, loss category, justice/coercion boundary. | Coin/Food/Order/A/R/T/justice mutation blocked. |
| `evt_fire` | Storehouse Fire | Condition, Food, Economy, Household | `interactive` | Damage source, affected asset, household response. | Condition/Food/Coin mutation blocked. |
| `evt_petty_theft` | Petty Store Theft | Order, Economy, Food, Justice | `interactive` | Loss, suspected actor class, confidence rail. | Justice/coercion and resource mutation blocked. |
| `evt_tool_breakage` | Manor Worksite Accident | Condition, Economy, Labor | `automatic_but_visible` | Worksite source, labor/condition consequence. | Labor/Condition/Coin mutation blocked. |
| `evt_boundary_dispute` | Tenant Boundary Dispute | Order, Justice, World/Geography | `interactive` | Boundary basis, parties, confidence, order risk. | Claims/justice/A/R/T/order mutation blocked. |
| `evt_peasant_petition` | Hardship Petition | Order, Labor, Food, Economy | `interactive` | Petition source, hardship class, relief expectation. | Food/Coin/Labor/Order mutation blocked. |
| `evt_festival` | Village Celebration | Household, Order, Church, Economy | `background_visible` | Social/church context, no material effect unless authorized. | A/R/T/Coin/Church effects blocked. |
| `evt_good_harvest_celebration` | Harvest Celebration | Food, Order, Household | `background_visible` | Harvest context and player-known source. | Food/Order mutation blocked. |
| `evt_village_wedding` | Village Celebration | Marriage/Dynasty, Household, Order | `background_visible` | Local social context, no marriage-market effect. | Marriage/A/R/T/Order mutation blocked. |

## v0.4 Live-Mutation Readiness Notes

Local Matters is a strong first red-zone candidate because it directly supports `Legible Playable Pressure`. However, live mutation must wait for:

- exact row subset;
- write APIs;
- receipt classes;
- deterministic tests;
- player response boundary;
- no hidden promotion of the 62-event deck into canon backlog.
