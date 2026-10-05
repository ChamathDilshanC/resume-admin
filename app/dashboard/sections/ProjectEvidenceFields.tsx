"use client";

import { Field, TextArea } from "@/components/FormControls";
import type { ProjectItem, ProjectEvidence } from "@/lib/types";

export function ProjectEvidenceFields({ project, onChange }: {
  project: Pick<ProjectItem, "role" | "technologies" | "evidence">;
  onChange: (patch: Partial<ProjectItem>) => void;
}) {
  function setEvidence(key: keyof ProjectEvidence, value: string) {
    onChange({ evidence: { ...project.evidence, [key]: value } });
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Your role / contribution scope" value={project.role || ""}
          placeholder="e.g. Backend contributor (team project)"
          onChange={(role) => onChange({ role })} />
        <Field label="Technologies used (comma separated)" value={(project.technologies || []).join(",")}
          placeholder="Only tools you actually used"
          onChange={(value) => onChange({ technologies: value.split(",") })} />
      </div>
      <p className="text-xs text-gray-500">
        These evidence notes guide the AI and are not printed. Explain what you personally did;
        leave unknown results empty. Review every claim before adding it to your CV.
      </p>
      <TextArea label="Problem / who needed this system?" value={project.evidence?.problem || ""}
        onChange={(value) => setEvidence("problem", value)} rows={2} />
      <TextArea label="Your actual work / technical decisions / how you used the tools"
        value={project.evidence?.contribution || ""}
        onChange={(value) => setEvidence("contribution", value)} rows={3} />
      <TextArea label="Verified result / delivered capability (numbers only if measured)"
        value={project.evidence?.result || ""}
        onChange={(value) => setEvidence("result", value)} rows={2} />
      <TextArea label="AI use, if any: development assistance or product feature? How was output checked?"
        value={project.evidence?.aiUsage || ""}
        onChange={(value) => setEvidence("aiUsage", value)} rows={2} />
    </div>
  );
}
