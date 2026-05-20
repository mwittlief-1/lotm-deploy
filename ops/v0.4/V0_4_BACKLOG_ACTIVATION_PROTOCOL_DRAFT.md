# v0.4 Backlog Activation Protocol Draft

Date: 2026-05-20
Status: `DRAFT_AUTHORIZED_NO_ACTIVE_MUTATION`
Controlling disposition: `AUTHORIZE_V0_4_BACKLOG_ACTIVATION_PROTOCOL_DRAFT_NO_V0_3_BACKLOG_MUTATION`

## Purpose

Define how v0.4 work becomes claimable without mutating `ops/v0.3/backlog.yaml` or active v0.3 backlog behavior.

## Current Rule

Until CPO/CEO separately authorizes active backlog mutation, v0.4 work is dispatched through PTL-controlled planning and implementation packets under `ops/v0.4/`.

## Proposed v0.4 Control Files

Future activation should use new v0.4-specific files, not `ops/v0.3/backlog.yaml`:

- `ops/v0.4/backlog.yaml`
- `ops/v0.4/progress/latest.yaml`
- `ops/v0.4/review_packets/`
- `ops/v0.4/implementation_packets/`

These files are proposed only. This draft does not create or activate them.

## Interim Claim Rule

Before active v0.4 backlog files exist, Engineering may claim only work with:

- explicit CPO/CEO disposition;
- PTL dispatch packet;
- allowed paths;
- forbidden paths;
- required validation commands;
- required return packet shape.

Current authorized frontier:

`V04-LOCAL-LIVE-001 Local Matters first live mutation tranche`

## Forbidden Until Separate Activation

- edit `ops/v0.3/backlog.yaml`;
- edit `ops/v0.3/progress/latest.yaml` for v0.4 activation;
- create active scheduler behavior that treats v0.4 work as claimable without PTL dispatch;
- mark v0.4 implementation done without PTL review.

## Activation Gate

To activate a durable v0.4 backlog, CPO/CEO should approve exact text:

`AUTHORIZE_V0_4_ACTIVE_BACKLOG_FILES_NO_V0_3_BACKLOG_MUTATION`

Required acceptance evidence for that future activation:

- new v0.4 backlog/progress files only;
- no mutation to `ops/v0.3/backlog.yaml`;
- validation command for v0.4 control-plane state;
- PTL dashboard links to GitHub blocker issues;
- migration note explaining which v0.3 closure artifacts remain historical evidence.

## Safe Current Action

Proceed through `V04_LOCAL_LIVE_001_ENGINEERING_DISPATCH_PACKET.md` as a PTL dispatch packet while this protocol remains draft-only.
