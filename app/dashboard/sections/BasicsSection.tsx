"use client";

import { Field, TextArea, Card, Button } from "@/components/FormControls";
import type { ResumeBasics } from "@/lib/types";

export function BasicsSection({
  basics,
  onChange,
}: {
  basics: ResumeBasics;
  onChange: (basics: ResumeBasics) => void;
}) {
  function set<K extends keyof ResumeBasics>(key: K, value: ResumeBasics[K]) {
    onChange({ ...basics, [key]: value });
  }

  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold text-gray-900">Basics</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name" value={basics.name} onChange={(v) => set("name", v)} />
        <Field label="Label / Title" value={basics.label} onChange={(v) => set("label", v)} />
        <Field label="Email" value={basics.email} onChange={(v) => set("email", v)} />
        <Field label="Phone" value={basics.phone} onChange={(v) => set("phone", v)} />
        <Field label="Portfolio URL" value={basics.url} onChange={(v) => set("url", v)} />
        <Field
          label="Photo URL / path"
          value={basics.image}
          onChange={(v) => set("image", v)}
          placeholder="https://... or a data URI"
        />
        <Field
          label="City"
          value={basics.location.city}
          onChange={(v) => set("location", { ...basics.location, city: v })}
        />
        <Field
          label="Country code"
          value={basics.location.countryCode}
          onChange={(v) => set("location", { ...basics.location, countryCode: v })}
        />
      </div>
      <div className="mt-3">
        <TextArea label="Summary" value={basics.summary} onChange={(v) => set("summary", v)} rows={4} />
      </div>

      <div className="mt-4">
        <span className="mb-1 block text-sm font-medium text-gray-700">Profiles</span>
        <div className="space-y-2">
          {basics.profiles.map((profile, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-md border border-gray-200 p-2 sm:grid-cols-3">
              <Field
                label="Network"
                value={profile.network}
                onChange={(v) => {
                  const next = [...basics.profiles];
                  next[i] = { ...next[i], network: v };
                  set("profiles", next);
                }}
              />
              <Field
                label="Username"
                value={profile.username}
                onChange={(v) => {
                  const next = [...basics.profiles];
                  next[i] = { ...next[i], username: v };
                  set("profiles", next);
                }}
              />
              <Field
                label="URL"
                value={profile.url}
                onChange={(v) => {
                  const next = [...basics.profiles];
                  next[i] = { ...next[i], url: v };
                  set("profiles", next);
                }}
              />
              <div className="sm:col-span-3">
                <Button
                  variant="danger"
                  onClick={() => set("profiles", basics.profiles.filter((_, idx) => idx !== i))}
                >
                  Remove profile
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <Button
            variant="secondary"
            onClick={() => set("profiles", [...basics.profiles, { network: "", username: "", url: "" }])}
          >
            + Add profile
          </Button>
        </div>
      </div>
    </Card>
  );
}
