"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchResumeJson, saveResumeJson, triggerPdfRegeneration } from "@/lib/github";
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
