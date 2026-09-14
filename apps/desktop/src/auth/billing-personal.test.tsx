import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BillingProvider } from "./billing";
import { useBillingAccess } from "./billing-context";

// Personal fork, flags ON (unlike billing.test.tsx which forces them off):
// signed out with no entitlements, every gate must still read Pro and no
// trial dialog may open.
vi.mock("./auth-context", () => ({
  useAuth: () => ({
    session: null,
    getHeaders: () => undefined,
    refreshSession: vi.fn(),
  }),
}));

vi.mock("@anlg/api-client", () => ({
  canStartTrial: vi.fn(),
  startTrial: vi.fn(),
}));

vi.mock("@anlg/api-client/client", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@anlg/plugin-auth", () => ({
  commands: { decodeClaims: vi.fn() },
}));

vi.mock("@anlg/plugin-opener2", () => ({
  commands: { openUrl: vi.fn() },
}));

vi.mock("@anlg/plugin-windows", () => ({
  openUrlWithInstruction: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-os", () => ({
  arch: () => "aarch64",
  platform: () => "macos",
}));

vi.mock("~/shared/config", () => ({
  useConfigValues: () => ({}),
}));

vi.mock("~/settings/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/settings/queries")>();
  return { ...actual, setSettingValues: vi.fn() };
});

vi.mock("~/shared/billing", () => ({
  waitForBillingUpdate: async () => null,
}));

vi.mock("../billing/trial-ended-dialog", () => ({
  TrialEndedDialog: ({ open }: { open: boolean }) => (
    <div data-open={open ? "true" : "false"} data-testid="trial-ended-dialog" />
  ),
}));

vi.mock("../billing/trial-payment-reminder-dialog", () => ({
  TrialPaymentReminderDialog: ({ open }: { open: boolean }) => (
    <div
      data-open={open ? "true" : "false"}
      data-testid="trial-payment-reminder-dialog"
    />
  ),
}));

vi.mock("../billing/trial-started-dialog", () => ({
  TrialStartedDialog: ({ open }: { open: boolean }) => (
    <div
      data-open={open ? "true" : "false"}
      data-testid="trial-started-dialog"
    />
  ),
}));

function Probe() {
  const billing = useBillingAccess();
  return (
    <div
      data-is-paid={billing.isPaid ? "true" : "false"}
      data-is-pro={billing.isPro ? "true" : "false"}
      data-plan={billing.plan}
      data-testid="billing-access"
    />
  );
}

describe("BillingProvider personal fork", () => {
  afterEach(cleanup);

  it("forces Pro with no session and opens no trial dialogs", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <BillingProvider>
          <Probe />
        </BillingProvider>
      </QueryClientProvider>,
    );

    const access = await screen.findByTestId("billing-access");
    expect(access.getAttribute("data-is-paid")).toBe("true");
    expect(access.getAttribute("data-is-pro")).toBe("true");
    expect(access.getAttribute("data-plan")).toBe("pro");

    await waitFor(() => {
      expect(
        screen.getByTestId("trial-ended-dialog").getAttribute("data-open"),
      ).toBe("false");
      expect(
        screen.getByTestId("trial-started-dialog").getAttribute("data-open"),
      ).toBe("false");
      expect(
        screen
          .getByTestId("trial-payment-reminder-dialog")
          .getAttribute("data-open"),
      ).toBe("false");
    });
  });
});
