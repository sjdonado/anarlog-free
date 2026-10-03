---
name: fork-upstream-sync
description: Pull upstream Anarlog (fastrepl/anarlog) into this personal fork and prove every fork feature still works, by intent rather than by code. Use for "pull from upstream", "sync with upstream", "update the fork", or "check the fork is not broken".
metadata:
  internal: true
---

# Sync the fork with upstream

This repository is a personal fork of https://github.com/fastrepl/anarlog. Upstream ships bug fixes and refactors that move or rewrite the code the fork patches. A sync is done when every feature in `FORK.md` works end to end on the new upstream code. It is not done when the conflicts are resolved.

## Principles

- `FORK.md` is the contract. Each feature has an Intent, Behavior lines, a Verify line, and Current anchors. Behavior lines do not change during a sync. Anchors are hints and are expected to drift.
- Resolve every conflict and every refactor by the feature's Behavior, not by restoring the old lines.
- Upstream first: if upstream now ships the same behavior or fixes the same bug, keep the upstream implementation, drop the fork patch, and record that in the feature's entry. Never keep a duplicate.
- If upstream removes the premise of a feature (for example, the screen the fork hides no longer exists), stop and ask the owner before porting.
- Publication: committing the merge on the sync branch and fast-forwarding local `main` are part of this workflow. Pushing to `origin` needs the owner's explicit approval for that push.

## 1. Prepare

1. Check that the working tree is clean (`git status --short`). If it is not, ask the owner whether to commit the work in progress first. Do not stash or discard it.
2. Check that the `upstream` remote exists; add it if missing: `git remote add upstream https://github.com/fastrepl/anarlog.git`.
3. `git fetch upstream`, then measure the sync: `git log --oneline main..upstream/main | wc -l` and `git diff --stat main...upstream/main | tail -1`.
4. Record two refs for step 3: `OLD_BASE=$(git merge-base main upstream/main)` and `FORK_HEAD=$(git rev-parse main)`.
5. Create the sync branch: `git checkout -b chore/upstream-sync-<YYYY-MM-DD>`.
6. Write the branch note and task list under `.agent/` (see the global agent conventions), with one task per step below.

## 2. Merge and resolve conflicts

Run `git merge --no-edit upstream/main`, then resolve by file class:

| Conflict | Resolution |
|---|---|
| `README.md`, `FORK.md` | Keep ours (`git checkout --ours`). Update them afterwards if a feature moved. |
| `apps/desktop/src/i18n/locales/**` | Take theirs, then regenerate in step 4. Never hand-merge catalogs. |
| A file upstream deleted | Check the upstream commit message. If upstream moved or now generates it (for example `crates/api-client/openapi.gen.json`, moved to `OUT_DIR`), accept the deletion with `git rm`. |
| Generated bindings (`*/js/bindings.gen.ts`) | Take theirs, then regenerate with the owning crate's `export_types` test (step 4). Never hand-edit. |
| Tests that upstream restructured | Take theirs, then re-add the fork's test cases in the new style. Find the fork cases with `git diff $OLD_BASE $FORK_HEAD -- <test file>`. |
| Fork source code | Resolve by the feature's Behavior in `FORK.md`. When upstream extracted the patched code into a new place (for example the settings navigation into `useSettingsNavGroups`), move the patch to the new place so every consumer keeps the behavior. |

When the merge has no conflicts left, check that no conflict markers remain (`git diff --check` and a search for `<<<<<<<`), then continue. Commit the merge only after step 4 is green.

## 3. Anchor sweep

1. Run `python3 .agents/skills/fork-upstream-sync/scripts/fork-line-survival.py $OLD_BASE $FORK_HEAD`. It lists every non-trivial line the fork added that is no longer in the working tree.
2. For each missing line, decide which case applies and act:
   - Reformatted or relocated by your own resolution in step 2: no action.
   - Upstream moved the code: re-apply the smallest patch where the behavior now lives.
   - Upstream ships the behavior: drop the patch (upstream first).
3. For each feature in `FORK.md`, search its Current anchors. Update every anchor that moved, in the same change.

## 4. Behavioral sweep

Run all of these and fix what the merge broke:

