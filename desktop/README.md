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

The local package is ad-hoc signed and remains the fast founder-UAT path. Build
it without a DMG or installer using:

```sh
npm run courtos:desktop:package:local:mac
```

That command writes a versioned distribution manifest and runs the package-size
budget. It does not require an Apple account and it is never Steam-upload
eligible.

External macOS packages use `COURTOS_DESKTOP_DISTRIBUTION_MODE=external_alpha`.
That mode enables Hardened Runtime and the tracked Electron/Steam entitlements,
skips the local ad-hoc signature, and requires Developer ID signing plus Apple
notarization. It also requires the approved branded icon at
`desktop/build/icon.icns`; the Electron default icon is never eligible for an
external build. The preflight records only whether required credentials exist;
it never prints or stores a secret.

The shared Windows target is contract-ready but intentionally fail-closed until
three external identities exist: a pinned Windows x64 Scribe runtime, a Windows
x64 native-module build, and a Steam Windows depot ID.
