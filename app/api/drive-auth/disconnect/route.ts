import { type NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "google_drive_refresh_token";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/dashboard/drive", request.url));
  response.cookies.delete(COOKIE_NAME);
  return response;
}
