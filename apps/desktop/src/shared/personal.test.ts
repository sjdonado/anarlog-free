import { describe, expect, test } from "vitest";

import {
  isPersonalSttVisible,
  PERSONAL_AUTO_SUMMARY_DEFAULT,
  PERSONAL_DICTATION_SHORTCUT,
  PERSONAL_HIDE_ACCOUNT,
  PERSONAL_HIDE_APP_ICON_PICKER,
  PERSONAL_HIDE_BILLING,
  PERSONAL_HIDE_CHAT_CTA,
  PERSONAL_HIDE_CLOUD_API,
  PERSONAL_HIDE_CRM,
  PERSONAL_HIDE_DEVTOOLS_BAR,
  PERSONAL_HIDE_SYNC,
  PERSONAL_HIDE_TEAMS,
  PERSONAL_LOCAL_PRO,
  PERSONAL_NATIVE_ICON_VARIANTS,
  PERSONAL_UPDATER_DISABLED,
  PERSONAL_VISIBLE_STT_IDS,
} from "./personal";

import { areRenderOutlinesEnabled } from "~/devtools-bar/render-tracker";
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

  test("billing, sync, and crm screens stay hidden", () => {
    expect(PERSONAL_HIDE_BILLING).toBe(true);
    expect(PERSONAL_HIDE_SYNC).toBe(true);
    expect(PERSONAL_HIDE_CRM).toBe(true);
  });

  test("icon picker stays hidden and native variants stay on", () => {
    expect(PERSONAL_HIDE_APP_ICON_PICKER).toBe(true);
    expect(PERSONAL_NATIVE_ICON_VARIANTS).toBe(true);
  });

  test("render outlines start off", () => {
    expect(areRenderOutlinesEnabled()).toBe(false);
  });

  test("floating chat bar stays hidden", () => {
    expect(PERSONAL_HIDE_CHAT_CTA).toBe(true);
  });

  test("devtools bar stays hidden by default", () => {
    expect(PERSONAL_HIDE_DEVTOOLS_BAR).toBe(true);
  });

  test("summaries are never generated automatically by default", () => {
    expect(PERSONAL_AUTO_SUMMARY_DEFAULT).toBe(false);
    expect(
      resolveConfigValue("auto_enhance_after_transcript", {
        values: {},
        hasValues: new Set(),
      }),
    ).toBe(false);
  });

  test("dictation defaults to pressing Fn twice", () => {
    expect(PERSONAL_DICTATION_SHORTCUT).toBe("DoubleFn");
    expect(
      resolveConfigValue("dictation_shortcut", {
        values: {},
        hasValues: new Set(),
      }),
    ).toBe("DoubleFn");
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
      [
        "apple_speech",
        "custom",
        "elevenlabs",
        "groq",
        "openai",
        "openrouter",
      ].sort(),
    );
    expect(isPersonalSttVisible("deepgram")).toBe(false);
    expect(isPersonalSttVisible("openai")).toBe(true);
  });
});
