import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Personal fork, filter ON (unlike select.test.tsx which forces it off):
// built-ins plus the allowlist are present, other third-party providers gone.
vi.mock("~/auth/billing-context", () => ({
  useBillingAccess: () => ({ isPaid: true }),
}));

vi.mock("~/settings/providers", () => ({
  useAiProvidersState: () => ({ isReady: true, providers: {} }),
}));

vi.mock("~/settings/ai/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/settings/ai/shared")>()),
  useProviderAvailability: () => ({}),
}));

vi.mock("~/shared/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/shared/config")>()),
  useConfigValues: () => ({ local_stt_model_path: "" }),
}));

import { useConfiguredMapping } from "./select";

afterEach(cleanup);

describe("useConfiguredMapping personal fork", () => {
  it("lists built-ins and the allowlist, hiding other providers", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(["device-info"], { totalMemoryBytes: 16e9 });
    client.setQueryData(["list-supported-models"], []);

    const { result } = renderHook(useConfiguredMapping, {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    const ids = Object.keys(result.current.providers);
    for (const id of [
      "anarlog",
      "soniqo",
      "apple_speech",
      "local_file",
      "openai",
      "elevenlabs",
      "groq",
      "openrouter",
      "custom",
    ]) {
      expect(ids).toContain(id);
    }
    expect(ids).not.toContain("deepgram");
    expect(ids).not.toContain("soniox");
  });
});
