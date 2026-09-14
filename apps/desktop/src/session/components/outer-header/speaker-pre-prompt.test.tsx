import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createHuman: vi.fn(),
  addSessionParticipant: vi.fn(),
}));

vi.mock("~/session/queries", () => ({
  useSession: () => ({ user_id: "owner-1" }),
}));

vi.mock("~/session/queries/participants", () => ({
  addSessionParticipant: mocks.addSessionParticipant,
}));

vi.mock("~/contacts/queries", () => ({
  createHuman: mocks.createHuman,
}));

import {
  shouldPromptForSpeakers,
  SpeakerPrePrompt,
} from "./speaker-pre-prompt";

describe("shouldPromptForSpeakers", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("stays quiet when participants already exist", () => {
    expect(shouldPromptForSpeakers("session-1", 2)).toBe(false);
  });

  it("asks on a fresh session without participants", () => {
    expect(shouldPromptForSpeakers("session-1", 0)).toBe(true);
  });
});

describe("SpeakerPrePrompt", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  function renderDialog(onDone: (proceed: boolean) => void = () => {}) {
    return render(
      <SpeakerPrePrompt sessionId="session-1" open onDone={onDone} />,
    );
  }

  it("saves each named person then proceeds", async () => {
    mocks.createHuman.mockImplementation(async ({ name }: { name: string }) => {
      return `human-${name}`;
    });
    const onDone = vi.fn();
    renderDialog(onDone);

    const inputs = screen.getAllByPlaceholderText(/Person \d/);
    fireEvent.change(inputs[0]!, { target: { value: "Ada" } });
    fireEvent.change(inputs[1]!, { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect(mocks.createHuman).toHaveBeenCalledTimes(1);
    expect(mocks.createHuman).toHaveBeenCalledWith({
      ownerUserId: "owner-1",
      name: "Ada",
      entryPoint: "session_participants",
    });
    expect(mocks.addSessionParticipant).toHaveBeenCalledWith(
      "session-1",
      "human-Ada",
    );
  });

  it("skips without saving and remembers the choice", async () => {
    const onDone = vi.fn();
    renderDialog(onDone);

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect(mocks.createHuman).not.toHaveBeenCalled();
    expect(shouldPromptForSpeakers("session-1", 0)).toBe(false);
  });

  it("starts cleanly when every row is blank and does not ask again", async () => {
    const onDone = vi.fn();
    renderDialog(onDone);

    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect(mocks.createHuman).not.toHaveBeenCalled();
    expect(mocks.addSessionParticipant).not.toHaveBeenCalled();
    expect(shouldPromptForSpeakers("session-1", 0)).toBe(false);
  });

  it("ignores a second rapid click while saving", async () => {
    mocks.createHuman.mockImplementation(async ({ name }: { name: string }) => {
      return `human-${name}`;
    });
    const onDone = vi.fn();
    renderDialog(onDone);

    const inputs = screen.getAllByPlaceholderText(/Person \d/);
    fireEvent.change(inputs[0]!, { target: { value: "Ada" } });
    const start = screen.getByRole("button", { name: "Start recording" });
    fireEvent.click(start);
    fireEvent.click(start);

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(mocks.createHuman).toHaveBeenCalledTimes(1);
  });
});
