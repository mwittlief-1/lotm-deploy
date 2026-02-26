# v0.2.8 Integrated Overlay — Apply + Verify (Release Lane)

This package is designed to be unzipped at the **repo root** of `mwittlief-1/lotm-deploy` on baseline `main` @ `e8a6733410f0bc1531d1772e204f4e544128285e`.

This overlay is **release-lane safe**:
- **HouseholdRoster schema is unchanged** (`household_roster_v1` stays head/spouse/child)
- Derived kinship-relative roles are emitted into **`household_roster_view`** (view-only)
- No `InstitutionType:"monastery"` expansion

## 1) Apply

From repo root:

```bash
unzip -o v0.2.8_integrated_overlay.zip
```

## 2) Verify — Gates

```bash
npm run preflight
npm run qa
```

## 3) Verify — Determinism (minimum)

1. Start a new run with a known seed.
2. Advance 1–2 turns.
3. Restart with the **same** seed and repeat.
4. Confirm the turn report + prospects window content match.

## 4) Verify — Canon Must-Ship Checks

### A) Marriage reservation invariant (“no same bride offered twice”)

1. Generate a marriage prospect.
2. Do **not** resolve it yet (leave it active).
3. Advance turns / regenerate marriage windows.
4. Confirm the reserved candidate does **not** reappear in offers until the prospect is accepted/rejected/expired.

### B) Role rebasing after succession (derived view)

1. Ensure HoH changes (death → succession).
2. Confirm the derived view rebases relative to new HoH:
   - `report.household_roster_view.rows[*].role` shows `sibling` / `parent` as appropriate
3. Confirm **`report.household_roster` remains schema-stable** (roles only: head/spouse/child).

### C) Tier0/1 noble fertility facts (non-player only)

1. Run several turns.
2. Births are not guaranteed, but when one occurs confirm:
   - newborn `Person` exists in `state.people`
   - `parent_of` kinship edges exist
3. Confirm player births are still handled only by `householdPhase` (no double-counting).

