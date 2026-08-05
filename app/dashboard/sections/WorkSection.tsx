"use client";

import { Field, StringListEditor, Button, EntityCard, SectionHeader } from "@/components/FormControls";
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
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {items.map((item, i) => (
          <EntityCard
            key={i}
            icon={BriefcaseIcon}
            color="violet"
            title={item.position || "New position"}
            onRemove={() => onChange(items.filter((_, idx) => idx !== i))}
          >
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
          </EntityCard>
        ))}
      </div>
    </div>
  );
}
