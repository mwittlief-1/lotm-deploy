## Summary

Added small v0.3.4 activation-pass addenda so the tooling, economy, and UI lanes each have a legal ready task for the visible UAT work.

## Why

The existing backlog had no non-done tasks left for the tooling, economy, or UI lanes, so those lanes were correctly refusing to self-assign work. This was a control-plane gap, not a lane execution problem.

## Changes

- Added epic `V03-R4-004` `UAT scenario pack and operator guidance`
- Added epic `V03-R4-005` `Obligations gesture activation and structured fiscal receipts`
- Added epic `V03-R4-006` `Player-visible activation for gestures and raw receipts`
- Added ready tasks `V03-R4-004-T01`, `V03-R4-005-T01`, and `V03-R4-006-T01`
- Updated `ops/v0.3/progress/latest.yaml` so the current frontiers point at the new activation tasks

## Dispatch

Refresh from kickoff truth first, then claim the appropriate activation task on each lane:

- Tooling: `V03-R4-004-T01`
- Economy: `V03-R4-005-T01`
- UI: `V03-R4-006-T01`
