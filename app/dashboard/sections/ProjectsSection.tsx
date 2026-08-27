"use client";

import { Field, StringListEditor, Button, IconButton, SectionHeader } from "@/components/FormControls";
import { ItemGrid } from "@/components/ItemGrid";
import { FolderIcon, TrashIcon, PlusIcon } from "@/components/icons";
import type { ProjectItem } from "@/lib/types";
import { AddProjectMenu } from "./AddProjectMenu";
import { ProjectPriorityModal } from "./ProjectPriorityModal";
import { ProjectDriveMockups } from "./ProjectDriveMockups";

const EMPTY_PROJECT: ProjectItem = { name: "", description: "", highlights: [], links: [] };

export function ProjectsSection({
  items,
  onChange,
  onSaveProjectPatch,
}: {
  items: ProjectItem[];
  onChange: (items: ProjectItem[]) => void;
  onSaveProjectPatch: (index: number, patch: Partial<ProjectItem>) => Promise<boolean>;
}) {
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
            <ProjectPriorityModal items={items} onSave={onChange} />
            <AddProjectMenu
              onAddBlank={() => onChange([{ ...EMPTY_PROJECT }, ...items])}
              onAddGenerated={(project) => onChange([project, ...items])}
            />
          </div>
        }
      />
      <p className="mb-5 text-sm text-gray-500">
        Sections you haven&rsquo;t touched this session are refreshed from GitHub on save, so a
        stale tab can&rsquo;t overwrite projects your pipeline added automatically in the meantime.
      </p>
      <ItemGrid
        items={items}
        icon={FolderIcon}
        color="teal"
        getTitle={(item) => item.name}
        getSubtitle={(item) => item.description}
        onRemove={(i) => onChange(items.filter((_, idx) => idx !== i))}
        renderDetail={(item, i) => (
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" value={item.name} onChange={(v) => update(i, { name: v })} />
              <Field
                label="Description"
                value={item.description}
                onChange={(v) => update(i, { description: v })}
              />
            </div>

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
    </div>
  );
}
