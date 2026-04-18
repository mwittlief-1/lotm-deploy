# Intake Review Checklist

Use this checklist before integrator acceptance of any lane-owned task.

1. Run the structural audit.
   - `npm run ops:v0.3:intake-audit -- --task <TASK_ID> --require-completed`
2. Open the task packet in `ops/v0.3/backlog.yaml`.
   - Confirm the submitted work still matches `exact_deliverables`, `definition_of_done`, `required_test_updates`, `stop_rules`, and `handoff_requirements`.
3. Open the task-owned run report.
   - Confirm `delivery_state` is `completed`.
   - Confirm `changed_files`, `contracts_or_surfaces`, and `tests_run` are concrete rather than placeholder text.
4. Review the actual diff against the task boundaries.
   - Confirm the changed files stay inside `allowed_paths`.
   - Confirm the task did not drift into `forbidden_paths` or downstream work gated by `do_not_advance`.
5. Re-run the focused evidence from the packet.
   - Re-run the task's focused command from `required_test_updates`.
   - If the packet calls for deterministic fixtures or UAT evidence, open those artifacts before accepting.
6. Reconcile downstream scheduling.
   - Accept only if the task packet is satisfied and the handoff is truly claimable.
   - If the handoff is `blocked` or `advanced_not_claimable`, record the rejection note and keep downstream tasks frozen.
