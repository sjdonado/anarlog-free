import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Personal fork, flags ON (unlike settings.test.tsx which forces them off):
// Teams and Account must be absent while the rest of the nav stays intact.
vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children?: ReactNode }) => <>{children}</>,
  useLingui: () => ({ _: (s: string) => s, t: (s: string) => s }),
}));

vi.mock("./custom-sidebar-header", () => ({
  CustomSidebarHeader: () => <div />,
}));

vi.mock("~/auth/billing-context", () => ({
  useBillingAccess: () => ({
    isPro: true,
    isUpgradingToPro: false,
    upgradeToPro: vi.fn(),
  }),
}));

vi.mock("~/settings/team/mirror", () => ({
  useMyWorkspacesWithMirror: () => ({
    data: [],
    isLoading: false,
    isPending: false,
  }),
}));

vi.mock("~/store/zustand/tabs", () => {
  const state = {
    currentTab: { type: "settings", state: { tab: "app" } },
    tabs: [],
    openNew: vi.fn(),
    select: vi.fn(),
    transitionChatMode: vi.fn(),
    updateSettingsTabState: vi.fn(),
    updateTemplatesTabState: vi.fn(),
  };
  const useTabs = Object.assign(
    (selector: (state: unknown) => unknown) => selector(state),
    { getState: () => state },
  );

  return { useTabs };
});

import { SettingsNav } from "./settings";

describe("SettingsNav personal fork", () => {
  afterEach(cleanup);

  it("hides Teams and Account but keeps the rest", () => {
    render(<SettingsNav />);

    expect(screen.queryByText("Teams")).toBeNull();
    expect(screen.queryByText("Account")).toBeNull();
    expect(screen.getByText("General")).not.toBeNull();
    expect(screen.getByText("Dictionary")).not.toBeNull();
    expect(screen.getByText("Automations")).not.toBeNull();
    expect(screen.getByText("Transcription")).not.toBeNull();
  });
});
