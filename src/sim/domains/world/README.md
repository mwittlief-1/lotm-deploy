# World Domain

This domain freezes the XMAP alpha bundle as the current world import surface.

- Frozen data lives under `data/map/xmap_alpha_v1/`.
- Canon contract docs live in `docs/schemas/xmap_alpha_v1.md`, `docs/arch/XMAP_ALPHA_HANDOFF.md`, and `docs/HOLDING_FABRIC_LEGAL_RULES_v0_1.md`.
- The current surface provides loaders, stable ID lookups, overlay lookups, adjacency queries, and numeric distance queries.
- It does not rewrite `src/sim/turn.ts`, the people domain, inheritance logic, or fiscal simulation.
