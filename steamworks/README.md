# Merecross Steam distribution

Steam application identity is tracked in
`config/courtos-desktop-distribution.v1.json`:

- App ID: `5084580`
- Current content depot: `5084581`
- Install folder: `Merecross`
- macOS launch path: `Merecross.app`

The repository does not contain Steam credentials and no script sets a build
live. `prepareCourtosSteamPipe.mjs` generates absolute, machine-local VDF files
under `/private/tmp/merecross-steampipe/5084580/`; it never invokes SteamCMD.

## Local preview

An ad-hoc local build can prove the VDF and artifact contract without becoming
upload eligible:

```sh
npm run courtos:steam:prepare:mac -- --preview
```

The resulting manifest must say `preview_only_not_upload_eligible`.

## Internal or external Steam build

The upload-eligible path is deliberately fail-closed:

1. Package with a Developer ID Application identity and Hardened Runtime.
2. Submit to Apple's notarization service and staple the returned ticket.
3. Run `npm run courtos:desktop:distribution:verify -- --channel steam_internal`.
4. Run `npm run courtos:steam:prepare:mac -- --channel steam_internal`.
5. Review the generated manifest and VDF files.
6. Invoke SteamCMD manually or through a separately approved release job.
7. Select a build for a password-protected Steam branch in Steamworks only
   after human confirmation.

Windows is a second build from the same source—not a transformed Mac binary.
It remains fail-closed until Steam assigns a Windows depot ID and the pinned
Windows x64 Scribe runtime and native-module build exist.
