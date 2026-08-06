"use client";

import { Field, Button, SectionHeader } from "@/components/FormControls";
import { ItemGrid } from "@/components/ItemGrid";
import { UsersIcon } from "@/components/icons";
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
    <div>
      <SectionHeader
        icon={UsersIcon}
        color="emerald"
        title="References"
        action={
          <Button variant="secondary" onClick={() => onChange([...items, { ...EMPTY_REFERENCE }])}>
            + Add reference
          </Button>
        }
      />
      <ItemGrid
        items={items}
        icon={UsersIcon}
        color="emerald"
        columns="lg:grid-cols-2 xl:grid-cols-3"
        getTitle={(item) => item.name}
        getSubtitle={(item) => item.reference}
        onRemove={(i) => onChange(items.filter((_, idx) => idx !== i))}
        renderDetail={(item, i) => (
          <div className="space-y-3">
            <Field label="Name" value={item.name} onChange={(v) => update(i, { name: v })} />
            <Field
              label="Reference (title | company | phone)"
              value={item.reference}
              onChange={(v) => update(i, { reference: v })}
            />
          </div>
        )}
      />
    </div>
  );
}
