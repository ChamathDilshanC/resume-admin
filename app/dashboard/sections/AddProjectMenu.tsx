"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { gooeyToast } from "goey-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, Field, StringListEditor } from "@/components/FormControls";
import { PlusIcon, GithubIcon, SparklesIcon } from "@/components/icons";
import type { ProjectEvidence, ProjectItem, WritingTarget } from "@/lib/types";
import { ProjectEvidenceFields } from "./ProjectEvidenceFields";
import { RepositorySources } from "./RepositorySources";
import type { RepoSummary } from "@/lib/github";
import { listGithubRepos, generateProjectFromGithubRepo } from "../actions";

type AutofillSuggestion = {
  role: string;
  technologies: string[];
  evidence: Required<ProjectEvidence>;
};
type Step = "picker" | "evidence" | "generating" | "review";
type VisibilityFilter = "all" | "public" | "private";

export function AddProjectMenu({
  onAddBlank,
  onAddGenerated,
  target,
}: {
  onAddBlank: () => void;
  onAddGenerated: (project: ProjectItem) => void;
  target: WritingTarget;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("picker");
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [draft, setDraft] = useState<ProjectItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<RepoSummary | null>(null);
  const [autofilling, setAutofilling] = useState(false);
  // The bar jumps to a stage's floor when the server reports that stage, then
  // eases toward (never reaching) the ceiling until the next stage arrives.
  const [progress, setProgress] = useState({ pct: 0, ceiling: 0, label: "" });
  const [notes, setNotes] = useState<Pick<ProjectItem, "role" | "technologies" | "evidence">>({});

  useEffect(() => {
    if (!autofilling) return;
    const timer = setInterval(() => {
      setProgress((p) => (p.pct >= p.ceiling ? p : { ...p, pct: p.pct + (p.ceiling - p.pct) * 0.05 }));
    }, 200);
    return () => clearInterval(timer);
  }, [autofilling]);

  function reset() {
    setStep("picker");
    setDraft(null);
    setError(null);
    setQuery("");
    setVisibility("all");
    setSelectedRepo(null);
    setNotes({});
    setAutofilling(false);
    setProgress({ pct: 0, ceiling: 0, label: "" });
  }

  async function openImportDialog() {
    reset();
    setOpen(true);
    setLoadingRepos(true);
    const result = await listGithubRepos();
    setLoadingRepos(false);
    if (result.ok) {
      setRepos(result.repos);
    } else {
      setError(result.error);
    }
  }

  function handlePickRepo(repo: RepoSummary) {
    setSelectedRepo(repo);
    setNotes({});
    setError(null);
    setStep("evidence");
  }

  // Fills only fields the user left empty, so typed notes are never overwritten.
  async function handleAutofill() {
    if (!selectedRepo) return;
    setAutofilling(true);
    setError(null);
    setProgress({ pct: 3, ceiling: 8, label: "Connecting to GitHub..." });
    try {
      const response = await fetch("/api/autofill", {
        signal: AbortSignal.timeout(75_000),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoName: selectedRepo.name }),
      });
      if (!response.ok || !response.body) throw new Error("request failed");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let suggestion: AutofillSuggestion | null = null;
      let failure: string | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.stage === "readme") setProgress({ pct: 10, ceiling: 55, label: "Reading repository and submodule READMEs..." });
          else if (event.stage === "ai") setProgress({ pct: 58, ceiling: 95, label: "AI is analysing the READMEs..." });
          else if (event.done) suggestion = event.suggestion;
          else if (event.error) failure = event.error;
        }
      }
      if (failure || !suggestion) {
        setError(failure || "Auto-fill ended without a result. Please try again.");
        return;
      }
      setProgress({ pct: 100, ceiling: 100, label: "Done" });
      const { role, technologies, evidence } = suggestion;
      setNotes((current) => ({
        role: current.role?.trim() ? current.role : role,
        technologies: current.technologies?.some((t) => t.trim()) ? current.technologies : technologies,
        evidence: {
          problem: current.evidence?.problem?.trim() ? current.evidence.problem : evidence.problem,
          contribution: current.evidence?.contribution?.trim() ? current.evidence.contribution : evidence.contribution,
          result: current.evidence?.result?.trim() ? current.evidence.result : evidence.result,
          aiUsage: current.evidence?.aiUsage?.trim() ? current.evidence.aiUsage : evidence.aiUsage,
        },
      }));
      gooeyToast.success("Auto-filled from README", { description: "Review and edit every field before generating." });
    } catch {
      setError("Auto-fill timed out or could not reach the AI service. Your notes are still here; please try again.");
    } finally {
      setAutofilling(false);
    }
  }

  async function handleGenerate() {
    if (!selectedRepo) return;
    setStep("generating");
    setError(null);
    try {
      const result = await generateProjectFromGithubRepo(selectedRepo.name, notes, target);
      if (result.ok) {
        setDraft(result.project);
        setStep("review");
      } else {
        setError(result.error);
        setStep("evidence");
        gooeyToast.error("Couldn't generate from this repo", { description: result.error });
      }
    } catch {
      setError("Could not reach the AI service. Your notes are still here; please try again.");
      setStep("evidence");
    }
  }

  function handleAdd() {
    if (!draft) return;
    onAddGenerated(draft);
    setOpen(false);
    reset();
  }

  const filteredRepos = repos
    .filter((r) => visibility === "all" || (visibility === "private") === r.private)
    .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300" />
          }
        >
          <span className="inline-flex items-center gap-1.5">
            <PlusIcon className="h-3.5 w-3.5" /> Add project
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onAddBlank}>
            <PlusIcon className="mr-2 h-4 w-4 opacity-70" />
            Blank project
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openImportDialog}>
            <GithubIcon className="mr-2 h-4 w-4 opacity-70" />
            Import from GitHub
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={(o) => { if (step === "generating") return; setOpen(o); if (!o) reset(); }}>
        <DialogContent className="flex max-h-[88vh] w-[94vw] max-w-[94vw] flex-col overflow-hidden sm:w-[66vw] sm:max-w-[66vw]">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {step === "review" ? "Review generated project" : "Import from GitHub"}
            </DialogTitle>
          </DialogHeader>

          {step === "picker" && (
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Field label="Search your repos" value={query} onChange={setQuery} placeholder="Type to filter..." />
                </div>
                <div className="flex shrink-0 gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                  {(["all", "public", "private"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setVisibility(option)}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                        visibility === option
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {loadingRepos && (
                  <p className="col-span-2 py-6 text-center text-sm text-gray-400">Loading your repos...</p>
                )}
                {!loadingRepos &&
                  filteredRepos.map((repo) => (
                    <button
                      key={repo.name}
                      type="button"
                      onClick={() => handlePickRepo(repo)}
                      className="flex w-full min-w-0 flex-col items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50"
                    >
                      <span className="flex w-full min-w-0 items-center gap-1.5 text-sm font-medium text-gray-900">
                        <span className="truncate">{repo.name}</span>
                        {repo.private && (
                          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                            private
                          </span>
                        )}
                      </span>
                      {repo.description && (
                        <span className="w-full truncate text-xs text-gray-500">{repo.description}</span>
                      )}
                    </button>
                  ))}
                {!loadingRepos && filteredRepos.length === 0 && (
                  <p className="col-span-2 py-6 text-center text-sm text-gray-400">
                    No {visibility !== "all" ? visibility : ""} repos match.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === "evidence" && selectedRepo && (
            <div className="mt-2 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              <p className="text-sm font-semibold">{selectedRepo.name}</p>
              <p className="text-sm text-gray-500">{selectedRepo.description || "Add the project purpose below."} We read this repository and its submodule READMEs for project details and technical terminology. Add your personal contribution and confirmed results below.</p>
              <ProjectEvidenceFields project={notes} onChange={(patch) => setNotes({ ...notes, ...patch })} />
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={() => setStep("picker")} disabled={autofilling}>Back</Button>
                <div className="min-w-0 flex-1" aria-live="polite">
                  {autofilling && (
                    <>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
                          style={{ width: `${Math.round(progress.pct)}%` }}
                        />
                      </div>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {progress.label} {Math.round(progress.pct)}%
                      </p>
                    </>
                  )}
                </div>
                <Button variant="secondary" onClick={handleAutofill} disabled={autofilling}>
                  {autofilling ? "Reading READMEs..." : "Auto-fill from repo"}
                </Button>
                <Button onClick={handleGenerate} disabled={autofilling}>Generate draft</Button>
              </div>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand/30 border-t-brand"
              >
                <SparklesIcon className="h-3.5 w-3.5 text-brand" />
              </motion.span>
              <p className="text-sm text-gray-500">Reading repository and submodule READMEs, then drafting your description and highlights...</p>
            </div>
          )}

          {step === "review" && draft && (
            <div className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              <RepositorySources research={draft.repositoryResearch} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
                <Field
                  label="Description"
                  value={draft.description}
                  onChange={(v) => setDraft({ ...draft, description: v })}
                />
              </div>
              <StringListEditor
                label="Highlights (AI-generated — edit freely)"
                items={draft.highlights}
                onChange={(v) => setDraft({ ...draft, highlights: v })}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setStep("evidence")}>
                  Back
                </Button>
                <Button onClick={handleAdd}>Add to Projects</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
