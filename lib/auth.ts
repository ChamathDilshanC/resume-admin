import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const ALLOWED_GITHUB_USERNAME = process.env.ALLOWED_GITHUB_USERNAME || "ChamathDilshanC";

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
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      const login = (profile as { login?: string } | undefined)?.login;
      return login === ALLOWED_GITHUB_USERNAME;
    },
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as typeof session & { accessToken?: string }).accessToken = token.accessToken as
        | string
        | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
};
