import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@anlg/ui/components/ui/button";
import { toast } from "@anlg/ui/components/ui/toast";

import { useLanguageModel } from "~/ai/hooks";
import { getEnhancerService } from "~/services/enhancer";
import {
  CLEAN_TRANSCRIPT_TEMPLATE_ID,
  CLEAN_TRANSCRIPT_TITLE,
} from "~/services/enhancer/clean-transcript";
import { useTabs } from "~/store/zustand/tabs";

// Personal fork: opens (or reuses) the "Clean transcript" tab next to the
// summary and fills it with the rewritten transcript.
export function CleanTranscriptButton({
  sessionId,
  variant = "outline",
}: {
  sessionId: string;
  variant?: "default" | "outline";
}) {
  const model = useLanguageModel("enhance");
  const start = useMutation({
    mutationFn: async () => {
      if (!model) {
        throw new Error(
          "Set up Intelligence in Settings before cleaning up this transcript.",
        );
      }
      const service = getEnhancerService();
      if (!service) {
        throw new Error("Open this note in the main window to clean it up.");
      }
      const noteId = await service.ensureNote(
        sessionId,
        CLEAN_TRANSCRIPT_TEMPLATE_ID,
      );
      const result = await service.enhance(sessionId, {
        templateId: CLEAN_TRANSCRIPT_TEMPLATE_ID,
        templateTitle: CLEAN_TRANSCRIPT_TITLE,
        targetNoteId: noteId,
      });
      if (result.type === "too_short") {
        throw new Error("The transcript is too short to clean up.");
      }
      if (result.type === "no_model") {
        throw new Error(
          "Set up Intelligence in Settings before cleaning up this transcript.",
        );
      }
      const { currentTab, updateSessionTabState } = useTabs.getState();
      if (currentTab?.type === "sessions" && currentTab.id === sessionId) {
        updateSessionTabState(currentTab, {
          ...currentTab.state,
          view: { type: "enhanced", id: noteId },
        });
      }
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Button
      variant={variant}
      disabled={start.isPending}
      onClick={() => start.mutate()}
    >
      <Trans>Clean up transcript</Trans>
    </Button>
  );
}
