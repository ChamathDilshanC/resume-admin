import { google } from "googleapis";

const CALLBACK_PATH = "/api/drive-auth/callback";
const DRIVE_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/drive"];

// redirectUri must byte-for-byte match what's registered in Google Cloud
// Console, or Google rejects with redirect_uri_mismatch. Deriving it from
// NEXTAUTH_URL is fragile — that var can be unset/stale on Vercel without
// breaking NextAuth itself (it resolves callback URLs from the request's
// own host in most cases), so a mismatch here can go unnoticed until this
// flow is actually used. The route handlers instead pass the real
// request's origin (request.nextUrl.origin), which can't drift.
function getOAuthClient(redirectUri: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET,
    redirectUri
  );
}

export function getGoogleAuthUrl(origin: string): string {
  const client = getOAuthClient(`${origin}${CALLBACK_PATH}`);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: DRIVE_SCOPES,
  });
}

export async function exchangeCodeForRefreshToken(
  code: string,
  origin: string
): Promise<{ refreshToken: string; email: string | null }> {
  const client = getOAuthClient(`${origin}${CALLBACK_PATH}`);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google didn't return a refresh token. If you've connected before, disconnect first, then reconnect."
    );
  }
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  return { refreshToken: tokens.refresh_token, email: data.email ?? null };
}

// Exchanges a stored refresh token for a fresh short-lived access token,
// used right before an upload — never persisted, only handed to the Drive
// client for that one request. Google's token endpoint doesn't validate
// redirect_uri for this grant type, so an arbitrary well-formed one is
// fine here — there's no incoming request to derive it from (this runs
// from a Server Action, not a route handler).
export async function getFreshAccessToken(refreshToken: string): Promise<string> {
  const client = getOAuthClient(`http://localhost${CALLBACK_PATH}`);
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("Google didn't return an access token on refresh.");
  }
  return credentials.access_token;
}
