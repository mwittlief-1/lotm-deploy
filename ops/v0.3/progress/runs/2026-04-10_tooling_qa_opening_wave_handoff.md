# Run Log

**Run ID:** 2026-04-10-tooling-qa-opening-wave
**Task IDs:** R5-009-T01
**Date:** 2026-04-10
**Branch:** codex/v0.3-lane-tooling-qa
**Base Merge:** ba73f38 (`chore(v0.3.5): add lane launch pack`)
**Commit:** pending

## Gates

- `npm run playability:preset:pack`
  - PASS
- `npx vitest run tests/ui/playabilityPresetPack.test.ts`
  - PASS
- `qa`
  - NOT RUN
- `preflight`
  - NOT RUN
- `seed_replay_batch_twice`
  - NOT RUN

## Changed Files

- `package.json`
- `docs/qa/playability_preset_pack_v0.3.5.md`
- `qa_artifacts/playtest_ops/v0.3.5/playability_preset_pack.json`
- `scripts/playabilityPresetPack.ts`
- `src/ui/playabilityPresetPack.ts`
- `tests/ui/playabilityPresetPack.test.ts`

## Notes

- Added `playability_preset_pack_v1` as the canonical `v0.3.5` stable-id crosswalk across the accepted regression seed pack, receipt-bundle pack, and deterministic UAT scenario pack.
- Locked the preset seam to one future adapter, `applyPlayabilityPreset`, and one required init entrypoint, `createNewRun`, so later preset UI and runtime work do not fork initialization.
- Reserved stable acceptance targets for packet review, UAT lock checks, KPI acceptance bands, and runaway detectors on the checked-in preset definitions.
- Added `npm run playability:preset:pack` to regenerate the checked-in manifest deterministically.

## UI / Integrator Handoff

- UI preset-selection work can consume `src/ui/playabilityPresetPack.ts` directly for stable preset ids, labels, and acceptance target lists.
- Later preset application work must mutate one canonical init payload before `createNewRun()` runs worldgen and registry wiring.
- This task does not add a live preset-init path yet; it only freezes the manifest and regeneration contract.
