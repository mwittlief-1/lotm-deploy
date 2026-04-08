# v0.3 Social T06 Dispatch

Date: 2026-04-06
Branch: codex/v0.3-refactor-kickoff

Dispatch:
- Claimed Social `V03-R2-004-T06` for `codex/v0.3-lane-social-mechanics`.

Claim window:
- claimed_at: `2026-04-06T17:41:10-0400`
- claim_expires_at: `2026-04-06T21:41:10-0400`

Queue notes:
- `V03-R2-004-T06` is the current active frontier.
- If `T06` closes cleanly, Social may self-advance to `V03-R3-003-T01` and `V03-R3-003-T02` without another integrator pass.
- `V03-R3-003-T03` remains gated by `V03-R2-006-T06`, so the self-advance chain stops there unless that dependency is resolved first.

Validation:
- `npm run ops:v0.3:validate -- --json`
- `ruby scripts/opsV03SchedulerDryRun.rb --json`
- `ruby scripts/opsV03RebaseDryRun.rb --json`
