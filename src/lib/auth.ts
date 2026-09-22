import type { AuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";
import { rateLimit } from "@/lib/rate-limit";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: "CUSTOMER" | "STAFF" | "ADMIN";
      phone: string;
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    role: "CUSTOMER" | "STAFF" | "ADMIN";
    phone: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CUSTOMER" | "STAFF" | "ADMIN";
    phone: string;
  }
}

export const authOptions: AuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { phone, password } = parsed.data;

        // Throttle per phone number so a stolen/guessed number can't be brute-forced, no matter
        // how many source IPs the attacker rotates through.
        const { allowed } = await rateLimit(`login:${phone}`, { max: 10, windowMs: 15 * 60_000 });
        if (!allowed) return null;

        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email ?? undefined,
          role: user.role,
          phone: user.phone,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone;
      }
      // Allows client-side `useSession().update({ name, email })` (e.g. after a profile edit)
      // to refresh the JWT without requiring a full re-login.
      if (trigger === "update" && session) {
        if (typeof session.name === "string") token.name = session.name;
        if (typeof session.email === "string") token.email = session.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.phone = token.phone;
      }
      return session;
    },
  },
};
