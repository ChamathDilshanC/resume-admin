"use client";

import { Field, Card, Button } from "@/components/FormControls";
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
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Education</h2>
        <Button variant="secondary" onClick={() => onChange([{ ...EMPTY_EDUCATION }, ...items])}>
          + Add education
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-md border border-gray-200 p-3">
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
            <div className="mt-3">
              <Button variant="danger" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
