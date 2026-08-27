"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { gooeyToast } from "goey-toast";
import {
  FolderOpenIcon,
  ImagesIcon,
  XIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  SearchIcon,
  ImageOffIcon,
  LoaderIcon,
  UploadIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  CloudIcon,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { MockupCategory, ProjectDriveFolder, ProjectItem } from "@/lib/types";
import {
  syncProjectDriveFolder,
  fetchLiveDriveFiles,
  uploadDriveFile,
  renameDriveFile,
  deleteDriveFile,
  type LiveDriveFile,
} from "../actions";

const CATEGORY_LABELS: Record<MockupCategory, string> = {
  mockups: "Mockups",
  screenshots: "Screenshots",
  assets: "Assets",
};

const UPLOAD_ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Drive's thumbnailLink comes back small (~220px). It's a Google-signed URL
// that also accepts a size override, so requesting a larger render for the
// lightbox doesn't need a second API call or any extra Drive scope.
function largePreviewUrl(thumbnailLink: string): string {
  return thumbnailLink.replace(/=s\d+$/, "=s1600");
}

function folderIdForCategory(driveFolder: ProjectDriveFolder, category: MockupCategory): string {
  return {
    mockups: driveFolder.mockupsFolderId,
    screenshots: driveFolder.screenshotsFolderId,
    assets: driveFolder.assetsFolderId,
  }[category];
}

interface DisplayFile {
  id: string;
  fileName: string;
  thumbnailLink?: string;
  webViewLink?: string;
  category: MockupCategory;
  featured: boolean;
}

type FetchState = "loading" | "loaded" | "error";

function projectKey(project: ProjectItem): string {
  return project.repoFullName || project.name;
}

export function ProjectDriveGallery({
  projects,
  googleDriveConnected,
  googleDriveError,
}: {
  projects: ProjectItem[];
  googleDriveConnected: boolean;
  googleDriveError: boolean;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MockupCategory | "all">("all");
  const [syncingRepo, setSyncingRepo] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ project: ProjectItem; file: DisplayFile } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [liveFiles, setLiveFiles] = useState<Record<string, LiveDriveFile[]>>({});
  const [fetchState, setFetchState] = useState<Record<string, FetchState>>({});

  const projectsWithFolders = useMemo(() => projects.filter((p) => p.driveFolder), [projects]);

  async function loadLive(project: ProjectItem) {
    if (!project.driveFolder) return;
    const key = projectKey(project);
    setFetchState((prev) => ({ ...prev, [key]: "loading" }));
    const result = await fetchLiveDriveFiles(project.driveFolder);
    if (result.ok) {
      setLiveFiles((prev) => ({ ...prev, [key]: result.files }));
      setFetchState((prev) => ({ ...prev, [key]: "loaded" }));
    } else {
      setFetchState((prev) => ({ ...prev, [key]: "error" }));
      gooeyToast.error(`Couldn't load ${project.name}'s Drive folder`, { description: result.error });
    }
  }

  // Live-query every connected project's folder as soon as the page opens —
  // no Sync click needed just to see what's already in Drive.
  useEffect(() => {
    projectsWithFolders.forEach((project) => {
      loadLive(project);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsWithFolders.map(projectKey).join(",")]);

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projectsWithFolders
      .filter((p) => !query || p.name.toLowerCase().includes(query))
      .map((project) => {
        const key = projectKey(project);
        const mockupsByFileId = new Map((project.mockups || []).map((m) => [m.googleDriveFileId, m]));
        const files: DisplayFile[] = (liveFiles[key] || [])
          .filter((f) => categoryFilter === "all" || f.category === categoryFilter)
          .map((f) => ({
            id: f.id,
            fileName: f.name,
            thumbnailLink: f.thumbnailLink,
            webViewLink: f.webViewLink,
            category: f.category,
            featured: mockupsByFileId.get(f.id)?.featured ?? false,
          }));
        return { project, files, state: fetchState[key] || "loading" };
      });
  }, [projectsWithFolders, liveFiles, fetchState, search, categoryFilter]);

  async function handleSync(project: ProjectItem) {
    const repoFullName = project.repoFullName;
    if (!repoFullName) {
      gooeyToast.error("No GitHub repository linked", {
        description: "Link this project to a GitHub repo from the Projects tab first.",
      });
      return;
    }
    setSyncingRepo(repoFullName);
    const result = await syncProjectDriveFolder(repoFullName);
    setSyncingRepo(null);
    if (result.ok) {
      gooeyToast.success("Added to the Projects tab", {
        description: "Files shown here are already live — this just makes them selectable for the portfolio (feature/reorder) on the Projects tab.",
      });
    } else {
      gooeyToast.error("Couldn't sync to Projects tab", { description: result.error });
    }
  }

  function uploadCategory(): MockupCategory {
    return categoryFilter === "all" ? "mockups" : categoryFilter;
  }

  function handleConnectGoogle() {
    signIn("google", { callbackUrl: "/dashboard/drive" });
  }

  async function handleUpload(project: ProjectItem, file: File | undefined) {
    if (!file || !project.driveFolder) return;
    const key = projectKey(project);
    const category = uploadCategory();

    if (!UPLOAD_ACCEPT.split(",").includes(file.type)) {
      gooeyToast.error("Unsupported file type", { description: "Please upload a PNG, JPG, or WEBP image." });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      gooeyToast.error("File too large", { description: "Images must be smaller than 10MB." });
      return;
    }

    setUploadingKey(key);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadDriveFile(folderIdForCategory(project.driveFolder, category), formData);
    setUploadingKey(null);
    const input = fileInputRefs.current[key];
    if (input) input.value = "";

    if (result.ok) {
      gooeyToast.success("Uploaded", { description: `Added to ${project.name} / ${CATEGORY_LABELS[category]}.` });
      loadLive(project);
    } else {
      gooeyToast.error("Upload failed", { description: result.error });
    }
  }

  async function handleDelete(project: ProjectItem, file: DisplayFile, event: React.MouseEvent) {
    event.stopPropagation();
    if (!window.confirm(`Move "${file.fileName}" to Drive's Bin? You can restore it from there if needed.`)) {
      return;
    }
    const result = await deleteDriveFile(file.id);
    if (result.ok) {
      gooeyToast.success("Moved to Bin");
      loadLive(project);
    } else {
      gooeyToast.error("Couldn't delete", { description: result.error });
    }
  }

  function openPreview(project: ProjectItem, file: DisplayFile) {
    setRenaming(false);
    setRenameValue(file.fileName);
    setPreview({ project, file });
  }

  async function handleRenameSave() {
    if (!preview) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === preview.file.fileName) {
      setRenaming(false);
      return;
    }
    const result = await renameDriveFile(preview.file.id, trimmed);
    if (result.ok) {
      gooeyToast.success("Renamed");
      setPreview({ ...preview, file: { ...preview.file, fileName: trimmed } });
      setRenaming(false);
      loadLive(preview.project);
    } else {
      gooeyToast.error("Rename failed", { description: result.error });
    }
  }

  const totalFiles = groups.reduce((sum, g) => sum + g.files.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          ← Back to Dashboard
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold text-gray-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                <ImagesIcon className="h-4.5 w-4.5" />
              </span>
              Project Drive
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Live from Google Drive — upload, rename, or delete files for any project right here,
              no need to open Drive itself.
            </p>
          </div>
        </div>

        {(!googleDriveConnected || googleDriveError) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm text-amber-800">
              <CloudIcon className="h-4 w-4 shrink-0" />
              <span>
                {googleDriveError
                  ? "Your Google Drive connection expired — reconnect to keep uploading."
                  : "Connect your Google Drive account to upload files here (browsing, rename, and delete already work without it)."}
              </span>
            </div>
            <button
              type="button"
              onClick={handleConnectGoogle}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
            >
              {googleDriveError ? "Reconnect Google Drive" : "Connect Google Drive"}
            </button>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by project name..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <div className="flex shrink-0 gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
            {(["all", "mockups", "screenshots", "assets"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCategoryFilter(option)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  categoryFilter === option ? "bg-brand text-white" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {option === "all" ? "All" : CATEGORY_LABELS[option]}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">
            {totalFiles} file{totalFiles === 1 ? "" : "s"} across {groups.length} project
            {groups.length === 1 ? "" : "s"}
          </span>
          <span className="text-xs text-gray-400">
            Uploads go to <span className="font-semibold text-gray-600">{CATEGORY_LABELS[uploadCategory()]}</span>
            {categoryFilter === "all" && " (default)"}
          </span>
        </div>

        {groups.length === 0 && (
          <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <ImageOffIcon className="h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-600">Nothing to show yet</p>
            <p className="mt-1 max-w-sm text-xs text-gray-400">
              Open a project on the Projects tab and create its Drive folder — it&rsquo;ll show up
              here immediately, no sync needed just to browse.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-8">
          {groups.map(({ project, files, state }) => {
            const key = projectKey(project);
            return (
              <div key={key}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                      <FolderOpenIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{project.name}</p>
                      <p className="text-xs text-gray-400">
                        {state === "loading" ? "Loading…" : `${files.length} file${files.length === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadLive(project)}
                      disabled={state === "loading"}
                      title="Refresh from Drive"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCwIcon className={`h-3.5 w-3.5 ${state === "loading" ? "animate-spin" : ""}`} />
                    </button>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[key] = el;
                      }}
                      type="file"
                      accept={UPLOAD_ACCEPT}
                      className="hidden"
                      onChange={(e) => handleUpload(project, e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        googleDriveConnected && !googleDriveError
                          ? fileInputRefs.current[key]?.click()
                          : handleConnectGoogle()
                      }
                      disabled={uploadingKey === key}
                      title={
                        googleDriveConnected && !googleDriveError
                          ? `Upload to ${CATEGORY_LABELS[uploadCategory()]}`
                          : "Connect Google Drive to upload"
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <UploadIcon className={`h-3.5 w-3.5 ${uploadingKey === key ? "animate-pulse" : ""}`} />
                      {uploadingKey === key ? "Uploading…" : "Upload"}
                    </button>
                    {project.driveFolder?.webViewLink && (
                      <a
                        href={project.driveFolder.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300"
                      >
                        <ExternalLinkIcon className="h-3.5 w-3.5" /> Open Folder
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSync(project)}
                      disabled={syncingRepo === project.repoFullName}
                      title="Make these files selectable for the portfolio on the Projects tab"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {syncingRepo === project.repoFullName ? "Syncing…" : "Sync to Projects tab"}
                    </button>
                  </div>
                </div>

                {state === "loading" && files.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-xs text-gray-400">
                    <LoaderIcon className="h-3.5 w-3.5 animate-spin" /> Loading from Drive…
                  </div>
                ) : files.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openPreview(project, file)}
                        onKeyDown={(e) => e.key === "Enter" && openPreview(project, file)}
                        className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-md"
                      >
                        {file.thumbnailLink ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.thumbnailLink}
                            alt={file.fileName}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-300">
                            <ImageOffIcon className="h-6 w-6" />
                          </div>
                        )}
                        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 text-left text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {file.fileName}
                        </span>
                        {file.featured && (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                            ★
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(project, file, e)}
                          title="Move to Bin"
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-xs text-gray-400">
                    {state === "error"
                      ? "Couldn't load this folder — try the refresh button above."
                      : "Folder is empty (or nothing matches this filter) — upload something above."}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[90vh] w-auto max-w-[90vw] flex-col overflow-hidden bg-transparent p-0 shadow-none ring-0 sm:max-w-[90vw]"
        >
          {preview && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              >
                <XIcon className="h-4 w-4" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  preview.file.thumbnailLink
                    ? largePreviewUrl(preview.file.thumbnailLink)
                    : preview.file.webViewLink
                }
                alt={preview.file.fileName}
                className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 rounded-b-xl bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                {renaming ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRenameSave()}
                      className="min-w-0 flex-1 rounded-md border border-white/30 bg-white/10 px-2 py-1 text-sm text-white outline-none focus:border-white/60"
                    />
                    <button
                      type="button"
                      onClick={handleRenameSave}
                      className="shrink-0 rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30"
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRenaming(true)}
                    className="flex min-w-0 items-center gap-1.5 truncate text-left text-sm font-medium text-white hover:underline"
                  >
                    <PencilIcon className="h-3 w-3 shrink-0 opacity-70" />
                    <span className="truncate">{preview.file.fileName}</span>
                  </button>
                )}
                {preview.file.webViewLink && (
                  <a
                    href={preview.file.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-white/90 hover:text-white"
                  >
                    <ExternalLinkIcon className="h-3.5 w-3.5" /> Open in Drive
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
