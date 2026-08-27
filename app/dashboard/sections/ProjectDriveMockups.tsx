"use client";

import { useState } from "react";
import { Reorder } from "framer-motion";
import { gooeyToast } from "goey-toast";
import {
  ExternalLinkIcon,
  RefreshCwIcon,
  StarIcon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
} from "lucide-react";
import { IconButton } from "@/components/FormControls";
import { TrashIcon } from "@/components/icons";
import type { ProjectItem, ProjectMockup } from "@/lib/types";
import { deriveRepoFullNameFromLinks } from "@/lib/project-links";
import { syncProjectDriveFolder } from "../actions";

export function ProjectDriveMockups({
  project,
  onChange,
}: {
  project: ProjectItem;
  onChange: (patch: Partial<ProjectItem>) => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const mockups = project.mockups || [];
  const orderedMockups = [...mockups].sort((a, b) => a.displayOrder - b.displayOrder);

  // Projects created before repoFullName existed still have a GitHub URL in
  // their links — recover it from there instead of forcing a re-import.
  const linkedRepoFullName = project.repoFullName || deriveRepoFullNameFromLinks(project.links);

  async function handleSync() {
    if (!linkedRepoFullName) {
      gooeyToast.error("No GitHub repository linked", {
        description: "Add a GitHub link to this project, or re-add it via \"Import from GitHub\".",
      });
      return;
    }
    // Persist the recovered link so it's stored going forward, not
    // re-derived from links every time.
    if (!project.repoFullName) {
      onChange({ repoFullName: linkedRepoFullName, repositoryType: project.repositoryType ?? "MAIN" });
    }
    setSyncing(true);
    const result = await syncProjectDriveFolder(linkedRepoFullName);
    setSyncing(false);
    if (result.ok) {
      gooeyToast.success("Drive sync started", {
        description: "Runs in the background in resume-core — reload the dashboard in a minute to see results.",
      });
    } else {
      gooeyToast.error("Couldn't start Drive sync", { description: result.error });
    }
  }

  function updateMockup(id: string, patch: Partial<ProjectMockup>) {
    onChange({ mockups: mockups.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  }

  function setFeatured(id: string) {
    onChange({ mockups: mockups.map((m) => ({ ...m, featured: m.id === id })) });
  }

  function removeMockup(id: string) {
    onChange({ mockups: mockups.filter((m) => m.id !== id) });
  }

  function reorder(next: ProjectMockup[]) {
    onChange({ mockups: next.map((m, i) => ({ ...m, displayOrder: i })) });
  }

  return (
    <div className="mt-5 border-t border-gray-100 pt-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-600">Google Drive Integration</span>
        <div className="flex items-center gap-2">
          {project.driveFolder?.webViewLink && (
            <a
              href={project.driveFolder.webViewLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" /> Open Project Folder
            </a>
          )}
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCwIcon className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {project.driveFolder ? "Sync Mockups" : "Create Drive Folder"}
          </button>
        </div>
      </div>

      {!linkedRepoFullName ? (
        <p className="text-xs text-amber-600">
          Not linked to a GitHub repository — add a GitHub link above, or re-add this project via &ldquo;Import
          from GitHub&rdquo;, to enable a Drive folder.
        </p>
      ) : project.driveFolder ? (
        <p className="text-xs text-gray-500">
          Folder ready. Drop images into its <code className="rounded bg-gray-100 px-1 py-0.5">mockups</code>,{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5">screenshots</code>, or{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5">assets</code> subfolder on Drive, then Sync Mockups.
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          {!project.repoFullName && (
            <>Linked via GitHub URL in Links (<code className="rounded bg-gray-100 px-1 py-0.5">{linkedRepoFullName}</code>). </>
          )}
          No Drive folder yet — create one to start adding mockups.
        </p>
      )}

      {mockups.length > 0 && (
        <div className="mt-4">
          <span className="mb-1.5 block text-sm font-medium text-gray-600">
            Portfolio Mockups <span className="font-normal text-gray-400">— drag to reorder, star to feature</span>
          </span>
          <Reorder.Group axis="y" values={orderedMockups} onReorder={reorder} className="flex flex-col gap-2">
            {orderedMockups.map((mockup) => (
              <Reorder.Item
                key={mockup.id}
                value={mockup}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm active:cursor-grabbing"
              >
                <GripVerticalIcon className="h-4 w-4 shrink-0 cursor-grab text-gray-300" />
                {mockup.thumbnailLink ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mockup.thumbnailLink}
                    alt={mockup.fileName}
                    className={`h-12 w-12 shrink-0 rounded-md object-cover ${mockup.missing ? "opacity-40 grayscale" : ""}`}
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[10px] text-gray-400">
                    {mockup.category}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{mockup.fileName}</p>
                  <p className="text-xs text-gray-400">
                    {mockup.category}
                    {mockup.missing && <span className="text-amber-600"> · missing from Drive</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFeatured(mockup.id)}
                  title="Set as featured image"
                  className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                    mockup.featured ? "text-amber-500" : "text-gray-300 hover:text-gray-500"
                  }`}
                >
                  <StarIcon className="h-4 w-4" fill={mockup.featured ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  onClick={() => updateMockup(mockup.id, { enabled: !mockup.enabled })}
                  title={mockup.enabled ? "Hide from portfolio" : "Show in portfolio"}
                  className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                    mockup.enabled ? "text-emerald-500" : "text-gray-300 hover:text-gray-500"
                  }`}
                >
                  {mockup.enabled ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
                </button>
                <IconButton variant="danger" onClick={() => removeMockup(mockup.id)}>
                  <TrashIcon className="h-4 w-4" />
                </IconButton>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      )}

      {project.driveFolder && mockups.length === 0 && (
        <p className="mt-3 py-4 text-center text-xs text-gray-400">
          No images found yet. Add some to the Drive folder, then Sync Mockups.
        </p>
      )}
    </div>
  );
}
