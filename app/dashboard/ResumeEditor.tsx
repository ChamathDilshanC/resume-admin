"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gooeyToast } from "goey-toast";
import type { ResumeData, ProjectItem } from "@/lib/types";
import { Button } from "@/components/FormControls";
import {
  UserIcon,
  BriefcaseIcon,
  FolderIcon,
  SparkleIcon,
  AcademicCapIcon,
  BadgeCheckIcon,
  UsersIcon,
  TemplateIcon,
} from "@/components/icons";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar-01/app-sidebar";
import type { ResumeNavItem } from "@/components/sidebar-01/types";
import { saveResume, regeneratePdfAction } from "./actions";
import { BasicsSection } from "./sections/BasicsSection";
import { WorkSection } from "./sections/WorkSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { SkillsSection } from "./sections/SkillsSection";
import { EducationSection } from "./sections/EducationSection";
import { CertificatesSection } from "./sections/CertificatesSection";
import { ReferencesSection } from "./sections/ReferencesSection";
import { TemplatesSection } from "./sections/TemplatesSection";
import { Link2 } from "lucide-react";
import { OtpInput } from "@/components/ui/otp-input";

type Tab =
  | "basics"
  | "work"
  | "projects"
  | "skills"
  | "education"
  | "certificates"
  | "references"
  | "templates"
  | "jobmail";

function buildNavItems(data: ResumeData): ResumeNavItem[] {
  return [
    { id: "basics", title: "Basics", icon: UserIcon, color: "slate", count: null },
    { id: "work", title: "Work Experience", icon: BriefcaseIcon, color: "violet", count: data.work.length },
    { id: "projects", title: "Projects", icon: FolderIcon, color: "teal", count: data.projects.length },
    { id: "skills", title: "Skills", icon: SparkleIcon, color: "amber", count: data.skills.length },
    { id: "education", title: "Education", icon: AcademicCapIcon, color: "sky", count: data.education.length },
    {
      id: "certificates",
      title: "Certificates",
      icon: BadgeCheckIcon,
      color: "rose",
      count: data.certificates.length,
    },
    { id: "references", title: "References", icon: UsersIcon, color: "emerald", count: data.references.length },
    { id: "templates", title: "Templates", icon: TemplateIcon, color: "teal", count: null },
    { id: "jobmail", title: "Connect JobMail", icon: Link2, color: "violet", count: null },
  ];
}

const TAB_TITLES: Record<Tab, string> = {
  basics: "Basics",
  work: "Work Experience",
  projects: "Projects",
  skills: "Skills",
  education: "Education",
  certificates: "Certificates",
  references: "References",
  templates: "Templates",
  jobmail: "Connect JobMail",
};

