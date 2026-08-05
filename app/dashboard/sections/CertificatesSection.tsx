"use client";

import { Field, Card, Button } from "@/components/FormControls";
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
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Certificates</h2>
        <Button variant="secondary" onClick={() => onChange([{ ...EMPTY_CERTIFICATE }, ...items])}>
          + Add certificate
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-md border border-gray-200 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" value={item.name} onChange={(v) => update(i, { name: v })} />
              <Field label="Issuer" value={item.issuer} onChange={(v) => update(i, { issuer: v })} />
              <Field label="Date" value={item.date} onChange={(v) => update(i, { date: v })} />
              <Field label="URL" value={item.url} onChange={(v) => update(i, { url: v })} />
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
