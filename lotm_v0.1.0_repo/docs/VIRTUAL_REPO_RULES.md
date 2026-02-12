# Virtual Repo Rules (LOCKED)

**Last Updated:** 2026-02-11

## Canonical Artifacts per version
Each release v0.0.X has two canonical artifacts:

1) Repo Zip (source)
- Name: lotm_v0.0.X_repo.zip
- Must include: docs/BUILD_INFO.json

2) Playtest Packet Zip (evidence)
- Name: lotm_v0.0.X_playtest_packet.zip

## BUILD_INFO (drift prevention)
Repo zips MUST include docs/BUILD_INFO.json with:
- app_version
- sim_version
- code_fingerprint (sha256 of src/scripts/tests/content + core configs)
- policy_ids
- created_at_utc

Balance + QA reports must quote app_version + code_fingerprint.

## Policy ID sanitizer (WP-10 LOCK)
- Logical policy ID may contain '/' (builder-forward/buffered)
- CLI accepts it: --policy=builder-forward/buffered
- Artifact folder name is sanitized: replace '/' with '__'
  - builder-forward/buffered -> builder-forward__buffered
