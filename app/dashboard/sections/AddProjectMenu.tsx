"use client";

import { useState } from "react";
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
import type { ProjectItem } from "@/lib/types";
import type { RepoSummary } from "@/lib/github";
import { listGithubRepos, generateProjectFromGithubRepo } from "../actions";

type Step = "picker" | "generating" | "review";

export function AddProjectMenu({
  onAddBlank,
  onAddGenerated,
}: {
  onAddBlank: () => void;
  onAddGenerated: (project: ProjectItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("picker");
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<ProjectItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep("picker");
    setDraft(null);
    setError(null);
    setQuery("");
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

  async function handlePickRepo(repo: RepoSummary) {
    setStep("generating");
    setError(null);
    const result = await generateProjectFromGithubRepo(repo.name);
    if (result.ok) {
      setDraft(result.project);
      setStep("review");
    } else {
      setError(result.error);
      setStep("picker");
      gooeyToast.error("Couldn't generate from this repo", { description: result.error });
    }
  }

  function handleAdd() {
    if (!draft) return;
    onAddGenerated(draft);
    setOpen(false);
    reset();
  }

  const filteredRepos = repos.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));

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

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="flex max-h-[88vh] w-[66vw] max-w-[66vw] flex-col overflow-hidden sm:max-w-[66vw]">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {step === "review" ? "Review generated project" : "Import from GitHub"}
            </DialogTitle>
          </DialogHeader>

          {step === "picker" && (
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <Field label="Search your repos" value={query} onChange={setQuery} placeholder="Type to filter..." />
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
                  <p className="col-span-2 py-6 text-center text-sm text-gray-400">No repos match.</p>
                )}
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
              <p className="text-sm text-gray-500">Fetching repo details and generating bullet points...</p>
            </div>
          )}

          {step === "review" && draft && (
            <div className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
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
                <Button variant="secondary" onClick={() => setStep("picker")}>
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
