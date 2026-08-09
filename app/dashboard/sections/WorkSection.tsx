"use client";

import { useState } from "react";
import { gooeyToast } from "goey-toast";
import { Field, StringListEditor, Button, SectionHeader } from "@/components/FormControls";
import { ItemGrid } from "@/components/ItemGrid";
import { BriefcaseIcon, SparklesIcon } from "@/components/icons";
import type { ResumeData, WorkItem } from "@/lib/types";
import { optimizeWorkAction } from "../actions";

const EMPTY_WORK: WorkItem = {
  name: "",
  position: "",
  url: "",
  startDate: "",
  endDate: "",
  summary: "",
  highlights: [],
};

export function WorkSection({
  items,
  onChange,
  resumeData,
}: {
  items: WorkItem[];
  onChange: (items: WorkItem[]) => void;
  resumeData: ResumeData;
}) {
  const [optimizing, setOptimizing] = useState(false);

  function update(i: number, patch: Partial<WorkItem>) {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  async function handleAiOptimizeWork() {
    setOptimizing(true);
    const result = await optimizeWorkAction({ ...resumeData, work: items });
    setOptimizing(false);
    if (result.ok) {
      onChange(result.work);
      gooeyToast.success("Highlights optimized", {
        description: "AI rewrote your work highlights for ATS. Review them, then Save.",
      });
    } else {
      gooeyToast.error("AI optimize failed", { description: result.error });
    }
  }

  return (
    <div>
      <SectionHeader
        icon={BriefcaseIcon}
        color="violet"
        title="Work Experience"
        action={
          <span className="inline-flex items-center gap-2">
            <Button variant="secondary" onClick={handleAiOptimizeWork} disabled={optimizing}>
              <span className="inline-flex items-center gap-1.5">
                <SparklesIcon className="h-3.5 w-3.5" />
                {optimizing ? "Optimizing…" : "AI Optimize (ATS)"}
              </span>
            </Button>
            <Button variant="secondary" onClick={() => onChange([{ ...EMPTY_WORK }, ...items])}>
              + Add work item
            </Button>
          </span>
        }
      />
      <ItemGrid
        items={items}
        icon={BriefcaseIcon}
        color="violet"
        getTitle={(item) => item.position}
        getSubtitle={(item) => item.name}
        onRemove={(i) => onChange(items.filter((_, idx) => idx !== i))}
        renderDetail={(item, i) => (
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Position" value={item.position} onChange={(v) => update(i, { position: v })} />
              <Field label="Company" value={item.name} onChange={(v) => update(i, { name: v })} />
              <Field label="Company URL" value={item.url} onChange={(v) => update(i, { url: v })} />
              <Field label="Start Date" value={item.startDate} onChange={(v) => update(i, { startDate: v })} />
              <Field label="End Date" value={item.endDate} onChange={(v) => update(i, { endDate: v })} />
            </div>
            <div className="mt-3">
              <StringListEditor
                label="Highlights"
                items={item.highlights}
                onChange={(v) => update(i, { highlights: v })}
              />
            </div>
          </div>
        )}
      />
    </div>
  );
}
