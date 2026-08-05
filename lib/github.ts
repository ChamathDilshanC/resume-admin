import { Octokit } from "@octokit/rest";
import type { ResumeData } from "./types";

const REPO_OWNER = process.env.RESUME_REPO_OWNER || "ChamathDilshanC";
const REPO_NAME = process.env.RESUME_REPO_NAME || "resume-core";
const RESUME_PATH = "resume.json";
const PDF_WORKFLOW_FILE = "regenerate-pdf.yml";

function client(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

export async function fetchResumeJson(accessToken: string): Promise<{ data: ResumeData; sha: string }> {
  const octokit = client(accessToken);
  const response = await octokit.repos.getContent({
    owner: REPO_OWNER,
    repo: REPO_NAME,
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
    repo: REPO_NAME,
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
