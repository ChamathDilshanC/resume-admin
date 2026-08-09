"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  fetchResumeJson,
  saveResumeJson,
  triggerPdfRegeneration,
  uploadAsset,
  fetchAsset,
  extensionOf,
  listUserRepos,
  listTemplates,
  fetchTemplateFiles,
  fetchProjectTechStack,
  type RepoSummary,
  type TemplateSummary,
} from "@/lib/github";
import { renderTemplatePreview } from "@/lib/preview";
import { generateProjectHighlights, optimizeSummaryForAts, optimizeWorkHighlightsForAts } from "@/lib/ai";
import type { ResumeData, ProjectItem } from "@/lib/types";

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

export async function listTemplatesAction(): Promise<
  { ok: true; templates: TemplateSummary[] } | { ok: false; error: string }
> {
  try {
    const accessToken = await requireAccessToken();
    const templates = await listTemplates(accessToken);
    return { ok: true, templates };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function previewTemplateAction(
  templateId: string,
  data: ResumeData
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  try {
    const accessToken = await requireAccessToken();
    const { templateHtml, stylesCss } = await fetchTemplateFiles(accessToken, templateId);

    // Resolve the profile photo from resume-core/assets so the preview shows
    // the real photo; fall back to no photo if it cannot be fetched.
    const previewData: ResumeData = { ...data, basics: { ...data.basics } };
    if (previewData.basics.image && !previewData.basics.image.startsWith("data:")) {
      try {
        const { buffer, contentType } = await fetchAsset(accessToken, previewData.basics.image);
        previewData.basics.image = `data:${contentType};base64,${buffer.toString("base64")}`;
      } catch {
        previewData.basics.image = "";
      }
    }

    const html = renderTemplatePreview(templateHtml, stylesCss, previewData);
    return { ok: true, html };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function listGithubRepos(): Promise<
  { ok: true; repos: RepoSummary[] } | { ok: false; error: string }
> {
  try {
    const accessToken = await requireAccessToken();
    const repos = await listUserRepos(accessToken);
    return { ok: true, repos };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function optimizeSummaryAction(
  data: ResumeData
): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  try {
    await requireAccessToken();
    const summary = await optimizeSummaryForAts({
      label: data.basics.label,
      currentSummary: data.basics.summary,
      yearsOfExperience: yearsOfExperienceOf(data),
      skillKeywords: skillKeywordsOf(data),
      workContext: data.work
        .map((w) => `${w.position} at ${w.name} (${w.startDate || "?"} to ${w.endDate || "present"})`)
        .join("; "),
    });
    return { ok: true, summary };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function optimizeWorkAction(
  data: ResumeData
): Promise<{ ok: true; work: ResumeData["work"] } | { ok: false; error: string }> {
  try {
    await requireAccessToken();
    const skillKeywords = skillKeywordsOf(data);
    const work = await Promise.all(
      data.work.map(async (item) => {
        if (item.highlights.length === 0) return item;
        const highlights = await optimizeWorkHighlightsForAts({
          position: item.position,
          company: item.name,
          highlights: item.highlights,
          skillKeywords,
        });
        return { ...item, highlights };
      })
    );
    return { ok: true, work };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function yearsOfExperienceOf(data: ResumeData): number {
  const years = data.work
    .map((w) => Number((w.startDate || "").slice(0, 4)))
    .filter((y) => Number.isFinite(y) && y > 1990);
  if (years.length === 0) return 0;
  const earliest = Math.min(...years);
  return Math.max(0, Math.floor((Date.now() - new Date(earliest, 0, 1).getTime()) / (365.25 * 24 * 3600 * 1000)));
}

function skillKeywordsOf(data: ResumeData): string[] {
  return data.skills.flatMap((s) => s.keywords).slice(0, 60);
}

export async function generateProjectFromGithubRepo(
  repoName: string
): Promise<{ ok: true; project: ProjectItem } | { ok: false; error: string }> {
  try {
    const accessToken = await requireAccessToken();
    const owner = process.env.ALLOWED_GITHUB_USERNAME || "ChamathDilshanC";

    const { name, description, url, techStack } = await fetchProjectTechStack(
      accessToken,
      owner,
      repoName
    );

    if (!techStack) {
      throw new Error(
        "GitHub reports no detectable languages for this repo (empty or a meta-repo with unreadable submodules)."
      );
    }

    const highlights = await generateProjectHighlights({
      repoName: name,
      repoDescription: description,
      techStack,
    });

    const project: ProjectItem = {
      name,
      description,
      highlights,
      links: [{ label: name, url }],
    };

    return { ok: true, project };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
