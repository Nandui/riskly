"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Camera, Loader2, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { setIncidentPhoto, updateInvestigationNotes } from "@/lib/actions/incidents";
import type { FormState } from "@/lib/form";

// Photo (attach / replace / remove at investigation time) + the free-text
// investigation working log. Both gated by canManage.
export function IncidentInvestigationCard({
  incidentId,
  photoUrl,
  notes,
  canManage,
}: {
  incidentId: string;
  photoUrl: string | null;
  notes: string | null;
  canManage: boolean;
}) {
  if (!canManage && !photoUrl && !notes?.trim()) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investigation</CardTitle>
      </CardHeader>
      <div className="space-y-5 p-5">
        <PhotoSection incidentId={incidentId} photoUrl={photoUrl} canManage={canManage} />
        <NotesSection incidentId={incidentId} notes={notes} canManage={canManage} />
      </div>
    </Card>
  );
}

function PhotoSection({
  incidentId,
  photoUrl,
  canManage,
}: {
  incidentId: string;
  photoUrl: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "private",
        handleUploadUrl: "/api/incidents/blob-upload",
        contentType: file.type,
      });
      const res = await setIncidentPhoto(incidentId, blob.url);
      if (res && !res.ok) {
        toast.error(res.error ?? "Could not attach the photo.");
      } else {
        toast.success("Photo attached.");
        router.refresh();
      }
    } catch {
      toast.error("Upload failed — please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove() {
    startTransition(async () => {
      const res = await setIncidentPhoto(incidentId, null);
      if (res && !res.ok) {
        toast.error(res.error ?? "Could not remove the photo.");
        return;
      }
      toast.success("Photo removed.");
      router.refresh();
    });
  }

  return (
    <div>
      <h3 className="eyebrow mb-2">Photo</h3>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />
      {photoUrl ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/incidents/${incidentId}/photo`}
            alt="Incident photo"
            className="max-h-80 rounded-[var(--radius-card)] border border-line object-contain"
          />
          {canManage && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={uploading || pending}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Replace
              </Button>
              <Button variant="ghost" size="sm" disabled={pending} onClick={remove} className="text-critical hover:bg-critical-bg">
                <Trash2 className="size-4" /> Remove
              </Button>
            </div>
          )}
        </div>
      ) : canManage ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Camera className="size-4" /> Add a photo
            </>
          )}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">No photo.</p>
      )}
      {uploading && photoUrl && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <TriangleAlert className="size-3.5" /> Replacing the current photo…
        </p>
      )}
    </div>
  );
}

function NotesSection({
  incidentId,
  notes,
  canManage,
}: {
  incidentId: string;
  notes: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateInvestigationNotes,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Notes saved.");
      router.refresh();
    }
  }, [state, router]);

  if (!canManage) {
    return (
      <div>
        <h3 className="eyebrow mb-2">Investigation notes</h3>
        {notes?.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
            {notes}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction}>
      <h3 className="eyebrow mb-2">Investigation notes</h3>
      <input type="hidden" name="incidentId" value={incidentId} />
      <Textarea
        name="investigationNotes"
        rows={4}
        defaultValue={notes ?? ""}
        placeholder="A working log — what you checked, who you spoke to, findings so far."
      />
      {state && !state.ok && state.error && (
        <p className="mt-1.5 text-xs font-medium text-critical">{state.error}</p>
      )}
      <div className="mt-2 flex justify-end">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </form>
  );
}
