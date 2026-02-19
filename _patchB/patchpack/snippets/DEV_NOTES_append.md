## v0.2.7.1 Hotfix — Correctness

- **Aging invariant:** all instantiated `people` registry entries age by `TURN_YEARS` each turn (alive only).
- **Same-turn succession:** if HoH dies during turn processing, succession resolves immediately so preview/report never shows a dead ruler.
- **Spouse swap + dowager visibility:** on succession, HoH spouse swaps to the new HoH’s spouse (via `kinship_edges`), while the prior spouse stays visible via `court_extra_ids`.
- **Marriage wiring:** accepting marriage (MarriageWindow or Prospects) writes a deterministic `spouse_of` kinship edge.
- **Widow badge correctness:** court roster widow badge prefers `houseLog` widowed event for same-turn accuracy.
- **UI attribution:** next-turn Diff Ledger can attribute coin/relationship changes to accepted prospects using `prospects_log`.

