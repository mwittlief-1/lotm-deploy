# v0.4 GitHub Notification Protocol

Date: 2026-05-20
Status: `ACTIVE_NOTIFICATION_SETUP`
Bundle: `V0_4_UNBLOCK_AND_NOTIFY_BUNDLE_001`

## Purpose

Use GitHub issues as the primary push-notification mechanism for CPO/CEO blockers during v0.4 planning and implementation authorization.

Every CPO/CEO blocker issue must:

- assign `mwittlief-1`;
- directly mention `@mwittlief-1` in the issue body;
- begin the body with one first-line blocker label:
  - `CPO_DECISION_REQUIRED`
  - `CEO_PRIORITY_REQUIRED`
  - `RED_ZONE_OVERRIDE_REQUIRED`
  - `SCHEDULER_BLOCKED`
- include decision needed, options, PTL recommendation, exact approval text, what is blocked, and safe parallel work continuing.

## Repository Labels

The following labels are required for blocker routing:

- `cpo-decision-required`
- `ceo-priority-required`
- `red-zone-override-required`
- `scheduler-blocked`
- `ptl-escalation`
- `safe-parallel-work`
- `v0.4-planning`

Setup result: labels were verified on GitHub after applying them through the connected GitHub app to the notification smoke-test issue.

## Smoke Test

Smoke-test issue:

- Title: `CPO DECISION REQUIRED: Notification Protocol Test`
- URL: `https://github.com/mwittlief-1/lotm-deploy/issues/22`
- Assignee: `mwittlief-1`
- Direct mention: `@mwittlief-1`
- Labels after provisioning:
  - `cpo-decision-required`
  - `ceo-priority-required`
  - `red-zone-override-required`
  - `scheduler-blocked`
  - `ptl-escalation`
  - `safe-parallel-work`
  - `v0.4-planning`
- Final state: closed as completed after creation was confirmed.

## Issue Templates

Created templates:

- `.github/ISSUE_TEMPLATE/cpo_decision_required.yml`
- `.github/ISSUE_TEMPLATE/red_zone_override_required.yml`
- `.github/ISSUE_TEMPLATE/scheduler_blocked.yml`

GitHub issue forms add form headings to submitted bodies, so automation or manual PTL issue creation must still ensure the literal first body line is the blocker label. The templates carry the required default label and mention fields and assign `mwittlief-1`.

## Active Blocker Issues Created

The bundle created the active blocker issues required by the protocol:

| Blocker | Issue | Labels |
|---|---|---|
| Guided tester boundary | `https://github.com/mwittlief-1/lotm-deploy/issues/23` | `ptl-escalation`, `cpo-decision-required`, `v0.4-planning`, `safe-parallel-work` |
| First v0.4 runtime tranche | `https://github.com/mwittlief-1/lotm-deploy/issues/24` | `ptl-escalation`, `red-zone-override-required`, `v0.4-planning`, `safe-parallel-work` |
| v0.4 active backlog activation | `https://github.com/mwittlief-1/lotm-deploy/issues/25` | `ptl-escalation`, `scheduler-blocked`, `v0.4-planning`, `safe-parallel-work` |
| Actor accounting and fiscal bridge | `https://github.com/mwittlief-1/lotm-deploy/issues/26` | `ptl-escalation`, `cpo-decision-required`, `v0.4-planning`, `safe-parallel-work` |
| Hidden seed and fiscal/labor visibility | `https://github.com/mwittlief-1/lotm-deploy/issues/27` | `ptl-escalation`, `cpo-decision-required`, `v0.4-planning`, `safe-parallel-work` |

Each issue is assigned to `mwittlief-1` and directly mentions `@mwittlief-1`.

## Programmatic Issue Body Template

Use this exact shape when creating blocker issues through the GitHub app/API:

```md
CPO_DECISION_REQUIRED

@mwittlief-1

Decision needed:
...

Options:
- ...

PTL recommendation:
...

Exact approval text:
`...`

What is blocked:
...

Safe parallel work continuing:
...
```

For `CEO_PRIORITY_REQUIRED`, use labels `ptl-escalation`, `ceo-priority-required`, and `v0.4-planning`.

For `RED_ZONE_OVERRIDE_REQUIRED`, use labels `ptl-escalation`, `red-zone-override-required`, and `v0.4-planning`.

For `SCHEDULER_BLOCKED`, use labels `ptl-escalation`, `scheduler-blocked`, and `v0.4-planning`.

## Safety Rule

Creating a blocker issue notifies CPO/CEO; do it only for real blockers or clearly labeled smoke tests. Close smoke-test issues immediately after verifying assignment, mention, and labels.
