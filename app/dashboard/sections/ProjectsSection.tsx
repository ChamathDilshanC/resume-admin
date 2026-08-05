"use client";

import { Field, StringListEditor, Card, Button } from "@/components/FormControls";
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
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Projects</h2>
        <Button variant="secondary" onClick={() => onChange([{ ...EMPTY_PROJECT }, ...items])}>
          + Add project
        </Button>
      </div>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="rounded-md border border-gray-200 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" value={item.name} onChange={(v) => update(i, { name: v })} />
              <Field
                label="Description"
                value={item.description}
                onChange={(v) => update(i, { description: v })}
              />
            </div>

            <div className="mt-3">
              <span className="mb-1 block text-sm font-medium text-gray-700">Links</span>
              <div className="space-y-2">
                {item.links.map((link, li) => (
                  <div key={li} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,2fr,auto]">
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
                    <div className="flex items-end">
                      <Button
                        variant="danger"
                        onClick={() => update(i, { links: item.links.filter((_, idx) => idx !== li) })}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="secondary"
                onClick={() => update(i, { links: [...item.links, { label: "", url: "" }] })}
              >
                + Add link
              </Button>
            </div>

            <div className="mt-3">
              <StringListEditor
                label="Highlights"
                items={item.highlights}
                onChange={(v) => update(i, { highlights: v })}
              />
            </div>
            <div className="mt-3">
              <Button variant="danger" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
                Remove this project
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
