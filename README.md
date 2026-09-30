# anarlog-free (personal fork)

This is a personal fork of Anarlog, the open-source, local-first AI meeting notetaker built by the Fastrepl team: https://github.com/fastrepl/anarlog

It exists for one reason: to hold the modifications I want for my own daily use. It is not meant to be merged upstream, not now, not ever. If you are looking for the real thing, please go download the official version here: https://anarlog.so/download

Thank you to the Anarlog team for the hard work that went into building this. Everything here stands on what they shipped. If you like what you see, support them, star the original repository, and join their community. Treat this fork as a reference: a working example of one personal setup, and possibly a starting point for future contributions upstream or for a setup of your own.

There are no releases here and there will never be a public binary to download. If you want to try this version with my modifications, you need to build it locally, and everything here is for development purposes only.

## What is different from upstream

All personal behavior is gated behind flags in one file, `apps/desktop/src/shared/personal.ts`, so merging upstream `main` back in stays as painless as possible. Guard tests (`personal.test.ts` and friends) fail loudly if an upstream update ever flips one of these flags back.

* Automatic updates are off. The setting stays visible but is forced off and disabled, and the update banner and periodic checks are silenced. Manual tray/dock update items are untouched.
* Local Pro. Every feature gate reads Pro, so the dictionary, templates, automations, sync UI, app icons, provider entitlements, and everything behind an upgrade prompt is unlocked. No checkout, trial, or paywall dialogs. The auth stack itself is untouched, so signing in and every account-gated feature works exactly as upstream.
* Teams, Account, Billing, Sync, and CRM screens are hidden from Settings, along with Cloud API and Connectors in Developers. The underlying modules stay intact.
* Transcription providers are filtered, not deleted. The dropdowns keep the built-ins (Anarlog Cloud, on-device, local file, Apple Speech) plus OpenAI, ElevenLabs, Groq, OpenRouter, and Custom. Everything else is hidden but still defined, so upstream provider updates merge cleanly.
* Dictation arms without a signed-in session, so it works on a local build instead of sitting on "Setting up dictation…". Billing readiness is likewise treated as ready when signed out, because the disabled entitlements query never settles.
* The floating "Ask anything" chat bar is hidden at the bottom of a session. The chat implementation stays intact.
* Summaries are manual by choice. A new "Auto-generate summary" switch (default on, upstream behavior) lets transcripts stay as transcripts. An empty summary shows an explicit "Generate summary" button plus "Choose template", and the blank editor stays available for manual writing.
* Speaker names before recording. Pressing Record on a session with no participants asks who is in the meeting. Names become session participants, which feed transcription keywords and speaker-count hints. ElevenLabs requests now carry `keyterms` (batch and realtime, sanitized to API limits) and OpenAI whisper-family requests carry the names via `prompt`.
* Quieter dev builds. React render outlines default off (toggle remains in the devtools bar) and the devtools stats bar is hidden by default.
* macOS Tahoe icons. The in-app icon picker is hidden, and the dev bundle ships its layered icon (`Assets.car` is kept instead of discarded) so the Dock renders Dark, Clear, and Tinted variants. The app keeps the system icon for the default choice instead of pinning a flat image at launch.

## Build it locally

Prerequisites match upstream CI: Node 22, pnpm 11.1.1, the Rust toolchain pinned in `rust-toolchain.toml`, and on macOS a full Xcode install. The first native build also needs the Metal Toolchain component, otherwise the Soniqo crate fails to compile:

```
xcodebuild -downloadComponent MetalToolchain
```

Then:

```
pnpm install --frozen-lockfile
pnpm -F @anlg/ui build
pnpm exec turbo dev:desktop
```

The dev build uses its own profile directory, separate from the official app, so the two can live side by side. A local application bundle can be produced with a Tauri debug build from `apps/desktop`. The packaging step complains about a missing update-signing key at the very end; that is expected without release secrets and the `.app` itself is still produced.

To pull upstream updates: merge or rebase upstream `main` into your personal branch. Personal behavior lives behind the flags in `apps/desktop/src/shared/personal.ts`, plus additive settings and UI filters. Deletions of upstream files are avoided on purpose. Run the affected typechecks and tests afterwards; the guard tests will tell you if a flag stopped applying.

## Pulling upstream updates

This fork tracks upstream `main` (`https://github.com/fastrepl/anarlog`). A sync is not finished until the app is rebuilt and the custom patches are proven intact — never stop at "contests resolved":

1. `git fetch upstream && git merge upstream/main` on a sync branch. Resolve `README.md` with `--ours`, take upstream's i18n catalogs and regenerate them, and keep both sides of small conflicts (for example upstream's new settings section plus our gated one).
2. Sweep for every personal flag and Rust patch (the full list lives in `AGENTS.md`). A zero count means a dropped customization.
3. Run the behavioral checks: `pnpm -F @anlg/ui build`, `pnpm -F @anlg/desktop typecheck`, `pnpm -F @anlg/desktop test`, `cargo test --locked -p owhisper-client`, then `lingui extract` + `compile` and confirm the catalogs settle.
4. Rebuild `Anarlog Dev.app`, reinstall it to `/Applications` (that is what Raycast launches), and open it to confirm the custom behavior works.
5. Merge the sync branch to `main` only after all of the above is green.

### Local build workarounds on this machine

macOS 27 with Xcode 27 needs four local workarounds. `bash .agent/build-desktop-local.sh` applies all of them and builds the app; none of them belong in a commit:

- Build Rust with `RUSTFLAGS="-C strip=none"`. Without it, cargo's `-C strip=debuginfo` for dependencies plus the deployment target produces proc-macro dylibs macOS refuses to load, which surfaces as a misleading `sqlx` unresolved-import error.
- Install the Metal toolchain once per Xcode upgrade: `xcodebuild -downloadComponent MetalToolchain`. The Soniqo build needs it.
- `chmod -R u+w` the `transcribe-soniqo` build checkout before a build. Upstream's `build.rs` mishandles group-writable files and panics patching the Swift manifest.
- Bridge the Swift archive path while the build runs: Swift 6.4 writes products to `out/Products/Debug`, while the `swift-rs` wrapper links against `arm64-apple-macosx/debug`. Every swift crate (`soniqo`, `apple-speech`, `windows`, `tcc`, `intercept`, `notification`, `local-llm`, `dictation-ui`) hits this, and build dirs churn per run, so the script keeps a background watcher that symlinks the two paths as they appear.

`npx --yes pnpm@11.1.1 -F @anlg/desktop exec tauri build --debug` also needs `TAURI_SIGNING_PRIVATE_KEY` to finish the very last packaging step; without it the build still produces the `.app`, which is all this fork needs.

## License

Same as upstream: MIT, see `LICENSE`. Enterprise components under `enterprise/` keep their commercial license and this fork changes nothing about that.
