"use client";

import { useRef, useState } from "react";
import { gooeyToast } from "goey-toast";
import { Button, TextArea, StringListEditor } from "@/components/FormControls";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ProjectItem, WritingTarget } from "@/lib/types";
import { draftProjectAction } from "../actions";

export function ProjectDraftButton({ project, target, onApply }: {
  project: ProjectItem;
  target: WritingTarget;
  onApply: (patch: Pick<ProjectItem, "description" | "highlights">) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Pick<ProjectItem, "description" | "highlights"> | null>(null);
  const source = useRef("");
  async function generate() {
    setBusy(true);
    source.current = JSON.stringify({ project, target });
    try {
      const result = await draftProjectAction(project, target);
      if (result.ok) setDraft(result.draft);
      else gooeyToast.error("Could not draft project", { description: result.error });
    } catch {
      gooeyToast.error("Could not reach the AI service", { description: "Your project was not changed. Please try again." });
    } finally { setBusy(false); }
  }
  function apply() {
    if (!draft) return;
    if (source.current !== JSON.stringify({ project, target })) {
      gooeyToast.error("Project or target changed", { description: "Generate a fresh draft using your latest edits." });
      setDraft(null);
      return;
    }
    onApply(draft);
    setDraft(null);
  }
  return <>
    <Button variant="secondary" onClick={generate} disabled={busy}>
      {busy ? "Drafting..." : "AI draft description & highlights"}
    </Button>
    <Dialog open={draft !== null} onOpenChange={(open) => { if (!open) setDraft(null); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Review project draft</DialogTitle></DialogHeader>
        <p className="text-sm text-gray-500">Check your contribution, technologies and results. Apply the draft when it matches your actual work.</p>
        {draft && <>
          <TextArea label="Description" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
          <StringListEditor label="Highlights" items={draft.highlights} onChange={(highlights) => setDraft({ ...draft, highlights })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={apply}>Apply draft</Button>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
