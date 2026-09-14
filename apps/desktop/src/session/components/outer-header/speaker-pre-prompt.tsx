import { Trans } from "@lingui/react/macro";
import { useEffect, useRef, useState } from "react";

import { Button } from "@anlg/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@anlg/ui/components/ui/dialog";
import { Input } from "@anlg/ui/components/ui/input";

import { createHuman } from "~/contacts/queries";
import { useSession } from "~/session/queries";
import { addSessionParticipant } from "~/session/queries/participants";

const SKIP_KEY_PREFIX = "anarlog:speaker_prompt_skipped:";
const MAX_ROWS = 8;

// In-memory fallback when localStorage is denied or full.
const skippedSessions = new Set<string>();

export function shouldPromptForSpeakers(
  sessionId: string,
  participantCount: number,
): boolean {
  if (participantCount > 0) return false;
  if (skippedSessions.has(sessionId)) return false;
  try {
    return localStorage.getItem(SKIP_KEY_PREFIX + sessionId) !== "1";
  } catch {
    return true;
  }
}

function rememberSkipped(sessionId: string) {
  skippedSessions.add(sessionId);
  try {
    localStorage.setItem(SKIP_KEY_PREFIX + sessionId, "1");
  } catch {
    // ignore — the in-memory set above still covers this session
  }
}

export function SpeakerPrePrompt({
  sessionId,
  open,
  onDone,
}: {
  sessionId: string;
  open: boolean;
  onDone: (proceed: boolean) => void;
}) {
  const session = useSession(sessionId);
  const [names, setNames] = useState<string[]>(["", ""]);
  const [saving, setSaving] = useState(false);
  // onDone fires at most once: dismiss-then-save races must not double-fire.
  const settledRef = useRef(false);
  // Sync guard: state updates don't land before a second rapid click.
  const savingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setNames(["", ""]);
      setSaving(false);
      settledRef.current = false;
      savingRef.current = false;
    }
  }, [open]);

  const done = (proceed: boolean) => {
    if (settledRef.current) return;
    settledRef.current = true;
    onDone(proceed);
  };

  const finish = async (withNames: boolean) => {
    if (settledRef.current || savingRef.current) return;
    if (!withNames) {
      rememberSkipped(sessionId);
      done(true);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    // Blank rows are an explicit proceed-without-names, not a failure.
    const hasInput = names.some((raw) => raw.trim().length > 0);
    try {
      for (const raw of names) {
        const name = raw.trim();
        if (!name) continue;
        try {
          const humanId = await createHuman({
            ...(session?.user_id ? { ownerUserId: session.user_id } : {}),
            name,
            entryPoint: "session_participants",
          });
          await addSessionParticipant(sessionId, humanId);
        } catch (error) {
          console.error("[speakers] failed to add participant", error);
        }
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
      // Only an explicit no-names choice suppresses future prompts. A total
      // save failure leaves the dialog armed so it asks again next time.
      if (!hasInput) {
        rememberSkipped(sessionId);
      }
      done(true);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // A dismiss racing an in-flight save is ignored: the save owns the
        // outcome and recording still starts when it resolves.
        if (!next && !settledRef.current && !savingRef.current) {
          done(false);
        }
      }}
    >
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <Trans>Who's in this meeting?</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              Add names so speakers get labeled correctly in the transcript.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {names.map((name, index) => (
            <Input
              key={index}
              value={name}
              disabled={saving}
              placeholder={`Person ${index + 1}`}
              onChange={(event) =>
                setNames((prev) =>
                  prev.map((entry, i) =>
                    i === index ? event.target.value : entry,
                  ),
                )
              }
            />
          ))}
          {names.length < MAX_ROWS && (
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => setNames((prev) => [...prev, ""])}
            >
              <Trans>Add person</Trans>
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            disabled={saving}
            onClick={() => void finish(false)}
          >
            <Trans>Skip</Trans>
          </Button>
          <Button disabled={saving} onClick={() => void finish(true)}>
            <Trans>Start recording</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
