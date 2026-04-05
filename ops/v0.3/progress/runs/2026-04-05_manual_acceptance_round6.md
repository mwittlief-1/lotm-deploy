version: 1
run_id: 2026-04-05_manual_acceptance_round6
date: 2026-04-05
operator: codex-integrator
summary:
  accepted:
    - V03-R3-005-T03
  dispatched:
    - V03-R3-005-T04
  blocked: []
  notes:
    - Accepted deterministic realm latent-pressure seeding from the engine lane.
    - Reopened T04 immediately so the same lane can expose the weather outputs without another scheduling pause.
evidence:
  engine_handoff: ops/v0.3/progress/runs/V03-R3-005-T03.yaml
  engine_artifacts:
    - src/sim/domains/realm/politicalWeather.ts
    - tests/sim/political_weather_contract.test.ts
gates:
  ops_v03_validate: pass
  scheduler_dry_run: pass
  rebase_dry_run: pass
  qa: pass
  preflight: pass
  seed_replay_batch_twice: pass
  repo_duplicates: pass
