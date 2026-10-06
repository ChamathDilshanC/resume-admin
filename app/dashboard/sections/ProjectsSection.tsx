"use client";

import { Field, StringListEditor, Button, IconButton, SectionHeader } from "@/components/FormControls";
import { ItemGrid } from "@/components/ItemGrid";
import { FolderIcon, TrashIcon, PlusIcon } from "@/components/icons";
import { useState } from "react";
import type { ProjectItem, WritingTarget } from "@/lib/types";
import { ProjectEvidenceFields } from "./ProjectEvidenceFields";
import { ProjectDraftButton } from "./ProjectDraftButton";
import { RepositorySources } from "./RepositorySources";
import { AddProjectMenu } from "./AddProjectMenu";
import { ProjectPriorityModal } from "./ProjectPriorityModal";
import { ProjectDriveMockups } from "./ProjectDriveMockups";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const EMPTY_PROJECT: ProjectItem = { name: "", description: "", highlights: [], links: [] };

export function ProjectsSection({
  items,
  onChange,
  onSaveProjectPatch,
  onPersistProjects,
  target,
}: {
  items: ProjectItem[];
  onChange: (items: ProjectItem[]) => void;
  onSaveProjectPatch: (index: number, patch: Partial<ProjectItem>) => Promise<boolean>;
  onPersistProjects: (items: ProjectItem[]) => Promise<boolean>;
  target: WritingTarget;
}) {
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  function update(i: number, patch: Partial<ProjectItem>) {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  return (
    <div>
      <SectionHeader
        icon={FolderIcon}
        color="teal"
        title="Projects"
        action={
          <div className="flex items-center gap-2">
            <ProjectPriorityModal items={items} onSave={(next) => void onPersistProjects(next)} />
            <AddProjectMenu
              target={target}
              onAddBlank={() => onChange([{ ...EMPTY_PROJECT }, ...items])}
              onAddGenerated={(project) => void onPersistProjects([project, ...items])}
            />
          </div>
        }
      />
      <p className="mb-5 text-sm text-gray-500">
        Put the most relevant projects first. Show the problem, your contribution and a verified
        result, with technologies connected to actual work. Two or three strong projects are often enough.
      </p>
      <ItemGrid
        items={items}
        icon={FolderIcon}
        color="teal"
        getTitle={(item) => item.name}
        getSubtitle={(item) => item.description}
        onRemove={(i) => setPendingDelete(i)}
        renderDetail={(item, i) => (
          <div>
            <label className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={item.includeInResume !== false}
                onChange={(event) => update(i, { includeInResume: event.target.checked })} />
              Include in generated CV (uncheck to keep it saved for another application)
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" value={item.name} onChange={(v) => update(i, { name: v })} />
              <Field
                label="Description"
                value={item.description}
                onChange={(v) => update(i, { description: v })}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Start date (optional)" value={item.startDate || ""} onChange={(startDate) => update(i, { startDate })} placeholder="YYYY-MM" />
              <Field label="End date (optional)" value={item.endDate || ""} onChange={(endDate) => update(i, { endDate })} placeholder="YYYY-MM or Present" />
            </div>
            <details className="my-4 rounded-lg border border-gray-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold">Project role, technologies & evidence for AI</summary>
              <div className="mt-3"><ProjectEvidenceFields project={item} onChange={(patch) => update(i, patch)} /></div>
            </details>
            <ProjectDraftButton project={item} target={target} onApply={(patch) => update(i, patch)} />
            <div className="mt-3"><RepositorySources research={item.repositoryResearch} /></div>

            <div className="mt-3">
              <span className="mb-1.5 block text-sm font-medium text-gray-600">Links</span>
              <div className="space-y-2">
                {item.links.map((link, li) => (
                  <div key={li} className="flex items-end gap-2">
                    <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                      <Field
                        label="Label"
                        value={link.label}
                        onChange={(v) => {
                          const next = [...item.links];
                          next[li] = { ...next[li], label: v };
                          update(i, { links: next });
                        }}
                      />
                      <Field
                        label="URL"
                        value={link.url}
                        onChange={(v) => {
                          const next = [...item.links];
                          next[li] = { ...next[li], url: v };
                          update(i, { links: next });
                        }}
                      />
                    </div>
                    <IconButton
                      variant="danger"
                      onClick={() => update(i, { links: item.links.filter((_, idx) => idx !== li) })}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </IconButton>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => update(i, { links: [...item.links, { label: "", url: "" }] })}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand transition-colors hover:text-blue-700"
              >
                <PlusIcon className="h-3.5 w-3.5" /> Add link
              </button>
            </div>

            <div className="mt-3">
              <StringListEditor
                label="Highlights"
                items={item.highlights}
                onChange={(v) => update(i, { highlights: v })}
              />
            </div>

            <ProjectDriveMockups
              project={item}
              onChange={(patch) => update(i, patch)}
              onSaveAndSync={(patch) => onSaveProjectPatch(i, patch)}
            />
          </div>
        )}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Delete this project?"
        description={`"${pendingDelete !== null ? items[pendingDelete]?.name || "Untitled project" : ""}" will be removed from resume.json right away. This can't be undone from here.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (pendingDelete === null) return;
          // Committed immediately, like Add: a local-only delete came back after a refresh.
          void onPersistProjects(items.filter((_, idx) => idx !== pendingDelete));
        }}
      />
    </div>
  );
}
