"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gooeyToast } from "goey-toast";
import type { ResumeData } from "@/lib/types";
import { Button } from "@/components/FormControls";
import {
  UserIcon,
  BriefcaseIcon,
  FolderIcon,
  SparkleIcon,
  AcademicCapIcon,
  BadgeCheckIcon,
  UsersIcon,
} from "@/components/icons";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar-01/app-sidebar";
import type { ResumeNavItem } from "@/components/sidebar-01/types";
import { saveResume } from "./actions";
import { BasicsSection } from "./sections/BasicsSection";
import { WorkSection } from "./sections/WorkSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { SkillsSection } from "./sections/SkillsSection";
import { EducationSection } from "./sections/EducationSection";
import { CertificatesSection } from "./sections/CertificatesSection";
import { ReferencesSection } from "./sections/ReferencesSection";

type Tab =
  | "basics"
  | "work"
  | "projects"
  | "skills"
  | "education"
  | "certificates"
  | "references";

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
};

export function ResumeEditor({ initialData }: { initialData: ResumeData }) {
  const [data, setData] = useState<ResumeData>(initialData);
  const [activeTab, setActiveTab] = useState<Tab>("basics");
  const [isPending, startTransition] = useTransition();

  const navItems = buildNavItems(data);

  function handleSave() {
    startTransition(async () => {
      const result = await saveResume(data);
      if (result.ok) {
        gooeyToast.success("Saved", {
          description: "resume.json committed — PDF is regenerating.",
        });
      } else {
        gooeyToast.error("Save failed", { description: result.error });
      }
    });
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
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white"
                />
                Saving
              </span>
            ) : (
              "Save & Regenerate PDF"
            )}
          </Button>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {activeTab === "basics" && (
                  <BasicsSection basics={data.basics} onChange={(basics) => setData({ ...data, basics })} />
                )}
                {activeTab === "work" && (
                  <WorkSection items={data.work} onChange={(work) => setData({ ...data, work })} />
                )}
                {activeTab === "projects" && (
                  <ProjectsSection
                    items={data.projects}
                    onChange={(projects) => setData({ ...data, projects })}
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
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
