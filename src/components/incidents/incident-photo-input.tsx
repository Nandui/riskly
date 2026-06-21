"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Camera, Loader2, X, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// Optional photo at capture. Uploads straight to the private incident Blob store
// from the browser; the resulting URL is posted as `photoUrl` and served back
// only through the auth-gated /api/incidents/[id]/photo proxy.
export function IncidentPhotoInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setStatus("uploading");
    try {
      const blob = await upload(file.name, file, {
        access: "private",
        handleUploadUrl: "/api/incidents/blob-upload",
        contentType: file.type,
      });
      setUrl(blob.url);
      setStatus("done");
    } catch {
      setStatus("error");
      setUrl("");
    }
  }

  function clear() {
    setUrl("");
    setPreview("");
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input type="hidden" name="photoUrl" value={url} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />

      {preview ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Incident photo preview" className="max-h-48 rounded-[var(--radius-card)] border border-line object-cover" />
          <button
            type="button"
            onClick={clear}
            className="absolute right-1.5 top-1.5 rounded-full bg-ink/70 p-1 text-white hover:bg-ink"
            aria-label="Remove photo"
          >
            <X className="size-3.5" />
          </button>
          <div className="mt-1.5 text-xs">
            {status === "uploading" && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Uploading…</span>
            )}
            {status === "done" && <span className="text-low">Photo attached.</span>}
            {status === "error" && (
              <span className="inline-flex items-center gap-1.5 text-critical"><TriangleAlert className="size-3.5" /> Upload failed — remove and try again.</span>
            )}
          </div>
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          <Camera className="size-4" /> Add a photo
        </Button>
      )}
    </div>
  );
}
