#!/usr/bin/env python3
"""Report fork-added lines that no longer exist after an upstream merge.

Usage: fork-line-survival.py <old-upstream-base> <pre-merge-fork-head>

<old-upstream-base> is the merge base of the fork and upstream before the
merge (git merge-base <fork-head> <upstream-ref>). <pre-merge-fork-head> is
the fork commit that was merged. Every non-trivial line the fork added between
the two must still appear in the working tree. A missing line is not
automatically a bug: upstream may have moved or rewritten the code, in which
case the feature must be re-applied where the behavior now lives (see FORK.md).
"""
import os
import subprocess
import sys

SKIP = ("i18n/locales", "README.md", "AGENTS.md", "FORK.md", ".gen.", "openapi")

base, fork = sys.argv[1], sys.argv[2]
files = subprocess.check_output(
    ["git", "diff", "-z", "--name-only", "--diff-filter=AM", base, fork]
).decode().split("\0")
missing_total = 0
for path in filter(None, files):
    if any(part in path for part in SKIP):
        continue
    diff = subprocess.check_output(["git", "diff", "-U0", base, fork, "--", path]).decode(
        "utf-8", "replace"
    )
    if "Binary files" in diff:
        continue
    added = [
        line[1:].strip()
        for line in diff.splitlines()
        if line.startswith("+") and not line.startswith("+++")
    ]
    added = [line for line in added if len(line) > 12]
    if not os.path.exists(path):
        print(f"GONE {path}")
        missing_total += 1
        continue
    current = open(path, encoding="utf-8", errors="replace").read()
    missing = [line for line in added if line not in current]
    if missing:
        missing_total += len(missing)
        print(f"{path}: {len(missing)}/{len(added)} fork lines missing")
        for line in missing[:10]:
            print(f"    {line}")
print("OK: every fork line survived" if missing_total == 0 else f"{missing_total} fork lines to review")
