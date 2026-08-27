"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { gooeyToast } from "goey-toast";
import {
  FolderOpenIcon,
  ImagesIcon,
  XIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  SearchIcon,
  ImageOffIcon,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { MockupCategory, ProjectItem, ProjectMockup } from "@/lib/types";
import { syncProjectDriveFolder } from "../actions";

const CATEGORY_LABELS: Record<MockupCategory, string> = {
  mockups: "Mockups",
  screenshots: "Screenshots",
  assets: "Assets",
};

// Drive's thumbnailLink comes back small (~220px). It's a Google-signed URL
// that also accepts a size override, so requesting a larger render for the
// lightbox doesn't need a second API call or any extra Drive scope.
function largePreviewUrl(thumbnailLink: string): string {
  return thumbnailLink.replace(/=s\d+$/, "=s1600");
}

interface ProjectGroup {
  project: ProjectItem;
  visibleMockups: ProjectMockup[];
}

export function ProjectDriveGallery({ projects }: { projects: ProjectItem[] }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MockupCategory | "all">("all");
  const [syncingRepo, setSyncingRepo] = useState<string | null>(null);
  const [preview, setPreview] = useState<ProjectMockup | null>(null);

  const groups: ProjectGroup[] = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects
      .filter((p) => p.driveFolder || (p.mockups && p.mockups.length > 0))
      .filter((p) => !query || p.name.toLowerCase().includes(query))
      .map((project) => ({
        project,
        visibleMockups: (project.mockups || [])
          .filter((m) => !m.missing)
          .filter((m) => categoryFilter === "all" || m.category === categoryFilter)
          .sort((a, b) => a.displayOrder - b.displayOrder),
      }));
  }, [projects, search, categoryFilter]);

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
      gooeyToast.success("Drive sync started", {
        description: "Runs in the background in resume-core — reload this page in a minute to see results.",
      });
    } else {
      gooeyToast.error("Couldn't start Drive sync", { description: result.error });
    }
  }

  const totalMockups = groups.reduce((sum, g) => sum + g.visibleMockups.length, 0);

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
              Every project&rsquo;s mockups/screenshots/assets in one place, straight from the last
              Drive sync — no need to open each project individually, or download anything to preview.
            </p>
          </div>
        </div>

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
            {totalMockups} file{totalMockups === 1 ? "" : "s"} across {groups.length} project
            {groups.length === 1 ? "" : "s"}
          </span>
        </div>

        {groups.length === 0 && (
          <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <ImageOffIcon className="h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-600">Nothing to show yet</p>
            <p className="mt-1 max-w-sm text-xs text-gray-400">
              Open a project on the Projects tab, create its Drive folder, add some images, then Sync
              Mockups — it&rsquo;ll show up here.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-8">
          {groups.map(({ project, visibleMockups }) => (
            <div key={project.repoFullName || project.name}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                    <FolderOpenIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{project.name}</p>
                    <p className="text-xs text-gray-400">
                      {visibleMockups.length} file{visibleMockups.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCwIcon
                      className={`h-3.5 w-3.5 ${syncingRepo === project.repoFullName ? "animate-spin" : ""}`}
                    />
                    Sync
                  </button>
                </div>
              </div>

              {visibleMockups.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {visibleMockups.map((mockup) => (
                    <button
                      key={mockup.id}
                      type="button"
                      onClick={() => setPreview(mockup)}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-md"
                    >
                      {mockup.thumbnailLink ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mockup.thumbnailLink}
                          alt={mockup.fileName}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-300">
                          <ImageOffIcon className="h-6 w-6" />
                        </div>
                      )}
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 text-left text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {mockup.fileName}
                      </span>
                      {mockup.featured && (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                          ★
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-xs text-gray-400">
                  {project.driveFolder
                    ? "Folder is empty (or nothing matches this filter) — add images to it, then Sync."
                    : "No Drive folder yet — create one from this project's detail view on the Projects tab."}
                </p>
              )}
            </div>
          ))}
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
                src={preview.thumbnailLink ? largePreviewUrl(preview.thumbnailLink) : preview.webViewLink}
                alt={preview.fileName}
                className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 rounded-b-xl bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                <span className="truncate text-sm font-medium text-white">{preview.fileName}</span>
                {preview.webViewLink && (
                  <a
                    href={preview.webViewLink}
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
