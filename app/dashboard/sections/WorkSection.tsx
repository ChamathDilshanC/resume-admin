"use client";

import { Field, StringListEditor, Card, Button } from "@/components/FormControls";
import type { WorkItem } from "@/lib/types";

const EMPTY_WORK: WorkItem = {
  name: "",
  position: "",
  url: "",
  startDate: "",
  endDate: "",
  summary: "",
  highlights: [],
};

export function WorkSection({
  items,
  onChange,
}: {
  items: WorkItem[];
  onChange: (items: WorkItem[]) => void;
}) {
  function update(i: number, patch: Partial<WorkItem>) {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Work Experience</h2>
        <Button variant="secondary" onClick={() => onChange([{ ...EMPTY_WORK }, ...items])}>
          + Add work item
        </Button>
      </div>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="rounded-md border border-gray-200 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Position" value={item.position} onChange={(v) => update(i, { position: v })} />
              <Field label="Company" value={item.name} onChange={(v) => update(i, { name: v })} />
              <Field label="Company URL" value={item.url} onChange={(v) => update(i, { url: v })} />
              <Field label="Start Date" value={item.startDate} onChange={(v) => update(i, { startDate: v })} />
              <Field label="End Date" value={item.endDate} onChange={(v) => update(i, { endDate: v })} />
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
                Remove this work item
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
