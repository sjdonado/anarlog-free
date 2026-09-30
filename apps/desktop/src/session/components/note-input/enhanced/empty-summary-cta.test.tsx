import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  onRegenerate: vi.fn(),
  templateId: "",
  selectTemplate: null as
    | null
    | ((selection: { templateId: string | null; title?: string }) => void),
}));

vi.mock("../enhanced-actions", () => ({
  useEnhancedNoteActions: () => ({
    isGenerating: false,
    onRegenerate: mocks.onRegenerate,
  }),
}));

vi.mock("~/session/queries", () => ({
  useEnhancedNote: () => ({ templateId: mocks.templateId }),
}));

vi.mock("./clean-transcript-button", () => ({
  CleanTranscriptButton: () => (
    <button type="button">Clean up transcript</button>
  ),
}));

vi.mock("../template-picker", () => ({
  TemplatePickerPopover: ({
    onSelectTemplate,
    trigger,
  }: {
    onSelectTemplate: (selection: {
      templateId: string | null;
      title?: string;
    }) => void;
    trigger: React.ReactNode;
  }) => {
    mocks.selectTemplate = onSelectTemplate;
    return <>{trigger}</>;
  },
}));

import { EmptySummaryCta } from "./empty-summary-cta";

describe("EmptySummaryCta", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.selectTemplate = null;
    mocks.templateId = "";
  });

  function renderCta() {
    return render(
      <EmptySummaryCta sessionId="session-1" enhancedNoteId="note-1" />,
    );
  }

  it("generates with the current template on click", async () => {
    renderCta();

    fireEvent.click(screen.getByRole("button", { name: "Generate summary" }));

    await waitFor(() => expect(mocks.onRegenerate).toHaveBeenCalledWith(null));
  });

  it("generates with the picked template", async () => {
    renderCta();

    expect(mocks.selectTemplate).not.toBeNull();
    mocks.selectTemplate!({ templateId: "template-9", title: "Brief" });

    await waitFor(() =>
      expect(mocks.onRegenerate).toHaveBeenCalledWith("template-9"),
    );
  });

  it("offers the clean transcript next to the summary actions", () => {
    renderCta();

    expect(
      screen.getByRole("button", { name: "Clean up transcript" }),
    ).not.toBeNull();
  });

  it("shows only the clean transcript action on a clean transcript tab", () => {
    mocks.templateId = "personal:clean-transcript";
    renderCta();

    expect(
      screen.getByRole("button", { name: "Clean up transcript" }),
    ).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: "Generate summary" }),
    ).toBeNull();
  });
});
