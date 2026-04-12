# v0.3.5 Person Card Fixtures

## Scope

`V03-R5-004-T04` locks the accepted person-card modal contract without reopening people-domain logic or adding a second routing seam.

- shared person-card seam: `src/ui/personCardView.ts`
- modal renderer: `src/ui/panels/PersonCardPanel.tsx`
- compact fixture: `tests/fixtures/person_card_snapshot_v0.3.5.json`
- guard tests: `tests/ui/personCardFixtures.test.tsx`, `tests/ui/personCardView.test.ts`, `tests/ui/personCardPanel.test.tsx`

## Fixture contents

The fixture stays intentionally compact while still touching every major tab:

- overview cards for the routed player-head anchor
- family sections with first routed relatives
- office and service rows from the canonical steward surface
- top relationship rows and total-count truncation evidence
- deterministic debug keys and first debug rows

That catches schema drift without freezing the entire registry payload.

## Routing guard intent

The route guard follows the live tap-any-name entry points rather than inventing test-only origins.

- `household`
- `roster`
- `prospects`
- `known_houses`
- `house_dossier`
- `person_card`

Each case renders the real UI surface that exposes the trigger, extracts the routed ids from `data-person-card-open`, and verifies that every trigger still resolves through `createPersonCardRoute()`.

## Verification

1. `npx vitest run tests/ui/personCardFixtures.test.tsx tests/ui/personCardView.test.ts tests/ui/personCardPanel.test.tsx tests/ui/householdPanel.test.tsx tests/ui/householdDetailsPanel.test.tsx tests/ui/prospectsPanel.test.tsx tests/ui/knownHousesPanel.test.tsx tests/ui/houseDossierPanel.test.tsx`
2. `npm run qa`
3. `npm run preflight`
4. `npm run seed:replay:batch` twice and compare the `summary_hash`
