import type { RepositoryResearch } from "./repository-context.cjs";

export interface ResumeBasics {
  name: string;
  label: string;
  image: string;
  email: string;
  phone: string;
  url: string;
  summary: string;
  location: {
    address: string;
    postalCode: string;
    city: string;
    countryCode: string;
    region: string;
  };
  profiles: { network: string; username: string; url: string }[];
  targetCompany?: string;
  hideDeclaration?: boolean;
  /** Used to prioritize supported evidence in AI drafts; never printed. */
  jobDescription?: string;
  includeReferences?: boolean;
}

export interface WorkItem {
  name: string;
  position: string;
  url: string;
  startDate: string;
  endDate: string;
  summary: string;
  highlights: string[];
}

export interface ProjectLink {
  label: string;
  url: string;
}

export type MockupCategory = "mockups" | "screenshots" | "assets" | "animations";

export interface ProjectMockup {
  /** Same value as googleDriveFileId — stable identity for React keys/reorder. */
  id: string;
  googleDriveFileId: string;
  fileName: string;
  mimeType: string;
  webViewLink: string;
  thumbnailLink: string;
  category: MockupCategory;
  enabled: boolean;
  featured: boolean;
  displayOrder: number;
  caption: string;
  /** True once a sync no longer finds this file in Drive; kept (not deleted) so its state can resume if the file comes back. */
  missing: boolean;
  lastSyncedAt: string;
}

export interface ProjectDriveFolder {
  folderId: string;
  webViewLink: string;
  mockupsFolderId: string;
  screenshotsFolderId: string;
  assetsFolderId: string;
  animationsFolderId: string;
  createdAt: string;
  lastSyncedAt: string;
}

/** Submodules default to belonging to their parent's project record rather than becoming a standalone one. */
export type RepositoryType = "MAIN" | "SUBMODULE";

export interface ProjectEvidence {
  problem?: string;
  contribution?: string;
  result?: string;
  aiUsage?: string;
}

export interface WritingTarget {
  targetRole?: string;
  jobDescription?: string;
}

export interface ProjectItem {
  name: string;
  description: string;
  highlights: string[];
  links: ProjectLink[];
  role?: string;
  startDate?: string;
  endDate?: string;
  technologies?: string[];
  /** Drafting notes; excluded from the rendered CV. */
  evidence?: ProjectEvidence;
  /** Defaults to true. Hidden projects stay saved for other applications. */
  includeInResume?: boolean;
  /** Sources and collection gaps for review; raw README text is never saved in resume.json. */
  repositoryResearch?: RepositoryResearch;
  /** "owner/repo" — the stable identifier used to match this project to a GitHub repo and its Drive folder. Unset for hand-created ("Blank project") entries. */
  repoFullName?: string;
  repositoryType?: RepositoryType;
  parentRepoFullName?: string | null;
  driveFolder?: ProjectDriveFolder;
  mockups?: ProjectMockup[];
}

export interface SkillItem {
  name: string;
  level: string;
  keywords: string[];
}

export interface EducationItem {
  institution: string;
  url: string;
  area: string;
  studyType: string;
  startDate: string;
  endDate: string;
  score: string;
  courses: string[];
}

export interface CertificateItem {
  name: string;
  date: string;
  issuer: string;
  url: string;
}

export interface ReferenceItem {
  name: string;
  reference: string;
}

export interface ResumeData {
  template?: string;
  basics: ResumeBasics;
  work: WorkItem[];
  skills: SkillItem[];
  projects: ProjectItem[];
  certificates: CertificateItem[];
  education: EducationItem[];
  references: ReferenceItem[];
}
