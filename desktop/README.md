# Merecross desktop UAT host

This Electron host packages the existing CourtOS renderer and its admitted
read-only data locally. It does not introduce a second backend or a browser
service: renderer API calls resolve through `merecross://app/api/...` into the
same CourtOS request handlers and SQLite read models used by the UAT web host.
It deliberately ships only the admitted CourtOS microhex export and Council
Room read index—not the MapGen source tree or the full Ready-data archive.

## Local macOS UAT

```sh
npm run courtos:desktop:build
npm run courtos:desktop:package
```

The default macOS artifact is written outside the synced repository at
`/private/tmp/merecross-courtos-desktop/`. This prevents Finder metadata from
invalidating the local ad-hoc app signature. CI or a release pipeline should
set `COURTOS_DESKTOP_OUTPUT` to its clean staging directory and provide the
appropriate Developer ID signing/notarization credentials.

The local package is an unsigned UAT build. Steamworks integration, platform
signing, notarization, auto-updating, and save migration are intentionally
later distribution work.
