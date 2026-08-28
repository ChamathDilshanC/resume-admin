import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/google-drive-oauth";

// Deliberately outside NextAuth entirely — this only ever redirects to
// Google's own consent screen, never touches the app's session cookie.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
  return NextResponse.redirect(getGoogleAuthUrl(request.nextUrl.origin));
}
