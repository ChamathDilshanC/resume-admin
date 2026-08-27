import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { google } from "googleapis";

const ALLOWED_GITHUB_USERNAME = process.env.ALLOWED_GITHUB_USERNAME || "ChamathDilshanC";
// Gates the Google Drive "Connect" flow the same way ALLOWED_GITHUB_USERNAME
// gates sign-in. Unset (rather than "unrestricted") is the safe default —
// no Google account can link until this is explicitly configured.
const ALLOWED_GOOGLE_EMAIL = process.env.ALLOWED_GOOGLE_EMAIL;

async function refreshGoogleAccessToken(token: JWT): Promise<JWT> {
  try {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET
    );
    client.setCredentials({ refresh_token: token.googleRefreshToken as string });
    const { credentials } = await client.refreshAccessToken();
    return {
      ...token,
      googleAccessToken: credentials.access_token,
      googleTokenExpires: credentials.expiry_date,
      // Google only returns a new refresh_token occasionally — keep the
      // existing one when it doesn't.
      googleRefreshToken: credentials.refresh_token ?? token.googleRefreshToken,
      googleDriveError: undefined,
    };
  } catch (error) {
    console.error("Failed to refresh Google Drive access token:", error);
    // Keep the stale token fields rather than dropping them — surfaces as a
    // clear "reconnect" prompt instead of silently losing the link.
    return { ...token, googleDriveError: true };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_OAUTH_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: "read:user user:email repo workflow",
          prompt: "consent",
        },
      },
    }),
    // Only ever reached via an explicit signIn("google", ...) call from
    // within the already-authenticated dashboard (the custom /signin page
    // hardcodes a GitHub-only button) — this "links" Drive access onto the
    // existing GitHub session's JWT rather than replacing it. Used solely
    // to let the Project Drive gallery upload files as the real account
    // owner (a service account has zero storage quota for new files).
    GoogleProvider({
      clientId: process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: "openid email https://www.googleapis.com/auth/drive",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile, account }) {
      if (account?.provider === "google") {
        const email = (profile as { email?: string } | undefined)?.email;
        return Boolean(ALLOWED_GOOGLE_EMAIL) && email === ALLOWED_GOOGLE_EMAIL;
      }
      const login = (profile as { login?: string } | undefined)?.login;
      return login === ALLOWED_GITHUB_USERNAME;
    },
    async jwt({ token, account }) {
      if (account?.provider === "github" && account.access_token) {
        token.accessToken = account.access_token;
      }
      if (account?.provider === "google") {
        token.googleAccessToken = account.access_token;
        token.googleRefreshToken = account.refresh_token;
        token.googleTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined;
        token.googleDriveError = undefined;
      }
      if (
        token.googleRefreshToken &&
        typeof token.googleTokenExpires === "number" &&
        Date.now() > token.googleTokenExpires - 60_000
      ) {
        return refreshGoogleAccessToken(token);
      }
      return token;
    },
    async session({ session, token }) {
      const s = session as Session & {
        accessToken?: string;
        googleAccessToken?: string;
        googleDriveConnected?: boolean;
        googleDriveError?: boolean;
      };
      s.accessToken = token.accessToken as string | undefined;
      s.googleAccessToken = token.googleAccessToken as string | undefined;
      s.googleDriveConnected = Boolean(token.googleRefreshToken);
      s.googleDriveError = Boolean(token.googleDriveError);
      return s;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
};
