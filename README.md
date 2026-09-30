# anarlog-free (personal fork)

This is a personal fork of Anarlog, the open-source, local-first AI meeting notetaker built by the Fastrepl team: https://github.com/fastrepl/anarlog

It exists for one reason: to hold the modifications I want for my own daily use. It is not meant to be merged upstream, not now, not ever. If you are looking for the real thing, please go download the official version here: https://anarlog.so/download

Thank you to the Anarlog team for the hard work that went into building this. Everything here stands on what they shipped. If you like what you see, support them, star the original repository, and join their community. Treat this fork as a reference: a working example of one personal setup, and possibly a starting point for future contributions upstream or for a setup of your own.

There are no releases here and there will never be a public binary to download. If you want to try this version with my modifications, you need to build it locally, and everything here is for development purposes only.

## What is different from upstream

`FORK.md` is the full contract for these features: for each one, its intent, the behavior that must survive upstream updates, how to verify it end to end, and where it is implemented today. Switchable behavior is gated behind flags in `apps/desktop/src/shared/personal.ts`, and guard tests (`personal.test.ts` and friends) fail loudly if an upstream update flips one back. In short:

* Automatic updates are off. The setting stays visible but is forced off and disabled, and the update banner and periodic checks are silenced. Manual tray/dock update items are untouched.
* Local Pro. Every feature gate reads Pro, so the dictionary, templates, automations, sync UI, app icons, provider entitlements, and everything behind an upgrade prompt is unlocked. No checkout, trial, or paywall dialogs. The auth stack itself is untouched, so signing in and every account-gated feature works exactly as upstream.
* Teams, Account, Billing, Sync, and CRM screens are hidden from Settings, along with Cloud API and Connectors in Developers. The underlying modules stay intact.
* Transcription providers are filtered, not deleted. The dropdowns keep the built-ins (Anarlog Cloud, on-device, local file, Apple Speech) plus OpenAI, ElevenLabs, Groq, OpenRouter, and Custom. Everything else is hidden but still defined, so upstream provider updates merge cleanly.
* Press Fn / Globe twice to dictate. A new `DoubleFn` shortcut starts dictation on a quick double press and stops it on the next single press, like macOS dictation; Escape cancels. A single tap, a long hold, or an Fn+key combination does nothing. It is the default shortcut (`PERSONAL_DICTATION_SHORTCUT`) and has its own "Fn / Globe twice" button next to the existing hold-to-talk options.
* Dictation types into terminals. Apps whose focused view is not an accessible text field (Ghostty and other terminals) receive the transcript as a paste into the frontmost app, with the clipboard restored afterwards. Password fields and Secure Keyboard Entry (for example a `sudo` prompt) still refuse.
* Dictation arms without a signed-in session, so it works on a local build instead of sitting on "Setting up dictation…". Billing readiness is likewise treated as ready when signed out, because the disabled entitlements query never settles.
* The floating "Ask anything" chat bar is hidden at the bottom of a session. The chat implementation stays intact.
* Summaries are manual. The "Auto-generate summary" switch defaults to off (`PERSONAL_AUTO_SUMMARY_DEFAULT`), so nothing is generated when a meeting ends; turning the switch on restores upstream behavior. An empty summary shows an explicit "Generate summary" button plus "Choose template", and the blank editor stays available for manual writing.
* Clean transcript. Every note with a summary also has a "Clean transcript" tab, between Memos and Transcript. Its "Clean up transcript" button (also offered next to "Generate summary") rewrites the transcript into readable sentences and paragraphs with a dedicated prompt (grammar, filler words, lists, figures). It never summarizes. Before sending, word-by-word interleaved speech from overlapping channels is regrouped per speaker. The prompt was tuned with the offline benchmark in `.agent/bench/clean-transcript/`. It reuses summary storage and tabs through the reserved template id `personal:clean-transcript`; all of its logic lives in `services/enhancer/clean-transcript.ts`, with small guarded hooks in the enhance transform, workflow, and success handler.
* Speaker names before recording. Pressing Record on a session with no participants asks who is in the meeting. Names become session participants, which feed transcription keywords and speaker-count hints. ElevenLabs requests now carry `keyterms` (batch and realtime, sanitized to API limits) and OpenAI whisper-family requests carry the names via `prompt`.
* Current ChatGPT models. The ChatGPT subscription picker asks the Codex catalog for models with a pinned client version, and the catalog hides every model that needs a newer client. The pin tracks the current `@openai/codex` release so new families (GPT 6) show up.
* Quieter dev builds. React render outlines default off (toggle remains in the devtools bar) and the devtools stats bar is hidden by default.
* macOS Tahoe icons. The in-app icon picker is hidden, and the dev bundle ships its layered icon (`Assets.car` is kept instead of discarded) so the Dock renders Dark, Clear, and Tinted variants. The app keeps the system icon for the default choice instead of pinning a flat image at launch.

