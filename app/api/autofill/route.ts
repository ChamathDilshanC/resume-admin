import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchProjectTechStack } from "@/lib/github";
import { suggestProjectEvidence } from "@/lib/ai";

// README collection (up to 45s) plus the AI call outlive the host default limit.
export const maxDuration = 60;

interface SessionWithToken {
  accessToken?: string;
}

// Streams newline-delimited JSON so the dialog can show real stage progress:
// {"stage":"readme"} -> {"stage":"ai"} -> {"done":true,"suggestion":...} | {"error":"..."}
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as unknown as SessionWithToken | null)?.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const repoName = typeof body?.repoName === "string" ? body.repoName : "";
  if (!repoName) {
    return NextResponse.json({ error: "Missing repository name" }, { status: 400 });
  }
  const owner = process.env.ALLOWED_GITHUB_USERNAME || "ChamathDilshanC";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        send({ stage: "readme" });
        const { context } = await fetchProjectTechStack(accessToken, owner, repoName);
        send({ stage: "ai" });
        const suggestion = await suggestProjectEvidence(context);
        send({ done: true, suggestion });
      } catch (error) {
        send({ error: error instanceof Error ? error.message : "Could not auto-fill from this repository" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
