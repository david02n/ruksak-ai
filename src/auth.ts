import NextAuth from "next-auth";
import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import {
  authenticatePasswordUser,
  ensureAuthIdentity,
  ensureUserRecord
} from "@/lib/ruksak-users";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== "production" && process.env.NEXTAUTH_DEBUG === "true",
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const user = await authenticatePasswordUser(email, password);

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.primaryEmail,
          name: user.displayName ?? user.primaryEmail,
          image: user.imageUrl ?? undefined
        };
      }
    }),
    ...(googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret
          })
        ]
      : [])
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async signIn({ user, account }) {
      if (user.email) {
        const ensured = await ensureUserRecord({
          email: user.email,
          name: user.name,
          image: user.image
        });

        if (ensured && account?.provider && account.providerAccountId) {
          await ensureAuthIdentity({
            userId: ensured.id,
            provider: account.provider,
            providerUserId: account.providerAccountId,
            email: user.email
          });
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
      }

      if (user && "id" in user && user.id) {
        token.sub = String(user.id);
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const target = new URL(url);
        const base = new URL(baseUrl);

        if (target.origin === base.origin) {
          return url;
        }
      } catch {
        return baseUrl;
      }

      return baseUrl;
    }
  },
  pages: {
    signIn: "/login"
  }
};

export const authHandler = NextAuth(authOptions);

export function auth() {
  return getServerSession(authOptions);
}