## My setup

These are the settings I use day to day. They are stored in the app's settings database, not in this repository, so a fresh build starts from the defaults and needs them set once by hand.

* **Transcription:** Settings > Transcription > Soniqo, model Parakeet (streaming). It runs on-device, so meetings and dictation transcribe without a cloud key.
* **Summaries:** Settings > Intelligence > ChatGPT (subscription sign-in), model GPT 6 Luna, reasoning effort Default.
* **Dictation:** Settings > Dictation > Enable dictation, hands-free on, shortcut "Fn / Globe twice". macOS must allow Anarlog Dev under Privacy & Security > Accessibility and > Input Monitoring. Set System Settings > Keyboard > "Press 🌐 key to" to "Do Nothing" and turn off the macOS Dictation shortcut, so the double press reaches Anarlog and not the emoji picker or Apple dictation.
* **Dictionary:** Settings > Dictionary holds names and domain terms. They are sent to the speech model as keywords and to summaries as preferred names. Soniqo Parakeet has no keyword input, so with this setup the dictionary does not affect transcription or dictation; it still applies to summaries.
* **Templates:** summaries are generated on demand from a template (Settings > Templates); "Auto-generate summary" stays off. After a meeting, I click "Generate summary", "Clean up transcript", or both. An empty summary offers "Generate summary" and "Choose template".

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
2. For every feature in `FORK.md`, find where it lives in the new code. Upstream refactors move code, so the goal is the feature's behavior, not the old lines: re-apply the patch where the behavior now lives and update the anchors in `FORK.md`.
3. Run the behavioral checks: `pnpm -F @anlg/ui build`, `pnpm -F @anlg/desktop typecheck`, `pnpm -F @anlg/desktop test`, `cargo test --locked -p owhisper-client`, then `lingui extract` + `compile` and confirm the catalogs settle.
4. Rebuild `Anarlog Dev.app`, reinstall it to `/Applications` (that is what Raycast launches), and run each feature's end-to-end check from `FORK.md`.
5. Merge the sync branch to `main` only after all of the above is green.

### Local build workarounds on this machine

macOS 27 with Xcode 27 needs five local workarounds. `bash .agent/build-desktop-local.sh` applies all of them and builds the app; none of them belong in a commit:

- Build Rust with `RUSTFLAGS="-C strip=none"`. Without it, cargo's `-C strip=debuginfo` for dependencies plus the deployment target produces proc-macro dylibs macOS refuses to load, which surfaces as a misleading `sqlx` unresolved-import error.
- Install the Metal toolchain once per Xcode upgrade: `xcodebuild -downloadComponent MetalToolchain`. The Soniqo build needs it.
- `chmod -R u+w` the `transcribe-soniqo` build checkout before a build. Upstream's `build.rs` mishandles group-writable files and panics patching the Swift manifest.
- Bridge the Swift archive path while the build runs: Swift 6.4 writes products to `out/Products/Debug`, while the `swift-rs` wrapper links against `arm64-apple-macosx/debug`. Every swift crate (`soniqo`, `apple-speech`, `windows`, `tcc`, `intercept`, `notification`, `local-llm`, `dictation-ui`) hits this, and build dirs churn per run, so the script keeps a background watcher that symlinks the two paths as they appear.

- Sign with a real certificate (`APPLE_SIGNING_IDENTITY`, an Apple Development identity). An ad-hoc signature changes on every rebuild. macOS then keeps showing the old Accessibility and Input Monitoring grants as enabled, but they no longer match the binary, and dictation fails with "failed to create CGEventTap". A certificate keeps the app's designated requirement stable, so the grants survive rebuilds. After switching from ad-hoc, reset once with `tccutil reset Accessibility com.hyprnote.dev` and `tccutil reset ListenEvent com.hyprnote.dev`, then grant again.

`npx --yes pnpm@11.1.1 -F @anlg/desktop exec tauri build --debug` also needs `TAURI_SIGNING_PRIVATE_KEY` to finish the very last packaging step; without it the build still produces the `.app`, which is all this fork needs.

## License

Same as upstream: MIT, see `LICENSE`. Enterprise components under `enterprise/` keep their commercial license and this fork changes nothing about that.
