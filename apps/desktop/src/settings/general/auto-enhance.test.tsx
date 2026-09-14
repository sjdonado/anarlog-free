import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setValue: vi.fn(),
  value: true as boolean | undefined,
}));

vi.mock("~/shared/config", () => ({
  useConfigValue: () => mocks.value,
}));

vi.mock("~/settings/queries", () => ({
  useSetSettingValue: () => mocks.setValue,
}));

import { AutoEnhanceToggle } from "./auto-enhance";

describe("AutoEnhanceToggle", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.value = true;
  });

  it("defaults to on and persists turning it off", () => {
    render(<AutoEnhanceToggle />);

    const toggle = screen.getByRole("switch", {
      name: "Auto-generate summary",
    });
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(toggle);

    expect(mocks.setValue).toHaveBeenCalledWith(false);
  });

  it("treats an unset value as on", () => {
    mocks.value = undefined;

    render(<AutoEnhanceToggle />);

    expect(
      screen
        .getByRole("switch", { name: "Auto-generate summary" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });
});
