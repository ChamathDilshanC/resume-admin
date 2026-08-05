"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button, Field } from "@/components/FormControls";
import { uploadPhoto } from "../actions";

export function PhotoUploader({
  image,
  onChange,
}: {
  image: string;
  onChange: (path: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewSrc = image
    ? image.startsWith("http") || image.startsWith("data:")
      ? image
      : `/api/asset?path=${encodeURIComponent(image)}`
    : null;

  async function handleFileSelected(file: File) {
    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadPhoto(formData);
      if (result.ok) {
        onChange(result.path);
      } else {
        setError(result.error);
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="text-sm">
      <span className="mb-1.5 block font-medium text-gray-600">Photo</span>
      <div className="flex items-center gap-4">
        <motion.div
          whileHover={{ scale: 1.04 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 shadow-sm"
        >
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-gray-400">No photo</span>
          )}
        </motion.div>
        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelected(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload new photo"}
          </Button>
          {error && <p className="text-xs text-red-600">{error}</p>}
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
