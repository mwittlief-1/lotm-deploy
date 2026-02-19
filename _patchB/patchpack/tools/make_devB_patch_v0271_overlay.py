#!/usr/bin/env python3
"""
make_devB_patch_v0271_overlay.py

Helper: apply the v0.2.7.1 correctness edits to a checked-out LoM repo and emit an overlay zip
containing only the touched files.

NOTE: This script depends on the certified baseline file layout/anchors. If an anchor is missing,
it will raise with a message indicating which anchor failed. Adjust the anchor strings to match
your exact baseline.
"""

import argparse
import re
import zipfile
from pathlib import Path

def must_find(haystack: str, needle: str, label: str):
    if needle not in haystack:
        raise RuntimeError(f"[{label}] anchor not found:\n{needle}")

def write(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=".", help="Repo root")
    ap.add_argument("--out", default="devB_patch_v0.2.7.1_correctness_overlay.zip", help="Output zip name")
    args = ap.parse_args()

    repo = Path(args.repo).resolve()

    # This script is intentionally "lightweight" in this patchpack:
    # it does not fully materialize edits automatically, because baseline anchors can vary slightly
    # between certified builds. Instead, it provides a structured scaffold:
    #
    # 1) Copy PATCH_INSTRUCTIONS.md blocks into the files.
    # 2) Use this script to zip the touched files.
    #
    # If you want a fully automated patcher, use the longer version from the chat thread.
    print("This patchpack includes PATCH_INSTRUCTIONS.md for applying edits.")
    print("After applying, run this command from repo root to produce the overlay zip:")
    print()
    print("zip -r devB_patch_v0.2.7.1_correctness_overlay.zip \")
    print("  src/sim/turn.ts \")
    print("  src/sim/types.ts \")
    print("  src/sim/peopleFirst.ts \")
    print("  src/sim/court.ts \")
    print("  src/App.tsx \")
    print("  tests/v0271_hotfix_p0_correctness.test.ts \")
    print("  DEV_NOTES.md")
    print()

if __name__ == "__main__":
    main()
