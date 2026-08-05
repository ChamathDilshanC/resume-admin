"use client";

import { Field, StringListEditor, Button, IconButton, EntityCard, SectionHeader } from "@/components/FormControls";
import { FolderIcon, TrashIcon, PlusIcon } from "@/components/icons";
import type { ProjectItem } from "@/lib/types";

const EMPTY_PROJECT: ProjectItem = { name: "", description: "", highlights: [], links: [] };

export function ProjectsSection({
  items,
  onChange,
}: {
  items: ProjectItem[];
  onChange: (items: ProjectItem[]) => void;
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
          <Button variant="secondary" onClick={() => onChange([{ ...EMPTY_PROJECT }, ...items])}>
            + Add project
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {items.map((item, i) => (
          <EntityCard
            key={i}
            icon={FolderIcon}
            color="teal"
            title={item.name || "New project"}
            onRemove={() => onChange(items.filter((_, idx) => idx !== i))}
          >
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
          </EntityCard>
        ))}
      </div>
    </div>
  );
}
