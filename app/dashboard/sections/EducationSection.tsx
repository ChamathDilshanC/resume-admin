"use client";

import { Field, Button, SectionHeader } from "@/components/FormControls";
import { ItemGrid } from "@/components/ItemGrid";
import { AcademicCapIcon } from "@/components/icons";
import type { EducationItem } from "@/lib/types";

const EMPTY_EDUCATION: EducationItem = {
  institution: "",
  url: "",
  area: "",
  studyType: "",
  startDate: "",
  endDate: "",
  score: "",
  courses: [],
};

export function EducationSection({
  items,
  onChange,
}: {
  items: EducationItem[];
  onChange: (items: EducationItem[]) => void;
}) {
  function update(i: number, patch: Partial<EducationItem>) {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  return (
    <div>
      <SectionHeader
        icon={AcademicCapIcon}
        color="sky"
        title="Education"
        action={
          <Button variant="secondary" onClick={() => onChange([{ ...EMPTY_EDUCATION }, ...items])}>
            + Add education
          </Button>
        }
      />
      <ItemGrid
        items={items}
        icon={AcademicCapIcon}
        color="sky"
        getTitle={(item) => item.institution}
        getSubtitle={(item) => [item.studyType, item.area].filter(Boolean).join(" — ")}
        onRemove={(i) => onChange(items.filter((_, idx) => idx !== i))}
        renderDetail={(item, i) => (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Institution"
              value={item.institution}
              onChange={(v) => update(i, { institution: v })}
            />
            <Field label="Study Type" value={item.studyType} onChange={(v) => update(i, { studyType: v })} />
            <Field label="Area" value={item.area} onChange={(v) => update(i, { area: v })} />
            <Field label="Start Date" value={item.startDate} onChange={(v) => update(i, { startDate: v })} />
            <Field label="End Date" value={item.endDate} onChange={(v) => update(i, { endDate: v })} />
          </div>
        )}
      />
    </div>
  );
}
