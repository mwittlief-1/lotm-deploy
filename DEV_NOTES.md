# Dev Agent A — v0.2.3.1 Hotfix (Hooks Order Violation)

## Issue
Runtime crash after clicking **New Run**:
- React error: **“Rendered more hooks than during the previous render”**
- Triggered by **conditional early-returns** occurring before later `useMemo(...)` hooks ran.

## Fix (UI-only)
**File changed:** `src/App.tsx` (no sim/tooling changes)

1. **All hooks now run unconditionally**
   - Moved/rewrote the formerly in-play `useMemo` hooks (`prospectLogLines`, `hasProspectExpiredThisTurn`) so they execute **every render** with **safe defaults** when `state`/`ctx` are null.

2. **Single-return render pattern**
   - Replaced conditional `return (...)` branches with a `content` variable.
   - Component now **returns once** at the end: `return <>{content}</>;`.

3. **Null-safe rendering**
   - When `screen !== "new"` but `state/ctx` are temporarily null (e.g., batched updates), UI shows a small **Loading…** placeholder rather than returning `null`.

## Acceptance checklist (manual)
- `npm run dev`
- Load app
- Click **New Run**
- ✅ No hook warning/error
- ✅ No blank screen

## Notes
- No sim logic changes.
- No new routes/screens.
