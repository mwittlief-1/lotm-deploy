# DevB Patchpack — LoM v0.2.7.1 Correctness

This archive contains **DevB's recovered patch material** for the v0.2.7.1 hotfix scope.

Because the certified baseline repo files were not available inside this chat session, this pack is delivered as:

- a **search-string patch recipe** (copy/paste blocks),
- a **P0 aging invariant test template**, and
- lightweight helper tooling + notes.

If you want a *fully materialized overlay* (edited `turn.ts`, `court.ts`, etc.), run the patch recipe in your normal workflow, then export the overlay zip from the touched files (command included in the recipe).

## Contents

- `patches/0001_v0.2.7.1_correctness_searchpatch.md` — canonical patch recipe
- `new_files/tests/v0271_hotfix_p0_correctness.test.ts` — test template (adjust imports/schema as needed)
- `snippets/DEV_NOTES_append.md` — suggested DEV_NOTES snippet
- `snippets/EXTRA_NOTES_peopleFirst_spouse_edges.md` — kinship/spouse edge caveat
- `tools/make_devB_patch_v0271_overlay.py` — helper script (prints the overlay zip command)

