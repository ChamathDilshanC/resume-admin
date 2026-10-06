export interface ReadmeSource {
  repository: string;
  path: string;
  ref: string;
  depth: number;
  url: string;
  truncated: boolean;
}
export interface RepositoryResearch {
  fetchedAt: string;
  sources: ReadmeSource[];
  warnings: string[];
}
export interface RepositoryContext {
  root: { fullName: string; name: string; description: string; url: string; topics: string[] };
  documents: (ReadmeSource & { text: string })[];
  repositories: { repository: string; ref: string; depth: number; languages: string[] }[];
  warnings: string[];
}
export function collectRepositoryContext(options: {
  owner: string; repo: string; token?: string; fetchImpl?: typeof fetch;
  requireReady?: boolean; limits?: Record<string, number>;
}): Promise<RepositoryContext>;
export function researchSummary(context: RepositoryContext): RepositoryResearch;
