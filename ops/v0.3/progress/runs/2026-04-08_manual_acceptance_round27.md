## 2026-04-08 Manual Acceptance Round 27

- Accepted Social `V03-R3-003-T03` through `V03-R3-003-T05`.
- Accepted Engine `V03-R3-006-T01` through `V03-R3-006-T05`.
- Accepted UI `V03-R3-007-T01` through `V03-R3-007-T05`.
- Closed epics:
  - `V03-R3-003`
  - `V03-R3-006`
  - `V03-R3-007`
- Opened the next real frontier:
  - UI `V03-R4-003-T01`
- Pre-promoted the rest of the same-lane UI playtest-ops chain:
  - `V03-R4-003-T02`
  - `V03-R4-003-T03`
  - `V03-R4-003-T04`

### Accepted code

- `6a189d1` `feat: wire court agenda stubs`
- `51b6583` `docs(ai): audit v0.3 evidence rail baseline`
- `c54f66c` `feat(ai): add belief payload states`
- `83cf234` `feat(ai): add runtime domain evidence emitters`
- `3f5fb4f` `feat(ai): expose rail debug packet`
- `a340d5d` `docs(ai): close v0.3.3 rail packet`
- `158e080` `feat(content): inventory v0.3.3 experience copy slots`
- `d549290` `feat(content): add obligations outcome templates`
- `815ce89` `feat(content): add grant and marriage templates`
- `a95387d` `feat(content): add arrears stage warning templates`
- `27b90fd` `feat(ui): wire v0.3.3 experience content spine`

### Gates

- `npx vitest run tests/sim/agenda_registry_population.test.ts tests/ui/playScreenAgenda.test.ts tests/sim/beliefs_domain.test.ts tests/sim/runtime_domain_evidence.test.ts tests/sim/policy_domain.test.ts tests/sim/bounded_snapshot_contract.test.ts tests/ui/experienceContent.test.ts tests/ui/playScreenObligations.test.ts tests/ui/manorStatePanel.test.tsx tests/ui/playScreenExperienceCopy.test.ts tests/ui/prospectsPanel.test.tsx`
- `npm run qa`
- `npm run preflight`
- `npm run seed:replay:batch`
- `npm run seed:replay:batch`
- `npm run repo:duplicates -- --json`

### Replay

- `run1`: `fec2597e55528776bf3eb186e061a3622a678b8734007aa56fc692c0c72751b1`
- `run2`: `fec2597e55528776bf3eb186e061a3622a678b8734007aa56fc692c0c72751b1`

### Notes

- The lane-local replay hashes for Social, Engine, and UI moved on their own branches, but the integrated kickoff result remained on the accepted replay line once the changes were applied together on current repo truth.
- Social and Engine do not expose a new honest follow-on frontier after this acceptance round.
- UI is the only lane reopened by this round, through `V03-R4-003-T01`.
