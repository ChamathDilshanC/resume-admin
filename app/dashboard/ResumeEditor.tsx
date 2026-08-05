"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import type { ResumeData } from "@/lib/types";
import { Button } from "@/components/FormControls";
import { saveResume } from "./actions";
import { BasicsSection } from "./sections/BasicsSection";
import { WorkSection } from "./sections/WorkSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { SkillsSection } from "./sections/SkillsSection";
import { EducationSection } from "./sections/EducationSection";
import { CertificatesSection } from "./sections/CertificatesSection";
import { ReferencesSection } from "./sections/ReferencesSection";

const TABS = [
  "Basics",
  "Work Experience",
  "Projects",
  "Skills",
  "Education",
  "Certificates",
  "References",
] as const;

type Tab = (typeof TABS)[number];

export function ResumeEditor({ initialData }: { initialData: ResumeData }) {
  const [data, setData] = useState<ResumeData>(initialData);
  const [activeTab, setActiveTab] = useState<Tab>("Basics");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function handleSave() {
    setStatus(null);
    startTransition(async () => {
      const result = await saveResume(data);
      if (result.ok) {
        setStatus({
          type: "success",
          message: "Saved to resume-core and triggered PDF regeneration.",
        });
      } else {
        setStatus({ type: "error", message: result.error });
      }
    });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-lg font-bold text-gray-900">Resume Admin</h1>
        <div className="flex items-center gap-3">
          {status && (
            <span className={`text-sm ${status.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {status.message}
            </span>
          )}
          <Button onClick={handleSave}>{isPending ? "Saving..." : "Save & Regenerate PDF"}</Button>
          <Button variant="secondary" onClick={() => signOut({ callbackUrl: "/signin" })}>
            Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-6">
        <nav className="w-48 shrink-0 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium ${
                activeTab === tab ? "bg-accent text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <main className="flex-1">
          {activeTab === "Basics" && (
            <BasicsSection basics={data.basics} onChange={(basics) => setData({ ...data, basics })} />
          )}
          {activeTab === "Work Experience" && (
            <WorkSection items={data.work} onChange={(work) => setData({ ...data, work })} />
          )}
          {activeTab === "Projects" && (
            <ProjectsSection items={data.projects} onChange={(projects) => setData({ ...data, projects })} />
          )}
          {activeTab === "Skills" && (
            <SkillsSection items={data.skills} onChange={(skills) => setData({ ...data, skills })} />
          )}
          {activeTab === "Education" && (
            <EducationSection items={data.education} onChange={(education) => setData({ ...data, education })} />
          )}
          {activeTab === "Certificates" && (
            <CertificatesSection
              items={data.certificates}
              onChange={(certificates) => setData({ ...data, certificates })}
            />
          )}
          {activeTab === "References" && (
            <ReferencesSection
              items={data.references}
              onChange={(references) => setData({ ...data, references })}
            />
          )}
        </main>
      </div>
    </div>
  );
}
