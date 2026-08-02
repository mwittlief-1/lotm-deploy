# CourtOS Release and Recovery Runbook V1

## Purpose

CourtOS production releases use immutable, source-derived builds. A deployment is staged and smoke-tested before any production domain is moved. The release workflow pauses at an approval-gated production environment before promotion; rollback is also available as a separate approval-gated operation.

This runbook does not replace the repository promotion order in `AGENTS.md`. Internal agent UAT and the independent architecture review must pass before a human playtest candidate is promoted.

## Runtime data contract

- The two admitted 1120 SQLite contracts are checksum-pinned in `config/courtos-runtime-inputs.v1.json`.
- Vercel packages those SQLite files with the three read-only API functions.
- Each SQLite-backed function packages only its own exact pinned contract path. The Council function packages neither database.
- The production binding resolves to the pinned repository paths by default. `COURTOS_1120_SQLITE_PATH` and `HOUSEHOLD_1120_SQLITE_PATH` are explicit operator overrides, not required hidden configuration.
- The API uses an in-process, read-only SQLite driver. Production does not depend on an unprovisioned host `sqlite3` executable.
- All API reads retain their endpoint-specific `503` failure contracts and `Cache-Control: no-store` behavior.

## Player and access boundary

CourtOS currently operates as a local single-player runtime. The player controls
the House selected by the saved-game or UAT launch configuration; this does not
make the player a particular in-world person. Effective acting authority must be
resolved separately from admitted source data and may change during play.

The House selector scopes the read model but is not web authentication. Any
internet-accessible preview or production deployment must remain behind platform
deployment protection. Do not expose an unprotected CourtOS URL on the public
internet. The current human-playtest launch is House Pearwick Hall as declared in
`qa/uat/uat.config.json`; UI code contains no Pearwick fallback.

For a deployed build, configure `VITE_COURTOS_PLAYER_HOUSE_ID` in the protected
Vercel production environment to the admitted House id declared by
`humanPlaytest.houseId`. This is a build-time player entitlement, not a selector
default. Changing it requires a new immutable build and the complete promotion
path; never infer it from a request query parameter.

## Required GitHub configuration

Configure these repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_AUTOMATION_BYPASS_SECRET` when deployment protection is enabled

Configure the `courtos-production` GitHub environment with required reviewers. That environment gates both promotion and rollback.

Configure `COURTOS_PRODUCTION_URL` as a variable on that protected environment. Keeping the canonical route out of dispatch input prevents a release operator from redirecting post-promotion verification to an arbitrary host.

## Release

Run **CourtOS staged release** with operation `release`. Supply:

- the prior known-good immutable `rollback_url`; and
- an admitted `smoke_house_id` plus its corresponding `smoke_household_entity_id`.

The workflow:

1. checks out Git LFS inputs;
2. installs with pinned Node and pnpm versions;
3. runs `pnpm run qa:engineering`;
4. builds using the Vercel production environment;
5. deploys with `--prod --skip-domain`, so no production domain moves;
6. verifies through the Vercel API that both deployment URLs belong to the configured CourtOS project and are `READY`;
7. checks the landing document and all three API contracts on both the staged candidate and the rollback target;
8. records the source SHA and checksum of the tracked-input verification report; and
9. retains the immutable URLs, provenance, ownership checks, and smoke evidence as workflow artifacts.

A failed step leaves production routing unchanged.

After staging passes, the promotion job waits on the `courtos-production` GitHub environment. It checks out the exact staged source SHA, re-smokes the immutable deployment, promotes it, and then smokes the canonical production route. If that post-promotion smoke fails, the workflow immediately restores the supplied known-good rollback deployment.

## Roll back

Keep the prior known-good immutable deployment URL in the release record. If production must be restored outside a release attempt, run the workflow with operation `rollback`, that `rollback_url`, and the same source-derived smoke selectors. The canonical route comes only from the protected `COURTOS_PRODUCTION_URL` environment variable. GitHub environment approval is required.

The workflow smokes the rollback target before routing traffic and the canonical route after the rollback. Rollback does not rebuild the application or mutate its pinned read data.

## Local smoke

The same smoke contract can run against a local preview or remote candidate:

```sh
node scripts/smokeCourtosDeployment.mjs \
  --base-url http://127.0.0.1:4173 \
  --house-id <admitted-house-id> \
  --household-entity-id <corresponding-admitted-household-entity-id>
```

Selectors must come from admitted current source data. The script intentionally contains no Pearwick, Holtcross, person, portrait, manor, or responsibility fixture.