function JobMailConnection() {
  const [code, setCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadConnection() {
    setLoading(true);
    setError("");
    try {
      const [connectionResponse, statusResponse] = await Promise.all([
        fetch("/api/integrations/jobmail/connect"),
        fetch("/api/integrations/jobmail/status"),
      ]);
      const connection = await connectionResponse.json().catch(() => ({}));
      const status = await statusResponse.json().catch(() => ({}));
      if (!connectionResponse.ok) {
        throw new Error(connection.error || "Unable to generate a connection code.");
      }
      if (!statusResponse.ok) {
        throw new Error(status.error || "Unable to load connection status.");
      }
      setCode(typeof connection.code === "string" ? connection.code : "");
      setConnected(status.connected === true);
    } catch (connectionError) {
      setCode("");
      setError(connectionError instanceof Error ? connectionError.message : "Unable to generate a connection code.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConnection();
  }, []);

  return (
    <section className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <Link2 className="mt-1 h-5 w-5 text-violet-600" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Connect JobMail</h2>
          <p className="mt-1 text-sm text-gray-600">
            Paste this temporary code into JobMail to connect your one JobMail account.
          </p>
        </div>
      </div>
      <div className={`mb-5 rounded-lg px-3 py-2 text-sm ${connected ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-600"}`}>
        {connected ? "Connected to JobMail" : "Not connected"}
      </div>
      {loading ? <p className="text-sm text-gray-500">Generating secure code…</p> : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <p>{error}</p>
          <button type="button" onClick={() => void loadConnection()} className="mt-3 rounded-md bg-rose-700 px-3 py-1.5 text-xs font-medium text-white">
            Generate new code
          </button>
        </div>
      ) : (
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">Connection code (expires in 10 minutes)</label>
          <OtpInput value={code} length={6} onChange={() => undefined} aria-label="JobMail connection code" status="success" size="md" />
          <p className="mt-3 text-xs text-gray-500">Enter these 6 digits in JobMail Profile → Connect DevResume.</p>
          <button type="button" onClick={() => void loadConnection()} className="mt-3 text-xs font-medium text-violet-700 hover:underline">
            Generate a new code
          </button>
        </div>
      )}
    </section>
  );
}

export function ResumeEditor({ initialData }: { initialData: ResumeData }) {
  const [data, setData] = useState<ResumeData>(initialData);
  const [activeTab, setActiveTab] = useState<Tab>("basics");
  const [isPending, startTransition] = useTransition();

  const navItems = buildNavItems(data);

  // Warn before a refresh/close would silently drop unsaved edits.
  const savedSnapshot = useRef(JSON.stringify(initialData));
  // Last successfully saved data. saveResume compares against this (not the
  // page-load copy) to decide which sections this tab changed, so editing a
  // section and then reverting it after a save still counts as a change.
  const baseline = useRef(initialData);
  const latestData = useRef(data);
  latestData.current = data;
  const saving = useRef(false);
  const failedSnapshot = useRef<string | null>(null);
  const [saveTick, setSaveTick] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [autoSave, setAutoSave] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("resume-admin-autosave") === "off") setAutoSave(false);
    } catch {
      // Storage unavailable: keep the default.
    }
  }, []);

  function toggleAutoSave(next: boolean) {
    setAutoSave(next);
    try {
      localStorage.setItem("resume-admin-autosave", next ? "on" : "off");
    } catch {
      // Preference just will not persist.
    }
  }

  useEffect(() => {
    function warnIfUnsaved(event: BeforeUnloadEvent) {
      if (JSON.stringify(latestData.current) !== savedSnapshot.current) event.preventDefault();
    }
    window.addEventListener("beforeunload", warnIfUnsaved);
    return () => window.removeEventListener("beforeunload", warnIfUnsaved);
  }, []);

  async function saveNow(
    nextData: ResumeData,
    options: { regeneratePdf?: boolean; silent?: boolean } = {}
  ): Promise<boolean> {
    const { regeneratePdf = true, silent = false } = options;
    saving.current = true;
    setSaveState("saving");
    try {
      const result = await saveResume(nextData, baseline.current, { regeneratePdf });
      if (result.ok) {
        savedSnapshot.current = JSON.stringify(nextData);
        baseline.current = nextData;
        failedSnapshot.current = null;
        setSaveState("saved");
        if (!silent) {
          gooeyToast.success("Saved", {
            description: regeneratePdf ? "resume.json committed — PDF is regenerating." : "resume.json committed.",
          });
        }
        return true;
      }
      failedSnapshot.current = JSON.stringify(nextData);
      setSaveState("error");
      gooeyToast.error("Save failed", { description: result.error });
      return false;
    } catch {
      failedSnapshot.current = JSON.stringify(nextData);
      setSaveState("error");
      gooeyToast.error("Save failed", { description: "Could not reach the server. Your edits are still here." });
      return false;
    } finally {
      saving.current = false;
      setSaveTick((tick) => tick + 1);
    }
  }

  // Auto-save: commit shortly after the last edit (no PDF run). A failed
  // snapshot is not retried until the data changes again, so an error cannot
  // turn into a retry loop.
  useEffect(() => {
    if (!autoSave || saving.current) return;
    const snapshot = JSON.stringify(data);
    if (snapshot === savedSnapshot.current || snapshot === failedSnapshot.current) return;
    const timer = setTimeout(() => {
      if (!saving.current) void saveNow(latestData.current, { regeneratePdf: false, silent: true });
    }, 2000);
    return () => clearTimeout(timer);
    // saveNow only reads refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, autoSave, saveTick]);

  function handleSave() {
    startTransition(async () => {
      await saveNow(data, { regeneratePdf: false });
    });
  }

  // The PDF is built from resume.json on GitHub, so unsaved edits are saved
  // first; otherwise the PDF would come out from stale content.
  async function handleRegeneratePdf() {
    setPdfBusy(true);
    try {
      if (JSON.stringify(latestData.current) !== savedSnapshot.current) {
        if (!(await saveNow(latestData.current, { regeneratePdf: false, silent: true }))) return;
      }
      const result = await regeneratePdfAction();
      if (result.ok) {
        gooeyToast.success("PDF is regenerating", { description: "resume.json is saved; the new PDF will be ready shortly." });
      } else {
        gooeyToast.error("Could not start PDF regeneration", { description: result.error });
      }
    } finally {
      setPdfBusy(false);
    }
  }

  // Drive sync reads resume.json as it exists on GitHub — an unsaved local
  // edit (e.g. a just-imported project) is invisible to it. Building the
  // patched data explicitly here (rather than calling onChange + saveNow
  // separately) avoids racing React's async state update: the save always
  // includes the patch, even though setData's effect hasn't landed yet.
  async function saveProjectPatch(index: number, patch: Partial<ProjectItem>): Promise<boolean> {
    const nextProjects = [...data.projects];
    nextProjects[index] = { ...nextProjects[index], ...patch };
    const nextData = { ...data, projects: nextProjects };
    setData(nextData);
    // This save exists purely to make sure resume-core's sync workflow has
    // something to read — it isn't a content edit the rendered PDF needs to
    // reflect, so don't fire off (and queue behind) a PDF regeneration too.
    return saveNow(nextData, { regeneratePdf: false });
  }

  // An imported project must survive a refresh without needing the
  // "Save & Regenerate PDF" click, so it is committed right away. No PDF run:
  // the user's explicit save still does that.
  async function persistProjects(projects: ProjectItem[]): Promise<boolean> {
    const nextData = { ...data, projects };
    setData(nextData);
    return saveNow(nextData, { regeneratePdf: false });
  }

  return (
    <SidebarProvider>
      <AppSidebar
        activeId={activeTab}
        items={navItems}
        onSelect={(id) => setActiveTab(id as Tab)}
      />
      <SidebarInset className="bg-gray-50">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200/70 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-base font-bold text-gray-900">{TAB_TITLES[activeTab]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-gray-500 sm:inline" aria-live="polite">
              {saveState === "saving" ? "Saving..." : saveState === "saved" ? "All changes saved" : saveState === "error" ? "Save failed" : ""}
            </span>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-600">
              <input type="checkbox" checked={autoSave} onChange={(event) => toggleAutoSave(event.target.checked)} />
              Auto-save
            </label>
            <Button variant="secondary" onClick={handleSave} disabled={isPending || saveState === "saving"}>
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button onClick={handleRegeneratePdf} disabled={pdfBusy || saveState === "saving"}>
              {pdfBusy ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white"
                  />
                  Working
                </span>
              ) : (
                "Regenerate PDF"
              )}
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {activeTab === "basics" && (
                  <BasicsSection
                    basics={data.basics}
                    onChange={(basics) => setData({ ...data, basics })}
                    resumeData={data}
                  />
                )}
                {activeTab === "work" && (
                  <WorkSection
                    items={data.work}
                    onChange={(work) => setData({ ...data, work })}
                    resumeData={data}
                  />
                )}
                {activeTab === "projects" && (
                  <ProjectsSection
                    target={{ targetRole: data.basics.label, jobDescription: data.basics.jobDescription }}
                    items={data.projects}
                    onChange={(projects) => setData({ ...data, projects })}
                    onSaveProjectPatch={saveProjectPatch}
                    onPersistProjects={persistProjects}
                  />
                )}
                {activeTab === "skills" && (
                  <SkillsSection items={data.skills} onChange={(skills) => setData({ ...data, skills })} />
                )}
                {activeTab === "education" && (
                  <EducationSection
                    items={data.education}
                    onChange={(education) => setData({ ...data, education })}
                  />
                )}
                {activeTab === "certificates" && (
                  <CertificatesSection
                    items={data.certificates}
                    onChange={(certificates) => setData({ ...data, certificates })}
                  />
                )}
                {activeTab === "references" && (
                  <ReferencesSection
                    items={data.references}
                    onChange={(references) => setData({ ...data, references })}
                  />
                )}
                {activeTab === "templates" && (
                  <TemplatesSection
                    activeTemplate={data.template || "default"}
                    data={data}
                    onSelect={(templateId) => setData({ ...data, template: templateId })}
                  />
                )}
                {activeTab === "jobmail" && <JobMailConnection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
