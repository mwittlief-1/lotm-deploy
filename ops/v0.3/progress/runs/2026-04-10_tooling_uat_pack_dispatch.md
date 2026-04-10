## Summary

Added a small v0.3.4 tooling addendum so the tooling lane has a legal ready task for the UAT scenario-pack work requested during the activation pass.

## Why

The existing backlog had no non-done tooling tasks left, so the lane was correctly refusing to self-assign work. This was a control-plane gap, not a lane execution problem.

## Changes

- Added epic `V03-R4-004` `UAT scenario pack and operator guidance`
- Added ready task `V03-R4-004-T01` on `codex/v0.3-lane-tooling-qa`
- Updated `ops/v0.3/progress/latest.yaml` so the current frontier points at the new tooling task

## Dispatch

Refresh from kickoff truth first, then claim `V03-R4-004-T01` and continue on the tooling lane.
