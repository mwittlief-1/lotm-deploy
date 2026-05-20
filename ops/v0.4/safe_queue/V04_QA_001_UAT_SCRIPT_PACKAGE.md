# V04-QA-001 v0.4 UAT Script Package

Date: 2026-05-20
Status: `COMPLETE_DOCS_ONLY`
Classification: `GREEN_READY`, `DOCS_ONLY`

## Boundary

This package prepares UAT material only. It does not authorize guided testers, product UI changes, runtime behavior, or implementation. Guided testing still requires separate CPO/CEO approval.

## UAT Theme

v0.4 thesis: `Legible Playable Pressure`.

The test should determine whether a player can understand pressure sources, plausible choices, and consequences without needing debug/proof language.

## Script A: Mental Model Walkthrough

Prompt:

- What is your house trying to preserve this turn?
- Which pressures are estate/material, household/dynasty, obligation, relationship, or knowledge pressures?
- Which details feel known, likely, possible, or hidden?

Expected observation:

- Tester can distinguish house continuity from current Head of House.
- Tester can explain why land, obligations, and household capacity matter.
- Tester does not mistake proof/debug evidence for player-facing truth.

## Script B: Obligation Interpretation

Prompt:

- Name what is owed, to whom, by what authority, and what happens if it is ignored.
- Identify which payment or response choices are available and which are only future possibilities.

Expected observation:

- Tester can identify counterparty and form of obligation.
- Tester can distinguish current live behavior from planned obligation-catalog depth.

## Script C: Local Matters Readiness

Prompt:

- Look at candidate Local Matters rows and classify which feel like interactive prompts, automatic visible events, background visible events, or hidden evidence-only rows.
- Identify what receipt would make each event trustworthy.

Expected observation:

- Tester sees Local Matters as state-linked pressure, not flavor.
- Tester does not expect every candidate row to become an immediate prompt.

## Script D: Household / Dynasty Visibility

Prompt:

- Identify heir, successor/vacancy language, relevant kin, office/staff roles, and candidate-source confidence.
- State what you trust and what you would investigate.

Expected observation:

- Tester can distinguish visible dynasty state from hidden substrate/provenance.
- Tester understands that succession/claims/regency live mutation remains a separate authorization.

## Script E: Red-Zone Candidate Preference

Prompt:

- Compare Local Matters live mutation, maintenance Coin/Labor, preset initialization, obligation rebasing, Food, A/R/T, and UI/turn wiring.
- Which first tranche would make the game feel more playable fastest?

Expected observation:

- Tester preference can inform CPO/CEO priority but cannot authorize implementation.

## Capture Fields

- confusion quote;
- pressure source identified;
- missing explanation;
- mistaken live/future assumption;
- desired action;
- severity: low, medium, high, blocking;
- red-zone implication: none, CPO decision, red-zone override.
