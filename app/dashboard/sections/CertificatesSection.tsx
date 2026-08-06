"use client";

import { Field, Button, SectionHeader } from "@/components/FormControls";
import { ItemGrid } from "@/components/ItemGrid";
import { BadgeCheckIcon } from "@/components/icons";
import type { CertificateItem } from "@/lib/types";

const EMPTY_CERTIFICATE: CertificateItem = { name: "", date: "", issuer: "", url: "" };

export function CertificatesSection({
  items,
  onChange,
}: {
  items: CertificateItem[];
  onChange: (items: CertificateItem[]) => void;
}) {
  function update(i: number, patch: Partial<CertificateItem>) {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  return (
    <div>
      <SectionHeader
        icon={BadgeCheckIcon}
        color="rose"
        title="Certificates"
        action={
          <Button variant="secondary" onClick={() => onChange([{ ...EMPTY_CERTIFICATE }, ...items])}>
            + Add certificate
          </Button>
        }
      />
      <ItemGrid
        items={items}
        icon={BadgeCheckIcon}
        color="rose"
        getTitle={(item) => item.name}
        getSubtitle={(item) => item.issuer}
        onRemove={(i) => onChange(items.filter((_, idx) => idx !== i))}
        renderDetail={(item, i) => (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name" value={item.name} onChange={(v) => update(i, { name: v })} />
            <Field label="Issuer" value={item.issuer} onChange={(v) => update(i, { issuer: v })} />
            <Field label="Date" value={item.date} onChange={(v) => update(i, { date: v })} />
            <Field label="URL" value={item.url} onChange={(v) => update(i, { url: v })} />
          </div>
        )}
      />
    </div>
  );
}
