import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getJobmailResumeStatus,
  startJobmailResumeGeneration,
} from "@/lib/jobmailResumeGeneration";

export const runtime = "nodejs";

const MAX_ROLE_LENGTH = 120;
const MAX_COMPANY_LENGTH = 160;
const MAX_JOB_DESCRIPTION_LENGTH = 12_000;
const ACCOUNT_ID = process.env.ALLOWED_GITHUB_USERNAME || "ChamathDilshanC";

function validSecret(request: NextRequest) {
  const configured = process.env.JOBMAIL_INTEGRATION_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-jobmail-integration-secret");
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function accountIsValid(request: NextRequest, accountId: string | null | undefined) {
  return validSecret(request) && accountId === ACCOUNT_ID;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!accountIsValid(request, typeof body.accountId === "string" ? body.accountId : null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetRole = cleanText(body.targetRole, MAX_ROLE_LENGTH);
  const targetCompany = cleanText(body.targetCompany, MAX_COMPANY_LENGTH);
  const jobDescription = cleanText(body.jobDescription, MAX_JOB_DESCRIPTION_LENGTH);
  if (!targetRole) return NextResponse.json({ error: "Target role is required." }, { status: 400 });

  try {
    const result = await startJobmailResumeGeneration({ targetRole, targetCompany, jobDescription });
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    console.error("JobMail DevResume generation start failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Unable to start DevResume generation." }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const requestId = params.get("requestId");
  const accountId = params.get("accountId");
  if (!requestId || !accountIsValid(request, accountId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getJobmailResumeStatus(requestId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("JobMail DevResume generation status failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Unable to read DevResume generation status." }, { status: 502 });
  }
}
