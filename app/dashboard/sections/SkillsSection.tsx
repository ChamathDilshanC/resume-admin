"use client";

import { Field, Card, Button } from "@/components/FormControls";
import type { SkillItem } from "@/lib/types";

const EMPTY_SKILL: SkillItem = { name: "", level: "", keywords: [] };

export function SkillsSection({
  items,
  onChange,
}: {
  items: SkillItem[];
  onChange: (items: SkillItem[]) => void;
}) {
  function update(i: number, patch: Partial<SkillItem>) {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Skills</h2>
        <Button variant="secondary" onClick={() => onChange([...items, { ...EMPTY_SKILL }])}>
          + Add skill group
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded-md border border-gray-200 p-3 sm:grid-cols-[1fr,3fr,auto]">
            <Field label="Category" value={item.name} onChange={(v) => update(i, { name: v })} />
            <Field
              label="Keywords (comma-separated)"
              value={item.keywords.join(", ")}
              onChange={(v) =>
                update(i, { keywords: v.split(",").map((s) => s.trim()).filter(Boolean) })
              }
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
