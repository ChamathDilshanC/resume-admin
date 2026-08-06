"use client";

import { Field, Button, SectionHeader } from "@/components/FormControls";
import { ItemGrid } from "@/components/ItemGrid";
import { SparklesIcon } from "@/components/icons";
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
    <div>
      <SectionHeader
        icon={SparklesIcon}
        color="amber"
        title="Skills"
        action={
          <Button variant="secondary" onClick={() => onChange([...items, { ...EMPTY_SKILL }])}>
            + Add skill group
          </Button>
        }
      />
      <ItemGrid
        items={items}
        icon={SparklesIcon}
        color="amber"
        columns="lg:grid-cols-2 xl:grid-cols-3"
        getTitle={(item) => item.name}
        getSubtitle={(item) => item.keywords.join(", ")}
        onRemove={(i) => onChange(items.filter((_, idx) => idx !== i))}
        renderDetail={(item, i) => (
          <div className="space-y-3">
            <Field label="Category" value={item.name} onChange={(v) => update(i, { name: v })} />
            <Field
              label="Keywords (comma-separated)"
              value={item.keywords.join(", ")}
              onChange={(v) =>
                update(i, { keywords: v.split(",").map((s) => s.trim()).filter(Boolean) })
              }
            />
          </div>
        )}
      />
    </div>
  );
}
