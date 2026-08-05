"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import type { ResumeData } from "@/lib/types";
import { Button, CountBadge } from "@/components/FormControls";
import {
  UserIcon,
  BriefcaseIcon,
  FolderIcon,
  SparkleIcon,
  AcademicCapIcon,
  BadgeCheckIcon,
  UsersIcon,
  LogoutIcon,
  CheckCircleIcon,
  AlertIcon,
} from "@/components/icons";
import { saveResume } from "./actions";
import { BasicsSection } from "./sections/BasicsSection";
import { WorkSection } from "./sections/WorkSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { SkillsSection } from "./sections/SkillsSection";
import { EducationSection } from "./sections/EducationSection";
import { CertificatesSection } from "./sections/CertificatesSection";
import { ReferencesSection } from "./sections/ReferencesSection";

type Tab =
  | "Basics"
  | "Work Experience"
  | "Projects"
  | "Skills"
  | "Education"
  | "Certificates"
  | "References";

function useTabs(data: ResumeData) {
  return [
    { key: "Basics" as Tab, icon: UserIcon, color: "slate", count: null },
    { key: "Work Experience" as Tab, icon: BriefcaseIcon, color: "violet", count: data.work.length },
    { key: "Projects" as Tab, icon: FolderIcon, color: "teal", count: data.projects.length },
    { key: "Skills" as Tab, icon: SparkleIcon, color: "amber", count: data.skills.length },
    { key: "Education" as Tab, icon: AcademicCapIcon, color: "sky", count: data.education.length },
    { key: "Certificates" as Tab, icon: BadgeCheckIcon, color: "rose", count: data.certificates.length },
    { key: "References" as Tab, icon: UsersIcon, color: "emerald", count: data.references.length },
  ];
}

export function ResumeEditor({ initialData }: { initialData: ResumeData }) {
  const [data, setData] = useState<ResumeData>(initialData);
  const [activeTab, setActiveTab] = useState<Tab>("Basics");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const tabs = useTabs(data);

  function handleSave() {
    setToast(null);
    startTransition(async () => {
      const result = await saveResume(data);
      if (result.ok) {
        setToast({ type: "success", message: "Saved — PDF is regenerating." });
      } else {
        setToast({ type: "error", message: result.error });
      }
      setTimeout(() => setToast(null), 5000);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200/70 bg-white/80 px-6 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
              R
            </div>
            <h1 className="text-base font-bold text-gray-900">Resume Admin</h1>
          </div>
          <div className="flex items-center gap-3">
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
            <button
              onClick={() => signOut({ callbackUrl: "/signin" })}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
              title="Sign out"
            >
              <LogoutIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        <nav className="w-56 shrink-0">
          <div className="space-y-1 rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors"
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-accent"
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-[18px] w-[18px] shrink-0 ${
                      isActive ? "text-white" : "text-gray-400"
                    }`}
                  />
                  <span className={`relative z-10 flex-1 ${isActive ? "text-white" : "text-gray-700"}`}>
                    {tab.key}
                  </span>
                  {tab.count !== null && (
                    <span className="relative z-10">
                      {isActive ? (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
                          {tab.count}
                        </span>
                      ) : (
                        <CountBadge count={tab.count} color={tab.color} />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <main className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {activeTab === "Basics" && (
                <BasicsSection basics={data.basics} onChange={(basics) => setData({ ...data, basics })} />
              )}
              {activeTab === "Work Experience" && (
                <WorkSection items={data.work} onChange={(work) => setData({ ...data, work })} />
              )}
              {activeTab === "Projects" && (
                <ProjectsSection
                  items={data.projects}
                  onChange={(projects) => setData({ ...data, projects })}
                />
              )}
              {activeTab === "Skills" && (
                <SkillsSection items={data.skills} onChange={(skills) => setData({ ...data, skills })} />
              )}
              {activeTab === "Education" && (
                <EducationSection
                  items={data.education}
                  onChange={(education) => setData({ ...data, education })}
                />
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
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className={`fixed bottom-6 right-6 z-30 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircleIcon className="h-[18px] w-[18px] shrink-0" />
            ) : (
              <AlertIcon className="h-[18px] w-[18px] shrink-0" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
