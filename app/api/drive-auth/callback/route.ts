import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeCodeForRefreshToken } from "@/lib/google-drive-oauth";
import { encrypt } from "@/lib/crypto";

const COOKIE_NAME = "google_drive_refresh_token";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const redirectTo = new URL("/dashboard/drive", request.url);
  const code = request.nextUrl.searchParams.get("code");
  const errorParam = request.nextUrl.searchParams.get("error");

  if (errorParam || !code) {
    redirectTo.searchParams.set("drive_error", errorParam || "missing_code");
    return NextResponse.redirect(redirectTo);
  }

  try {
    const { refreshToken, email } = await exchangeCodeForRefreshToken(code);
    const allowedEmail = process.env.ALLOWED_GOOGLE_EMAIL;

    if (!allowedEmail || email !== allowedEmail) {
      redirectTo.searchParams.set("drive_error", "not_allowed");
      return NextResponse.redirect(redirectTo);
    }

    const response = NextResponse.redirect(redirectTo);
    response.cookies.set(COOKIE_NAME, encrypt(refreshToken), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180, // 180 days
    });
    return response;
  } catch (error) {
    console.error("Google Drive OAuth callback failed:", error);
    redirectTo.searchParams.set("drive_error", "exchange_failed");
    return NextResponse.redirect(redirectTo);
  }
}
