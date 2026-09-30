import { Trans } from "@lingui/react/macro";

import { Button } from "@anlg/ui/components/ui/button";

import { useEnhancedNoteActions } from "../enhanced-actions";
import {
  TemplatePickerPopover,
  type TemplateSelection,
} from "../template-picker";
import { CleanTranscriptButton } from "./clean-transcript-button";

import { isCleanTranscriptTemplate } from "~/services/enhancer/clean-transcript";
import { useEnhancedNote } from "~/session/queries";

/**
 * Explicit entry point for manual summaries. Renders above the empty
 * editor so generating is one click, with optional template switching.
 */
export function EmptySummaryCta({
  sessionId,
  enhancedNoteId,
}: {
  sessionId: string;
  enhancedNoteId: string;
}) {
  const { isGenerating, onRegenerate } = useEnhancedNoteActions({
    sessionId,
    enhancedNoteId,
  });
  const usedTemplateId =
    useEnhancedNote(enhancedNoteId)?.templateId?.trim() || null;

  // Same path as the header menu: eligibility + secondary-window routing
  // included, so this works outside the main window too.
  const handleSelectTemplate = (selection: TemplateSelection) => {
    if (isGenerating) {
      return;
    }

    void onRegenerate(selection.templateId);
  };

  if (isCleanTranscriptTemplate(usedTemplateId ?? undefined)) {
    return (
      <div className="border-border bg-card mb-4 flex flex-col gap-3 rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">
          <Trans>
            No clean transcript yet. Rewrite the transcript into readable
            sentences and paragraphs, without summarizing it.
          </Trans>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <CleanTranscriptButton sessionId={sessionId} variant="default" />
        </div>
      </div>
    );
  }

  return (
    <div className="border-border bg-card mb-4 flex flex-col gap-3 rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">
        <Trans>
          No summary yet. Generate one from the transcript whenever you're
          ready, optionally with a different template.
        </Trans>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={isGenerating} onClick={() => void onRegenerate(null)}>
          <Trans>Generate summary</Trans>
        </Button>
        <TemplatePickerPopover
          onSelectTemplate={handleSelectTemplate}
          usedTemplateId={usedTemplateId}
          trigger={
            <Button variant="outline" disabled={isGenerating}>
              <Trans>Choose template</Trans>
            </Button>
          }
        />
        <CleanTranscriptButton sessionId={sessionId} />
      </div>
    </div>
  );
}
