# v0.3.5 Manor View Fixtures

## Scope

`V03-R5-002-T04` hardens the accepted Manor View seam with deterministic snapshots for both the anchor manor and a routed non-anchor manor.

- manor-view surface: `src/ui/worldMapView.ts`
- panel surface: `src/ui/panels/ManorViewPanel.tsx`
- fixture: `tests/fixtures/manor_view_surface_v0.3.5.json`
- guard test: `tests/ui/manorViewFixtures.test.tsx`

## Fixture contents

The fixture records two stable projection slices:

- `anchor`
  - current-manor helper text
  - maintenance totals from the accepted upkeep surface
  - nearest-manor ordering
  - terrain ordering
  - leading hex-row ids
- `routed`
  - non-anchor helper text
  - null maintenance totals
  - nearest-manor ordering
  - terrain ordering
  - leading hex-row ids

## Regression coverage

The paired test keeps three behaviors explicit:

- nearest-manor routing stays deterministic on the player tab
- debug-tab hex rows keep their frozen projection order
- routed manors do not incorrectly inherit anchor-manor maintenance summaries

## Verification

1. `npx vitest run tests/ui/manorViewFixtures.test.tsx tests/ui/manorViewPanel.test.tsx tests/ui/worldMapScreen.test.tsx`
2. `npm run qa`
3. `npm run preflight`
4. `npm run seed:replay:batch` twice and compare the `summary_hash`
