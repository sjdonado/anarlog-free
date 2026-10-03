import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDictationPanelState, waitForDictationPanel } from "./panel";
import { useDictationStatus } from "./state";

describe("dictation panel readiness", () => {
  beforeEach(() =>
    useDictationStatus.setState(useDictationStatus.getInitialState()),
  );

  it("waits for this recording's panel before allowing microphone capture", async () => {
    const ready = vi.fn();
    const promise = waitForDictationPanel(
      "current",
      new AbortController().signal,
    ).then(ready);
    useDictationStatus.setState({ presentedOwner: "previous" });
    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();
    useDictationStatus.setState({ presentedOwner: "current" });
    await promise;
    expect(ready).toHaveBeenCalledOnce();
  });

  it("rejects cancellation while the panel is opening", async () => {
    const abort = new AbortController();
    const promise = waitForDictationPanel("current", abort.signal);
    abort.abort();
    await expect(promise).rejects.toThrow("cancelled");
    useDictationStatus.setState({ presentedOwner: "current" });
  });
});

describe("dictation panel microphone readiness", () => {
  beforeEach(() =>
    useDictationStatus.setState({
      ...useDictationStatus.getInitialState(),
      owner: "dictation-1",
    }),
  );

  it("shows connecting until the microphone delivers audio", () => {
    useDictationStatus.setState({ phase: "recording", micReady: false });
    expect(getDictationPanelState()?.dictation?.phase).toBe("connecting");

    useDictationStatus.setState({ micReady: true });
    expect(getDictationPanelState()?.dictation?.phase).toBe("recording");
  });

  it("keeps the other phases as they are", () => {
    useDictationStatus.setState({ phase: "transcribing", micReady: false });
    expect(getDictationPanelState()?.dictation?.phase).toBe("transcribing");
  });
});
