# v0.4 CPO/CEO Decision Log

Date: 2026-05-20
Status: `PARTIAL_DECISIONS_LOGGED`

## Logged Decisions

### First v0.4 Runtime Tranche

- GitHub issue: `https://github.com/mwittlief-1/lotm-deploy/issues/24`
- Comment disposition: `AUTHORIZE_V0_4_LOCAL_MATTERS_FIRST_LIVE_MUTATION_TRANCHE`
- Status: accepted as CPO/CEO red-zone override for the first v0.4 implementation lane.

Authorized meaning:

- Engineering may prepare and execute one narrow Local Matters first live mutation tranche after PTL dispatch.
- Scope must remain SP-017-row-backed, deterministic, receipt/provenance-backed, and bounded.
- This does not authorize broad UI/turn wiring, all legacy 62-event promotion, broad Food/Coin/Labor/Condition/Order/A/R/T/obligation/marriage/claims/justice mutation, schema updates, fixture/golden/baseline updates, or active v0.3 backlog mutation.

### v0.4 Backlog Activation Protocol

- GitHub issue: `https://github.com/mwittlief-1/lotm-deploy/issues/25`
- Comment disposition: `AUTHORIZE_V0_4_BACKLOG_ACTIVATION_PROTOCOL_DRAFT_NO_V0_3_BACKLOG_MUTATION`
- Status: accepted as CPO/CEO control-plane authorization for a protocol draft only.

Authorized meaning:

- PTL/Engineering may draft the v0.4 backlog activation protocol.
- `ops/v0.3/backlog.yaml` must remain unchanged.
- Active backlog behavior must not be mutated unless separately authorized.

## Decisions Still Open

| Blocker | Issue | Status |
|---|---|---|
| Guided tester boundary | `https://github.com/mwittlief-1/lotm-deploy/issues/23` | Open; no disposition comment logged. |
| Actor accounting and fiscal bridge | `https://github.com/mwittlief-1/lotm-deploy/issues/26` | Open; no disposition comment logged. |
| Hidden seed and fiscal/labor visibility | `https://github.com/mwittlief-1/lotm-deploy/issues/27` | Open; no disposition comment logged. |

## PTL Interpretation

The automation loop may now move from planning-only mode to **one authorized implementation frontier**:

`V04-LOCAL-LIVE-001 Local Matters first live mutation tranche`

Engineering must still return a review packet before acceptance. PTL approval of that future packet must verify allowed paths, deterministic tests, receipt/provenance evidence, baseline/golden/fixture policy, and stop-rule compliance.
