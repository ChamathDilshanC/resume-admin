import Link from "next/link";
import { Card } from "@/components/FormControls";
import { ProjectPipelineFlow } from "./ProjectPipelineFlow";

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-4 block text-xs font-semibold tracking-wide text-gray-400 uppercase">
      {children}
    </span>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">Adding a new project</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          How a GitHub repo goes from freshly pushed to a bullet point on the live resume,
          entirely through topics and Actions — no manual editing required once it&rsquo;s wired
          up.
        </p>

        <div className="mt-6">
          <Card>
            <CardLabel>Prerequisites (one-time, per repo)</CardLabel>
            <ol className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                  1
                </span>
                <span>
                  The repo has a <code className="rounded bg-gray-100 px-1">.gitmodules</code>{" "}
                  file &mdash; only meta-repos (submodule-based platform projects) get
                  auto-discovered.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                  2
                </span>
                <span>
                  The repo has its own <code className="rounded bg-gray-100 px-1">RESUME_CORE_PAT</code>{" "}
                  secret (Settings → Secrets and variables → Actions) &mdash; a fine-grained PAT
                  scoped to trigger <code className="rounded bg-gray-100 px-1">repository_dispatch</code>{" "}
                  on resume-core. Nothing fires without it.
                </span>
              </li>
            </ol>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardLabel>Flow</CardLabel>
            <ProjectPipelineFlow />
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardLabel>Permission gotchas (found the hard way)</CardLabel>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                <span>
                  Writing <code className="rounded bg-gray-100 px-1">.github/workflows/*.yml</code>{" "}
                  needs the <b className="text-gray-900">Workflows</b> permission on the PAT
                  &mdash; separate from Contents, which alone 403s.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                <span>
                  Adding/replacing topics needs <b className="text-gray-900">Administration: Read and write</b>.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                <span>
                  The PAT&rsquo;s &ldquo;Repository access&rdquo; list has to actually include
                  every repo it touches (or be set to &ldquo;All repositories&rdquo;) &mdash; a
                  repo left off that list 403s the same way, even with the right permissions.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                <span>
                  resume-core&rsquo;s own <code className="rounded bg-gray-100 px-1">RESUME_CORE_PAT</code>{" "}
                  (scans + tags + wires other repos) and each project repo&rsquo;s{" "}
                  <code className="rounded bg-gray-100 px-1">RESUME_CORE_PAT</code> (just fires
                  the dispatch back) do different jobs &mdash; same secret name by convention,
                  different required scope.
                </span>
              </li>
            </ul>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardLabel>Quick checklist for a brand-new project</CardLabel>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                "Repo has .gitmodules",
                "Repo has a RESUME_CORE_PAT secret",
                "resume-project topic + notify-resume.yml present (auto, or run Discover Untracked Projects manually)",
                "Push to main/master",
                "Add the resume-ready topic once it's presentable",
                "Push again — it shows up in resume.json and the regenerated PDF",
              ].map((step) => (
                <li key={step} className="flex items-start gap-2.5">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-gray-300" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
