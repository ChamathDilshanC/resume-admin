import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accountId = (session.user as { login?: string } | undefined)?.login || "ChamathDilshanC";
  const baseUrl = process.env.JOBMAIL_APP_URL;
  const sharedSecret = process.env.JOBMAIL_INTEGRATION_SECRET;
  if (!baseUrl || !sharedSecret) return NextResponse.json({ connected: false });

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/integrations/devresume/status?devresumeAccountId=${encodeURIComponent(accountId)}`, {
    headers: { Authorization: `Bearer ${sharedSecret}` },
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ connected: false });
  return NextResponse.json(await response.json());
}
