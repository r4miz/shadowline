import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { consumeOnce } from "@/lib/token-store";
import { verifyMagicLinkToken } from "@/lib/tokens";

// A valid bcrypt hash of a random string. Compared against when the email is
// unknown so a login attempt takes the same time either way.
const DUMMY_HASH = "$2b$12$JgYESWOUDpUwnd1OBeLlTeqOdQj1KLbE11aZfYfMpZla4yRPZ7T8i";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      id: "credentials",
      name: "Email and password",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // Per-account throttle in addition to the per-IP limit on the route.
        const perAccount = rateLimit(`login:${email.toLowerCase()}`, 10, 15 * 60 * 1000);
        if (!perAccount.ok) return null;

        const account = await prisma.consultant.findUnique({ where: { email } });
        const valid = await compare(password, account?.hashedPassword ?? DUMMY_HASH);
        if (!account?.hashedPassword || !valid) return null;

        return { id: account.id, email: account.email, name: account.name };
      },
    }),
    Credentials({
      id: "magic-token",
      name: "Magic link",
      credentials: { token: {} },
      async authorize(credentials) {
        const token = credentials?.token as string | undefined;
        if (!token) return null;

        try {
          const { email, jti, expiresAt } = await verifyMagicLinkToken(token);
          const fresh = await consumeOnce(jti, "magic-link", expiresAt);
          if (!fresh) return null;
          const account = await prisma.consultant.findUnique({ where: { email } });
          if (!account) return null;
          return { id: account.id, email: account.email, name: account.name };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
