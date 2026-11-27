import { randomUUID } from "node:crypto";
import { Octokit } from "@octokit/rest";
import { unzipSync } from "fflate";

const WORKFLOW_FILE = "generate-jobmail-resume.yml";
const DEFAULT_OWNER = "ChamathDilshanC";
const DEFAULT_REPO = "resume-core";
const MAX_PDF_BYTES = 5 * 1024 * 1024;

export type JobmailResumeStatus =
  | { status: "queued"; progress: number }
  | { status: "generating"; progress: number }
  | { status: "ready"; progress: 100; resume: { fileName: string; mimeType: "application/pdf"; size: number; lastModified: string | null; data: string } }
  | { status: "failed"; progress: number; error: string };

function config() {
  const token = process.env.JOBMAIL_GITHUB_TOKEN;
  if (!token) throw new Error("JOBMAIL_GITHUB_TOKEN is not configured.");
  return {
    token,
    owner: process.env.RESUME_REPO_OWNER || DEFAULT_OWNER,
    repo: process.env.RESUME_REPO_NAME || DEFAULT_REPO,
  };
}

function client() {
  return new Octokit({ auth: config().token });
}

function workflowTitle(requestId: string) {
  return `JobMail tailored resume ${requestId}`;
}

function assertRequestId(requestId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    throw new Error("Invalid generation request.");
  }
}

export async function startJobmailResumeGeneration(input: {
  targetRole: string;
  targetCompany?: string;
  jobDescription?: string;
}): Promise<{ requestId: string }> {
  const requestId = randomUUID();
  const { owner, repo } = config();
  await client().actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: WORKFLOW_FILE,
    ref: "main",
    inputs: {
      request_id: requestId,
      target_role: input.targetRole,
      target_company: input.targetCompany || "",
      job_description: input.jobDescription || "",
    },
  });
  return { requestId };
}

async function findRun(requestId: string) {
  const { owner, repo } = config();
  const response = await client().actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: WORKFLOW_FILE,
    event: "workflow_dispatch",
    branch: "main",
    per_page: 25,
  });
  return response.data.workflow_runs.find((run) =>
    run.display_title === workflowTitle(requestId) || run.name === workflowTitle(requestId)
  );
}

async function artifactFile(artifactId: number, expectedName: string) {
  const { owner, repo } = config();
  const response = await client().actions.downloadArtifact({
    owner,
    repo,
    artifact_id: artifactId,
    archive_format: "zip",
  });
  const raw = response.data as unknown as ArrayBuffer | Buffer;
  const archive = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  const files = unzipSync(new Uint8Array(archive));
  const pdf = files["resume.pdf"];
  const name = files["resume-name.txt"];
  if (!pdf) throw new Error("Generated resume artifact is incomplete.");
  if (pdf.length === 0 || pdf.length > MAX_PDF_BYTES) {
    throw new Error("Generated resume artifact is invalid or too large.");
  }
  const fileName = name
    ? Buffer.from(name).toString("utf8").trim().replace(/[\r\n\\/:*?"<>|]/g, "")
    : expectedName;
  return {
    fileName: fileName.endsWith(".pdf") ? fileName : expectedName,
    mimeType: "application/pdf" as const,
    size: pdf.length,
    lastModified: null,
    data: Buffer.from(pdf).toString("base64"),
  };
}

export async function getJobmailResumeStatus(requestId: string): Promise<JobmailResumeStatus> {
  assertRequestId(requestId);
  const run = await findRun(requestId);
  if (!run) return { status: "queued", progress: 25 };

  if (run.status !== "completed") {
    return { status: "generating", progress: run.status === "queued" ? 35 : 65 };
  }
  if (run.conclusion !== "success") {
    return { status: "failed", progress: 0, error: "DevResume could not generate the tailored CV." };
  }

  const { owner, repo } = config();
  const artifacts = await client().actions.listWorkflowRunArtifacts({ owner, repo, run_id: run.id, per_page: 20 });
  const artifact = artifacts.data.artifacts.find((item) => item.name === `jobmail-resume-${requestId}` && !item.expired);
  if (!artifact) return { status: "generating", progress: 88 };

  try {
    const resume = await artifactFile(artifact.id, "DevResume.pdf");
    return {
      status: "ready",
      progress: 100,
      resume: { ...resume, lastModified: run.updated_at || run.created_at },
    };
  } catch (error) {
    return { status: "failed", progress: 0, error: error instanceof Error ? error.message : "Resume artifact could not be read." };
  }
}
