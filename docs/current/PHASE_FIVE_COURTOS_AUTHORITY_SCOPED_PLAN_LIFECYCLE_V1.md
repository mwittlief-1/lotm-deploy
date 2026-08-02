# Phase Five CourtOS Authority-Scoped Plan Lifecycle V1

Status: implemented server contract and durable local-UAT store; write API and
player controls remain fail-closed pending actor admission and the accepted
Track 2 authority contract.

## Product rule

A House turn plan is an aggregate of contributions owned by their competent
actors. Delegation is not a disguised approval queue for the Head of House.
Within delegated scope, the delegate authors and locks the contribution. The
Head may inspect it but cannot edit, approve, reject, or replace it. Changing
who holds the authority is a separate Track 2 operation.

The aggregate plan may be submitted only when every included authority scope
is locked and Track 2 has issued a permitted submission receipt. Submission
does not transfer ownership of a delegate's contribution to the submitting
actor.

## Implemented lifecycle

1. An actor saves a contribution within one authority scope.
2. Every contribution, including an empty/incomplete draft, requires a
   permitted Track 2 scope-admission receipt binding the actor, House, scope,
   authority basis, source generation, and current authority snapshot.
3. Draft contributions may remain incomplete and may retain `blocked` or
   `needs_evidence` authority receipts for honest review.
4. A contribution can be saved as `locked` only when every command has a
   matching `permitted` Track 2 authority receipt.
5. Each save creates an immutable new plan version that supersedes the current
   version.
6. Aggregate submission requires every contribution to be locked and requires
   a matching permitted `house_turn_submission` authority receipt.
7. A submitted plan records its submitting actor, time, and authority receipt,
   and is immutable.

## Safety properties

- Every request is bound to House, turn, actor, source generation, effective
  date, source digest, current authority generation/effective date/digest,
  expected plan version, and expected plan digest.
- An actor can save only a contribution whose `actor_person_id` matches the
  request actor.
- Commands cannot cross House, turn, authority-scope, or source-generation
  boundaries.
- Commands carry responsibility, targets, evidence references, requested
  effective date, payload, and their own idempotency key.
- Payloads must be finite, plain JSON. Unsupported runtime values fail closed.
- Reusing an operation idempotency key for different content fails closed.
- An exact retry returns the immutable prior result.
- Optimistic compare-and-swap prevents concurrent updates from silently
  overwriting each other.
- Stale source snapshots and stale plan versions fail closed.
- An existing plan cannot cross a source or authority generation merely by
  changing the request snapshot. It requires an explicit future Track 2 rebase
  operation before further save or submission.
- Each Track 2 receipt is bound to the exact RFC 8785/JCS command digest,
  source generation, current authority snapshot, authority scope, actor, and
  authority basis. A revoked or superseded authority generation cannot be
  replayed as current permission.
- Plan and request digests use RFC 8785 JSON Canonicalization Scheme bytes plus
  SHA-256 so Track 2, Track 4, and the runtime can reproduce them without
  locale-dependent property ordering.
- Authority is consumed from Track 2 receipts. CourtOS does not infer a grant
  from title, responsibility ownership, Head-of-House status, or UI context.

## Persistence

`CourtOsSqlitePlanningStoreV1` persists immutable plan versions, the current
plan head, save receipts, and idempotency results in SQLite using WAL and a
transactional compare-and-swap boundary. This is the durable store for local
UAT and a reference implementation of the storage port.

The hosted runtime must use a durable deployment adapter before planning writes
are enabled. A transient or read-only deployment filesystem is not an accepted
persistence backend. Until that adapter and the actor/authority contracts are
admitted, the existing CourtOS runtime remains inspection-only.

## Source files

- `src/server/courtosPlanning/contracts.ts`
- `src/server/courtosPlanning/planLifecycle.ts`
- `src/server/courtosPlanning/sqlitePlanningStore.ts`
- `tests/server/courtosPlanningLifecycle.test.ts`

## Deferred integration gates

The following are deliberately not inferred or mocked:

- acting player identity and actor admission;
- the final Track 2 authority-validation receipt adapter;
- responsibility assignment mutation or delegation changes;
- business-feasibility validation;
- commitment and economic execution;
- simulation outcomes, Matters, reports, or correspondence prose;
- hosted durable persistence and authentication/session binding;
- the submitted-plan-to-engine endpoint.

When those contracts are admitted, the next safe step is an authenticated,
House-scoped API adapter that maps the admitted actor and source projection into
this lifecycle. The UI may then expose Save, Lock, and Submit only from the
capabilities returned by that adapter.
