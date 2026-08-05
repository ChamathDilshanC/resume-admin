import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchAsset } from "@/lib/github";

interface SessionWithToken {
  accessToken?: string;
}

// Proxies files from the private resume-core repo so <img> tags in the
// dashboard can display them without exposing the OAuth token to the client.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as unknown as SessionWithToken | null)?.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const assetPath = request.nextUrl.searchParams.get("path");
  if (!assetPath || assetPath.startsWith("http") || assetPath.includes("..")) {
    return NextResponse.json({ error: "Invalid asset path" }, { status: 400 });
  }

  try {
    const { buffer, contentType } = await fetchAsset(accessToken, assetPath);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}
