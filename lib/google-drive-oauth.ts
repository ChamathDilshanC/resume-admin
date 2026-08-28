import { google } from "googleapis";

const CALLBACK_PATH = "/api/drive-auth/callback";
const DRIVE_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/drive"];

function baseUrl(): string {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET,
    `${baseUrl()}${CALLBACK_PATH}`
  );
}

export function getGoogleAuthUrl(): string {
  return getOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: DRIVE_SCOPES,
  });
}

export async function exchangeCodeForRefreshToken(
  code: string
): Promise<{ refreshToken: string; email: string | null }> {
  const client = getOAuthClient();
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
// client for that one request.
export async function getFreshAccessToken(refreshToken: string): Promise<string> {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("Google didn't return an access token on refresh.");
  }
  return credentials.access_token;
}
