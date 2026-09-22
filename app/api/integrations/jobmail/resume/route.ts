import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { downloadResumePdf } from "@/lib/google-drive";

export const runtime = "nodejs";

function hasValidIntegrationSecret(request: NextRequest): boolean {
  const configuredSecret = process.env.JOBMAIL_INTEGRATION_SECRET;
  const suppliedSecret =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-jobmail-integration-secret");

  if (!configuredSecret || !suppliedSecret) return false;
  const configured = Buffer.from(configuredSecret);
  const supplied = Buffer.from(suppliedSecret);
  return (
    configured.length === supplied.length &&
    timingSafeEqual(configured, supplied)
  );
}

/**
 * Server-to-server endpoint for JobMail. It returns only the current PDF
 * bytes and cache metadata; Drive credentials and OAuth tokens never leave
 * this server.
 */
export async function GET(request: NextRequest) {
  if (!hasValidIntegrationSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileId = process.env.GDRIVE_FILE_ID;
  if (!fileId) {
    return NextResponse.json({ error: "Resume file is not configured" }, { status: 503 });
  }

  try {
    const { buffer, name, mimeType, modifiedTime } = await downloadResumePdf(fileId);
    const headers = new Headers({
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${name.replace(/["\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
    });
    if (modifiedTime) headers.set("Last-Modified", new Date(modifiedTime).toUTCString());
    return new NextResponse(buffer as unknown as BodyInit, { headers });
  } catch {
    return NextResponse.json({ error: "Resume PDF unavailable" }, { status: 404 });
  }
}
