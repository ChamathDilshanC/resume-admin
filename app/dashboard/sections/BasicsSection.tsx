"use client";

import { useState } from "react";
import { gooeyToast } from "goey-toast";
import { Field, TextArea, Card, Button, IconButton, SectionHeader } from "@/components/FormControls";
import { UserIcon, TrashIcon, PlusIcon, SparklesIcon } from "@/components/icons";
import type { ResumeBasics, ResumeData } from "@/lib/types";
import { optimizeSummaryAction } from "../actions";
import { PhotoUploader } from "./PhotoUploader";

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-4 block text-xs font-semibold tracking-wide text-gray-400 uppercase">
      {children}
    </span>
  );
}

export function BasicsSection({
  basics,
  onChange,
  resumeData,
}: {
  basics: ResumeBasics;
  onChange: (basics: ResumeBasics) => void;
  resumeData: ResumeData;
}) {
  const [optimizing, setOptimizing] = useState(false);

  function set<K extends keyof ResumeBasics>(key: K, value: ResumeBasics[K]) {
    onChange({ ...basics, [key]: value });
  }

  async function handleAiOptimizeSummary() {
    setOptimizing(true);
    const result = await optimizeSummaryAction(resumeData);
    setOptimizing(false);
    if (result.ok) {
      onChange({ ...basics, summary: result.summary });
      gooeyToast.success("Summary optimized", {
        description: "AI rewrote your summary for ATS. Review it, then Save.",
      });
    } else {
      gooeyToast.error("AI optimize failed", { description: result.error });
    }
  }

  return (
    <div>
      <SectionHeader icon={UserIcon} color="slate" title="Basics" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardLabel>Identity</CardLabel>
          <div className="mb-4">
            <PhotoUploader image={basics.image} onChange={(v) => set("image", v)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name" value={basics.name} onChange={(v) => set("name", v)} />
            <Field label="Label / Title" value={basics.label} onChange={(v) => set("label", v)} />
          </div>
        </Card>

        <Card>
          <CardLabel>Contact</CardLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <CardLabel>Summary</CardLabel>
            <Button variant="secondary" onClick={handleAiOptimizeSummary} disabled={optimizing}>
              <span className="inline-flex items-center gap-1.5">
                <SparklesIcon className="h-3.5 w-3.5" />
                {optimizing ? "Optimizing…" : "AI Optimize (ATS)"}
              </span>
            </Button>
          </div>
          <TextArea label="" value={basics.summary} onChange={(v) => set("summary", v)} rows={4} />
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardLabel>Closing Declaration</CardLabel>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={basics.hideDeclaration ?? false}
              onChange={(e) => set("hideDeclaration", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-2 focus:ring-brand/15"
            />
            Hide closing declaration
          </label>
          {!basics.hideDeclaration && (
            <div className="mt-3">
              <Field
                label="Target company (optional)"
                value={basics.targetCompany || ""}
                onChange={(v) => set("targetCompany", v)}
                placeholder="e.g. Acme Corp"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Named in the declaration&rsquo;s closing line when set (&ldquo;...serve at Acme
                Corp&rdquo;); left blank, it falls back to &ldquo;...serve in your esteemed
                organization&rdquo;.
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 flex items-center justify-between">
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
