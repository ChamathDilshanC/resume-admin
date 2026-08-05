"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  fetchResumeJson,
  saveResumeJson,
  triggerPdfRegeneration,
  uploadAsset,
  extensionOf,
} from "@/lib/github";
import type { ResumeData } from "@/lib/types";

interface SessionWithToken {
  accessToken?: string;
}

async function requireAccessToken(): Promise<string> {
  const session = await getServerSession(authOptions);
  const accessToken = (session as unknown as SessionWithToken | null)?.accessToken;
  if (!accessToken) {
    throw new Error("Not authenticated.");
  }
  return accessToken;
}

export async function saveResume(
  data: ResumeData
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const accessToken = await requireAccessToken();
    const { sha } = await fetchResumeJson(accessToken);
    await saveResumeJson(accessToken, data, sha, "chore: update resume content via resume-admin");
    await triggerPdfRegeneration(accessToken);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

const ALLOWED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function uploadPhoto(
  formData: FormData
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  try {
    const accessToken = await requireAccessToken();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("No file provided.");
    }

    const ext = extensionOf(file.name) || ".png";
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      throw new Error("Only PNG, JPG, WEBP, or GIF images are allowed.");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("Image must be smaller than 5MB.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const assetPath = `assets/profile${ext}`;
    await uploadAsset(accessToken, assetPath, buffer, "chore: update profile photo via resume-admin");
    return { ok: true, path: assetPath };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
