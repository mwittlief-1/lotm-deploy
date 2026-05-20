# V04-HOUSE-005 Hidden Substrate And Candidate-Pool Provenance Contract

Date: 2026-05-20
Status: `COMPLETE_DOCS_ONLY`
Classification: `YELLOW_NEEDS_SPEC`, `DOCS_ONLY`

## Purpose

Define the minimum planning contract for hidden substrate, candidate pools, and provenance before v0.4 expands household/dynasty runtime work.

## Minimum Seed Guarantee To Decide

CPO/CEO must decide the floor for:

- prior holders and provenance for landed/office history;
- cadet and collateral scaffolds;
- claimant relevance;
- marriage candidate pools;
- office/staff/retainer/professional candidate pools;
- church/literate candidate pools;
- nearby fiscal/labor visibility;
- which facts are known by default, confidence-banded, or debug-only.

## Candidate Source Classes

| Source class | Example | Provenance requirement | Player visibility |
|---|---|---|---|
| Canonical person | heir, officeholder, bishop, claimant | person id, house/institution id, source refs | Known/Likely/Possible depending on records. |
| Bounded hidden person | marriage candidate, cleric, retainer | seeded pool id, provenance refs, confidence label | Usually Likely/Possible until introduced. |
| Abstract social pool | grouped staff, lower-population strata | pool id, geography/institution tie, generation rule | Summarized, not individual truth. |
| Prior-holder record | former holder, deceased predecessor | holding/office ref, tenure/provenance refs | Known if record-custodied; otherwise Likely/Possible. |
| Claimant scaffold | cadet/collateral/foreign line | basis, target, confidence, source chain | Bounded summary; no live enforcement. |

## Stop Rules

This contract does not authorize:

- live marriage market generation;
- live succession, regency, claim enforcement, or tenure mutation;
- candidate ordering changes;
- UI integration;
- schema or fixture updates;
- runtime hidden-pool creation;
- A/R/T mutation.

## Safe Next Work

- Prepare source/provenance audit.
- Draft minimum seed-contract options.
- Draft CPO decision text for hidden-world seed floor.
- Keep all work docs/proof only until CPO/CEO chooses the seed guarantee.
