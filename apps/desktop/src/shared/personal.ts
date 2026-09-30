// Personal local overlay. Additive only, so upstream merges stay clean.
// Hide providers here instead of deleting them from shared.tsx.
// ponytail: allowlists only, no logic. Extend when the next slice needs a flag.
export const PERSONAL_VISIBLE_STT_IDS: ReadonlySet<string> = new Set([
  "openai",
  "elevenlabs",
  "groq",
  "openrouter",
  "custom",
  "apple_speech",
]);

export function isPersonalSttVisible(id: string): boolean {
  return PERSONAL_VISIBLE_STT_IDS.has(id);
}

// Personal fork: treat the local app as Pro. Unlocks dictionary, templates,
// automations, provider entitlements, and clears lock badges. No server
// entitlements are touched; checkout/trial flows simply go unused.
export const PERSONAL_LOCAL_PRO = true;

// Personal fork: single-user only. Hides Teams/workspace sharing UI, which
// requires a signed-in server workspace.
export const PERSONAL_HIDE_TEAMS = true;

// Personal fork: local builds only, no distribution channel. Automatic
// updates stay off and the setting row is disabled; manual update menu
// items (tray/dock) are untouched.
export const PERSONAL_UPDATER_DISABLED = true;

// Personal fork: no icon personalization. Hides the in-app icon picker;
// the default bundle icon applies as-is (including its dark variant).
export const PERSONAL_HIDE_APP_ICON_PICKER = true;

// Personal fork: hide the devtools stats bar by default. Flip to false on
// the rare occasion render/IPC metrics are needed.
export const PERSONAL_HIDE_DEVTOOLS_BAR = true;

// Personal fork: single-user local use. Hides the Cloud API & Connectors
// section (needs a signed-in account with entitlements); the module itself
// stays intact.
export const PERSONAL_HIDE_CLOUD_API = true;

// Personal fork: let macOS 26+ render Dark/Clear/Tinted variants from the
// bundled Assets.car for the default icon instead of pinning a flat image.
// Dev-mode binaries have no bundle, so the flat icon still applies there.
export const PERSONAL_NATIVE_ICON_VARIANTS = true;

// Personal fork: no plans to manage locally. Hides the Account screen; the
// auth stack itself stays mounted so account-gated features (sign-in via
// Sync, CloudSync, sharing) keep working exactly as upstream.
export const PERSONAL_HIDE_ACCOUNT = true;

// Personal fork: local-only builds. Billing, Sync, and CRM all assume a hosted
// account or a connected CRM, so their settings pages stay hidden.
export const PERSONAL_HIDE_BILLING = true;
export const PERSONAL_HIDE_SYNC = true;
export const PERSONAL_HIDE_CRM = true;

// Personal fork: no in-note AI chat. Hides the floating "Ask anything" bar at
// the bottom of a session; the chat implementation itself stays intact.
export const PERSONAL_HIDE_CHAT_CTA = true;

// Personal fork: dictation defaults to pressing Fn / Globe twice (start) and
// once more (stop), like macOS dictation. Upstream defaults to Control+Alt+Space.
export const PERSONAL_DICTATION_SHORTCUT = "DoubleFn";
