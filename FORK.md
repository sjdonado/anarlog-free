# Fork features: the intent contract

This file is the source of truth for what this personal fork adds on top of upstream Anarlog (https://github.com/fastrepl/anarlog). It describes each feature by its intent and its observable behavior, not by its code.

## How to use this file

Upstream keeps moving. A sync brings in bug fixes, refactors, and new features, and those change the code our patches sit on. The goal of a sync is not to keep our code exactly as it was. The goal is that every feature below still works end to end on top of the new upstream code.

- **Intent** says why the feature exists. It does not change during a sync.
- **Behavior** is the contract. Each line is observable in the running app or in a test. If upstream changes make a line false, the patch is wrong, not the contract.
- **Verify** names the automated guard (a test that fails when the behavior breaks) and the end-to-end check in the built app.
- **Current anchors** list where the feature is implemented today. They are hints for finding the code, and they are expected to drift. When upstream moves or rewrites that code, re-implement the feature in the new place, then update the anchors here.

Porting rules:

- Prefer the smallest patch that restores the behavior on the new code. Gate it behind a flag in `apps/desktop/src/shared/personal.ts` when the feature is a switch, and keep fork-only logic in fork-only files where possible.
- Upstream first: if upstream now ships the same behavior or fixes the same bug, prefer upstream's implementation, even when it differs in details, as long as the feature's Behavior lines still hold. Drop our patch, re-run the Verify steps on upstream's code, and note the change in the feature's entry. Never keep a duplicate.
- If upstream changes the premise of a feature (for example, it removes the screen we hide), decide with the owner whether the intent still applies before porting.
- A feature is ported only when its end-to-end check passes in the rebuilt app. A green test suite alone is not enough.
- When a feature is added, changed, or removed, update this file in the same change.

The sync procedure itself lives in `AGENTS.md` ("Fork: upstream sync procedure").

## Local use without an account

### 1. Local Pro

- **Intent:** a local build uses every feature without a subscription.
- **Behavior:**
  - Every Pro gate reads as Pro: dictionary, templates, automations, dictation, app icons, provider entitlements.
  - No checkout, trial, upgrade prompt, or paywall dialog appears.
  - Signing in still works as upstream; the auth stack is untouched.
  - Signed out, billing readiness is treated as ready, so gates keyed on it (dictation, settings) do not wait forever.
- **Verify:** `auth/billing-personal.test.tsx`, `shared/personal.test.ts`. In the app, signed out: Settings > Dictation and Settings > Dictionary open without a lock or upgrade prompt.
- **Current anchors:** `PERSONAL_LOCAL_PRO` in `auth/billing.tsx` (billing derivation, trial query disabled, signed-out `isReady`).

### 2. Account-bound screens hidden

- **Intent:** a single local user has no plans, teams, sync, CRM, or cloud API to manage.
- **Behavior:**
  - Settings shows no Teams, Account, Billing, Sync, or CRM entry, including in any other list built from the settings navigation (for example the Open Note dialog).
  - Settings > Developers shows no Cloud API or Connectors section.
  - The underlying modules stay intact, so account-gated features keep working if signed in.
- **Verify:** `sidebar/settings-personal.test.tsx`, `shared/personal.test.ts`. In the app: open Settings and the Open Note dialog and confirm the five entries are absent.
- **Current anchors:** `PERSONAL_HIDE_{TEAMS,ACCOUNT,BILLING,SYNC,CRM}` filtered inside `useSettingsNavGroups` (`sidebar/settings-nav-groups.ts`); `PERSONAL_HIDE_CLOUD_API` in `settings/developers/index.tsx`.

### 3. Automatic updates off

- **Intent:** local builds have no release channel, so the app must never replace itself.
- **Behavior:**
  - The automatic updates setting is visible, forced off, and disabled, even when stored as on.
  - No update banner and no periodic update check.
  - Manual update items in the tray and dock stay as upstream.
- **Verify:** `shared/personal.test.ts` (resolved config stays `false`), `main/update-banner.test.tsx`, `shared/config/index.test.tsx`. In the app: Settings > General shows the switch off and disabled.
- **Current anchors:** `PERSONAL_UPDATER_DISABLED` in `main/update-banner.tsx`, `shared/config/index.ts`; `automaticUpdates.disabled` in `settings/general/app-settings.tsx`.

## Transcription

### 4. Transcription provider allowlist

- **Intent:** show only the speech providers I use, without deleting upstream providers, so provider updates keep merging cleanly.
- **Behavior:** the transcription provider pickers show the built-ins (Anarlog Cloud, on-device, local file, Apple Speech) plus OpenAI, ElevenLabs, Groq, OpenRouter, and Custom. Other providers stay defined but hidden.
- **Verify:** `settings/ai/stt/shared.test.ts`, `settings/ai/stt/select-personal.test.tsx`, `shared/personal.test.ts`. In the app: Settings > Transcription lists exactly those providers.
- **Current anchors:** `PERSONAL_VISIBLE_STT_IDS` / `VISIBLE_STT_PROVIDERS` in `settings/ai/stt/{shared,select,configure}.tsx`.

### 5. Speaker names before recording

- **Intent:** transcription spells participants' names correctly and knows how many speakers to expect.
- **Behavior:**
  - Pressing Record (or Join & record) on a session with no participants asks "Who's in this meeting?" before recording starts. Join & record opens the meeting link only after the names are confirmed, and only once.
  - Entered names become session participants.
  - ElevenLabs requests (batch and realtime) carry the names as `keyterms`, sanitized to the API limits. OpenAI whisper-family requests carry them as `prompt`.
- **Verify:** `session/components/outer-header/{index,speaker-pre-prompt}.test.tsx`; `cargo test --locked -p owhisper-client -- keyterm prompt keyword`. In the app: start a new note, press Record, and confirm the prompt appears.
- **Current anchors:** `SpeakerPrePrompt` in `session/components/outer-header/`; `keyterms` in `crates/owhisper-client/src/adapter/elevenlabs/{mod,batch,live}.rs`; `keyword_prompt` in `crates/owhisper-client/src/adapter/openai/{mod,batch,live}.rs`.

## Dictation

### 6. Dictation works signed out

- **Intent:** dictation is a local feature and must not depend on an account.
- **Behavior:** with dictation enabled and no session, Settings > Dictation reaches "Ready to dictate" instead of staying on "Setting up dictation…".
- **Verify:** `dictation/lifecycle.test.tsx`. In the app, signed out: Settings > Dictation shows ready.
- **Current anchors:** session-free guard in `DictationLifecycle` (`dictation/lifecycle.tsx`).

### 7. Press Fn twice to dictate (default shortcut)

- **Intent:** dictation feels like macOS dictation: double-press Fn / Globe, speak, press once to finish.
- **Behavior:**
  - A quick double press of Fn starts dictation, and another quick double press stops it and inserts the text. A single Fn tap while dictating does nothing.
  - Fn + Escape cancels: the recording is discarded, no text is inserted, and the Escape never reaches the focused app (so it cannot interrupt a CLI such as Claude Code). Plain Escape also cancels, as upstream, but it still reaches the app.
  - A single tap, a long hold, or Fn plus another key does nothing.
  - It works with hands-free mode on or off.
  - It is the default shortcut for fresh settings, and Settings > Dictation offers it as "Fn / Globe twice" next to the hold-to-talk options.
- **Verify:** `cargo test --locked -p shortcut-macos` (the `double_press_*` tests, including Fn + Escape), `cargo test --locked -p tauri-plugin-shortcut`, `shared/personal.test.ts`. In the app: in any text field, double-press Fn, speak, double-press Fn again, and confirm the text appears; then start again, press Fn + Escape, and confirm nothing is inserted and the app did not receive Escape.
- **Current anchors:** `is_double_press_modifier_only` and `DOUBLE_PRESS_WINDOW` in `crates/shortcut-macos/src/{processor,decision}.rs`; `"DoubleFn"` in `plugins/shortcut/src/global.rs`; `PERSONAL_DICTATION_SHORTCUT` in `settings/schema.ts`; the `DoubleFn` button and label in `settings/dictation-shortcut.tsx`; the hands-free override in `dictation/lifecycle.tsx`; the Fn + Escape consumption in `crates/shortcut-macos/src/listener.rs`; the settings description in `settings/dictation.tsx`.

### 8. Dictation types into any app, including terminals

- **Intent:** dictation inserts text wherever I am typing, including apps that do not expose an accessible text field, such as Ghostty.
- **Behavior:**
  - A real text field receives the text directly, without touching the clipboard.
  - Any other frontmost app (terminals included) receives the text as a paste, and the previous clipboard is restored afterwards. The paste goes only to the app that was frontmost when dictation started.
  - Password fields and Secure Keyboard Entry (for example a `sudo` prompt) refuse, with a message that names the reason.
  - The paste always arrives as the transcript, never as a bare "v", even when Fn is pressed again for the next dictation while the previous one is being inserted: the paste waits until Fn and other modifiers are released (up to 1.5 s), is sent as an explicit Command down, V, Command up from a private event source, and Anarlog's own shortcut listener ignores it.
- **Verify:** no automated test (native accessibility). In the app: dictate into a Ghostty prompt and into a TextEdit document, and confirm the clipboard content is unchanged afterwards. Then finish a dictation in Ghostty with a single Fn press and immediately double-press Fn again: the first transcript must be pasted, not "v".
- **Current anchors:** `pastePid`, `frontmostPasteTarget`, `paste`, `waitForModifiersReleased`, and `syntheticPasteMarker` in `crates/dictation-ui-macos/swift-lib/src/TextInsertion.swift`; `SYNTHETIC_PASTE_MARKER` in `crates/shortcut-macos/src/tap.rs` (the two values must match).

### 9. Microphone fallback with the lid closed

- **Intent:** dictation and recording work when the MacBook runs closed on an external display, by using whatever real microphone is around (AirPods, the iPhone, a USB mic) instead of the laptop mic.
- **Behavior:**
  - With the lid closed, Apple disconnects the built-in microphone in hardware, but macOS still lists it as a live input. When the requested or default input is that built-in mic, or the requested mic is gone, capture opens the best real alternative instead: a Bluetooth headset (AirPods) first, then the iPhone microphone (Continuity), then USB or other wired hardware.
  - Virtual inputs (for example Microsoft Teams Audio) are never picked, because they are silent unless their app runs.
  - A chosen Bluetooth headset still goes through upstream's headset-profile handoff, so it records voice, not silence.
  - With the lid open, or when an external mic is requested and present, nothing changes.
  - Applies to meeting recording as well as dictation, since both open the microphone the same way.
- **Upstream first:** this patch covers a gap in upstream. If upstream starts handling the lid-closed built-in mic itself (for example by skipping or ranking it down), prefer the upstream implementation: delete `crates/audio-device/src/lid_closed.rs` and its one-line call, confirm the Verify steps still pass on upstream's code, and update this entry.
- **Verify:** `cargo test --locked -p audio-device lid_closed`. In the app, with the lid closed on an external display: take the AirPods out of the Mac's reach (or connect them to the iPhone) with the iPhone nearby and locked, dictate, and confirm text arrives; then with AirPods connected to the Mac, dictate again and confirm it uses them.
- **Current anchors:** `lid_closed_input_override` and `pick_lid_closed_input` in `crates/audio-device/src/lid_closed.rs` (lid state from `ioreg AppleClamshellState`); its call at the top of `new_locked` in `crates/audio-actual/src/mic.rs`.
- **Not yet built:** connecting paired AirPods that are not connected (IOBluetooth `openConnection`, needs `NSBluetoothAlwaysUsageDescription`). Planned as the next step.

### 10. Live waveform

- **Intent:** the waveform in the floating bar shows that the microphone actually hears me, so a dead or wrong mic is visible at a glance.
- **Behavior:**
  - The bars follow the real input loudness: the newest reading in the center, older readings spreading outwards. Silence settles them near flat; speaking moves them with the voice. There is no fixed animation.
  - Dictation reports loudness on the same decibel scale as meeting recording (-60 dB to 0 dB), so normal speech fills the bars instead of staying near the floor.
  - Meeting recording uses the same bars, so its waveform follows real audio too.
- **Upstream first:** if upstream makes the floating bar reflect real audio, prefer its version, delete these patches, and check the Verify steps on upstream's code.
- **Verify:** `speech_level_uses_the_meeting_decibel_scale` in `plugins/dictation/src/recorder.rs` (needs the Swift link workaround to run locally). In the app: start dictation, stay silent (bars flat), then speak (bars move with the voice); do the same during a meeting recording.
- **Current anchors:** `speech_level` in `plugins/dictation/src/recorder.rs`; `levels` in `plugins/windows/swift-lib/src/FloatingBarViewModel.swift`, filled in `applyAmplitude` in `FloatingBarManager.swift`, and drawn by `DancingBars` in `FloatingBarView.swift`.

### Known limitation: dictionary with Soniqo

Dictation and meeting transcription send the dictionary to the speech engine as keywords, but Soniqo Parakeet takes no keyword input (`crates/transcribe-soniqo`), so the terms have no effect with that engine. Summaries still receive them as preferred names. Decided on 2026-09-30 to leave this as is; revisit if Soniqo gains context biasing or if dictation moves to a keyword-capable engine (ElevenLabs `keyterms`, OpenAI `prompt`). A port of Handy's custom-words correction was tried on 2026-10-01 and reverted.

## Summaries and transcripts

### 11. Summaries are manual

- **Intent:** nothing is sent to a language model unless I ask for it.
- **Behavior:**
  - When a meeting ends, no summary is generated. The "Auto-generate summary" switch defaults to off; turning it on restores upstream behavior.
  - An empty summary shows "Generate summary", "Choose template", and "Clean up transcript". The blank editor stays available for manual writing.
- **Verify:** `shared/personal.test.ts` (default resolves to `false`), `services/enhancer/index.test.ts` (auto-enhance skipped when disabled), `session/components/note-input/enhanced/empty-summary-cta.test.tsx`. In the app: record a short meeting, stop, and confirm the summary stays empty with the three buttons.
- **Current anchors:** `PERSONAL_AUTO_SUMMARY_DEFAULT` as the default of `auto_enhance_after_transcript` in `settings/schema.ts`; `isAutoEnhanceAllowed` in `services/enhancer/index.ts`; `isAutoEnhanceEnabled` in `main/lifecycle.tsx`; `autoEnhanceEnabled` in `stt/capture-lifecycle.ts`; `EmptySummaryCta` in `session/components/note-input/enhanced/`.

### 12. Clean transcript tab

- **Intent:** read a meeting as clean prose. The raw transcript is written for machines (fragments, one word per line, interleaved speakers), and a summary loses detail.
- **Behavior:**
  - Every note with a summary tab also has a "Clean transcript" tab (Aa icon), placed between Memos and Transcript.
  - The tab starts empty with a "Clean up transcript" button. Generating fills it by rewriting the transcript: grammar and punctuation fixed, fillers and false starts removed, one paragraph per speaker turn with a bold speaker label, lists as bullets, numbers as figures, each phrase kept in the language it was spoken. It never summarizes, answers, or translates.
  - Word-by-word interleaved speech from overlapping audio channels is regrouped per speaker before it is sent.
  - The tab has no template picker. Right-click still offers copy, regenerate, and remove; a removed tab comes back.
  - It is never generated automatically.
- **Verify:** `services/enhancer/clean-transcript.test.ts` (prompt building, regrouping, tab order), `empty-summary-cta.test.tsx`. In the app: open a recorded meeting, confirm the tab order Summary, Memos, Clean transcript, Transcript, then generate and confirm paragraphs per speaker turn, not one line per sentence. Prompt quality is measured with the offline benchmark in `.agent/bench/clean-transcript/` (local, not committed).
- **Current anchors:** `services/enhancer/clean-transcript.ts` (reserved template id `personal:clean-transcript`, prompts, regrouping, `placeCleanTranscriptTab`); `cleanTranscript` in `store/zustand/ai-task/task-configs/{index,enhance-transform,enhance-workflow,enhance-success}.ts`; `CleanTranscriptButton` in `session/components/note-input/enhanced/{clean-transcript-button,empty-summary-cta}.tsx`; `useEnsureCleanTranscriptNote` and the tab reorder in `session/index.tsx` and `session/components/note-input/header.tsx`; the `ORDER BY` in `session/queries/enhanced-notes.ts`; the icon and missing picker in `session/components/note-input/header-enhanced.tsx`.

### 13. No floating chat bar

- **Intent:** a note is for reading and writing, not chatting.
- **Behavior:** the floating "Ask anything" bar does not appear at the bottom of a session. The chat implementation stays intact.
- **Verify:** `shared/personal.test.ts`. In the app: open any note and confirm no chat bar.
- **Current anchors:** `PERSONAL_HIDE_CHAT_CTA` in `session/index.tsx`.

## Language models

### 14. Current ChatGPT models

- **Intent:** the ChatGPT subscription offers the newest model families as soon as OpenAI ships them.
- **Behavior:** Settings > Intelligence > ChatGPT lists the current families (today GPT 6 Sol, Terra, and Luna). The Codex catalog hides models whose minimum client version is newer than the one we send, so the version we send tracks the current `@openai/codex` release and never falls below upstream's.
- **Verify:** `settings/ai/llm/subscriptions/models.test.ts`. In the app: refresh the ChatGPT model list and confirm the newest family appears. On each sync, compare the pin with `npm view @openai/codex version`.
- **Current anchors:** `CHATGPT_CODEX_CLIENT_VERSION` in `settings/ai/llm/subscriptions/models.ts`.

## Developer builds and appearance

### 15. Quieter dev builds

- **Intent:** a dev build used daily looks like a normal app.
- **Behavior:** React render outlines are off by default (the toggle remains in the devtools bar), and the devtools stats bar is hidden by default.
- **Verify:** `shared/personal.test.ts`. In the app: no outlines and no stats bar at launch.
- **Current anchors:** `PERSONAL_HIDE_DEVTOOLS_BAR` in `devtools-bar/index.tsx`; `outlinesEnabled = false` in `devtools-bar/render-tracker.ts`.

### 16. macOS layered icon

- **Intent:** the Dock icon follows the system appearance (Dark, Clear, Tinted).
- **Behavior:** the in-app icon picker is hidden, the dev bundle ships its layered icon (`Assets.car`), and the default icon uses the system variants instead of a flat image pinned at launch.
- **Verify:** `shared/personal.test.ts`. In the app: switch macOS to Dark or Tinted icons and confirm the Dock icon follows.
- **Current anchors:** `PERSONAL_HIDE_APP_ICON_PICKER` in `settings/appearance/index.tsx`; `PERSONAL_NATIVE_ICON_VARIANTS` in `shared/theme/provider.tsx`; the `Assets.car` keep step in `src-tauri/scripts/compile-icons.sh`.

## Local build environment (not features)

These keep this machine building and are applied by `bash .agent/build-desktop-local.sh`. They are never committed, and they are not part of the contract above. See `README.md` for details: `RUSTFLAGS="-C strip=none"`, the Metal toolchain component, the soniqo checkout permissions, the Swift archive path bridge, and signing with a stable Apple Development identity so Accessibility and Input Monitoring grants survive rebuilds.
