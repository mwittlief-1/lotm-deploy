# Dev A (UI) — v0.2.7.1 UI legibility hotfix

Scope: **UI-only** patch against v0.2.7 repo HEAD. No sim rule changes, no new routes/screens.

## Changes

### 1) Diff Ledger — relationship deltas (Who / What / Why)
* Relationship lines now render the **actor with a role/affiliation label**:
  * `Name (Liege)` / `Name (Clergy)` / `Name (Noble)`
  * Known house heads continue to display as `House <Name>`.
* Relationship deltas no longer use the vague fallback **"Multiple causes this turn."**
  * If arrears existed entering the turn and the mover is the liege, the why line uses the existing obligations helper (deterministic, player-facing).
  * Otherwise, the why line uses a simple deterministic **Relationship drift** attribution.

### 2) Weather shocks surfaced (Food)
* When the turn’s **weather multiplier is harmful (< 1)** and food is worsening / shortage exists, the Food “why” line surfaces it directly:
  * `Weather harmed harvest (×<mult>)`
* The same weather line is used as the **Food agenda context** in that case, so players don’t need to drill down.

### 3) Turn 0 agenda hygiene
* Suppressed the **Succession needs attention** agenda item on **turn 0** to avoid initialization-only noise.

### 4) Obligations UX safety
* Payment inputs now **auto-default** each turn to **pay due entering the turn**, bounded by available coin/bushels.
* Payment inputs are **clamped** to available coin/bushels via `min/max` + onChange clamping.
* If the entered payment cannot cover due entering (after arrears-first application), UI shows an explicit **Shortfall → arrears** line.

## Files changed
* `src/App.tsx`

## Notes
* Hook-order safety preserved: all hooks run unconditionally; component returns once at the end.
