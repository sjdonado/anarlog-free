import { describe, expect, test } from "vitest";

import {
  buildCleanTranscriptPrompt,
  CLEAN_TRANSCRIPT_SINGLE_SPEAKER_PROMPT,
  CLEAN_TRANSCRIPT_SYSTEM_PROMPT,
  isCleanTranscriptTemplate,
  placeCleanTranscriptTab,
  regroupInterleavedTurns,
} from "./clean-transcript";

const seg = (speaker: string, text: string) => ({ speaker, text });

describe("clean transcript prompt", () => {
  test("merges one-word segments of a single speaker into prose", () => {
    const { system, prompt } = buildCleanTranscriptPrompt([
      {
        segments: [seg("You", "so"), seg("You", "um"), seg("You", "hello")],
        startedAt: null,
        endedAt: null,
      },
    ]);
    expect(system).toBe(CLEAN_TRANSCRIPT_SINGLE_SPEAKER_PROMPT);
    expect(prompt).toBe("<transcript>\nso um hello\n</transcript>");
  });

  test("keeps speaker turns when several people speak", () => {
    const { system, prompt } = buildCleanTranscriptPrompt([
      {
        segments: [seg("Ada", "hi"), seg("Ada", "there"), seg("Juan", "hey")],
        startedAt: null,
        endedAt: null,
      },
    ]);
    expect(system).toBe(CLEAN_TRANSCRIPT_SYSTEM_PROMPT);
    expect(prompt).toBe(
      "<transcript>\nAda: hi there\n\nJuan: hey\n</transcript>",
    );
  });

  test("recognizes only the reserved template id", () => {
    expect(isCleanTranscriptTemplate("personal:clean-transcript")).toBe(true);
    expect(isCleanTranscriptTemplate("some-template")).toBe(false);
    expect(isCleanTranscriptTemplate(undefined)).toBe(false);
  });

  test("regroups word-by-word interleaved speech per speaker", () => {
    const turns = regroupInterleavedTurns(
      ["Sehr", "hinter", "gut.", "das", "Genau,", "Auto"].map((text, i) => ({
        speaker: i % 2 === 0 ? "Speaker 1" : "Speaker 2",
        text,
      })),
    );
    expect(turns).toEqual([
      { speaker: "Speaker 1", text: "Sehr gut. Genau," },
      { speaker: "Speaker 2", text: "hinter das Auto" },
    ]);
  });

  test("leaves normal turns alone", () => {
    const turns = [
      { speaker: "A", text: "a long first turn here" },
      { speaker: "B", text: "Okay." },
      { speaker: "A", text: "another long turn follows" },
    ];
    expect(regroupInterleavedTurns(turns)).toEqual(turns);
  });

  test("places the clean transcript tab between Memos and Transcript", () => {
    const tabs = [
      { type: "enhanced", id: "summary" },
      { type: "enhanced", id: "clean" },
      { type: "raw" },
      { type: "transcript" },
    ];
    expect(placeCleanTranscriptTab(tabs, "clean")).toEqual([
      { type: "enhanced", id: "summary" },
      { type: "raw" },
      { type: "enhanced", id: "clean" },
      { type: "transcript" },
    ]);
    expect(placeCleanTranscriptTab(tabs, null)).toBe(tabs);
  });
});
