"use client";

import { Field, StringListEditor, Button, SectionHeader } from "@/components/FormControls";
import { ItemGrid } from "@/components/ItemGrid";
import { BriefcaseIcon } from "@/components/icons";
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
    <div>
      <SectionHeader
        icon={BriefcaseIcon}
        color="violet"
        title="Work Experience"
        action={
          <Button variant="secondary" onClick={() => onChange([{ ...EMPTY_WORK }, ...items])}>
            + Add work item
          </Button>
        }
      />
      <ItemGrid
        items={items}
        icon={BriefcaseIcon}
        color="violet"
        getTitle={(item) => item.position}
        getSubtitle={(item) => item.name}
        onRemove={(i) => onChange(items.filter((_, idx) => idx !== i))}
        renderDetail={(item, i) => (
          <div>
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
          </div>
        )}
      />
    </div>
  );
}
