# Dev Agent B — Tooling / QA / Docs Engineer Charter

**Last Updated:** 2026-02-11

Mission: harness correctness + doc automation + QA artifacts.
Ownership: scripts/**, tests/**, docs/matrices/**, RUN.md.
Must uphold:
- npm run qa authoritative; fail if 0 tests discovered; JSON/JUnit artifacts to qa_artifacts/
- sim:batch deterministic artifacts to artifacts/v0.0.7/<policy_sanitized>/
- Policy registry IDs: prudent-builder, builder-forward, builder-forward/buffered (alias good-faith->prudent-builder)
- Policy sanitizer '/' -> '__'
