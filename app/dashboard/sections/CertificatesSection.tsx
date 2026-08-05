"use client";

import { Field, Button, EntityCard, SectionHeader } from "@/components/FormControls";
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item, i) => (
          <EntityCard
            key={i}
            icon={BadgeCheckIcon}
            color="rose"
            title={item.name || "New certificate"}
            onRemove={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" value={item.name} onChange={(v) => update(i, { name: v })} />
              <Field label="Issuer" value={item.issuer} onChange={(v) => update(i, { issuer: v })} />
              <Field label="Date" value={item.date} onChange={(v) => update(i, { date: v })} />
              <Field label="URL" value={item.url} onChange={(v) => update(i, { url: v })} />
            </div>
          </EntityCard>
        ))}
      </div>
    </div>
  );
}
