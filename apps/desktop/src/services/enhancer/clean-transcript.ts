import type { Transcript } from "@anlg/plugin-template";

// Personal fork: a "clean transcript" is an enhanced note generated with a
// rewrite prompt instead of the summary prompt. It reuses summary storage and
// tabs by carrying this reserved template id, which never matches a real
// template row.
export const CLEAN_TRANSCRIPT_TEMPLATE_ID = "personal:clean-transcript";
export const CLEAN_TRANSCRIPT_TITLE = "Clean transcript";

// Benchmarked offline against GPT 6 Luna (.agent/bench/clean-transcript,
// variant F): paragraphs per speaker turn instead of one line per sentence,
// which the note editor turned into one paragraph per sentence.
export const CLEAN_TRANSCRIPT_SYSTEM_PROMPT = `Rewrite this transcript so it reads well. Keep each speaker's meaning and words, in the language they spoke; never add, answer or translate anything.

The transcript comes from speech-to-text. When people talk at the same time, their words are interleaved, often one word per line, and a sentence can be split across many alternating lines. Reassemble each speaker's words into their own sentences before rewriting.

- Fix grammar, punctuation and capitalization, and obvious speech-to-text mistakes when the correct word is clear from context.
- Remove filler words, stutters and false starts; where a speaker corrects themselves, keep only the correction.
- Write each speaker turn as one paragraph of flowing sentences, starting with the speaker's label in bold, for example **Speaker 1:**. Merge consecutive turns of the same speaker. Split a long turn into several paragraphs only where the topic changes. Never put each sentence on its own line.
- If a speaker mixes languages, keep each phrase in the language it was spoken.
- Write to-dos and spoken lists as bullet points, and counted steps as a numbered list.
- Write numbers, dates, times and amounts as figures.

Return only the rewritten text as Markdown.`;

// A single speaker (dictation, a solo memo) has no labels to keep.
export const CLEAN_TRANSCRIPT_SINGLE_SPEAKER_PROMPT = `Rewrite this transcript so it reads well. Keep the speaker's meaning and words, in the language they spoke; never add, answer or translate anything.

- Fix grammar, punctuation and capitalization, and obvious speech-to-text mistakes when the correct word is clear from context.
- Remove filler words, stutters and false starts; where the speaker corrects themselves, keep only the correction.
- Write flowing paragraphs, and start a new paragraph where the topic changes. Never put each sentence on its own line.
- If the speaker mixes languages, keep each phrase in the language it was spoken.
- Write to-dos and spoken lists as bullet points, and counted steps as a numbered list.
- Write numbers, dates, times and amounts as figures.

Return only the rewritten text as Markdown.`;

export function isCleanTranscriptTemplate(templateId: string | undefined) {
  return templateId === CLEAN_TRANSCRIPT_TEMPLATE_ID;
}

// Overlapping speech from two channels arrives interleaved word by word
// (thousands of one-word turns). Inside such a run, regroup the words per
// speaker, in order, so each speaker's sentence is contiguous again.
const SHORT_TURN_WORDS = 3;
const MIN_INTERLEAVED_RUN = 4;

type Turn = { speaker: string; text: string };

function mergeSameSpeaker(turns: Turn[]): Turn[] {
  const merged: Turn[] = [];
  for (const turn of turns) {
    const last = merged[merged.length - 1];
    if (last && last.speaker === turn.speaker) {
      last.text = `${last.text} ${turn.text}`;
    } else {
      merged.push({ ...turn });
    }
  }
  return merged;
}

export function regroupInterleavedTurns(input: Turn[]): Turn[] {
  const turns = mergeSameSpeaker(input);
  const isShort = (turn: Turn) =>
    turn.text.split(/\s+/).length <= SHORT_TURN_WORDS;
  const out: Turn[] = [];
  let i = 0;
  while (i < turns.length) {
    let j = i;
    while (j < turns.length && isShort(turns[j]!)) j++;
    if (j - i >= MIN_INTERLEAVED_RUN) {
      const bySpeaker = new Map<string, string[]>();
      for (const turn of turns.slice(i, j)) {
        const words = bySpeaker.get(turn.speaker) ?? [];
        words.push(turn.text);
        bySpeaker.set(turn.speaker, words);
      }
      for (const [speaker, words] of bySpeaker) {
        out.push({ speaker, text: words.join(" ") });
      }
      i = j;
    } else {
      out.push(turns[i]!);
      i++;
    }
  }
  return mergeSameSpeaker(out);
}

export function buildCleanTranscriptPrompt(transcripts: Transcript[]) {
  const turns = regroupInterleavedTurns(
    transcripts
      .flatMap((t) => t.segments)
      .map((segment) => ({
        speaker: segment.speaker,
        text: segment.text.trim(),
      }))
      .filter((turn) => turn.text),
  );

  const multiSpeaker = new Set(turns.map((turn) => turn.speaker)).size > 1;
  const body = multiSpeaker
    ? turns.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n\n")
    : turns.map((turn) => turn.text).join(" ");

  return {
    system: multiSpeaker
      ? CLEAN_TRANSCRIPT_SYSTEM_PROMPT
      : CLEAN_TRANSCRIPT_SINGLE_SPEAKER_PROMPT,
    prompt: `<transcript>\n${body}\n</transcript>`,
  };
}

// Desktop tab order: summaries, Memos, Clean transcript, Transcript.
export function placeCleanTranscriptTab<T extends { type: string }>(
  tabs: T[],
  cleanNoteId: string | null,
): T[] {
  if (!cleanNoteId) return tabs;
  const isClean = (tab: T) =>
    tab.type === "enhanced" && (tab as { id?: string }).id === cleanNoteId;
  const clean = tabs.find(isClean);
  if (!clean) return tabs;
  const rest = tabs.filter((tab) => !isClean(tab));
  const rawIndex = rest.findIndex((tab) => tab.type === "raw");
  rest.splice(rawIndex + 1, 0, clean);
  return rest;
}
