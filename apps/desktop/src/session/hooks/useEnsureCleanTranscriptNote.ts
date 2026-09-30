import { useEffect } from "react";

import { getEnhancerService } from "~/services/enhancer";
import {
  CLEAN_TRANSCRIPT_TEMPLATE_ID,
  isCleanTranscriptTemplate,
} from "~/services/enhancer/clean-transcript";
import { useEnhancedNoteRecords } from "~/session/queries";

// Personal fork: every note with a summary tab also gets an (initially empty)
// "Clean transcript" tab. Waiting for the summary keeps upstream's default
// summary creation, which only runs while a session has no enhanced notes.
export function useEnsureCleanTranscriptNote({
  sessionId,
  enabled,
}: {
  sessionId: string;
  enabled: boolean;
}) {
  const notes = useEnhancedNoteRecords(sessionId);
  const cleanNoteId =
    notes.find((note) => isCleanTranscriptTemplate(note.templateId))?.id ??
    null;
  const hasClean = cleanNoteId !== null;
  const hasSummary = notes.some(
    (note) => !isCleanTranscriptTemplate(note.templateId),
  );

  useEffect(() => {
    if (!enabled || hasClean || !hasSummary) return;
    const service = getEnhancerService();
    if (!service) return;
    void service
      .ensureNote(sessionId, CLEAN_TRANSCRIPT_TEMPLATE_ID)
      .catch((error) => {
        console.error("[clean-transcript] failed to create tab", error);
      });
  }, [enabled, hasClean, hasSummary, sessionId]);

  return cleanNoteId;
}
