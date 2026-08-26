import type { ReactNode } from "react";
import { ChevronRightIcon } from "@/components/icons";

function FlowConnector() {
  return (
    <div className="flex justify-center">
      <div className="h-5 w-px bg-gray-300" />
      <ChevronRightIcon className="-mt-1.5 -ml-[7px] h-3.5 w-3.5 rotate-90 text-gray-400" />
    </div>
  );
}

function FlowNode({
  title,
  detail,
  tone = "default",
}: {
  title: string;
  detail: ReactNode;
  tone?: "default" | "manual" | "stop" | "success";
}) {
  const toneClasses: Record<string, string> = {
    default: "border-gray-200 bg-white",
    manual: "border-amber-200 bg-amber-50",
    stop: "border-gray-200 bg-gray-50",
    success: "border-emerald-200 bg-emerald-50",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{detail}</p>
    </div>
  );
}

export function ProjectPipelineFlow() {
  return (
    <div className="mx-auto max-w-md">
      <FlowNode
        title="Repo has .gitmodules"
        detail="A meta-repo (submodule-based platform project) — the only kind discover-projects.js looks for."
      />
      <FlowConnector />
      <FlowNode
        title="discover-projects.yml runs"
        detail="Daily at 3am UTC, or triggered manually from Actions → Discover Untracked Projects."
      />
      <FlowConnector />
      <FlowNode
        title={'Adds "resume-project" topic + commits notify-resume.yml'}
        detail={
          <>
            If you add the <code className="rounded bg-black/5 px-1">resume-project</code> topic
            yourself instead, the next run finishes the wiring rather than skipping the repo.
          </>
        }
        tone="manual"
      />
      <FlowConnector />
      <FlowNode
        title="One-time: RESUME_CORE_PAT secret on that repo"
        detail="A fine-grained PAT scoped to trigger repository_dispatch on resume-core. Nothing fires without it."
        tone="manual"
      />
      <FlowConnector />
      <FlowNode title="Push to main / master" detail="Any push to the default branch." />
      <FlowConnector />
      <FlowNode
        title="notify-resume.yml fires"
        detail={
          <>
            Dispatches a <code className="rounded bg-black/5 px-1">resume_update</code> event to
            resume-core.
          </>
        }
      />
      <FlowConnector />
      <FlowNode
        title="update-resume.yml runs fetch-repo-data.js"
        detail={
          <>
            Checks the source repo for a separate{" "}
            <code className="rounded bg-black/5 px-1">resume-ready</code> topic.
          </>
        }
      />
      <FlowConnector />
      <FlowNode
        title='Has the "resume-ready" topic?'
        detail="This is the presentability gate — separate from resume-project, which only means tracked."
      />

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <div className="mb-2 text-center text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
            No
          </div>
          <FlowNode title="Stops here" detail="resume.json is untouched — silent, not an error." tone="stop" />
        </div>
        <div>
          <div className="mb-2 text-center text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
            Yes
          </div>
          <FlowNode
            title="Bullets → merge → PDF → deliver"
            detail="AI-generated highlights, merged into resume.json by name, PDF regenerated, sent to Drive/email/WhatsApp."
            tone="success"
          />
        </div>
      </div>
    </div>
  );
}
