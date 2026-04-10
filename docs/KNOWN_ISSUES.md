# Known Issues — v0.3.4

**Last Updated:** 2026-04-09

This file records the current accepted limitations on the hardened `v0.3.4` line.

## P0 (release blockers)

- (none currently recorded on kickoff truth)

## P1 (known, acceptable for release)

- Playtest packet assembly is still manual even though the packet/reporting contract is now documented.
- Packet exports still carry `app_version: v0.2.9` on this branch line; that mismatch is expected and should be preserved in packet evidence.
- Replay batches can emit accepted soft time-ceiling warnings on longer seeds without indicating a determinism failure.
- Family-graph hardening is targeted to widowhood, remarriage, heir integrity, and claim suppression; it is not a full inheritance-system redesign.

## Observations / Notes

- Current accepted replay hash: `f850077e9f6a7338869f9861a6db0fc7e27f3c8cae56b6589e09b42dcc0d67f1`
- See `docs/releases/v0.3.4_HARDENING_FINAL_REPORT.md` for the release-facing hardening summary.
- See `docs/releases/v0.3.4_HARDENING_PLAYTEST_GUIDE.md` for the current playtest focus and filing rules.
