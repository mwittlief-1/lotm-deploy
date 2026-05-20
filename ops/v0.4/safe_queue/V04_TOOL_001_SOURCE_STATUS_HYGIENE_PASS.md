# V04-TOOL-001 v0.4 Source-Status Hygiene Pass

Date: 2026-05-20
Status: `COMPLETE_DOCS_ONLY`
Classification: `GREEN_READY`, `DOCS_ONLY`

## Purpose

Provide a read-only source-status hygiene frame for v0.4 planning. This does not delete, rename, move, or mutate active docs or runtime files.

## Current Hygiene Risks

- The shared checkout remains broadly dirty.
- There are active, historical, duplicate, generated, and superseded docs in the same tree.
- Root-level legacy readmes and old release docs can be mistaken for controlling v0.4 canon.
- Numbered duplicate files remain historical artifacts and should not become new source truth.
- `ops/v0.3/backlog.yaml` and `ops/v0.3/progress/latest.yaml` are dirty in the shared checkout but were not mutated by this bundle.

## Source Status Classes

| Class | Meaning | v0.4 handling |
|---|---|---|
| `ACTIVE_CANON` | Current product/architecture/runtime doctrine. | Read before decisions; do not override casually. |
| `PLANNING_CANON` | Accepted planning direction without implementation authority. | May feed docs/spec packets. |
| `CATALOG_CONTENT` | Row/catalog seed for future planning. | Complete rows; do not hook live behavior. |
| `PROOF_EVIDENCE` | Gate, QA, or report evidence. | Use for acceptance context, not source truth. |
| `CONSOLIDATION_SOURCE` | Historical input or roadmap evidence. | Reconcile before use. |
| `SUPERSEDED` | No longer controlling. | Cite only to explain retirement. |
| `DIRTY_UNACCEPTED` | Present in checkout but not accepted by current packet. | Exclude from approval. |

## v0.4 Hygiene Actions

- Maintain a candidate source-status matrix in planning docs.
- Route duplicate-file cleanup through a separate docs-hygiene packet.
- Keep `.github` notification templates as control-plane support, not product canon.
- Keep red-zone packets separate from safe queue docs.
- Never infer authorization from the presence of runtime/source files in the dirty checkout.

## Acceptance

This pass is complete when v0.4 packets explicitly state their source classes, dirty-checkout caveat, and non-authorization boundaries.
