This directory quarantines numbered duplicate files that were previously mixed into the active workspace.

Structure:
- `2026-03-24/root/` contains duplicate files that originally lived at the repo root.
- `2026-03-24/<path>/` preserves the original relative path for duplicates moved out of active directories.

Policy:
- Unsuffixed files in the main workspace are the canonical active files.
- Quarantined copies are retained for historical reference only and should not be used by scripts, tests, or builds.
