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

export interface ProjectItem {
  name: string;
  description: string;
  highlights: string[];
  links: ProjectLink[];
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
  basics: ResumeBasics;
  work: WorkItem[];
  skills: SkillItem[];
  projects: ProjectItem[];
  certificates: CertificateItem[];
  education: EducationItem[];
  references: ReferenceItem[];
}