```
pnpm install --frozen-lockfile
pnpm -F @anlg/ui build
pnpm -F @anlg/desktop typecheck
pnpm -F @anlg/desktop test
.agents/skills/fork-upstream-sync/scripts/cargo-test-swift.sh -p owhisper-client -p shortcut-macos -p tauri-plugin-shortcut -p audio-device -p tauri-plugin-dictation
pnpm exec oxlint --quiet apps/desktop/src/
pnpm -F @anlg/desktop exec lingui extract --clean --workers 1
pnpm -F @anlg/desktop exec lingui compile --strict --workers 1
```

- Re-run the two `lingui` commands until the catalogs do not change any more.
- `shared/personal.test.ts` guards the switchable flags. A failure there means upstream flipped a fork default back.
- `cargo-test-swift.sh` also regenerates `plugins/*/js/bindings.gen.ts` through the `export_types` tests. Keep a regenerated file only when its diff is a real type change.
- Compare `CHATGPT_CODEX_CLIENT_VERSION` in `apps/desktop/src/settings/ai/llm/subscriptions/models.ts` with `npm view @openai/codex version`, and keep it at or above upstream's value.
- Format changed files with `pnpm exec dprint fmt --allow-no-files <files>` and check them with `pnpm exec dprint check --allow-no-files <files>`.
- Pre-existing upstream clippy failures (for example collapsible `if` statements in `crates/shortcut-macos/src/tap.rs`) are not sync regressions. Report them separately.

When everything is green, commit the merge (`git commit --no-edit`), then commit any catalog or anchor updates separately (`chore: regenerate i18n catalogs after upstream sync`, `docs: update fork anchors after upstream sync`).

## 5. App sweep

1. Build: `bash .agent/build-desktop-local.sh`. The script is machine-local and not committed; it applies the workarounds listed in `README.md`. Exit status 1 with "A public key has been found, but no private key" is expected: the bundles are still produced.
2. The build regenerates `plugins/shortcut/js/bindings.gen.ts` with formatting-only drift. Restore it with `git show HEAD:plugins/shortcut/js/bindings.gen.ts > plugins/shortcut/js/bindings.gen.ts`.
3. Install and launch:
   ```
   osascript -e 'quit app "Anarlog Dev"'
   rm -rf "/Applications/Anarlog Dev.app"
   cp -R "apps/desktop/src-tauri/target/debug/bundle/macos/Anarlog Dev.app" /Applications/
   codesign --verify --deep --strict "/Applications/Anarlog Dev.app"
   open "/Applications/Anarlog Dev.app"
   ```
   `/Applications` is what Raycast launches. The build is signed with a stable Apple Development identity, so Accessibility and Input Monitoring grants survive the reinstall.
4. Run the end-to-end check in each feature's Verify line in `FORK.md`. Checks that need the owner's hands or devices (dictation with Fn, AirPods, the iPhone microphone, the lid closed) are handed to the owner as a short numbered list. Record each feature as checked, or as unchecked with the reason.
5. Useful evidence: `~/Library/Logs/com.hyprnote.dev/app.log` logs `lid_closed_mic_redirect`, `bluetooth_input_prepared`, and `mic_input_initialized` for microphone selection.

## 6. Finish and report

1. Fast-forward local `main`: `git checkout main && git merge --ff-only chore/upstream-sync-<date>`.
2. Report, in this order:
   - Commits merged from upstream, and conflicts by class.
   - Each fork feature: ported unchanged, re-applied at new anchors, or dropped because upstream ships it.
   - The four sweeps (anchor, behavioral, app, end to end) with their results, and every feature whose end-to-end check was not run.
   - Pre-existing upstream failures, kept separate from sync regressions.
3. Ask the owner once whether to push `main` to `origin`, naming the number of commits it would publish.

A sync with a skipped sweep is incomplete, never a pass.

## Lessons from earlier syncs

- 2026-09-30: upstream extracted the settings navigation into a hook used by two screens; the hide filter had to move into the hook so the Open Note dialog also hid the entries.
- 2026-09-30: upstream rewrote the outer-header tests into scenario tables; the fork's speaker-prompt tests were re-added in that style.
- 2026-09-30: upstream deleted `crates/api-client/openapi.gen.json` because it now writes the file to `OUT_DIR`; the deletion was accepted.
- The first app build after a sync can fail on a read-only soniqo checkout that was created mid-build. Re-run the build; the script fixes permissions while the build runs.
