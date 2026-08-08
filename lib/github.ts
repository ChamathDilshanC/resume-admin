import { Octokit } from "@octokit/rest";
import type { ResumeData } from "./types";

const REPO_OWNER = process.env.RESUME_REPO_OWNER || "ChamathDilshanC";
// resume-core: pipeline code — PDF workflow dispatch + assets/ (profile photo, logo)
const REPO_NAME = process.env.RESUME_REPO_NAME || "resume-core";
// resume-data: private repo holding just resume.json (contact details, reference
// phone numbers) — kept out of the public resume-core repo
const DATA_REPO_NAME = process.env.RESUME_DATA_REPO_NAME || "resume-data";
const RESUME_PATH = "resume.json";
const PDF_WORKFLOW_FILE = "regenerate-pdf.yml";

function client(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

export async function fetchResumeJson(accessToken: string): Promise<{ data: ResumeData; sha: string }> {
  const octokit = client(accessToken);
  const response = await octokit.repos.getContent({
    owner: REPO_OWNER,
    repo: DATA_REPO_NAME,
    path: RESUME_PATH,
  });

  if (Array.isArray(response.data) || response.data.type !== "file") {
    throw new Error("resume.json is not a file");
  }

  const content = Buffer.from(response.data.content, "base64").toString("utf8");
  return { data: JSON.parse(content) as ResumeData, sha: response.data.sha };
}

export async function saveResumeJson(
  accessToken: string,
  data: ResumeData,
  previousSha: string,
  commitMessage: string
): Promise<void> {
  const octokit = client(accessToken);
  const content = Buffer.from(JSON.stringify(data, null, 2) + "\n", "utf8").toString("base64");

  await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: DATA_REPO_NAME,
    path: RESUME_PATH,
    message: commitMessage,
    content,
    sha: previousSha,
  });
}

export async function triggerPdfRegeneration(accessToken: string): Promise<void> {
  const octokit = client(accessToken);
  await octokit.actions.createWorkflowDispatch({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    workflow_id: PDF_WORKFLOW_FILE,
    ref: "main",
  });
}

const ASSET_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function extensionOf(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : "";
}

export async function uploadAsset(
  accessToken: string,
  assetPath: string,
  buffer: Buffer,
  commitMessage: string
): Promise<void> {
  const octokit = client(accessToken);

  let existingSha: string | undefined;
  try {
    const existing = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: assetPath,
    });
    if (!Array.isArray(existing.data) && existing.data.type === "file") {
      existingSha = existing.data.sha;
    }
  } catch {
    // File doesn't exist yet — that's fine, we'll create it.
  }

  await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: assetPath,
    message: commitMessage,
    content: buffer.toString("base64"),
    sha: existingSha,
  });
}

export async function fetchAsset(
  accessToken: string,
  assetPath: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const octokit = client(accessToken);
  const response = await octokit.repos.getContent({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: assetPath,
  });

  if (Array.isArray(response.data) || response.data.type !== "file") {
    throw new Error(`${assetPath} is not a file`);
  }

  const buffer = Buffer.from(response.data.content, "base64");
  const contentType = ASSET_MIME_TYPES[extensionOf(assetPath)] || "application/octet-stream";
  return { buffer, contentType };
}

export interface TemplateSummary {
  id: string;
  label: string;
  description: string;
}

export async function listTemplates(accessToken: string): Promise<TemplateSummary[]> {
  const octokit = client(accessToken);
  const response = await octokit.repos.getContent({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: "templates",
  });

  if (!Array.isArray(response.data)) {
    throw new Error("templates directory not found in resume-core");
  }

  const templates: TemplateSummary[] = [];
  for (const entry of response.data) {
    if (entry.type !== "dir") continue;
    let label = entry.name;
    let description = "";
    try {
      const meta = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: `templates/${entry.name}/meta.json`,
      });
      if (!Array.isArray(meta.data) && meta.data.type === "file") {
        const parsed = JSON.parse(Buffer.from(meta.data.content, "base64").toString("utf8"));
        label = parsed.label || entry.name;
        description = parsed.description || "";
      }
    } catch {
      // No meta.json — fall back to the directory name.
    }
    templates.push({ id: entry.name, label, description });
  }
  return templates;
}

export async function fetchTemplateFiles(
  accessToken: string,
  templateId: string
): Promise<{ templateHtml: string; stylesCss: string }> {
  const octokit = client(accessToken);

  const [templateRes, stylesRes] = await Promise.all([
    octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `templates/${templateId}/template.html`,
    }),
    octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `templates/${templateId}/styles.css`,
    }),
  ]);

  if (Array.isArray(templateRes.data) || Array.isArray(stylesRes.data)) {
    throw new Error(`Template "${templateId}" files not found`);
  }
  if (templateRes.data.type !== "file" || stylesRes.data.type !== "file") {
    throw new Error(`Template "${templateId}" files not found`);
  }
  return {
    templateHtml: Buffer.from(templateRes.data.content, "base64").toString("utf8"),
    stylesCss: Buffer.from(stylesRes.data.content, "base64").toString("utf8"),
  };
}

export { extensionOf, ASSET_MIME_TYPES };

export interface RepoSummary {
  name: string;
  description: string;
  url: string;
  private: boolean;
  updatedAt: string;
}

export async function listUserRepos(accessToken: string): Promise<RepoSummary[]> {
  const octokit = client(accessToken);
  const repos: RepoSummary[] = [];

  for (let page = 1; ; page++) {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      type: "owner",
      per_page: 100,
      page,
      sort: "updated",
    });
    for (const repo of data) {
      if (repo.fork || repo.archived) continue;
      repos.push({
        name: repo.name,
        description: repo.description || "",
        url: repo.html_url,
        private: repo.private,
        updatedAt: repo.updated_at || "",
      });
    }
    if (data.length < 100) break;
  }

  return repos;
}

function parseSubmoduleOwnerRepo(gitmodulesText: string): { owner: string; repo: string }[] {
  const urls = [...gitmodulesText.matchAll(/url\s*=\s*(\S+)/g)].map((m) => m[1]);
  return urls
    .map((url) => {
      const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/i);
      return match ? { owner: match[1], repo: match[2] } : null;
    })
    .filter((v): v is { owner: string; repo: string } => v !== null);
}

async function fetchLanguages(octokit: Octokit, owner: string, repo: string): Promise<string[]> {
  try {
    const { data } = await octokit.repos.listLanguages({ owner, repo });
    return Object.keys(data);
  } catch {
    return [];
  }
}

export async function fetchProjectTechStack(
  accessToken: string,
  owner: string,
  repo: string
): Promise<{ name: string; description: string; url: string; techStack: string }> {
  const octokit = client(accessToken);

  const { data: repoDetails } = await octokit.repos.get({ owner, repo });
  const languageSet = new Set(await fetchLanguages(octokit, owner, repo));

  try {
    const gitmodules = await octokit.repos.getContent({ owner, repo, path: ".gitmodules" });
    if (!Array.isArray(gitmodules.data) && gitmodules.data.type === "file") {
      const text = Buffer.from(gitmodules.data.content, "base64").toString("utf8");
      for (const sub of parseSubmoduleOwnerRepo(text)) {
        const subLanguages = await fetchLanguages(octokit, sub.owner, sub.repo);
        subLanguages.forEach((lang) => languageSet.add(lang));
      }
    }
  } catch {
    // No .gitmodules — not a meta-repo, that's fine.
  }

  return {
    name: repoDetails.name,
    description: repoDetails.description || "",
    url: repoDetails.html_url,
    techStack: [...languageSet].join(", "),
  };
}
