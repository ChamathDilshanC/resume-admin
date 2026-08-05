"use client";

import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import { gooeyToast } from "goey-toast";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/FormControls";
import { uploadPhoto } from "../actions";

const VALID_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / k ** i).toFixed(1)) + " " + sizes[i];
}

export function PhotoUploader({
  image,
  onChange,
}: {
  image: string;
  onChange: (path: string) => void;
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewSrc = image
    ? image.startsWith("http") || image.startsWith("data:")
      ? image
      : `/api/asset?path=${encodeURIComponent(image)}`
    : null;

  async function handleFile(file: File | undefined) {
    if (!file) return;

    if (!VALID_TYPES.includes(file.type)) {
      gooeyToast.error("Unsupported file type", {
        description: "Please upload a PNG, JPG, WEBP, or GIF image.",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      gooeyToast.error("File too large", { description: "Images must be smaller than 5MB." });
      return;
    }

    setPendingFile(file);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadPhoto(formData);
      if (result.ok) {
        onChange(result.path);
        gooeyToast.success("Photo updated", { description: "Committed to resume-core." });
      } else {
        gooeyToast.error("Upload failed", { description: result.error });
      }
    } finally {
      setIsUploading(false);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void handleFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void handleFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="text-sm">
      <span className="mb-1.5 block font-medium text-gray-600">Photo</span>

      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 shadow-sm">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-gray-300" />
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div
            className="flex cursor-pointer justify-center rounded-lg border border-input border-dashed px-4 py-5 transition-colors hover:border-brand/40 hover:bg-brand/5"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon aria-hidden={true} className="h-5 w-5" />
              <span>
                Drag and drop or <span className="font-medium text-brand">choose a photo</span>
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={VALID_TYPES.join(",")}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {pendingFile && (
            <Card className="relative gap-3 bg-muted p-3 shadow-none">
              <Button
                aria-label="Cancel"
                className="absolute top-1 right-1 text-muted-foreground hover:text-foreground"
                onClick={() => setPendingFile(null)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X aria-hidden={true} className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-background shadow-sm ring-1 ring-border ring-inset">
                  <ImageIcon className="h-4 w-4 text-foreground" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{pendingFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(pendingFile.size)} — {isUploading ? "Uploading..." : "Done"}
                  </p>
                </div>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full bg-brand transition-all ${isUploading ? "w-2/3 animate-pulse" : "w-full"}`}
                />
              </div>
            </Card>
          )}

          <Field
            label="Or paste an image path / URL"
            value={image}
            onChange={onChange}
            placeholder="https://... or assets/profile.png"
          />
        </div>
      </div>
    </div>
  );
}
