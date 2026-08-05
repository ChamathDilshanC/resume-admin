"use client";

import { Field, Card, Button } from "@/components/FormControls";
import type { ReferenceItem } from "@/lib/types";

const EMPTY_REFERENCE: ReferenceItem = { name: "", reference: "" };

export function ReferencesSection({
  items,
  onChange,
}: {
  items: ReferenceItem[];
  onChange: (items: ReferenceItem[]) => void;
}) {
  function update(i: number, patch: Partial<ReferenceItem>) {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">References</h2>
        <Button variant="secondary" onClick={() => onChange([...items, { ...EMPTY_REFERENCE }])}>
          + Add reference
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded-md border border-gray-200 p-3 sm:grid-cols-[1fr,2fr,auto]">
            <Field label="Name" value={item.name} onChange={(v) => update(i, { name: v })} />
            <Field
              label="Reference (title | company | phone)"
              value={item.reference}
              onChange={(v) => update(i, { reference: v })}
            />
            <div className="flex items-end">
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
