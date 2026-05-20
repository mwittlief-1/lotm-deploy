# V04-TOOL-CLEANUP-002 Owner Action Table

Date: 2026-05-20
Status: `PHASE_A_OWNER_ACTION_TABLE_COMPLETE`
Dispatch: `ops/v0.4/cleanup/V04_TOOL_CLEANUP_002_REPO_CLEANING_LANE_DISPATCH.md`

## Inventory Basis

Current dirty count before Phase B cleanup execution:

- `git status --porcelain=v1 -uall`: 2104 paths.

This table intentionally biases toward hold decisions. Execution in this lane is authorized only for explicitly enumerated local tool output.

## Owner / Action Buckets

| Bucket | Count | Representative Paths | Exact Action | Owner | Risk | Execution Authorized In This Lane |
|---|---:|---|---|---|---|---|
| `PRESERVE_CONTROL` | 42 | `ops/v0.4/**`; `ops/v0.4/cleanup/V04_TOOL_CLEANUP_002_REPO_CLEANING_LANE_DISPATCH.md`; `ops/v0.4/PTL_RESPONSE_TO_ENGINEERING.md`; `ops/v0.4/review_packets/V04_LOCAL_LIVE_001_ENGINEERING_REVIEW_PACKET.md` | Preserve untouched. Do not clean, stage, commit, rename, or publish in this lane. | PTL / v0.4 control-plane | High if lost; active dispatch/review/disposition authority. | No cleanup execution. |
| `PRESERVE_ACTIVE_CANON` | 86 | `AGENTS.md`; `SOURCE_STATUS_INDEX.md`; `docs/product/**`; `docs/architecture/**`; `ops/v0.3/second_pass_contracts/**`; `ops/v0.3/catalog_disposition/**` | Preserve untouched pending canon/control publication decision. | PTL / canon owner | High; active canon and planning contracts must not be treated as debris. | No cleanup execution. |
| `HOLD_LOCAL_MATTERS_ACCEPTED` | 4 | `src/content/events.ts`; `src/sim/phases/phase_events.ts`; `src/sim/domains/experience/localMatters.ts`; `tests/sim/local_matters_live_tranche.test.ts` | Hold exactly as-is for Engineering/PTL Local Matters lane. Do not modify, restore, delete, or re-review here. | Engineering / PTL Local Matters reviewer | High; accepted/returned implementation boundary is owned by another thread. | No cleanup execution. |
| `HOLD_RED_ZONE_OWNER_DECISION` | 398 | `ops/v0.3/backlog.yaml`; `ops/v0.3/progress/latest.yaml`; `docs/schemas/hex_manor_data_models_current.md`; `src/sim/turn.ts`; `src/ui/**`; maintenance, obligation, Food, A/R/T, marriage, succession, baseline/golden paths | Hold pending explicit owner/action table or PTL/CPO/CEO decision. | PTL / CPO / CEO / lane owners | Very high; stop-rule or forbidden-path collision. | No cleanup execution. |
| `HOLD_TRACKED_RUNTIME_OR_UI` | 60 | `.gitignore`; `README.md`; `package.json`; `scripts/**`; non-red `src/**`; `docs/arch/v0.3_REFACTOR_CHARTER.md` | Hold pending lane-owner split. Do not restore or delete tracked changes. | Engineering / tooling / domain lane owners | Medium-high; tracked source/tooling churn can hide implementation changes. | No cleanup execution. |
| `HOLD_TRACKED_TEST_OR_FIXTURE` | 76 | `tests/fixtures/**`; `tests/sim/**`; `tests/ui/**`; `tests/support/**` | Hold pending test/fixture owner review. Do not restore, delete, or update fixtures/baselines. | QA / test owners / PTL | High; fixtures and tests may be acceptance evidence or forbidden baseline churn. | No cleanup execution. |
| `HOLD_STALE_V03_EVIDENCE_REVIEW` | 492 | `REVIEW_PACKET.md`; `docs/qa/**`; `ops/v0.3/implementation_readiness/**`; `ops/v0.3/progress/runs/**`; `docs/releases/v0.3*.md` | Hold pending v0.3 stale control/evidence disposition. | PTL / v0.3 closure evidence owner | Medium-high; some files are stale, but some may be closure evidence. | No cleanup execution. |
| `CLEAN_UNTRACKED_GENERATED` | 343 | `qa_artifacts/**` including release readiness, seed replay, playtest ops, world foundation generated reports | Hold in this lane. Despite bucket name, generated artifact deletion is not authorized unless a later generated-artifact disposition proves the files disposable and unreferenced. | QA / Tooling | Medium-high; `qa_artifacts/**` is evidence, not source truth, but may be referenced by closure/control records. | No cleanup execution. |
| `CLEAN_LOCAL_TOOL_OUTPUT` | 5 dirty paths plus 1 ignored cache file | `test-results/.last-run.json`; `var/folders/.../lotm-non-runtime-proof-*/FIRST_NON_RUNTIME_PROOF_IMPLEMENTATION_BUNDLE_*`; `node_modules/.vite/vitest/results.json` | Delete exact enumerated local tool-output files only, then remove empty directories left by that deletion. | Tooling / cleanup lane | Low; local runner/cache output outside accepted evidence paths. | Yes. |
| `UNKNOWN_HOLD` | 598 | `_archive/duplicates/2026-05-06/**`; `.github/ISSUE_TEMPLATE/*.yml`; `docs/BUILD_INFO.json`; `docs/CHANGELOG.md`; `docs/CODEMAP.md`; unclassified untracked/source-adjacent paths | Hold pending owner review. | PTL / relevant owners | Unknown; includes archive/quarantine material and possible control/tooling additions. | No cleanup execution. |

## Authorized Phase B Deletion List

Exact local tool-output files authorized for deletion in this lane:

- `test-results/.last-run.json`
- `var/folders/fw/2vfnxtls0bn2fv2dg4n_1vh40000gn/T/lotm-non-runtime-proof-7xuydQ/FIRST_NON_RUNTIME_PROOF_IMPLEMENTATION_BUNDLE_REPORT.json`
- `var/folders/fw/2vfnxtls0bn2fv2dg4n_1vh40000gn/T/lotm-non-runtime-proof-7xuydQ/FIRST_NON_RUNTIME_PROOF_IMPLEMENTATION_BUNDLE_SUMMARY.md`
- `var/folders/fw/2vfnxtls0bn2fv2dg4n_1vh40000gn/T/lotm-non-runtime-proof-qDnYwc/FIRST_NON_RUNTIME_PROOF_IMPLEMENTATION_BUNDLE_REPORT.json`
- `var/folders/fw/2vfnxtls0bn2fv2dg4n_1vh40000gn/T/lotm-non-runtime-proof-qDnYwc/FIRST_NON_RUNTIME_PROOF_IMPLEMENTATION_BUNDLE_SUMMARY.md`
- `node_modules/.vite/vitest/results.json` if present; this path is ignored rather than dirty, but it is local Vitest cache output named by the dispatch as likely allowed.

No other deletion, restoration, movement, staging, commit, PR, archive, formatter, source edit, test edit, schema edit, fixture edit, backlog edit, or generated evidence deletion is authorized by this table.
