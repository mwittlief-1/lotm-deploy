# CODEMAP
**Last Updated:** 2026-03-23

## Canonical Active Surfaces
- `src/main.tsx`: UI entrypoint
- `src/App.tsx`: current monolithic UI shell and view logic hotspot
- `src/version.ts`: app version surface
- `src/sim/index.ts`: sim public API
- `src/sim/state.ts`: run creation and initial-state setup
- `src/sim/turn.ts`: current monolithic turn execution hotspot
- `src/sim/types.ts`: shared sim types
- `src/content/*`: static gameplay/content definitions
- `scripts/*`: active build, QA, batch, and matrix scripts
- `tests/sim/*`: focused sim coverage
- `tests/*.test.ts`: higher-level regression and invariant coverage

## Active File Policy
- Unsuffixed files are canonical by default.
- Numbered duplicates such as `src/main 2.tsx`, `vite.config 3.ts`, `tests/foo 4.ts`, and similar root/script/test variants are treated as archival artifacts unless a release plan explicitly restores them.
- New work should never import from numbered duplicate files.
- `_archive/duplicates/YYYY-MM-DD/` is the canonical quarantine location for duplicate cleanup passes.

## Current Hotspots
- `src/App.tsx` is the dominant UI merge-conflict risk.
- `src/sim/turn.ts` is the dominant simulation merge-conflict risk.
- Root-level duplicate configs and scripts increase the chance of editing the wrong file during parallel work.

## v0.3 Target Layout
- `src/sim/phases/`: thin phase wrappers owning execution order
- `src/sim/domains/people/`: kinship, marriage, claims, succession inputs
- `src/sim/domains/economy/`: ledger, obligations, receipts, portfolio accounting
- `src/sim/domains/court/`: roles, delegation, pacing structures
- `src/sim/domains/world/`: topology, adjacency, distance API
- `src/sim/domains/realm/`: church and pressure scaffolds
- `src/sim/domains/ai/`: policy hooks, evidence typing, belief-registry scaffolds
- `src/sim/domains/experience/`: read models only
- `src/ui/panels/`: UI panel extraction target from `src/App.tsx`

## Immediate Cleanup Targets
- Clarify active root configs and scripts before parallel lanes expand.
- Stop editing numbered duplicates and treat them as archive debt.
- Update stale top-level docs that still describe `v0.1.0` behavior after the refactor kickoff is stable.
