import type { ProjectLink } from "./types";

const GITHUB_URL_PATTERN = /github\.com[:/]([^/\s]+)\/([^/\s#?]+?)(?:\.git)?\/?(?:[#?].*)?$/i;

// Projects created before repoFullName existed (or hand-edited "Blank
// project" entries) have no stable repo link stored — but almost always
// already carry a GitHub URL in their links array (that's how the pipeline
// and "Import from GitHub" have always populated links). Recover
// "owner/repo" from that instead of forcing a re-import.
export function deriveRepoFullNameFromLinks(links: ProjectLink[]): string | null {
  for (const link of links) {
    const match = link.url?.match(GITHUB_URL_PATTERN);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
  }
  return null;
}
