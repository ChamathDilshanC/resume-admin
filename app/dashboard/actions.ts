"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  fetchResumeJson,
  saveResumeJson,
  triggerPdfRegeneration,
  triggerDriveFolderSync,
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
import { listFolderImages, uploadImageToFolder, renameFile, trashFile } from "@/lib/google-drive";
import type { ResumeData, ProjectItem, ProjectDriveFolder, MockupCategory } from "@/lib/types";

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

// This browser tab holds its own copy of resume.json from whenever the
// dashboard was first loaded. If the GitHub Actions pipeline auto-adds a
// project (or anything else) in the meantime, a save from this stale tab
// must not silently overwrite it. So: re-fetch the live file, and for every
// section the user hasn't touched this session, keep the fresh remote value
// instead of the stale one — only sections actually edited here win.
function pickChanged<K extends keyof ResumeData>(
  key: K,
  current: ResumeData,
  initial: ResumeData,
  remote: ResumeData
): ResumeData[K] {
  return JSON.stringify(current[key]) === JSON.stringify(initial[key]) ? remote[key] : current[key];
}

// pickChanged("projects", ...) protects the whole array: if this tab edited
// ANY project this session, the whole array it's holding wins over remote.
// But driveFolder/mockups are written by resume-core's background sync
// workflow, entirely outside this tab — a save that only meant to edit, say,
// a project's description (or just re-saved to unblock a Drive sync click)
// would otherwise silently ship this tab's stale (missing/older)
// driveFolder+mockups and clobber whatever the workflow already committed.
// So: per project, if THIS tab never touched that project's driveFolder/
// mockups since load, take remote's copy of just those two fields —
// regardless of what pickChanged decided for the rest of the array.
function reconcileProjectDriveFields(
  projects: ProjectItem[],
  initialProjects: ProjectItem[],
  remoteProjects: ProjectItem[]
): ProjectItem[] {
  const keyOf = (p: ProjectItem) => p.repoFullName || p.name;
  const initialByKey = new Map(initialProjects.map((p) => [keyOf(p), p]));
  const remoteByKey = new Map(remoteProjects.map((p) => [keyOf(p), p]));

  return projects.map((project) => {
    const key = keyOf(project);
    const initial = initialByKey.get(key);
    const remote = remoteByKey.get(key);
    if (!remote) return project; // brand new locally — nothing remote to reconcile against

    const untouchedThisSession =
      JSON.stringify(project.driveFolder) === JSON.stringify(initial?.driveFolder) &&
      JSON.stringify(project.mockups) === JSON.stringify(initial?.mockups);

    if (!untouchedThisSession) return project; // user edited mockups/folder in this tab — keep it

    return { ...project, driveFolder: remote.driveFolder, mockups: remote.mockups };
  });
}

export async function saveResume(
  data: ResumeData,
  initialData: ResumeData,
  options: { regeneratePdf?: boolean } = {}
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { regeneratePdf = true } = options;
  try {
    const accessToken = await requireAccessToken();
    const { data: remote, sha } = await fetchResumeJson(accessToken);

    const merged: ResumeData = {
      template: pickChanged("template", data, initialData, remote),
      basics: pickChanged("basics", data, initialData, remote),
      work: pickChanged("work", data, initialData, remote),
      skills: pickChanged("skills", data, initialData, remote),
      projects: reconcileProjectDriveFields(
        pickChanged("projects", data, initialData, remote),
        initialData.projects,
        remote.projects
      ),
      certificates: pickChanged("certificates", data, initialData, remote),
      education: pickChanged("education", data, initialData, remote),
      references: pickChanged("references", data, initialData, remote),
    };

    await saveResumeJson(accessToken, merged, sha, "chore: update resume content via resume-admin");
    if (regeneratePdf) {
      await triggerPdfRegeneration(accessToken);
    }
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

    const { name, description, url, techStack, repoFullName } = await fetchProjectTechStack(
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
      repoFullName,
      repositoryType: "MAIN",
    };

    return { ok: true, project };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Kicks off resume-core's sync-drive-mockups.yml for one project (or, with
// no repoFullName, every eligible project). The workflow runs async and
// commits results back to resume.json — this call only starts it.
export async function syncProjectDriveFolder(
  repoFullName?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const accessToken = await requireAccessToken();
    await triggerDriveFolderSync(accessToken, repoFullName);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export interface LiveDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  category: MockupCategory;
}

// Queries Drive directly (no resume-core round-trip) so a file dropped into
// a project's folder shows up the moment this is called — no Sync click,
// no waiting on a workflow run. Read-only; doesn't touch resume.json.
export async function fetchLiveDriveFiles(
  driveFolder: Pick<ProjectDriveFolder, "mockupsFolderId" | "screenshotsFolderId" | "assetsFolderId">
): Promise<{ ok: true; files: LiveDriveFile[] } | { ok: false; error: string }> {
  try {
    await requireAccessToken();
    const [mockups, screenshots, assets] = await Promise.all([
      listFolderImages(driveFolder.mockupsFolderId),
      listFolderImages(driveFolder.screenshotsFolderId),
      listFolderImages(driveFolder.assetsFolderId),
    ]);
    const files: LiveDriveFile[] = [
      ...mockups.map((f) => ({ ...f, category: "mockups" as const })),
      ...screenshots.map((f) => ({ ...f, category: "screenshots" as const })),
      ...assets.map((f) => ({ ...f, category: "assets" as const })),
    ];
    return { ok: true, files };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

const DRIVE_UPLOAD_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_DRIVE_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function uploadDriveFile(
  folderId: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAccessToken();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("No file provided.");
    }
    if (!DRIVE_UPLOAD_MIME_TYPES.has(file.type)) {
      throw new Error("Only PNG, JPG, or WEBP images are supported.");
    }
    if (file.size > MAX_DRIVE_UPLOAD_BYTES) {
      throw new Error("Image must be smaller than 10MB.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadImageToFolder(folderId, file.name, file.type, buffer);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function renameDriveFile(
  fileId: string,
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAccessToken();
    const trimmed = name.trim();
    if (!trimmed) throw new Error("File name can't be empty.");
    await renameFile(fileId, trimmed);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Moves the file to Drive's Bin (recoverable there), not a permanent erase.
export async function deleteDriveFile(fileId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAccessToken();
    await trashFile(fileId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
