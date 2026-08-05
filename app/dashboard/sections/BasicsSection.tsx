"use client";

import { Field, TextArea, Card, Button, IconButton, SectionHeader } from "@/components/FormControls";
import { UserIcon, TrashIcon, PlusIcon } from "@/components/icons";
import type { ResumeBasics } from "@/lib/types";
import { PhotoUploader } from "./PhotoUploader";

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
    <div>
      <SectionHeader icon={UserIcon} color="slate" title="Basics" />

      <Card>
        <div className="mb-5">
          <PhotoUploader image={basics.image} onChange={(v) => set("image", v)} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Name" value={basics.name} onChange={(v) => set("name", v)} />
          <Field label="Label / Title" value={basics.label} onChange={(v) => set("label", v)} />
          <Field label="Email" value={basics.email} onChange={(v) => set("email", v)} />
          <Field label="Phone" value={basics.phone} onChange={(v) => set("phone", v)} />
          <Field label="Portfolio URL" value={basics.url} onChange={(v) => set("url", v)} />
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
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Profiles</span>
        <Button
          variant="secondary"
          onClick={() => set("profiles", [...basics.profiles, { network: "", username: "", url: "" }])}
        >
          <span className="inline-flex items-center gap-1.5">
            <PlusIcon className="h-3.5 w-3.5" /> Add profile
          </span>
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {basics.profiles.map((profile, i) => (
          <Card key={i}>
            <div className="mb-2 flex items-center justify-end">
              <IconButton
                variant="danger"
                onClick={() => set("profiles", basics.profiles.filter((_, idx) => idx !== i))}
              >
                <TrashIcon className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="space-y-3">
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
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
