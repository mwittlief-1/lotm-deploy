# Important: peopleFirst kinship sync must not wipe spouse edges for player children

The v0.2.7.1 changes add `ensureKinshipSpouseOf(...)` on marriage acceptance.
If `peopleFirst.ts` has a block that **replaces** kinship edges for all player-related IDs, it may
accidentally delete `spouse_of` edges involving player children (not just HoH/spouse).

If you see behavior where spouse swaps fail after a turn, inspect `peopleFirst` sync logic and ensure:
- you preserve existing `spouse_of` edges for children, and
- you only overwrite the HoH<->Spouse edge (and core parent edges), not all spouse edges involving the player network.

If you want, paste your `peopleFirst` kinship sync block and I’ll produce an exact minimal patch for your baseline.

