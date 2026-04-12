# v0.3.5 House Dossier Fixtures

## Scope

`V03-R5-003-T03` locks the accepted dossier contract with one known-house snapshot and explicit prospect-house coverage for both marriage and grant flows.

- dossier builder: `src/ui/houseDossierView.ts`
- canonical dossier source: `src/sim/domains/people/knownHouseSummaries.ts`
- fixture: `tests/fixtures/house_dossier_snapshot_v0.3.5.json`
- guard test: `tests/ui/houseDossierFixtures.test.ts`

## Fixture contents

The fixture captures three stable cases:

- one canonical known house
- one marriage prospect house
- one grant prospect house

Each case stores only:

- house identity and labels
- knownness labels and sources
- relationship/ledger bands
- household and holdings counts
- the fixed debug-row key order

## Prospect completeness rule

The completeness check attaches the generated `prospects_window` back onto the same state, rebuilds `house_dossiers` through the accepted dossier source, and then resolves dossier surfaces from that rebuilt snapshot.

That keeps the test on the existing dossier contract:

- no second prospect-to-dossier adapter
- no alternate preview builder
- no UI-only prospect shim

## Verification

1. `npx vitest run tests/ui/houseDossierFixtures.test.ts tests/ui/houseDossierView.test.ts tests/ui/houseDossierPanel.test.tsx`
2. `npm run qa`
3. `npm run preflight`
4. `npm run seed:replay:batch` twice and compare the `summary_hash`
