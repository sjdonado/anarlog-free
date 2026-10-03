import { create } from "zustand";

import type { DictationPhase } from "./controller";

export const useDictationStatus = create<{
  capturingShortcut: boolean;
  phase: DictationPhase;
  error: string | null;
  lastTranscript: string;
  ready: boolean;
  retry: number;
  owner: string | null;
  presentedOwner: string | null;
  microphone: string;
  amplitude: number;
  // Personal fork: true once the microphone delivers real (non-zero) audio.
  micReady: boolean;
  text: string;
  partial: string;
  previewEnabled: boolean;
  previewUnavailable: boolean;
  expanded: boolean;
  cancel: (() => void) | null;
  finish: (() => void) | null;
}>(() => ({
  capturingShortcut: false,
  phase: "idle",
  error: null,
  lastTranscript: "",
  ready: false,
  retry: 0,
  owner: null,
  presentedOwner: null,
  microphone: "Default microphone",
  amplitude: 0,
  micReady: false,
  text: "",
  partial: "",
  previewEnabled: false,
  previewUnavailable: false,
  expanded: false,
  cancel: null,
  finish: null,
}));
