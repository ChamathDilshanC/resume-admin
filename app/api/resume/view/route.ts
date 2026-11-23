import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { downloadResumePdf } from "@/lib/google-drive";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fileId = process.env.GDRIVE_FILE_ID;
  if (!fileId) return NextResponse.json({ error: "Resume file is not configured" }, { status: 503 });

  try {
    const { buffer, mimeType, modifiedTime } = await downloadResumePdf(fileId);
    const headers = new Headers({
      "Content-Type": mimeType,
      "Content-Disposition": 'inline; filename="CHAMATH DILSHAN - Resume.pdf"',
      "Cache-Control": "private, no-store",
    });
    if (modifiedTime) headers.set("Last-Modified", new Date(modifiedTime).toUTCString());
    return new NextResponse(buffer as unknown as BodyInit, { headers });
  } catch (error) {
    console.error("Resume viewer PDF retrieval failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Resume PDF unavailable" }, { status: 502 });
  }
}
