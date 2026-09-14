import { describe, expect, test } from "vitest";

import {
  isPersonalSttVisible,
  PERSONAL_HIDE_ACCOUNT,
  PERSONAL_HIDE_APP_ICON_PICKER,
  PERSONAL_HIDE_CLOUD_API,
  PERSONAL_HIDE_DEVTOOLS_BAR,
  PERSONAL_HIDE_TEAMS,
  PERSONAL_LOCAL_PRO,
  PERSONAL_NATIVE_ICON_VARIANTS,
  PERSONAL_UPDATER_DISABLED,
  PERSONAL_VISIBLE_STT_IDS,
} from "./personal";

import { resolveConfigValue } from "~/shared/config";

// Personal fork contract: these flags must survive upstream merges. If an
// update flips one, features silently re-lock.
describe("personal fork flags", () => {
  test("local Pro stays on", () => {
    expect(PERSONAL_LOCAL_PRO).toBe(true);
  });

  test("teams stays hidden", () => {
    expect(PERSONAL_HIDE_TEAMS).toBe(true);
  });

  test("account screen stays hidden", () => {
    expect(PERSONAL_HIDE_ACCOUNT).toBe(true);
  });

  test("icon picker stays hidden and native variants stay on", () => {
    expect(PERSONAL_HIDE_APP_ICON_PICKER).toBe(true);
    expect(PERSONAL_NATIVE_ICON_VARIANTS).toBe(true);
  });

  test("devtools bar stays hidden by default", () => {
    expect(PERSONAL_HIDE_DEVTOOLS_BAR).toBe(true);
  });

  test("cloud api stays hidden", () => {
    expect(PERSONAL_HIDE_CLOUD_API).toBe(true);
  });

  test("automatic updates stay off even when stored as on", () => {
    expect(PERSONAL_UPDATER_DISABLED).toBe(true);
    expect(
      resolveConfigValue("automatic_updates", {
        values: {},
        hasValues: new Set(),
      }),
    ).toBe(false);
    expect(
      resolveConfigValue("automatic_updates", {
        values: { automatic_updates: true },
        hasValues: new Set(["automatic_updates"]),
      }),
    ).toBe(false);
  });

  test("STT allowlist keeps only the personal providers", () => {
    expect([...PERSONAL_VISIBLE_STT_IDS].sort()).toEqual(
      ["apple_speech", "custom", "elevenlabs", "groq", "openai"].sort(),
    );
    expect(isPersonalSttVisible("deepgram")).toBe(false);
    expect(isPersonalSttVisible("openai")).toBe(true);
  });
});
