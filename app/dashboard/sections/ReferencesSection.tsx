"use client";

import { Field, Button, EntityCard, SectionHeader } from "@/components/FormControls";
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {items.map((item, i) => (
          <EntityCard
            key={i}
            icon={UsersIcon}
            color="emerald"
            title={item.name || "New reference"}
            onRemove={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            <div className="space-y-3">
              <Field label="Name" value={item.name} onChange={(v) => update(i, { name: v })} />
              <Field
                label="Reference (title | company | phone)"
                value={item.reference}
                onChange={(v) => update(i, { reference: v })}
              />
            </div>
          </EntityCard>
        ))}
      </div>
    </div>
  );
}
